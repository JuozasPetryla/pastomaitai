const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
