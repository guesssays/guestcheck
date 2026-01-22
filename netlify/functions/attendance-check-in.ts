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
  const { employee_id, allow_recheckin = false } = body;

  if (!employee_id) {
    return errorResponse('Employee ID is required', 400);
  }

  const today = new Date().toISOString().split('T')[0];

  // Check if there's already an entry for today
  const { data: existing } = await supabase
    .from('staff_attendance_events')
    .select('*')
    .eq('employee_id', employee_id)
    .eq('date', today)
    .single();

  if (existing) {
    if (existing.status === 'in_building') {
      return errorResponse('Employee is already checked in', 400);
    }

    if (!allow_recheckin) {
      return errorResponse('Employee already has attendance record for today. Allow recheckin?', 400);
    }

    // Update existing record
    const { data, error } = await supabase
      .from('staff_attendance_events')
      .update({
        check_in_at: new Date().toISOString(),
        status: 'in_building',
        created_by_user_id: user.id,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      return errorResponse(error.message, 500);
    }

    await logAudit(user.id, 'check_in_recheckin', 'staff_attendance', data.id, { employee_id });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(successResponse(data)),
    };
  }

  // Create new record
  const { data, error } = await supabase
    .from('staff_attendance_events')
    .insert({
      employee_id,
      date: today,
      check_in_at: new Date().toISOString(),
      status: 'in_building',
      created_by_user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    return errorResponse(error.message, 500);
  }

  await logAudit(user.id, 'check_in', 'staff_attendance', data.id, { employee_id });

  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(successResponse(data)),
  };
};
