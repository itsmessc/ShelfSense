import express from 'express';
import cors from 'cors';
import itemsRouter from './routes/items.js';
import usageRouter from './routes/usage.js';
import dashboardRouter from './routes/dashboard.js';
import forecastsRouter from './routes/forecasts.js';
import procurementRouter from './routes/procurement.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '2mb' })); // allows bulk import payloads

  app.use('/api/items', itemsRouter);
  app.use('/api/usage', usageRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/forecasts', forecastsRouter);
  app.use('/api/procurement', procurementRouter);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return app;
}
