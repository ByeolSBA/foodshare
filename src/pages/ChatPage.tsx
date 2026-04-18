import React, { useState, useEffect, useRef } from "react";
import VoiceCall from "../components/VoiceCall";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { Button } from "../components/ui/Button";
import {
  MessageCircle,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Send,
} from "lucide-react";
import { getUserByIdApi } from "../services/authService";
import { Donation } from "../types";

export default function ChatPage() {
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    currentUser,
    messages,
    sendMessage,
    loadConversation,
    donations,
    requestCancelDonation,
    approveCancelDonation,
    rejectCancelDonation,
  } = useStore();

  const [content, setContent] = useState("");
  const [chatUserName, setChatUserName] = useState<string>("");
  const [donation, setDonation] = useState<Donation | null>(null);
  const [sendError, setSendError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  // Ref for auto-scroll to the latest message
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const donationId = searchParams.get("donationId");

  // Load conversation on mount / when params change
  useEffect(() => {
    if (!userId || !donationId) return;

    const token = localStorage.getItem("foodshare_token");
    if (!token) return;

    loadConversation(userId, donationId).catch(() => {
      setSendError(
        "No se pudo cargar la conversación. Intenta recargar la página.",
      );
    });

    // Resolve the other user's name from donations cache first, then API
    let resolved = false;

    if (currentUser?.role === "donor") {
      const found = donations.find((d) => d.id === donationId);
      if (found && found.claimedBy === userId && found.claimedByName) {
        setChatUserName(found.claimedByName);
        resolved = true;
      }
    }

    if (currentUser?.role === "ngo") {
      const found = donations.find((d) => d.id === donationId);
      if (found && found.donorId === userId && found.donorName) {
        setChatUserName(found.donorName);
        resolved = true;
      }
    }

    if (!resolved) {
      getUserByIdApi(userId, token)
        .then((user) => setChatUserName(user.name))
        .catch(() => setChatUserName(""));
    }
  }, [userId, donationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resolve donation object
  useEffect(() => {
    if (!donationId || donations.length === 0) {
      setDonation(null);
      return;
    }
    const found = donations.find((d) => d.id === donationId);
    setDonation(found ?? null);
  }, [donationId, donations]);

  // Auto-scroll to the bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!currentUser || !userId) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <p className="text-gray-500">Selecciona una conversación válida.</p>
        </div>
      </div>
    );
  }

  if (!donationId) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <p className="text-gray-500">
            Este chat requiere un identificador de donación para mantenerse
            separado.
          </p>
        </div>
      </div>
    );
  }

  const conversation = messages.filter(
    (message) =>
      ((message.senderId === currentUser.id && message.receiverId === userId) ||
        (message.senderId === userId &&
          message.receiverId === currentUser.id)) &&
      (!donationId || message.donationId === donationId),
  );

  const handleSend = async () => {
    if (!content.trim()) return;
    setSendError("");

    if (donation?.status === "delivered") {
      setSendError(
        "Este chat está cerrado porque la donación ya fue entregada.",
      );
      return;
    }

    try {
      await sendMessage(userId, content.trim(), donationId);
      setContent("");
    } catch (error) {
      setSendError(
        error instanceof Error
          ? error.message
          : "Error al enviar el mensaje. Verifica tu conexión.",
      );
    }
  };

  const runAction = async (label: string, fn: () => Promise<void>) => {
    setActionBusy(true);
    setActionError("");
    setActionSuccess("");
    try {
      await fn();
      setActionSuccess(`${label} correctamente.`);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : `Error: ${label.toLowerCase()}.`,
      );
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {chatUserName
              ? `Conversación con: ${chatUserName}`
              : "Chat de coordinación"}
          </h1>
          <p className="text-sm text-gray-500">
            Conversa con la otra parte para coordinar el retiro.
          </p>
        </div>
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>

      {/* Voice call — only available when there's a donationId */}
      {donationId && userId && (
        <VoiceCall donationId={donationId} otherUserId={userId} />
      )}

      {/* Action feedback banners */}
      {actionError && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="flex-1">{actionError}</span>
          <button
            type="button"
            className="ml-auto font-bold leading-none opacity-60 hover:opacity-100"
            onClick={() => setActionError("")}
          >
            ×
          </button>
        </div>
      )}
      {actionSuccess && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="flex-1">{actionSuccess}</span>
          <button
            type="button"
            className="ml-auto font-bold leading-none opacity-60 hover:opacity-100"
            onClick={() => setActionSuccess("")}
          >
            ×
          </button>
        </div>
      )}

      <div className="bg-white shadow rounded-xl overflow-hidden border border-gray-200">
        {/* Chat title bar */}
        <div className="p-4 border-b border-gray-200 flex items-center gap-3">
          <MessageCircle className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {chatUserName || "Conversación"}
            </p>
            {donation && (
              <p className="text-xs text-gray-500 truncate max-w-xs">
                Donación: {donation.title}
              </p>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="p-4 h-[50vh] overflow-y-auto space-y-3 bg-gray-50">
          {conversation.length > 0 ? (
            <>
              {conversation.map((message) => {
                const isOwn = message.senderId === currentUser.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                        isOwn
                          ? "bg-emerald-600 text-white rounded-br-sm"
                          : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm"
                      }`}
                    >
                      <p className="text-sm leading-relaxed">
                        {message.content}
                      </p>
                      <p
                        className={`mt-1 text-xs ${
                          isOwn ? "text-emerald-200" : "text-gray-400"
                        } text-right`}
                      >
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
              {/* Invisible anchor for auto-scroll */}
              <div ref={messagesEndRef} />
            </>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-400 text-sm text-center">
                No hay mensajes todavía.
                <br />
                Envía el primero para coordinar el retiro.
              </p>
            </div>
          )}
        </div>

        {/* Donation actions panel */}
        {donation && (
          <div
            className={`border-t p-4 ${
              donation.status === "cancel_pending"
                ? "bg-yellow-50 border-yellow-200"
                : "bg-gray-50"
            }`}
          >
            <div className="mb-3">
              <p className="font-semibold text-gray-900">{donation.title}</p>
              <p className="text-sm text-gray-600">{donation.description}</p>
              <p
                className={`text-sm font-semibold mt-1 ${
                  donation.status === "cancel_pending"
                    ? "text-yellow-700"
                    : "text-gray-700"
                }`}
              >
                Estado:{" "}
                {donation.status === "cancel_pending"
                  ? "Cancelación solicitada"
                  : donation.status}
              </p>
            </div>

            {donation.status === "cancel_pending" &&
            donation.cancelRequestedBy &&
            donation.cancelRequestedBy !== currentUser?.id ? (
              <div className="space-y-2">
                <p className="text-sm text-yellow-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  La otra parte solicita cancelar este trato
                </p>
                <div className="flex gap-2">
                  <Button
                    disabled={actionBusy}
                    onClick={() =>
                      runAction("Trato cancelado", () =>
                        approveCancelDonation(donation.id),
                      )
                    }
                    variant="danger"
                  >
                    {actionBusy ? "Procesando…" : "Aceptar cancelación"}
                  </Button>
                  <Button
                    disabled={actionBusy}
                    onClick={() =>
                      runAction("Cancelación rechazada", () =>
                        rejectCancelDonation(donation.id),
                      )
                    }
                    variant="secondary"
                  >
                    {actionBusy ? "Procesando…" : "Rechazar"}
                  </Button>
                </div>
              </div>
            ) : donation.status === "cancel_pending" &&
              donation.cancelRequestedBy === currentUser?.id ? (
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                Esperando respuesta de la otra parte…
              </p>
            ) : donation.status !== "delivered" ? (
              <Button
                disabled={actionBusy}
                onClick={() =>
                  runAction("Solicitud de cancelación enviada", () =>
                    requestCancelDonation(donation.id),
                  )
                }
                variant="danger"
              >
                {actionBusy ? "Procesando…" : "Solicitar cancelación de trato"}
              </Button>
            ) : null}
          </div>
        )}

        {/* Message input */}
        <div className="p-4 border-t border-gray-200 bg-white">
          {donation?.status === "delivered" ? (
            <div className="text-center py-3">
              <div className="bg-gray-100 rounded-xl px-4 py-3 text-gray-500 text-sm">
                Este chat está cerrado porque la donación ya fue entregada.
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {sendError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span className="flex-1">{sendError}</span>
                  <button
                    type="button"
                    className="ml-auto font-bold leading-none opacity-60 hover:opacity-100"
                    onClick={() => setSendError("")}
                  >
                    ×
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Escribe un mensaje… (Enter para enviar)"
                />
                <Button
                  onClick={() => void handleSend()}
                  disabled={!content.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
