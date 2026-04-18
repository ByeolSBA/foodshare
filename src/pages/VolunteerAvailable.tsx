import { useState } from "react";
import { useStore } from "../context/StoreContext";
import { DonationCardFinal as DonationCard } from "../components/DonationCardFinal";
import {
  Truck,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Link, useNavigate } from "react-router-dom";

export default function VolunteerAvailable() {
  const { donations, acceptTransport } = useStore();
  const navigate = useNavigate();

  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState("");
  const [acceptSuccess, setAcceptSuccess] = useState("");

  // Donations that are claimed by an NGO but not yet picked up
  const availableForTransport = donations.filter(
    (d) => d.status === "reserved" && !d.transportedBy,
  );

  const handleAccept = async (id: string) => {
    setAcceptingId(id);
    setAcceptError("");
    setAcceptSuccess("");
    try {
      await acceptTransport(id);
      setAcceptSuccess("¡Envío aceptado! Dirígete al punto de recogida.");
      setTimeout(() => navigate("/volunteer"), 1500);
    } catch (error) {
      console.error(error);
      setAcceptError(
        error instanceof Error
          ? error.message
          : "No se pudo aceptar el envío. Intenta de nuevo.",
      );
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <Link
          to="/volunteer"
          className="mr-4 text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Envíos Disponibles</h1>
      </div>

      {acceptError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="flex-1">{acceptError}</span>
          <button
            type="button"
            className="ml-auto font-bold leading-none opacity-60 hover:opacity-100"
            onClick={() => setAcceptError("")}
          >
            ×
          </button>
        </div>
      )}
      {acceptSuccess && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="flex-1">{acceptSuccess}</span>
        </div>
      )}

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <Truck className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              Estas donaciones han sido reservadas por ONGs y necesitan
              transporte. Al aceptar, te comprometes a recogerlas y entregarlas
              lo antes posible.
            </p>
          </div>
        </div>
      </div>

      {availableForTransport.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableForTransport.map((donation) => (
            <DonationCard
              key={donation.id}
              donation={donation}
              onAction={() => handleAccept(donation.id)}
              actionLabel={
                acceptingId === donation.id ? "Aceptando…" : "Aceptar Envío"
              }
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-lg border border-gray-200 border-dashed">
          <p className="text-gray-500 text-lg">
            No hay envíos pendientes en este momento.
          </p>
          <p className="text-gray-400">¡Vuelve más tarde!</p>
        </div>
      )}
    </div>
  );
}
