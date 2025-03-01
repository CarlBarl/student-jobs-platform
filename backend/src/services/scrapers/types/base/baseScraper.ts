/**
 * Base scraper class for web scraping job listings
 */
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import { SourceAdapter, SourceConfig, CollectionResult, ErrorDetails, ChangeDetectionResult, JobData } from '../types';
import { logger } from '../../../utils/logger';
import { validateJobData } from '../validators/jobDataValidator';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface ScraperConfig extends SourceConfig {
  baseUrl: string;
  listingPath: string;
  listingSelector: string;
  detailLinkSelector: string;
  paginationConfig?: {
    type: 'url' | 'param' | 'infinite-scroll';
    paramName?: string;
    urlPattern?: string;
    maxPages?: number;
  };
  fieldsMap: {
    title: string;
    company?: string;
    location?: string;
    description?: string;
    applicationUrl?: string;
    deadline?: string;
    jobType?: string;
  };
  requestHeaders?: Record<string, string>;
  useUserAgent?: boolean;
  proxyConfig?: {
    enabled: boolean;
    rotationStrategy: 'round-robin' | 'random';
    urls: string[];
  };
}

export abstract class BaseScraper implements SourceAdapter {
  protected readonly client: AxiosInstance;
  public readonly config: ScraperConfig;
  protected fingerprints: Map<string, string> = new Map();
  protected readonly snapshotDir: string;
  
