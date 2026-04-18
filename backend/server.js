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

// 📁 uploads
const uploadsRoot = path.join(__dirname, "uploads");
fs.mkdirSync(path.join(uploadsRoot, "donations"), { recursive: true });

// 🔐 Seguridad
app.use(
  helmet({
    contentSecurityPolicy: false, // evitar problemas en producción
  })
);

// 🚫 Rate limit
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
});

app.use("/api", limiter);

// 🌐 Middleware
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));

// 📂 Archivos estáticos
app.use(
  "/uploads",
  (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(uploadsRoot)
);

// 📌 Rutas
const imageRoutes = require("./routes/images");
app.use("/images", imageRoutes);

//
// 🔥 CONEXIÓN A MYSQL (CORREGIDA)
//

const pool = mysql.createPool(process.env.MYSQL_PUBLIC_URL);

// prueba de conexión
pool.getConnection()
  .then(() => console.log("✅ Conectado a MySQL 🚀"))
  .catch(err => {
    console.error("❌ Error conectando a DB:", err);
    process.exit(1);
  });

//
// 🧪 Ruta test
//
app.get("/", (req, res) => {
  res.send("API funcionando 🚀");
});

//
// 🚀 Iniciar servidor
//
server.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

let db; // será un Pool (mysql2/promise.createPool)

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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `;

  const createDonationsTable = `
    CREATE TABLE IF NOT EXISTS donations (
      id VARCHAR(36) PRIMARY KEY,
      donor_id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      quantity VARCHAR(255) NOT NULL,
      expiration_date DATE NOT NULL,
      location VARCHAR(255) NOT NULL,
      latitude DOUBLE NULL,
      longitude DOUBLE NULL,
      status ENUM('available', 'reserved', 'collected', 'delivered', 'expired', 'cancel_pending', 'cancelled') NOT NULL DEFAULT 'available',
      claimed_by VARCHAR(36),
      transported_by VARCHAR(36),
      cancel_requested_by VARCHAR(36),
      image_url VARCHAR(1024),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (claimed_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (transported_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (cancel_requested_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `;

  const createMessagesTable = `
    CREATE TABLE IF NOT EXISTS messages (
      id VARCHAR(36) PRIMARY KEY,
      sender_id VARCHAR(36) NOT NULL,
      receiver_id VARCHAR(36) NOT NULL,
      donation_id VARCHAR(36) NOT NULL,
      content TEXT NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (donation_id) REFERENCES donations(id) ON DELETE CASCADE
    )
  `;

  const createCertificatesTable = `
    CREATE TABLE IF NOT EXISTS certificates (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      body TEXT,
      donation_id VARCHAR(36),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (donation_id) REFERENCES donations(id) ON DELETE SET NULL
    )
  `;

  await db.execute(createUsersTable);
  await db.execute(createDonationsTable);
  await db.execute(createMessagesTable);
  await db.execute(createCertificatesTable);

  try {
    await db.execute(`
      ALTER TABLE users MODIFY COLUMN role ENUM(
        'donor','ngo','volunteer','super_admin','admin'
      ) NOT NULL
    `);
  } catch (error) {
    if (
      !String(error.message).includes("Duplicate") &&
      !String(error.message).includes("errno: 1265")
    ) {
      console.warn("Migración role enum:", error.message);
    }
  }

  try {
    await db.execute(
      "ALTER TABLE users ADD COLUMN admin_permissions JSON NULL",
    );
  } catch (error) {
    if (!String(error.message).includes("Duplicate column name")) {
      console.warn("Migración admin_permissions:", error.message);
    }
  }

  try {
    await db.execute(
      "ALTER TABLE donations ADD COLUMN delivery_certificates_issued TINYINT(1) NOT NULL DEFAULT 0",
    );
  } catch (error) {
    if (!String(error.message).includes("Duplicate column name")) {
      console.warn("Migración delivery_certificates_issued:", error.message);
    }
  }

  // Migrations: Agregar columna cancel_requested_by si no existe
  try {
    await db.execute(`
      ALTER TABLE donations
      ADD COLUMN cancel_requested_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL
    `);
  } catch (error) {
    if (!error.message.includes("Duplicate column name")) {
      console.error("Error en migración:", error.message);
    }
  }

  // Migrations: Agregar columna donation_id a mensajes si no existe
  try {
    await db.execute(`
      ALTER TABLE messages
      ADD COLUMN donation_id VARCHAR(36)
    `);
    await db.execute(`
      ALTER TABLE messages
      ADD CONSTRAINT fk_messages_donation_id FOREIGN KEY (donation_id) REFERENCES donations(id) ON DELETE CASCADE
    `);
  } catch (error) {
    if (
      !error.message.includes("Duplicate column name") &&
      !error.message.includes("errno: 1060")
    ) {
      console.error("Error en migración de mensajes:", error.message);
    }
  }

  try {
    await db.execute(
      "ALTER TABLE certificates ADD COLUMN expires_at TIMESTAMP NULL",
    );
  } catch (error) {
    if (!String(error.message).includes("Duplicate column name")) {
      console.warn("Migración certificates.expires_at:", error.message);
    }
  }

  try {
    await db.execute(`
      UPDATE certificates
      SET expires_at = DATE_ADD(created_at, INTERVAL 30 DAY)
      WHERE expires_at IS NULL
    `);
  } catch (error) {
    console.warn("Migración backfill expires_at certificados:", error.message);
  }

  try {
    const [r] = await db.execute(`
      DELETE FROM certificates
      WHERE expires_at IS NOT NULL AND expires_at < UTC_TIMESTAMP()
    `);
    if (r.affectedRows > 0) {
      console.log(
        `[FoodShare] Certificados caducados eliminados al iniciar: ${r.affectedRows}`,
      );
    }
  } catch (error) {
    console.warn("Limpieza inicial de certificados caducados:", error.message);
  }

  // Migrations: Actualizar ENUM de status si es necesario
  try {
    await db.execute(`
      ALTER TABLE donations
      MODIFY COLUMN status ENUM('available', 'reserved', 'collected', 'delivered', 'expired', 'cancel_pending', 'cancelled') NOT NULL DEFAULT 'available'
    `);
  } catch (error) {
    // ENUM ya está actualizado
    if (!error.message.includes("Syntax error")) {
      console.error("Error en migración de status:", error.message);
    }
  }

  // Migration: agregar donations.updated_at si no existe (la tabla puede haber
  // sido creada antes de que se añadiera esta columna al schema).
  try {
    await db.execute(`
      ALTER TABLE donations
      ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    `);
    // Backfill: asignar created_at como valor inicial para filas existentes.
    // Al especificar explícitamente el valor en el UPDATE, MySQL respeta el
    // valor asignado y no sobreescribe con CURRENT_TIMESTAMP.
    await db.execute(`UPDATE donations SET updated_at = created_at`);
    console.log("[FoodShare] Migración donations.updated_at completada");
  } catch (error) {
    if (!String(error.message).includes("Duplicate column name")) {
      console.warn("Migración donations.updated_at:", error.message);
    }
  }

  // Migration: agregar users.updated_at si no existe.
  try {
    await db.execute(`
      ALTER TABLE users
      ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    `);
    await db.execute(`UPDATE users SET updated_at = created_at`);
    console.log("[FoodShare] Migración users.updated_at completada");
  } catch (error) {
    if (!String(error.message).includes("Duplicate column name")) {
      console.warn("Migración users.updated_at:", error.message);
    }
  }
}

async function ensureSuperAdmin(connection) {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const name = process.env.SUPER_ADMIN_NAME || "Super administrador";
  if (!email || !password) {
    console.warn(
      "[FoodShare] Configura SUPER_ADMIN_EMAIL y SUPER_ADMIN_PASSWORD en backend/.env para crear el super administrador.",
    );
    return;
  }
  const [rows] = await connection.execute(
    "SELECT id, role FROM users WHERE email = ?",
    [email],
  );
  const hash = await bcrypt.hash(password, 10);
  if (rows.length === 0) {
    const id = uuidv4();
    await connection.execute(
      `INSERT INTO users (id, name, email, password_hash, role, admin_permissions) VALUES (?, ?, ?, ?, 'super_admin', NULL)`,
      [id, name, email, hash],
    );
    console.log("[FoodShare] Super administrador creado exitosamente");
    return;
  }
  if (process.env.SUPER_ADMIN_RESET_PASSWORD === "1") {
    await connection.execute(
      `UPDATE users SET role = 'super_admin', admin_permissions = NULL, password_hash = ? WHERE email = ?`,
      [hash, email],
    );
    console.log("[FoodShare] Contraseña de super administrador actualizada");
    return;
  }
  await connection.execute(
    `UPDATE users SET role = 'super_admin', admin_permissions = NULL WHERE email = ?`,
    [email],
  );
  console.log("[FoodShare] Rol de super administrador sincronizado");
}

async function connectDB() {
  try {
    // Usar pool en lugar de una sola conexión para soportar queries concurrentes
    // y reconexión automática ante caídas de la DB.
    db = mysql.createPool(process.env.MYSQL_PUBLIC_URL);

    // Verificar que la conexión funciona antes de continuar
    await db.execute("SELECT 1");
    console.log("Conectado a MariaDB (pool)");

    app.locals.db = db; // Hacer db disponible en rutas
    await initSchema();
    await ensureSuperAdmin(db);
    console.log("Esquema de base de datos inicializado");
  } catch (error) {
    console.error("Error conectando a DB:", error);
    process.exit(1);
  }
}

// Socket.io connection handling
const connectedUsers = new Map(); // userId -> socket.id
const voiceChannels = new Map(); // donationId -> Map<userId, { name }>
const voiceMonitors = new Map(); // donationId -> Set<socketId> (admin monitors, invisible)

function leaveAllVoiceChannels(userId, socket) {
  for (const [donationId, channel] of voiceChannels.entries()) {
    if (!channel.has(userId)) continue;
    channel.delete(userId);
    socket.leave(`voice_${donationId}`);
    if (channel.size === 0) {
      voiceChannels.delete(donationId);
    } else {
      const participants = [...channel.entries()].map(([id, info]) => ({
        id,
        name: info.name,
      }));
      io.to(`voice_${donationId}`).emit("voice:channel_update", {
        participants,
        donationId,
      });
      io.to(`voice_${donationId}`).emit("voice:peer_left", {
        peerId: userId,
        donationId,
      });
    }
  }
}

function removeFromAllMonitors(socketId) {
  for (const monitors of voiceMonitors.values()) {
    monitors.delete(socketId);
  }
}

io.on("connection", (socket) => {
  console.log(`Usuario conectado: ${socket.id}`);

  // Guardamos el userId autenticado por conexión (para señalización de voz)
  let socketUserId = null;

  // Usuario se autentica y se une a su room personal
  socket.on("authenticate", (userId) => {
    if (userId && typeof userId === "string") {
      socketUserId = userId;
      connectedUsers.set(userId, socket.id);
      socket.join(`user_${userId}`);
      console.log(`Usuario ${userId} autenticado y conectado`);
    }
  });

  // ── Canal de voz (estilo Discord) ───────────────────────────────────────
  // El audio va directo entre navegadores (P2P via WebRTC).
  // Socket.IO solo transporta los metadatos de señalización.

  // Unirse al canal de voz de una donación
  socket.on("voice:join", ({ donationId, userName }) => {
    if (!socketUserId) return;

    if (!voiceChannels.has(donationId))
      voiceChannels.set(donationId, new Map());
    const channel = voiceChannels.get(donationId);

    // Participantes que ya estaban antes de que entrara el nuevo
    const existingIds = [...channel.keys()].filter((id) => id !== socketUserId);

    // Registrar al nuevo participante
    channel.set(socketUserId, { name: userName || "Usuario" });

    // Unirse a la sala Socket.IO del canal
    socket.join(`voice_${donationId}`);

    // Notificar a todos (incluyendo al nuevo) la lista actualizada
    const participants = [...channel.entries()].map(([id, info]) => ({
      id,
      name: info.name,
    }));
    io.to(`voice_${donationId}`).emit("voice:channel_update", {
      participants,
      donationId,
    });

    // Decirle a cada participante existente que inicie WebRTC con el nuevo
    // Tell existing participants to initiate WebRTC to the new joiner
    for (const peerId of existingIds) {
      io.to(`user_${peerId}`).emit("voice:peer_joined", {
        peerId: socketUserId,
        peerName: userName || "Usuario",
        donationId,
      });
    }

    // Notify any admin monitors of the new joiner so they can connect to them
    for (const monitorSocketId of voiceMonitors.get(donationId) ?? []) {
      io.to(monitorSocketId).emit("voice:shadow_peer", {
        peerId: socketUserId,
        donationId,
      });
    }
  });

  // Salir del canal de voz
  socket.on("voice:leave", ({ donationId }) => {
    if (!socketUserId) return;
    const channel = voiceChannels.get(donationId);
    if (!channel) return;

    channel.delete(socketUserId);
    socket.leave(`voice_${donationId}`);

    if (channel.size === 0) {
      voiceChannels.delete(donationId);
    } else {
      const participants = [...channel.entries()].map(([id, info]) => ({
        id,
        name: info.name,
      }));
      io.to(`voice_${donationId}`).emit("voice:channel_update", {
        participants,
        donationId,
      });
      io.to(`voice_${donationId}`).emit("voice:peer_left", {
        peerId: socketUserId,
        donationId,
      });
    }

    // Tell admin monitors that this peer left
    for (const monitorSocketId of voiceMonitors.get(donationId) ?? []) {
      io.to(monitorSocketId).emit("voice:peer_left", {
        peerId: socketUserId,
        donationId,
      });
    }
  });

  // ── Admin monitoring (invisible / inaudible) ─────────────────────────────

  // Returns the list of all active voice channels (admin panel)
  socket.on("voice:list_channels", () => {
    const list = [];
    for (const [donationId, channel] of voiceChannels.entries()) {
      if (channel.size > 0) {
        list.push({
          donationId,
          participants: [...channel.entries()].map(([id, info]) => ({
            id,
            name: info.name,
          })),
        });
      }
    }
    socket.emit("voice:channels_list", list);
  });

  // Admin joins as silent monitor — NOT added to voiceChannels, invisible to others
  socket.on("voice:admin_monitor", ({ donationId }) => {
    if (!donationId) return;

    // Register this socket as a monitor for the channel
    if (!voiceMonitors.has(donationId))
      voiceMonitors.set(donationId, new Set());
    voiceMonitors.get(donationId).add(socket.id);

    const channel = voiceChannels.get(donationId);
    if (!channel || channel.size === 0) {
      // Channel exists but is empty — nothing to connect to yet
      socket.emit("voice:monitor_ready", { participants: [], donationId });
      return;
    }

    // Tell current participants to send their audio to the admin (shadow connection)
    // Participants handle voice:shadow_peer like voice:peer_joined but without
    // updating their visible participant list
    for (const [peerId] of channel.entries()) {
      io.to(`user_${peerId}`).emit("voice:shadow_peer", {
        peerId: socketUserId,
        donationId,
      });
    }

    const participants = [...channel.entries()].map(([id, info]) => ({
      id,
      name: info.name,
    }));
    socket.emit("voice:monitor_ready", { participants, donationId });
  });

  // Admin stops monitoring a channel
  socket.on("voice:monitor_leave", ({ donationId }) => {
    voiceMonitors.get(donationId)?.delete(socket.id);
    if (voiceMonitors.get(donationId)?.size === 0) {
      voiceMonitors.delete(donationId);
    }
  });

  // Consultar participantes del canal sin unirse (para mostrar en la UI antes de entrar)
  socket.on("voice:peek", ({ donationId }) => {
    if (!donationId) return;
    const channel = voiceChannels.get(donationId);
    const participants = channel
      ? [...channel.entries()].map(([id, info]) => ({ id, name: info.name }))
      : [];
    socket.emit("voice:channel_state", { participants, donationId });
  });

  // ── Señalización WebRTC (mensajero entre peers) ──────────────────────────

  // Oferta SDP
  socket.on("voice:offer", ({ to, offer, donationId }) => {
    if (!socketUserId || !to) return;
    io.to(`user_${to}`).emit("voice:offer", {
      from: socketUserId,
      offer,
      donationId,
    });
  });

  // Respuesta SDP
  socket.on("voice:answer", ({ to, answer, donationId }) => {
    if (!socketUserId || !to) return;
    io.to(`user_${to}`).emit("voice:answer", {
      from: socketUserId,
      answer,
      donationId,
    });
  });

  // Candidato ICE
  socket.on("voice:ice", ({ to, candidate, donationId }) => {
    if (!socketUserId || !to || !candidate) return;
    io.to(`user_${to}`).emit("voice:ice", {
      from: socketUserId,
      candidate,
      donationId,
    });
  });

  // ── Fin señalización WebRTC ──────────────────────────────────────────────

  // Usuario se desconecta
  socket.on("disconnect", () => {
    // Eliminar usuario de connectedUsers
    for (const [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        console.log(`Usuario ${userId} desconectado`);
        break;
      }
    }
    // Auto-salir de todos los canales de voz al desconectarse
    if (socketUserId) {
      leaveAllVoiceChannels(socketUserId, socket);
    }
    // Limpiar cualquier sesión de monitoreo activa
    removeFromAllMonitors(socket.id);
  });
});

// Hacer io disponible para las rutas
app.set("io", io);
app.set("connectedUsers", connectedUsers);

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/donations", require("./routes/donations"));
app.use("/api/messages", require("./routes/messages"));
app.use("/api/certificates", require("./routes/certificates"));
app.use("/api/admin", require("./routes/admin"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "FoodShare Backend is running" });
});

// 404 handler - SIEMPRE devolver JSON
app.use((req, res) => {
  console.warn(`Route not found: ${req.method} ${req.path}`);
  res
    .status(404)
    .json({ error: `Endpoint not found: ${req.method} ${req.path}` });
});

// Error handling - SIEMPRE devolver JSON
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || "Internal Server Error",
    path: req.path,
    method: req.method,
  });
});

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
  });

  setInterval(
    async () => {
      try {
        const conn = app.locals.db;
        if (!conn) return;
        const [r] = await conn.execute(`
        DELETE FROM certificates
        WHERE expires_at IS NOT NULL AND expires_at < UTC_TIMESTAMP()
      `);
        if (r.affectedRows > 0) {
          console.log(
            `[FoodShare] Certificados caducados eliminados (tarea diaria): ${r.affectedRows}`,
          );
        }
      } catch (e) {
        console.error(
          "[FoodShare] Error limpiando certificados caducados:",
          e.message || e,
        );
      }
    },
    24 * 60 * 60 * 1000,
  );
});
