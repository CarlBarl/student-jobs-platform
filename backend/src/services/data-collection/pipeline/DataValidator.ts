import * as z from 'zod';
import { JobDto } from '../interfaces/DataSource';
import { Logger } from '../../../utils/logger';

/**
 * Service for validating job data
 */
export class DataValidator {
  private logger: Logger;
  
  // Define validation schema using Zod
  private jobSchema = z.object({
    sourceId: z.string().min(1),
    sourceJobId: z.string().min(1),
    title: z.string().min(1).max(255),
    company: z.string().min(1).max(255),
    location: z.string().min(1).max(255),
    description: z.string().min(1),
    requirements: z.string().optional(),
    url: z.string().url(),
    salary: z.string().optional(),
    postedDate: z.date().optional(),
    expiryDate: z.date().optional(),
    educationArea: z.array(z.string()).optional(),
    jobType: z.array(z.string()).optional(),
    workHours: z.string().optional(),
    sourceData: z.record(z.any()).optional()
  });
  
  constructor() {
    this.logger = new Logger('DataValidator');
  }
  
  /**
   * Validate job data
   * @returns Array of valid jobs and array of invalid jobs with errors
   */
  async validate(jobs: JobDto[]): Promise<{
    validJobs: JobDto[];
    invalidJobs: Array<{ job: JobDto; errors: string[] }>;
  }> {
    this.logger.info(`Validating ${jobs.length} jobs`);
    
    const validJobs: JobDto[] = [];
    const invalidJobs: Array<{ job: JobDto; errors: string[] }> = [];
    
    for (const job of jobs) {
      try {
        // Validate against schema
        this.jobSchema.parse(job);
        
        // Additional business logic validation
        const businessErrors = this.validateBusinessRules(job);
        
        if (businessErrors.length > 0) {
          invalidJobs.push({ job, errors: businessErrors });
        } else {
          validJobs.push(job);
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errorMessages = error.errors.map(e => 
            `${e.path.join('.')}: ${e.message}`
          );
          
          this.logger.warn(`Validation failed for job ${job.sourceJobId}`, { 
            sourceId: job.sourceId,
            errors: errorMessages 
          });
          
          invalidJobs.push({ job, errors: errorMessages });
        } else {
          this.logger.error(`Unexpected error validating job ${job.sourceJobId}`, { error });
          invalidJobs.push({ 
            job, 
            errors: [`Unexpected error: ${error.message}`] 
          });
        }
      }
    }
    
    this.logger.info(`Validation complete: ${validJobs.length} valid, ${invalidJobs.length} invalid`);
    
    return { validJobs, invalidJobs };
  }
  
  /**
   * Validate business rules that can't be expressed in schema
   */
  private validateBusinessRules(job: JobDto): string[] {
    const errors: string[] = [];
    
    // Check for suspicious job titles (e.g., MLM schemes, inappropriate content)
    const suspiciousTitlePatterns = [
      /make money fast/i,
      /earn \$\d+ daily/i,
      /no experience needed/i,
      /work from home.{1,20}(per day|per hour|\$\d+)/i
    ];
    
    for (const pattern of suspiciousTitlePatterns) {
      if (pattern.test(job.title)) {
        errors.push(`Suspicious job title matching pattern: ${pattern}`);
      }
    }
    
    // Ensure dates are logical
    if (job.postedDate && job.expiryDate) {
      if (job.expiryDate < job.postedDate) {
        errors.push('Expiry date is before posted date');
      }
    }
    
    // Check if posted date is in the future
    if (job.postedDate && job.postedDate > new Date()) {
      errors.push('Posted date is in the future');
    }
    
    // Check for reasonable expiry date (not too far in the future)
    const maxExpiryDate = new Date();
    maxExpiryDate.setFullYear(maxExpiryDate.getFullYear() + 1);
    
    if (job.expiryDate && job.expiryDate > maxExpiryDate) {
      errors.push('Expiry date is more than 1 year in the future');
    }
    
    return errors;
  }
}