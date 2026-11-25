import express from 'express';
import { shutdownGracefully } from './lifecycle';
import cookieParser from 'cookie-parser';
import { attachDb, releaseDb, pool } from './db';
import { requireAuth } from './auth';
import { ApiError, bodyParserErrorResponse } from './http';
import { logApiError, requestObservability } from './observability';
import { databaseReady } from './health';
import { securityHeaders } from './security';

import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import catalogRoutes from './routes/catalog';
import moduleRoutes from './routes/modules';
import notificationRoutes from './routes/notifications';
import communicationRoutes from './routes/communication';
import profileRoutes from './routes/profile';
import calendarRoutes from './routes/calendar';
import workspaceRoutes from './routes/workspace';

const app = express();
// Render terminates one trusted proxy hop; do not trust arbitrary client-supplied X-Forwarded-For chains.
app.set('trust proxy', 1);
app.use(requestObservability);

// API responses contain account and operational data; never allow intermediary caching.
app.use(securityHeaders);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/api/health', async (req, res) => {
  const ready = await databaseReady(pool);
  if (!ready) {
    console.error(JSON.stringify({
      event: 'health.database_unavailable',
      request_id: (req as any).requestId ?? null,
    }));
    return res.status(503).json({ ok: false, error: 'database_unavailable' });
  }
  res.json({ ok: true, service: 'mmv-connect-api' });
});

app.use(attachDb);
app.use(releaseDb);

app.use('/api/auth', authRoutes);

app.use('/api', requireAuth);
app.use('/api/admin', adminRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/communication', communicationRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/workspace', workspaceRoutes);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'not_found', message: 'Rota não encontrada.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err: any, _req: any, res: any, _next: any) => {
  const bodyError = bodyParserErrorResponse(err);
  if (bodyError) {
    return res.status(bodyError.status).json({
      error: bodyError.code,
      message: bodyError.message,
    });
  }
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: err.code ?? 'error',
      message: err.message,
      detail: err.detail ?? null,
    });
  }
  logApiError(_req, err);
  res.status(500).json({
    error: 'internal_error',
    message: 'Não foi possível concluir a operação. Tente novamente.',
  });
});

const port = Number(process.env.PORT || 4000);
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`MMV Connect API ouvindo em :${port}`);
});

let shuttingDown = false;
const handleShutdown = (signal: NodeJS.Signals) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(JSON.stringify({ event: 'server.shutdown_started', signal }));
  void shutdownGracefully(server, pool)
    .then(() => {
      console.log(JSON.stringify({ event: 'server.shutdown_completed', signal }));
      process.exitCode = 0;
    })
    .catch((error: unknown) => {
      console.error(JSON.stringify({
        event: 'server.shutdown_failed',
        signal,
        error_name: error instanceof Error ? error.name : 'UnknownError',
      }));
      process.exitCode = 1;
    });
};

process.on('SIGTERM', handleShutdown);
process.on('SIGINT', handleShutdown);
