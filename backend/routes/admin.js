const express = require("express");
const bcrypt = require("bcrypt");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const { authenticateToken } = require("../middleware/auth");
const {
  requireAdmin,
  requireSuperAdmin,
  requirePerm,
} = require("../middleware/adminAuth");
const {
  sanitizePermissions,
  parsePermissions,
} = require("../lib/adminPermissions");
const { insertCertificate } = require("../lib/certificates");

const router = express.Router();

router.use((req, res, next) => {
  req.db = req.app.locals.db;
  next();
});

router.use(authenticateToken, requireAdmin());

function donationImageAbs(imageUrl) {
  if (
    !imageUrl ||
    typeof imageUrl !== "string" ||
    !imageUrl.startsWith("/uploads/donations/")
  )
    return null;
  return path.join(__dirname, "..", imageUrl.replace(/^\//, ""));
}

// --- Usuarios ---
router.get("/users", requirePerm("view_users"), async (req, res) => {
  try {
    const [rows] = await req.db.execute(
      "SELECT id, name, email, role, created_at, admin_permissions FROM users ORDER BY created_at DESC",
    );
    const safe = rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      role: r.role,
      createdAt: r.created_at,
      adminPermissions:
        r.role === "admin" ? parsePermissions(r.admin_permissions) : null,
    }));
    res.json(safe);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error listando usuarios" });
  }
});

router.delete("/users/:id", requirePerm("delete_users"), async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) {
      return res
        .status(400)
        .json({ error: "No puedes eliminar tu propia cuenta" });
    }
    const [target] = await req.db.execute(
      "SELECT role FROM users WHERE id = ?",
      [id],
    );
    if (target.length === 0)
      return res.status(404).json({ error: "Usuario no encontrado" });
    if (
      target[0].role === "super_admin" &&
      req.adminUser.role !== "super_admin"
    ) {
      return res
        .status(403)
        .json({
          error: "Solo el super administrador puede eliminar cuentas super",
        });
    }
    if (target[0].role === "super_admin") {
      const [cnt] = await req.db.execute(
        "SELECT COUNT(*) as c FROM users WHERE role = 'super_admin'",
      );
      if (cnt[0].c <= 1) {
        return res
          .status(400)
          .json({ error: "No se puede eliminar el único super administrador" });
      }
    }
    await req.db.execute("DELETE FROM users WHERE id = ?", [id]);
    res.json({ message: "Usuario eliminado" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error eliminando usuario" });
  }
});

// --- Mensajes / conversaciones ---
router.get("/messages", requirePerm("view_messages"), async (req, res) => {
  try {
    const [rows] = await req.db.execute(`
      SELECT m.*, us.name as sender_name, ur.name as receiver_name, d.title as donation_title
      FROM messages m
      JOIN users us ON m.sender_id = us.id
      JOIN users ur ON m.receiver_id = ur.id
      LEFT JOIN donations d ON m.donation_id = d.id
      ORDER BY (m.donation_id IS NULL) ASC, m.donation_id ASC, m.timestamp ASC
      LIMIT 500
    `);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error listando mensajes" });
  }
});

