-- GDPR-Compatible Data Storage Strategy

-- 1. Function to generate user data export (GDPR data access request)
CREATE OR REPLACE FUNCTION generate_user_data_export(user_id_param UUID)
RETURNS JSONB AS $$
DECLARE
    user_data JSONB;
    user_preferences JSONB;
    user_bookmarks JSONB;
    user_searches JSONB;
    user_activities JSONB;
BEGIN
    -- Get user profile data
    SELECT JSONB_BUILD_OBJECT(
        'id', id,
        'email', email,
        'first_name', first_name,
        'last_name', last_name,
        'phone', phone,
        'bio', bio,
        'profile_picture_url', profile_picture_url,
        'graduation_year', graduation_year,
        'is_active', is_active,
        'email_verified', email_verified,
        'consent_to_data_processing', consent_to_data_processing,
        'consent_given_at', consent_given_at,
        'privacy_policy_version', privacy_policy_version,
        'data_retention_approved_until', data_retention_approved_until,
        'marketing_consent', marketing_consent,
        'last_login', last_login,
        'created_at', created_at,
        'updated_at', updated_at
    )
    INTO user_data
    FROM users
    WHERE id = user_id_param;
    
    -- Get user preferences (education areas and cities)
    SELECT JSONB_BUILD_OBJECT(
        'education_areas', (
            SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
                'id', ea.id,
                'name', ea.name,
                'added_at', uea.created_at
            ))
            FROM user_education_areas uea
            JOIN education_areas ea ON uea.education_area_id = ea.id
            WHERE uea.user_id = user_id_param
        ),
        'preferred_cities', (
            SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
                'id', c.id,
                'name', c.name,
                'region', c.region,
                'country', c.country,
                'added_at', upc.created_at
            ))
            FROM user_preferred_cities upc
            JOIN cities c ON upc.city_id = c.id
            WHERE upc.user_id = user_id_param
        )
    )
    INTO user_preferences;
    
    -- Get user bookmarks
    SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
        'id', b.id,
        'job_id', b.job_id,
        'job_title', j.title,
        'company_name', c.name,
        'notes', b.notes,
        'created_at', b.created_at,
        'updated_at', b.updated_at
    ))
    INTO user_bookmarks
    FROM bookmarks b
    JOIN jobs j ON b.job_id = j.id
    JOIN companies c ON j.company_id = c.id
    WHERE b.user_id = user_id_param;
    
    -- Get user search history
    SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
        'id', id,
        'search_query', search_query,
        'filters', filters,
        'results_count', results_count,
        'created_at', created_at
    ))
    INTO user_searches
    FROM search_history
    WHERE user_id = user_id_param
    ORDER BY created_at DESC;
    
    -- Get user activity log
    SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
        'activity_type', activity_type,
        'description', description,
        'created_at', created_at
    ))
    INTO user_activities
    FROM user_activity_log
    WHERE user_id = user_id_param
    ORDER BY created_at DESC;
    
    -- Combine all data
    user_data = user_data || JSONB_BUILD_OBJECT(
        'preferences', user_preferences,
        'bookmarks', COALESCE(user_bookmarks, '[]'::JSONB),
        'search_history', COALESCE(user_searches, '[]'::JSONB),
        'activity_log', COALESCE(user_activities, '[]'::JSONB)
    );
    
    -- Update GDPR request status
    UPDATE gdpr_data_requests
    SET 
        status = 'completed',
        completed_at = CURRENT_TIMESTAMP
    WHERE user_id = user_id_param AND request_type = 'export' AND status = 'processing';
    
    RETURN user_data;
END;
$$ LANGUAGE plpgsql;

