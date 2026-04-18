const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { hasPermission } = require('../lib/adminPermissions');
const { createDeliveryCertificatesForDonation } = require('../lib/certificates');

const router = express.Router();

const donationsUploadDir = path.join(__dirname, '..', 'uploads', 'donations');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(donationsUploadDir, { recursive: true });
    cb(null, donationsUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const safeExt = allowed.includes(ext) ? ext : '.jpg';
    cb(null, `${uuidv4()}${safeExt}`);
  },
});

const imageUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes JPEG, PNG, GIF o WebP'));
    }
  },
});

// Middleware para pasar db
router.use((req, res, next) => {
  req.db = req.app.locals.db;
  next();
});

// Subir imagen de donación (archivo local → URL servida por este servidor)
router.post('/upload-image', authenticateToken, (req, res) => {
  if (req.user.role !== 'donor') {
    return res.status(403).json({ error: 'Solo donantes pueden subir imágenes' });
  }

  const handler = imageUpload.single('image');
  handler(req, res, (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'La imagen supera el tamaño máximo (10MB)'
          : err.message || 'Error al subir la imagen';
      return res.status(400).json({ error: message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No se envió ninguna imagen' });
    }
    res.status(201).json({ imageUrl: `/uploads/donations/${req.file.filename}` });
  });
});

// Crear donación (solo donors)
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'donor') {
      return res.status(403).json({ error: 'Solo donantes pueden crear donaciones' });
    }

    const { title, description, quantity, expirationDate, location, coordinates, imageUrl } = req.body;

    if (!title || !quantity || !expirationDate || !location) {
      return res.status(400).json({ error: 'Campos requeridos faltantes' });
    }

    const donationId = uuidv4();
    const query = `
      INSERT INTO donations (id, donor_id, title, description, quantity, expiration_date, location, latitude, longitude, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      donationId,
      req.user.id,
      title,
      description || '',
      quantity,
      expirationDate,
      location,
      coordinates?.lat || null,
      coordinates?.lng || null,
      imageUrl || null
    ];

    await req.db.execute(query, values);

    res.status(201).json({
      message: 'Donación creada exitosamente',
      donation: { id: donationId, ...req.body, status: 'available' }
    });
  } catch (error) {
    console.error('Error creando donación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener donaciones (filtradas por rol)
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT d.*, u.name as donor_name, cu.name as claimed_by_name
      FROM donations d
      JOIN users u ON d.donor_id = u.id
      LEFT JOIN users cu ON d.claimed_by = cu.id
    `;
    let params = [];

    if (req.user.role === 'ngo') {
      // Disponibles en el mapa + todas las que esta ONG reclamó (reserved, cancel_pending, etc.)
      query += ' WHERE (d.status = ?) OR (d.claimed_by = ?)';
      params.push('available', req.user.id);
    } else if (req.user.role === 'volunteer') {
      // Pool de reservadas sin transportista + las que este voluntario ya tomó
      query += ' WHERE (d.status = ? AND d.transported_by IS NULL) OR (d.transported_by = ?)';
      params.push('reserved', req.user.id);
    } else if (req.user.role === 'donor') {
      // Donors ven sus propias donaciones
      query += ' WHERE d.donor_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'super_admin') {
      query += ' WHERE 1=1';
    } else if (req.user.role === 'admin') {
      const [adm] = await req.db.execute(
        'SELECT id, role, admin_permissions FROM users WHERE id = ?',
        [req.user.id],
      );
      if (!adm.length || adm[0].role !== 'admin') {
        query += ' WHERE 1=0';
      } else if (!hasPermission(adm[0], 'view_donations')) {
        return res.json([]);
      } else {
        query += ' WHERE 1=1';
      }
    }

    query += ' ORDER BY d.created_at DESC';

    const [donations] = await req.db.execute(query, params);
    res.json(donations);
  } catch (error) {
    console.error('Error obteniendo donaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener solicitudes de ONG
router.get('/requests', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'ngo') {
      return res.status(403).json({ error: 'Solo ONGs pueden ver solicitudes' });
    }

    const [requests] = await req.db.execute(
      `SELECT d.*, u.name as donor_name FROM donations d JOIN users u ON d.donor_id = u.id WHERE d.claimed_by = ? ORDER BY d.created_at DESC`,
      [req.user.id]
    );

    res.json(requests);
  } catch (error) {
    console.error('Error obteniendo solicitudes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ========== RUTAS CON SUBPATHS (/:id/...) - DEBEN VENIR ANTES DE /:id ==========

// Reclamar donación (solo NGOs)
router.post('/:id/claim', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'ngo') {
      return res.status(403).json({ error: 'Solo ONGs pueden reclamar donaciones' });
    }

    const { id } = req.params;

    // Verificar que existe y está disponible
    const [donations] = await req.db.execute('SELECT * FROM donations WHERE id = ? AND status = ?', [id, 'available']);
    if (donations.length === 0) {
      return res.status(404).json({ error: 'Donación no encontrada o no disponible' });
    }

    // Actualizar status
    await req.db.execute('UPDATE donations SET status = ?, claimed_by = ? WHERE id = ?', ['reserved', req.user.id, id]);

    res.json({ message: 'Donación reclamada exitosamente' });
  } catch (error) {
    console.error('Error reclamando donación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Cancelar reclamación (solo NGO que reclamó)
router.delete('/:id/claim', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [donations] = await req.db.execute('SELECT * FROM donations WHERE id = ? AND claimed_by = ?', [id, req.user.id]);
    if (donations.length === 0) {
      return res.status(404).json({ error: 'Donación no encontrada o no autorizada' });
    }

    const donation = donations[0];
    if (donation.status !== 'reserved') {
      return res.status(400).json({ error: 'Solo se pueden cancelar donaciones reservadas' });
    }

    await req.db.execute('UPDATE donations SET status = ?, claimed_by = NULL WHERE id = ?', ['available', id]);

    res.json({ message: 'Reclamación cancelada exitosamente' });
  } catch (error) {
    console.error('Error cancelando reclamación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Aceptar transporte (solo volunteers)
router.post('/:id/transport', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'volunteer') {
      return res.status(403).json({ error: 'Solo voluntarios pueden transportar donaciones' });
    }

    const { id } = req.params;

    // Verificar que está reservada
    const [donations] = await req.db.execute('SELECT * FROM donations WHERE id = ? AND status = ?', [id, 'reserved']);
    if (donations.length === 0) {
      return res.status(404).json({ error: 'Donación no encontrada o no reservada' });
    }

    // Actualizar status
    await req.db.execute('UPDATE donations SET status = ?, transported_by = ? WHERE id = ?', ['collected', req.user.id, id]);

    res.json({ message: 'Transporte aceptado exitosamente' });
  } catch (error) {
    console.error('Error aceptando transporte:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Marcar como entregada (solo NGO que reclamó, sin transporte)
router.post('/:id/collect', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [donations] = await req.db.execute('SELECT * FROM donations WHERE id = ? AND claimed_by = ?', [id, req.user.id]);
    if (donations.length === 0) {
      return res.status(404).json({ error: 'Donación no encontrada o no autorizado' });
    }

    const donation = donations[0];
    if (donation.status !== 'reserved') {
      return res.status(400).json({ error: 'La donación debe estar reservada' });
    }

    await req.db.execute('UPDATE donations SET status = ? WHERE id = ?', ['collected', id]);

    res.json({ message: 'Donación recolectada exitosamente' });
  } catch (error) {
    console.error('Error recolectando donación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Marcar como entregada (volunteer o ONG que reclamó)
router.post('/:id/deliver', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    let donations;

    if (req.user.role === 'volunteer') {
      [donations] = await req.db.execute('SELECT * FROM donations WHERE id = ? AND transported_by = ?', [id, req.user.id]);
    } else if (req.user.role === 'ngo') {
      [donations] = await req.db.execute('SELECT * FROM donations WHERE id = ? AND claimed_by = ?', [id, req.user.id]);
    } else {
      return res.status(403).json({ error: 'Solo voluntarios u ONGs pueden marcar entrega' });
    }

    if (donations.length === 0) {
      return res.status(404).json({ error: 'Donación no encontrada o no autorizado' });
    }

    const donation = donations[0];
    if (req.user.role === 'volunteer') {
      if (donation.status !== 'collected') {
        return res.status(400).json({ error: 'La donación debe estar en estado recolectada para ser entregada' });
      }
    } else {
      if (!['reserved', 'collected'].includes(donation.status)) {
        return res.status(400).json({ error: 'La donación debe estar reservada o recolectada para que la ONG la entregue' });
      }
    }

    await req.db.execute('UPDATE donations SET status = ? WHERE id = ?', ['delivered', id]);

    const [rowsAfter] = await req.db.execute('SELECT * FROM donations WHERE id = ?', [id]);
    const after = rowsAfter[0];
    const already = Number(after?.delivery_certificates_issued) === 1;
    if (!already) {
      try {
        await createDeliveryCertificatesForDonation(req.db, after);
        await req.db.execute('UPDATE donations SET delivery_certificates_issued = 1 WHERE id = ?', [id]);
      } catch (certErr) {
        console.error('Certificados automáticos tras entrega:', certErr);
      }
    }

    res.json({ message: 'Donación entregada exitosamente' });
  } catch (error) {
    console.error('Error entregando donación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Solicitar cancelación de donación
router.post('/:id/request-cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Request cancel donation: id=${id}, user=${req.user.id}`);

    // Verificar que la donación existe y el usuario está involucrado
    const [donations] = await req.db.execute(
      'SELECT * FROM donations WHERE id = ? AND (donor_id = ? OR claimed_by = ?)',
      [id, req.user.id, req.user.id]
    );

    if (donations.length === 0) {
      console.log('Donation not found or user not authorized');
      return res.status(404).json({ error: 'Donación no encontrada o no autorizada' });
    }

    const donation = donations[0];
    console.log(`Current donation status: ${donation.status}`);

    // Solo se puede solicitar cancelación si está disponible o reservada
    if (!['available', 'reserved'].includes(donation.status)) {
      return res.status(400).json({ error: 'No se puede cancelar una donación en este estado' });
    }

    // Actualizar estado a cancel_pending
    console.log(`Updating donation status to cancel_pending`);
    await req.db.execute(
      'UPDATE donations SET status = ?, cancel_requested_by = ? WHERE id = ?',
      ['cancel_pending', req.user.id, id]
    );

    res.json({ message: 'Solicitud de cancelación enviada' });
  } catch (error) {
    console.error('Error solicitando cancelación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Aprobar cancelación de donación
router.post('/:id/approve-cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [donations] = await req.db.execute(
      'SELECT * FROM donations WHERE id = ? AND status = ? AND cancel_requested_by IS NOT NULL',
      [id, 'cancel_pending']
    );

    if (donations.length === 0) {
      return res.status(404).json({ error: 'No hay solicitud de cancelación pendiente' });
    }

    const donation = donations[0];

    // Verificar que el usuario que aprueba es la otra parte
    const isInvolved = donation.donor_id === req.user.id || donation.claimed_by === req.user.id;
    if (!isInvolved) {
      return res.status(403).json({ error: 'No autorizado para aprobar esta cancelación' });
    }

    // No puede ser el mismo que solicito
    if (donation.cancel_requested_by === req.user.id) {
      return res.status(400).json({ error: 'No puedes aprobar tu propia solicitud' });
    }

    // Cambiar estado a cancelled
    await req.db.execute(
      'UPDATE donations SET status = ?, cancel_requested_by = NULL WHERE id = ?',
      ['cancelled', id]
    );

    res.json({ message: 'Donación cancelada exitosamente' });
  } catch (error) {
    console.error('Error aprobando cancelación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Rechazar cancelación de donación
router.post('/:id/reject-cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [donations] = await req.db.execute(
      'SELECT * FROM donations WHERE id = ? AND status = ? AND cancel_requested_by IS NOT NULL',
      [id, 'cancel_pending']
    );

    if (donations.length === 0) {
      return res.status(404).json({ error: 'No hay solicitud de cancelación pendiente' });
    }

    const donation = donations[0];

    // Verificar que el usuario que rechaza es la otra parte
    const isInvolved = donation.donor_id === req.user.id || donation.claimed_by === req.user.id;
    if (!isInvolved) {
      return res.status(403).json({ error: 'No autorizado para rechazar esta cancelación' });
    }

    // No puede ser el mismo que solicito
    if (donation.cancel_requested_by === req.user.id) {
      return res.status(400).json({ error: 'No puedes rechazar tu propia solicitud' });
    }

    // Volver al estado anterior
    const previousStatus = donation.claimed_by ? 'reserved' : 'available';
    await req.db.execute(
      'UPDATE donations SET status = ?, cancel_requested_by = NULL WHERE id = ?',
      [previousStatus, id]
    );

    res.json({ message: 'Cancelación rechazada' });
  } catch (error) {
    console.error('Error rechazando cancelación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ========== RUTAS GENÉRICAS (/:id) - SIEMPRE AL FINAL ==========

// Editar donación (solo donor propietario y solo si está disponible)
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'donor') {
      return res.status(403).json({ error: 'Solo donantes pueden editar donaciones' });
    }

    const { id } = req.params;
    const { title, description, quantity, expirationDate, location, coordinates, imageUrl } = req.body;

    const [donations] = await req.db.execute('SELECT * FROM donations WHERE id = ? AND donor_id = ?', [id, req.user.id]);
    if (donations.length === 0) {
      return res.status(404).json({ error: 'Donación no encontrada' });
    }

    const donation = donations[0];
    if (donation.status !== 'available') {
      return res.status(400).json({ error: 'Solo se pueden editar donaciones disponibles' });
    }

    const nextImageUrl =
      imageUrl !== undefined && imageUrl !== null && String(imageUrl).trim() !== ''
        ? String(imageUrl).trim()
        : donation.image_url;

    const prevImg = donation.image_url;
    if (
      prevImg &&
      typeof prevImg === 'string' &&
      prevImg.startsWith('/uploads/donations/') &&
      prevImg !== nextImageUrl
    ) {
      fs.unlink(path.join(__dirname, '..', prevImg.replace(/^\//, '')), () => {});
    }

    await req.db.execute(
      `UPDATE donations SET title = ?, description = ?, quantity = ?, expiration_date = ?, location = ?, latitude = ?, longitude = ?, image_url = ? WHERE id = ?`,
      [
        title || donation.title,
        description || donation.description,
        quantity || donation.quantity,
        expirationDate || donation.expiration_date,
        location || donation.location,
        coordinates?.lat || donation.latitude,
        coordinates?.lng || donation.longitude,
        nextImageUrl,
        id,
      ]
    );

    res.json({ message: 'Donación actualizada exitosamente' });
  } catch (error) {
    console.error('Error actualizando donación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Cancelar donación (solo donor propietario y solo si está disponible)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'donor') {
      return res.status(403).json({ error: 'Solo donantes pueden cancelar donaciones' });
    }

    const { id } = req.params;
    const [donations] = await req.db.execute('SELECT * FROM donations WHERE id = ? AND donor_id = ?', [id, req.user.id]);
    if (donations.length === 0) {
      return res.status(404).json({ error: 'Donación no encontrada' });
    }

    const donation = donations[0];
    if (donation.status !== 'available') {
      return res.status(400).json({ error: 'Solo se pueden cancelar donaciones disponibles' });
    }

    const img = donation.image_url;
    if (img && typeof img === 'string' && img.startsWith('/uploads/donations/')) {
      const abs = path.join(__dirname, '..', img.replace(/^\//, ''));
      fs.unlink(abs, () => {});
    }

    await req.db.execute('DELETE FROM donations WHERE id = ?', [id]);
    res.json({ message: 'Donación cancelada exitosamente' });
  } catch (error) {
    console.error('Error cancelando donación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;