router.delete(
  "/messages/by-donation/:donationId",
  requirePerm("delete_messages"),
  async (req, res) => {
    try {
      const { donationId } = req.params;
      if (!donationId || donationId === "null" || donationId === "undefined") {
        return res.status(400).json({ error: "ID de donación inválido" });
      }
      const [r] = await req.db.execute(
        "DELETE FROM messages WHERE donation_id = ?",
        [donationId],
      );
      res.json({
        message: `Eliminados ${r.affectedRows} mensajes de esta donación`,
        deleted: r.affectedRows,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Error eliminando mensajes" });
    }
  },
);

router.delete(
  "/messages/:id",
  requirePerm("delete_messages"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const [r] = await req.db.execute("DELETE FROM messages WHERE id = ?", [
        id,
      ]);
      if (r.affectedRows === 0)
        return res.status(404).json({ error: "Mensaje no encontrado" });
      res.json({ message: "Mensaje eliminado" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Error eliminando mensaje" });
    }
  },
);

// --- Donaciones ---
router.get("/donations", requirePerm("view_donations"), async (req, res) => {
  try {
    const [rows] = await req.db.execute(`
      SELECT d.*, u.name as donor_name, cu.name as claimed_by_name
      FROM donations d
      JOIN users u ON d.donor_id = u.id
      LEFT JOIN users cu ON d.claimed_by = cu.id
      ORDER BY d.created_at DESC
    `);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error listando donaciones" });
  }
});

router.delete(
  "/donations/:id",
  requirePerm("delete_donations"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const [donations] = await req.db.execute(
        "SELECT image_url FROM donations WHERE id = ?",
        [id],
      );
      if (donations.length === 0)
        return res.status(404).json({ error: "Donación no encontrada" });
      const abs = donationImageAbs(donations[0].image_url);
      if (abs) fs.unlink(abs, () => {});
      await req.db.execute("DELETE FROM donations WHERE id = ?", [id]);
      res.json({ message: "Donación eliminada" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Error eliminando donación" });
    }
  },
);

// --- Certificados ---
router.get(
  "/cert-user-options",
  requirePerm("issue_certificates"),
  async (req, res) => {
    try {
      const [rows] = await req.db.execute(
        `SELECT id, name, email, role FROM users WHERE role IN ('donor','ngo','volunteer') ORDER BY name ASC`,
      );
      res.json(rows);
    } catch (e) {
      console.error(e);
      res
        .status(500)
        .json({ error: "Error listando usuarios para certificado" });
    }
  },
);

router.get(
  "/certificates",
  requirePerm("view_certificates"),
  async (req, res) => {
    try {
      const [rows] = await req.db.execute(`
      SELECT c.*, u.name as user_name, u.email as user_email, u.role as user_role, d.title as donation_title
      FROM certificates c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN donations d ON c.donation_id = d.id
      ORDER BY (c.donation_id IS NULL) ASC, c.donation_id ASC, c.created_at DESC
    `);
      res.json(rows);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Error listando certificados" });
    }
  },
);

router.post(
  "/certificates",
  requirePerm("issue_certificates"),
  async (req, res) => {
    try {
      const { userId, title, body, donationId } = req.body;
      const uid = userId && String(userId).trim();
      const ttl = title && String(title).trim();
      if (!uid || !ttl) {
        return res
          .status(400)
          .json({ error: "userId y title son obligatorios" });
      }
      const [u] = await req.db.execute(
        "SELECT id, role FROM users WHERE id = ?",
        [uid],
      );
      if (u.length === 0)
        return res.status(404).json({ error: "Usuario no encontrado" });
      if (!["donor", "ngo", "volunteer"].includes(u[0].role)) {
        return res
          .status(400)
          .json({
            error:
              "Solo se pueden emitir certificados a donadores, ONG o voluntarios",
          });
      }

      let donationFk = null;
      if (donationId != null && String(donationId).trim() !== "") {
        donationFk = String(donationId).trim();
        const [d] = await req.db.execute(
          "SELECT id FROM donations WHERE id = ?",
          [donationFk],
        );
        if (d.length === 0) {
          return res
            .status(400)
            .json({
              error:
                "El ID de donación no existe. Déjalo vacío o usa un UUID válido.",
            });
        }
      }

      const id = await insertCertificate(req.db, {
        userId: uid,
        title: ttl.slice(0, 255),
        body: body != null ? String(body) : "",
        donationId: donationFk,
      });
      res.status(201).json({ id, message: "Certificado creado" });
    } catch (e) {
      console.error(e);
      const fk = e.errno === 1452 || e.code === "ER_NO_REFERENCED_ROW_2";
      res.status(500).json({
        error: fk
          ? "Referencia inválida: comprueba el usuario y el ID de donación."
          : "Error creando certificado",
      });
    }
  },
);

router.delete(
  "/certificates/:id",
  requirePerm("delete_certificates"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const [r] = await req.db.execute(
        "DELETE FROM certificates WHERE id = ?",
        [id],
      );
      if (r.affectedRows === 0)
        return res.status(404).json({ error: "Certificado no encontrado" });
      res.json({ message: "Certificado eliminado" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Error eliminando certificado" });
    }
  },
);

// --- Sub-administradores (solo super_admin) ---
router.get("/staff", requireSuperAdmin(), async (req, res) => {
  try {
    const [rows] = await req.db.execute(
      "SELECT id, name, email, role, admin_permissions, created_at FROM users WHERE role IN ('admin','super_admin') ORDER BY created_at ASC",
    );
    res.json(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        role: r.role,
        adminPermissions:
          r.role === "admin" ? parsePermissions(r.admin_permissions) : null,
        createdAt: r.created_at,
      })),
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error listando administradores" });
  }
});

router.post("/staff", requireSuperAdmin(), async (req, res) => {
  try {
    const { name, email, password, permissions } = req.body;
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Nombre, email y contraseña son obligatorios" });
    }
    const [existing] = await req.db.execute(
      "SELECT id FROM users WHERE email = ?",
      [email],
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: "El email ya está registrado" });
    }
    const perms = sanitizePermissions(permissions);
    const hash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    await req.db.execute(
      "INSERT INTO users (id, name, email, password_hash, role, admin_permissions) VALUES (?, ?, ?, ?, ?, ?)",
      [id, name, email, hash, "admin", JSON.stringify(perms)],
    );
    res.status(201).json({
      message: "Administrador creado",
      user: { id, name, email, role: "admin", adminPermissions: perms },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error creando administrador" });
  }
});

router.patch(
  "/staff/:id/permissions",
  requireSuperAdmin(),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { permissions } = req.body;
      if (id === req.user.id) {
        return res
          .status(400)
          .json({
            error: "No puedes modificar tus propios permisos de esta forma",
          });
      }
      const [rows] = await req.db.execute(
        "SELECT role FROM users WHERE id = ?",
        [id],
      );
      if (rows.length === 0)
        return res.status(404).json({ error: "Usuario no encontrado" });
      if (rows[0].role !== "admin") {
        return res
          .status(400)
          .json({
            error:
              "Solo se pueden editar permisos de administradores delegados",
          });
      }
      const perms = sanitizePermissions(permissions);
      await req.db.execute(
        "UPDATE users SET admin_permissions = ? WHERE id = ?",
        [JSON.stringify(perms), id],
      );
      res.json({ message: "Permisos actualizados", adminPermissions: perms });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Error actualizando permisos" });
    }
  },
);

