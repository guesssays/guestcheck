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

  if (profile?.role !== 'admin' && !profile?.can_register_guests) {
    return errorResponse('Forbidden', 403);
  }

  const body = JSON.parse(event.body || '{}');
  const { guest_visit_id } = body;

  if (!guest_visit_id) {
    return errorResponse('Guest visit ID is required', 400);
  }

  const { data: existing } = await supabase
    .from('guest_visits')
    .select('*')
    .eq('id', guest_visit_id)
    .single();

  if (!existing || existing.status === 'outside') {
    return errorResponse('Guest is already checked out or not found', 400);
  }

  const { data, error } = await supabase
    .from('guest_visits')
    .update({
      status: 'outside',
      check_out_at: new Date().toISOString(),
    })
    .eq('id', guest_visit_id)
    .select()
    .single();

  if (error) {
    return errorResponse(error.message, 500);
  }

  await logAudit(user.id, 'check_out_guest', 'guest_visit', guest_visit_id);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(successResponse(data)),
  };
};
