// src/api/routes/index.ts

import { Express } from 'express';
import { logger } from '../../utils/logger';

// Import all route files
import jobRoutes from './jobs.routes';
import userRoutes from './users.routes';
import gdprRoutes from './gdpr.routes';
import adminRoutes from './admin.routes';
import authRoutes from './auth.routes';

/**
 * Register all API routes with the Express application
 */
export const loadRoutes = (app: Express): void => {
  // Define API prefix
  const apiPrefix = '/api/v1';
  
  // Register routes
  app.use(`${apiPrefix}/jobs`, jobRoutes);
  app.use(`${apiPrefix}/users`, userRoutes);
  app.use(`${apiPrefix}/gdpr`, gdprRoutes);
  app.use(`${apiPrefix}/admin`, adminRoutes);
  app.use(`${apiPrefix}/auth`, authRoutes);
  
  // Add health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  // Add 404 handler for undefined routes
  app.use((req, res) => {
    logger.warn(`Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: { message: 'Route not found' } });
  });
  
  logger.info('API routes loaded');
};