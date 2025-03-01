/**
 * Normalizes job data to ensure consistency across sources
 */
import { JobData } from '../types';
import { logger } from '../../../utils/logger';

/**
 * Normalizes job data to ensure consistency
 * @param job Job data to normalize
 * @returns Normalized job data
 */
export function normalizeJobData(job: JobData): JobData {
  // Create a copy to avoid modifying the original
  const normalizedJob: JobData = { ...job };
  
  try {
    // Normalize title
    normalizedJob.title = normalizeTitle(job.title);
    
    // Normalize company name
    if (normalizedJob.company && normalizedJob.company.name) {
      normalizedJob.company.name = normalizeCompanyName(job.company.name);
    }
    
    // Normalize location
    normalizeLocation(normalizedJob);
    
    // Normalize employment type
    normalizeEmploymentType(normalizedJob);
    
    // Normalize skills
    normalizeSkills(normalizedJob);
    
    // Calculate quality score
    normalizedJob.qualityScore = calculateQualityScore(normalizedJob);
    
    return normalizedJob;
  } catch (error) {
    logger.error('Error normalizing job data', {
      error: error instanceof Error ? error.message : String(error),
      jobId: job.externalId
    });
    
    // Return the original job data if normalization fails
    return job;
  }
}

/**
 * Normalizes job title
 * @param title Job title
 * @returns Normalized title
 */
function normalizeTitle(title: string): string {
  if (!title) return '';
  
  // Trim and normalize whitespace
  let normalized = title.trim().replace(/\s+/g, ' ');
  
  // Capitalize first letter of each word
  normalized = normalized.replace(/\b\w/g, l => l.toUpperCase());
  
  // Remove unnecessary prefixes
  const prefixesToRemove = ['Job:', 'Position:', 'Vacancy:', 'Opening:'];
  for (const prefix of prefixesToRemove) {
    if (normalized.startsWith(prefix)) {
      normalized = normalized.substring(prefix.length).trim();
    }
  }
  
  return normalized;
}

/**
 * Normalizes company name
 * @param name Company name
 * @returns Normalized company name
 */
function normalizeCompanyName(name: string): string {
  if (!name) return '';
  
  // Trim and normalize whitespace
  let normalized = name.trim().replace(/\s+/g, ' ');
  
  // Remove legal entity suffixes for consistency
  const suffixesToNormalize = [
    { pattern: /\bAB\b/i, replacement: 'AB' },
    { pattern: /\bInc\.?\b/i, replacement: 'Inc.' },
    { pattern: /\bLLC\.?\b/i, replacement: 'LLC' },
    { pattern: /\bLtd\.?\b/i, replacement: 'Ltd' },
    { pattern: /\bGmbH\b/i, replacement: 'GmbH' }
  ];
  
  for (const { pattern, replacement } of suffixesToNormalize) {
    normalized = normalized.replace(pattern, replacement);
  }
  
  return normalized;
}

/**
 * Normalizes job location
 * @param job Job data
 */
function normalizeLocation(job: JobData): void {
  if (!job.location) return;
  
  // Normalize city names
  if (job.location.city) {
    job.location.city = job.location.city.trim().replace(/\s+/g, ' ');
    
    // Standardize common city name variations
    const cityNormalizations: Record<string, string> = {
      'Stockholm City': 'Stockholm',
      'Sthlm': 'Stockholm',
      'Göteborg': 'Gothenburg',
      'Gbg': 'Gothenburg',
      'Malmoe': 'Malmö'
    };
    
    const lowerCaseCity = job.location.city.toLowerCase();
    for (const [variant, standardized] of Object.entries(cityNormalizations)) {
      if (lowerCaseCity === variant.toLowerCase()) {
        job.location.city = standardized;
        break;
      }
    }
  }
  
  // Normalize municipality codes
  if (job.location.municipality) {
    // If it's a code, ensure it's in the correct format
    if (/^\d{4}$/.test(job.location.municipality)) {
      job.location.municipality = job.location.municipality.padStart(4, '0');
    }
  }
  
  // Derive city from municipality if missing
  if (!job.location.city && job.location.municipality) {
    // This would use a mapping in a real implementation
    const municipalityToCity: Record<string, string> = {
      '0180': 'Stockholm',
      '1480': 'Gothenburg',
      '1280': 'Malmö'
      // More mappings would be added in a real implementation
    };
    
    if (municipalityToCity[job.location.municipality]) {
      job.location.city = municipalityToCity[job.location.municipality];
    }
  }
}

/**
 * Normalizes employment type
 * @param job Job data
 */
