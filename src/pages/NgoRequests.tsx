import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { DonationCardFinal as DonationCard } from "../components/DonationCardFinal";
import { List, Map, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Donation } from "../types";
import { fetchNgoRequests } from "../services/donationService";

export default function NgoRequests() {
  const navigate = useNavigate();
  const {
    currentUser,
    collectDonation,
    cancelClaim,
    deliverDonation,
    approveCancelDonation,
    rejectCancelDonation,
  } = useStore();
  const [requests, setRequests] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const refetchRequests = useCallback(async () => {
    const token = localStorage.getItem("foodshare_token");
    if (!token) {
      setError("Necesitas iniciar sesión.");
      setRequests([]);
      setLoading(false);
      return;
    }
    try {
      const data = await fetchNgoRequests(token);
      setRequests(data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("No fue posible cargar tus solicitudes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetchRequests();
    const interval = setInterval(() => void refetchRequests(), 3000);
    return () => clearInterval(interval);
  }, [refetchRequests]);

  const filteredRequests = requests.filter((donation) => {
    const matchesSearch = [
      donation.title,
      donation.location,
      donation.donorName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || donation.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const runAction = async (
    donationId: string,
    label: string,
    fn: () => Promise<void>,
  ) => {
    setBusyId(donationId);
    setActionError("");
    setActionSuccess("");
    try {
      await fn();
      await refetchRequests();
      setActionSuccess(`${label} completado correctamente.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `Error: ${label}`);
    } finally {
      setBusyId(null);
    }
  };

  const buildActions = (donation: Donation) => {
    const isBusy = busyId === donation.id;
    const actions: {
      label: string;
      onClick: () => Promise<void> | void;
      variant?: "primary" | "secondary" | "ghost" | "danger";
    }[] = [
      {
        label: "Contactar al donador",
        onClick: () =>
          navigate(`/chat/${donation.donorId}?donationId=${donation.id}`),
        variant: "primary",
      },
    ];

    if (
      donation.status === "cancel_pending" &&
      donation.cancelRequestedBy &&
      donation.cancelRequestedBy !== currentUser?.id
    ) {
      actions.push(
        {
          label: isBusy ? "Procesando…" : "Aceptar cancelación",
          onClick: async () => {
            if (
              !window.confirm(
                "¿Confirmas cancelar este trato? La donación quedará anulada.",
              )
            )
              return;
            await runAction(donation.id, "Cancelación aceptada", () =>
              approveCancelDonation(donation.id),
            );
          },
          variant: "danger",
        },
        {
          label: isBusy ? "Procesando…" : "Rechazar cancelación",
          onClick: async () => {
            if (
              !window.confirm(
                "¿Rechazar la solicitud de cancelación? El trato seguirá activo.",
              )
            )
              return;
            await runAction(donation.id, "Cancelación rechazada", () =>
              rejectCancelDonation(donation.id),
            );
          },
          variant: "secondary",
        },
      );
      return actions;
    }

    if (donation.status === "reserved") {
      actions.push(
        {
          label: isBusy ? "Procesando…" : "Marcar como recolectada",
          onClick: async () => {
            await runAction(donation.id, "Marcada como recolectada", () =>
              collectDonation(donation.id),
            );
          },
          variant: "secondary",
        },
        {
          label: isBusy ? "Procesando…" : "Cancelar trato",
          onClick: async () => {
            if (
              !window.confirm(
                "¿Estás seguro de que quieres cancelar este trato? La donación volverá a estar disponible.",
              )
            )
              return;
            await runAction(donation.id, "Trato cancelado", () =>
              cancelClaim(donation.id),
            );
          },
          variant: "danger",
        },
      );
    }

    if (["reserved", "collected"].includes(donation.status)) {
      actions.push({
        label: isBusy ? "Procesando…" : "Marcar como entregada",
        onClick: async () => {
          if (!window.confirm("¿Confirmas que esta donación ya fue entregada?"))
            return;
          await runAction(donation.id, "Marcada como entregada", () =>
            deliverDonation(donation.id),
          );
        },
        variant: "primary",
      });
    }

    return actions;
  };

  return (
    <div className="space-y-8">
      {/* Action feedback banners */}
      {actionError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="flex-1">{actionError}</span>
          <button
            type="button"
            className="ml-auto font-bold leading-none opacity-60 hover:opacity-100"
            onClick={() => setActionError("")}
          >
            ×
          </button>
        </div>
      )}
      {actionSuccess && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="flex-1">{actionSuccess}</span>
          <button
            type="button"
            className="ml-auto font-bold leading-none opacity-60 hover:opacity-100"
            onClick={() => setActionSuccess("")}
          >
            ×
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Solicitudes</h1>
          <p className="text-gray-500">
            Donaciones que has solicitado (se actualizan solas cada pocos
            segundos). Si el donador pide cancelar el trato, aparecerá aquí.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void refetchRequests()}
          >
            Actualizar lista
          </Button>
          <Link to="/ngo/map">
            <Button>
              <Map className="mr-2 h-4 w-4" />
              Volver al Mapa
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto] items-end">
        <div className="flex flex-col sm:flex-row gap-3">
          <label className="flex-1">
            <span className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Título, ubicación o donador"
              className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </label>
          <label className="min-w-[200px]">
            <span className="block text-sm font-medium text-gray-700 mb-1">
              Filtrar por estado
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Todos</option>
              <option value="reserved">Reservadas</option>
              <option value="cancel_pending">Cancelación pendiente</option>
              <option value="collected">Recolectadas</option>
              <option value="delivered">Entregadas</option>
              <option value="cancelled">Canceladas</option>
            </select>
          </label>
        </div>
        <div className="text-sm text-gray-500">
          {filteredRequests.length} solicitud
          {filteredRequests.length === 1 ? "" : "es"} encontradas
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 bg-white rounded-lg border border-gray-200 border-dashed">
          <p className="text-gray-500">Cargando solicitudes...</p>
        </div>
      ) : error ? (
        <div className="text-center py-20 bg-white rounded-lg border border-red-200 border-dashed space-y-3">
          <p className="text-red-500">{error}</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void refetchRequests()}
          >
            Reintentar
          </Button>
        </div>
      ) : requests.length > 0 ? (
        filteredRequests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRequests.map((donation) => (
              <DonationCard
                key={donation.id}
                donation={donation}
                actions={buildActions(donation)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-lg border border-gray-200 border-dashed">
            <List className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              No se encontraron solicitudes con esos filtros
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Prueba &quot;Todos&quot; o &quot;Cancelación pendiente&quot;.
            </p>
          </div>
        )
      ) : (
        <div className="text-center py-20 bg-white rounded-lg border border-gray-200 border-dashed">
          <List className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            No tienes solicitudes registradas
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Las solicitudes aparecen aquí después de reclamar una donación en el
            mapa.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Link to="/ngo/map">
              <Button>Ir al mapa</Button>
            </Link>
            <Button
              type="button"
              variant="outline"
              onClick={() => void refetchRequests()}
            >
              Actualizar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
