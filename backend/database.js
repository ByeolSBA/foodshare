// Conexión a base de datos limpia para Railway + Render
const mysql = require('mysql2/promise');

// Función de conexión limpia para producción
async function connectDB() {
  try {
    // Solo usar dotenv en desarrollo
    if (process.env.NODE_ENV !== 'production') {
      require("dotenv").config();
    }

    // Validar que MYSQL_PUBLIC_URL exista en producción
    if (process.env.NODE_ENV === 'production' && !process.env.MYSQL_PUBLIC_URL) {
      throw new Error('MYSQL_PUBLIC_URL es requerida en producción');
    }

    // Crear pool usando MYSQL_PUBLIC_URL de Railway
    const pool = mysql.createPool(process.env.MYSQL_PUBLIC_URL);

    // Validar conexión con prueba simple
    const [rows] = await pool.execute("SELECT 1 as test");
    
    if (rows && rows[0]?.test === 1) {
      console.log("Conexión a MySQL validada exitosamente");
      return pool;
    } else {
      throw new Error('Prueba de conexión falló');
    }

  } catch (error) {
    console.error("Error conectando a la base de datos:", error.message);
    
    if (process.env.NODE_ENV === 'production') {
      console.error("Variables de entorno disponibles:");
      console.error("MYSQL_PUBLIC_URL:", process.env.MYSQL_PUBLIC_URL ? 'SET' : 'NOT SET');
      console.error("NODE_ENV:", process.env.NODE_ENV);
    }
    
    process.exit(1);
  }
}

// Exportar para uso en server.js
module.exports = { connectDB };
