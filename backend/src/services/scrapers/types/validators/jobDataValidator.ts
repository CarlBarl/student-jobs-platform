/**
 * Job data validation
 */
import { JobData } from '../types';

interface ValidationIssue {
  field: string;
  message: string;
  severity: 'warning' | 'error';
}

interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export function validateJobData(jobData: JobData): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Required fields validation
  if (!jobData.title) {
    issues.push({
      field: 'title',
      message: 'Job title is required',
      severity: 'error'
    });
  }

  if (!jobData.company?.name) {
    issues.push({
      field: 'company.name',
      message: 'Company name is required',
      severity: 'error'
    });
  }

  if (!jobData.description) {
    issues.push({
      field: 'description',
      message: 'Job description is required',
      severity: 'error'
    });
  }

  // Validation with warnings
  if (!jobData.location?.city && !jobData.location?.municipality) {
    issues.push({
      field: 'location',
      message: 'Location information is incomplete',
      severity: 'warning'
    });
  }

  if (!jobData.sourceUrl) {
    issues.push({
      field: 'sourceUrl',
      message: 'Source URL is missing',
      severity: 'warning'
    });
  }

  return {
    valid: !issues.some(issue => issue.severity === 'error'),
    issues
  };
}