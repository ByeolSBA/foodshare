const PERMISSION_KEYS = [
  'view_users',
  'delete_users',
  'view_messages',
  'delete_messages',
  'view_donations',
  'delete_donations',
  'view_certificates',
  'delete_certificates',
  'issue_certificates',
];

function parsePermissions(raw) {
  if (!raw) return {};
  if (typeof raw === 'object' && raw !== null && !Buffer.isBuffer(raw)) return { ...raw };
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return {};
}

function hasPermission(dbUser, key) {
  if (!dbUser) return false;
  if (dbUser.role === 'super_admin') return true;
  if (dbUser.role !== 'admin') return false;
  const p = parsePermissions(dbUser.admin_permissions);
  return p[key] === true;
}

function sanitizePermissions(input) {
  const out = {};
  const src = typeof input === 'object' && input !== null ? input : {};
  for (const k of PERMISSION_KEYS) {
    out[k] = src[k] === true;
  }
  return out;
}

module.exports = {
  PERMISSION_KEYS,
  parsePermissions,
  hasPermission,
  sanitizePermissions,
};
