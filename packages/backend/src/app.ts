import express from 'express';
import cors from 'cors';
import itemsRouter from './routes/items.js';
import usageRouter from './routes/usage.js';
import dashboardRouter from './routes/dashboard.js';
import forecastsRouter from './routes/forecasts.js';
import procurementRouter from './routes/procurement.js';
import chatRouter from './routes/chat.js';
import reorderRouter from './routes/reorder.js';
import analyticsRouter from './routes/analytics.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' })); // allow shelf scan image payloads

  app.use('/api/items', itemsRouter);
  app.use('/api/usage', usageRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/forecasts', forecastsRouter);
  app.use('/api/procurement', procurementRouter);
  app.use('/api/chat', chatRouter);
  app.use('/api/reorder', reorderRouter);
  app.use('/api/analytics', analyticsRouter);

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      gemini_key_set: !!process.env.GEMINI_API_KEY,
      fallback_only: process.env.USE_FALLBACK_ONLY === 'true',
    });
  });

  return app;
}
