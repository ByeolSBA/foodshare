import { getApiBaseUrl } from "../config/urls";

function trimTrailingSlashes(s: string) {
  return s.replace(/\/+$/, '');
}

const API_BASE = trimTrailingSlashes(getApiBaseUrl());

export function getApiBase() {
  return API_BASE;
}

/** Origen del backend sin `/api` (para `/images/...`). */
export function getServerOrigin() {
  return API_BASE.replace(/\/api$/, '') || API_BASE;
}

const DEFAULT_DONATION_IMAGE =
  'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&q=80';

/** Resuelve `image_url` almacenada (URL absoluta, data URL o ruta `/images/...`). */
export function resolveDonationImageUrl(imageUrl: string | undefined | null): string {
  const u = imageUrl?.trim();
  if (!u) return DEFAULT_DONATION_IMAGE;
  if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')) {
    return u;
  }
  if (u.startsWith('/')) {
    return `${getServerOrigin()}${u}`;
  }
  return u;
}

export function getAuthHeaders(token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export function getAuthHeadersMultipart(token?: string) {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error(`Server returned non-JSON response: ${response.status} ${response.statusText}`);
  }

  let data: any;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error(`Invalid JSON response from server: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  if (!response.ok) {
    throw new Error(data?.error || data?.message || `Error al comunicarse con el servidor (${response.status})`);
  }

  return data;
}
