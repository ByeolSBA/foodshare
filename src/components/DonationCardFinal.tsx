import { useState } from "react";
import { MapPin, Calendar, Users, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "./ui/Button";
import { getServerOrigin } from "../services/apiClient";

interface Donation {
  id: string;
  title: string;
  description: string;
  quantity: string;
  expirationDate: string;
  location: string;
  imageUrl?: string;
  status: string;
  donorId: string;
  donorName: string;
  claimedBy?: string;
  coordinates?: { lat: number; lng: number };
}

interface DonationCardProps {
  donation: Donation;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary" | "ghost" | "danger";
  }>;
  showStatus?: boolean;
  onAction?: () => void;
  actionLabel?: string;
}

const DEFAULT_DONATION_IMAGE =
  "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&q=80";

export function DonationCardFinal({
  donation,
  actions = [],
  showStatus = true,
  onAction,
  actionLabel,
}: DonationCardProps) {
  const statusColors = {
    available: "bg-green-100 text-green-800",
    reserved: "bg-yellow-100 text-yellow-800",
    collected: "bg-blue-100 text-blue-800",
    delivered: "bg-purple-100 text-purple-800",
    expired: "bg-red-100 text-red-800",
    cancel_pending: "bg-orange-100 text-orange-800",
    cancelled: "bg-gray-100 text-gray-800",
  };

  const statusLabels = {
    available: "Disponible",
    reserved: "Reservado",
    collected: "En camino",
    delivered: "Entregado",
    expired: "Vencido",
    cancel_pending: "Cancelación pendiente",
    cancelled: "Cancelado",
  };

  // Construir URL de imagen usando el endpoint unificado
  const getImageUrl = () => {
    if (!donation.imageUrl) {
      return DEFAULT_DONATION_IMAGE;
    }

    if (donation.imageUrl.startsWith("http")) {
      return donation.imageUrl;
    }

    const origin = getServerOrigin();

    // Siempre usar /images/donations para URLs relativas
    if (donation.imageUrl.startsWith("/uploads/donations/")) {
      const filename = donation.imageUrl.replace("/uploads/donations/", "");
      return `${origin}/images/donations/${filename}`;
    }

    if (donation.imageUrl.startsWith("/images/donations/")) {
      return `${origin}${donation.imageUrl}`;
    }

    return DEFAULT_DONATION_IMAGE;
  };

  const imageUrl = getImageUrl();

  // Estado para manejar errores de imagen
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleImageError = () => {
    setImageError(true);
    setIsLoading(false);
  };

  const handleImageLoad = () => {
    setImageError(false);
    setIsLoading(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative h-48 bg-gray-200">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-gray-400 text-sm">Cargando...</div>
          </div>
        )}

        <img
          src={imageError ? DEFAULT_DONATION_IMAGE : imageUrl}
          alt={donation.title}
          className={`w-full h-full object-cover ${isLoading ? "opacity-0" : "opacity-100"}`}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />

        {showStatus && (
          <div
            className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold ${statusColors[donation.status as keyof typeof statusColors]}`}
          >
            {statusLabels[donation.status as keyof typeof statusLabels]}
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-900 mb-1">
          {donation.title}
        </h3>
        <p className="text-sm text-gray-500 mb-2">{donation.donorName}</p>

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="h-4 w-4 mr-2 text-gray-400" />
            <span className="truncate">{donation.location}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="h-4 w-4 mr-2 text-gray-400" />
            <span>
              Vence:{" "}
              {format(new Date(donation.expirationDate), "d 'de' MMMM", {
                locale: es,
              })}
            </span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Users className="h-4 w-4 mr-2 text-gray-400" />
            <span>{donation.quantity}</span>
          </div>
        </div>

        <p className="text-sm text-gray-700 mb-4 line-clamp-2">
          {donation.description}
        </p>

        {onAction && (
          <Button onClick={onAction} className="w-full" variant="primary">
            {actionLabel}
          </Button>
        )}

        {actions.length > 0 && (
          <div className="flex gap-2">
            {actions.map((action, index) => (
              <Button
                key={index}
                onClick={action.onClick}
                variant={action.variant || "primary"}
                size="sm"
                className="flex-1"
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
