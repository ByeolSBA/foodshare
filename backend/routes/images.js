const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Endpoint específico para imágenes con CORS garantizado
router.get('/donations/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../uploads/donations', filename);
  
  // Verificar si el archivo existe
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Image not found' });
  }
  
  // Configurar CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  
  // Determinar el content-type basado en la extensión
  const ext = path.extname(filename).toLowerCase();
  const contentTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml'
  };
  
  const contentType = contentTypes[ext] || 'image/jpeg';
  res.contentType(contentType);
  
  // Enviar el archivo
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error sending image:', err);
      res.status(500).json({ error: 'Error serving image' });
    }
  });
});

module.exports = router;
