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

const REQUEST_TIMEOUT_MS = 30_000;
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\\/+$/, '');

export async function api<T = any>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const controller = new AbortController();
  const timeoutReason = new DOMException(
    'A solicitação excedeu o tempo limite.',
    'TimeoutError',
  );
  const timeoutId = window.setTimeout(
    () => controller.abort(timeoutReason),
    REQUEST_TIMEOUT_MS,
  );
  const abortFromCaller = () => controller.abort(options.signal?.reason);

  if (options.signal?.aborted) {
    abortFromCaller();
  } else {
    options.signal?.addEventListener('abort', abortFromCaller, { once: true });
  }

  try {
    const endpoint = path.startsWith('/api') ? path : `/api${path}`;
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: options.method ?? 'GET',
      credentials: 'include',
      headers: options.body !== undefined
        ? { 'Content-Type': 'application/json' }
        : undefined,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
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
  } catch (error) {
    if (controller.signal.reason === timeoutReason) {
      throw new ApiError(
        408,
        'O servidor demorou para responder. Verifique sua conexão e tente novamente.',
        'request_timeout',
      );
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
    options.signal?.removeEventListener('abort', abortFromCaller);
  }
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export const get = <T = any,>(path: string, signal?: AbortSignal) =>
  api<T>(path, { signal });
export const post = <T = any,>(path: string, body?: unknown) =>
  api<T>(path, { method: 'POST', body: body ?? {} });
export const patch = <T = any,>(path: string, body?: unknown) =>
  api<T>(path, { method: 'PATCH', body: body ?? {} });
export const put = <T = any,>(path: string, body?: unknown) =>
  api<T>(path, { method: 'PUT', body: body ?? {} });
export const del = <T = any,>(path: string) => api<T>(path, { method: 'DELETE' });
