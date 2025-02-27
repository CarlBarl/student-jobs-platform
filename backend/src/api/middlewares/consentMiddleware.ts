import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../../types/express';
import createError from 'http-errors';

const prisma = new PrismaClient();

// GDPR middleware som kontrollerar användarens samtyckesstatus
export const consentRequired = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.id) {
    return next(createError(401, 'Authentication required'));
  }

  try {
    // Hämta användardata med fokus på samtycke
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        consentVersion: true,
        consentDate: true,
        anonymizedAt: true
      }
    });

    if (!user) {
      return next(createError(404, 'User not found'));
    }

    // Om användaren har blivit anonymiserad
    if (user.anonymizedAt) {
      return next(createError(403, 'User account has been removed'));
    }

    // Kontrollera samtyckets giltighet
    const CURRENT_CONSENT_VERSION = process.env.CONSENT_VERSION || '1.0';
    
    // Om användaren saknar samtycke eller har en äldre version
    if (!user.consentVersion || user.consentVersion !== CURRENT_CONSENT_VERSION) {
      return res.status(403).json({
        status: 'consent_required',
        message: 'User consent required',
        currentVersion: CURRENT_CONSENT_VERSION,
        userVersion: user.consentVersion || 'none'
      });
    }

    // Samtycke finns och är aktuellt
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware för att logga dataåtkomst (audit trail för GDPR)
export const logDataAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.id;
  const endpoint = req.originalUrl;
  const method = req.method;
  const accessType = getAccessType(endpoint, method);
  
  // Endast logga relevanta endpoints för personuppgifter
  if (userId && accessType) {
    try {
      // Skapa åtkomstlogg
      await prisma.dataAccessLog.create({
        data: {
          userId,
          endpoint,
          method,
          accessType,
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        }
      });
    } catch (error) {
      // Logga fel men stoppa inte flödet
      console.error('Failed to log data access:', error);
    }
  }
  
  next();
};

// Hjälpfunktion för att kategorisera åtkomsttyp
function getAccessType(endpoint: string, method: string): string | null {
  if (endpoint.includes('/user/data')) {
    return 'personal_data_access';
  }
  if (endpoint.includes('/user') && method === 'DELETE') {
    return 'data_deletion_request';
  }
  if (endpoint.includes('/user/export')) {
    return 'data_portability_request';
  }
  return null;
}