/**
 * Validates job data against schema and business rules
 */
import { JobData, ValidationIssue } from '../types';
import { logger } from '../../../utils/logger';
import { isValidURL } from '../../../utils/validation';

interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

/**
 * Validates job data
 * @param job Job data to validate
 * @returns Validation result
 */
export function validateJobData(job: JobData): ValidationResult {
  const issues: ValidationIssue[] = [];
  
  // Required fields validation
  validateRequiredFields(job, issues);
  
  // Format validation
  validateFormats(job, issues);
  
  // Business rule validation
  validateBusinessRules(job, issues);
  
  // Calculate validation result
  const hasErrors = issues.some(issue => issue.severity === 'error');
  
  return {
    valid: !hasErrors,
    issues
  };
}

/**
 * Validates required fields
 * @param job Job data
 * @param issues Issues array to append to
 */
function validateRequiredFields(job: JobData, issues: ValidationIssue[]): void {
  // Check for required fields
  if (!job.externalId) {
    issues.push({
      field: 'externalId',
      severity: 'error',
      message: 'External ID is required',
      code: 'missing_required_field'
    });
  }
  
  if (!job.title) {
    issues.push({
      field: 'title',
      severity: 'error',
      message: 'Job title is required',
      code: 'missing_required_field'
    });
  }
  
  if (!job.source) {
    issues.push({
      field: 'source',
      severity: 'error',
      message: 'Source identifier is required',
      code: 'missing_required_field'
    });
  }
  
  if (!job.sourceUrl) {
    issues.push({
      field: 'sourceUrl',
      severity: 'error',
      message: 'Source URL is required',
      code: 'missing_required_field'
    });
  }
  
  if (!job.description) {
    issues.push({
      field: 'description',
      severity: 'error',
      message: 'Job description is required',
      code: 'missing_required_field'
    });
  }
  
  if (!job.company || !job.company.name) {
    issues.push({
      field: 'company.name',
      severity: 'error',
      message: 'Company name is required',
      code: 'missing_required_field'
    });
  }
  
  if (!job.publicationDate) {
    issues.push({
      field: 'publicationDate',
      severity: 'error',
      message: 'Publication date is required',
      code: 'missing_required_field'
    });
  }
}

/**
 * Validates field formats
 * @param job Job data
 * @param issues Issues array to append to
 */
function validateFormats(job: JobData, issues: ValidationIssue[]): void {
  // Validate URL formats
  if (job.sourceUrl && !isValidURL(job.sourceUrl)) {
    issues.push({
      field: 'sourceUrl',
      severity: 'error',
      message: 'Source URL is not a valid URL',
      code: 'invalid_format'
    });
  }
  
  if (job.company?.website && !isValidURL(job.company.website)) {
    issues.push({
      field: 'company.website',
      severity: 'warning',
      message: 'Company website is not a valid URL',
      code: 'invalid_format'
    });
  }
  
  if (job.applicationDetails?.url && !isValidURL(job.applicationDetails.url)) {
    issues.push({
      field: 'applicationDetails.url',
      severity: 'warning',
      message: 'Application URL is not a valid URL',
      code: 'invalid_format'
    });
  }
  
  // Validate email formats
  if (job.company?.email && !isValidEmail(job.company.email)) {
    issues.push({
      field: 'company.email',
      severity: 'warning',
      message: 'Company email is not a valid email address',
      code: 'invalid_format'
    });
  }
  
  if (job.applicationDetails?.email && !isValidEmail(job.applicationDetails.email)) {
    issues.push({
      field: 'applicationDetails.email',
      severity: 'warning',
      message: 'Application email is not a valid email address',
      code: 'invalid_format'
    });
  }
  
  // Validate date formats
  if (job.publicationDate && !isValidDate(job.publicationDate)) {
    issues.push({
      field: 'publicationDate',
      severity: 'error',
      message: 'Publication date is not a valid date',
      code: 'invalid_format'
    });
  }
  
  if (job.lastPublicationDate && !isValidDate(job.lastPublicationDate)) {
    issues.push({
      field: 'lastPublicationDate',
      severity: 'warning',
      message: 'Last publication date is not a valid date',
      code: 'invalid_format'
    });
  }
  
  if (job.expirationDate && !isValidDate(job.expirationDate)) {
    issues.push({
      field: 'expirationDate',
      severity: 'warning',
      message: 'Expiration date is not a valid date',
      code: 'invalid_format'
    });
  }
  
  if (job.applicationDetails?.deadlineDate && !isValidDate(job.applicationDetails.deadlineDate)) {
    issues.push({
      field: 'applicationDetails.deadlineDate',
      severity: 'warning',
      message: 'Application deadline date is not a valid date',
      code: 'invalid_format'
    });
  }
}

