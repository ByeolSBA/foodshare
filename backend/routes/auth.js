const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { parsePermissions } = require('../lib/adminPermissions');

const router = express.Router();

function publicUser(row) {
  let adminPermissions = null;
  if (row.role === 'admin' && row.admin_permissions != null) {
    adminPermissions = parsePermissions(row.admin_permissions);
  }
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatar: row.avatar,
    location: row.location,
    adminPermissions,
  };
}

// Middleware para pasar db a las rutas
router.use((req, res, next) => {
  req.db = req.app.locals.db;
  next();
});

// Registro
router.post('/register', async (req, res) => {
  try {
    if (!req.db) {
      console.error('Auth route missing req.db');
      return res.status(500).json({ error: 'Database connection missing in auth route' });
    }

    const { name, email, password, role } = req.body;

    // Validar datos
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    if (!['donor', 'ngo', 'volunteer'].includes(role)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    // Verificar si usuario existe
    const [existing] = await req.db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email ya registrado' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Crear usuario
    const userId = uuidv4();
    await req.db.execute(
      'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [userId, name, email, passwordHash, role]
    );

    const token = jwt.sign({ id: userId, email, role }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: { id: userId, name, email, role, adminPermissions: null },
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    // Buscar usuario
    const [users] = await req.db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = users[0];

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({
      message: 'Login exitoso',
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Perfil (requiere auth)
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const [users] = await req.db.execute(
      'SELECT id, name, email, role, avatar, location, admin_permissions FROM users WHERE id = ?',
      [req.user.id],
    );
    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(publicUser(users[0]));
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener usuario por ID (requiere auth)
router.get('/users/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [users] = await req.db.execute('SELECT id, name, email, role FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(users[0]);
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;