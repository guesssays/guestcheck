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
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('is_active', true)
      .order('name');

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
    if (profile?.role !== 'admin' && !profile?.can_manage_departments) {
      return errorResponse('Forbidden', 403);
    }

    const body = JSON.parse(event.body || '{}');
    const { name, is_active = true } = body;

    if (!name) {
      return errorResponse('Name is required', 400);
    }

    const { data, error } = await supabase
      .from('departments')
      .insert({ name, is_active })
      .select()
      .single();

    if (error) {
      return errorResponse(error.message, 500);
    }

    await logAudit(user.id, 'create_department', 'department', data.id, { name });

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(successResponse(data)),
    };
  }

  if (event.httpMethod === 'PUT') {
    if (profile?.role !== 'admin' && !profile?.can_manage_departments) {
      return errorResponse('Forbidden', 403);
    }

    const body = JSON.parse(event.body || '{}');
    const { id, name, is_active } = body;

    if (!id) {
      return errorResponse('ID is required', 400);
    }

    const { data, error } = await supabase
      .from('departments')
      .update({ name, is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return errorResponse(error.message, 500);
    }

    await logAudit(user.id, 'update_department', 'department', id, { name, is_active });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(successResponse(data)),
    };
  }

  if (event.httpMethod === 'DELETE') {
    if (profile?.role !== 'admin' && !profile?.can_manage_departments) {
      return errorResponse('Forbidden', 403);
    }

    const { id } = JSON.parse(event.body || '{}');
    if (!id) {
      return errorResponse('ID is required', 400);
    }

    const { error } = await supabase
      .from('departments')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      return errorResponse(error.message, 500);
    }

    await logAudit(user.id, 'delete_department', 'department', id);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(successResponse({ id })),
    };
  }

  return errorResponse('Method not allowed', 405);
};