/**
 * Validates business rules
 * @param job Job data
 * @param issues Issues array to append to
 */
function validateBusinessRules(job: JobData, issues: ValidationIssue[]): void {
  // Check if title is too short
  if (job.title && job.title.length < 3) {
    issues.push({
      field: 'title',
      severity: 'warning',
      message: 'Job title is too short',
      code: 'title_too_short'
    });
  }
  
  // Check if title is too long
  if (job.title && job.title.length > 100) {
    issues.push({
      field: 'title',
      severity: 'warning',
      message: 'Job title is too long',
      code: 'title_too_long'
    });
  }
  
  // Check if description is too short
  if (job.description && job.description.length < 50) {
    issues.push({
      field: 'description',
      severity: 'warning',
      message: 'Job description is too short',
      code: 'description_too_short'
    });
  }
  
  // Check if description is too long
  if (job.description && job.description.length > 10000) {
    issues.push({
      field: 'description',
      severity: 'warning',
      message: 'Job description is too long',
      code: 'description_too_long'
    });
  }
  
  // Check if publication date is in the future
  if (job.publicationDate && job.publicationDate > new Date()) {
    issues.push({
      field: 'publicationDate',
      severity: 'warning',
      message: 'Publication date is in the future',
      code: 'future_publication_date'
    });
  }
  
  // Check if expiration date is before publication date
  if (job.publicationDate && job.expirationDate && job.expirationDate < job.publicationDate) {
    issues.push({
      field: 'expirationDate',
      severity: 'error',
      message: 'Expiration date is before publication date',
      code: 'expiration_before_publication'
    });
  }
  
  // Check if application deadline is before publication date
  if (job.publicationDate && job.applicationDetails?.deadlineDate && 
      job.applicationDetails.deadlineDate < job.publicationDate) {
    issues.push({
      field: 'applicationDetails.deadlineDate',
      severity: 'warning',
      message: 'Application deadline is before publication date',
      code: 'deadline_before_publication'
    });
  }
  
  // Check if application deadline is in the past
  if (job.applicationDetails?.deadlineDate && job.applicationDetails.deadlineDate < new Date()) {
    issues.push({
      field: 'applicationDetails.deadlineDate',
      severity: 'info',
      message: 'Application deadline is in the past',
      code: 'deadline_in_past'
    });
  }
  
  // Check for student relevance
  assessStudentRelevance(job, issues);
}

/**
 * Assesses if a job is relevant for students
 * @param job Job data
 * @param issues Issues array to append to
 */
function assessStudentRelevance(job: JobData, issues: ValidationIssue[]): void {
  let studentRelevanceScore = 0;
  const maxScore = 10;
  
  // Check for keywords in title
  const studentKeywords = ['student', 'internship', 'intern', 'trainee', 'part-time', 'extra', 'junior'];
  for (const keyword of studentKeywords) {
    if (job.title.toLowerCase().includes(keyword.toLowerCase())) {
      studentRelevanceScore += 2;
    }
  }
  
  // Check for keywords in description
  for (const keyword of studentKeywords) {
    if (job.description.toLowerCase().includes(keyword.toLowerCase())) {
      studentRelevanceScore += 1;
    }
  }
  
  // Check for part-time work
  if (job.workingHoursType?.toLowerCase().includes('part')) {
    studentRelevanceScore += 2;
  }
  
  // Check for temporary or short-term contracts
  if (job.employmentType?.toLowerCase().includes('temp') || 
      job.employmentType?.toLowerCase().includes('summer') ||
      job.duration?.toLowerCase().includes('month') ||
      job.duration?.toLowerCase().includes('week')) {
    studentRelevanceScore += 2;
  }
  
  // Check for no experience required
  if (job.description.toLowerCase().includes('no experience') || 
      job.description.toLowerCase().includes('no prior experience')) {
    studentRelevanceScore += 2;
  }
  
  // Add relevance score to job metadata
  job.metadata.studentRelevanceScore = studentRelevanceScore / maxScore * 100;
  
  // Add issue if score is low
  if (studentRelevanceScore < 2) {
    issues.push({
      field: 'metadata.studentRelevanceScore',
      severity: 'info',
      message: 'Low student relevance score',
      code: 'low_student_relevance'
    });
  }
}

/**
 * Checks if a value is a valid URL
 * @param value Value to check
 * @returns True if valid
 */
function isValidEmail(value: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(value);
}

/**
 * Checks if a value is a valid date
 * @param value Value to check
 * @returns True if valid
 */
function isValidDate(value: Date): boolean {
  return value instanceof Date && !isNaN(value.getTime());
}