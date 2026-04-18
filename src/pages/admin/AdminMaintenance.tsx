import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../../context/StoreContext";
import { postAdminMaintenancePrune } from "../../services/adminService";
import { Button } from "../../components/ui/Button";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  MessageSquare,
  Award,
  Package,
  Info,
  AlertCircle,
  Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PruneResult {
  expiredCertificates: number;
  messages: number;
  certificatesByAge: number;
  donations: number;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionCard({
  icon: Icon,
  title,
  description,
  warning,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  warning?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-gray-100">
          <Icon className="h-5 w-5 text-gray-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
      {warning && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          {warning}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

function ResultRow({
  label,
  count,
  icon: Icon,
}: {
  label: string;
  count: number;
  icon: React.ElementType;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
        count > 0
          ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
          : "bg-gray-50 border border-gray-200 text-gray-500"
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" />
        <span>{label}</span>
      </div>
      <span
        className={`font-bold tabular-nums ${count > 0 ? "text-emerald-700" : "text-gray-400"}`}
      >
        {count} eliminado{count !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminMaintenance() {
  const { authToken, currentUser } = useStore();

  // Form state
  const [deleteExpiredCertificates, setDeleteExpiredCertificates] =
    useState(true);
  const [messagesDays, setMessagesDays] = useState("");
  const [certDays, setCertDays] = useState("");
  const [donationDays, setDonationDays] = useState("");

  // UI state
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PruneResult | null>(null);
  const [err, setErr] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  if (currentUser?.role !== "super_admin") {
    return (
      <div className="space-y-4">
        <Link
          to="/admin"
          className="text-sm text-emerald-600 hover:underline flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          Solo el super administrador puede usar el mantenimiento masivo.
        </div>
      </div>
    );
  }

  // Determine if the form will actually do anything
  const willDoSomething =
    deleteExpiredCertificates ||
    (messagesDays !== "" && Number(messagesDays) > 0) ||
    (certDays !== "" && Number(certDays) > 0) ||
    (donationDays !== "" && Number(donationDays) > 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken || !willDoSomething) return;

    setBusy(true);
    setErr("");
    setResult(null);
    setConfirmed(false);

    try {
      const payload = {
        deleteExpiredCertificates,
        messagesOlderThanDays:
          messagesDays === "" ? null : Number(messagesDays),
        certificatesOlderThanDays: certDays === "" ? null : Number(certDays),
        donationsOlderThanDays:
          donationDays === "" ? null : Number(donationDays),
      };
      const data = await postAdminMaintenancePrune(authToken, payload);
      setResult(data.deleted as unknown as PruneResult);
    } catch (e: any) {
      setErr(e.message || "Error al ejecutar el mantenimiento.");
    } finally {
      setBusy(false);
    }
  };

  const totalDeleted = result
    ? (result.expiredCertificates ?? 0) +
      (result.messages ?? 0) +
      (result.certificatesByAge ?? 0) +
      (result.donations ?? 0)
    : 0;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <Link
          to="/admin"
          className="text-sm text-emerald-600 hover:underline flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al panel
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          Mantenimiento y limpieza
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Elimina datos obsoletos para aligerar la base de datos. Las acciones
          son{" "}
          <strong className="text-gray-700">permanentes e irreversibles</strong>
          .
        </p>
      </div>

      {/* Warning banner */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0 text-amber-500" />
        <div>
          <p className="font-semibold">Zona de peligro</p>
          <p className="mt-0.5">
            Esta herramienta borra datos de forma masiva y permanente. Asegúrate
            de tener un respaldo de la base de datos antes de ejecutar la
            limpieza.
          </p>
        </div>
      </div>

      {/* Error */}
      {err && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="flex-1">{err}</span>
          <button
            type="button"
            className="ml-auto font-bold leading-none opacity-60 hover:opacity-100"
            onClick={() => setErr("")}
          >
            ×
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-800 font-semibold">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            {totalDeleted > 0
              ? `Limpieza completada — ${totalDeleted} registro${totalDeleted !== 1 ? "s" : ""} eliminado${totalDeleted !== 1 ? "s" : ""}`
              : "Limpieza completada — no había datos que cumplieran los criterios"}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <ResultRow
              label="Certificados vencidos"
              count={result.expiredCertificates ?? 0}
              icon={Award}
            />
            <ResultRow
              label="Mensajes por antigüedad"
              count={result.messages ?? 0}
              icon={MessageSquare}
            />
            <ResultRow
              label="Certificados por antigüedad"
              count={result.certificatesByAge ?? 0}
              icon={Award}
            />
            <ResultRow
              label="Donaciones archivadas"
              count={result.donations ?? 0}
              icon={Package}
            />
          </div>
          {totalDeleted === 0 && (
            <div className="flex items-start gap-2 text-xs text-emerald-700 pt-1">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                Esto es normal si los datos son recientes o si ya se ejecutó una
                limpieza recientemente. Prueba con menos días o verifica que
                existan registros con esas condiciones.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Form */}
      <form onSubmit={submit} className="space-y-4">
        {/* Expired certificates */}
        <SectionCard
          icon={Award}
          title="Certificados vencidos"
          description='Elimina certificados cuya fecha de expiración (campo "expires_at") ya pasó.'
        >
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={deleteExpiredCertificates}
              onChange={(e) => setDeleteExpiredCertificates(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-700">
              Eliminar todos los certificados ya vencidos{" "}
              <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                expires_at &lt; AHORA
              </code>
            </span>
          </label>
        </SectionCard>

        {/* Old messages */}
        <SectionCard
          icon={MessageSquare}
          title="Mensajes antiguos"
          description="Elimina mensajes de chat más antiguos que N días."
          warning="Esto borra el historial de conversaciones permanentemente."
        >
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={3650}
              className="w-32 border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              value={messagesDays}
              onChange={(e) => setMessagesDays(e.target.value)}
              placeholder="Días"
            />
            <span className="text-sm text-gray-500">
              {messagesDays && Number(messagesDays) > 0
                ? `Elimina mensajes enviados hace más de ${messagesDays} día${Number(messagesDays) !== 1 ? "s" : ""}`
                : "Deja vacío para no borrar mensajes"}
            </span>
          </div>
        </SectionCard>

        {/* Old certificates */}
        <SectionCard
          icon={Award}
          title="Certificados por antigüedad"
          description="Elimina registros de certificados creados hace más de N días (independientemente de si han vencido)."
          warning="Elimina el registro del certificado. El usuario ya no podrá descargarlo."
        >
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={3650}
              className="w-32 border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              value={certDays}
              onChange={(e) => setCertDays(e.target.value)}
              placeholder="Días"
            />
            <span className="text-sm text-gray-500">
              {certDays && Number(certDays) > 0
                ? `Elimina certificados creados hace más de ${certDays} día${Number(certDays) !== 1 ? "s" : ""}`
                : "Deja vacío para no borrar certificados"}
            </span>
          </div>
        </SectionCard>

        {/* Old donations */}
        <SectionCard
          icon={Package}
          title="Donaciones archivadas antiguas"
          description='Elimina donaciones con estado "entregada", "cancelada" o "vencida" creadas hace más de N días.'
          warning="Elimina también los mensajes y datos ligados a esas donaciones en cascada."
        >
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={3650}
              className="w-32 border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              value={donationDays}
              onChange={(e) => setDonationDays(e.target.value)}
              placeholder="Días"
            />
            <span className="text-sm text-gray-500">
              {donationDays && Number(donationDays) > 0
                ? `Elimina donaciones archivadas con más de ${donationDays} día${Number(donationDays) !== 1 ? "s" : ""} de antigüedad`
                : "Deja vacío para no borrar donaciones"}
            </span>
          </div>
        </SectionCard>

        {/* Confirm checkbox + submit */}
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-sm text-red-800 font-medium">
              Entiendo que esta acción es permanente e irreversible y que los
              datos eliminados no podrán recuperarse.
            </span>
          </label>

          <Button
            type="submit"
            disabled={busy || !confirmed || !willDoSomething}
            className="w-full sm:w-auto"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Aplicando limpieza…
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Ejecutar limpieza ahora
              </>
            )}
          </Button>

          {!willDoSomething && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <Info className="h-3.5 w-3.5 shrink-0" />
              Activa al menos una opción de limpieza para poder ejecutar.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
