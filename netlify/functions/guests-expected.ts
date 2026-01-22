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

  if (profile?.role !== 'admin' && !profile?.can_confirm_guests && !profile?.can_register_guests) {
    return errorResponse('Forbidden', 403);
  }

  const url = new URL(event.rawUrl || `https://example.com${event.path}`);
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('guest_visits')
    .select('*, departments(name), employees(last_name, first_name, middle_name)')
    .eq('status', 'expected')
    .gte('planned_date', date)
    .order('planned_date')
    .order('planned_time');

  if (error) {
    return errorResponse(error.message, 500);
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(successResponse(data || [])),
  };
};
