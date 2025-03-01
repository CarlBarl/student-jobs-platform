/**
 * Repository for managing job data in the database
 */
import { PrismaClient } from '@prisma/client';
import { JobData } from '../scrapers/types';
import { logger } from '../../utils/logger';

class JobRepository {
  private prisma: PrismaClient;
  
  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Saves jobs to the database
   * @param jobs Jobs to save
   * @returns Number of jobs saved
   */
  public async saveJobs(jobs: JobData[]): Promise<number> {
    logger.info(`Saving ${jobs.length} jobs to the database`);
    let savedCount = 0;
    
    try {
      for (const job of jobs) {
        try {
          await this.saveJob(job);
          savedCount++;
        } catch (error) {
          logger.error(`Failed to save job ${job.externalId} from ${job.source}`, {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      logger.info(`Successfully saved ${savedCount} of ${jobs.length} jobs`);
      return savedCount;
    } catch (error) {
      logger.error('Failed to save jobs', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Saves a single job to the database
   * @param job Job to save
   * @returns Created or updated job
   */
  public async saveJob(job: JobData): Promise<any> {
    logger.debug(`Saving job ${job.externalId} from ${job.source}`);
    
    try {
      // Check if job already exists by external ID and source
      const existingJob = await this.prisma.job.findFirst({
        where: {
          externalId: job.externalId,
          source: job.source
        }
      });
      
      if (existingJob) {
        // Update existing job
        return this.updateJob(existingJob.id, job);
      } else {
        // Create new job
        return this.createJob(job);
      }
    } catch (error) {
      logger.error(`Failed to save job ${job.externalId} from ${job.source}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Creates a new job in the database
   * @param job Job data
   * @returns Created job
   */
  private async createJob(job: JobData): Promise<any> {
    logger.debug(`Creating new job ${job.externalId} from ${job.source}`);
    
    try {
      // Create company if it doesn't exist
      const company = await this.findOrCreateCompany(job.company);
      
      // Create location if it doesn't exist
      const location = await this.findOrCreateLocation(job.location);
      
      // Create job
      const createdJob = await this.prisma.job.create({
        data: {
          externalId: job.externalId,
          source: job.source,
          sourceUrl: job.sourceUrl,
          title: job.title,
          description: job.description,
          descriptionFormatted: job.descriptionFormatted,
          companyId: company.id,
          locationId: location?.id,
          applicationEmail: job.applicationDetails?.email,
          applicationUrl: job.applicationDetails?.url,
          applicationReference: job.applicationDetails?.reference,
          applicationInformation: job.applicationDetails?.information,
          applicationDeadline: job.applicationDetails?.deadlineDate,
          employmentType: job.employmentType,
          workingHoursType: job.workingHoursType,
          duration: job.duration,
          salary: job.salary,
          publishedAt: job.publicationDate,
          updatedAt: job.lastPublicationDate || job.publicationDate,
          expiresAt: job.expirationDate,
          metaData: job.metadata as any,
          studentRelevanceScore: job.metadata.studentRelevanceScore as number || 0,
          qualityScore: job.qualityScore || 0
        }
      });
      
      // Create skills associations
      if (job.skills && job.skills.length > 0) {
        await this.createJobSkills(createdJob.id, job.skills);
      }
      
      // Create education requirements associations
      if (job.educationRequirements && job.educationRequirements.length > 0) {
        await this.createJobEducationRequirements(createdJob.id, job.educationRequirements);
      }
      
      // Create language associations
      if (job.languages && job.languages.length > 0) {
        await this.createJobLanguages(createdJob.id, job.languages);
      }
      
      logger.debug(`Successfully created job ${job.externalId} from ${job.source}`);
      
      return createdJob;
    } catch (error) {
      logger.error(`Failed to create job ${job.externalId} from ${job.source}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Updates an existing job in the database
   * @param jobId Job ID
   * @param job Job data
   * @returns Updated job
   */
  private async updateJob(jobId: number, job: JobData): Promise<any> {
    logger.debug(`Updating job ${job.externalId} from ${job.source}`);
    
    try {
      // Update company if needed
      const company = await this.findOrCreateCompany(job.company);
      
      // Update location if needed
      const location = await this.findOrCreateLocation(job.location);
      
      // Update job
      const updatedJob = await this.prisma.job.update({
        where: {
          id: jobId
        },
        data: {
          sourceUrl: job.sourceUrl,
          title: job.title,
          description: job.description,
          descriptionFormatted: job.descriptionFormatted,
          companyId: company.id,
          locationId: location?.id,
          applicationEmail: job.applicationDetails?.email,
          applicationUrl: job.applicationDetails?.url,
          applicationReference: job.applicationDetails?.reference,
          applicationInformation: job.applicationDetails?.information,
          applicationDeadline: job.applicationDetails?.deadlineDate,
          employmentType: job.employmentType,
          workingHoursType: job.workingHoursType,
          duration: job.duration,
          salary: job.salary,
          updatedAt: new Date(),
          expiresAt: job.expirationDate,
          metaData: job.metadata as any,
          studentRelevanceScore: job.metadata.studentRelevanceScore as number || 0,
          qualityScore: job.qualityScore || 0
        }
      });
      
      // Update skills associations
      if (job.skills && job.skills.length > 0) {
        await this.updateJobSkills(jobId, job.skills);
      }
      
      // Update education requirements associations
      if (job.educationRequirements && job.educationRequirements.length > 0) {
        await this.updateJobEducationRequirements(jobId, job.educationRequirements);
      }
      
      // Update language associations
      if (job.languages && job.languages.length > 0) {
        await this.updateJobLanguages(jobId, job.languages);
      }
      
      logger.debug(`Successfully updated job ${job.externalId} from ${job.source}`);
      
      return updatedJob;
    } catch (error) {
      logger.error(`Failed to update job ${job.externalId} from ${job.source}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Finds or creates a company in the database
   * @param company Company data
   * @returns Company entity
   */
  private async findOrCreateCompany(company: JobData['company']): Promise<any> {
    if (!company || !company.name) {
      throw new Error('Company name is required');
    }
    
    try {
      // Try to find existing company by name
      const existingCompany = await this.prisma.company.findFirst({
        where: {
          name: company.name
        }
      });
      
      if (existingCompany) {
        // Update company if needed
        if (
          existingCompany.website !== company.website ||
          existingCompany.email !== company.email ||
          existingCompany.phone !== company.phone ||
          existingCompany.organizationNumber !== company.organizationNumber
        ) {
          return this.prisma.company.update({
            where: {
              id: existingCompany.id
            },
            data: {
              website: company.website || existingCompany.website,
              email: company.email || existingCompany.email,
              phone: company.phone || existingCompany.phone,
              organizationNumber: company.organizationNumber || existingCompany.organizationNumber
            }
          });
        }
        
        return existingCompany;
      } else {
        // Create new company
        return this.prisma.company.create({
          data: {
            name: company.name,
            website: company.website,
            email: company.email,
            phone: company.phone,
            organizationNumber: company.organizationNumber
          }
        });
      }
    } catch (error) {
      logger.error(`Failed to find or create company ${company.name}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Finds or creates a location in the database
   * @param location Location data
   * @returns Location entity
   */
  private async findOrCreateLocation(location: JobData['location']): Promise<any | null> {
    if (!location || (!location.city && !location.municipality && !location.region)) {
      return null;
    }
    
    try {
      // Try to find existing location
      let query: any = {};
      
      if (location.city) query.city = location.city;
      if (location.municipality) query.municipality = location.municipality;
      if (location.region) query.region = location.region;
      
      const existingLocation = await this.prisma.location.findFirst({
        where: query
      });
      
      if (existingLocation) {
        // Update location if needed
        if (
          existingLocation.address !== location.address ||
          existingLocation.postalCode !== location.postalCode ||
          (location.coordinates && (
            existingLocation.latitude !== location.coordinates[0] ||
            existingLocation.longitude !== location.coordinates[1]
          ))
        ) {
          return this.prisma.location.update({
            where: {
              id: existingLocation.id
            },
            data: {
              address: location.address || existingLocation.address,
              postalCode: location.postalCode || existingLocation.postalCode,
              latitude: location.coordinates ? location.coordinates[0] : existingLocation.latitude,
              longitude: location.coordinates ? location.coordinates[1] : existingLocation.longitude
            }
          });
        }
        
        return existingLocation;
      } else {
        // Create new location
        return this.prisma.location.create({
          data: {
            city: location.city,
            municipality: location.municipality,
            region: location.region,
            address: location.address,
            postalCode: location.postalCode,
            latitude: location.coordinates ? location.coordinates[0] : null,
            longitude: location.coordinates ? location.coordinates[1] : null
          }
        });
      }
    } catch (error) {
      logger.error(`Failed to find or create location for ${location.city || location.municipality}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Creates job skills associations
   * @param jobId Job ID
   * @param skills Skills data
   */
  private async createJobSkills(jobId: number, skills: JobData['skills']): Promise<void> {
    try {
      for (const skill of skills) {
        // Find or create skill
        const skillEntity = await this.prisma.skill.upsert({
          where: {
            name: skill.name
          },
          update: {},
          create: {
            name: skill.name
          }
        });
        
        // Create association
        await this.prisma.jobSkill.create({
          data: {
            jobId,
            skillId: skillEntity.id,
            required: skill.required
          }
        });
      }
    } catch (error) {
      logger.error(`Failed to create job skills for job ID ${jobId}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Updates job skills associations
   * @param jobId Job ID
   * @param skills Skills data
   */
  private async updateJobSkills(jobId: number, skills: JobData['skills']): Promise<void> {
    try {
      // Delete existing associations
      await this.prisma.jobSkill.deleteMany({
        where: {
          jobId
        }
      });
      
      // Create new associations
      await this.createJobSkills(jobId, skills);
    } catch (error) {
      logger.error(`Failed to update job skills for job ID ${jobId}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Creates job education requirements associations
   * @param jobId Job ID
   * @param educationRequirements Education requirements data
   */
  private async createJobEducationRequirements(
    jobId: number, 
    educationRequirements: JobData['educationRequirements']
  ): Promise<void> {
    try {
      for (const education of educationRequirements) {
        // Find or create education area
        const educationEntity = await this.prisma.educationArea.upsert({
          where: {
            name: education.name
          },
          update: {},
          create: {
            name: education.name
          }
        });
        
        // Create association
        await this.prisma.jobEducationRequirement.create({
          data: {
            jobId,
            educationAreaId: educationEntity.id,
            required: education.required
          }
        });
      }
    } catch (error) {
      logger.error(`Failed to create job education requirements for job ID ${jobId}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Updates job education requirements associations
   * @param jobId Job ID
   * @param educationRequirements Education requirements data
   */
  private async updateJobEducationRequirements(
    jobId: number, 
    educationRequirements: JobData['educationRequirements']
  ): Promise<void> {
    try {
      // Delete existing associations
      await this.prisma.jobEducationRequirement.deleteMany({
        where: {
          jobId
        }
      });
      
      // Create new associations
      await this.createJobEducationRequirements(jobId, educationRequirements);
    } catch (error) {
      logger.error(`Failed to update job education requirements for job ID ${jobId}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Creates job languages associations
   * @param jobId Job ID
   * @param languages Languages data
   */
  private async createJobLanguages(jobId: number, languages: JobData['languages']): Promise<void> {
    try {
      for (const language of languages) {
        // Find or create language
        const languageEntity = await this.prisma.language.upsert({
          where: {
            name: language.name
          },
          update: {},
          create: {
            name: language.name
          }
        });
        
        // Create association
        await this.prisma.jobLanguage.create({
          data: {
            jobId,
            languageId: languageEntity.id,
            level: language.level,
            required: language.required
          }
        });
      }
    } catch (error) {
      logger.error(`Failed to create job languages for job ID ${jobId}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Updates job languages associations
   * @param jobId Job ID
   * @param languages Languages data
   */
  private async updateJobLanguages(jobId: number, languages: JobData['languages']): Promise<void> {
    try {
      // Delete existing associations
      await this.prisma.jobLanguage.deleteMany({
        where: {
          jobId
        }
      });
      
      // Create new associations
      await this.createJobLanguages(jobId, languages);
    } catch (error) {
      logger.error(`Failed to update job languages for job ID ${jobId}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}

// Create and export a singleton instance
export const jobRepository = new JobRepository();