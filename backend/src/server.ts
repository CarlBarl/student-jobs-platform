import app from './app';
import { PrismaClient } from '@prisma/client';
import logger from './utils/logger';

const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;

// Hantera utestående databasanslutningar
const exitHandler = async () => {
  logger.info('Stänger av server...');
  
  try {
    await prisma.$disconnect();
    logger.info('Databasanslutning stängd');
    process.exit(0);
  } catch (error) {
    logger.error('Fel vid avstängning', error);
    process.exit(1);
  }
};

// Hantera felmeddelanden
const unexpectedErrorHandler = (error: Error) => {
  logger.error('Oväntat fel', error);
  exitHandler();
};

// Lyssna på utestående fel
process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', (reason) => {
  logger.error('Obehandlad avvisning', reason);
});

// Rensa anslutningar vid avstängning
process.on('SIGTERM', exitHandler);
process.on('SIGINT', exitHandler);

// Starta servern
const server = app.listen(PORT, () => {
  logger.info(`Server lyssnar på port ${PORT}`);
  logger.info(`API-dokumentation tillgänglig på http://localhost:${PORT}/api-docs`);
});

export default server;