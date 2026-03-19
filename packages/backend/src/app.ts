import express from 'express';
import cors from 'cors';
import itemsRouter      from './routes/items.js';
import usageRouter      from './routes/usage.js';
import dashboardRouter  from './routes/dashboard.js';
import forecastsRouter  from './routes/forecasts.js';
import procurementRouter from './routes/procurement.js';
import chatRouter       from './routes/chat.js';
import reorderRouter    from './routes/reorder.js';
import analyticsRouter  from './routes/analytics.js';
import auditRouter      from './routes/audit.js';
import { errorHandler } from './middleware/errorHandler.js';
import { env } from './config/env.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // ── API routes ──────────────────────────────────────────────────────────────
  app.use('/api/items',       itemsRouter);
  app.use('/api/usage',       usageRouter);
  app.use('/api/dashboard',   dashboardRouter);
  app.use('/api/forecasts',   forecastsRouter);
  app.use('/api/procurement', procurementRouter);
  app.use('/api/chat',        chatRouter);
  app.use('/api/reorder',     reorderRouter);
  app.use('/api/analytics',   analyticsRouter);
  app.use('/api/audit',       auditRouter);

  // ── Health check ────────────────────────────────────────────────────────────
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      gemini_key_set: !!env.geminiApiKey,
      fallback_only: env.useFallbackOnly,
    });
  });

  // ── Central error handler (must be last) ────────────────────────────────────
  app.use(errorHandler);

  return app;
}
