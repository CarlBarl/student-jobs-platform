import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';
import { DataCollectionService } from './services/data-collection';
import { setupRoutes } from './api/routes';
import { setupMiddlewares } from './api/middlewares';
import { Logger } from './utils/logger';

export class App {
  public app: express.Application;
  public prisma: PrismaClient;
  private dataCollectionService: DataCollectionService;
  private logger: Logger;
  
  constructor() {
    this.app = express();
    this.prisma = new PrismaClient();
    this.logger = new Logger('App');
    this.dataCollectionService = new DataCollectionService(this.prisma);
    
    this.initializeMiddlewares();
    this.initializeRoutes();
  }
  
  private initializeMiddlewares(): void {
    // Security middlewares
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json());
    
    // Setup application middlewares
    setupMiddlewares(this.app);
  }
  
  private initializeRoutes(): void {
    setupRoutes(this.app, this.prisma, this.dataCollectionService);
  }
  
  public async start(): Promise<void> {
    try {
      // Connect to the database
      await this.prisma.$connect();
      this.logger.info('Connected to database');
      
      // Initialize and start data collection service
      this.dataCollectionService.initialize();
      this.dataCollectionService.start();
      this.logger.info('Data collection service started');
      
      return Promise.resolve();
    } catch (error) {
      this.logger.error('Failed to start application', { error });
      return Promise.reject(error);
    }
  }
  
  public async stop(): Promise<void> {
    try {
      // Stop data collection service
      this.dataCollectionService.stop();
      this.logger.info('Data collection service stopped');
      
      // Disconnect from the database
      await this.prisma.$disconnect();
      this.logger.info('Disconnected from database');
      
      return Promise.resolve();
    } catch (error) {
      this.logger.error('Failed to stop application', { error });
      return Promise.reject(error);
    }
  }
}