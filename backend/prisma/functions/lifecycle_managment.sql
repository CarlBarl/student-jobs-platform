-- Data Lifecycle Management for Student Jobs Platform

-- 1. Create archive tables for expired/old jobs
CREATE TABLE archived_jobs (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT,
    job_type job_type NOT NULL,
    status job_status NOT NULL,
    company_id UUID,
    company_name VARCHAR(255),  -- Denormalized for historical records
    source_id UUID,
    source_name VARCHAR(255),   -- Denormalized for historical records
    external_id VARCHAR(255),
    apply_url VARCHAR(512),
    salary_range VARCHAR(255),
    hours_per_week INTEGER,
    remote_option BOOLEAN,
    posted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expired_at TIMESTAMP WITH TIME ZONE NOT NULL,
    cities JSONB,               -- Denormalized list of cities
    education_areas JSONB,      -- Denormalized list of education areas
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create archive table for old search history
CREATE TABLE archived_search_history (
    id UUID PRIMARY KEY,
    user_id UUID,
    anonymized BOOLEAN DEFAULT FALSE,
    search_query TEXT,
    filters JSONB,
    results_count INTEGER,
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create table for anonymized user data
CREATE TABLE anonymized_users (
    id UUID PRIMARY KEY,
    date_joined DATE,
    last_active DATE,
    anonymized_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_statistics JSONB  -- Store aggregated statistics about user activity
);

-- 4. Function to mark expired jobs
CREATE OR REPLACE FUNCTION mark_expired_jobs()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE jobs
    SET status = 'expired'
    WHERE 
        status = 'active' AND 
        (expires_at < CURRENT_TIMESTAMP OR expires_at IS NULL AND posted_at < CURRENT_TIMESTAMP - INTERVAL '3 months');
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- 5. Function to archive old expired jobs
CREATE OR REPLACE FUNCTION archive_old_jobs()
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Insert expired jobs into archive table
    INSERT INTO archived_jobs (
        id, title, description, requirements, job_type, status,
        company_id, company_name, source_id, source_name, external_id,
        apply_url, salary_range, hours_per_week, remote_option,
        posted_at, expired_at, cities, education_areas,
        created_at, updated_at
    )
    SELECT 
        j.id, j.title, j.description, j.requirements, j.job_type, j.status,
        j.company_id, c.name, j.source_id, s.name, j.external_id,
        j.apply_url, j.salary_range, j.hours_per_week, j.remote_option,
        j.posted_at, j.expires_at,
        (
            SELECT JSONB_AGG(JSONB_BUILD_OBJECT('id', ci.id, 'name', ci.name, 'primary', jc.primary_location))
            FROM job_cities jc
            JOIN cities ci ON jc.city_id = ci.id
            WHERE jc.job_id = j.id
        ),
        (
            SELECT JSONB_AGG(JSONB_BUILD_OBJECT('id', ea.id, 'name', ea.name, 'relevance', jea.relevance))
            FROM job_education_areas jea
            JOIN education_areas ea ON jea.education_area_id = ea.id
            WHERE jea.job_id = j.id
        ),
        j.created_at, j.updated_at
    FROM jobs j
    LEFT JOIN companies c ON j.company_id = c.id
    LEFT JOIN job_sources s ON j.source_id = s.id
    WHERE 
        j.status = 'expired' AND
        j.expires_at < CURRENT_TIMESTAMP - INTERVAL '6 months';
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    -- Delete archived jobs from main table and related tables
    IF archived_count > 0 THEN
        -- First delete from relation tables
        DELETE FROM job_cities 
        WHERE job_id IN (
            SELECT id FROM jobs 
            WHERE status = 'expired' AND expires_at < CURRENT_TIMESTAMP - INTERVAL '6 months'
        );
        
        DELETE FROM job_education_areas 
        WHERE job_id IN (
            SELECT id FROM jobs 
            WHERE status = 'expired' AND expires_at < CURRENT_TIMESTAMP - INTERVAL '6 months'
        );
        
        -- Then delete bookmarks
        DELETE FROM bookmarks 
        WHERE job_id IN (
            SELECT id FROM jobs 
            WHERE status = 'expired' AND expires_at < CURRENT_TIMESTAMP - INTERVAL '6 months'
        );
        
        -- Finally delete the jobs
        DELETE FROM jobs 
        WHERE status = 'expired' AND expires_at < CURRENT_TIMESTAMP - INTERVAL '6 months';
    END IF;
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- 6. Function to archive old search history
CREATE OR REPLACE FUNCTION archive_old_search_history()
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Archive search history older than 12 months
    INSERT INTO archived_search_history (
        id, user_id, anonymized, search_query, filters, results_count, session_id, created_at
    )
    SELECT 
        id, 
        user_id,
        user_id IS NULL AS anonymized,  -- If user_id is already NULL, mark as anonymized
        search_query, 
        filters, 
        results_count, 
        session_id, 
        created_at
    FROM search_history
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '12 months';
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    -- Delete archived history from main table
    IF archived_count > 0 THEN
        DELETE FROM search_history 
        WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '12 months';
    END IF;
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- 7. Function to anonymize old user activity logs
CREATE OR REPLACE FUNCTION anonymize_user_activity_logs()
RETURNS INTEGER AS $$
DECLARE
    anonymized_count INTEGER;
BEGIN
    -- Anonymize logs marked for anonymization or older than 6 months
    UPDATE user_activity_log
    SET 
        user_id = NULL,
        ip_address = NULL,
        user_agent = NULL,
        description = 'Anonymized log entry'
    WHERE 
        (anonymize_at IS NOT NULL AND anonymize_at <= CURRENT_TIMESTAMP) OR
        (anonymize_at IS NULL AND created_at < CURRENT_TIMESTAMP - INTERVAL '6 months');
    
    GET DIAGNOSTICS anonymized_count = ROW_COUNT;
    RETURN anonymized_count;
END;
$$ LANGUAGE plpgsql;

-- 8. Function to handle GDPR user data deletion
CREATE OR REPLACE FUNCTION process_gdpr_delete_request(user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_exists BOOLEAN;
BEGIN
    -- Check if user exists
    SELECT EXISTS(SELECT 1 FROM users WHERE id = user_id_param) INTO user_exists;
    
    IF NOT user_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Store anonymized record
    INSERT INTO anonymized_users (
        id, 
        date_joined, 
        last_active,
        data_statistics
    )
    SELECT 
        id,
        DATE(created_at),
        DATE(last_login),
        JSONB_BUILD_OBJECT(
            'bookmarks_count', (SELECT COUNT(*) FROM bookmarks WHERE user_id = user_id_param),
            'searches_count', (SELECT COUNT(*) FROM search_history WHERE user_id = user_id_param),
            'days_active', (SELECT EXTRACT(DAY FROM (COALESCE(last_login, updated_at) - created_at)))
        )
    FROM users
    WHERE id = user_id_param;
    
    -- Anonymize search history
    UPDATE search_history
    SET user_id = NULL
    WHERE user_id = user_id_param;
    
    -- Anonymize user activity log
    UPDATE user_activity_log
    SET 
        user_id = NULL,
        ip_address = NULL,
        user_agent = NULL,
        description = 'Anonymized log entry'
    WHERE user_id = user_id_param;
    
    -- Delete user's data
    DELETE FROM bookmarks WHERE user_id = user_id_param;
    DELETE FROM user_education_areas WHERE user_id = user_id_param;
    DELETE FROM user_preferred_cities WHERE user_id = user_id_param;
    
    -- Finally delete the user
    DELETE FROM users WHERE id = user_id_param;
    
    -- Update GDPR request status
    UPDATE gdpr_data_requests
    SET 
        status = 'completed',
        completed_at = CURRENT_TIMESTAMP
    WHERE user_id = user_id_param AND request_type = 'delete' AND status = 'processing';
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 9. Create scheduled jobs with pg_cron (Note: This extension must be installed)
-- Uncomment after installing pg_cron extension
/*
-- Install pg_cron extension (must be done by superuser)
-- CREATE EXTENSION pg_cron;

-- Schedule job for marking expired jobs (runs daily at 1:00 AM)
SELECT cron.schedule('0 1 * * *', $$SELECT mark_expired_jobs()$$);

-- Schedule job for archiving old jobs (runs weekly on Sunday at 2:00 AM)
SELECT cron.schedule('0 2 * * 0', $$SELECT archive_old_jobs()$$);

-- Schedule job for archiving old search history (runs monthly on the 1st at 3:00 AM)
SELECT cron.schedule('0 3 1 * *', $$SELECT archive_old_search_history()$$);

-- Schedule job for anonymizing user activity logs (runs daily at 4:00 AM)
SELECT cron.schedule('0 4 * * *', $$SELECT anonymize_user_activity_logs()$$);
*/

-- 10. Create a view for active jobs (commonly used in queries)
CREATE VIEW active_jobs AS
SELECT 
    j.*,
    c.name AS company_name,
    c.logo_url AS company_logo_url
FROM 
    jobs j
JOIN 
    companies c ON j.company_id = c.id
WHERE 
    j.status = 'active' AND
    (j.expires_at IS NULL OR j.expires_at > CURRENT_TIMESTAMP);

-- 11. Function to clean up orphaned records (companies with no jobs)
CREATE OR REPLACE FUNCTION cleanup_orphaned_companies()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM companies
    WHERE 
        id NOT IN (SELECT DISTINCT company_id FROM jobs WHERE company_id IS NOT NULL) AND
        created_at < CURRENT_TIMESTAMP - INTERVAL '3 months';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;