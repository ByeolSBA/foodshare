import { getApiBase, getAuthHeaders, handleResponse } from './apiClient';

export interface UserCertificate {
  id: string;
  title: string;
  body: string;
  donation_id?: string | null;
  created_at: string;
  user_role?: string;
  expires_at?: string | null;
  recipient_name?: string | null;
}

export async function fetchMyCertificates(token: string) {
  const res = await fetch(`${getApiBase()}/certificates/mine`, { headers: getAuthHeaders(token) });
  return handleResponse<UserCertificate[]>(res);
}

export async function downloadCertificatePdf(token: string, certId: string): Promise<Blob> {
  const res = await fetch(`${getApiBase()}/certificates/${encodeURIComponent(certId)}/pdf`, {
    headers: getAuthHeaders(token),
  });
  if (!res.ok) {
    let msg = 'No se pudo generar el PDF';
    try {
      const j = (await res.json()) as { error?: string };
      if (j?.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.blob();
}
