// src/services/database/db.service.ts

import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

class DatabaseService {
  private static instance: DatabaseService;
  private prisma: PrismaClient;

  private constructor() {
    this.prisma = new PrismaClient({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
    });

    // Log database queries in development mode
    if (process.env.NODE_ENV === 'development') {
      this.prisma.$on('query', (e) => {
        logger.debug(`Query: ${e.query}`);
        logger.debug(`Duration: ${e.duration}ms`);
      });
    }

    // Log database errors
    this.prisma.$on('error', (e) => {
      logger.error(`Database error: ${e.message}`);
    });
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public getPrisma(): PrismaClient {
    return this.prisma;
  }

  public async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  public async connect(): Promise<void> {
    // This is a no-op since Prisma connects automatically on first use,
    // but we include it for API completeness and future extensibility
    logger.info('Database connection initialized');
  }

  // Helper methods for executing raw SQL (useful for reports and complex queries)
  public async executeRaw(sql: string, ...params: any[]): Promise<any> {
    try {
      return await this.prisma.$executeRaw`${sql}`;
    } catch (error) {
      logger.error(`Error executing raw SQL: ${error}`);
      throw error;
    }
  }

  public async queryRaw(sql: string, ...params: any[]): Promise<any> {
    try {
      return await this.prisma.$queryRaw`${sql}`;
    } catch (error) {
      logger.error(`Error executing raw query: ${error}`);
      throw error;
    }
  }

  // Helper for transaction management
  public async transaction<T>(callback: (tx: PrismaClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(callback);
  }
}

export const dbService = DatabaseService.getInstance();
export const prisma = dbService.getPrisma();