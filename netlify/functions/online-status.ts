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

  if (profile?.role !== 'admin' && !profile?.can_view_online) {
    return errorResponse('Forbidden', 403);
  }

  const url = new URL(event.rawUrl || `https://example.com${event.path}`);
  const departmentId = url.searchParams.get('department_id');

  const today = new Date().toISOString().split('T')[0];

  const { data: allData, error } = await supabase
    .from('staff_attendance_events')
    .select('*, employees(*, departments(name))')
    .eq('date', today)
    .order('check_in_at', { ascending: false });

  if (error) {
    return errorResponse(error.message, 500);
  }

  // Filter by department if specified
  let inBuilding = (allData || []).filter(
    (item: any) =>
      item.status === 'in_building' &&
      (!departmentId || item.employees?.department_id === departmentId)
  );

  let outside = (allData || [])
    .filter(
      (item: any) =>
        item.status === 'outside' &&
        item.check_out_at &&
        (!departmentId || item.employees?.department_id === departmentId)
    )
    .sort((a: any, b: any) => {
      const aTime = a.check_out_at ? new Date(a.check_out_at).getTime() : 0;
      const bTime = b.check_out_at ? new Date(b.check_out_at).getTime() : 0;
      return bTime - aTime;
    });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      successResponse({
        in_building: inBuilding,
        outside: outside,
      })
    ),
  };
};
