/**
 * Common types for data collection
 */

export interface ErrorDetails {
  code: string;
  message: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'critical';
  context: Record<string, any>;
}

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
    country?: string;
    address?: string;
    postalCode?: string;
    coordinates?: [number, number]; // [latitude, longitude]
  };
  applicationDetails?: {
    url?: string;
    email?: string;
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
    id: string;
    name: string;
  };
  occupationGroup?: {
    id: string;
    name: string;
  };
  occupationField?: {
    id: string;
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
  metadata: Record<string, any>;
  collectingMetadata: {
    collectedAt: Date;
    processingTimeMs?: number;
    sourceVersion?: string;
    validationIssues: Array<{
      field: string;
      message: string;
      severity: 'warning' | 'error';
    }>;
  };
}

export interface SourceConfig {
  id: string;
  name: string;
  type: 'api' | 'scraper';
  enabled: boolean;
  schedule: {
    frequency: string;
    cron: string;
  };
  maxConcurrentRequests: number;
  rateLimitPerMinute: number;
  retryConfig: {
    maxRetries: number;
    initialDelay: number;
    backoffFactor: number;
  };
}