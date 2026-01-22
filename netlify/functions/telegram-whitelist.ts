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
    const { data: whitelist, error } = await supabase
      .from('telegram_whitelist')
      .select('*, profiles(role, display_name)')
      .order('created_at', { ascending: false });

    if (error) {
      return errorResponse(error.message, 500);
    }

    // Get user emails and allowed departments for each user
    const whitelistWithDetails = await Promise.all(
      (whitelist || []).map(async (item: any) => {
        // Get user email
        let userEmail = null;
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(item.user_id);
          userEmail = userData?.user?.email || null;
        } catch (e) {
          console.error('Error fetching user email:', e);
        }

        // Get allowed departments
        const { data: allowedDepts } = await supabase
          .from('user_allowed_departments')
          .select('department_id, departments(name)')
          .eq('user_id', item.user_id);

        const departments = Array.isArray(allowedDepts)
          ? allowedDepts.map((d: any) => ({
              id: d.department_id,
              name: d.departments?.name || '',
            }))
          : [];

        return {
          telegram_id: item.telegram_id,
          user_id: item.user_id,
          user_email: userEmail,
          role: item.profiles?.role || null,
          display_name: item.profiles?.display_name || null,
          allowed_departments: departments,
          is_active: item.is_active,
          created_at: item.created_at,
          updated_at: item.updated_at,
        };
      })
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(successResponse(whitelistWithDetails)),
    };
  }

  if (event.httpMethod === 'POST') {
    const body = JSON.parse(event.body || '{}');
    const { telegram_id, user_id } = body;

    if (!telegram_id || !user_id) {
      return errorResponse('telegram_id and user_id are required', 400);
    }

    // Check if telegram_id already exists
    const { data: existing } = await supabase
      .from('telegram_whitelist')
      .select('telegram_id')
      .eq('telegram_id', telegram_id)
      .single();

    if (existing) {
      return errorResponse('Telegram ID already exists', 400);
    }

    // Check if user exists
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(user_id);
    if (userError || !userData) {
      return errorResponse('User not found', 404);
    }

    const { data, error } = await supabase
      .from('telegram_whitelist')
      .insert({
        telegram_id: parseInt(telegram_id, 10),
        user_id,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return errorResponse(error.message, 500);
    }

    await logAudit(user.id, 'create_telegram_whitelist', 'telegram_whitelist', data.telegram_id.toString(), {
      telegram_id,
      user_id,
    });

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(successResponse(data)),
    };
  }

  if (event.httpMethod === 'PUT') {
    const body = JSON.parse(event.body || '{}');
    const { telegram_id, user_id, is_active } = body;

    if (!telegram_id) {
      return errorResponse('telegram_id is required', 400);
    }

    const updateData: any = {};
    if (user_id !== undefined) {
      // Check if user exists
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(user_id);
      if (userError || !userData) {
        return errorResponse('User not found', 404);
      }
      updateData.user_id = user_id;
    }
    if (is_active !== undefined) {
      updateData.is_active = is_active;
    }

    const { data, error } = await supabase
      .from('telegram_whitelist')
      .update(updateData)
      .eq('telegram_id', telegram_id)
      .select()
      .single();

    if (error) {
      return errorResponse(error.message, 500);
    }

    if (!data) {
      return errorResponse('Telegram whitelist entry not found', 404);
    }

    await logAudit(user.id, 'update_telegram_whitelist', 'telegram_whitelist', telegram_id.toString(), updateData);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(successResponse(data)),
    };
  }

  if (event.httpMethod === 'DELETE') {
    const url = new URL(event.rawUrl || `https://example.com${event.path}`);
    const telegramId = url.searchParams.get('telegram_id');

    if (!telegramId) {
      return errorResponse('telegram_id is required', 400);
    }

    const { error } = await supabase
      .from('telegram_whitelist')
      .delete()
      .eq('telegram_id', telegramId);

    if (error) {
      return errorResponse(error.message, 500);
    }

    await logAudit(user.id, 'delete_telegram_whitelist', 'telegram_whitelist', telegramId, {});

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(successResponse({ success: true })),
    };
  }

  return errorResponse('Method not allowed', 405);
};
