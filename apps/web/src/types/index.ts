export interface Department {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  last_name: string;
  first_name: string;
  middle_name?: string;
  department_id?: string;
  phone1?: string;
  phone2?: string;
  position?: string;
  note?: string;
  tab_number?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  departments?: Department;
}

export interface StaffAttendanceEvent {
  id: string;
  employee_id: string;
  date: string;
  check_in_at?: string;
  check_out_at?: string;
  status: 'in_building' | 'outside';
  created_by_user_id?: string;
  corrected_by_user_id?: string;
  correction_reason?: string;
  created_at: string;
  updated_at: string;
  employees?: Employee;
}

export interface GuestVisit {
  id: string;
  guest_full_name: string;
  department_id?: string;
  employee_id?: string;
  planned_date?: string;
  planned_time?: string;
  comment?: string;
  doc_number?: string;
  status: 'expected' | 'in_building' | 'outside';
  check_in_at?: string;
  check_out_at?: string;
  created_by_user_id?: string;
  confirmed_by_user_id?: string;
  created_at: string;
  updated_at: string;
  departments?: Department;
  employees?: Employee;
}

export interface UserProfile {
  user_id: string;
  role: 'admin' | 'security' | 'secretary' | 'manager' | 'top_manager' | 'general';
  display_name?: string;
  department_id?: string;
  can_view_online: boolean;
  can_view_journal: boolean;
  can_view_reports: boolean;
  can_view_employee_cards: boolean;
  can_view_guest_cards: boolean;
  can_see_phones: boolean;
  can_export_reports: boolean;
  can_register_attendance: boolean;
  can_register_guests: boolean;
  can_confirm_guests: boolean;
  can_edit_guests: boolean;
  can_manage_departments: boolean;
  can_manage_employees: boolean;
  can_manage_users: boolean;
  created_at: string;
  updated_at: string;
  allowed_department_ids?: string[];
}

export interface User {
  id: string;
  email?: string;
  profile?: UserProfile;
  allowed_department_ids?: string[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
