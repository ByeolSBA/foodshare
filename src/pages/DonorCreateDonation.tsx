import React, { useEffect, useState } from "react";
import { useStore } from "../context/StoreContext";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Camera, Calendar, Package, X, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { uploadDonationImage } from "../services/donationService";
import { LocationPickerFixed as LocationPicker } from "../components/LocationPickerFixed";

export default function DonorCreateDonation() {
  const { addDonation, authToken } = useStore();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedCoordinates, setSelectedCoordinates] = useState<
    { lat: number; lng: number } | undefined
  >(undefined);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

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

    setImageFile(file);
  };

  const removeImage = () => {
    setImageFile(null);
  };

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    setSubmitError("");
    try {
      let imageUrl: string | undefined;

      if (imageFile) {
        if (!authToken) {
          throw new Error("Sesión no válida");
        }
        imageUrl = await uploadDonationImage(imageFile, authToken);
      } else {
        const ext = data.externalImageUrl?.trim();
        if (ext) imageUrl = ext;
      }

      await addDonation({
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
          : "No se pudo publicar la donación. Intenta de nuevo.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
            Publicar Nueva Donación
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Completa los detalles para que las ONGs puedan encontrar tu ayuda.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-8 divide-y divide-gray-200"
      >
        <div className="space-y-6 sm:space-y-5">
          {/* Title */}
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

          {/* Description */}
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

          {/* Quantity */}
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

          {/* Expiration Date */}
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

          {/* Location with Interactive Map */}
          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
            <label className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">
              Ubicación de retiro
            </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <LocationPicker
                initialAddress={selectedLocation}
                initialCoordinates={selectedCoordinates}
                onLocationChange={(address, coordinates) => {
                  // Si el usuario hizo clic en el mapa sin escribir dirección,
                  // usar las coordenadas como fallback para que el campo no quede vacío.
                  const loc = address?.trim()
                    ? address.trim()
                    : `${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)}`;
                  setSelectedLocation(loc);
                  setSelectedCoordinates(coordinates);
                  setValue("location", loc, { shouldValidate: true });
                }}
                placeholder="Ingresa la dirección (ej: Carrera 2 #21-321, Popayán)"
              />

              {/* Hidden field for form validation - mejorado */}
              <input
                type="hidden"
                {...register("location", {
                  // No usar `required` aquí porque falla con string vacío ANTES
                  // de evaluar `validate`. Toda la lógica va en validate.
                  validate: (value) => {
                    if (selectedCoordinates?.lat && selectedCoordinates?.lng)
                      return true;
                    if (value?.trim()) return true;
                    return "Selecciona una ubicación en el mapa o ingresa una dirección";
                  },
                })}
                value={selectedLocation || ""}
              />
              {errors.location && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.location.message as string}
                </p>
              )}
            </div>
          </div>

          {/* Image: URL or file */}
          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
            <label className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">
              Foto de los alimentos
            </label>
            <div className="mt-1 sm:mt-0 sm:col-span-2 space-y-4 max-w-lg">
              <p className="text-xs text-gray-500">
                Puedes pegar una <strong>URL</strong> de imagen o{" "}
                <strong>subir un archivo</strong> desde tu equipo. Si eliges
                archivo, tendrá prioridad sobre la URL.
              </p>
              <input
                type="url"
                {...register("externalImageUrl")}
                className="focus:ring-emerald-500 focus:border-emerald-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                placeholder="https://ejemplo.com/mi-foto.jpg (opcional)"
              />
              {imageError && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {imageError}
                </div>
              )}
              {previewUrl ? (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Vista previa"
                    className="w-full h-64 object-cover rounded-md"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    aria-label="Quitar imagen"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <label className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-emerald-500 transition-colors cursor-pointer bg-gray-50 hover:bg-emerald-50">
                  <div className="space-y-1 text-center">
                    <Camera className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600 justify-center">
                      <span className="text-emerald-600 hover:text-emerald-500 font-medium">
                        Sube un archivo
                      </span>
                      <p className="pl-1">desde tu ordenador</p>
                    </div>
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
              {isSubmitting ? "Publicando..." : "Publicar Donación"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
