import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { DonationCardFinal as DonationCard } from "../components/DonationCardFinal";

import {
  PlusCircle,
  Utensils,
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "../components/ui/Button";

export default function DonorDashboard() {
  const navigate = useNavigate();
  const { currentUser, donations, cancelDonation } = useStore();

  const [cancelError, setCancelError] = useState("");
  const [cancelSuccess, setCancelSuccess] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const myDonations = donations.filter((d) => d.donorId === currentUser?.id);
  const activeDonations = myDonations.filter((d) => d.status === "available");
  const reservedDonations = myDonations.filter(
    (d) => d.status === "reserved" || d.status === "collected",
  );

  const handleCancel = async (donationId: string, title: string) => {
    if (!window.confirm(`¿Deseas cancelar la donación "${title}"?`)) return;
    setCancellingId(donationId);
    setCancelError("");
    setCancelSuccess("");
    try {
      await cancelDonation(donationId);
      setCancelSuccess(`Donación "${title}" cancelada correctamente.`);
    } catch (error) {
      setCancelError(
        error instanceof Error
          ? error.message
          : "No se pudo cancelar la donación.",
      );
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Feedback banners */}
      {cancelError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="flex-1">{cancelError}</span>
          <button
            type="button"
            className="ml-auto font-bold leading-none opacity-60 hover:opacity-100"
            onClick={() => setCancelError("")}
          >
            ×
          </button>
        </div>
      )}
      {cancelSuccess && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="flex-1">{cancelSuccess}</span>
          <button
            type="button"
            className="ml-auto font-bold leading-none opacity-60 hover:opacity-100"
            onClick={() => setCancelSuccess("")}
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hola, {currentUser?.name} 👋
          </h1>
          <p className="text-gray-500">
            Aquí tienes un resumen de tus donaciones.
          </p>
        </div>
        <Link to="/donor/create">
          <Button className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nueva Donación
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg p-5 flex items-center">
          <div className="flex-shrink-0 bg-emerald-100 rounded-md p-3">
            <Utensils className="h-6 w-6 text-emerald-600" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                Total Donado
              </dt>
              <dd className="text-2xl font-semibold text-gray-900">
                {myDonations.length}
              </dd>
            </dl>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg p-5 flex items-center">
          <div className="flex-shrink-0 bg-orange-100 rounded-md p-3">
            <Clock className="h-6 w-6 text-orange-600" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                En Proceso
              </dt>
              <dd className="text-2xl font-semibold text-gray-900">
                {activeDonations.length + reservedDonations.length}
              </dd>
            </dl>
          </div>
        </div>
      </div>

      {/* Active Donations */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Donaciones Activas
        </h2>
        {activeDonations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeDonations.map((donation) => (
              <DonationCard
                key={donation.id}
                donation={donation}
                actions={[
                  {
                    label: "Editar",
                    onClick: () => navigate(`/donor/edit/${donation.id}`),
                    variant: "secondary",
                  },
                  {
                    label:
                      cancellingId === donation.id ? "Cancelando…" : "Cancelar",
                    onClick: () => handleCancel(donation.id, donation.title),
                    variant: "ghost",
                  },
                ]}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200 border-dashed">
            <Utensils className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No tienes donaciones activas
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              ¡Empieza a ayudar publicando tu primera donación!
            </p>
            <div className="mt-6">
              <Link to="/donor/create">
                <Button variant="outline">Publicar Donación</Button>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* In Progress */}
      {reservedDonations.length > 0 && (
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            En Proceso de Recolección
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reservedDonations.map((donation) => (
              <DonationCard
                key={donation.id}
                donation={donation}
                actions={
                  donation.claimedBy
                    ? [
                        {
                          label: "Contactar",
                          onClick: () =>
                            navigate(
                              `/chat/${donation.claimedBy}?donationId=${donation.id}`,
                            ),
                          variant: "primary",
                        },
                      ]
                    : []
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
