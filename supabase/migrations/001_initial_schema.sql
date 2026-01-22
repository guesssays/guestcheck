-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Departments table
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employees table
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    last_name VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    middle_name VARCHAR(255),
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    phone1 VARCHAR(50),
    phone2 VARCHAR(50),
    position VARCHAR(255),
    note TEXT,
    tab_number VARCHAR(50) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff attendance events
CREATE TABLE staff_attendance_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in_at TIMESTAMPTZ,
    check_out_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'outside' CHECK (status IN ('in_building', 'outside')),
    created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    corrected_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    correction_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

-- Guest visits
CREATE TABLE guest_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_full_name VARCHAR(255) NOT NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    planned_date DATE,
    planned_time TIME,
    comment TEXT,
    doc_number VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'expected' CHECK (status IN ('expected', 'in_building', 'outside')),
    check_in_at TIMESTAMPTZ,
    check_out_at TIMESTAMPTZ,
    created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    confirmed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles with RBAC
CREATE TABLE profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'security', 'secretary', 'manager', 'top_manager', 'general')),
    display_name VARCHAR(255),
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    can_view_online BOOLEAN DEFAULT false,
    can_view_journal BOOLEAN DEFAULT false,
    can_view_reports BOOLEAN DEFAULT false,
    can_view_employee_cards BOOLEAN DEFAULT false,
    can_view_guest_cards BOOLEAN DEFAULT false,
    can_see_phones BOOLEAN DEFAULT false,
    can_export_reports BOOLEAN DEFAULT false,
    can_register_attendance BOOLEAN DEFAULT false,
    can_register_guests BOOLEAN DEFAULT false,
    can_confirm_guests BOOLEAN DEFAULT false,
    can_edit_guests BOOLEAN DEFAULT false,
    can_manage_departments BOOLEAN DEFAULT false,
    can_manage_employees BOOLEAN DEFAULT false,
    can_manage_users BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allowed departments for users (many-to-many)
CREATE TABLE user_allowed_departments (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, department_id)
);

-- Audit log
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Telegram whitelist
CREATE TABLE telegram_whitelist (
    telegram_id BIGINT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_employees_active ON employees(is_active);
CREATE INDEX idx_staff_attendance_employee_date ON staff_attendance_events(employee_id, date);
CREATE INDEX idx_staff_attendance_date ON staff_attendance_events(date);
CREATE INDEX idx_staff_attendance_status ON staff_attendance_events(status);
CREATE INDEX idx_guest_visits_status ON guest_visits(status);
CREATE INDEX idx_guest_visits_date ON guest_visits(planned_date, created_at);
CREATE INDEX idx_guest_visits_department ON guest_visits(department_id);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_user_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);
CREATE INDEX idx_user_allowed_departments_user ON user_allowed_departments(user_id);
CREATE INDEX idx_user_allowed_departments_dept ON user_allowed_departments(department_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_attendance_updated_at BEFORE UPDATE ON staff_attendance_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guest_visits_updated_at BEFORE UPDATE ON guest_visits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_telegram_whitelist_updated_at BEFORE UPDATE ON telegram_whitelist
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
