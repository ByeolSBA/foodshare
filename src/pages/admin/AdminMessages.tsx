import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../../context/StoreContext";
import { adminCan } from "../../utils/adminAccess";
import {
  fetchAdminMessages,
  deleteAdminMessage,
} from "../../services/adminService";
import { Button } from "../../components/ui/Button";
import { ArrowLeft, Trash2, AlertCircle, ChevronDown } from "lucide-react";

type MsgRow = {
  id: string;
  sender_name: string;
  receiver_name: string;
  donation_id?: string | null;
  donation_title?: string | null;
  content: string;
  timestamp: string;
};

export default function AdminMessages() {
  const { authToken, currentUser } = useStore();
  const [rows, setRows] = useState<MsgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});
  const [expandedConversations, setExpandedConversations] = useState<
    Set<string>
  >(new Set());

  const load = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    setErr("");
    try {
      const data = await fetchAdminMessages(authToken);
      setRows(data as MsgRow[]);
    } catch (e: any) {
      setErr(e.message || "Error cargando mensajes");
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => {
    const m = new Map<string, MsgRow[]>();
    for (const row of rows) {
      const users = [row.sender_name, row.receiver_name].sort();
      const k = `${users[0]} ↔ ${users[1]}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(row);
    }
    for (const [, msgs] of m.entries()) {
      msgs.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
    }
    return [...m.entries()];
  }, [rows]);

  const toggleConversation = (convKey: string) => {
    setExpandedConversations((prev) => {
      const next = new Set(prev);
      if (next.has(convKey)) {
        next.delete(convKey);
      } else {
        next.add(convKey);
      }
      return next;
    });
  };

  const handleDelete = async (msgId: string) => {
    if (!authToken) return;
    if (
      !window.confirm(
        "¿Eliminar este mensaje? Esta acción no se puede deshacer.",
      )
    )
      return;

    setDeletingId(msgId);
    setDeleteErrors((prev) => {
      const next = { ...prev };
      delete next[msgId];
      return next;
    });

    try {
      await deleteAdminMessage(msgId, authToken);
      // Actualizar estado local inmediatamente sin esperar al reload
      setRows((prev) => prev.filter((r) => r.id !== msgId));
    } catch (e: any) {
      const errorMsg = e.message || "Error al eliminar el mensaje";
      setDeleteErrors((prev) => ({ ...prev, [msgId]: errorMsg }));
      // También mostrar en el error global para que sea visible aunque el mensaje esté colapsado
      setErr(`Error eliminando mensaje: ${errorMsg}`);
    } finally {
      setDeletingId(null);
    }
  };

  const canDel = adminCan(currentUser, "delete_messages");

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
            Mensajes (conversaciones)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Mensajes agrupados por conversación. Haz clic para expandir y ver el
            historial.
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

      {/* Sin permiso */}
      {!canDel && !loading && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Tienes permiso de <strong>ver</strong> mensajes, pero no de
          eliminarlos. Pide al super administrador que te habilite el permiso{" "}
          <code>delete_messages</code>.
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Cargando…</p>
      ) : groups.length === 0 ? (
        <p className="text-gray-500 text-sm">No hay mensajes registrados.</p>
      ) : (
        <div className="space-y-3">
          {groups.map(([convKey, msgs]) => {
            const isExpanded = expandedConversations.has(convKey);
            // Último mensaje (ya ordenados ASC, así que el último es el más reciente)
            const lastMsg = msgs[msgs.length - 1];

            return (
              <section
                key={convKey}
                className="border border-gray-200 rounded-lg overflow-hidden shadow-sm"
              >
                {/* Cabecera colapsable */}
                <button
                  type="button"
                  onClick={() => toggleConversation(convKey)}
                  className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
                >
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">
                      {convKey}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {msgs.length} mensaje{msgs.length !== 1 ? "s" : ""} ·
                      Último: {new Date(lastMsg.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Lista de mensajes */}
                {isExpanded && (
                  <div className="border-t border-gray-200 divide-y divide-gray-100 max-h-96 overflow-y-auto">
                    {msgs.map((m) => (
                      <div key={m.id} className="px-4 py-3 bg-white text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {/* Participantes */}
                            <div className="flex flex-wrap items-center gap-1 mb-1">
                              <span className="font-medium text-gray-900">
                                {m.sender_name}
                              </span>
                              <span className="text-gray-400 text-xs">→</span>
                              <span className="text-gray-700">
                                {m.receiver_name}
                              </span>
                              {m.donation_title && (
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                  {m.donation_title}
                                </span>
                              )}
                            </div>
                            {/* Fecha */}
                            <p className="text-xs text-gray-400 mb-1">
                              {new Date(m.timestamp).toLocaleString()}
                            </p>
                            {/* Contenido */}
                            <p className="text-gray-700 break-words">
                              {m.content}
                            </p>
                            {/* Error inline por mensaje */}
                            {deleteErrors[m.id] && (
                              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3 shrink-0" />
                                {deleteErrors[m.id]}
                              </p>
                            )}
                          </div>

                          {/* Botón eliminar */}
                          {canDel && (
                            <button
                              type="button"
                              disabled={deletingId === m.id}
                              className={`shrink-0 rounded p-1 transition-colors ${
                                deletingId === m.id
                                  ? "text-gray-300 cursor-not-allowed"
                                  : "text-red-500 hover:text-red-700 hover:bg-red-50"
                              }`}
                              title="Eliminar mensaje"
                              onClick={() => void handleDelete(m.id)}
                            >
                              {deletingId === m.id ? (
                                <span className="text-xs text-gray-400">…</span>
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