function normalizeEmploymentType(job: JobData): void {
  // Normalize employment type to standard values
  if (job.employmentType) {
    const employmentTypeMap: Record<string, string> = {
      'Permanent employment': 'Permanent',
      'Permanent position': 'Permanent',
      'Full-time permanent': 'Permanent',
      'Temporary employment': 'Temporary',
      'Temporary position': 'Temporary',
      'Contract': 'Temporary',
      'Contract position': 'Temporary',
      'Seasonal': 'Seasonal',
      'Seasonal work': 'Seasonal',
      'Project': 'Project',
      'Project employment': 'Project',
      'Internship': 'Internship',
      'Praktik': 'Internship',
      'Summer job': 'Seasonal',
      'Sommarjobb': 'Seasonal'
    };
    
    for (const [sourceValue, standardValue] of Object.entries(employmentTypeMap)) {
      if (job.employmentType.toLowerCase().includes(sourceValue.toLowerCase())) {
        job.employmentType = standardValue;
        break;
      }
    }
  }
  
  // Normalize working hours type
  if (job.workingHoursType) {
    const workingHoursMap: Record<string, string> = {
      'Full-time': 'Full-time',
      'Full time': 'Full-time',
      'Heltid': 'Full-time',
      'Part-time': 'Part-time',
      'Part time': 'Part-time',
      'Deltid': 'Part-time',
      'Flexible': 'Flexible',
      'Flexibel': 'Flexible'
    };
    
    for (const [sourceValue, standardValue] of Object.entries(workingHoursMap)) {
      if (job.workingHoursType.toLowerCase().includes(sourceValue.toLowerCase())) {
        job.workingHoursType = standardValue;
        break;
      }
    }
  }
}

/**
 * Normalizes skills
 * @param job Job data
 */
function normalizeSkills(job: JobData): void {
  if (!job.skills || job.skills.length === 0) return;
  
  // Create a map to deduplicate skills by name (case-insensitive)
  const skillsMap = new Map<string, { name: string, required: boolean }>();
  
  for (const skill of job.skills) {
    const normalizedName = normalizeSkillName(skill.name);
    const key = normalizedName.toLowerCase();
    
    // Skip empty skills
    if (!normalizedName) continue;
    
    // If skill already exists, update it if the new one is required
    if (skillsMap.has(key)) {
      const existing = skillsMap.get(key)!;
      if (skill.required && !existing.required) {
        existing.required = true;
      }
    } else {
      skillsMap.set(key, {
        name: normalizedName,
        required: skill.required
      });
    }
  }
  
  // Update the job with deduplicated skills
  job.skills = Array.from(skillsMap.values());
}

/**
 * Normalizes skill names
 * @param name Skill name
 * @returns Normalized skill name
 */
function normalizeSkillName(name: string): string {
  if (!name) return '';
  
  // Trim and normalize whitespace
  let normalized = name.trim().replace(/\s+/g, ' ');
  
  // Remove common prefixes/suffixes
  normalized = normalized.replace(/^(knowledge of|experience with|familiarity with|skills in)\s+/i, '');
  normalized = normalized.replace(/\s+(skills|knowledge|experience)$/i, '');
  
  // Normalize programming languages and technologies
  const techNormalizations: Record<string, string> = {
    'Javascript': 'JavaScript',
    'Typescript': 'TypeScript',
    'React.js': 'React',
    'React JS': 'React',
    'Node.js': 'Node.js',
    'NodeJS': 'Node.js',
    'Vue.js': 'Vue',
    'VueJS': 'Vue',
    'C#.NET': 'C#',
    'Postgres': 'PostgreSQL',
    'Mongo': 'MongoDB',
    'MS SQL': 'Microsoft SQL Server'
  };
  
  for (const [variant, standardized] of Object.entries(techNormalizations)) {
    if (normalized === variant) {
      normalized = standardized;
      break;
    }
  }
  
  return normalized;
}

/**
 * Calculates a quality score for the job
 * @param job Job data
 * @returns Quality score (0-100)
 */
function calculateQualityScore(job: JobData): number {
  let score = 0;
  const maxScore = 100;
  
  // Title quality (max 15 points)
  if (job.title) {
    const titleLength = job.title.length;
    if (titleLength > 20 && titleLength < 100) {
      score += 15;
    } else if (titleLength > 10) {
      score += 10;
    } else {
      score += 5;
    }
  }
  
  // Description quality (max 30 points)
  if (job.description) {
    const descriptionLength = job.description.length;
    if (descriptionLength > 500) {
      score += 30;
    } else if (descriptionLength > 200) {
      score += 20;
    } else if (descriptionLength > 100) {
      score += 10;
    } else {
      score += 5;
    }
  }
  
  // Company information (max 10 points)
  if (job.company) {
    if (job.company.name) score += 3;
    if (job.company.website) score += 3;
    if (job.company.email || job.company.phone) score += 4;
  }
  
  // Location information (max 10 points)
  if (job.location) {
    if (job.location.city) score += 5;
    if (job.location.address) score += 3;
    if (job.location.coordinates) score += 2;
  }
  
  // Application details (max 15 points)
  if (job.applicationDetails) {
    if (job.applicationDetails.url || job.applicationDetails.email) score += 10;
    if (job.applicationDetails.deadlineDate) score += 5;
  }
  
  // Skills (max 10 points)
  if (job.skills && job.skills.length > 0) {
    score += Math.min(job.skills.length * 2, 10);
  }
  
  // Student relevance (max 10 points)
  if (job.metadata.studentRelevanceScore) {
    score += (job.metadata.studentRelevanceScore as number) / 10;
  }
  
  return Math.min(score, maxScore);
}