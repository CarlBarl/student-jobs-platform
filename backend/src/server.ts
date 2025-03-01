/**
 * Server entry point
 */
import app from './app';
import { logger } from './utils/logger';
import { jobCollectionService } from './services/jobs/jobCollectionService';

const PORT = process.env.PORT || 4000;

// Start server
const server = app.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
  
  try {
    // Initialize job collection
    await jobCollectionService.initialize();
    
    // Start scheduled collection
    await jobCollectionService.startScheduledCollection();
    
    // Run initial collection if enabled
    await jobCollectionService.runInitialCollection();
  } catch (error) {
    logger.error('Failed to initialize job collection', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default server;