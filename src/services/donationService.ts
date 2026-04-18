import { getApiBase, getAuthHeaders, getAuthHeadersMultipart, handleResponse } from './apiClient';

export interface DonationPayload {
  title: string;
  description: string;
  quantity: string;
  expirationDate: string;
  location: string;
  imageUrl?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

function toId(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s.length ? s : undefined;
}

function normalizeDonation(record: any) {
  return {
    id: String(record.id),
    donorId: toId(record.donor_id ?? record.donorId) ?? '',
    donorName: record.donor_name || record.donorName || '',
    title: record.title,
    description: record.description || '',
    quantity: record.quantity,
    expirationDate: record.expiration_date || record.expirationDate,
    location: record.location,
    coordinates: record.latitude != null || record.longitude != null
      ? { lat: Number(record.latitude), lng: Number(record.longitude) }
      : record.coordinates,
    status: record.status,
    imageUrl: record.image_url || record.imageUrl || '',
    createdAt: record.created_at || record.createdAt,
    claimedBy: toId(record.claimed_by ?? record.claimedBy),
    claimedByName: record.claimed_by_name || record.claimedByName || '',
    transportedBy: toId(record.transported_by ?? record.transportedBy),
    cancelRequestedBy: toId(record.cancel_requested_by ?? record.cancelRequestedBy),
  };
}

export async function uploadDonationImage(file: File, token: string): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);
  const response = await fetch(`${getApiBase()}/donations/upload-image`, {
    method: 'POST',
    headers: getAuthHeadersMultipart(token),
    body: formData,
  });
  const data = await handleResponse<{ imageUrl: string }>(response);
  return data.imageUrl;
}

export async function fetchDonations(token: string) {
  const response = await fetch(`${getApiBase()}/donations`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  const data = await handleResponse<any>(response);
  return Array.isArray(data) ? data.map(normalizeDonation) : [];
}

export async function createDonation(payload: DonationPayload, token: string) {
  const body = { ...payload };

  if (!body.coordinates && body.location) {
    const coords = await geocodeAddress(body.location);
    if (coords) {
      body.coordinates = coords;
    }
  }

  const response = await fetch(`${getApiBase()}/donations`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(body),
  });
  const data = await handleResponse<any>(response);
  return {
    ...data,
    donation: data.donation ? normalizeDonation(data.donation) : undefined,
  };
}

export async function updateDonation(id: string, payload: DonationPayload, token: string) {
  const response = await fetch(`${getApiBase()}/donations/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<any>(response);
}

export async function deleteDonation(id: string, token: string) {
  const response = await fetch(`${getApiBase()}/donations/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });
  return handleResponse<any>(response);
}

export async function fetchNgoRequests(token: string) {
  const response = await fetch(`${getApiBase()}/donations/requests`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  const data = await handleResponse<any>(response);
  return Array.isArray(data) ? data.map(normalizeDonation) : [];
}

export async function claimDonation(id: string, token: string) {
  const response = await fetch(`${getApiBase()}/donations/${id}/claim`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  });
  return handleResponse<any>(response);
}

export async function cancelClaim(id: string, token: string) {
  const response = await fetch(`${getApiBase()}/donations/${id}/claim`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });
  return handleResponse<any>(response);
}

export async function acceptTransport(id: string, token: string) {
  const response = await fetch(`${getApiBase()}/donations/${id}/transport`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  });
  return handleResponse<any>(response);
}

export async function collectDonation(id: string, token: string) {
  const response = await fetch(`${getApiBase()}/donations/${id}/collect`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  });
  return handleResponse<any>(response);
}

export async function deliverDonation(id: string, token: string) {
  const response = await fetch(`${getApiBase()}/donations/${id}/deliver`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  });
  return handleResponse<any>(response);
}

export async function requestCancelDonation(id: string, token: string) {
  const response = await fetch(`${getApiBase()}/donations/${id}/request-cancel`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  });
  return handleResponse<any>(response);
}

export async function approveCancelDonation(id: string, token: string) {
  const response = await fetch(`${getApiBase()}/donations/${id}/approve-cancel`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  });
  return handleResponse<any>(response);
}

export async function rejectCancelDonation(id: string, token: string) {
  const response = await fetch(`${getApiBase()}/donations/${id}/reject-cancel`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  });
  return handleResponse<any>(response);
}

