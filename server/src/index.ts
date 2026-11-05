import express from 'express';
import cookieParser from 'cookie-parser';
import { attachDb, releaseDb, pool } from './db';
import { requireAuth } from './auth';
import { ApiError } from './http';

import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import catalogRoutes from './routes/catalog';
import moduleRoutes from './routes/modules';
import notificationRoutes from './routes/notifications';
import profileRoutes from './routes/profile';
import studioDashboard from './routes/studio/dashboard';
import studioEvents from './routes/studio/events';
import studioChecklists from './routes/studio/checklists';
import studioReports from './routes/studio/reports';
import studioQuality from './routes/studio/quality';
import studioOperations from './routes/studio/operations';

const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('select 1');
    res.json({ ok: true, service: 'mmv-connect-api' });
  } catch (err) {
    res.status(503).json({ ok: false, error: 'database_unavailable' });
  }
});

app.use(attachDb);
app.use(releaseDb);

app.use('/api/auth', authRoutes);

app.use('/api', requireAuth);
app.use('/api/admin', adminRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/studio', studioDashboard);
app.use('/api/studio', studioEvents);
app.use('/api/studio', studioChecklists);
app.use('/api/studio', studioReports);
app.use('/api/studio', studioQuality);
app.use('/api/studio', studioOperations);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'not_found', message: 'Rota não encontrada.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err: any, _req: any, res: any, _next: any) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: err.code ?? 'error',
      message: err.message,
      detail: err.detail ?? null,
    });
  }
  console.error('[api] erro inesperado:', err);
  res.status(500).json({
    error: 'internal_error',
    message: 'Não foi possível concluir a operação. Tente novamente.',
  });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, '0.0.0.0', () => {
  console.log(`MMV Connect API ouvindo em :${port}`);
});
