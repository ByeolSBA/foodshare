const http = require('http');

// Probar si el servidor está sirviendo imágenes correctamente
function testImageServing() {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/uploads/donations/test-image.svg',
    method: 'HEAD'
  };

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    if (res.statusCode === 200) {
      console.log('SUCCESS: El servidor está sirviendo imágenes correctamente');
    } else {
      console.log('FAILED: El servidor no está sirviendo imágenes');
    }
  });

  req.on('error', (err) => {
    console.error('ERROR: No se pudo conectar al servidor:', err.message);
    console.log('Asegúrate de que el servidor backend esté corriendo en http://localhost:3001');
  });

  req.end();
}

testImageServing();