export async function geocodeAddress(address: string, city?: string, country?: string): Promise<{ lat: number; lng: number } | null> {
  if (!address || address.trim().length < 3) {
    console.warn('Geocoding: Dirección inválida o muy corta');
    return null;
  }

  // Construir búsqueda con contexto de ciudad/país
  let searchQuery = address.trim();
  
  // Si no se especifica ciudad/país, intentar inferir de la dirección
  if (!city && !country) {
    // Buscar patrones comunes de direcciones colombianas
    const colombianPatterns = [
      /\b(popayán|popayan|cali|bogotá|bogota|medellín|medellin|barranquilla|cartagena|bucaramanga|cúcuta|cuta|ibagué|ibague|pereira|manizales|villavicencio|soledad|pasto|montería|monteria|valledupar|armenia|neiva|riohacha|sincelejo|tunja|floren|quibdó|inírida|inirida|mitú|mitu|yopal|san andrés|san andres|providencia|leticia)\b/i,
      /\b(colombia|co)\b/i
    ];
    
    const hasColombianContext = colombianPatterns.some(pattern => pattern.test(address));
    
    if (!hasColombianContext) {
      // Si no hay contexto colombiano, agregar Colombia por defecto
      searchQuery += ', Colombia';
    }
  } else {
    // Usar ciudad/país proporcionados
    if (city) searchQuery += `, ${city}`;
    if (country) searchQuery += `, ${country}`;
  }

  console.log(`Geocoding: Buscando "${searchQuery}"`);

  // Intentar múltiples servicios de geocodificación
  const providers = [
    {
      name: 'Nominatim',
      url: (query: string) => `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=3&addressdetails=1&countrycodes=CO`,
      headers: { 'User-Agent': 'FoodShare/1.0 (foodshare-app@example.com)' }
    },
    {
      name: 'OpenCage',
      url: (query: string) => `https://api.opencagedata.com/geocode/v1/json?q=${query}&key=demo&limit=1`,
      headers: {} as Record<string, string>
    }
  ];

  for (const provider of providers) {
    try {
      const result = await tryGeocodingProvider(searchQuery, provider);
      if (result) {
        console.log(`Geocoding exitoso con ${provider.name} para "${searchQuery}":`, { lat: result.lat, lng: result.lng });
        return result;
      }
    } catch (error) {
      console.warn(`Geocoding: Error con ${provider.name}:`, error instanceof Error ? error.message : String(error));
      continue;
    }
  }

  // Fallback: coordenadas aproximadas para ciudades colombianas conocidas
  const fallbackCoords = getFallbackCoordinates(searchQuery);
  if (fallbackCoords) {
    console.log(`Geocoding: Usando fallback para "${searchQuery}":`, fallbackCoords);
    return fallbackCoords;
  }

  console.warn(`Geocoding: No se encontraron coordenadas para "${searchQuery}"`);
  return null;
}

async function tryGeocodingProvider(query: string, provider: { name: string; url: (q: string) => string; headers: Record<string, string> }): Promise<{ lat: number; lng: number } | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const encoded = encodeURIComponent(query);
    const response = await fetch(provider.url(encoded), {
      signal: controller.signal,
      headers: provider.headers
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    let results = [];

    if (provider.name === 'Nominatim') {
      results = data;
    } else if (provider.name === 'OpenCage') {
      results = data.results || [];
    }

    if (!Array.isArray(results) || results.length === 0) {
      return null;
    }

    // Buscar resultado más relevante
    let bestResult = results[0];
    const colombianResult = results.find((result: any) => 
      result.address?.country_code === 'co' || 
      result.display_name?.toLowerCase().includes('colombia') ||
      result.display_name?.toLowerCase().includes('popayán') ||
      result.display_name?.toLowerCase().includes('popayan') ||
      result.formatted?.toLowerCase().includes('colombia')
    );

    if (colombianResult) {
      bestResult = colombianResult;
    }

    let lat, lng;
    if (provider.name === 'Nominatim') {
      lat = Number(bestResult.lat);
      lng = Number(bestResult.lon);
    } else {
      lat = Number(bestResult.geometry?.lat);
      lng = Number(bestResult.geometry?.lng);
    }

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return null;
    }

    return { lat, lng };

  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

function getFallbackCoordinates(query: string): { lat: number; lng: number } | null {
  const cityCoords: Record<string, { lat: number; lng: number }> = {
    'popayán': { lat: 2.4448, lng: -76.6147 },
    'popayan': { lat: 2.4448, lng: -76.6147 },
    'cali': { lat: 3.4516, lng: -76.5319 },
    'bogotá': { lat: 4.7110, lng: -74.0721 },
    'bogota': { lat: 4.7110, lng: -74.0721 },
    'medellín': { lat: 6.2442, lng: -75.5812 },
    'medellin': { lat: 6.2442, lng: -75.5812 }
  };

  const lowerQuery = query.toLowerCase();
  for (const [city, coords] of Object.entries(cityCoords)) {
    if (lowerQuery.includes(city)) {
      return coords;
    }
  }

  return null;
}
