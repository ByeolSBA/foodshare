import { Donation } from '../types';
import { resolveDonationImageUrl } from '../services/apiClient';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MapPin, Calendar, CheckCircle, Clock, Truck } from 'lucide-react';
import { Button } from './ui/Button';

interface DonationAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}

interface DonationCardProps {
  donation: Donation;
  onAction?: () => void;
  actionLabel?: string;
  actions?: DonationAction[];
  showStatus?: boolean;
}

export function DonationCard({ donation, onAction, actionLabel, actions, showStatus = true }: DonationCardProps) {
  const statusColors = {
    available: 'bg-green-100 text-green-800',
    reserved: 'bg-yellow-100 text-yellow-800',
    collected: 'bg-blue-100 text-blue-800',
    delivered: 'bg-purple-100 text-purple-800',
    expired: 'bg-red-100 text-red-800',
    cancel_pending: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };

  const statusLabels = {
    available: 'Disponible',
    reserved: 'Reservado',
    collected: 'En camino',
    delivered: 'Entregado',
    expired: 'Vencido',
    cancel_pending: 'Cancelación pendiente',
    cancelled: 'Cancelado',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative h-48 bg-gray-200">
        <img 
          src={resolveDonationImageUrl(donation.imageUrl)} 
          alt={donation.title}
          className="w-full h-full object-cover"
        />
        {showStatus && (
          <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold ${statusColors[donation.status]}`}>
            {statusLabels[donation.status]}
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-900 mb-1">{donation.title}</h3>
        <p className="text-sm text-gray-500 mb-2">{donation.donorName}</p>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="h-4 w-4 mr-2 text-gray-400" />
            <span className="truncate">{donation.location}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="h-4 w-4 mr-2 text-gray-400" />
            <span>Vence: {format(new Date(donation.expirationDate), "d 'de' MMMM", { locale: es })}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <CheckCircle className="h-4 w-4 mr-2 text-gray-400" />
            <span>{donation.quantity}</span>
          </div>
        </div>

        {onAction && (
          <Button 
            onClick={onAction} 
            variant="primary" 
            className="w-full"
          >
            {actionLabel}
          </Button>
        )}
        {actions && actions.length > 0 && (
          <div className="space-y-2">
            {actions.map((action, index) => (
              <Button
                key={index}
                onClick={action.onClick}
                variant={action.variant || 'secondary'}
                className="w-full"
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
