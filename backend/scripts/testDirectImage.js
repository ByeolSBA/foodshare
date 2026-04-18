const http = require('http');

// Probar acceso directo a una imagen específica
function testDirectImageAccess() {
  const imageUrl = '/uploads/donations/100fb270-ae64-4de3-9ffc-6d4dfa1ea968.png';
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: imageUrl,
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Content-Type: ${res.headers['content-type']}`);
    console.log(`Content-Length: ${res.headers['content-length']}`);
    
    if (res.statusCode === 200) {
      console.log('SUCCESS: La imagen se sirve correctamente');
      console.log('URL completa:', `http://localhost:3001${imageUrl}`);
    } else {
      console.log('FAILED: La imagen no se sirve');
    }
  });

  req.on('error', (err) => {
    console.error('ERROR:', err.message);
  });

  req.end();
}

testDirectImageAccess();
