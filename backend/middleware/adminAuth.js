const { hasPermission } = require("../lib/adminPermissions");

async function loadAdminUser(db, userId) {
  const [rows] = await db.execute(
    "SELECT id, email, name, role, admin_permissions FROM users WHERE id = ?",
    [userId],
  );
  return rows[0] || null;
}

function requireAdmin() {
  return async (req, res, next) => {
    try {
      const u = await loadAdminUser(req.db, req.user.id);
      if (!u || !["super_admin", "admin"].includes(u.role)) {
        return res
          .status(403)
          .json({ error: "Acceso restringido a administradores" });
      }
      req.adminUser = u;
      next();
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Error verificando permisos" });
    }
  };
}

function requireSuperAdmin() {
  return async (req, res, next) => {
    try {
      // Reusar req.adminUser si ya fue cargado por requireAdmin()
      const u = req.adminUser || (await loadAdminUser(req.db, req.user.id));
      if (!u || u.role !== "super_admin") {
        return res
          .status(403)
          .json({
            error: "Solo el super administrador puede realizar esta acción",
          });
      }
      req.adminUser = u;
      next();
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Error verificando permisos" });
    }
  };
}

function requirePerm(key) {
  return async (req, res, next) => {
    try {
      // Reusar req.adminUser si ya fue cargado por requireAdmin() para evitar
      // una segunda query a la DB por cada request.
      const u = req.adminUser || (await loadAdminUser(req.db, req.user.id));
      if (!u || !["super_admin", "admin"].includes(u.role)) {
        return res
          .status(403)
          .json({ error: "Acceso restringido a administradores" });
      }
      if (!hasPermission(u, key)) {
        return res.status(403).json({ error: `Permiso requerido: ${key}` });
      }
      req.adminUser = u;
      next();
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Error verificando permisos" });
    }
  };
}

module.exports = {
  loadAdminUser,
  requireAdmin,
  requireSuperAdmin,
  requirePerm,
};
