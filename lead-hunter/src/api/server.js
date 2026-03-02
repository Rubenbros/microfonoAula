import express from 'express';
import cors from 'cors';
import { createLogger } from '../logger.js';
import leadsRouter from './routes/leads.js';
import statsRouter from './routes/stats.js';
import emailsRouter from './routes/emails.js';
import activitiesRouter from './routes/activities.js';
import proposalsRouter from './routes/proposals.js';
import automationsRouter from './routes/automations.js';
import settingsRouter from './routes/settings.js';

const log = createLogger('api');

// Middleware de autenticación por API key
function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const validKey = process.env.BACKEND_API_KEY;

  if (!validKey) {
    log.warn('BACKEND_API_KEY no configurada — API sin protección');
    return next();
  }

  if (apiKey !== validKey) {
    return res.status(401).json({ error: 'API key inválida' });
  }

  next();
}

export function startApiServer() {
  const app = express();
  const port = parseInt(process.env.BACKEND_API_PORT || '3000');

  app.use(cors());
  app.use(express.json());

  // Health check (sin auth)
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Proteger todas las rutas /api con API key
  app.use('/api', apiKeyAuth);

  // Rutas
  app.use('/api/leads', leadsRouter);
  app.use('/api/stats', statsRouter);
  app.use('/api/emails', emailsRouter);
  app.use('/api/activities', activitiesRouter);
  app.use('/api/proposals', proposalsRouter);
  app.use('/api/automations', automationsRouter);
  app.use('/api/settings', settingsRouter);

  // Error handler global
  app.use((err, req, res, _next) => {
    log.error(`API error: ${err.message}`);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  app.listen(port, () => {
    log.info(`API server escuchando en puerto ${port}`);
  });

  return app;
}
