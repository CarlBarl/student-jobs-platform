// src/services/gdpr/gdpr.service.ts

import { prisma } from '../database/db.service';
import { logger } from '../../utils/logger';

export class GDPRService {
  /**
   * Create a new GDPR data request
   */
  public async createDataRequest(userId: string, requestType: 'export' | 'delete' | 'anonymize'): Promise<any> {
    try {
      return await prisma.gdprDataRequest.create({
        data: {
          userId,
          requestType,
          status: 'pending',
        },
      });
    } catch (error) {
      logger.error(`Error creating GDPR data request: ${error}`);
      throw error;
    }
  }

  /**
   * Process a pending GDPR data export request
   */
  public async processExportRequest(requestId: string): Promise<any> {
    try {
      // First update the status to processing
      const request = await prisma.gdprDataRequest.update({
        where: { id: requestId },
        data: { status: 'processing' },
      });

      // Execute the SQL function to generate the export data
      const result = await prisma.$queryRaw`
        SELECT generate_user_data_export(${request.userId}::uuid) as user_data;
      `;

      // The result contains the user data as JSON
      const userData = result[0]?.user_data;

      // In a real implementation, you would save this data to a file and 
      // update the dataFileUrl in the GDPR request record
      // For this example, we'll just simulate a successful completion

      await prisma.gdprDataRequest.update({
        where: { id: requestId },
        data: { 
          status: 'completed',
          completedAt: new Date(),
          dataFileUrl: `https://example.com/exports/${requestId}.json`, // Placeholder URL
        },
      });

      return userData;
    } catch (error) {
      logger.error(`Error processing GDPR export request: ${error}`);
      // Update the request status to error
      await prisma.gdprDataRequest.update({
        where: { id: requestId },
        data: { 
          status: 'error',
          rejectionReason: `Error: ${error.message}`,
        },
      });
      throw error;
    }
  }

  /**
   * Process a pending GDPR data deletion request
   */
  public async processDeletionRequest(requestId: string): Promise<boolean> {
    try {
      // First update the status to processing
      const request = await prisma.gdprDataRequest.update({
        where: { id: requestId },
        data: { status: 'processing' },
      });

      // Execute the SQL function to delete the user data
      const result = await prisma.$queryRaw`
        SELECT process_gdpr_delete_request(${request.userId}::uuid) as success;
      `;

      const success = result[0]?.success === true;

      // The deletion process is handled by the database function,
      // which also updates the request status
      
      return success;
    } catch (error) {
      logger.error(`Error processing GDPR deletion request: ${error}`);
      // Update the request status to error
      await prisma.gdprDataRequest.update({
        where: { id: requestId },
        data: { 
          status: 'error',
          rejectionReason: `Error: ${error.message}`,
        },
      });
      throw error;
    }
  }

  /**
   * Update user consent information
   */
  public async updateUserConsent(
    userId: string,
    consentToProcessing: boolean,
    marketingConsent: boolean,
    privacyPolicyVersion: string
  ): Promise<boolean> {
    try {
      // Execute the SQL function to update user consent
      const result = await prisma.$queryRaw`
        SELECT update_user_consent(
          ${userId}::uuid, 
          ${consentToProcessing}::boolean, 
          ${marketingConsent}::boolean,
          ${privacyPolicyVersion}::varchar
        ) as success;
      `;

      return result[0]?.success === true;
    } catch (error) {
      logger.error(`Error updating user consent: ${error}`);
      throw error;
    }
  }

  /**
   * Process all pending GDPR requests (to be run as a scheduled job)
   */
  public async processAllPendingRequests(): Promise<number> {
    try {
      const result = await prisma.$queryRaw`
        SELECT process_pending_gdpr_requests() as processed_count;
      `;

      return Number(result[0]?.processed_count || 0);
    } catch (error) {
      logger.error(`Error processing pending GDPR requests: ${error}`);
      throw error;
    }
  }

  /**
   * Anonymize inactive users (to be run as a scheduled job)
   */
  public async anonymizeInactiveUsers(): Promise<number> {
    try {
      const result = await prisma.$queryRaw`
        SELECT anonymize_inactive_users() as anonymized_count;
      `;

      return Number(result[0]?.anonymized_count || 0);
    } catch (error) {
      logger.error(`Error anonymizing inactive users: ${error}`);
      throw error;
    }
  }
}

export const gdprService = new GDPRService();