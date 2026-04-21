const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { detail?: unknown };
    return typeof payload.detail === 'string' ? payload.detail : `API request failed: ${response.status}`;
  } catch {
    return `API request failed: ${response.status}`;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  return parseResponse<T>(response);
}

export async function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path);
}

export async function apiPost<TResponse, TPayload>(path: string, payload: TPayload): Promise<TResponse> {
  return apiRequest<TResponse>(path, {
    method: 'POST',
    body: payload,
  });
}

export async function apiPatch<TResponse, TPayload>(path: string, payload: TPayload): Promise<TResponse> {
  return apiRequest<TResponse>(path, {
    method: 'PATCH',
    body: payload,
  });
}

export async function apiDelete(path: string): Promise<void> {
  await apiRequest<void>(path, { method: 'DELETE' });
}
