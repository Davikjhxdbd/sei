import crypto from 'node:crypto';

export function requestObservability(req: any, res: any, next: any) {
  const requestId = crypto.randomUUID();
  const startedAt = process.hrtime.bigint();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  res.once('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    console.log(JSON.stringify({
      event: 'http.request',
      request_id: requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: Math.round(durationMs * 100) / 100,
    }));
  });

  next();
}

export function logApiError(req: any, error: unknown) {
  const errorName =
    error && typeof error === 'object' && 'name' in error &&
    typeof (error as { name?: unknown }).name === 'string'
      ? (error as { name: string }).name
      : 'UnknownError';

  console.error(JSON.stringify({
    event: 'api.unhandled_error',
    request_id: req.requestId ?? null,
    method: req.method,
    path: req.path,
    error_name: errorName,
  }));
}
