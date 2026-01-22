import type { Handler } from '@netlify/functions';
import { getAuthUser, errorResponse, successResponse } from './_shared/supabase';
import { supabase } from './_shared/supabase';
import { logAudit } from './_shared/audit';

export const handler: Handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      },
      body: '',
    };
  }

  const auth = await getAuthUser(event as any);
  if (!auth) {
    return errorResponse('Unauthorized', 401);
  }

  const { user, profile } = auth;

  if (profile?.role !== 'admin') {
    return errorResponse('Forbidden', 403);
  }

  if (event.httpMethod === 'GET') {
    const url = new URL(event.rawUrl || `https://example.com${event.path}`);
    const search = url.searchParams.get('search') || '';

    let query = supabase
      .from('telegram_whitelist')
      .select('id, chat_id, username, full_name, note, added_by, created_at')
      .order('created_at', { ascending: false });

    // Search by chat_id, username, or full_name
    if (search) {
      const searchNum = parseInt(search, 10);
      if (!isNaN(searchNum)) {
        // Search by chat_id
        query = query.eq('chat_id', searchNum);
      } else {
        // Search by username or full_name
        query = query.or(`username.ilike.%${search}%,full_name.ilike.%${search}%`);
      }
    }

    const { data, error } = await query;

    if (error) {
      return errorResponse(error.message, 500);
    }

    // Get added_by user emails
    const whitelistWithDetails = await Promise.all(
      (data || []).map(async (item: any) => {
        let addedByEmail = null;
        if (item.added_by) {
          try {
            const { data: userData } = await supabase.auth.admin.getUserById(item.added_by);
            addedByEmail = userData?.user?.email || null;
          } catch (e) {
            console.error('Error fetching added_by email:', e);
          }
        }

        return {
          id: item.id,
          chat_id: String(item.chat_id), // Ensure chat_id is always string (BIGINT may be returned as string)
          username: item.username || null,
          full_name: item.full_name || null,
          note: item.note || null,
          added_by: item.added_by || null,
          added_by_email: addedByEmail,
          created_at: item.created_at,
        };
      })
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(successResponse(whitelistWithDetails)),
    };
  }

  if (event.httpMethod === 'POST') {
    const body = JSON.parse(event.body || '{}');
    const { chat_id, username, full_name, note } = body;

    if (!chat_id) {
      return errorResponse('chat_id is required', 400);
    }

    const chatIdNum = typeof chat_id === 'string' ? parseInt(chat_id, 10) : chat_id;
    if (isNaN(chatIdNum)) {
      return errorResponse('chat_id must be a valid number', 400);
    }

    // Check if chat_id already exists
    const { data: existing } = await supabase
      .from('telegram_whitelist')
      .select('chat_id')
      .eq('chat_id', chatIdNum)
      .single();

    if (existing) {
      return errorResponse('Chat ID already exists in whitelist', 400);
    }

    const { data, error } = await supabase
      .from('telegram_whitelist')
      .insert({
        chat_id: chatIdNum,
        username: username || null,
        full_name: full_name || null,
        note: note || null,
        added_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return errorResponse(error.message, 500);
    }

    await logAudit(user.id, 'create_telegram_whitelist', 'telegram_whitelist', data.id, {
      chat_id: chatIdNum,
      username,
      full_name,
    });

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(successResponse(data)),
    };
  }

  if (event.httpMethod === 'PUT') {
    const body = JSON.parse(event.body || '{}');
    const { chat_id, username, full_name, note } = body;

    if (!chat_id) {
      return errorResponse('chat_id is required', 400);
    }

    const chatIdNum = typeof chat_id === 'string' ? parseInt(chat_id, 10) : chat_id;
    if (isNaN(chatIdNum)) {
      return errorResponse('chat_id must be a valid number', 400);
    }

    const updateData: any = {};
    if (username !== undefined) updateData.username = username || null;
    if (full_name !== undefined) updateData.full_name = full_name || null;
    if (note !== undefined) updateData.note = note || null;

    const { data, error } = await supabase
      .from('telegram_whitelist')
      .update(updateData)
      .eq('chat_id', chatIdNum)
      .select()
      .single();

    if (error) {
      return errorResponse(error.message, 500);
    }

    if (!data) {
      return errorResponse('Telegram whitelist entry not found', 404);
    }

    await logAudit(user.id, 'update_telegram_whitelist', 'telegram_whitelist', data.id, updateData);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(successResponse(data)),
    };
  }

  if (event.httpMethod === 'DELETE') {
    const url = new URL(event.rawUrl || `https://example.com${event.path}`);
    const chatId = url.searchParams.get('chat_id');

    if (!chatId) {
      return errorResponse('chat_id is required', 400);
    }

    const chatIdNum = parseInt(chatId, 10);
    if (isNaN(chatIdNum)) {
      return errorResponse('chat_id must be a valid number', 400);
    }

    // Get entry before deletion for audit
    const { data: entry } = await supabase
      .from('telegram_whitelist')
      .select('id')
      .eq('chat_id', chatIdNum)
      .single();

    if (!entry) {
      return errorResponse('Telegram whitelist entry not found', 404);
    }

    const { error } = await supabase
      .from('telegram_whitelist')
      .delete()
      .eq('chat_id', chatIdNum);

    if (error) {
      return errorResponse(error.message, 500);
    }

    await logAudit(user.id, 'delete_telegram_whitelist', 'telegram_whitelist', entry.id, {
      chat_id: chatIdNum,
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(successResponse({ success: true })),
    };
  }

  return errorResponse('Method not allowed', 405);
};
