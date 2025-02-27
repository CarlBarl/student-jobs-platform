import { PrismaClient } from '@prisma/client';
import { JobDto } from '../interfaces/DataSource';
import { Logger } from '../../../utils/logger';

/**
 * Repository for job data access
 */
export class JobRepository {
  private prisma: PrismaClient;
  private logger: Logger;
  
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.logger = new Logger('JobRepository');
  }
  
  /**
   * Get all existing jobs
   */
  async getExistingJobs(): Promise<JobDto[]> {
    try {
      this.logger.debug('Fetching existing jobs');
      
      const jobs = await this.prisma.job.findMany({
        include: {
          company: true,
          location: true,
          jobTypes: true,
          educationAreas: true
        }
      });
      
      // Transform Prisma model to JobDto
      return jobs.map(job => this.mapToJobDto(job));
    } catch (error) {
      this.logger.error('Failed to fetch existing jobs', { error });
      throw error;
    }
  }
  
  /**
   * Create new jobs
   */
  async createJobs(jobs: JobDto[]): Promise<void> {
    try {
      this.logger.info(`Creating ${jobs.length} new jobs`);
      
      // For simplicity, we're using a loop here
      // In a production environment, consider using batch operations
      // or a queue system for better performance and reliability
      for (const job of jobs) {
        await this.createJob(job);
      }
      
      this.logger.info(`Successfully created ${jobs.length} jobs`);
    } catch (error) {
      this.logger.error('Failed to create jobs', { error });
      throw error;
    }
  }
  
  /**
   * Update existing jobs
   */
  async updateJobs(jobs: JobDto[]): Promise<void> {
    try {
      this.logger.info(`Updating ${jobs.length} existing jobs`);
      
      for (const job of jobs) {
        await this.updateJob(job);
      }
      
      this.logger.info(`Successfully updated ${jobs.length} jobs`);
    } catch (error) {
      this.logger.error('Failed to update jobs', { error });
      throw error;
    }
  }
  
  /**
   * Create a single job
   */
  private async createJob(job: JobDto): Promise<void> {
    try {
      // First, ensure the company exists
      const company = await this.prisma.company.upsert({
        where: { name: job.company },
        update: {},
        create: { name: job.company }
      });
      
      // Ensure the location exists
      const location = await this.prisma.city.upsert({
        where: { name: job.location },
        update: {},
        create: { name: job.location }
      });
      
      // Create the job
      await this.prisma.job.create({
        data: {
          title: job.title,
          description: job.description,
          requirements: job.requirements,
          url: job.url,
          salary: job.salary,
          sourceId: job.sourceId,
          sourceJobId: job.sourceJobId,
          postedDate: job.postedDate,
          expiryDate: job.expiryDate,
          workHours: job.workHours,
          sourceData: job.sourceData as any, // Cast to any for Prisma JSON field
          
          // Connect to company
          company: {
            connect: { id: company.id }
          },
          
          // Connect to location
          location: {
            connect: { id: location.id }
          },
          
          // Handle job types (create connections)
          jobTypes: job.jobType ? {
            connectOrCreate: job.jobType.map(type => ({
              where: { name: type },
              create: { name: type }
            }))
          } : undefined,
          
          // Handle education areas (create connections)
          educationAreas: job.educationArea ? {
            connectOrCreate: job.educationArea.map(area => ({
              where: { name: area },
              create: { name: area }
            }))
          } : undefined
        }
      });
    } catch (error) {
      this.logger.error(`Failed to create job: ${job.title}`, { 
        jobId: job.sourceJobId,
        error 
      });
      throw error;
    }
  }
  
  /**
   * Update a single job
   */
  private async updateJob(job: JobDto): Promise<void> {
    try {
      // Find the existing job
      const existingJob = await this.prisma.job.findFirst({
        where: {
          sourceId: job.sourceId,
          sourceJobId: job.sourceJobId
        }
      });
      
      if (!existingJob) {
        throw new Error(`Job not found for update: ${job.sourceId}:${job.sourceJobId}`);
      }
      
      // Ensure the company exists
      const company = await this.prisma.company.upsert({
        where: { name: job.company },
        update: {},
        create: { name: job.company }
      });
      
      // Ensure the location exists
      const location = await this.prisma.city.upsert({
        where: { name: job.location },
        update: {},
        create: { name: job.location }
      });
      
      // Update the job
      await this.prisma.job.update({
        where: { id: existingJob.id },
        data: {
          title: job.title,
          description: job.description,
          requirements: job.requirements,
          url: job.url,
          salary: job.salary,
          postedDate: job.postedDate,
          expiryDate: job.expiryDate,
          workHours: job.workHours,
          sourceData: job.sourceData as any, // Cast to any for Prisma JSON field
          updatedAt: new Date(),
          
          // Update company
          company: {
            connect: { id: company.id }
          },
          
          // Update location
          location: {
            connect: { id: location.id }
          },
          
          // Handle job types (disconnect all and connect new ones)
          jobTypes: {
            // First disconnect all existing
            set: [],
            // Then connect new ones
            connectOrCreate: job.jobType ? job.jobType.map(type => ({
              where: { name: type },
              create: { name: type }
            })) : []
          },
          
          // Handle education areas (disconnect all and connect new ones)
          educationAreas: {
            // First disconnect all existing
            set: [],
            // Then connect new ones
            connectOrCreate: job.educationArea ? job.educationArea.map(area => ({
              where: { name: area },
              create: { name: area }
            })) : []
          }
        }
      });
    } catch (error) {
      this.logger.error(`Failed to update job: ${job.title}`, { 
        jobId: job.sourceJobId,
        error 
      });
      throw error;
    }
  }
  
  /**
   * Map Prisma job model to JobDto
   */
  private mapToJobDto(job: any): JobDto {
    return {
      sourceId: job.sourceId,
      sourceJobId: job.sourceJobId,
      title: job.title,
      company: job.company.name,
      location: job.location.name,
      description: job.description,
      requirements: job.requirements,
      url: job.url,
      salary: job.salary,
      postedDate: job.postedDate,
      expiryDate: job.expiryDate,
      educationArea: job.educationAreas.map((area: any) => area.name),
      jobType: job.jobTypes.map((type: any) => type.name),
      workHours: job.workHours,
      sourceData: job.sourceData
    };
  }
}