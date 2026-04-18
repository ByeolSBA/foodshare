async function testGeocoding() {
  console.log('=== PRUEBA DE GEOCODIFICACIÓN ===\n');
  
  const testAddresses = [
    'Carrera 2 #2-50, Popayán Colombia',
    'Carrera 2 #2-50, Popayán',
    'Calle 5 #10-45, Popayán, Colombia',
    'Avenida 6 #15-89, Popayán'
  ];

  for (const address of testAddresses) {
    console.log(`Probando: "${address}"`);
    try {
      // Simular la función de geocodificación del backend
      const result = await geocodeAddress(address);
      if (result) {
        console.log(`  SUCCESS: Lat: ${result.lat}, Lng: ${result.lng}`);
      } else {
        console.log('  FAILED: No se encontraron coordenadas');
      }
    } catch (error) {
      console.log(`  ERROR: ${error.message}`);
    }
    console.log('---');
  }
}

// Función de geocodificación simplificada para pruebas
async function geocodeAddress(address) {
  if (!address || address.trim().length < 3) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    // Construir búsqueda con contexto
    let searchQuery = address.trim();
    
    // Si no menciona Colombia, agregarla
    if (!searchQuery.toLowerCase().includes('colombia')) {
      searchQuery += ', Colombia';
    }

    console.log(`  Buscando: "${searchQuery}"`);

    const encoded = encodeURIComponent(searchQuery);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=3&addressdetails=1&countrycodes=CO`,
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'FoodShare/1.0 (foodshare-app@example.com)'
        }
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const results = await response.json();

    if (!Array.isArray(results) || results.length === 0) {
      return null;
    }

    // Buscar resultado más relevante
    let bestResult = results[0];
    const colombianResult = results.find(result => 
      result.address?.country_code === 'co' || 
      result.display_name?.toLowerCase().includes('colombia') ||
      result.display_name?.toLowerCase().includes('popayán') ||
      result.display_name?.toLowerCase().includes('popayan')
    );

    if (colombianResult) {
      bestResult = colombianResult;
    }

    const lat = Number(bestResult.lat);
    const lng = Number(bestResult.lon);

    if (isNaN(lat) || isNaN(lng)) {
      return null;
    }

    console.log(`  Ubicación encontrada: ${bestResult.display_name}`);
    return { lat, lng };

  } catch (error) {
    console.error('  Error en geocodificación:', error.message);
    return null;
  }
}

testGeocoding();
