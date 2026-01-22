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
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    return null;
  }

  localStorage.setItem('auth_token', session.access_token);

  try {
    const response = await api.get<{ user: User; profile: any }>('/me');
    if (response.success && response.data) {
      return {
        ...response.data.user,
        profile: response.data.profile,
        allowed_department_ids: response.data.profile?.allowed_department_ids || [],
      };
    }
  } catch (error) {
    console.error('Failed to get current user:', error);
  }

  return null;
}

export function hasPermission(profile: any, permission: string): boolean {
  if (!profile) return false;
  if (profile.role === 'admin') return true;
  return profile[permission] === true;
}
