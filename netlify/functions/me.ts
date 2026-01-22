import type { Handler } from '@netlify/functions';
import { getAuthUser, errorResponse, successResponse } from './_shared/supabase';
import { supabase } from './_shared/supabase';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'GET') {
      return errorResponse('Method not allowed', 405);
    }

    const auth = await getAuthUser(event);
    if (!auth) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, profile } = auth;

    // Get allowed departments
    const { data: allowedDepartments, error: deptError } = await supabase
      .from('user_allowed_departments')
      .select('department_id')
      .eq('user_id', user.id);

    if (deptError) {
      console.error('Error fetching allowed departments:', deptError);
    }

    const departmentIds = Array.isArray(allowedDepartments)
      ? allowedDepartments.map((d) => d.department_id)
      : [];

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        successResponse({
          user: {
            id: user.id,
            email: user.email,
          },
          profile: profile
            ? {
                ...profile,
                allowed_department_ids: departmentIds,
              }
            : null,
        })
      ),
    };
  } catch (error: any) {
    console.error('Error in /api/me:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
};
