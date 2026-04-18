import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "../context/StoreContext";
import { DonationCardFinal as DonationCard } from "../components/DonationCardFinal";
import InteractiveMap from "../components/InteractiveMap";
import {
  Map as MapIcon,
  List,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  Package,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Donation } from "../types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// ─── Inline confirmation panel shown inside the list ─────────────────────────
function ConfirmClaimPanel({
  donation,
  onConfirm,
  onCancel,
  loading,
  error,
}: {
  donation: Donation;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  error: string;
}) {
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
    <div className="rounded-xl border-2 border-emerald-400 bg-emerald-50 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-emerald-600 px-4 py-3 flex items-center justify-between">
        <p className="text-white font-semibold text-sm">
          ¿Confirmar solicitud de esta donación?
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="text-emerald-100 hover:text-white transition-colors"
          aria-label="Cancelar"
        >
          <XCircle className="h-5 w-5" />
        </button>
      </div>

      {/* Donation summary */}
      <div className="p-4 space-y-2">
        <h3 className="font-bold text-gray-900 text-base">{donation.title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          {donation.description}
        </p>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs text-gray-600">
          <div className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span>{donation.quantity}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span>Vence {expiryLabel}</span>
          </div>
          <div className="flex items-start gap-1.5 col-span-2">
            <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{donation.location}</span>
          </div>
          <div className="flex items-center gap-1.5 col-span-2">
            <Users className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span>
              Donado por <strong>{donation.donorName}</strong>
            </span>
          </div>
        </div>

        {/* What happens next */}
        <p className="text-xs text-emerald-700 bg-emerald-100 rounded-lg px-3 py-2 mt-2">
          Al solicitar, la donación quedará reservada para tu ONG. Podrás
          coordinar el retiro a través del chat con el donador.
        </p>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={loading}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Solicitando…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Sí, solicitar
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function NgoMap() {
  const { donations, claimDonation } = useStore();

  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Selected donation (from map click or list button)
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(
    null,
  );
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Refs to scroll to the selected card
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const listTopRef = useRef<HTMLDivElement>(null);

  // ── Derived data ────────────────────────────────────────────────────────────
  const availableDonations = donations.filter(
    (d) =>
      d.status === "available" &&
      (searchTerm === "" ||
        d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.location.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  // Put selected donation first so it's always visible
  const sortedDonations = selectedDonation
    ? [
        ...availableDonations.filter((d) => d.id === selectedDonation.id),
        ...availableDonations.filter((d) => d.id !== selectedDonation.id),
      ]
    : availableDonations;

  // ── Scroll to selected card when it changes ─────────────────────────────────
  useEffect(() => {
    if (!selectedDonation) return;
    const el = cardRefs.current.get(selectedDonation.id);
    if (el) {
      // Small delay so the card is rendered after sorting
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  }, [selectedDonation]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  /** Called when user clicks "Ver en lista y solicitar →" inside the map popup */
  const handleSelectFromMap = useCallback((donation: Donation) => {
    setSelectedDonation(donation);
    setClaimError("");
    setSuccessMessage("");
    setViewMode("list");
  }, []);

  /** Called when user clicks "Solicitar" on a list card (not from map) */
  const handleSelectFromList = useCallback((donation: Donation) => {
    setSelectedDonation(donation);
    setClaimError("");
    setSuccessMessage("");
  }, []);

  /** Cancel the current selection */
  const handleCancelSelect = useCallback(() => {
    setSelectedDonation(null);
    setClaimError("");
  }, []);

  /** Actually execute the claim after user confirmed */
  const handleConfirmClaim = useCallback(async () => {
    if (!selectedDonation) return;
    setClaiming(true);
    setClaimError("");
    try {
      await claimDonation(selectedDonation.id);
      setSuccessMessage(
        `¡"${selectedDonation.title}" solicitada con éxito! Coordina el retiro en el chat.`,
      );
      setSelectedDonation(null);
      // Scroll to top to show success banner
      listTopRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } catch (error) {
      setClaimError(
        error instanceof Error
          ? error.message
          : "No se pudo solicitar la donación. Intenta de nuevo.",
      );
    } finally {
      setClaiming(false);
    }
  }, [selectedDonation, claimDonation]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((r) => setTimeout(r, 600)); // visual feedback
    setIsRefreshing(false);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* ── Filters Bar ───────────────────────────────────────────────────── */}
      <div className="bg-white px-4 py-3 shadow-sm border-b border-gray-200 z-10 flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
            placeholder="Buscar por nombre o ubicación…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            size="sm"
          >
            <RefreshCw
              className={`h-4 w-4 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Actualizar
          </Button>
          <Button
            variant={viewMode === "list" ? "primary" : "outline"}
            onClick={() => setViewMode("list")}
            size="sm"
          >
            <List className="h-4 w-4 mr-1.5" />
            Lista
          </Button>
          <Button
            variant={viewMode === "map" ? "primary" : "outline"}
            onClick={() => setViewMode("map")}
            size="sm"
          >
            <MapIcon className="h-4 w-4 mr-1.5" />
            Mapa
          </Button>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        {/* ── LIST VIEW ─────────────────────────────────────────────────── */}
        {viewMode === "list" && (
          <div className="max-w-7xl mx-auto space-y-4" ref={listTopRef}>
            {/* Success banner */}
            {successMessage && (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="flex-1">{successMessage}</span>
                <button
                  type="button"
                  onClick={() => setSuccessMessage("")}
                  className="ml-auto font-bold leading-none opacity-60 hover:opacity-100 text-lg"
                >
                  ×
                </button>
              </div>
            )}

            {/* Back hint when arriving from map */}
            {selectedDonation && (
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <ArrowLeft className="h-4 w-4 shrink-0" />
                <span>
                  Donación seleccionada desde el mapa.{" "}
                  <button
                    type="button"
                    className="underline font-medium hover:no-underline"
                    onClick={() => setViewMode("map")}
                  >
                    Volver al mapa
                  </button>
                </span>
              </div>
            )}

            {/* Card grid */}
            {sortedDonations.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-500 text-lg">
                  No se encontraron donaciones disponibles.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
                {sortedDonations.map((donation) => {
                  const isSelected = selectedDonation?.id === donation.id;
                  return (
                    <div
                      key={donation.id}
                      ref={(el) => {
                        if (el) cardRefs.current.set(donation.id, el);
                        else cardRefs.current.delete(donation.id);
                      }}
                      className="flex flex-col gap-3"
                    >
                      {/* ── Card with optional ring ── */}
                      <div
                        className={`rounded-xl transition-all duration-200 ${
                          isSelected
                            ? "ring-2 ring-emerald-500 ring-offset-2 shadow-md"
                            : ""
                        }`}
                      >
                        <DonationCard
                          donation={donation}
                          onAction={
                            isSelected
                              ? undefined // hide the default button when confirm panel is open
                              : () => handleSelectFromList(donation)
                          }
                          actionLabel="Solicitar donación"
                        />
                      </div>

                      {/* ── Inline confirmation panel ── */}
                      {isSelected && (
                        <ConfirmClaimPanel
                          donation={donation}
                          onConfirm={handleConfirmClaim}
                          onCancel={handleCancelSelect}
                          loading={claiming}
                          error={claimError}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── MAP VIEW ──────────────────────────────────────────────────── */}
        {viewMode === "map" && (
          <div className="h-full w-full rounded-lg overflow-hidden border border-gray-300">
            <InteractiveMap
              donations={availableDonations}
              onDonationClick={handleSelectFromMap}
            />
          </div>
        )}
      </div>
    </div>
  );
}
