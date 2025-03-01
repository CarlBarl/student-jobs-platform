/**
 * Maps JobTech API data to our unified job data format
 */
import { JobTechAd, JobTechTaxonomyItem, JobTechLanguageItem } from './jobtechTypes';
import { JobData } from '../types';

/**
 * Maps a JobTech ad to our unified job data format
 * @param ad JobTech ad
 * @returns Unified job data
 */
export function jobtechToJobData(ad: JobTechAd): JobData {
  // Create base job data
  const jobData: JobData = {
    externalId: ad.id,
    source: 'jobtech',
    sourceUrl: `https://arbetsformedlingen.se/platsbanken/annonser/${ad.id}`,
    title: ad.headline,
    company: {
      name: ad.employer.name,
      organizationNumber: ad.employer.organization_number,
      website: ad.employer.url,
      email: ad.employer.email,
      phone: ad.employer.phone_number,
    },
    description: ad.description.text,
    descriptionFormatted: ad.description.text_formatted,
    location: {
      city: ad.workplace_address?.city,
      municipality: ad.workplace_address?.municipality,
      region: ad.workplace_address?.region,
      country: ad.workplace_address?.country,
      address: ad.workplace_address?.street_address,
      postalCode: ad.workplace_address?.postcode,
      coordinates: ad.workplace_address?.coordinates ? 
        [ad.workplace_address.coordinates[1], ad.workplace_address.coordinates[0]] : // Convert from [long, lat] to [lat, long]
        undefined,
    },
    applicationDetails: {
      email: ad.application_details?.email,
      url: ad.application_details?.url,
      reference: ad.application_details?.reference,
      information: ad.application_details?.information,
      deadlineDate: ad.application_deadline ? new Date(ad.application_deadline) : undefined,
    },
    employmentType: ad.employment_type?.label,
    workingHoursType: ad.working_hours_type?.label,
    duration: ad.duration?.label,
    salary: ad.salary_description,
    publicationDate: new Date(ad.publication_date || Date.now()),
    lastPublicationDate: ad.last_publication_date ? new Date(ad.last_publication_date) : undefined,
    expirationDate: ad.removed_date ? new Date(ad.removed_date) : undefined,
    occupation: ad.occupation ? {
      id: ad.occupation.concept_id,
      name: ad.occupation.label,
    } : undefined,
    occupationGroup: ad.occupation_group ? {
      id: ad.occupation_group.concept_id,
      name: ad.occupation_group.label,
    } : undefined,
    occupationField: ad.occupation_field ? {
      id: ad.occupation_field.concept_id,
      name: ad.occupation_field.label,
    } : undefined,
    // Initialize arrays
    skills: [],
    educationRequirements: [],
    languages: [],
    // Source-specific metadata
    metadata: {
      experience_required: ad.experience_required,
      scope_of_work: ad.scope_of_work,
      original_source_type: ad.source_type,
      publishedAt: new Date(ad.publication_date),
      expiresAt: new Date(ad.last_publication_date),
      workingHoursType: ad.working_hours_type?.label,
      salaryType: ad.salary_type?.label
    },
    collectingMetadata: {
      collectedAt: new Date(),
      processingTimeMs: 0,
      sourceVersion: '1.0',
      validationIssues: [],
    },
  };

  // Map skills
  if (ad.must_have?.skills) {
    jobData.skills.push(...mapTaxonomyItems(ad.must_have.skills, true));
  }
  if (ad.nice_to_have?.skills) {
    jobData.skills.push(...mapTaxonomyItems(ad.nice_to_have.skills, false));
  }

  // Map education requirements
  if (ad.must_have?.education) {
    jobData.educationRequirements.push(...mapTaxonomyItems(ad.must_have.education, true));
  }
  if (ad.nice_to_have?.education) {
    jobData.educationRequirements.push(...mapTaxonomyItems(ad.nice_to_have.education, false));
  }

  // Map languages
  if (ad.must_have?.languages) {
    jobData.languages.push(...mapLanguageItems(ad.must_have.languages, true));
  }
  if (ad.nice_to_have?.languages) {
    jobData.languages.push(...mapLanguageItems(ad.nice_to_have.languages, false));
  }

  return jobData;
}

/**
 * Maps JobTech taxonomy items to name-required pairs
 * @param items Taxonomy items
 * @param required Whether the items are required
 * @returns Name-required pairs
 */
function mapTaxonomyItems(items: JobTechTaxonomyItem[], required: boolean): Array<{ name: string, required: boolean }> {
  return items.map(item => ({
    name: item.label,
    required,
  }));
}

/**
 * Maps JobTech language items to our language format
 * @param items Language items
 * @param required Whether the languages are required
 * @returns Formatted language items
 */
function mapLanguageItems(items: JobTechLanguageItem[], required: boolean): Array<{ name: string, level?: string, required: boolean }> {
  return items.map(item => ({
    name: item.label,
    level: item.language_level?.label,
    required,
  }));
}