import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Icon, LatLngBounds } from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Calendar, Users, Package } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Donation } from "../types";
import { resolveDonationImageUrl } from "../services/apiClient";

// Fix for default markers in react-leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface InteractiveMapProps {
  donations: Donation[];
  /** Called when the user clicks "Solicitar" inside the popup — does NOT claim directly */
  onDonationClick?: (donation: Donation) => void;
  center?: [number, number];
  zoom?: number;
}

function MapBoundsUpdater({ donations }: { donations: Donation[] }) {
  const map = useMap();

  useEffect(() => {
    if (donations.length > 0) {
      const validCoordinates = donations
        .filter((d) => d.coordinates?.lat && d.coordinates?.lng)
        .map(
          (d) => [d.coordinates!.lat, d.coordinates!.lng] as [number, number],
        );

      if (validCoordinates.length > 0) {
        const bounds = new LatLngBounds(validCoordinates);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [donations, map]);

  return null;
}

/** Small image with fallback for the popup */
function PopupImage({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);
  const fallback =
    "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&q=80&w=400";

  return (
    <img
      src={error ? fallback : src}
      alt={alt}
      onError={() => setError(true)}
      className="w-full h-32 object-cover rounded-md mb-3"
    />
  );
}

export default function InteractiveMap({
  donations,
  onDonationClick,
  center = [2.4448, -76.6147],
  zoom = 6,
}: InteractiveMapProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="h-full w-full rounded-lg bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Cargando mapa…</p>
      </div>
    );
  }

  const validDonations = donations.filter(
    (d) => d.coordinates?.lat && d.coordinates?.lng,
  );

  const greenIcon = new Icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  return (
    <div className="h-full w-full rounded-lg overflow-hidden">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBoundsUpdater donations={validDonations} />

        {validDonations.map((donation) => {
          const imageUrl = resolveDonationImageUrl(donation.imageUrl);
          let expiryLabel = "";
          try {
            expiryLabel = format(
              new Date(donation.expirationDate),
              "d 'de' MMMM yyyy",
              { locale: es },
            );
          } catch {
            expiryLabel = donation.expirationDate;
          }

          return (
            <Marker
              key={donation.id}
              position={[donation.coordinates!.lat, donation.coordinates!.lng]}
              icon={greenIcon}
              /* ⚠️  NO eventHandlers here — clicking the marker just opens
                 the Popup (default Leaflet behaviour). The claim flow starts
                 only when the user explicitly clicks "Solicitar" inside the
                 popup.                                                        */
            >
              <Popup minWidth={260} maxWidth={300}>
                <div className="p-1 text-sm font-sans">
                  {/* Image */}
                  <PopupImage src={imageUrl} alt={donation.title} />

                  {/* Title + donor */}
                  <h3 className="font-bold text-gray-900 text-base leading-snug mb-0.5">
                    {donation.title}
                  </h3>
                  <p className="text-xs text-gray-500 mb-2">
                    Donado por{" "}
                    <span className="font-medium text-gray-700">
                      {donation.donorName}
                    </span>
                  </p>

                  {/* Description */}
                  <p className="text-gray-700 text-xs leading-relaxed mb-3 line-clamp-3">
                    {donation.description}
                  </p>

                  {/* Details */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-start gap-2 text-xs text-gray-600">
                      <Package className="h-3.5 w-3.5 mt-0.5 text-emerald-500 shrink-0" />
                      <span>
                        <span className="font-medium">Cantidad:</span>{" "}
                        {donation.quantity}
                      </span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-gray-600">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 text-emerald-500 shrink-0" />
                      <span className="line-clamp-2">
                        <span className="font-medium">Ubicación:</span>{" "}
                        {donation.location}
                      </span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-gray-600">
                      <Calendar className="h-3.5 w-3.5 mt-0.5 text-emerald-500 shrink-0" />
                      <span>
                        <span className="font-medium">Vence:</span>{" "}
                        {expiryLabel}
                      </span>
                    </div>
                  </div>

                  {/* CTA — switches to list + highlights the card */}
                  {onDonationClick && (
                    <button
                      type="button"
                      onClick={() => onDonationClick(donation)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                      Ver en lista y solicitar →
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