-- 2. Function to handle user consent updates
CREATE OR REPLACE FUNCTION update_user_consent(
    user_id_param UUID,
    consent_to_processing BOOLEAN,
    marketing_consent_param BOOLEAN,
    privacy_policy_version_param VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    user_exists BOOLEAN;
BEGIN
    -- Check if user exists
    SELECT EXISTS(SELECT 1 FROM users WHERE id = user_id_param) INTO user_exists;
    
    IF NOT user_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Update user consent information
    UPDATE users
    SET 
        consent_to_data_processing = consent_to_processing,
        consent_given_at = CASE WHEN consent_to_processing THEN CURRENT_TIMESTAMP ELSE consent_given_at END,
        privacy_policy_version = privacy_policy_version_param,
        marketing_consent = marketing_consent_param,
        -- If consent is withdrawn, set data retention to 30 days from now
        data_retention_approved_until = CASE 
            WHEN consent_to_processing THEN NULL  -- Indefinite retention while consent active
            ELSE CURRENT_TIMESTAMP + INTERVAL '30 days'  -- 30 days retention when consent withdrawn
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = user_id_param;
    
    -- Log consent change
    INSERT INTO user_activity_log (
        user_id,
        activity_type,
        description,
        anonymize_at
    ) VALUES (
        user_id_param,
        'consent_update',
        CASE 
            WHEN consent_to_processing 
            THEN 'User granted consent to data processing. Policy version: ' || privacy_policy_version_param
            ELSE 'User withdrew consent to data processing'
        END,
        -- Anonymize after 2 years for legal protection
        CURRENT_TIMESTAMP + INTERVAL '2 years'
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 3. Function to anonymize inactive users
CREATE OR REPLACE FUNCTION anonymize_inactive_users()
RETURNS INTEGER AS $$
DECLARE
    anonymized_count INTEGER;
BEGIN
    -- Find users who withdrew consent and passed retention period
    -- or users inactive for more than 2 years
    WITH users_to_anonymize AS (
        SELECT id FROM users
        WHERE 
            (consent_to_data_processing = FALSE AND data_retention_approved_until < CURRENT_TIMESTAMP)
            OR
            (last_login IS NOT NULL AND last_login < CURRENT_TIMESTAMP - INTERVAL '2 years')
            OR
            (last_login IS NULL AND updated_at < CURRENT_TIMESTAMP - INTERVAL '2 years')
    )
    -- Store anonymized records
    INSERT INTO anonymized_users (
        id, 
        date_joined, 
        last_active,
        data_statistics
    )
    SELECT 
        u.id,
        DATE(u.created_at),
        DATE(u.last_login),
        JSONB_BUILD_OBJECT(
            'bookmarks_count', (SELECT COUNT(*) FROM bookmarks WHERE user_id = u.id),
            'searches_count', (SELECT COUNT(*) FROM search_history WHERE user_id = u.id),
            'days_active', (SELECT EXTRACT(DAY FROM (COALESCE(u.last_login, u.updated_at) - u.created_at)))
        )
    FROM users u
    JOIN users_to_anonymize uta ON u.id = uta.id;
    
    GET DIAGNOSTICS anonymized_count = ROW_COUNT;
    
    -- Only proceed if there are users to anonymize
    IF anonymized_count > 0 THEN
        -- Anonymize search history for these users
        UPDATE search_history
        SET user_id = NULL
        WHERE user_id IN (SELECT id FROM users_to_anonymize);
        
        -- Anonymize user activity log for these users
        UPDATE user_activity_log
        SET 
            user_id = NULL,
            ip_address = NULL,
            user_agent = NULL,
            description = 'Anonymized log entry'
        WHERE user_id IN (SELECT id FROM users_to_anonymize);
        
        -- Delete user's personal data
        DELETE FROM bookmarks WHERE user_id IN (SELECT id FROM users_to_anonymize);
        DELETE FROM user_education_areas WHERE user_id IN (SELECT id FROM users_to_anonymize);
        DELETE FROM user_preferred_cities WHERE user_id IN (SELECT id FROM users_to_anonymize);
        DELETE FROM gdpr_data_requests WHERE user_id IN (SELECT id FROM users_to_anonymize);
        
        -- Finally delete the users
        DELETE FROM users WHERE id IN (SELECT id FROM users_to_anonymize);
    END IF;
    
    RETURN anonymized_count;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger to log user data changes
CREATE OR REPLACE FUNCTION log_user_data_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_activity_log (
        user_id,
        activity_type,
        description,
        anonymize_at
    ) VALUES (
        NEW.id,
        'profile_update',
        'User profile updated',
        CURRENT_TIMESTAMP + INTERVAL '6 months'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_user_changes
AFTER UPDATE ON users
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION log_user_data_changes();

-- 5. Trigger to log new gdpr requests
CREATE OR REPLACE FUNCTION log_gdpr_request()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_activity_log (
        user_id,
        activity_type,
        description,
        anonymize_at
    ) VALUES (
        NEW.user_id,
        'gdpr_request',
        'GDPR request created: ' || NEW.request_type,
        CURRENT_TIMESTAMP + INTERVAL '2 years'  -- Keep for legal compliance
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_gdpr_request
AFTER INSERT ON gdpr_data_requests
FOR EACH ROW
EXECUTE FUNCTION log_gdpr_request();

-- 6. Function to process all pending GDPR requests
CREATE OR REPLACE FUNCTION process_pending_gdpr_requests()
RETURNS INTEGER AS $$
DECLARE
    request_record RECORD;
    processed_count INTEGER := 0;
BEGIN
    -- Process export requests first
    FOR request_record IN 
        SELECT * FROM gdpr_data_requests 
        WHERE status = 'pending' AND request_type = 'export'
        ORDER BY requested_at
        LIMIT 100  -- Process in batches to avoid long transactions
    LOOP
        -- Update status to processing
        UPDATE gdpr_data_requests
        SET status = 'processing'
        WHERE id = request_record.id;
        
        -- Generate data export (implementation would store this to a file and update the data_file_url)
        PERFORM generate_user_data_export(request_record.user_id);
        
        processed_count := processed_count + 1;
    END LOOP;
    
    -- Process delete requests
    FOR request_record IN 
        SELECT * FROM gdpr_data_requests 
        WHERE status = 'pending' AND request_type = 'delete'
        ORDER BY requested_at
        LIMIT 100  -- Process in batches to avoid long transactions
    LOOP
        -- Update status to processing
        UPDATE gdpr_data_requests
        SET status = 'processing'
        WHERE id = request_record.id;
        
        -- Process deletion
        PERFORM process_gdpr_delete_request(request_record.user_id);
        
        processed_count := processed_count + 1;
    END LOOP;
    
    -- Process anonymize requests
    FOR request_record IN 
        SELECT * FROM gdpr_data_requests 
        WHERE status = 'pending' AND request_type = 'anonymize'
        ORDER BY requested_at
        LIMIT 100  -- Process in batches to avoid long transactions
    LOOP
        -- Update status to processing
        UPDATE gdpr_data_requests
        SET status = 'processing'
        WHERE id = request_record.id;
        
        -- Similar to delete but keeping anonymized records
        -- (This implementation would match delete with the addition of keeping some anonymous data)
        PERFORM process_gdpr_delete_request(request_record.user_id);
        
        -- Update request status
        UPDATE gdpr_data_requests
        SET 
            status = 'completed',
            completed_at = CURRENT_TIMESTAMP
        WHERE id = request_record.id;
        
        processed_count := processed_count + 1;
    END LOOP;
    
    RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- 7. View for data access tracking (for auditing purposes)
CREATE VIEW gdpr_audit_log AS
SELECT
    dr.id AS request_id,
    dr.user_id,
    u.email AS user_email,
    dr.request_type,
    dr.status,
    dr.requested_at,
    dr.completed_at,
    (SELECT COUNT(*) FROM user_activity_log WHERE user_id = dr.user_id) AS activity_count,
    CASE 
        WHEN dr.completed_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (dr.completed_at - dr.requested_at)) / 60
        ELSE
            EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - dr.requested_at)) / 60
    END AS processing_time_minutes
FROM
    gdpr_data_requests dr
LEFT JOIN
    users u ON dr.user_id = u.id
ORDER BY
    dr.requested_at DESC;