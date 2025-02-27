import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../utils/logger';

const prisma = new PrismaClient();

/**
 * Service för att hantera användarrättigheter enligt GDPR
 */
export class UserRightsService {
  /**
   * Exportera alla användardata för dataportabilitet (GDPR Artikel 20)
   */
  async exportUserData(userId: string) {
    try {
      // Hämta alla användardata för export
      const userData = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true,
          bookmarks: {
            select: {
              createdAt: true,
              job: {
                select: {
                  id: true,
                  title: true,
                  company: true,
                  location: true,
                  postedDate: true,
                  expiryDate: true
                }
              }
            }
          },
          preferences: true,
          // Vi inkluderar inte lösenord eller känsliga interna fält
        }
      });

      // Hämta sökhistorik separat
      const searchHistory = await prisma.searchHistory.findMany({
        where: { userId },
        select: {
          searchTerm: true,
          createdAt: true,
          job: {
            select: {
              id: true,
              title: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Kombinera all data för export
      return {
        userData,
        searchHistory,
        exportDate: new Date(),
        dataFormat: 'JSON'
      };
    } catch (error) {
      logger.error('Failed to export user data', { userId, error });
      throw new Error('Failed to export user data');
    }
  }

  /**
   * Implementera "rätten att bli glömd" (GDPR Artikel 17)
   * Anonymiserar användardata istället för att ta bort den helt
   */
  async anonymizeUser(userId: string) {
    try {
      // Transaktion för att säkerställa att all anonymisering lyckas
      await prisma.$transaction(async (tx) => {
        // 1. Anonymisera personliga uppgifter
        await tx.user.update({
          where: { id: userId },
          data: {
            email: `anonymized-${uuidv4()}@example.com`,
            firstName: null,
            lastName: null,
            passwordHash: 'DELETED', // Inaktiverar inloggning
            anonymizedAt: new Date(),
            consentVersion: null,
            consentDate: null
          }
        });

        // 2. Ta bort användarpreferenser
        await tx.userPreference.deleteMany({
          where: { userId }
        });

        // 3. Anonymisera sökhistorik men behåll anonym data för analys
        await tx.searchHistory.updateMany({
          where: { userId },
          data: {
            userId: null // Koppla bort från användaren
          }
        });
      });

      logger.info('User data anonymized successfully', { userId });
      return { success: true, message: 'User data anonymized successfully' };
    } catch (error) {
      logger.error('Failed to anonymize user data', { userId, error });
      throw new Error('Failed to anonymize user data');
    }
  }

  /**
   * Uppdatera samtycke (GDPR Artikel 7)
   */
  async updateConsent(userId: string, consentVersion: string) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          consentVersion,
          consentDate: new Date()
        }
      });

      logger.info('User consent updated', { userId, consentVersion });
      return { success: true, consentVersion, consentDate: new Date() };
    } catch (error) {
      logger.error('Failed to update user consent', { userId, error });
      throw new Error('Failed to update user consent');
    }
  }

  /**
   * Rätt till rättelse (GDPR Artikel 16)
   */
  async updateUserData(userId: string, userData: any) {
    const allowedFields = ['firstName', 'lastName', 'email']; // Begränsa vilka fält som kan uppdateras
    
    // Filtrera bort otillåtna fält
    const validData = Object.keys(userData)
      .filter(key => allowedFields.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = userData[key];
        return obj;
      }, {});
    
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: validData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          updatedAt: true
        }
      });
      
      logger.info('User data updated', { userId });
      return user;
    } catch (error) {
      logger.error('Failed to update user data', { userId, error });
      throw new Error('Failed to update user data');
    }
  }
}

export default new UserRightsService();