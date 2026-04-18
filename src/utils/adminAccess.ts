import { User } from '../types';

export function isAdminRole(role: string | undefined): role is 'super_admin' | 'admin' {
  return role === 'super_admin' || role === 'admin';
}

export function adminCan(user: User | null, permission: string): boolean {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  if (user.role !== 'admin') return false;
  return user.adminPermissions?.[permission] === true;
}
