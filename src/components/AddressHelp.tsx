import { useState } from 'react';
import { Info, MapPin, X } from 'lucide-react';

interface AddressHelpProps {
  onClose?: () => void;
}

export function AddressHelp({ onClose }: AddressHelpProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 relative">
      <button
        onClick={() => {
          setIsVisible(false);
          onClose?.();
        }}
        className="absolute top-2 right-2 text-blue-500 hover:text-blue-700"
      >
        <X className="h-4 w-4" />
      </button>
      
      <div className="flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="space-y-2 text-sm text-blue-800">
          <h3 className="font-semibold text-blue-900">¿Cómo escribir la dirección?</h3>
          
          <div className="space-y-1">
            <p className="font-medium">Formato recomendado:</p>
            <div className="bg-white rounded p-2 font-mono text-xs">
              Calle/Carrera + # + número, Ciudad
            </div>
          </div>

          <div className="space-y-1">
            <p className="font-medium">Ejemplos para Popayán:</p>
            <ul className="space-y-1 text-xs">
              <li>· <code className="bg-blue-100 px-1 rounded">Carrera 2 #21-321, Popayán</code></li>
              <li>· <code className="bg-blue-100 px-1 rounded">Calle 5 #10-45, Popayán</code></li>
              <li>· <code className="bg-blue-100 px-1 rounded">Avenida 6 #15-89, Popayán, Colombia</code></li>
            </ul>
          </div>

          <div className="space-y-1">
            <p className="font-medium">Consejos:</p>
            <ul className="space-y-1 text-xs">
              <li>· Incluir siempre la ciudad (Popayán)</li>
              <li>· Usar el formato estándar colombiano</li>
              <li>· Ser lo más específico posible</li>
              <li>· El sistema agregará "Colombia" automáticamente</li>
            </ul>
          </div>

          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-blue-200">
            <MapPin className="h-4 w-4 text-blue-600" />
            <span className="text-xs">El sistema mapeará automáticamente tu dirección</span>
          </div>
        </div>
      </div>
    </div>
  );
}
