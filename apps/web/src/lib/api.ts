import { ApiResponse } from '@/types';

const API_BASE = '/api';

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  const json = await response.json().catch(() => {
    throw new Error(`Failed to parse response from ${endpoint}`);
  });

  // Handle HTTP errors
  if (!response.ok) {
    const errorMessage = 
      (json as ApiResponse).error || 
      (json as any).message || 
      `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(errorMessage);
  }

  // Handle envelope format: { success: true, data: T } or { success: false, error: string }
  if (typeof json === 'object' && json !== null && 'success' in json) {
    const envelope = json as ApiResponse<T>;
    if (envelope.success === false) {
      throw new Error(envelope.error || envelope.message || 'Request failed');
    }
    if (envelope.success === true && 'data' in envelope) {
      return envelope.data as T;
    }
  }

  // Fallback: return raw JSON if no envelope format detected
  return json as T;
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, data?: any) =>
    request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  put: <T>(endpoint: string, data?: any) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: <T>(endpoint: string, data?: any) =>
    request<T>(endpoint, {
      method: 'DELETE',
      body: JSON.stringify(data),
    }),
};
