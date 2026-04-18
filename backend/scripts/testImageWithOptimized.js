const http = require('http');

// Probar acceso a imágenes con el servidor optimizado
function testImageWithOptimizedServer() {
  const imageUrl = '/uploads/donations/100fb270-ae64-4de3-9ffc-6d4dfa1ea968.png';
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: imageUrl,
    method: 'GET',
    headers: {
      'Origin': 'http://localhost:5173',
      'Referer': 'http://localhost:5173'
    }
  };

  console.log('Probando acceso a imagen con headers CORS...');

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    if (res.statusCode === 200) {
      console.log('SUCCESS: La imagen se sirve correctamente');
    } else {
      console.log('FAILED: La imagen no se sirve');
    }
  });

  req.on('error', (err) => {
    console.error('ERROR:', err.message);
  });

  req.end();
}

testImageWithOptimizedServer();
