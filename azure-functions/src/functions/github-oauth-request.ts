import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { randomUUID } from 'node:crypto';

import { GITHUB_BASE_URL, GITHUB_OAUTH_CLIENT_ID, GITHUB_OAUTH_SCOPE, STATE_COOKIE_NAME } from '../lib/config';

export async function handler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const redirectUrl = new URL(request.url.split('?')[0]);
  redirectUrl.pathname = '/api/github-oauth-callback';

  const authorizationUrl = new URL(GITHUB_BASE_URL);
  authorizationUrl.pathname = '/login/oauth/authorize';
  authorizationUrl.searchParams.set('client_id', GITHUB_OAUTH_CLIENT_ID);
  authorizationUrl.searchParams.set('redirect_uri', redirectUrl.toString());
  authorizationUrl.searchParams.set('scope', GITHUB_OAUTH_SCOPE);
  authorizationUrl.searchParams.set('allow_signup', 'false');

  return {
    status: 307,
    headers: {
      'Content-Type': 'text/plain',
      Location: authorizationUrl.toString(),
    },
    body: `Redirecting to ${authorizationUrl.toString()}...`,
    cookies: [
      {
        name: STATE_COOKIE_NAME,
        value: randomUUID(),
        httpOnly: true,
        secure: true,
        maxAge: 300,
        path: redirectUrl.pathname,
      },
    ],
  };
}

app.http('github-oauth-request', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler,
});
