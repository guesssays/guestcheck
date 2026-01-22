import type { Handler } from '@netlify/functions';
import { getAuthUser, errorResponse, successResponse } from './_shared/supabase';
import { supabase } from './_shared/supabase';
import { logAudit } from './_shared/audit';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const auth = await getAuthUser(event as any);
  if (!auth) {
    return errorResponse('Unauthorized', 401);
  }

  const { user, profile } = auth;

  if (profile?.role !== 'admin' && !profile?.can_register_guests && !profile?.can_edit_guests) {
    return errorResponse('Forbidden', 403);
  }

  const body = JSON.parse(event.body || '{}');
  const { guest_full_name, department_id, employee_id, planned_date, planned_time, comment, doc_number } = body;

  if (!guest_full_name) {
    return errorResponse('Guest full name is required', 400);
  }

  const { data, error } = await supabase
    .from('guest_visits')
    .insert({
      guest_full_name,
      department_id,
      employee_id,
      planned_date,
      planned_time,
      comment,
      doc_number,
      status: 'expected',
      created_by_user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    return errorResponse(error.message, 500);
  }

  await logAudit(user.id, 'preregister_guest', 'guest_visit', data.id, { guest_full_name });

  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(successResponse(data)),
  };
};
