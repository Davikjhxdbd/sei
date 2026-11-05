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

export const badRequest = (m: string, d?: unknown) =>
  new ApiError(400, m, 'bad_request', d);
export const unauthorized = (m = 'Sessão inválida ou expirada.') =>
  new ApiError(401, m, 'unauthenticated');
export const forbidden = (m = 'Você não tem autorização para esta operação.') =>
  new ApiError(403, m, 'forbidden');
export const notFound = (m = 'Registro não encontrado.') =>
  new ApiError(404, m, 'not_found');
export const conflict = (m: string) => new ApiError(409, m, 'conflict');

export const asyncHandler =
  (fn: (req: any, res: any, next: any) => Promise<any>) =>
  (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

/** Trimmed non-empty string, or throws. */
export function required(value: unknown, field: string, max = 4000): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw badRequest(`O campo "${field}" é obrigatório.`, { field });
  }
  const v = value.trim();
  if (v.length > max) {
    throw badRequest(`O campo "${field}" excede ${max} caracteres.`, { field });
  }
  return v;
}

export function optionalText(value: unknown, max = 8000): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (!v) return null;
  return v.slice(0, max);
}

export function optionalId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuid.test(v) ? v : null;
}

export function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw badRequest(`Valor inválido para "${field}".`, {
      field,
      allowed,
    });
  }
  return value as T;
}

export function isoDate(value: unknown, field: string): string {
  const raw = required(value, field, 40);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    throw badRequest(`Data inválida em "${field}".`, { field });
  }
  return d.toISOString();
}

export function paging(query: any) {
  const page = Math.max(1, Number.parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(String(query.limit ?? '50'), 10) || 50),
  );
  return { page, limit, offset: (page - 1) * limit };
}

export function like(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (!v) return null;
  return `%${v.replace(/[%_]/g, (m) => '\\' + m)}%`;
}
