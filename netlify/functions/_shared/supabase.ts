import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

export function errorResponse(message: string, statusCode = 400) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      success: false,
      error: message,
    }),
  };
}

export function getHeader(event: any, name: string): string | null {
  if (!event.headers) return null;
  const lowerName = name.toLowerCase();
  // Netlify headers can be lowercase or mixed case
  return event.headers[lowerName] || event.headers[name] || null;
}

export async function getAuthUser(event: any): Promise<{ user: any; profile: any } | null> {
  const authHeader = getHeader(event, 'Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return { user, profile: profile || null };
}
