const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Middleware para pasar db
router.use((req, res, next) => {
  req.db = req.app.locals.db;
  next();
});

// Enviar mensaje
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { receiverId, content, donationId } = req.body;

    if (!receiverId || !content || !donationId) {
      return res.status(400).json({ error: 'Receptor, contenido y donationId requeridos' });
    }

    // Verificar que el receptor existe
    const [receivers] = await req.db.execute('SELECT id FROM users WHERE id = ?', [receiverId]);
    if (receivers.length === 0) {
      return res.status(404).json({ error: 'Usuario receptor no encontrado' });
    }

    // Verificar que la donación existe y que el usuario está involucrado
    const [donations] = await req.db.execute(
      'SELECT id FROM donations WHERE id = ? AND (donor_id = ? OR claimed_by = ? OR transported_by = ?)',
      [donationId, req.user.id, req.user.id, req.user.id]
    );
    if (donations.length === 0) {
      return res.status(404).json({ error: 'Donación no encontrada o usuario no autorizado' });
    }

    const messageId = uuidv4();
    await req.db.execute(
      'INSERT INTO messages (id, sender_id, receiver_id, donation_id, content) VALUES (?, ?, ?, ?, ?)',
      [messageId, req.user.id, receiverId, donationId, content]
    );

    res.status(201).json({
      message: 'Mensaje enviado exitosamente',
      messageId
    });
  } catch (error) {
    console.error('Error enviando mensaje:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener mensajes (conversación con un usuario y donación)
router.get('/conversation/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { donationId } = req.query;

    if (!donationId) {
      return res.status(400).json({ error: 'donationId es requerido para cargar una conversación específica' });
    }

    const query = `
      SELECT m.*, u_sender.name as sender_name, u_receiver.name as receiver_name
      FROM messages m
      JOIN users u_sender ON m.sender_id = u_sender.id
      JOIN users u_receiver ON m.receiver_id = u_receiver.id
      WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
        AND m.donation_id = ?
      ORDER BY m.timestamp ASC
    `;
    const params = [req.user.id, userId, userId, req.user.id, donationId];

    const [messages] = await req.db.execute(query, params);
    res.json(messages);
  } catch (error) {
    console.error('Error obteniendo mensajes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener lista de conversaciones (último mensaje por usuario)
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT m.*, u_sender.name as sender_name, u_receiver.name as receiver_name
      FROM messages m
      JOIN users u_sender ON m.sender_id = u_sender.id
      JOIN users u_receiver ON m.receiver_id = u_receiver.id
      WHERE m.sender_id = ? OR m.receiver_id = ?
      ORDER BY m.timestamp DESC
    `;

    const [messages] = await req.db.execute(query, [req.user.id, req.user.id]);
    const conversationsMap = new Map();

    messages.forEach((message) => {
      const otherUserId = message.sender_id === req.user.id ? message.receiver_id : message.sender_id;
      const otherUserName = message.sender_id === req.user.id ? message.receiver_name : message.sender_name;

      if (!conversationsMap.has(otherUserId)) {
        conversationsMap.set(otherUserId, {
          other_user_id: otherUserId,
          other_user_name: otherUserName,
          last_message: message.content,
          last_timestamp: message.timestamp,
        });
      }
    });

    res.json(Array.from(conversationsMap.values()));
  } catch (error) {
    console.error('Error obteniendo conversaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;