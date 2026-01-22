-- Function to clean up old records (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_records()
RETURNS TABLE(
    deleted_attendance BIGINT,
    deleted_guest_visits BIGINT,
    deleted_audit_logs BIGINT
) AS $$
DECLARE
    v_attendance_count BIGINT;
    v_guest_visits_count BIGINT;
    v_audit_logs_count BIGINT;
    v_cutoff_date DATE;
BEGIN
    v_cutoff_date := CURRENT_DATE - INTERVAL '90 days';
    
    -- Delete old attendance events
    DELETE FROM staff_attendance_events
    WHERE date < v_cutoff_date;
    GET DIAGNOSTICS v_attendance_count = ROW_COUNT;
    
    -- Delete old guest visits
    DELETE FROM guest_visits
    WHERE COALESCE(planned_date, DATE(created_at)) < v_cutoff_date
    AND (check_out_at IS NOT NULL OR status = 'outside');
    GET DIAGNOSTICS v_guest_visits_count = ROW_COUNT;
    
    -- Delete old audit logs (optional, can be configured)
    -- Uncomment if you want to clean audit logs too
    -- DELETE FROM audit_log
    -- WHERE created_at < v_cutoff_date;
    -- GET DIAGNOSTICS v_audit_logs_count = ROW_COUNT;
    v_audit_logs_count := 0;
    
    RETURN QUERY SELECT v_attendance_count, v_guest_visits_count, v_audit_logs_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_old_records() TO service_role;
