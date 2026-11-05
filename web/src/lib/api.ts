export class ApiError extends Error {
  status: number;
  code?: string;
  detail?: unknown;

  constructor(status: number, message: string, code?: string, detail?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

export async function api<T = any>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await fetch(path.startsWith('/api') ? path : `/api${path}`, {
    method: options.method ?? 'GET',
    credentials: 'same-origin',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  const text = await response.text();
  const payload = text ? safeJson(text) : null;

  if (!response.ok) {
    const message =
      (payload && (payload.message as string)) ||
      'Não foi possível concluir a operação.';
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('mmv:unauthorized'));
    }
    throw new ApiError(
      response.status,
      message,
      payload?.error as string | undefined,
      payload?.detail,
    );
  }

  return payload as T;
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export const get = <T = any,>(path: string) => api<T>(path);
export const post = <T = any,>(path: string, body?: unknown) =>
  api<T>(path, { method: 'POST', body: body ?? {} });
export const patch = <T = any,>(path: string, body?: unknown) =>
  api<T>(path, { method: 'PATCH', body: body ?? {} });
export const put = <T = any,>(path: string, body?: unknown) =>
  api<T>(path, { method: 'PUT', body: body ?? {} });
export const del = <T = any,>(path: string) => api<T>(path, { method: 'DELETE' });
