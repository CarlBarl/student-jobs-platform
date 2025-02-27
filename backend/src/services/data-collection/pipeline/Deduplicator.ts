import { JobDto } from '../interfaces/DataSource';
import { Logger } from '../../../utils/logger';

/**
 * Service for detecting and handling duplicate job listings
 */
export class Deduplicator {
  private logger: Logger;
  
  constructor() {
    this.logger = new Logger('Deduplicator');
  }
  
  /**
   * Deduplicate job listings
   * @param newJobs Newly collected jobs
   * @param existingJobs Jobs that already exist in the database
   */
  async deduplicate(newJobs: JobDto[], existingJobs: JobDto[]): Promise<{
    jobsToCreate: JobDto[];
    jobsToUpdate: JobDto[];
  }> {
    this.logger.info(`Deduplicating ${newJobs.length} jobs against ${existingJobs.length} existing jobs`);
    
    const jobsToCreate: JobDto[] = [];
    const jobsToUpdate: JobDto[] = [];
    
    // Create lookup maps for fast access
    const existingJobMap = new Map<string, JobDto>();
    const existingJobTitleCompanyMap = new Map<string, JobDto[]>();
    
    // Populate lookup maps
    for (const job of existingJobs) {
      // Map by source and source job ID
      const sourceKey = `${job.sourceId}:${job.sourceJobId}`;
      existingJobMap.set(sourceKey, job);
      
      // Map by title + company for fuzzy matching
      const titleCompanyKey = this.normalizeForMatching(`${job.title}:${job.company}`);
      
      if (!existingJobTitleCompanyMap.has(titleCompanyKey)) {
        existingJobTitleCompanyMap.set(titleCompanyKey, []);
      }
      
      existingJobTitleCompanyMap.get(titleCompanyKey)!.push(job);
    }
    
    for (const job of newJobs) {
      // Check for exact match by source and ID
      const sourceKey = `${job.sourceId}:${job.sourceJobId}`;
      
      if (existingJobMap.has(sourceKey)) {
        // We have an exact match, mark for update
        jobsToUpdate.push(job);
        continue;
      }
      
      // Check for fuzzy match by title + company
      const titleCompanyKey = this.normalizeForMatching(`${job.title}:${job.company}`);
      const possibleMatches = existingJobTitleCompanyMap.get(titleCompanyKey) || [];
      
      if (possibleMatches.length > 0) {
        // Check if any of the possible matches are from a different source
        const otherSourceMatches = possibleMatches.filter(
          existingJob => existingJob.sourceId !== job.sourceId
        );
        
        if (otherSourceMatches.length > 0) {
          // We have a potential cross-source duplicate
          this.logger.info(`Potential cross-source duplicate detected: "${job.title}" at ${job.company}`, {
            newJob: {
              sourceId: job.sourceId,
              sourceJobId: job.sourceJobId
            },
            existingJobs: otherSourceMatches.map(j => ({
              sourceId: j.sourceId,
              sourceJobId: j.sourceJobId
            }))
          });
          
          // For now, we still add the job - in a real system, we might
          // want to link these jobs or merge them
        }
      }
      
      // No exact match found, add as new job
      jobsToCreate.push(job);
    }
    
    this.logger.info(`Deduplication complete: ${jobsToCreate.length} to create, ${jobsToUpdate.length} to update`);
    
    return {
      jobsToCreate,
      jobsToUpdate
    };
  }
  
  /**
   * Normalize string for fuzzy matching
   */
  private normalizeForMatching(input: string): string {
    return input
      .toLowerCase()
      .replace(/\s+/g, '') // Remove whitespace
      .replace(/[^\w]/g, ''); // Remove non-alphanumeric
  }
}