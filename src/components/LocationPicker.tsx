import { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Loader2, AlertCircle } from 'lucide-react';
import { geocodeAddress } from '../services/donationService';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationPickerProps {
  initialAddress?: string;
  initialCoordinates?: { lat: number; lng: number };
  onLocationChange: (address: string, coordinates: { lat: number; lng: number }) => void;
  placeholder?: string;
}

export function LocationPicker({ 
  initialAddress = '', 
  initialCoordinates,
  onLocationChange,
  placeholder = 'Ingresa la dirección (ej: Carrera 2 #21-321, Popayán)'
}: LocationPickerProps) {
  const [address, setAddress] = useState(initialAddress);
  const [coordinates, setCoordinates] = useState(initialCoordinates || null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodingError, setGeocodingError] = useState('');
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Inicializar mapa
  useEffect(() => {
    if (!mapRef.current || !L || map) return;

    // Coordenadas por defecto: centro de Popayán
    const defaultCenter = coordinates || { lat: 2.4448, lng: -76.6147 };
    
    // Configurar icono por defecto para Leaflet
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
    
    const leafletMap = L.map(mapRef.current).setView([defaultCenter.lat, defaultCenter.lng], 15);

    // Agregar capa de tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(leafletMap);

    // Agregar marcador inicial si hay coordenadas
    if (coordinates) {
      const leafletMarker = L.marker([coordinates.lat, coordinates.lng], {
        draggable: true
      }).addTo(leafletMap);

      // Manejar arrastre del marcador
      leafletMarker.on('dragend', (event: any) => {
        const marker = event.target;
        const position = marker.getLatLng();
        const newCoords = { lat: position.lat, lng: position.lng };
        setCoordinates(newCoords);
        onLocationChange(address, newCoords);
        setGeocodingError('');
      });

      setMarker(leafletMarker);
    }

    // Manejar clic en el mapa
    leafletMap.on('click', (event: any) => {
      const position = event.latlng;
      const newCoords = { lat: position.lat, lng: position.lng };
      
      // Actualizar o crear marcador
      if (marker) {
        marker.setLatLng([position.lat, position.lng]);
      } else {
        const newMarker = L.marker([position.lat, position.lng], {
          draggable: true
        }).addTo(leafletMap);

        newMarker.on('dragend', (dragEvent: any) => {
          const dragMarker = dragEvent.target;
          const dragPosition = dragMarker.getLatLng();
          const dragCoords = { lat: dragPosition.lat, lng: dragPosition.lng };
          setCoordinates(dragCoords);
          onLocationChange(address, dragCoords);
          setGeocodingError('');
        });

        setMarker(newMarker);
      }

      setCoordinates(newCoords);
      onLocationChange(address, newCoords);
      setGeocodingError('');
    });

    setMap(leafletMap);

    return () => {
      if (leafletMap) {
        leafletMap.remove();
      }
    };
  }, [L, coordinates]);

  // Actualizar mapa cuando cambian las coordenadas por geocodificación
  useEffect(() => {
    if (map && coordinates && marker) {
      map.setView([coordinates.lat, coordinates.lng], 16);
      marker.setLatLng([coordinates.lat, coordinates.lng]);
    } else if (map && coordinates && !marker) {
      const newMarker = L.marker([coordinates.lat, coordinates.lng], {
        draggable: true
      }).addTo(map);

      newMarker.on('dragend', (event: any) => {
        const dragMarker = event.target;
        const position = dragMarker.getLatLng();
        const dragCoords = { lat: position.lat, lng: position.lng };
        setCoordinates(dragCoords);
        onLocationChange(address, dragCoords);
        setGeocodingError('');
      });

      setMarker(newMarker);
    }
  }, [map, coordinates, marker, address, onLocationChange]);

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;

    setIsGeocoding(true);
    setGeocodingError('');

    try {
      const result = await geocodeAddress(address);
      if (result) {
        setCoordinates(result);
        onLocationChange(address, result);
        setGeocodingError('');
      } else {
        setGeocodingError('No se pudo encontrar la dirección. Intenta ser más específico o selecciona la ubicación manualmente en el mapa.');
      }
    } catch (error) {
      setGeocodingError('Error al buscar la dirección. Por favor, selecciona la ubicación manualmente en el mapa.');
    } finally {
      setIsGeocoding(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Búsqueda de dirección */}
      <form onSubmit={handleAddressSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            disabled={isGeocoding}
          />
        </div>
        <button
          type="submit"
          disabled={!address.trim() || isGeocoding}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isGeocoding ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando...
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4" />
              Ubicar
            </>
          )}
        </button>
      </form>

      {/* Error de geocodificación */}
      {geocodingError && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-800">{geocodingError}</p>
        </div>
      )}

      {/* Coordenadas actuales */}
      {coordinates && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Coordenadas seleccionadas:</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Lat: {coordinates.lat.toFixed(6)}, Lng: {coordinates.lng.toFixed(6)}
          </p>
        </div>
      )}

      {/* Mapa interactivo */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">
            Selecciona la ubicación exacta en el mapa:
          </p>
          <p className="text-xs text-gray-500">
            Haz clic o arrastra el marcador
          </p>
        </div>
        <div 
          ref={mapRef} 
          className="h-64 rounded-lg border border-gray-300 overflow-hidden"
          style={{ minHeight: '256px' }}
        />
      </div>

      {/* Instrucciones */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>· Ingresa una dirección y haz clic en "Ubicar" para buscar automáticamente</p>
        <p>· O haz clic directamente en el mapa para seleccionar una ubicación</p>
        <p>· Arrastra el marcador para ajustar la posición exacta</p>
      </div>
    </div>
  );
}
