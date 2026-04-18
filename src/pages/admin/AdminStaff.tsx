import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../../context/StoreContext";
import {
  fetchAdminStaff,
  createAdminStaff,
  deleteAdminStaff,
  updateStaffPermissions,
  ADMIN_PERMISSION_KEYS,
  ADMIN_PERMISSION_LABELS,
} from "../../services/adminService";
import { Button } from "../../components/ui/Button";
import {
  ArrowLeft,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

function emptyPerms() {
  const o: Record<string, boolean> = {};
  ADMIN_PERMISSION_KEYS.forEach((k) => {
    o[k] = false;
  });
  return o;
}

// ─── Inline feedback banner ──────────────────────────────────────────────────
function Banner({
  type,
  message,
  onClose,
}: {
  type: "error" | "success";
  message: string;
  onClose: () => void;
}) {
  const isError = type === "error";
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${
        isError
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {isError ? (
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
      ) : (
        <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
      )}
      <span className="flex-1">{message}</span>
      <button
        type="button"
        className="ml-auto font-bold leading-none opacity-60 hover:opacity-100"
        onClick={onClose}
      >
        ×
      </button>
    </div>
  );
}

// ─── PermissionEditor ─────────────────────────────────────────────────────────
function PermissionEditor({
  staffId,
  initial,
  authToken,
  onSaved,
}: {
  staffId: string;
  initial: Record<string, boolean>;
  authToken: string;
  onSaved: () => void;
}) {
  const [perm, setPerm] = useState(() => {
    const o = emptyPerms();
    ADMIN_PERMISSION_KEYS.forEach((k) => {
      if (initial[k]) o[k] = true;
    });
    return o;
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "error" | "success";
    msg: string;
  } | null>(null);

  const save = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      await updateStaffPermissions(staffId, authToken, perm);
      setFeedback({
        type: "success",
        msg: "Permisos guardados correctamente.",
      });
      onSaved();
    } catch (e: any) {
      setFeedback({
        type: "error",
        msg: e.message || "No se pudieron guardar los permisos.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
      <p className="text-xs font-medium text-gray-600">Permisos delegados</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
        {ADMIN_PERMISSION_KEYS.map((k) => (
          <label key={k} className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={perm[k]}
              onChange={(e) =>
                setPerm((p) => ({ ...p, [k]: e.target.checked }))
              }
            />
            {ADMIN_PERMISSION_LABELS[k]}
          </label>
        ))}
      </div>

      {feedback && (
        <Banner
          type={feedback.type}
          message={feedback.msg}
          onClose={() => setFeedback(null)}
        />
      )}

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-1"
        disabled={saving}
        onClick={save}
      >
        {saving ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin mr-1" /> Guardando…
          </>
        ) : (
          "Guardar permisos"
        )}
      </Button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminStaff() {
  const { authToken, currentUser } = useStore();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [listErr, setListErr] = useState("");

  // Create-form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [permForm, setPermForm] = useState(() => emptyPerms());
  const [creating, setCreating] = useState(false);
  const [createFeedback, setCreateFeedback] = useState<{
    type: "error" | "success";
    msg: string;
  } | null>(null);

  // Per-row delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    setListErr("");
    try {
      const data = await fetchAdminStaff(authToken);
      setRows(data);
    } catch (e: any) {
      setListErr(e.message || "Error al cargar el equipo de administración.");
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    void load();
  }, [load]);

  if (currentUser?.role !== "super_admin") {
    return (
      <div className="space-y-4">
        <Link
          to="/admin"
          className="text-sm text-emerald-600 hover:underline flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
        <p className="text-gray-600 text-sm">
          Solo el super administrador puede gestionar el equipo.
        </p>
      </div>
    );
  }

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    setCreating(true);
    setCreateFeedback(null);
    try {
      await createAdminStaff(authToken, {
        name,
        email,
        password,
        permissions: permForm,
      });
      setName("");
      setEmail("");
      setPassword("");
      setPermForm(emptyPerms());
      setCreateFeedback({
        type: "success",
        msg: `Administrador delegado "${name}" creado correctamente.`,
      });
      await load();
    } catch (e: any) {
      setCreateFeedback({
        type: "error",
        msg: e.message || "No se pudo crear el administrador.",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, adminEmail: string) => {
    if (!authToken) return;
    if (
      !window.confirm(
        `¿Eliminar administrador ${adminEmail}? Esta acción no se puede deshacer.`,
      )
    )
      return;

    setDeletingId(id);
    setDeleteErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    try {
      await deleteAdminStaff(id, authToken);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      setDeleteErrors((prev) => ({
        ...prev,
        [id]: e.message || "Error al eliminar.",
      }));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          to="/admin"
          className="text-sm text-emerald-600 hover:underline flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          Equipo de administración
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Crea administradores delegados y configura sus permisos. No pueden
          crear otros super administradores.
        </p>
      </div>

      {listErr && (
        <Banner type="error" message={listErr} onClose={() => setListErr("")} />
      )}

      {/* Create form */}
      <form
        onSubmit={create}
        className="rounded-xl border border-gray-200 bg-white p-6 space-y-4 max-w-lg shadow-sm"
      >
        <h2 className="font-semibold text-gray-900">
          Nuevo administrador delegado
        </h2>

        <input
          className="w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          placeholder="Nombre completo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          type="password"
          placeholder="Contraseña inicial"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-gray-700">
            Permisos
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {ADMIN_PERMISSION_KEYS.map((k) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={permForm[k]}
                  onChange={(e) =>
                    setPermForm((p) => ({ ...p, [k]: e.target.checked }))
                  }
                />
                {ADMIN_PERMISSION_LABELS[k]}
              </label>
            ))}
          </div>
        </fieldset>

        {createFeedback && (
          <Banner
            type={createFeedback.type}
            message={createFeedback.msg}
            onClose={() => setCreateFeedback(null)}
          />
        )}

        <Button type="submit" disabled={creating}>
          {creating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Creando…
            </>
          ) : (
            "Crear administrador"
          )}
        </Button>
      </form>

      {/* Existing staff list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Cuentas existentes</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
          >
            {loading ? "Cargando…" : "Actualizar"}
          </Button>
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm">Cargando…</p>
        ) : rows.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No hay cuentas de administración registradas.
          </p>
        ) : (
          <div className="space-y-4">
            {rows.map((r) => (
              <div
                key={r.id}
                className={`rounded-lg border border-gray-200 bg-white p-4 text-sm shadow-sm transition-opacity ${
                  deletingId === r.id ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900">
                      {r.name}{" "}
                      <span className="text-gray-500 font-normal">
                        ({r.email})
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Rol:{" "}
                      <span
                        className={`font-medium ${
                          r.role === "super_admin"
                            ? "text-emerald-600"
                            : "text-blue-600"
                        }`}
                      >
                        {r.role === "super_admin"
                          ? "Super administrador"
                          : "Administrador delegado"}
                      </span>
                    </p>
                  </div>

                  {/* Delete button — only for delegated admins that aren't the current user */}
                  {r.role === "admin" && r.id !== currentUser?.id && (
                    <button
                      type="button"
                      disabled={deletingId === r.id}
                      className={`rounded p-1.5 transition-colors ${
                        deletingId === r.id
                          ? "text-gray-300 cursor-not-allowed"
                          : "text-red-500 hover:text-red-700 hover:bg-red-50"
                      }`}
                      title={`Eliminar ${r.email}`}
                      onClick={() => void handleDelete(r.id, r.email)}
                    >
                      {deletingId === r.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>

                {/* Per-row delete error */}
                {deleteErrors[r.id] && (
                  <div className="mt-2">
                    <Banner
                      type="error"
                      message={deleteErrors[r.id]}
                      onClose={() =>
                        setDeleteErrors((prev) => {
                          const next = { ...prev };
                          delete next[r.id];
                          return next;
                        })
                      }
                    />
                  </div>
                )}

                {/* Permission editor — only for delegated admins */}
                {r.role === "admin" && (
                  <PermissionEditor
                    key={r.id}
                    staffId={r.id}
                    initial={r.adminPermissions || {}}
                    authToken={authToken!}
                    onSaved={load}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
