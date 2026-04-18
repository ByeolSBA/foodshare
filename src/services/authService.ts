export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  location?: string | null;
  adminPermissions?: Record<string, boolean> | null;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: AuthUser;
  error?: string;
}

import { getApiBase, getAuthHeaders } from './apiClient';

export async function loginApi(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${getApiBase()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return response.json();
}

export async function registerApi(name: string, email: string, password: string, role: string): Promise<AuthResponse> {
  const response = await fetch(`${getApiBase()}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, role }),
  });
  return response.json();
}

export async function profileApi(token: string): Promise<AuthUser> {
  const response = await fetch(`${getApiBase()}/auth/profile`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return response.json();
}

export async function getUserByIdApi(id: string, token: string): Promise<{ id: string; name: string; email: string; role: string }> {
  const response = await fetch(`${getApiBase()}/auth/users/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}
