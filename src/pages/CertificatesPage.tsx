import { Link } from "react-router-dom";
import { Award, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/Button";
import { CertificateCard } from "../components/CertificateCard";
import { useStore } from "../context/StoreContext";
import { useEffect, useState } from "react";
import {
  downloadCertificatePdf,
  fetchMyCertificates,
  type UserCertificate,
} from "../services/certificateService";
import { isAdminRole } from "../utils/adminAccess";

const ROLE_ES: Record<string, string> = {
  donor: "Donador",
  ngo: "ONG",
  volunteer: "Voluntario",
};

export default function CertificatesPage() {
  const { currentUser, authToken } = useStore();
  const [items, setItems] = useState<UserCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState<Record<string, boolean>>({});
  const [pdfError, setPdfError] = useState("");

  const dashboardPath = currentUser
    ? isAdminRole(currentUser.role)
      ? "/admin"
      : `/${currentUser.role}`
    : "/";

  useEffect(() => {
    if (!authToken) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchMyCertificates(authToken);
        if (!cancelled) setItems(data);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authToken]);

  const handlePdf = async (id: string) => {
    if (!authToken) return;
    setPdfError("");
    setPdfLoading((p) => ({ ...p, [id]: true }));
    try {
      const blob = await downloadCertificatePdf(authToken, id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FoodShare-certificado-${id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setPdfError(
        e instanceof Error
          ? e.message
          : "No se pudo descargar el certificado. Intenta de nuevo.",
      );
    } finally {
      setPdfLoading((p) => ({ ...p, [id]: false }));
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8 sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-6">
          <Award className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-semibold text-gray-900 mb-3 text-center">
          Certificados
        </h1>
        <p className="text-gray-600 mb-2 text-center max-w-xl mx-auto">
          Reconocimientos emitidos por la plataforma o por un administrador.
          Descarga cada uno en PDF para conservarlo; el registro en línea puede
          eliminarse automáticamente pasado aproximadamente un mes.
        </p>
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-4 py-2 text-center max-w-xl mx-auto mb-8">
          <strong>Descarga tu certificado en PDF</strong> o puede borrarse del
          sistema en un mes (fecha límite indicada en cada tarjeta).
        </p>

        {pdfError && (
          <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 max-w-xl mx-auto">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="flex-1">{pdfError}</span>
            <button
              type="button"
              className="ml-auto font-bold leading-none opacity-60 hover:opacity-100"
              onClick={() => setPdfError("")}
            >
              ×
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-center text-gray-500">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="text-center text-gray-500 mb-8">
            Aún no tienes certificados registrados.
          </p>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 mb-8">
            {items.map((c) => (
              <li key={c.id}>
                <CertificateCard
                  title={c.title}
                  body={c.body}
                  createdAt={c.created_at}
                  expiresAt={c.expires_at}
                  recipientName={
                    c.recipient_name || currentUser?.name || undefined
                  }
                  roleLabel={
                    c.user_role
                      ? ROLE_ES[c.user_role] || c.user_role
                      : undefined
                  }
                  downloading={!!pdfLoading[c.id]}
                  onDownloadPdf={() => handlePdf(c.id)}
                />
              </li>
            ))}
          </ul>
        )}

        <div className="text-center">
          <Link to={dashboardPath}>
            <Button variant="secondary">Volver al dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
