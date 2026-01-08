import { z } from 'zod';

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

const httpGET = async <T>(
  url: string,
  responseSchema: z.ZodType<T>,
  options?: { headers?: Record<string, string> },
): Promise<HttpResponse<T>> => {
  return validateResponse(
    () =>
      tryRequest(() =>
        fetch(url, {
          method: 'GET',
          headers: { Accept: 'application/json', ...options?.headers },
        }),
      ),
    responseSchema,
  );
};

const httpPOST = async <T>(
  url: string,
  payload: string,
  responseSchema: z.ZodType<T>,
  options?: { headers?: Record<string, string> },
): Promise<HttpResponse<T>> => {
  return validateResponse(
    () =>
      tryRequest(() =>
        fetch(url, {
          method: 'POST',
          body: payload,
          headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...options?.headers },
        }),
      ),
    responseSchema,
  );
};

const httpPUT = async <T>(
  url: string,
  payload: string,
  responseSchema: z.ZodType<T>,
  options?: { headers?: Record<string, string> },
): Promise<HttpResponse<T>> => {
  return validateResponse(
    () =>
      tryRequest(() =>
        fetch(url, {
          method: 'PUT',
          body: payload,
          headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...options?.headers },
        }),
      ),
    responseSchema,
  );
};

export { httpGET, httpPOST, httpPUT };
