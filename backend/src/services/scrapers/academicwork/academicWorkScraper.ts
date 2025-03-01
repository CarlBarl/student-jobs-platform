/**
 * Academic Work job scraper implementation
 */
import { BaseScraper, ScraperConfig } from '../base/baseScraper';
import { JobData } from '../types';
import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import { academicWorkConfig } from '../config/sourceConfigs';
import { logger } from '../../../utils/logger';

export class AcademicWorkScraper extends BaseScraper {
  constructor() {
    // Create Academic Work specific scraper configuration
    const scraperConfig: ScraperConfig = {
      ...academicWorkConfig,
      baseUrl: 'https://www.academicwork.se',
      listingPath: '/se/jobbsokande/lediga-jobb',
      listingSelector: '.job-list__list .job-card',
      detailLinkSelector: '.job-card__link',
      paginationConfig: {
        type: 'param',
        paramName: 'page',
        maxPages: 10
      },
      fieldsMap: {
        title: '.job-detail-main__title',
        company: '.job-detail-main__information p a',
        location: '.job-detail-main__information p:nth-child(3)',
        description: '.job-detail-description',
        applicationUrl: '.job-detail-apply__button',
        deadline: '.job-detail-publish__deadline span',
        jobType: '.job-detail-main__information p:nth-child(4)'
      },
      useUserAgent: true
    };
    
    super(scraperConfig);
  }

  /**
   * Extracts job data from a job detail page
   * @param url Job detail page URL
   * @returns Job data
   */
  protected async extractJobData(url: string): Promise<JobData> {
    try {
      logger.debug(`Extracting job data from ${url}`);
      const startTime = Date.now();
      
      // Fetch job page
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      
      // Extract job ID from URL
      const urlParts = url.split('/');
      const jobId = urlParts[urlParts.length - 1];
      
      // Extract basic job information
      const title = $(this.config.fieldsMap.title).text().trim();
      const company = $(this.config.fieldsMap.company).text().trim() || 'Academic Work';
      const locationText = $(this.config.fieldsMap.location).text().trim();
      const description = $(this.config.fieldsMap.description).html() || '';
      const applicationUrl = $(this.config.fieldsMap.applicationUrl).attr('href') || url;
      const deadlineText = $(this.config.fieldsMap.deadline).text().trim();
      const jobTypeText = $(this.config.fieldsMap.jobType).text().trim();
      
      // Parse location
      const location = this.parseLocation(locationText);
      
      // Parse deadline
      const deadlineDate = this.parseDeadline(deadlineText);
      
      // Parse job type
      const jobType = this.parseJobType(jobTypeText);
      
      // Parse skills
      const skills = this.parseSkills($);
      
      // Create job data
      const jobData: JobData = {
        externalId: jobId || uuidv4(),
        source: 'academic-work',
        sourceUrl: url,
        title,
        company: {
          name: company
        },
        description: $(this.config.fieldsMap.description).text().trim(),
        descriptionFormatted: description,
        location,
        applicationDetails: {
          url: applicationUrl,
          deadlineDate
        },
        employmentType: jobType.employmentType,
        workingHoursType: jobType.workingHoursType,
        duration: jobType.duration,
        publicationDate: new Date(), // No explicit publication date on the page
        skills,
        educationRequirements: [],
        languages: [],
        metadata: {
          originalUrl: url
        },
        collectingMetadata: {
          collectedAt: new Date(),
          processingTimeMs: Date.now() - startTime,
          sourceVersion: '1.0',
          validationIssues: []
        }
      };
      
      return jobData;
    } catch (error) {
      logger.error(`Failed to extract job data from ${url}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Parses location text into structured location data
   * @param locationText Location text
   * @returns Structured location data
   */
  private parseLocation(locationText: string): JobData['location'] {
    const location: JobData['location'] = {};
    
    if (!locationText) {
      return location;
    }
    
    // Example format: "Location: Stockholm City"
    const match = locationText.match(/Location:\s*(.*)/i);
    if (match && match[1]) {
      const fullLocation = match[1].trim();
      
      // Try to extract city and region
      const parts = fullLocation.split(',').map(part => part.trim());
      
      if (parts.length > 0) {
        location.city = parts[0];
      }
      
      if (parts.length > 1) {
        location.region = parts[1];
      }
    }
    
    return location;
  }

  /**
   * Parses deadline text into a date
   * @param deadlineText Deadline text
   * @returns Deadline date or undefined
   */
  private parseDeadline(deadlineText: string): Date | undefined {
    if (!deadlineText) {
      return undefined;
    }
    
    try {
      // Example format: "Application deadline: 2023-12-31"
      const match = deadlineText.match(/Application deadline:\s*(.*)/i);
      if (match && match[1]) {
        const dateStr = match[1].trim();
        const date = new Date(dateStr);
        
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    } catch (error) {
      logger.warn(`Failed to parse deadline date: ${deadlineText}`, {
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    return undefined;
  }

  /**
   * Parses job type text into structured job type data
   * @param jobTypeText Job type text
   * @returns Structured job type data
   */
  private parseJobType(jobTypeText: string): {
    employmentType?: string;
    workingHoursType?: string;
    duration?: string;
  } {
    const result = {
      employmentType: undefined as string | undefined,
      workingHoursType: undefined as string | undefined,
      duration: undefined as string | undefined
    };
    
    if (!jobTypeText) {
      return result;
    }
    
    // Example format: "Job type: Full-time, Temporary"
    const match = jobTypeText.match(/Job type:\s*(.*)/i);
    if (match && match[1]) {
      const types = match[1].split(',').map(type => type.trim());
      
      for (const type of types) {
        if (['Full-time', 'Part-time'].includes(type)) {
          result.workingHoursType = type;
        } else if (['Permanent', 'Temporary', 'Contract'].includes(type)) {
          result.employmentType = type;
        } else if (type.includes('month') || type.includes('year') || type.includes('week')) {
          result.duration = type;
        }
      }
    }
    
    return result;
  }

  /**
   * Parses skills from the job description
   * @param $ Cheerio instance
   * @returns Skill array
   */
  private parseSkills($: cheerio.CheerioAPI): JobData['skills'] {
    const skills: JobData['skills'] = [];
    
    // Look for skill sections in the job description
    const skillSection = $('.job-detail-description h2:contains("Requirements"), .job-detail-description h2:contains("Qualifications")').next('ul');
    
    if (skillSection.length > 0) {
      skillSection.find('li').each((_, element) => {
        const skill = $(element).text().trim();
        if (skill) {
          skills.push({
            name: skill,
            required: true
          });
        }
      });
    }
    
    // Look for merits/nice-to-have skills
    const meritSection = $('.job-detail-description h2:contains("Merits"), .job-detail-description h2:contains("Nice to have")').next('ul');
    
    if (meritSection.length > 0) {
      meritSection.find('li').each((_, element) => {
        const skill = $(element).text().trim();
        if (skill) {
          skills.push({
            name: skill,
            required: false
          });
        }
      });
    }
    
    return skills;
  }
}

// Create a singleton instance
export const academicWorkScraper = new AcademicWorkScraper();