import { Link } from "react-router-dom";
import { useStore } from "../../context/StoreContext";
import { adminCan } from "../../utils/adminAccess";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Package,
  Award,
  UserCog,
  Eraser,
  Radio,
} from "lucide-react";
import type { AdminPermissionKey } from "../../services/adminService";

type CardDef =
  | { to: string; label: string; icon: LucideIcon; perm: AdminPermissionKey }
  | { to: string; label: string; icon: LucideIcon; superOnly: true };

export default function AdminDashboard() {
  const { currentUser } = useStore();

  const cards: CardDef[] = [
    { to: "/admin/users", label: "Usuarios", icon: Users, perm: "view_users" },
    {
      to: "/admin/messages",
      label: "Mensajes",
      icon: MessageSquare,
      perm: "view_messages",
    },
    {
      to: "/admin/donations",
      label: "Donaciones",
      icon: Package,
      perm: "view_donations",
    },
    {
      to: "/admin/certificates",
      label: "Certificados",
      icon: Award,
      perm: "view_certificates",
    },
    {
      to: "/admin/staff",
      label: "Equipo admin",
      icon: UserCog,
      superOnly: true,
    },
    {
      to: "/admin/maintenance",
      label: "Mantenimiento",
      icon: Eraser,
      superOnly: true,
    },
    {
      to: "/admin/voice",
      label: "Canales de voz",
      icon: Radio,
      superOnly: true,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <LayoutDashboard className="h-7 w-7 text-emerald-600" />
          Panel de administración
        </h1>
        <p className="text-gray-500 mt-1">
          Hola, {currentUser?.name}.{" "}
          {currentUser?.role === "super_admin"
            ? "Tienes acceso total."
            : "Tus permisos dependen de lo que te haya asignado el super administrador."}
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(({ to, label, icon: Icon, ...rest }) => {
          if (
            "superOnly" in rest &&
            rest.superOnly &&
            currentUser?.role !== "super_admin"
          )
            return null;
          if ("perm" in rest && !adminCan(currentUser, rest.perm)) return null;
          return (
            <Link
              key={to}
              to={to}
              className="block rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:border-emerald-400 hover:shadow transition"
            >
              <Icon className="h-8 w-8 text-emerald-600 mb-3" />
              <h2 className="font-semibold text-gray-900">{label}</h2>
              <p className="text-sm text-gray-500 mt-1">Gestionar →</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
