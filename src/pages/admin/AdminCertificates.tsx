import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../../context/StoreContext";
import { adminCan } from "../../utils/adminAccess";
import {
  fetchAdminCertificates,
  deleteAdminCertificate,
  createAdminCertificate,
  fetchCertUserOptions,
} from "../../services/adminService";
import { downloadCertificatePdf } from "../../services/certificateService";
import { CertificateCard } from "../../components/CertificateCard";
import { Button } from "../../components/ui/Button";
import {
  ArrowLeft,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
} from "lucide-react";

const ROLE_ES: Record<string, string> = {
  donor: "Donador",
  ngo: "ONG",
  volunteer: "Voluntario",
};

type CertRow = {
  id: string;
  title: string;
  body?: string | null;
  created_at: string;
  expires_at?: string | null;
  user_name: string;
  user_email: string;
  user_role?: string;
  donation_id?: string | null;
  donation_title?: string | null;
};

// ─── Inline feedback banner ───────────────────────────────────────────────────
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

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminCertificates() {
  const { authToken, currentUser } = useStore();

  const [rows, setRows] = useState<CertRow[]>([]);
  const [certUsers, setCertUsers] = useState<
    { id: string; name: string; email: string; role: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [listErr, setListErr] = useState("");

  // Issue-form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [userId, setUserId] = useState("");
  const [donationId, setDonationId] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [issueFeedback, setIssueFeedback] = useState<{
    type: "error" | "success";
    msg: string;
  } | null>(null);

  // Per-cert delete & PDF state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});
  const [pdfLoading, setPdfLoading] = useState<Record<string, boolean>>({});
  const [pdfErrors, setPdfErrors] = useState<Record<string, string>>({});

  // Expand/collapse groups
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    setListErr("");
    try {
      const data = await fetchAdminCertificates(authToken);
      setRows(data as CertRow[]);
      if (adminCan(currentUser, "issue_certificates")) {
        const opts = await fetchCertUserOptions(authToken);
        setCertUsers(opts);
      } else {
        setCertUsers([]);
      }
    } catch (e: any) {
      setListErr(e.message || "Error al cargar los certificados.");
    } finally {
      setLoading(false);
    }
  }, [authToken, currentUser]);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => {
    const m = new Map<string, CertRow[]>();
    for (const row of rows) {
      const k = `${row.user_name} (${row.user_email})`;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(row);
    }
    return [...m.entries()];
  }, [rows]);

  const toggleUser = (userKey: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userKey)) {
        next.delete(userKey);
      } else {
        next.add(userKey);
      }
      return next;
    });
  };

  const canDel = adminCan(currentUser, "delete_certificates");
  const canIssue = adminCan(currentUser, "issue_certificates");

  // ── Issue certificate ──────────────────────────────────────────────────────
  const submitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;

    if (!userId.trim() || !title.trim()) {
      setIssueFeedback({
        type: "error",
        msg: "Selecciona un usuario y escribe un título.",
      });
      return;
    }

    setIssuing(true);
    setIssueFeedback(null);

    try {
      await createAdminCertificate(authToken, {
        userId: userId.trim(),
        title: title.trim(),
        body: body.trim() || undefined,
        donationId: donationId.trim() || undefined,
      });
      setTitle("");
      setBody("");
      setDonationId("");
      setUserId("");
      setIssueFeedback({
        type: "success",
        msg: "Certificado creado correctamente.",
      });
      await load();
    } catch (e: any) {
      setIssueFeedback({
        type: "error",
        msg: e.message || "No se pudo crear el certificado.",
      });
    } finally {
      setIssuing(false);
    }
  };

  // ── Delete certificate ─────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!authToken) return;
    if (
      !window.confirm(
        "¿Eliminar este certificado? Esta acción no se puede deshacer.",
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
      await deleteAdminCertificate(id, authToken);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      setDeleteErrors((prev) => ({
        ...prev,
        [id]: e.message || "Error al eliminar el certificado.",
      }));
    } finally {
      setDeletingId(null);
    }
  };

  // ── Download PDF ───────────────────────────────────────────────────────────
  const handlePdf = async (id: string) => {
    if (!authToken) return;
    setPdfLoading((p) => ({ ...p, [id]: true }));
    setPdfErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    try {
      const blob = await downloadCertificatePdf(authToken, id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FoodShare-certificado-${id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setPdfErrors((prev) => ({
        ...prev,
        [id]: e.message || "Error al descargar el PDF.",
      }));
    } finally {
      setPdfLoading((p) => ({ ...p, [id]: false }));
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
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
            Certificados / diplomas
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Tras marcar una donación como entregada se generan certificados
            automáticos para el donador, la ONG y el voluntario (si aplica). Los
            registros se agrupan por usuario; haz clic para expandir.
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

      {/* Global list error */}
      {listErr && (
        <Banner type="error" message={listErr} onClose={() => setListErr("")} />
      )}

      {/* Issue certificate form */}
      {canIssue && (
        <form
          onSubmit={submitIssue}
          className="rounded-xl border border-gray-200 bg-white p-5 space-y-4 max-w-xl shadow-sm"
        >
          <h2 className="font-semibold text-gray-900">
            Emitir certificado manual
          </h2>

          <label className="block text-sm">
            <span className="text-gray-700">Usuario</span>
            <select
              className="mt-1 w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            >
              <option value="">Selecciona…</option>
              {certUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} · {u.email} · {ROLE_ES[u.role] || u.role}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-gray-700">Título</span>
            <input
              className="mt-1 w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>

          <label className="block text-sm">
            <span className="text-gray-700">Texto (opcional)</span>
            <textarea
              className="mt-1 w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <span className="text-gray-700">ID donación (opcional)</span>
            <input
              className="mt-1 w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              value={donationId}
              onChange={(e) => setDonationId(e.target.value)}
              placeholder="Solo si existe en la base de datos"
            />
            <span className="text-xs text-gray-500 block mt-1">
              Si lo rellenas, debe ser el UUID exacto de una donación existente.
            </span>
          </label>

          {issueFeedback && (
            <Banner
              type={issueFeedback.type}
              message={issueFeedback.msg}
              onClose={() => setIssueFeedback(null)}
            />
          )}

          <Button type="submit" disabled={issuing}>
            {issuing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Creando…
              </>
            ) : (
              "Crear certificado"
            )}
          </Button>
        </form>
      )}

      {/* Certificate list */}
      {loading ? (
        <p className="text-gray-500 text-sm">Cargando…</p>
      ) : groups.length === 0 ? (
        <p className="text-gray-500 text-sm">
          No hay certificados registrados.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map(([userKey, certs]) => {
            const first = certs[0];
            const isExpanded = expandedUsers.has(userKey);
            return (
              <section
                key={userKey}
                className="border border-gray-200 rounded-lg overflow-hidden shadow-sm"
              >
                {/* Collapsible header */}
                <button
                  type="button"
                  onClick={() => toggleUser(userKey)}
                  className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
                >
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">
                      {first.user_name}
                    </h2>
                    <p className="text-sm text-gray-500">{first.user_email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {certs.length} certificado{certs.length !== 1 ? "s" : ""}{" "}
                      ·{" "}
                      {first.user_role
                        ? ROLE_ES[first.user_role] || first.user_role
                        : "Usuario"}
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Certificate cards */}
                {isExpanded && (
                  <div className="p-4 border-t border-gray-200 bg-white">
                    <div className="grid gap-4 md:grid-cols-2">
                      {certs.map((c) => (
                        <div key={c.id} className="space-y-2">
                          <CertificateCard
                            title={c.title}
                            body={c.body}
                            createdAt={c.created_at}
                            expiresAt={c.expires_at}
                            recipientName={c.user_name}
                            roleLabel={
                              c.user_role
                                ? ROLE_ES[c.user_role] || c.user_role
                                : undefined
                            }
                            subtitle={c.user_email}
                            downloading={!!pdfLoading[c.id]}
                            onDownloadPdf={() => handlePdf(c.id)}
                          />

                          {/* PDF error */}
                          {pdfErrors[c.id] && (
                            <Banner
                              type="error"
                              message={pdfErrors[c.id]}
                              onClose={() =>
                                setPdfErrors((prev) => {
                                  const next = { ...prev };
                                  delete next[c.id];
                                  return next;
                                })
                              }
                            />
                          )}

                          {/* Delete button + per-cert error */}
                          {canDel && (
                            <div className="space-y-1">
                              {deleteErrors[c.id] && (
                                <Banner
                                  type="error"
                                  message={deleteErrors[c.id]}
                                  onClose={() =>
                                    setDeleteErrors((prev) => {
                                      const next = { ...prev };
                                      delete next[c.id];
                                      return next;
                                    })
                                  }
                                />
                              )}
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  disabled={deletingId === c.id}
                                  className={`inline-flex items-center gap-1 text-xs rounded px-2 py-1 transition-colors ${
                                    deletingId === c.id
                                      ? "text-gray-300 cursor-not-allowed"
                                      : "text-red-600 hover:text-red-800 hover:bg-red-50"
                                  }`}
                                  onClick={() => void handleDelete(c.id)}
                                >
                                  {deletingId === c.id ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin" />{" "}
                                      Eliminando…
                                    </>
                                  ) : (
                                    <>
                                      <Trash2 className="h-3.5 w-3.5" />{" "}
                                      Eliminar registro
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
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
