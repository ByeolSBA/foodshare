import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../../context/StoreContext";
import { adminCan } from "../../utils/adminAccess";
import {
  fetchAdminDonations,
  deleteAdminDonation,
} from "../../services/adminService";
import { Button } from "../../components/ui/Button";
import { ArrowLeft, Trash2, AlertCircle, Loader2 } from "lucide-react";

export default function AdminDonations() {
  const { authToken, currentUser } = useStore();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    setErr("");
    try {
      const data = await fetchAdminDonations(authToken);
      setRows(data);
    } catch (e: any) {
      setErr(e.message || "Error cargando donaciones");
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async (id: string, title: string) => {
    if (!authToken) return;
    if (
      !window.confirm(
        `¿Eliminar la donación "${title}"? Esta acción no se puede deshacer.`,
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
      await deleteAdminDonation(id, authToken);
      // Actualizar estado local inmediatamente, sin esperar al reload
      setRows((prev) => prev.filter((d) => d.id !== id));
    } catch (e: any) {
      const errorMsg = e.message || "Error al eliminar la donación";
      setDeleteErrors((prev) => ({ ...prev, [id]: errorMsg }));
      setErr(`Error eliminando donación: ${errorMsg}`);
    } finally {
      setDeletingId(null);
    }
  };

  const canDel = adminCan(currentUser, "delete_donations");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/admin"
            className="text-sm text-emerald-600 hover:underline flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            Donaciones y solicitudes
          </h1>
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

      {/* Sin permiso */}
      {!canDel && !loading && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Tienes permiso de <strong>ver</strong> donaciones, pero no de
          eliminarlas. Pide al super administrador que te habilite el permiso{" "}
          <code>delete_donations</code>.
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Cargando…</p>
      ) : rows.length === 0 ? (
        <p className="text-gray-500 text-sm">No hay donaciones registradas.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Donador</th>
                <th className="px-4 py-3">ONG</th>
                {canDel && (
                  <th className="px-4 py-3 w-20 text-center">Acción</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((d) => (
                <tr
                  key={d.id}
                  className={`transition-colors ${
                    deletingId === d.id
                      ? "opacity-50 bg-gray-50"
                      : "hover:bg-gray-50/50"
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {d.title}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        d.status === "available"
                          ? "bg-emerald-100 text-emerald-700"
                          : d.status === "delivered"
                            ? "bg-blue-100 text-blue-700"
                            : d.status === "cancelled"
                              ? "bg-red-100 text-red-700"
                              : d.status === "expired"
                                ? "bg-gray-100 text-gray-600"
                                : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{d.donor_name}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {d.claimed_by_name || (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  {canDel && (
                    <td className="px-4 py-3 text-center">
                      {deleteErrors[d.id] && (
                        <p className="text-xs text-red-600 mb-1 flex items-center gap-1 justify-center">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          {deleteErrors[d.id]}
                        </p>
                      )}
                      <button
                        type="button"
                        disabled={deletingId === d.id}
                        className={`inline-flex items-center justify-center rounded p-1.5 transition-colors ${
                          deletingId === d.id
                            ? "text-gray-300 cursor-not-allowed"
                            : "text-red-500 hover:text-red-700 hover:bg-red-50"
                        }`}
                        title={`Eliminar "${d.title}"`}
                        onClick={() => void handleDelete(d.id, d.title)}
                      >
                        {deletingId === d.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
