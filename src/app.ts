import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimiter } from './middleware/rateLimiter';
import { requestId } from './middleware/requestId';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './config/logger';

// Routes
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/users.routes';
import teamRoutes from './modules/teams/teams.routes';
import projectRoutes from './modules/projects/projects.routes';
import deploymentRoutes from './modules/deployments/deployments.routes';
import incidentRoutes from './modules/incidents/incidents.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';

const app = express();

// Global middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(requestId);
app.use(rateLimiter);

// Request logging
app.use((req, _res, next) => {
  logger.info({ method: req.method, path: req.path, requestId: req.headers['x-request-id'] }, 'Incoming request');
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/deployments', deploymentRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
