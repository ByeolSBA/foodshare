import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { DonationCardFinal as DonationCard } from '../components/DonationCardFinal';
import { Map, List, Clock, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Donation } from '../types';
import { fetchNgoRequests } from '../services/donationService';

export default function NgoDashboard() {
  const { currentUser } = useStore();
  const [myClaims, setMyClaims] = useState<Donation[]>([]);

  const loadClaims = useCallback(async () => {
    const token = localStorage.getItem('foodshare_token');
    if (!token) return;
    try {
      const data = await fetchNgoRequests(token);
      setMyClaims(data);
    } catch (e) {
      console.error('Error cargando solicitudes ONG:', e);
    }
  }, []);

  useEffect(() => {
    void loadClaims();
    const t = setInterval(() => void loadClaims(), 4000);
    return () => clearInterval(t);
  }, [loadClaims]);

  const activeClaims = myClaims.filter((d) => d.status === 'reserved' || d.status === 'cancel_pending');
  const deliveredClaims = myClaims.filter((d) => d.status === 'delivered');

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hola, {currentUser?.name} 👋</h1>
          <p className="text-gray-500">Gestiona tus solicitudes de alimentos.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/ngo/requests">
            <Button variant="outline" className="w-full sm:w-auto">
              <List className="mr-2 h-4 w-4" />
              Ver todas las solicitudes
            </Button>
          </Link>
          <Link to="/ngo/map">
            <Button className="w-full sm:w-auto">
              <Map className="mr-2 h-4 w-4" />
              Ver Mapa de Donaciones
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg p-5 flex items-center">
          <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
            <Clock className="h-6 w-6 text-yellow-600" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">En curso / pendiente</dt>
              <dd className="text-2xl font-semibold text-gray-900">{activeClaims.length}</dd>
            </dl>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg p-5 flex items-center">
          <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Recibidas</dt>
              <dd className="text-2xl font-semibold text-gray-900">{deliveredClaims.length}</dd>
            </dl>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Solicitudes que requieren atención</h2>
        <p className="text-sm text-gray-500 mb-4">
          Reservadas o con cancelación pendiente. Para acciones (recolectar, entregar, aceptar cancelación) usa{' '}
          <Link to="/ngo/requests" className="text-emerald-600 font-medium hover:underline">
            Solicitudes
          </Link>
          .
        </p>
        {activeClaims.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeClaims.map((donation) => (
              <DonationCard key={donation.id} donation={donation} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200 border-dashed">
            <List className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No tienes solicitudes en curso</h3>
            <p className="mt-1 text-sm text-gray-500">Busca donaciones disponibles en tu zona.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Link to="/ngo/map">
                <Button variant="outline">Buscar donaciones</Button>
              </Link>
              <Button type="button" variant="ghost" onClick={() => void loadClaims()}>
                Actualizar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
