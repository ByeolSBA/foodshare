const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function checkImages() {
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

    // Verificar donaciones con imágenes
    const [donations] = await connection.execute(
      'SELECT id, title, image_url FROM donations WHERE image_url IS NOT NULL AND image_url != ""'
    );

    console.log(`\n=== DONACIONES CON IMÁGENES (${donations.length}) ===`);
    donations.forEach(donation => {
      console.log(`ID: ${donation.id}`);
      console.log(`Título: ${donation.title}`);
      console.log(`URL: ${donation.image_url}`);
      console.log('---');
    });

    // Verificar archivos físicos
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'donations');
    console.log(`\n=== ARCHIVOS FÍSICOS EN: ${uploadsDir} ===`);
    
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      console.log(`Archivos encontrados: ${files.length}`);
      files.forEach(file => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        console.log(`- ${file} (${stats.size} bytes)`);
      });
    } else {
      console.log('Directorio de uploads no existe');
    }

    // Verificar consistencia
    console.log('\n=== CONSISTENCIA ===');
    const donationsWithImages = donations.filter(d => d.image_url && d.image_url.includes('/uploads/donations/'));
    console.log(`Donaciones con URLs de imagen válidas: ${donationsWithImages.length}`);

    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkImages();
