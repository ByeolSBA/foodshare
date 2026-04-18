const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Middleware para pasar db
router.use((req, res, next) => {
  req.db = req.app.locals.db;
  next();
});

// Obtener lista de usuarios (para mensajes, etc.)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [users] = await req.db.execute('SELECT id, name, email, role FROM users WHERE id != ?', [req.user.id]);
    res.json(users);
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar perfil
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, location, avatar } = req.body;

    const updates = [];
    const values = [];

    if (name) {
      updates.push('name = ?');
      values.push(name);
    }
    if (location !== undefined) {
      updates.push('location = ?');
      values.push(location);
    }
    if (avatar !== undefined) {
      updates.push('avatar = ?');
      values.push(avatar);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    values.push(req.user.id);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    await req.db.execute(query, values);

    res.json({ message: 'Perfil actualizado exitosamente' });
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;