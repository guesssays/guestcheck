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

  if (profile?.role !== 'admin') {
    return errorResponse('Forbidden', 403);
  }

  if (event.httpMethod === 'GET') {
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) {
      return errorResponse(usersError.message, 500);
    }

    const { data: profiles } = await supabase.from('profiles').select('*');
    const { data: allowedDepts } = await supabase.from('user_allowed_departments').select('*');

    const usersWithProfiles = users.users.map((u) => {
      const profile = profiles?.find((p) => p.user_id === u.id);
      const depts = allowedDepts?.filter((d) => d.user_id === u.id).map((d) => d.department_id) || [];
      return {
        id: u.id,
        email: u.email,
        profile: profile || null,
        allowed_department_ids: depts,
      };
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(successResponse(usersWithProfiles)),
    };
  }

  if (event.httpMethod === 'PUT') {
    const body = JSON.parse(event.body || '{}');
    const { user_id, profile: profileData, allowed_department_ids } = body;

    if (!user_id) {
      return errorResponse('User ID is required', 400);
    }

    // Update or create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        user_id,
        ...profileData,
      });

    if (profileError) {
      return errorResponse(profileError.message, 500);
    }

    // Update allowed departments
    if (Array.isArray(allowed_department_ids)) {
      // Delete existing
      await supabase.from('user_allowed_departments').delete().eq('user_id', user_id);

      // Insert new
      if (allowed_department_ids.length > 0) {
        const inserts = allowed_department_ids.map((deptId) => ({
          user_id,
          department_id: deptId,
        }));
        await supabase.from('user_allowed_departments').insert(inserts);
      }
    }

    await logAudit(user.id, 'update_user_permissions', 'user', user_id, { profileData, allowed_department_ids });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(successResponse({ success: true })),
    };
  }

  return errorResponse('Method not allowed', 405);
};
