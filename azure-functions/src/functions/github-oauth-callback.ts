import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { parseCookie } from 'cookie';
import { z } from 'zod';

import {
  BLIPPER_FRONTEND_BASE_URL,
  GITHUB_BASE_URL,
  GITHUB_OAUTH_CLIENT_ID,
  GITHUB_OAUTH_CLIENT_SECRET,
  STATE_COOKIE_NAME,
} from '../lib/config';

export type HttpResponse<T> = { success: true; data: T } | { success: false; error: Error };

const tryRequest = async <T>(reqFunc: () => Promise<Response>): Promise<HttpResponse<T>> => {
  try {
    const res = await reqFunc();
    const json = await res.json();
    return { success: true, data: json };
  } catch (e) {
    if (e instanceof Error) return { success: false, error: e };
    return { success: false, error: new Error('Unknown request error') };
  }
};

const validateResponse = async <T>(
  reqFunc: () => Promise<HttpResponse<T>>,
  responseSchema: z.ZodType<T>,
): Promise<HttpResponse<T>> => {
  const response = await reqFunc();
  if (!response.success) return response;

  try {
    const validatedResponse = responseSchema.parse(response.data);
    return { success: true, data: validatedResponse };
  } catch (e) {
    if (e instanceof Error) return { success: false, error: e };
    return { success: false, error: new Error('Unknown validation error') };
  }
};

const httpPOST = async <T>(url: string, payload: string, responseSchema: z.ZodType<T>): Promise<HttpResponse<T>> => {
  return validateResponse(
    () =>
      tryRequest(() =>
        fetch(url, {
          method: 'POST',
          body: payload,
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        }),
      ),
    responseSchema,
  );
};

const tryLoadState = (request: HttpRequest): string | null => {
  try {
    return parseCookie(request.headers.get('cookie') ?? '')?.[STATE_COOKIE_NAME] ?? null;
  } catch (e) {
    console.error(e);
    return null;
  }
};

export async function handler(request: HttpRequest, _: InvocationContext): Promise<HttpResponseInit> {
  const stateCookieReset = { cookies: [{ name: STATE_COOKIE_NAME, maxAge: -1, value: '' }] };

  const code = request.query.get('code');
  if (code == null)
    return {
      status: 400,
      body: 'Missing code',
      headers: { 'Content-Type': 'text/plain' },
      ...stateCookieReset,
    };

  const state = tryLoadState(request);
  if (state == null)
    return {
      status: 400,
      body: 'Missing state',
      headers: { 'Content-Type': 'text/plain' },
      ...stateCookieReset,
    };

  const accessTokenUrl = new URL(GITHUB_BASE_URL);
  accessTokenUrl.pathname = '/login/oauth/access_token';
  accessTokenUrl.searchParams.set('client_id', GITHUB_OAUTH_CLIENT_ID);
  accessTokenUrl.searchParams.set('client_secret', GITHUB_OAUTH_CLIENT_SECRET);
  accessTokenUrl.searchParams.set('code', code);

  try {
    const response = await httpPOST(accessTokenUrl.toString(), '', z.object({ access_token: z.string() }));
    if (!response.success) throw response.error;

    const redirectUrl = new URL(BLIPPER_FRONTEND_BASE_URL);
    redirectUrl.pathname = '/auth-callback';
    redirectUrl.hash = response.data.access_token;

    return {
      status: 307,
      headers: {
        'Content-Type': 'text/plain',
        Location: redirectUrl.toString(),
      },
      body: `Redirecting to ${redirectUrl.toString()}...`,
      ...stateCookieReset,
    };
  } catch (e) {
    return {
      status: 500,
      body: 'Could not retrieve token',
      headers: { 'Content-Type': 'text/plain' },
      ...stateCookieReset,
    };
  }
}

app.http('github-oauth-callback', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  handler,
});
