-- Enable Row Level Security
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_allowed_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_whitelist ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = is_admin.user_id
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's allowed departments
CREATE OR REPLACE FUNCTION get_user_allowed_departments(user_id UUID)
RETURNS SETOF UUID AS $$
BEGIN
    -- Admin sees all
    IF is_admin(user_id) THEN
        RETURN QUERY SELECT id FROM departments WHERE is_active = true;
    ELSE
        -- Return user's allowed departments
        RETURN QUERY
        SELECT uad.department_id
        FROM user_allowed_departments uad
        WHERE uad.user_id = get_user_allowed_departments.user_id;
        
        -- Also include user's own department if set
        RETURN QUERY
        SELECT p.department_id
        FROM profiles p
        WHERE p.user_id = get_user_allowed_departments.user_id
        AND p.department_id IS NOT NULL;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check user permission
CREATE OR REPLACE FUNCTION has_permission(user_id UUID, permission_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Admin has all permissions
    IF is_admin(user_id) THEN
        RETURN true;
    END IF;
    
    -- Check specific permission
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = has_permission.user_id
        AND (
            (permission_name = 'can_view_online' AND can_view_online = true) OR
            (permission_name = 'can_view_journal' AND can_view_journal = true) OR
            (permission_name = 'can_view_reports' AND can_view_reports = true) OR
            (permission_name = 'can_view_employee_cards' AND can_view_employee_cards = true) OR
            (permission_name = 'can_view_guest_cards' AND can_view_guest_cards = true) OR
            (permission_name = 'can_see_phones' AND can_see_phones = true) OR
            (permission_name = 'can_export_reports' AND can_export_reports = true) OR
            (permission_name = 'can_register_attendance' AND can_register_attendance = true) OR
            (permission_name = 'can_register_guests' AND can_register_guests = true) OR
            (permission_name = 'can_confirm_guests' AND can_confirm_guests = true) OR
            (permission_name = 'can_edit_guests' AND can_edit_guests = true) OR
            (permission_name = 'can_manage_departments' AND can_manage_departments = true) OR
            (permission_name = 'can_manage_employees' AND can_manage_employees = true) OR
            (permission_name = 'can_manage_users' AND can_manage_users = true)
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Departments policies
CREATE POLICY "Admins can do everything on departments"
    ON departments FOR ALL
    USING (is_admin(auth.uid()));

CREATE POLICY "Users can view active departments they have access to"
    ON departments FOR SELECT
    USING (
        is_active = true AND (
            is_admin(auth.uid()) OR
            id IN (SELECT get_user_allowed_departments(auth.uid()))
        )
    );

-- Employees policies
CREATE POLICY "Admins can do everything on employees"
    ON employees FOR ALL
    USING (is_admin(auth.uid()));

CREATE POLICY "Users can view employees in their departments"
    ON employees FOR SELECT
    USING (
        is_active = true AND (
            is_admin(auth.uid()) OR
            department_id IN (SELECT get_user_allowed_departments(auth.uid())) OR
            department_id IS NULL
        )
    );

CREATE POLICY "Users with permission can manage employees"
    ON employees FOR INSERT
    WITH CHECK (has_permission(auth.uid(), 'can_manage_employees'));

CREATE POLICY "Users with permission can update employees"
    ON employees FOR UPDATE
    USING (has_permission(auth.uid(), 'can_manage_employees'));

-- Staff attendance events policies
CREATE POLICY "Admins can do everything on attendance"
    ON staff_attendance_events FOR ALL
    USING (is_admin(auth.uid()));

CREATE POLICY "Users can view attendance in their departments"
    ON staff_attendance_events FOR SELECT
    USING (
        is_admin(auth.uid()) OR
        employee_id IN (
            SELECT id FROM employees
            WHERE department_id IN (SELECT get_user_allowed_departments(auth.uid()))
        )
    );

CREATE POLICY "Users with permission can register attendance"
    ON staff_attendance_events FOR INSERT
    WITH CHECK (
        has_permission(auth.uid(), 'can_register_attendance') OR
        is_admin(auth.uid())
    );

CREATE POLICY "Users with permission can update attendance"
    ON staff_attendance_events FOR UPDATE
    USING (
        has_permission(auth.uid(), 'can_register_attendance') OR
        is_admin(auth.uid())
    );

-- Guest visits policies
CREATE POLICY "Admins can do everything on guest visits"
    ON guest_visits FOR ALL
    USING (is_admin(auth.uid()));

CREATE POLICY "Users can view guest visits in their departments"
    ON guest_visits FOR SELECT
    USING (
        is_admin(auth.uid()) OR
        department_id IN (SELECT get_user_allowed_departments(auth.uid())) OR
        department_id IS NULL
    );

CREATE POLICY "Users with permission can register guests"
    ON guest_visits FOR INSERT
    WITH CHECK (
        has_permission(auth.uid(), 'can_register_guests') OR
        has_permission(auth.uid(), 'can_edit_guests') OR
        is_admin(auth.uid())
    );

CREATE POLICY "Users with permission can update guests"
    ON guest_visits FOR UPDATE
    USING (
        has_permission(auth.uid(), 'can_edit_guests') OR
        has_permission(auth.uid(), 'can_confirm_guests') OR
        is_admin(auth.uid())
    );

-- Profiles policies
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage all profiles"
    ON profiles FOR ALL
    USING (is_admin(auth.uid()));

-- User allowed departments policies
CREATE POLICY "Admins can manage all user departments"
    ON user_allowed_departments FOR ALL
    USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their own allowed departments"
    ON user_allowed_departments FOR SELECT
    USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- Audit log policies
CREATE POLICY "Admins can view all audit logs"
    ON audit_log FOR SELECT
    USING (is_admin(auth.uid()));

CREATE POLICY "System can insert audit logs"
    ON audit_log FOR INSERT
    WITH CHECK (true);

-- Telegram whitelist policies
CREATE POLICY "Admins can manage telegram whitelist"
    ON telegram_whitelist FOR ALL
    USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their own telegram entry"
    ON telegram_whitelist FOR SELECT
    USING (auth.uid() = user_id OR is_admin(auth.uid()));
