import type { RequestHandler } from 'express';

/**
 * Applies conservative response headers to API responses.
 * HSTS is emitted only when the request reached the app over HTTPS.
 */
export const securityHeaders: RequestHandler = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  if (req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  }

  next();
};
