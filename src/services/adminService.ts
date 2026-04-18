import { getApiBase, getAuthHeaders, handleResponse } from './apiClient';

export const ADMIN_PERMISSION_KEYS = [
  'view_users',
  'delete_users',
  'view_messages',
  'delete_messages',
  'view_donations',
  'delete_donations',
  'view_certificates',
  'delete_certificates',
  'issue_certificates',
] as const;

export type AdminPermissionKey = (typeof ADMIN_PERMISSION_KEYS)[number];

export const ADMIN_PERMISSION_LABELS: Record<AdminPermissionKey, string> = {
  view_users: 'Ver usuarios',
  delete_users: 'Eliminar usuarios',
  view_messages: 'Ver conversaciones / mensajes',
  delete_messages: 'Eliminar mensajes',
  view_donations: 'Ver donaciones y solicitudes',
  delete_donations: 'Eliminar donaciones',
  view_certificates: 'Ver certificados',
  delete_certificates: 'Eliminar certificados',
  issue_certificates: 'Emitir certificados',
};

export async function fetchAdminUsers(token: string) {
  const res = await fetch(`${getApiBase()}/admin/users`, { headers: getAuthHeaders(token) });
  return handleResponse<any[]>(res);
}

export async function deleteAdminUser(id: string, token: string) {
  const res = await fetch(`${getApiBase()}/admin/users/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });
  return handleResponse<any>(res);
}

export async function fetchAdminMessages(token: string) {
  const res = await fetch(`${getApiBase()}/admin/messages`, { headers: getAuthHeaders(token) });
  return handleResponse<any[]>(res);
}

export async function deleteAdminMessage(id: string, token: string) {
  const res = await fetch(`${getApiBase()}/admin/messages/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });
  return handleResponse<any>(res);
}

export async function deleteAdminMessagesByDonation(donationId: string, token: string) {
  const res = await fetch(
    `${getApiBase()}/admin/messages/by-donation/${encodeURIComponent(donationId)}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(token),
    },
  );
  return handleResponse<{ message: string; deleted: number }>(res);
}

export async function postAdminMaintenancePrune(
  token: string,
  body: {
    deleteExpiredCertificates?: boolean;
    messagesOlderThanDays?: number | null;
    certificatesOlderThanDays?: number | null;
    donationsOlderThanDays?: number | null;
  },
) {
  const res = await fetch(`${getApiBase()}/admin/maintenance/prune`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(body),
  });
  return handleResponse<{ message: string; deleted: Record<string, number> }>(res);
}

export async function fetchAdminDonations(token: string) {
  const res = await fetch(`${getApiBase()}/admin/donations`, { headers: getAuthHeaders(token) });
  return handleResponse<any[]>(res);
}

export async function deleteAdminDonation(id: string, token: string) {
  const res = await fetch(`${getApiBase()}/admin/donations/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });
  return handleResponse<any>(res);
}

export async function fetchAdminCertificates(token: string) {
  const res = await fetch(`${getApiBase()}/admin/certificates`, { headers: getAuthHeaders(token) });
  return handleResponse<any[]>(res);
}

export async function fetchCertUserOptions(token: string) {
  const res = await fetch(`${getApiBase()}/admin/cert-user-options`, { headers: getAuthHeaders(token) });
  return handleResponse<{ id: string; name: string; email: string; role: string }[]>(res);
}

export async function createAdminCertificate(
  token: string,
  body: { userId: string; title: string; body?: string; donationId?: string },
) {
  const payload: Record<string, string> = {
    userId: body.userId,
    title: body.title,
  };
  if (body.body != null && body.body !== '') payload.body = body.body;
  if (body.donationId != null && body.donationId !== '') payload.donationId = body.donationId;

  const res = await fetch(`${getApiBase()}/admin/certificates`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<any>(res);
}

export async function deleteAdminCertificate(id: string, token: string) {
  const res = await fetch(`${getApiBase()}/admin/certificates/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });
  return handleResponse<any>(res);
}

export async function fetchAdminStaff(token: string) {
  const res = await fetch(`${getApiBase()}/admin/staff`, { headers: getAuthHeaders(token) });
  return handleResponse<any[]>(res);
}

export async function createAdminStaff(
  token: string,
  body: { name: string; email: string; password: string; permissions: Record<string, boolean> },
) {
  const res = await fetch(`${getApiBase()}/admin/staff`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(body),
  });
  return handleResponse<any>(res);
}

export async function updateStaffPermissions(
  id: string,
  token: string,
  permissions: Record<string, boolean>,
) {
  const res = await fetch(`${getApiBase()}/admin/staff/${id}/permissions`, {
    method: 'PATCH',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ permissions }),
  });
  return handleResponse<any>(res);
}

export async function deleteAdminStaff(id: string, token: string) {
  const res = await fetch(`${getApiBase()}/admin/staff/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });
  return handleResponse<any>(res);
}
