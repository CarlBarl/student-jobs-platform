// src/api/middlewares/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import logger from '../../utils/logger';

interface CustomError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Något gick fel';
  
  logger.error(`${statusCode} - ${message}`, error);
  
  res.status(statusCode).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};