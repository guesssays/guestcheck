import type { Handler } from '@netlify/functions';
import { getAuthUser, errorResponse, successResponse } from './_shared/supabase';
import { supabase } from './_shared/supabase';
import { logAudit } from './_shared/audit';

export const handler: Handler = async (event) => {
  const auth = await getAuthUser(event as any);
  if (!auth) {
    return errorResponse('Unauthorized', 401);
  }

  const { user, profile } = auth;

  if (event.httpMethod === 'GET') {
    const url = new URL(event.rawUrl || `https://example.com${event.path}`);
    const departmentId = url.searchParams.get('department_id');
    const search = url.searchParams.get('search');

    let query = supabase
      .from('employees')
      .select('*, departments(name)')
      .eq('is_active', true);

    if (departmentId) {
      query = query.eq('department_id', departmentId);
    }

    if (search) {
      query = query.or(
        `last_name.ilike.%${search}%,first_name.ilike.%${search}%,middle_name.ilike.%${search}%,tab_number.ilike.%${search}%`
      );
    }

    query = query.order('last_name').order('first_name');

    const { data, error } = await query;

    if (error) {
      return errorResponse(error.message, 500);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(successResponse(data)),
    };
  }

  if (event.httpMethod === 'POST') {
    if (profile?.role !== 'admin' && !profile?.can_manage_employees) {
      return errorResponse('Forbidden', 403);
    }

    const body = JSON.parse(event.body || '{}');
    const { last_name, first_name, middle_name, department_id, phone1, phone2, position, note, tab_number } = body;

    if (!last_name || !first_name) {
      return errorResponse('Last name and first name are required', 400);
    }

    const { data, error } = await supabase
      .from('employees')
      .insert({
        last_name,
        first_name,
        middle_name,
        department_id,
        phone1,
        phone2,
        position,
        note,
        tab_number,
      })
      .select()
      .single();

    if (error) {
      return errorResponse(error.message, 500);
    }

    await logAudit(user.id, 'create_employee', 'employee', data.id, { last_name, first_name });

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(successResponse(data)),
    };
  }

  if (event.httpMethod === 'PUT') {
    if (profile?.role !== 'admin' && !profile?.can_manage_employees) {
      return errorResponse('Forbidden', 403);
    }

    const body = JSON.parse(event.body || '{}');
    const { id, ...updates } = body;

    if (!id) {
      return errorResponse('ID is required', 400);
    }

    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return errorResponse(error.message, 500);
    }

    await logAudit(user.id, 'update_employee', 'employee', id, updates);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(successResponse(data)),
    };
  }

  if (event.httpMethod === 'DELETE') {
    if (profile?.role !== 'admin' && !profile?.can_manage_employees) {
      return errorResponse('Forbidden', 403);
    }

    const { id } = JSON.parse(event.body || '{}');
    if (!id) {
      return errorResponse('ID is required', 400);
    }

    const { error } = await supabase.from('employees').update({ is_active: false }).eq('id', id);

    if (error) {
      return errorResponse(error.message, 500);
    }

    await logAudit(user.id, 'delete_employee', 'employee', id);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(successResponse({ id })),
    };
  }

  return errorResponse('Method not allowed', 405);
};
