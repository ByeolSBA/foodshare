import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { DonationCardFinal as DonationCard } from "../components/DonationCardFinal";
import {
  Truck,
  Navigation,
  CheckCircle,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "../components/ui/Button";

export default function VolunteerDashboard() {
  const { currentUser, donations, deliverDonation } = useStore();

  const [deliverError, setDeliverError] = useState("");
  const [deliverSuccess, setDeliverSuccess] = useState("");
  const [deliveringId, setDeliveringId] = useState<string | null>(null);

  const myTransport = donations.filter(
    (d) => d.transportedBy === currentUser?.id,
  );
  const activeTransport = myTransport.filter((d) => d.status === "collected");
  const deliveredTransport = myTransport.filter(
    (d) => d.status === "delivered",
  );

  const handleDeliver = async (id: string) => {
    setDeliveringId(id);
    setDeliverError("");
    setDeliverSuccess("");
    try {
      await deliverDonation(id);
      setDeliverSuccess("¡Entrega completada! Gracias por tu ayuda.");
    } catch (error) {
      setDeliverError(
        error instanceof Error
          ? error.message
          : "No se pudo marcar la entrega como completada. Intenta de nuevo.",
      );
    } finally {
      setDeliveringId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hola, {currentUser?.name} 👋
          </h1>
          <p className="text-gray-500">Tus misiones de rescate de alimentos.</p>
        </div>
        <Link to="/volunteer/available">
          <Button className="w-full sm:w-auto">
            <Truck className="mr-2 h-4 w-4" />
            Buscar Envíos
          </Button>
        </Link>
      </div>

      {/* Feedback banners */}
      {deliverError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="flex-1">{deliverError}</span>
          <button
            type="button"
            className="ml-auto font-bold leading-none opacity-60 hover:opacity-100"
            onClick={() => setDeliverError("")}
          >
            ×
          </button>
        </div>
      )}
      {deliverSuccess && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="flex-1">{deliverSuccess}</span>
          <button
            type="button"
            className="ml-auto font-bold leading-none opacity-60 hover:opacity-100"
            onClick={() => setDeliverSuccess("")}
          >
            ×
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg p-5 flex items-center">
          <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
            <Truck className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                En Ruta
              </dt>
              <dd className="text-2xl font-semibold text-gray-900">
                {activeTransport.length}
              </dd>
            </dl>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg p-5 flex items-center">
          <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                Entregados
              </dt>
              <dd className="text-2xl font-semibold text-gray-900">
                {deliveredTransport.length}
              </dd>
            </dl>
          </div>
        </div>
      </div>

      {/* Active Transport */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Envíos en Curso
        </h2>
        {activeTransport.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeTransport.map((donation) => (
              <DonationCard
                key={donation.id}
                donation={donation}
                onAction={() => handleDeliver(donation.id)}
                actionLabel={
                  deliveringId === donation.id
                    ? "Registrando…"
                    : "Marcar como Entregado"
                }
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200 border-dashed">
            <Navigation className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No tienes envíos activos
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              ¡Ayuda a transportar alimentos a quienes los necesitan!
            </p>
            <div className="mt-6">
              <Link to="/volunteer/available">
                <Button variant="outline">Ver Disponibles</Button>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Delivered History */}
      {deliveredTransport.length > 0 && (
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Historial de Entregas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {deliveredTransport.map((donation) => (
              <DonationCard key={donation.id} donation={donation} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
