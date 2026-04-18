const mysql = require('mysql2/promise');
const { geocodeAddress } = require('../src/services/donationService');

async function validateAndFixCoordinates() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456789',
    database: process.env.DB_NAME || 'foodshare',
    port: process.env.DB_PORT || 3306
  };

  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log('Conectado a la base de datos');

    // 1. Buscar donaciones sin coordenadas o con coordenadas inválidas
    const [donations] = await connection.execute(
      `SELECT id, title, location, latitude, longitude 
       FROM donations 
       WHERE latitude IS NULL OR longitude IS NULL OR 
             latitude = 0 OR longitude = 0 OR 
             latitude < -90 OR latitude > 90 OR 
             longitude < -180 OR longitude > 180`
    );

    console.log(`\n=== DONACIONES SIN COORDENADAS VÁLIDAS (${donations.length}) ===`);

    if (donations.length === 0) {
      console.log('Todas las donaciones tienen coordenadas válidas');
      await connection.end();
      return;
    }

    // 2. Intentar geocodificar cada dirección
    for (const donation of donations) {
      console.log(`\nProcesando: "${donation.title}" - "${donation.location}"`);
      
      try {
        const coords = await geocodeAddress(donation.location);
        
        if (coords) {
          // Actualizar coordenadas en la base de datos
          await connection.execute(
            `UPDATE donations SET latitude = ?, longitude = ? WHERE id = ?`,
            [coords.lat, coords.lng, donation.id]
          );
          console.log(`  SUCCESS: Coordenadas actualizadas - Lat: ${coords.lat}, Lng: ${coords.lng}`);
        } else {
          console.log(`  FAILED: No se pudieron geocodificar las coordenadas`);
          
          // Asignar coordenadas por defecto basadas en la ciudad
          const defaultCoords = getDefaultCoordinates(donation.location);
          if (defaultCoords) {
            await connection.execute(
              `UPDATE donations SET latitude = ?, longitude = ? WHERE id = ?`,
              [defaultCoords.lat, defaultCoords.lng, donation.id]
            );
            console.log(`  FALLBACK: Coordenadas por defecto asignadas - Lat: ${defaultCoords.lat}, Lng: ${defaultCoords.lng}`);
          }
        }
      } catch (error) {
        console.log(`  ERROR: ${error.message}`);
      }
    }

    // 3. Verificación final
    const [invalidAfter] = await connection.execute(
      `SELECT COUNT(*) as count FROM donations 
       WHERE latitude IS NULL OR longitude IS NULL OR 
             latitude = 0 OR longitude = 0 OR 
             latitude < -90 OR latitude > 90 OR 
             longitude < -180 OR longitude > 180`
    );

    console.log(`\n=== RESULTADO FINAL ===`);
    console.log(`Donaciones con coordenadas inválidas después del proceso: ${invalidAfter[0].count}`);
    console.log(`Donaciones procesadas: ${donations.length}`);

    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

function getDefaultCoordinates(location) {
  const cityCoords = {
    'popayán': { lat: 2.4448, lng: -76.6147 },
    'popayan': { lat: 2.4448, lng: -76.6147 },
    'cali': { lat: 3.4516, lng: -76.5319 },
    'bogotá': { lat: 4.7110, lng: -74.0721 },
    'bogota': { lat: 4.7110, lng: -74.0721 },
    'medellín': { lat: 6.2442, lng: -75.5812 },
    'medellin': { lat: 6.2442, lng: -75.5812 }
  };

  const lowerLocation = location.toLowerCase();
  for (const [city, coords] of Object.entries(cityCoords)) {
    if (lowerLocation.includes(city)) {
      return coords;
    }
  }

  // Coordenadas por defecto: centro de Colombia
  return { lat: 4.5709, lng: -74.2973 };
}

// Función de geocodificación simplificada para el script
async function geocodeAddress(address) {
  if (!address || address.trim().length < 3) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    let searchQuery = address.trim();
    if (!searchQuery.toLowerCase().includes('colombia')) {
      searchQuery += ', Colombia';
    }

    const encoded = encodeURIComponent(searchQuery);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1&addressdetails=1&countrycodes=CO`,
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

    const result = results[0];
    const lat = Number(result.lat);
    const lng = Number(result.lon);

    if (isNaN(lat) || isNaN(lng)) {
      return null;
    }

    return { lat, lng };

  } catch (error) {
    return null;
  }
}

validateAndFixCoordinates();