  /**
   * Creates a new base scraper
   * @param config Scraper configuration
   */
  constructor(config: ScraperConfig) {
    this.config = config;
    this.snapshotDir = path.join(__dirname, '../../../../data/scraper-snapshots', config.id);
    
    // Create snapshots directory if it doesn't exist
    if (!fs.existsSync(this.snapshotDir)) {
      fs.mkdirSync(this.snapshotDir, { recursive: true });
    }
    
    // Initialize axios client
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: 30000,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml',
        'Accept-Language': 'en-US,en;q=0.5',
        ...(config.useUserAgent ? {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        } : {}),
        ...(config.requestHeaders || {})
      }
    });
    
    // Set up request interceptor for rate limiting
    this.client.interceptors.request.use(this.rateLimit.bind(this));
  }

  /**
   * Initializes the scraper
   */
  public async initialize(): Promise<void> {
    try {
      logger.info(`Initializing scraper for ${this.config.name}`);
      
      // Load existing fingerprints
      await this.loadFingerprints();
      
      // Test connection to verify the scraper is working
      await this.testConnection();
      
      logger.info(`Scraper for ${this.config.name} initialized successfully`);
    } catch (error) {
      logger.error(`Failed to initialize scraper for ${this.config.name}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Tests the connection to the source
   */
  public async testConnection(): Promise<boolean> {
    try {
      logger.debug(`Testing connection to ${this.config.baseUrl}`);
      const response = await this.client.get(this.config.listingPath);
      
      if (response.status !== 200) {
        throw new Error(`Received status code ${response.status}`);
      }
      
      // Parse HTML to ensure it has the expected structure
      const $ = cheerio.load(response.data);
      const listings = $(this.config.listingSelector);
      
      if (listings.length === 0) {
        throw new Error(`No elements found matching selector: ${this.config.listingSelector}`);
      }
      
      logger.debug(`Connection test successful for ${this.config.name}, found ${listings.length} listings`);
      return true;
    } catch (error) {
      logger.error(`Connection test failed for ${this.config.name}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Collects job listings from the source
   */
  public async collect(): Promise<CollectionResult> {
    const startTime = Date.now();
    const errors: ErrorDetails[] = [];
    const jobsData: JobData[] = [];
    
    logger.info(`Starting collection for ${this.config.name}`);
    
    try {
      // Collect job URLs from listing pages
      const jobUrls = await this.collectJobUrls();
      logger.info(`Collected ${jobUrls.length} job URLs from ${this.config.name}`);
      
      // Process each job URL
      let processed = 0;
      let validationFailures = 0;
      
      for (const url of jobUrls) {
        try {
          // Check if we've exceeded the maximum concurrent requests
          await this.enforceMaxConcurrentRequests();
          
          // Extract job data
          const jobData = await this.extractJobData(url);
          
          // Validate job data
          const validationResult = validateJobData(jobData);
          
          if (validationResult.valid) {
            jobsData.push(jobData);
            processed++;
          } else {
            validationFailures++;
            // Add validation issues to job metadata
            jobData.collectingMetadata.validationIssues = validationResult.issues;
            
            // Include job if only warnings
            if (validationResult.issues.every(issue => issue.severity !== 'error')) {
              jobsData.push(jobData);
              processed++;
            }
          }
          
          // Add a small delay between requests
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          const errorDetail: ErrorDetails = {
            code: 'job_extraction_error',
            message: `Failed to extract job data from ${url}: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: new Date(),
            severity: 'error',
            context: { url }
          };
          errors.push(errorDetail);
          logger.error(`Failed to extract job data for ${this.config.name}`, errorDetail);
        }
      }
      
      const status = errors.length === 0 ? 'success' : (jobsData.length > 0 ? 'partial' : 'failure');
      
      logger.info(`Collection completed for ${this.config.name}`, {
        jobsCollected: jobUrls.length,
        jobsProcessed: processed,
        errorCount: errors.length,
        durationMs: Date.now() - startTime
      });
      
      return {
        sourceId: this.config.id,
        timestamp: new Date(),
        status,
        jobsCollected: jobUrls.length,
        jobsProcessed: processed,
        jobsStored: jobsData.length,
        validationFailures,
        durationMs: Date.now() - startTime,
        errors,
        jobs: jobsData
      };
    } catch (error) {
      const errorDetail: ErrorDetails = {
        code: 'collection_error',
        message: `Failed to collect jobs from ${this.config.name}: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date(),
        severity: 'critical',
        context: {}
      };
      errors.push(errorDetail);
      logger.error(`Critical error in collection for ${this.config.name}`, errorDetail);
      
      return {
        sourceId: this.config.id,
        timestamp: new Date(),
        status: 'failure',
        jobsCollected: 0,
        jobsProcessed: 0,
        jobsStored: 0,
        validationFailures: 0,
        durationMs: Date.now() - startTime,
        errors,
        jobs: []
      };
    }
  }

  /**
   * Detects structural changes in the source website
   */
  public async detectStructuralChanges(): Promise<ChangeDetectionResult> {
    try {
      logger.info(`Detecting structural changes for ${this.config.name}`);
      
      // Fetch the listing page
      const response = await this.client.get(this.config.listingPath);
      const html = response.data;
      
      // Create a fingerprint of the current page structure
      const newFingerprint = this.createFingerprint(html);
      
      // Get the previous fingerprint
      const oldFingerprint = this.fingerprints.get('listing') || '';
      
      // Compare fingerprints
      if (!oldFingerprint) {
        // First run, save fingerprint
        this.fingerprints.set('listing', newFingerprint);
        await this.saveFingerprints();
        
        // Save a snapshot of the page
        await this.saveSnapshot('listing', html);
        
        return {
          sourceId: this.config.id,
          timestamp: new Date(),
          status: 'unchanged',
          changes: [],
          canAdaptAutomatically: true
        };
      }
      
      // Check if fingerprints match
      if (oldFingerprint === newFingerprint) {
        return {
          sourceId: this.config.id,
          timestamp: new Date(),
          status: 'unchanged',
          changes: [],
          canAdaptAutomatically: true
        };
      }
      
      // Fingerprints don't match, analyze changes
      const changes = await this.analyzeStructuralChanges(oldFingerprint, newFingerprint);
      
      // Update fingerprint and save snapshot if changes detected
      this.fingerprints.set('listing', newFingerprint);
      await this.saveFingerprints();
      await this.saveSnapshot('listing', html);
      
      // Determine if changes can be handled automatically
      const majorChanges = changes.filter(change => change.impact === 'high');
      const canAdaptAutomatically = majorChanges.length === 0;
      
      const status = canAdaptAutomatically ? 'minor_changes' : 'major_changes';
      
      logger.info(`Structural change detection completed for ${this.config.name}`, {
        status,
        changeCount: changes.length,
        majorChangeCount: majorChanges.length
      });
      
      return {
        sourceId: this.config.id,
        timestamp: new Date(),
        status,
        changes,
        canAdaptAutomatically
      };
    } catch (error) {
      logger.error(`Failed to detect structural changes for ${this.config.name}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        sourceId: this.config.id,
        timestamp: new Date(),
        status: 'error',
        changes: [{
          elementType: 'unknown',
          path: 'unknown',
          impact: 'high',
          message: `Error detecting changes: ${error instanceof Error ? error.message : String(error)}`
        }],
        canAdaptAutomatically: false
      };
    }
  }

  /**
   * Collects job URLs from listing pages
   * @protected
   * @returns List of job URLs
   */
  protected async collectJobUrls(): Promise<string[]> {
    const jobUrls: Set<string> = new Set();
    const errors: Error[] = [];
    
    try {
      // Calculate max pages
      const maxPages = this.config.paginationConfig?.maxPages || 5;
      
      // Process first page
      const firstPageUrls = await this.extractJobUrlsFromPage(this.config.listingPath);
      firstPageUrls.forEach(url => jobUrls.add(url));
      
      // Process additional pages if pagination is configured
      if (this.config.paginationConfig) {
        const { type, paramName, urlPattern } = this.config.paginationConfig;
        
        for (let page = 2; page <= maxPages; page++) {
          try {
            let pageUrl: string;
            
            if (type === 'param' && paramName) {
              pageUrl = `${this.config.listingPath}${this.config.listingPath.includes('?') ? '&' : '?'}${paramName}=${page}`;
            } else if (type === 'url' && urlPattern) {
              pageUrl = urlPattern.replace('{page}', page.toString());
            } else {
              // Infinite scroll not supported in base implementation
              break;
            }
            
            const pageUrls = await this.extractJobUrlsFromPage(pageUrl);
            pageUrls.forEach(url => jobUrls.add(url));
            
            // Add a small delay between page requests
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            errors.push(error instanceof Error ? error : new Error(String(error)));
            logger.error(`Failed to extract job URLs from page ${page} for ${this.config.name}`, {
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      }
      
      return Array.from(jobUrls);
    } catch (error) {
      logger.error(`Failed to collect job URLs for ${this.config.name}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Extracts job URLs from a listing page
   * @protected
   * @param pageUrl Listing page URL
   * @returns List of job URLs
   */
  protected async extractJobUrlsFromPage(pageUrl: string): Promise<string[]> {
    try {
      const response = await this.client.get(pageUrl);
      const $ = cheerio.load(response.data);
      
      const urls: string[] = [];
      
      // Find job listings and extract URLs
      $(this.config.listingSelector).each((_, element) => {
        const linkElement = $(element).find(this.config.detailLinkSelector);
        const href = linkElement.attr('href');
        
        if (href) {
          // Handle relative URLs
          const fullUrl = href.startsWith('http') ? href : new URL(href, this.config.baseUrl).toString();
          urls.push(fullUrl);
        }
      });
      
      return urls;
    } catch (error) {
      logger.error(`Failed to extract job URLs from page ${pageUrl} for ${this.config.name}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Extracts job data from a job detail page
   * @protected
   * @param url Job detail page URL
   * @returns Job data
   */
  protected abstract extractJobData(url: string): Promise<JobData>;

  /**
   * Creates a fingerprint of an HTML document structure
   * @protected
   * @param html HTML document
   * @returns Fingerprint string
   */
  protected createFingerprint(html: string): string {
    // Load HTML
    const $ = cheerio.load(html);
    
    // Remove dynamic content that might change between requests
    $('script').remove();
    $('noscript').remove();
    $('style').remove();
    $('link').remove();
    $('meta').remove();
    
    // Extract structural information
    const structure = this.extractStructure($('body'));
    
    // Create a hash of the structure
    return crypto.createHash('sha256').update(JSON.stringify(structure)).digest('hex');
  }

  /**
   * Extracts the structure of an HTML element for fingerprinting
   * @protected
   * @param element Cheerio element
   * @returns Structure object
   */
  protected extractStructure(element: cheerio.Cheerio): any {
    // Get element tag name
    const tagName = element.prop('tagName')?.toLowerCase() || '';
    
    // Get element classes
    const classes = element.attr('class')?.split(/\s+/).filter(Boolean) || [];
    
    // Get element ID
    const id = element.attr('id');
    
    // Extract structure of child elements
    const children = element.children().map((_, child) => {
      return this.extractStructure(cheerio.load(child)('html'));
    }).get();
    
    return {
      tagName,
      classes,
      id,
      childCount: children.length,
      childTypes: children.map(child => child.tagName)
    };
  }

  /**
   * Analyzes structural changes between fingerprints
   * @protected
   * @param oldFingerprint Old fingerprint
   * @param newFingerprint New fingerprint
   * @returns List of structural changes
   */
  protected async analyzeStructuralChanges(oldFingerprint: string, newFingerprint: string): Promise<any[]> {
    // Basic implementation - in a real system this would be more sophisticated
    const changes = [];
    
    try {
      // Load the old snapshot
      const oldSnapshotPath = path.join(this.snapshotDir, 'listing.html');
      const oldSnapshot = fs.existsSync(oldSnapshotPath) ? 
        fs.readFileSync(oldSnapshotPath, 'utf-8') : '';
      
      // Fetch the current page
      const response = await this.client.get(this.config.listingPath);
      const newSnapshot = response.data;
      
      if (!oldSnapshot) {
        changes.push({
          elementType: 'page',
          path: '/',
          impact: 'medium',
          message: 'No previous snapshot available for comparison'
        });
        return changes;
      }
      
      // Parse old and new snapshots
      const $old = cheerio.load(oldSnapshot);
      const $new = cheerio.load(newSnapshot);
      
      // Check for changes in listing selector
      const oldListings = $old(this.config.listingSelector);
      const newListings = $new(this.config.listingSelector);
      
      if (oldListings.length === 0 && newListings.length === 0) {
        changes.push({
          elementType: 'selector',
          path: this.config.listingSelector,
          impact: 'high',
          message: 'Listing selector not found in old or new snapshot'
        });
      } else if (oldListings.length === 0) {
        changes.push({
          elementType: 'selector',
          path: this.config.listingSelector,
          impact: 'low',
          message: 'Listing selector not found in old snapshot but found in new'
        });
      } else if (newListings.length === 0) {
        changes.push({
          elementType: 'selector',
          path: this.config.listingSelector,
          impact: 'high',
          message: 'Listing selector found in old snapshot but not in new'
        });
      } else if (Math.abs(oldListings.length - newListings.length) > oldListings.length * 0.5) {
        changes.push({
          elementType: 'selector',
          path: this.config.listingSelector,
          impact: 'medium',
          message: `Significant change in number of listings: ${oldListings.length} -> ${newListings.length}`
        });
      }
      
      // Check for changes in detail link selector
      if (newListings.length > 0) {
        const oldLinks = $old(`${this.config.listingSelector} ${this.config.detailLinkSelector}`);
        const newLinks = $new(`${this.config.listingSelector} ${this.config.detailLinkSelector}`);
        
        if (oldLinks.length === 0 && newLinks.length === 0) {
          changes.push({
            elementType: 'selector',
            path: this.config.detailLinkSelector,
            impact: 'high',
            message: 'Detail link selector not found in old or new snapshot'
          });
        } else if (oldLinks.length === 0) {
          changes.push({
            elementType: 'selector',
            path: this.config.detailLinkSelector,
            impact: 'low',
            message: 'Detail link selector not found in old snapshot but found in new'
          });
        } else if (newLinks.length === 0) {
          changes.push({
            elementType: 'selector',
            path: this.config.detailLinkSelector,
            impact: 'high',
            message: 'Detail link selector found in old snapshot but not in new'
          });
        }
      }
      
      // Check field selectors
      for (const [field, selector] of Object.entries(this.config.fieldsMap)) {
        if (!selector) continue;
        
        const oldField = $old(selector);
        const newField = $new(selector);
        
        if (oldField.length === 0 && newField.length === 0) {
          changes.push({
            elementType: 'field',
            path: selector,
            impact: 'medium',
            message: `Field selector for ${field} not found in old or new snapshot`
          });
        } else if (oldField.length === 0) {
          changes.push({
            elementType: 'field',
            path: selector,
            impact: 'low',
            message: `Field selector for ${field} not found in old snapshot but found in new`
          });
        } else if (newField.length === 0) {
          changes.push({
            elementType: 'field',
            path: selector,
            impact: 'high',
            message: `Field selector for ${field} found in old snapshot but not in new`
          });
        }
      }
      
      return changes;
    } catch (error) {
      logger.error(`Failed to analyze structural changes for ${this.config.name}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      
      changes.push({
        elementType: 'analysis',
        path: '/',
        impact: 'high',
        message: `Error analyzing changes: ${error instanceof Error ? error.message : String(error)}`
      });
      
      return changes;
    }
  }

  /**
   * Rate limits requests according to configuration
   * @protected
   * @param config Request config
   * @returns Modified request config
   */
  protected async rateLimit(config: AxiosRequestConfig): Promise<AxiosRequestConfig> {
    // Add a random delay to avoid detection and spread out requests
    const delay = Math.floor(60000 / this.config.rateLimitPerMinute);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return config;
  }

  /**
   * Enforces the maximum number of concurrent requests
   * @protected
   */
  protected async enforceMaxConcurrentRequests(): Promise<void> {
    // Simple implementation - in a real system this would use a semaphore
    const delay = Math.floor(1000 / this.config.maxConcurrentRequests);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Loads fingerprints from disk
   * @protected
   */
  protected async loadFingerprints(): Promise<void> {
    const fingerprintPath = path.join(this.snapshotDir, 'fingerprints.json');
    
    if (fs.existsSync(fingerprintPath)) {
      try {
        const data = fs.readFileSync(fingerprintPath, 'utf-8');
        const fingerprints = JSON.parse(data);
        
        for (const [key, value] of Object.entries(fingerprints)) {
          this.fingerprints.set(key, value as string);
        }
        
        logger.debug(`Loaded ${this.fingerprints.size} fingerprints for ${this.config.name}`);
      } catch (error) {
        logger.error(`Failed to load fingerprints for ${this.config.name}`, {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  /**
   * Saves fingerprints to disk
   * @protected
   */
  protected async saveFingerprints(): Promise<void> {
    const fingerprintPath = path.join(this.snapshotDir, 'fingerprints.json');
    
    try {
      const fingerprints: Record<string, string> = {};
      
      for (const [key, value] of this.fingerprints.entries()) {
        fingerprints[key] = value;
      }
      
      fs.writeFileSync(fingerprintPath, JSON.stringify(fingerprints, null, 2));
      logger.debug(`Saved ${this.fingerprints.size} fingerprints for ${this.config.name}`);
    } catch (error) {
      logger.error(`Failed to save fingerprints for ${this.config.name}`, {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Saves a snapshot of a page
   * @protected
   * @param name Snapshot name
   * @param html HTML content
   */
  protected async saveSnapshot(name: string, html: string): Promise<void> {
    const snapshotPath = path.join(this.snapshotDir, `${name}.html`);
    
    try {
      fs.writeFileSync(snapshotPath, html);
      logger.debug(`Saved snapshot ${name} for ${this.config.name}`);
    } catch (error) {
      logger.error(`Failed to save snapshot ${name} for ${this.config.name}`, {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}