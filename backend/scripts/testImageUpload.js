const fs = require('fs');
const path = require('path');

// Crear una imagen de prueba simple (SVG)
const testImageContent = `
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect width="400" height="300" fill="#10B981"/>
  <text x="200" y="150" font-family="Arial" font-size="24" fill="white" text-anchor="middle">
    FoodShare Test
  </text>
  <circle cx="200" cy="100" r="30" fill="white"/>
  <path d="M200 70 L200 130 L170 100 Z" fill="#10B981"/>
</svg>
`;

const uploadsDir = path.join(__dirname, '..', 'uploads', 'donations');
const testImagePath = path.join(uploadsDir, 'test-image.svg');

// Crear directorio si no existe
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Directorio creado:', uploadsDir);
}

// Crear imagen de prueba
fs.writeFileSync(testImagePath, testImageContent.trim());
console.log('Imagen de prueba creada:', testImagePath);

// Verificar que se pueda leer
const stats = fs.statSync(testImagePath);
console.log('Tamaño:', stats.size, 'bytes');

// Probar URL que se generaría
const expectedUrl = '/uploads/donations/test-image.svg';
console.log('URL esperada en DB:', expectedUrl);
console.log('URL completa en frontend:', `http://localhost:3001${expectedUrl}`);
