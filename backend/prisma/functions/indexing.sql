-- Indexing Strategy for Student Jobs Platform

-- 1. Indexes for Jobs table
-- Full-text search index
CREATE INDEX idx_jobs_search_document ON jobs USING GIN (search_document);

-- Indexes for common filters
CREATE INDEX idx_jobs_status ON jobs (status);
CREATE INDEX idx_jobs_job_type ON jobs (job_type);
CREATE INDEX idx_jobs_posted_at ON jobs (posted_at);
CREATE INDEX idx_jobs_expires_at ON jobs (expires_at);
CREATE INDEX idx_jobs_company_id ON jobs (company_id);
CREATE INDEX idx_jobs_remote_option ON jobs (remote_option);

-- 2. Indexes for many-to-many relationships
-- These are critical for joins when filtering by city or education area
CREATE INDEX idx_job_cities_city_id ON job_cities (city_id);
CREATE INDEX idx_job_education_areas_education_area_id ON job_education_areas (education_area_id);

-- 3. Indexes for user-related queries
CREATE INDEX idx_bookmarks_user_id ON bookmarks (user_id);
CREATE INDEX idx_search_history_user_id ON search_history (user_id);
CREATE INDEX idx_user_education_areas_user_id ON user_education_areas (user_id);
CREATE INDEX idx_user_preferred_cities_user_id ON user_preferred_cities (user_id);

-- 4. Indexes for user activity and GDPR
CREATE INDEX idx_user_activity_log_user_id ON user_activity_log (user_id);
CREATE INDEX idx_user_activity_log_anonymize_at ON user_activity_log (anonymize_at);
CREATE INDEX idx_gdpr_data_requests_user_id ON gdpr_data_requests (user_id);
CREATE INDEX idx_gdpr_data_requests_status ON gdpr_data_requests (status);

-- 5. Indexes for timestamp columns used in data lifecycle management
CREATE INDEX idx_jobs_created_at ON jobs (created_at);
CREATE INDEX idx_search_history_created_at ON search_history (created_at);

-- 6. Composite indexes for common query patterns
-- Jobs by company and status
CREATE INDEX idx_jobs_company_status ON jobs (company_id, status);
-- Jobs by type and status
CREATE INDEX idx_jobs_type_status ON jobs (job_type, status);
-- Recent jobs
CREATE INDEX idx_jobs_status_posted_at ON jobs (status, posted_at DESC);

-- 7. Index for trigram-based text search (for "fuzzy" matches)
CREATE INDEX idx_jobs_title_trigram ON jobs USING GIN (title gin_trgm_ops);
CREATE INDEX idx_jobs_description_trigram ON jobs USING GIN (description gin_trgm_ops);
CREATE INDEX idx_companies_name_trigram ON companies USING GIN (name gin_trgm_ops);
CREATE INDEX idx_cities_name_trigram ON cities USING GIN (name gin_trgm_ops);
CREATE INDEX idx_education_areas_name_trigram ON education_areas USING GIN (name gin_trgm_ops);

-- 8. Function for updating search_document on jobs
CREATE OR REPLACE FUNCTION jobs_update_search_document()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_document = 
        setweight(to_tsvector('swedish', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('swedish', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('swedish', COALESCE(NEW.requirements, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update search_document on insert or update
CREATE TRIGGER trigger_jobs_update_search_document
BEFORE INSERT OR UPDATE ON jobs
FOR EACH ROW EXECUTE FUNCTION jobs_update_search_document();

-- Function to update search_document with company and city names
CREATE OR REPLACE FUNCTION update_job_search_document_with_relations()
RETURNS TRIGGER AS $$
DECLARE
    company_name TEXT;
    city_names TEXT;
    education_area_names TEXT;
BEGIN
    -- Get company name
    SELECT name INTO company_name FROM companies WHERE id = NEW.company_id;
    
    -- Get city names
    SELECT string_agg(c.name, ' ') INTO city_names
    FROM job_cities jc
    JOIN cities c ON jc.city_id = c.id
    WHERE jc.job_id = NEW.id;
    
    -- Get education area names
    SELECT string_agg(ea.name, ' ') INTO education_area_names
    FROM job_education_areas jea
    JOIN education_areas ea ON jea.education_area_id = ea.id
    WHERE jea.job_id = NEW.id;
    
    -- Update search document
    UPDATE jobs
    SET search_document = 
        setweight(to_tsvector('swedish', COALESCE(title, '')), 'A') ||
        setweight(to_tsvector('swedish', COALESCE(description, '')), 'B') ||
        setweight(to_tsvector('swedish', COALESCE(requirements, '')), 'C') ||
        setweight(to_tsvector('swedish', COALESCE(company_name, '')), 'B') ||
        setweight(to_tsvector('swedish', COALESCE(city_names, '')), 'C') ||
        setweight(to_tsvector('swedish', COALESCE(education_area_names, '')), 'C')
    WHERE id = NEW.id;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updating search document when relations change
CREATE TRIGGER trigger_job_cities_update_search
AFTER INSERT OR UPDATE OR DELETE ON job_cities
FOR EACH ROW EXECUTE FUNCTION update_job_search_document_with_relations();

CREATE TRIGGER trigger_job_education_areas_update_search
AFTER INSERT OR UPDATE OR DELETE ON job_education_areas
FOR EACH ROW EXECUTE FUNCTION update_job_search_document_with_relations();