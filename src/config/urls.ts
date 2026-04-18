// Configuración dinámica de URLs para desarrollo y producción

export const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
};

export const getServerOrigin = (): string => {
  const apiBase = getApiBaseUrl();
  return apiBase.replace('/api', '');
};

export const getSocketUrl = (): string => {
  return getServerOrigin();
};

export const getImageUrl = (imagePath: string): string => {
  if (!imagePath) return '';
  
  // Si es una URL externa, devolverla tal cual
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // Si es una ruta relativa, construir URL completa
  if (imagePath.startsWith('/')) {
    return `${getServerOrigin()}${imagePath}`;
  }
  
  // Si es solo un nombre de archivo, asumir que es para /images/donations/
  return `${getServerOrigin()}/images/donations/${imagePath}`;
};
