const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`);

  return parseResponse<T>(response);
}

export async function apiPost<TResponse, TPayload>(path: string, payload: TPayload): Promise<TResponse> {
  const response = await fetch(`${apiUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return parseResponse<TResponse>(response);
}

export async function apiPatch<TResponse, TPayload>(path: string, payload: TPayload): Promise<TResponse> {
  const response = await fetch(`${apiUrl}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return parseResponse<TResponse>(response);
}

export async function apiDelete(path: string): Promise<void> {
  const response = await fetch(`${apiUrl}${path}`, { method: 'DELETE' });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { detail?: unknown };
    return typeof payload.detail === 'string' ? payload.detail : `API request failed: ${response.status}`;
  } catch {
    return `API request failed: ${response.status}`;
  }
}
