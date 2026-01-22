import { supabase } from './supabase';
import { api } from './api';
import { User } from '@/types';

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  if (data.session?.access_token) {
    localStorage.setItem('auth_token', data.session.access_token);
  }

  return data;
}

export async function signOut() {
  localStorage.removeItem('auth_token');
  await supabase.auth.signOut();
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return null;
    }

    if (!session?.access_token) {
      return null;
    }

    // Ensure token is stored
    localStorage.setItem('auth_token', session.access_token);

    const response = await api.get<{ user: User; profile: any }>('/me');
    // api.get now returns the unwrapped data directly
    if (response && response.user) {
      return {
        ...response.user,
        profile: response.profile,
        allowed_department_ids: response.profile?.allowed_department_ids || [],
      };
    }
  } catch (error: any) {
    const errorMessage = error?.message || 'Failed to get current user';
    console.error('Failed to get current user:', errorMessage, error);
    
    // Clear invalid token on 401 or auth errors
    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('token')) {
      console.warn('Clearing invalid auth token');
      localStorage.removeItem('auth_token');
    }
  }

  return null;
}

export function hasPermission(profile: any, permission: string): boolean {
  if (!profile) return false;
  if (profile.role === 'admin') return true;
  return profile[permission] === true;
}
