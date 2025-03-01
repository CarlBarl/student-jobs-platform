/**
 * Core interfaces for the data collection framework
 */

// Source configuration
export interface SourceConfig {
    id: string;
    name: string;
    type: 'api' | 'scraper';
    enabled: boolean;
    schedule: {
      frequency: 'hourly' | 'daily' | 'weekly';
      cron?: string; // Custom cron expression if needed
    };
    maxConcurrentRequests: number;
    rateLimitPerMinute: number;
    retryConfig: {
      maxRetries: number;
      initialDelay: number; // in ms
      backoffFactor: number;
    };
  }
  
  // Source adapter interface - implemented by all data sources
  export interface SourceAdapter {
    readonly config: SourceConfig;
    
    // Core methods
    initialize(): Promise<void>;
    collect(): Promise<CollectionResult>;
    testConnection(): Promise<boolean>;
    
    // Change detection related
    detectStructuralChanges(): Promise<ChangeDetectionResult>;
  }
  
  // Job data interface - unified format for all sources
  export interface JobData {
    externalId: string;
    source: string;
    sourceUrl: string;
    title: string;
    company: {
      name: string;
      organizationNumber?: string;
      website?: string;
      email?: string;
      phone?: string;
    };
    description: string;
    descriptionFormatted?: string;
    location: {
      city?: string;
      municipality?: string;
      region?: string;
      address?: string;
      postalCode?: string;
      coordinates?: [number, number]; // [lat, long]
    };
    applicationDetails: {
      email?: string;
      url?: string;
      reference?: string;
      information?: string;
      deadlineDate?: Date;
    };
    employmentType?: string;
    workingHoursType?: string;
    duration?: string;
    salary?: string;
    publicationDate: Date;
    lastPublicationDate?: Date;
    expirationDate?: Date;
    occupation?: {
      id?: string;
      name: string;
    };
    occupationGroup?: {
      id?: string;
      name: string;
    };
    occupationField?: {
      id?: string;
      name: string;
    };
    skills: Array<{
      name: string;
      required: boolean;
    }>;
    educationRequirements: Array<{
      name: string;
      required: boolean;
    }>;
    languages: Array<{
      name: string;
      level?: string;
      required: boolean;
    }>;
    metadata: Record<string, any>; // Source-specific metadata
    qualityScore?: number; // Calculated quality score
    collectingMetadata: {
      collectedAt: Date;
      processingTimeMs: number;
      sourceVersion: string;
      validationIssues: ValidationIssue[];
    };
  }
  
  // Validation issue interface
  export interface ValidationIssue {
    field: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
    code: string;
  }
  
  // Collection result interface
  export interface CollectionResult {
    sourceId: string;
    timestamp: Date;
    status: 'success' | 'partial' | 'failure';
    jobsCollected: number;
    jobsProcessed: number;
    jobsStored: number;
    validationFailures: number;
    durationMs: number;
    errors: ErrorDetails[];
    jobs: JobData[];
  }
  
  // Error details interface
  export interface ErrorDetails {
    code: string;
    message: string;
    context?: Record<string, any>;
    timestamp: Date;
    severity: 'critical' | 'error' | 'warning' | 'info';
  }
  
  // Change detection result interface
  export interface ChangeDetectionResult {
    sourceId: string;
    timestamp: Date;
    status: 'unchanged' | 'minor_changes' | 'major_changes' | 'error';
    changes: StructuralChange[];
    canAdaptAutomatically: boolean;
  }
  
  // Structural change interface
  export interface StructuralChange {
    elementType: string;
    path: string;
    previousValue?: string;
    currentValue?: string;
    impact: 'low' | 'medium' | 'high';
    message: string;
  }