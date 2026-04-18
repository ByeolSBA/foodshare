import { createBrowserRouter } from "react-router-dom";
import AdminVoiceChannels from "../pages/admin/AdminVoiceChannels";
import { Layout, ProtectedRoute } from "../components/Layout";
import { StoreProvider } from "../context/StoreContext";
import {
  LandingPage,
  LoginPage,
  RegisterPage,
  DonorDashboard,
  DonorCreateDonation,
  DonorHistory,
  DonorEditDonation,
  NgoDashboard,
  NgoMap,
  NgoRequests,
  CertificatesPage,
  VolunteerDashboard,
  VolunteerAvailable,
  ChatPage,
  AdminDashboard,
  AdminUsers,
  AdminMessages,
  AdminDonations,
  AdminCertificates,
  AdminStaff,
  AdminMaintenance,
} from "../pages";

function RootWrapper() {
  return (
    <StoreProvider>
      <Layout />
    </StoreProvider>
  );
}

export const router = createBrowserRouter(
  [
    {
      path: "/",
      Component: RootWrapper,
      children: [
        { index: true, Component: LandingPage },
        { path: "login", Component: LoginPage },
        { path: "register", Component: RegisterPage },

        // Donor Routes
        {
          path: "donor",
          element: <ProtectedRoute allowedRoles={["donor"]} />,
          children: [
            { index: true, Component: DonorDashboard },
            { path: "create", Component: DonorCreateDonation },
            { path: "edit/:id", Component: DonorEditDonation },
            { path: "history", Component: DonorHistory },
          ],
        },

        // NGO Routes
        {
          path: "ngo",
          element: <ProtectedRoute allowedRoles={["ngo"]} />,
          children: [
            { index: true, Component: NgoDashboard },
            { path: "map", Component: NgoMap },
            { path: "requests", Component: NgoRequests },
          ],
        },

        // Volunteer Routes
        {
          path: "volunteer",
          element: <ProtectedRoute allowedRoles={["volunteer"]} />,
          children: [
            { index: true, Component: VolunteerDashboard },
            { path: "available", Component: VolunteerAvailable },
          ],
        },
        {
          path: "certificates",
          element: (
            <ProtectedRoute allowedRoles={["donor", "ngo", "volunteer"]} />
          ),
          children: [{ index: true, Component: CertificatesPage }],
        },
        {
          path: "chat/:userId",
          element: (
            <ProtectedRoute allowedRoles={["donor", "ngo", "volunteer"]} />
          ),
          children: [{ index: true, Component: ChatPage }],
        },
        {
          path: "admin",
          element: <ProtectedRoute allowedRoles={["super_admin", "admin"]} />,
          children: [
            { index: true, Component: AdminDashboard },
            { path: "users", Component: AdminUsers },
            { path: "messages", Component: AdminMessages },
            { path: "donations", Component: AdminDonations },
            { path: "certificates", Component: AdminCertificates },
            { path: "staff", Component: AdminStaff },
            { path: "maintenance", Component: AdminMaintenance },
            { path: "voice", Component: AdminVoiceChannels },
          ],
        },
      ],
    },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
    },
  },
);
