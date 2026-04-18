import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useNavigate, Link } from 'react-router-dom';
import { UserRole } from '../types';
import { User, Mail, Lock, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useStore();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('donor');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password) {
      setError('Completa todos los campos para registrarte.');
      return;
    }

    try {
      const user = await register(name, email, password, role);
      navigate(`/${user.role}`);
    } catch (err: any) {
      setError(err.message || 'Error al registrar usuario.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Únete a FoodShare
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-emerald-600 hover:text-emerald-500">
            Inicia sesión
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nombre Completo / Organización
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  id="name"
                  type="text"
                  required
                  className="appearance-none block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  type="password"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quiero ser
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {(['donor', 'ngo', 'volunteer'] as const).map((r) => (
                  <div
                    key={r}
                    className={`relative rounded-lg border p-3 flex cursor-pointer focus:outline-none ${
                      role === r
                        ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500'
                        : 'border-gray-300 bg-white hover:bg-gray-50'
                    }`}
                    onClick={() => setRole(r)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="block text-sm font-medium text-gray-900 capitalize">
                        {r === 'donor' ? 'Donante' : r === 'ngo' ? 'ONG' : 'Voluntario'}
                      </span>
                      {role === r && (
                        <CheckCircle className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}
            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              >
                Registrarse
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
