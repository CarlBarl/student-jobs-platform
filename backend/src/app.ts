import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import routes from './api/routes';
import { errorHandler } from './api/middlewares/errorHandler';
import logger from './utils/logger';
import path from 'path';
import dotenv from 'dotenv';

// Ladda miljövariabler
dotenv.config();

const app: Express = express();

// Säkerhetsrelaterade middlewares - GDPR compliance
app.use(helmet()); // Sätta HTTP-headers
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting för att förhindra överbelastning/DOS attacker
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuter
  max: 100, // max 100 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: 'För många förfrågningar, försök igen senare'
});
app.use('/api', limiter);

// Loggning
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
}

// Parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// API-routes
app.use('/api', routes);

// API-dokumentation
if (process.env.NODE_ENV === 'development') {
  app.use('/api-docs', express.static(path.join(__dirname, '../docs/api')));
}

// Hantera 404
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Resursen hittades inte'
  });
});

// Globalt felhantering
app.use(errorHandler);

export default app;