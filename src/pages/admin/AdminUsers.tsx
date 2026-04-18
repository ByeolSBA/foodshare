import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../../context/StoreContext";
import { adminCan } from "../../utils/adminAccess";
import { fetchAdminUsers, deleteAdminUser } from "../../services/adminService";
import { Button } from "../../components/ui/Button";
import { ArrowLeft, Trash2, AlertCircle, Loader2 } from "lucide-react";

type Row = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
};

const ROLE_ES: Record<string, string> = {
  donor: "Donador",
  ngo: "ONG",
  volunteer: "Voluntario",
  admin: "Administrador",
  super_admin: "Super Admin",
};

const ROLE_COLORS: Record<string, string> = {
  donor: "bg-blue-100 text-blue-700",
  ngo: "bg-emerald-100 text-emerald-700",
  volunteer: "bg-purple-100 text-purple-700",
  admin: "bg-amber-100 text-amber-700",
  super_admin: "bg-red-100 text-red-700",
};

export default function AdminUsers() {
  const { authToken, currentUser } = useStore();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    setErr("");
    try {
      const data = await fetchAdminUsers(authToken);
      setRows(data);
    } catch (e: any) {
      setErr(e.message || "Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async (id: string, email: string) => {
    if (!authToken) return;
    if (
      !window.confirm(
        `¿Eliminar al usuario ${email}?\nSe borrarán todos sus datos asociados (donaciones, mensajes, certificados). Esta acción no se puede deshacer.`,
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
      await deleteAdminUser(id, authToken);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      const errorMsg = e.message || "Error al eliminar el usuario";
      setDeleteErrors((prev) => ({ ...prev, [id]: errorMsg }));
      setErr(`Error eliminando usuario: ${errorMsg}`);
    } finally {
      setDeletingId(null);
    }
  };

  const canDel = adminCan(currentUser, "delete_users");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/admin"
            className="text-sm text-emerald-600 hover:underline flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al panel
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Usuarios</h1>
          <p className="text-sm text-gray-500 mt-1">
            {rows.length > 0 && !loading
              ? `${rows.length} usuario${rows.length !== 1 ? "s" : ""} registrado${rows.length !== 1 ? "s" : ""}`
              : "Gestiona las cuentas de usuario de la plataforma"}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? "Cargando…" : "Actualizar"}
        </Button>
      </div>

      {/* Error global */}
      {err && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{err}</span>
          <button
            type="button"
            className="ml-auto text-red-400 hover:text-red-600 font-bold leading-none"
            onClick={() => setErr("")}
          >
            ×
          </button>
        </div>
      )}

      {/* Sin permiso de borrar */}
      {!canDel && !loading && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Puedes <strong>ver</strong> usuarios, pero no eliminarlos. Pide al
          super administrador que te habilite el permiso{" "}
          <code>delete_users</code>.
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Cargando…</p>
      ) : rows.length === 0 ? (
        <p className="text-gray-500 text-sm">No hay usuarios registrados.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Registrado</th>
                {canDel && (
                  <th className="px-4 py-3 w-20 text-center">Acción</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => {
                const isSelf = r.id === currentUser?.id;
                const isDeletingThis = deletingId === r.id;
                return (
                  <tr
                    key={r.id}
                    className={`transition-colors ${
                      isDeletingThis
                        ? "opacity-50 bg-gray-50"
                        : "hover:bg-gray-50/50"
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {r.name}
                      {isSelf && (
                        <span className="ml-2 text-xs text-gray-400 font-normal">
                          (tú)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          ROLE_COLORS[r.role] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {ROLE_ES[r.role] ?? r.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {r.createdAt
                        ? new Date(r.createdAt).toLocaleDateString()
                        : "—"}
                    </td>
                    {canDel && (
                      <td className="px-4 py-3 text-center">
                        {deleteErrors[r.id] && (
                          <p className="text-xs text-red-600 mb-1 flex items-center gap-1 justify-center">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            {deleteErrors[r.id]}
                          </p>
                        )}
                        {!isSelf ? (
                          <button
                            type="button"
                            disabled={isDeletingThis}
                            className={`inline-flex items-center justify-center rounded p-1.5 transition-colors ${
                              isDeletingThis
                                ? "text-gray-300 cursor-not-allowed"
                                : "text-red-500 hover:text-red-700 hover:bg-red-50"
                            }`}
                            title={`Eliminar "${r.email}"`}
                            onClick={() => void handleDelete(r.id, r.email)}
                          >
                            {isDeletingThis ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        ) : (
                          <span
                            className="text-xs text-gray-400"
                            title="No puedes eliminarte a ti mismo"
                          >
                            —
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