/** Limpieza masiva (solo super_admin): mensajes, certificados por antigüedad, certificados vencidos, donaciones archivadas. */
router.post("/maintenance/prune", requireSuperAdmin(), async (req, res) => {
  try {
    const body = req.body || {};
    const deleteExpiredCertificates = body.deleteExpiredCertificates !== false;
    const messagesOlderThanDays =
      body.messagesOlderThanDays != null && body.messagesOlderThanDays !== ""
        ? Math.min(3650, Math.max(0, Number(body.messagesOlderThanDays)))
        : null;
    const certificatesOlderThanDays =
      body.certificatesOlderThanDays != null &&
      body.certificatesOlderThanDays !== ""
        ? Math.min(3650, Math.max(0, Number(body.certificatesOlderThanDays)))
        : null;
    const donationsOlderThanDays =
      body.donationsOlderThanDays != null && body.donationsOlderThanDays !== ""
        ? Math.min(3650, Math.max(0, Number(body.donationsOlderThanDays)))
        : null;

    const deleted = {
      expiredCertificates: 0,
      messages: 0,
      certificatesByAge: 0,
      donations: 0,
    };

    if (deleteExpiredCertificates) {
      const [r] = await req.db.execute(`
        DELETE FROM certificates
        WHERE expires_at IS NOT NULL AND expires_at < UTC_TIMESTAMP()
      `);
      deleted.expiredCertificates = r.affectedRows;
    }

    if (messagesOlderThanDays && messagesOlderThanDays > 0) {
      const [r] = await req.db.execute(
        `DELETE FROM messages WHERE timestamp < DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY)`,
        [messagesOlderThanDays],
      );
      deleted.messages = r.affectedRows;
    }

    if (certificatesOlderThanDays && certificatesOlderThanDays > 0) {
      const [r] = await req.db.execute(
        `DELETE FROM certificates WHERE created_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY)`,
        [certificatesOlderThanDays],
      );
      deleted.certificatesByAge = r.affectedRows;
    }

    if (donationsOlderThanDays && donationsOlderThanDays > 0) {
      // Usar created_at: la columna updated_at puede no existir en BDs antiguas
      const [oldDons] = await req.db.execute(
        `SELECT id, image_url FROM donations
         WHERE status IN ('delivered', 'cancelled', 'expired')
           AND created_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY)`,
        [donationsOlderThanDays],
      );
      if (oldDons.length > 0) {
        // Eliminar imágenes en disco
        for (const d of oldDons) {
          const abs = donationImageAbs(d.image_url);
          if (abs) fs.unlink(abs, () => {});
        }
        // Borrar todos en un solo DELETE (más eficiente y atómico)
        const ids = oldDons.map((d) => d.id);
        const placeholders = ids.map(() => "?").join(", ");
        const [delResult] = await req.db.execute(
          `DELETE FROM donations WHERE id IN (${placeholders})`,
          ids,
        );
        deleted.donations = delResult.affectedRows;
      }
    }

    res.json({ message: "Mantenimiento aplicado", deleted });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error en mantenimiento" });
  }
});

router.delete("/staff/:id", requireSuperAdmin(), async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) {
      return res.status(400).json({ error: "No puedes eliminarte a ti mismo" });
    }
    const [rows] = await req.db.execute("SELECT role FROM users WHERE id = ?", [
      id,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ error: "Usuario no encontrado" });
    if (rows[0].role === "super_admin") {
      const [cnt] = await req.db.execute(
        "SELECT COUNT(*) as c FROM users WHERE role = 'super_admin'",
      );
      if (cnt[0].c <= 1) {
        return res
          .status(400)
          .json({ error: "No se puede eliminar el único super administrador" });
      }
    }
    if (rows[0].role !== "admin" && rows[0].role !== "super_admin") {
      return res
        .status(400)
        .json({ error: "Solo se pueden eliminar cuentas de administración" });
    }
    await req.db.execute("DELETE FROM users WHERE id = ?", [id]);
    res.json({ message: "Cuenta de administrador eliminada" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error eliminando administrador" });
  }
});

module.exports = router;
