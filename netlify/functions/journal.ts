import type { Handler } from '@netlify/functions';
import { getAuthUser, errorResponse, successResponse } from './_shared/supabase';
import { supabase } from './_shared/supabase';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  const auth = await getAuthUser(event as any);
  if (!auth) {
    return errorResponse('Unauthorized', 401);
  }

  const { profile } = auth;

  if (profile?.role !== 'admin' && !profile?.can_view_journal) {
    return errorResponse('Forbidden', 403);
  }

  const url = new URL(event.rawUrl || `https://example.com${event.path}`);
  const type = url.searchParams.get('type') || 'staff'; // 'staff' or 'guests'
  const startDate = url.searchParams.get('start_date');
  const endDate = url.searchParams.get('end_date');
  const departmentId = url.searchParams.get('department_id');
  const employeeId = url.searchParams.get('employee_id');
  const search = url.searchParams.get('search');
  const status = url.searchParams.get('status');

  if (type === 'staff') {
    let query = supabase
      .from('staff_attendance_events')
      .select('*, employees(*, departments(name))')
      .order('date', { ascending: false })
      .order('check_in_at', { ascending: false });

    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }
    if (departmentId) {
      query = query.eq('employees.department_id', departmentId);
    }
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (search) {
      // Search in employee names via join
      query = query.or(
        `employees.last_name.ilike.%${search}%,employees.first_name.ilike.%${search}%`
      );
    }

    const { data, error } = await query.limit(1000);

    if (error) {
      return errorResponse(error.message, 500);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(successResponse(data || [])),
    };
  } else {
    // Guests
    let query = supabase
      .from('guest_visits')
      .select('*, departments(name), employees(last_name, first_name, middle_name)')
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('planned_date', startDate);
    }
    if (endDate) {
      query = query.lte('planned_date', endDate);
    }
    if (departmentId) {
      query = query.eq('department_id', departmentId);
    }
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (search) {
      query = query.ilike('guest_full_name', `%${search}%`);
    }

    const { data, error } = await query.limit(1000);

    if (error) {
      return errorResponse(error.message, 500);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(successResponse(data || [])),
    };
  }
};
