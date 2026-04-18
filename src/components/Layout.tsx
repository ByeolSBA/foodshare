import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { Navbar } from '../components/Navbar';
import { isAdminRole } from '../utils/adminAccess';

export function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      <footer className="bg-white border-t border-gray-100 py-6">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} FoodShare. Conectando corazones.
        </div>
      </footer>
    </div>
  );
}

export function ProtectedRoute({ allowedRoles }: { allowedRoles: string[] }) {
  const { currentUser, isInitializing } = useStore();
  const location = useLocation();

  if (isInitializing) {
    return null;
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(currentUser.role)) {
    const home = isAdminRole(currentUser.role) ? '/admin' : `/${currentUser.role}`;
    return <Navigate to={home} replace />;
  }

  return <Outlet />;
}
