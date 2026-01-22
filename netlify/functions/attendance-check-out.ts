import type { Handler } from '@netlify/functions';
import { getAuthUser, errorResponse, successResponse } from './_shared/supabase';
import { supabase } from './_shared/supabase';
import { logAudit } from './_shared/audit';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const auth = await getAuthUser(event);
  if (!auth) {
    return errorResponse('Unauthorized', 401);
  }

  const { user, profile } = auth;

  if (profile?.role !== 'admin' && !profile?.can_register_attendance) {
    return errorResponse('Forbidden', 403);
  }

  const body = JSON.parse(event.body || '{}');
  const { employee_id } = body;

  if (!employee_id) {
    return errorResponse('Employee ID is required', 400);
  }

  const today = new Date().toISOString().split('T')[0];

  // Find today's attendance record
  const { data: existing, error: fetchError } = await supabase
    .from('staff_attendance_events')
    .select('*')
    .eq('employee_id', employee_id)
    .eq('date', today)
    .single();

  if (fetchError || !existing) {
    return errorResponse('No check-in record found for today', 400);
  }

  if (existing.status === 'outside') {
    return errorResponse('Employee is already checked out', 400);
  }

  if (!existing.check_in_at) {
    return errorResponse('Cannot check out without check-in', 400);
  }

  const { data, error } = await supabase
    .from('staff_attendance_events')
    .update({
      check_out_at: new Date().toISOString(),
      status: 'outside',
    })
    .eq('id', existing.id)
    .select()
    .single();

  if (error) {
    return errorResponse(error.message, 500);
  }

  await logAudit(user.id, 'check_out', 'staff_attendance', data.id, { employee_id });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(successResponse(data)),
  };
};
