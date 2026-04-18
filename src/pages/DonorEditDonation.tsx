import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { Button } from "../components/ui/Button";
import { Camera, Calendar, Package, X, AlertCircle } from "lucide-react";
import { resolveDonationImageUrl } from "../services/apiClient";
import { uploadDonationImage } from "../services/donationService";
import { LocationPickerFixed as LocationPicker } from "../components/LocationPickerFixed";

function isExternalImageUrl(url: string | undefined) {
  if (!url) return false;
  return (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:")
  );
}

export default function DonorEditDonation() {
  const { donations, editDonation, authToken } = useStore();
  const navigate = useNavigate();
  const { id } = useParams();
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedCoordinates, setSelectedCoordinates] = useState<
    { lat: number; lng: number } | undefined
  >(undefined);
  const [submitError, setSubmitError] = useState("");
  const [imageError, setImageError] = useState("");

  const donation = donations.find((d) => d.id === id);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      title: donation?.title || "",
      description: donation?.description || "",
      quantity: donation?.quantity || "",
      expirationDate: donation?.expirationDate || "",
      location: donation?.location || "",
      externalImageUrl: isExternalImageUrl(donation?.imageUrl)
        ? donation!.imageUrl!
        : "",
    },
  });

  useEffect(() => {
    if (!pendingFile) {
      setFilePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setFilePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  useEffect(() => {
    if (donation) {
      reset({
        title: donation.title,
        description: donation.description,
        quantity: donation.quantity,
        expirationDate: donation.expirationDate,
        location: donation.location,
        externalImageUrl: isExternalImageUrl(donation.imageUrl)
          ? donation.imageUrl!
          : "",
      });
      setPendingFile(null);
      // Inicializar ubicación y coordenadas existentes
      setSelectedLocation(donation.location || "");
      setSelectedCoordinates(donation.coordinates);
    }
  }, [donation, reset]);

  if (!donation) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Donación no encontrada
          </h2>
          <p className="mt-3 text-gray-500">
            Selecciona una donación válida desde el dashboard.
          </p>
          <Button onClick={() => navigate("/donor")} className="mt-6">
            Volver al Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (donation.status !== "available") {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900">
            No se puede editar
          </h2>
          <p className="mt-3 text-gray-500">
            Solo se pueden editar donaciones en estado disponible.
          </p>
          <Button onClick={() => navigate("/donor")} className="mt-6">
            Volver al Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError("");
    if (file.size > 10 * 1024 * 1024) {
      setImageError("La imagen no debe superar 10MB.");
      return;
    }
    if (!/^image\/(jpeg|png|gif|webp)$/i.test(file.type)) {
      setImageError("Solo se aceptan JPEG, PNG, GIF o WebP.");
      return;
    }
    setPendingFile(file);
  };

  const removePendingFile = () => setPendingFile(null);

  const onSubmit = async (data: any) => {
    if (!authToken || !donation) return;
    setSubmitError("");
    try {
      let imageUrl = donation.imageUrl;
      if (pendingFile) {
        imageUrl = await uploadDonationImage(pendingFile, authToken);
      } else if (data.externalImageUrl?.trim()) {
        imageUrl = data.externalImageUrl.trim();
      }

      await editDonation(donation.id, {
        title: data.title,
        description: data.description,
        quantity: data.quantity,
        expirationDate: data.expirationDate,
        location: selectedLocation || data.location,
        coordinates: selectedCoordinates,
        imageUrl,
      });
      navigate("/donor");
    } catch (error) {
      console.error(error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la donación. Intenta de nuevo.",
      );
    }
  };

  const displayImageSrc =
    filePreviewUrl || resolveDonationImageUrl(donation.imageUrl);

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {submitError && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="flex-1">{submitError}</span>
          <button
            type="button"
            className="ml-auto font-bold leading-none opacity-60 hover:opacity-100"
            onClick={() => setSubmitError("")}
          >
            ×
          </button>
        </div>
      )}

      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Editar Donación
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Actualiza los datos de la donación antes de que sea solicitada.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-8 divide-y divide-gray-200"
      >
        <div className="space-y-6 sm:space-y-5">
          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"
            >
              Título de la donación
            </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <input
                type="text"
                {...register("title", { required: true })}
                className="max-w-lg block w-full shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:max-w-xs sm:text-sm border-gray-300 rounded-md p-2 border"
                placeholder="Ej: 50 Barras de Pan"
              />
              {errors.title && (
                <span className="text-red-500 text-sm">
                  Este campo es requerido
                </span>
              )}
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"
            >
              Descripción detallada
            </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <textarea
                {...register("description", { required: true })}
                rows={3}
                className="max-w-lg shadow-sm block w-full focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm border border-gray-300 rounded-md p-2"
                placeholder="Describe el estado de los alimentos..."
              />
              {errors.description && (
                <span className="text-red-500 text-sm">
                  Este campo es requerido
                </span>
              )}
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
            <label
              htmlFor="quantity"
              className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"
            >
              Cantidad estimada
            </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <div className="relative rounded-md shadow-sm max-w-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Package
                    className="h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                </div>
                <input
                  type="text"
                  {...register("quantity", { required: true })}
                  className="focus:ring-emerald-500 focus:border-emerald-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md p-2 border"
                  placeholder="Ej: 10 kg, 5 cajas..."
                />
              </div>
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
            <label
              htmlFor="expirationDate"
              className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"
            >
              Fecha de vencimiento
            </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <div className="relative rounded-md shadow-sm max-w-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar
                    className="h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                </div>
                <input
                  type="date"
                  {...register("expirationDate", { required: true })}
                  className="focus:ring-emerald-500 focus:border-emerald-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md p-2 border"
                />
              </div>
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
            <label className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">
              Ubicación de retiro
            </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <LocationPicker
                initialAddress={selectedLocation}
                initialCoordinates={selectedCoordinates}
                onLocationChange={(address, coordinates) => {
                  const loc = address?.trim()
                    ? address.trim()
                    : `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`;
                  setSelectedLocation(loc);
                  setSelectedCoordinates(coordinates);
                }}
                placeholder="Ingresa la dirección (ej: Carrera 2 #21-321, Popayán)"
              />

              {/* Hidden field for form validation */}
              <input
                type="hidden"
                {...register("location", {
                  validate: () => {
                    if (selectedCoordinates?.lat && selectedCoordinates?.lng)
                      return true;
                    if (selectedLocation?.trim()) return true;
                    return "Selecciona una ubicación en el mapa o ingresa una dirección";
                  },
                })}
                value={
                  selectedLocation ||
                  (selectedCoordinates
                    ? `${selectedCoordinates.lat.toFixed(4)}, ${selectedCoordinates.lng.toFixed(4)}`
                    : "")
                }
              />
              {errors.location && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.location.message as string}
                </p>
              )}
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
            <label className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">
              Foto de los alimentos
            </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2 space-y-4 max-w-lg">
              <p className="text-xs text-gray-500">
                URL opcional o archivo local. Si subes un archivo nuevo,
                reemplaza la imagen actual.
              </p>
              <div className="relative rounded-md overflow-hidden border border-gray-200 bg-gray-100">
                <img
                  src={displayImageSrc}
                  alt="Imagen de la donación"
                  className="w-full h-56 object-cover"
                />
                {pendingFile && (
                  <button
                    type="button"
                    onClick={removePendingFile}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    aria-label="Descartar nueva imagen"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
              <input
                type="url"
                {...register("externalImageUrl")}
                className="focus:ring-emerald-500 focus:border-emerald-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                placeholder="https://... (opcional)"
              />
              {imageError && (
                <div className="flex items-center gap-2 text-sm text-red-600 mt-1">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {imageError}
                </div>
              )}
              {!pendingFile && (
                <label className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-emerald-500 transition-colors cursor-pointer bg-gray-50 hover:bg-emerald-50">
                  <div className="space-y-1 text-center">
                    <Camera className="mx-auto h-10 w-10 text-gray-400" />
                    <span className="text-sm text-emerald-600 font-medium">
                      Cambiar imagen (archivo)
                    </span>
                    <p className="text-xs text-gray-500">
                      JPEG, PNG, GIF o WebP hasta 10MB
                    </p>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </div>
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="pt-5">
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/donor")}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
