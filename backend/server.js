require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const { createServer } = require("http");
const { Server } = require("socket.io");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:5173",
    ],
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
});

app.use("/api", limiter);

// Middleware
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:5173",
      "https://tu-app-render.onrender.com"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Origin", "X-Requested-With"],
  })
);

app.use(express.json({ limit: "10mb" }));

// Archivos estáticos
const uploadsRoot = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot, { recursive: true });
}

// Importar rutas existentes
const authRoutes = require('./routes/auth');
const donationRoutes = require('./routes/donations');
const userRoutes = require('./routes/users');

// Rutas de API (deben ir antes del catch-all del frontend)
app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/users', userRoutes);

// Servir frontend desde el mismo servidor
const frontendPath = path.join(__dirname, "../frontend/dist");
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  
  // Todas las rutas que no son API deben servir el index.html del frontend
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ error: "API endpoint not found" });
    }
    res.sendFile(path.join(frontendPath, "index.html"));
  });
} else {
  // Si no hay frontend build, servir solo las rutas de API
  app.use(
    "/uploads",
    (req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Cross-Origin-Resource-Policy", "cross-origin");
      next();
    },
    express.static(uploadsRoot)
  );
}

// Rutas de imágenes
const imageRoutes = require("./routes/images");
app.use("/images", imageRoutes);

// Conexión a base de datos limpia para producción
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

// Inicializar conexión
let pool;
connectDB().then(dbPool => {
  pool = dbPool;
  console.log("Base de datos conectada y lista");
  
  // Inicializar esquema después de conectar
  initSchema();
}).catch(err => {
  console.error("Error fatal en la base de datos:", err);
  process.exit(1);
});

// Exportar el pool para uso en rutas
global.dbPool = pool;

// Función para inicializar esquema
async function initSchema() {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('donor', 'ngo', 'volunteer') NOT NULL,
      avatar VARCHAR(1024),
      location VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createDonationsTable = `
    CREATE TABLE IF NOT EXISTS donations (
      id VARCHAR(36) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      quantity VARCHAR(255),
      expiration_date DATE NOT NULL,
      location VARCHAR(255) NOT NULL,
      coordinates POINT,
      image_url VARCHAR(1024),
      status ENUM('available', 'reserved', 'collected', 'delivered', 'expired', 'cancel_pending', 'cancelled') DEFAULT 'available',
      donor_id VARCHAR(36) NOT NULL,
      claimed_by VARCHAR(36),
      transported_by VARCHAR(36),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (claimed_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (transported_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `;

  const createMessagesTable = `
    CREATE TABLE IF NOT EXISTS messages (
      id VARCHAR(36) PRIMARY KEY,
      sender_id VARCHAR(36) NOT NULL,
      receiver_id VARCHAR(36) NOT NULL,
      donation_id VARCHAR(36),
      content TEXT NOT NULL,
      type ENUM('text', 'system', 'notification') DEFAULT 'text',
      read_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (donation_id) REFERENCES donations(id) ON DELETE CASCADE
    )
  `;

  const createCertificatesTable = `
    CREATE TABLE IF NOT EXISTS certificates (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      donation_id VARCHAR(36),
      type ENUM('donation', 'transport', 'volunteer') NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      issued_date DATE NOT NULL,
      pdf_url VARCHAR(1024),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (donation_id) REFERENCES donations(id) ON DELETE SET NULL
    )
  `;

  const createNotificationsTable = `
    CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      type ENUM('new_donation', 'donation_claimed', 'donation_collected', 'donation_delivered', 'message_received', 'certificate_issued') NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      related_id VARCHAR(36),
      read_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `;

  try {
    console.log('Creando tablas de la base de datos...');
    
    await pool.execute(createUsersTable);
    console.log('Tabla users creada');
    
    await pool.execute(createDonationsTable);
    console.log('Tabla donations creada');
    
    await pool.execute(createMessagesTable);
    console.log('Tabla messages creada');
    
    await pool.execute(createCertificatesTable);
    console.log('Tabla certificates creada');
    
    await pool.execute(createNotificationsTable);
    console.log('Tabla notifications creada');
    
    console.log("Esquema de base de datos inicializado correctamente");
  } catch (error) {
    console.error("Error inicializando esquema:", error);
    throw error;
  }
}

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    message: 'FoodShare API - Servidor funcionando',
    status: 'active',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      donations: '/api/donations',
      users: '/api/users'
    },
    timestamp: new Date().toISOString()
  });
});

// Rutas básicas
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


// Iniciar servidor
server.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
