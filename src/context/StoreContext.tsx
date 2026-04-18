import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User, Donation, Message, UserRole } from "../types";
import { loginApi, registerApi, profileApi } from "../services/authService";
import {
  fetchDonations,
  createDonation as createDonationApi,
  updateDonation as updateDonationApi,
  deleteDonation as deleteDonationApi,
  claimDonation as claimDonationApi,
  cancelClaim as cancelClaimApi,
  collectDonation as collectDonationApi,
  acceptTransport as acceptTransportApi,
  deliverDonation as deliverDonationApi,
  requestCancelDonation as requestCancelDonationApi,
  approveCancelDonation as approveCancelDonationApi,
  rejectCancelDonation as rejectCancelDonationApi,
  DonationPayload,
} from "../services/donationService";
import { sendMessageApi, fetchConversation } from "../services/messageService";

interface StoreContextType {
  currentUser: User | null;
  authToken: string | null;
  users: User[];
  donations: Donation[];
  messages: Message[];
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  register: (
    name: string,
    email: string,
    password: string,
    role: UserRole,
  ) => Promise<User>;
  addDonation: (
    donation: Omit<
      Donation,
      "id" | "createdAt" | "status" | "donorId" | "donorName"
    >,
  ) => Promise<void>;
  cancelDonation: (donationId: string) => Promise<void>;
  editDonation: (
    donationId: string,
    donationData: Omit<
      Donation,
      "id" | "createdAt" | "status" | "donorId" | "donorName"
    >,
  ) => Promise<void>;
  claimDonation: (donationId: string) => Promise<void>;
  cancelClaim: (donationId: string) => Promise<void>;
  collectDonation: (donationId: string) => Promise<void>;
  acceptTransport: (donationId: string) => Promise<void>;
  deliverDonation: (donationId: string) => Promise<void>;
  requestCancelDonation: (donationId: string) => Promise<void>;
  approveCancelDonation: (donationId: string) => Promise<void>;
  rejectCancelDonation: (donationId: string) => Promise<void>;
  updateDonationStatus: (
    donationId: string,
    status: Donation["status"],
  ) => Promise<void>;
  sendMessage: (
    receiverId: string,
    content: string,
    donationId: string,
  ) => Promise<void>;
  loadConversation: (userId: string, donationId?: string) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const INITIAL_USERS: User[] = [];
const INITIAL_DONATIONS: Donation[] = [];

export const StoreProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    const storedUser = localStorage.getItem("foodshare_user");
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("foodshare_token");
  });
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [donations, setDonations] = useState<Donation[]>(INITIAL_DONATIONS);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const storedToken =
      typeof window !== "undefined"
        ? localStorage.getItem("foodshare_token")
        : null;
    const storedUser =
      typeof window !== "undefined"
        ? localStorage.getItem("foodshare_user")
        : null;

    if (storedToken && storedUser) {
      setToken(storedToken);
      setCurrentUser(JSON.parse(storedUser));
    }

    setIsInitializing(false);
  }, []);

  useEffect(() => {
    const loadDonations = async () => {
      if (!token) return;
      try {
        const data = await fetchDonations(token);
        setDonations(data);
      } catch (error) {
        console.error("Error cargando donaciones:", error);
      }
    };

    if (token) {
      // Cargar donaciones inmediatamente
      loadDonations();

      // Configurar polling cada 3 segundos para sincronizar cambios en tiempo real
      const interval = setInterval(() => {
        loadDonations();
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [token]);

  useEffect(() => {
    const refreshProfile = async () => {
      if (!token) return;
      try {
        const profile = await profileApi(token);
        setCurrentUser(profile as User);
        localStorage.setItem("foodshare_user", JSON.stringify(profile));
      } catch (error) {
        console.warn(
          "Token inválido o expirado, permaneciendo logged in con datos locales",
        );
        // No hacer logout, mantener el user de localStorage
      }
    };

    if (token && !currentUser) {
      refreshProfile();
    }
  }, [token, currentUser]);

  const login = async (email: string, password: string): Promise<User> => {
    const data = await loginApi(email, password);
    if (data.error) {
      throw new Error(data.error);
    }

    localStorage.setItem("foodshare_token", data.token);
    localStorage.setItem("foodshare_user", JSON.stringify(data.user));
    setToken(data.token);
    setCurrentUser(data.user as User);

    const donationsData = await fetchDonations(data.token);
    setDonations(donationsData);

    return data.user as User;
  };

  const logout = () => {
    localStorage.removeItem("foodshare_token");
    localStorage.removeItem("foodshare_user");
    setCurrentUser(null);
    setToken(null);
    setDonations([]);
    setUsers([]);
    setMessages([]);
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: UserRole,
  ): Promise<User> => {
    const data = await registerApi(name, email, password, role);
    if (data.error) {
      throw new Error(data.error);
    }

    localStorage.setItem("foodshare_token", data.token);
    localStorage.setItem("foodshare_user", JSON.stringify(data.user));
    setToken(data.token);
    setCurrentUser(data.user as User);

    const donationsData = await fetchDonations(data.token);
    setDonations(donationsData);

    return data.user as User;
  };

  const addDonation = async (
    donationData: Omit<
      Donation,
      "id" | "createdAt" | "status" | "donorId" | "donorName"
    >,
  ) => {
    if (!token || !currentUser) {
      throw new Error("Usuario no autenticado");
    }

    const payload: DonationPayload = {
      title: donationData.title,
      description: donationData.description,
      quantity: donationData.quantity,
      expirationDate: donationData.expirationDate,
      location: donationData.location,
      imageUrl: donationData.imageUrl,
      coordinates: donationData.coordinates,
    };

    await createDonationApi(payload, token);
    const donationsData = await fetchDonations(token);
    setDonations(donationsData);
  };

  const editDonation = async (
    donationId: string,
    donationData: Omit<
      Donation,
      "id" | "createdAt" | "status" | "donorId" | "donorName"
    >,
  ) => {
    if (!token || !currentUser) {
      throw new Error("Usuario no autenticado");
    }

    const payload: DonationPayload = {
      title: donationData.title,
      description: donationData.description,
      quantity: donationData.quantity,
      expirationDate: donationData.expirationDate,
      location: donationData.location,
      imageUrl: donationData.imageUrl,
      coordinates: donationData.coordinates,
    };

    await updateDonationApi(donationId, payload, token);
    const donationsData = await fetchDonations(token);
    setDonations(donationsData);
  };

  const cancelDonation = async (donationId: string) => {
    if (!token || !currentUser) {
      throw new Error("Usuario no autenticado");
    }

    await deleteDonationApi(donationId, token);
    setDonations((prev) => prev.filter((d) => d.id !== donationId));
  };

  const claimDonation = async (donationId: string) => {
    if (!token) {
      throw new Error("Usuario no autenticado");
    }

    await claimDonationApi(donationId, token);
    setDonations((prev) =>
      prev.map((d) =>
        d.id === donationId
          ? { ...d, status: "reserved", claimedBy: currentUser?.id }
          : d,
      ),
    );
  };

  const cancelClaim = async (donationId: string) => {
    if (!token) {
      throw new Error("Usuario no autenticado");
    }

    await cancelClaimApi(donationId, token);
    setDonations((prev) =>
      prev.map((d) =>
        d.id === donationId
          ? { ...d, status: "available", claimedBy: undefined }
          : d,
      ),
    );
  };

  const collectDonation = async (donationId: string) => {
    if (!token) {
      throw new Error("Usuario no autenticado");
    }

    await collectDonationApi(donationId, token);
    setDonations((prev) =>
      prev.map((d) =>
        d.id === donationId ? { ...d, status: "collected" } : d,
      ),
    );
  };

  const acceptTransport = async (donationId: string) => {
    if (!token) {
      throw new Error("Usuario no autenticado");
    }

    await acceptTransportApi(donationId, token);
    setDonations((prev) =>
      prev.map((d) =>
        d.id === donationId
          ? { ...d, status: "collected", transportedBy: currentUser?.id }
          : d,
      ),
    );
  };

  const deliverDonation = async (donationId: string) => {
    if (!token) {
      throw new Error("Usuario no autenticado");
    }

    await deliverDonationApi(donationId, token);
    setDonations((prev) =>
      prev.map((d) =>
        d.id === donationId ? { ...d, status: "delivered" } : d,
      ),
    );
  };

  const updateDonationStatus = async (
    donationId: string,
    status: Donation["status"],
  ) => {
    if (status === "delivered") {
      await deliverDonation(donationId);
      return;
    }

    setDonations((prev) =>
      prev.map((d) => (d.id === donationId ? { ...d, status } : d)),
    );
  };

  const requestCancelDonation = async (donationId: string) => {
    if (!token) {
      throw new Error("Usuario no autenticado");
    }

    await requestCancelDonationApi(donationId, token);
    setDonations((prev) =>
      prev.map((d) =>
        d.id === donationId ? { ...d, status: "cancel_pending" } : d,
      ),
    );
  };

  const approveCancelDonation = async (donationId: string) => {
    if (!token) {
      throw new Error("Usuario no autenticado");
    }

    await approveCancelDonationApi(donationId, token);
    setDonations((prev) =>
      prev.map((d) =>
        d.id === donationId ? { ...d, status: "cancelled" } : d,
      ),
    );
  };

  const rejectCancelDonation = async (donationId: string) => {
    if (!token) {
      throw new Error("Usuario no autenticado");
    }

    await rejectCancelDonationApi(donationId, token);
    setDonations((prev) =>
      prev.map((d) => {
        if (d.id === donationId) {
          // Volver al estado anterior
          const previousStatus = d.claimedBy ? "reserved" : "available";
          return { ...d, status: previousStatus };
        }
        return d;
      }),
    );
  };

  const sendMessage = async (
    receiverId: string,
    content: string,
    donationId: string,
  ) => {
    if (!token) {
      throw new Error("Usuario no autenticado");
    }

    await sendMessageApi(receiverId, content, donationId, token);
    // Recargar conversación para obtener el mensaje nuevo
    await loadConversation(receiverId, donationId);
  };

  const loadConversation = async (userId: string, donationId?: string) => {
    if (!token) {
      console.warn("loadConversation: No token available");
      return;
    }

    try {
      console.log(
        "Loading conversation with user:",
        userId,
        "donationId:",
        donationId,
      );
      const conversation = await fetchConversation(userId, donationId, token);
      console.log("Conversation loaded:", conversation);
      setMessages(conversation);
    } catch (error) {
      console.error("Error cargando conversación:", error);
      throw error; // Re-throw para que ChatPage pueda verlo
    }
  };

  return (
    <StoreContext.Provider
      value={{
        currentUser,
        authToken: token,
        users,
        donations,
        messages,
        isInitializing,
        login,
        logout,
        register,
        addDonation,
        cancelDonation,
        editDonation,
        claimDonation,
        cancelClaim,
        collectDonation,
        acceptTransport,
        deliverDonation,
        requestCancelDonation,
        approveCancelDonation,
        rejectCancelDonation,
        updateDonationStatus,
        sendMessage,
        loadConversation,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
};
