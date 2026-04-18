import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { LogOut, Menu } from 'lucide-react';
import { useState } from 'react';
import { adminCan, isAdminRole } from '../utils/adminAccess';

export function Navbar() {
  const store = useStore();
  const { currentUser, logout } = store;
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  if (!currentUser) return null;

  const roleLabels: Record<string, string> = {
    donor: 'Donador',
    ngo: 'ONG',
    volunteer: 'Voluntario',
    super_admin: 'Super admin',
    admin: 'Administrador',
  };

  const getLinks = () => {
    if (isAdminRole(currentUser.role)) {
      const links = [{ to: '/admin', label: 'Panel admin' }];
      if (adminCan(currentUser, 'view_users')) links.push({ to: '/admin/users', label: 'Usuarios' });
      if (adminCan(currentUser, 'view_messages')) links.push({ to: '/admin/messages', label: 'Mensajes' });
      if (adminCan(currentUser, 'view_donations')) links.push({ to: '/admin/donations', label: 'Donaciones' });
      if (adminCan(currentUser, 'view_certificates')) links.push({ to: '/admin/certificates', label: 'Certificados' });
      if (currentUser.role === 'super_admin') {
        links.push({ to: '/admin/staff', label: 'Equipo' });
        links.push({ to: '/admin/maintenance', label: 'Mantenimiento' });
      }
      return links;
    }
    switch (currentUser.role) {
      case 'donor':
        return [
          { to: '/donor', label: 'Dashboard' },
          { to: '/donor/create', label: 'Donar' },
          { to: '/donor/history', label: 'Historial' },
          { to: '/certificates', label: 'Certificados' },
        ];
      case 'ngo':
        return [
          { to: '/ngo', label: 'Dashboard' },
          { to: '/ngo/map', label: 'Mapa' },
          { to: '/ngo/requests', label: 'Solicitudes' },
          { to: '/certificates', label: 'Certificados' },
        ];
      case 'volunteer':
        return [
          { to: '/volunteer', label: 'Dashboard' },
          { to: '/volunteer/available', label: 'Disponibles' },
          { to: '/certificates', label: 'Certificados' },
        ];
      default:
        return [];
    }
  };

  return (
    <nav className="bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link
                to={isAdminRole(currentUser.role) ? '/admin' : '/'}
                className="text-2xl font-bold text-emerald-600 flex items-center gap-2"
              >
                🍏 FoodShare
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {getLinks().map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive(link.to)
                      ? 'border-emerald-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center gap-4">
            <span className="text-sm text-gray-500">{currentUser.name} ({roleLabels[currentUser.role]})</span>
            <button
              onClick={logout}
              className="p-2 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {getLinks().map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  isActive(link.to)
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                    : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={() => {
                logout();
                setIsMenuOpen(false);
              }}
              className="block w-full text-left pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}