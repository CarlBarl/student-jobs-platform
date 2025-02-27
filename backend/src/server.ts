// src/server.ts

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { logger, stream } from './utils/logger';
import { dbService } from './services/database/db.service';
import { scheduler } from './utils/scheduler';
import { loadRoutes } from './api/routes';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const port = process.env.PORT || 4000;

// Apply middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(morgan('combined', { stream })); // HTTP request logging

// Load API routes
loadRoutes(app);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(`Error: ${err.message}`);
  logger.error(err.stack);
  
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
    },
  });
});

// Start the server
const startServer = async () => {
  try {
    // Connect to the database
    await dbService.connect();
    logger.info('Connected to database');

    // Start all scheduled jobs
    if (process.env.NODE_ENV !== 'test') {
      scheduler.startAll();
      logger.info('Scheduled jobs started');
    }

    // Start the server
    app.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
    });
  } catch (error) {
    logger.error(`Error starting server: ${error}`);
    process.exit(1);
  }
};

// Handle shutdown
const shutdown = async () => {
  logger.info('Shutting down server...');
  
  // Stop scheduled jobs
  scheduler.stopAll();
  logger.info('Scheduled jobs stopped');
  
  // Disconnect from database
  await dbService.disconnect();
  logger.info('Disconnected from database');
  
  process.exit(0);
};

// Handle process termination signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the server
startServer();

export default app; // For testing