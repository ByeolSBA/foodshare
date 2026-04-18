const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { streamCertificatePdf } = require('../lib/certificatePdf');

const router = express.Router();

router.use((req, res, next) => {
  req.db = req.app.locals.db;
  next();
});

// Certificados emitidos al usuario actual
router.get('/mine', authenticateToken, async (req, res) => {
  try {
    const [rows] = await req.db.execute(
      `SELECT c.id, c.title, c.body, c.donation_id, c.created_at, c.expires_at, u.role as user_role, u.name as recipient_name
       FROM certificates c
       JOIN users u ON c.user_id = u.id
       WHERE c.user_id = ?
       ORDER BY c.created_at DESC`,
      [req.user.id],
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error cargando certificados' });
  }
});

// Descarga PDF (dueño del certificado o administrador)
router.get('/:id/pdf', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (id === 'mine') {
      return res.status(400).json({ error: 'Ruta inválida' });
    }
    const [rows] = await req.db.execute(
      `SELECT c.*, u.name as recipient_name FROM certificates c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [id],
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Certificado no encontrado' });
    }
    const cert = rows[0];
    const isOwner = String(cert.user_id) === String(req.user.id);
    if (!isOwner) {
      const [adm] = await req.db.execute('SELECT role FROM users WHERE id = ?', [req.user.id]);
      const role = adm[0]?.role;
      if (!['super_admin', 'admin'].includes(role)) {
        return res.status(403).json({ error: 'No autorizado' });
      }
    }
    streamCertificatePdf(res, cert);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error generando PDF' });
    }
  }
});

module.exports = router;
