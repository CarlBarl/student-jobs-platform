/**
 * TypeScript interfaces for JobTech API requests and responses
 */

export interface JobTechSearchParams {
  q?: string;
  limit?: number;
  offset?: number;
  sort?: string;
  experience?: boolean;
  'worktime-extent'?: string[];
  'occupation-field'?: string[];
  municipality?: string[];
  region?: string[];
}

export interface JobTechAd {
  id: string;
  headline: string;
  description: {
    text: string;
    text_formatted?: string;
    company_information?: string;
    needs?: string;
    requirements?: string;
  };
  application_details?: {
    url?: string;
    email?: string;
    reference?: string;
    deadline?: string;
    information?: string;
  };
  employer: {
    name: string;
    organization_number?: string;
    url?: string;
    email?: string;
    phone_number?: string;
  };
  publication_date: string;
  last_publication_date: string;
  application_deadline?: string;
  working_hours_type?: JobTechTaxonomyItem;
  salary_type?: JobTechTaxonomyItem;
  duration?: JobTechTaxonomyItem;
  employment_type?: JobTechTaxonomyItem;
  salary_description?: string;
  workplace_address?: {
    municipality?: string;
    region?: string;
    country?: string;
    street_address?: string;
    postcode?: string;
    city?: string;
    coordinates?: [number, number]; // [longitude, latitude]
  };
  experience_required?: boolean;
  access?: string;
  removed_date?: string;
  source_type?: string;
  scope_of_work?: string;
  occupation?: JobTechTaxonomyItem;
  occupation_group?: JobTechTaxonomyItem;
  occupation_field?: JobTechTaxonomyItem;
  must_have?: {
    skills?: JobTechTaxonomyItem[];
    education?: JobTechTaxonomyItem[];
    languages?: JobTechLanguageItem[];
  };
  nice_to_have?: {
    skills?: JobTechTaxonomyItem[];
    education?: JobTechTaxonomyItem[];
    languages?: JobTechLanguageItem[];
  };
}

export interface JobTechSearchResponse {
  total: {
    value: number;
  };
  hits: JobTechAd[];
}

export interface JobTechStat {
  term: string;
  count: number;
}

export interface JobTechTaxonomyItem {
  concept_id: string;
  label: string;
  legacy_ams_taxonomy_id?: string;
}

export interface JobTechLanguageItem extends JobTechTaxonomyItem {
  language_level?: {
    concept_id: string;
    label: string;
  };
}

export interface JobTechEducationItem extends JobTechTaxonomyItem {
  education_level?: {
    concept_id: string;
    label: string;
  };
  education_field?: {
    concept_id: string;
    label: string;
  };
}