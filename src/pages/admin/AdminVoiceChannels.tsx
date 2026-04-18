import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../../context/StoreContext";
import { getSocket } from "../../services/socketClient";
import {
  ArrowLeft,
  Radio,
  Users,
  Ear,
  PhoneOff,
  Volume2,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "../../components/ui/Button";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChannelParticipant {
  id: string;
  name: string;
}

interface ChannelInfo {
  donationId: string;
  participants: ChannelParticipant[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ],
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminVoiceChannels() {
  const { currentUser } = useStore();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [monitoringId, setMonitoringId] = useState<string | null>(null);
  const [monitoringParticipants, setMonitoringParticipants] = useState<
    ChannelParticipant[]
  >([]);
  // IDs of participants whose audio is actively flowing to us
  const [connectedPeers, setConnectedPeers] = useState<Set<string>>(
    new Set(),
  );

  // ── WebRTC refs (stable across renders, safe in callbacks) ────────────────
  const monitoringRef = useRef<string | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  // ICE candidates buffered until remote description is set
  const iceBufRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  // ── Close a single peer connection ────────────────────────────────────────
  const closePeer = useCallback((peerId: string) => {
    peersRef.current.get(peerId)?.close();
    peersRef.current.delete(peerId);
    const audio = audiosRef.current.get(peerId);
    if (audio) {
      audio.srcObject = null;
      audiosRef.current.delete(peerId);
    }
    iceBufRef.current.delete(peerId);
    setConnectedPeers((prev) => {
      const next = new Set(prev);
      next.delete(peerId);
      return next;
    });
  }, []);

  // ── Close all peer connections ────────────────────────────────────────────
  const cleanupMonitor = useCallback(() => {
    for (const id of [...peersRef.current.keys()]) {
      closePeer(id);
    }
    monitoringRef.current = null;
  }, [closePeer]);

  // ── Create a receive-only RTCPeerConnection ────────────────────────────────
  // No local audio tracks are added → admin is completely inaudible.
  const createRecvPC = useCallback(
    (peerId: string): RTCPeerConnection => {
      closePeer(peerId);

      const pc = new RTCPeerConnection(ICE_CONFIG);
      iceBufRef.current.set(peerId, []);

      // Forward ICE candidates to the remote peer
      pc.onicecandidate = ({ candidate }) => {
        if (candidate && monitoringRef.current) {
          getSocket().emit("voice:ice", {
            to: peerId,
            candidate: candidate.toJSON(),
            donationId: monitoringRef.current,
          });
        }
      };

      // Play remote participant's audio stream
      pc.ontrack = ({ streams }) => {
        if (!streams[0]) return;
        let audio = audiosRef.current.get(peerId);
        if (!audio) {
          audio = new Audio();
          audio.autoplay = true;
          audiosRef.current.set(peerId, audio);
        }
        audio.srcObject = streams[0];
        audio.play().catch(() => {
          // Autoplay policy — will resolve on next user interaction
        });
        setConnectedPeers((prev) => new Set([...prev, peerId]));
      };

      // Clean up on failure
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === "failed" || state === "closed") {
          closePeer(peerId);
        }
      };

      peersRef.current.set(peerId, pc);
      return pc;
    },
    [closePeer],
  );

  // ── Start monitoring a channel ─────────────────────────────────────────────
  const startMonitor = useCallback(
    (donationId: string, participants: ChannelParticipant[]) => {
      // Leave any existing monitoring session first
      if (monitoringRef.current) {
        getSocket().emit("voice:monitor_leave", {
          donationId: monitoringRef.current,
        });
        cleanupMonitor();
      }

      monitoringRef.current = donationId;
      setMonitoringId(donationId);
      setMonitoringParticipants(participants);
      setConnectedPeers(new Set());

      // Tell the server we want to monitor this channel (invisible)
      getSocket().emit("voice:admin_monitor", { donationId });
    },
    [cleanupMonitor],
  );

  // ── Stop monitoring ───────────────────────────────────────────────────────
  const stopMonitor = useCallback(() => {
    if (!monitoringRef.current) return;
    getSocket().emit("voice:monitor_leave", {
      donationId: monitoringRef.current,
    });
    cleanupMonitor();
    setMonitoringId(null);
    setMonitoringParticipants([]);
    setConnectedPeers(new Set());
  }, [cleanupMonitor]);

  // ── Request the list of active channels ───────────────────────────────────
  const fetchChannels = useCallback(() => {
    setLoadingChannels(true);
    getSocket().emit("voice:list_channels");
  }, []);

  // ── Socket.IO event handlers ──────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.id) return;
    const socket = getSocket();
    socket.emit("authenticate", currentUser.id);

    // Server responds with the full channel list
    const onChannelsList = (list: ChannelInfo[]) => {
      setChannels(list);
      setLoadingChannels(false);
      // Keep the monitoring participant list in sync
      if (monitoringRef.current) {
        const active = list.find(
          (c) => c.donationId === monitoringRef.current,
        );
        if (active) setMonitoringParticipants(active.participants);
      }
    };

    // Server confirms we're registered as monitor + sends current participants
    const onMonitorReady = ({
      participants,
      donationId: did,
    }: {
      participants: ChannelParticipant[];
      donationId: string;
    }) => {
      if (did !== monitoringRef.current) return;
      setMonitoringParticipants(participants);
    };

    // A participant sends us an offer (triggered by voice:shadow_peer on their side)
    const onOffer = async ({
      from,
      offer,
      donationId: did,
    }: {
      from: string;
      offer: RTCSessionDescriptionInit;
      donationId: string;
    }) => {
      if (did !== monitoringRef.current) return;
      try {
        const pc = createRecvPC(from);

        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Flush any ICE candidates that arrived before the remote description
        for (const c of iceBufRef.current.get(from) ?? []) {
          await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
        iceBufRef.current.set(from, []);

        // Answer with NO audio tracks — we only receive
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("voice:answer", {
          to: from,
          answer: pc.localDescription,
          donationId: monitoringRef.current,
        });
      } catch {
        closePeer(from);
      }
    };

    // Participant answers an offer we sent (edge case — kept for symmetry)
    const onAnswer = async ({
      from,
      answer,
      donationId: did,
    }: {
      from: string;
      answer: RTCSessionDescriptionInit;
      donationId: string;
    }) => {
      if (did !== monitoringRef.current) return;
      const pc = peersRef.current.get(from);
      if (!pc) return;
      await pc
        .setRemoteDescription(new RTCSessionDescription(answer))
        .catch(() => {});
      for (const c of iceBufRef.current.get(from) ?? []) {
        await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
      }
      iceBufRef.current.set(from, []);
    };

    // ICE candidate from a participant
    const onIce = async ({
      from,
      candidate,
      donationId: did,
    }: {
      from: string;
      candidate: RTCIceCandidateInit;
      donationId: string;
    }) => {
      if (did !== monitoringRef.current || !candidate) return;
      const pc = peersRef.current.get(from);
      if (!pc) return;
      if (pc.remoteDescription) {
        await pc
          .addIceCandidate(new RTCIceCandidate(candidate))
          .catch(() => {});
      } else {
        const buf = iceBufRef.current.get(from) ?? [];
        buf.push(candidate);
        iceBufRef.current.set(from, buf);
      }
    };

    // A participant left the monitored channel — close their connection
    const onPeerLeft = ({
      peerId,
      donationId: did,
    }: {
      peerId: string;
      donationId: string;
    }) => {
      if (did !== monitoringRef.current) return;
      closePeer(peerId);
    };

    socket.on("voice:channels_list", onChannelsList);
    socket.on("voice:monitor_ready", onMonitorReady);
    socket.on("voice:offer", onOffer);
    socket.on("voice:answer", onAnswer);
    socket.on("voice:ice", onIce);
    socket.on("voice:peer_left", onPeerLeft);

    // Initial fetch + auto-refresh every 5 s
    fetchChannels();
    const interval = setInterval(fetchChannels, 5000);

    return () => {
      socket.off("voice:channels_list", onChannelsList);
      socket.off("voice:monitor_ready", onMonitorReady);
      socket.off("voice:offer", onOffer);
      socket.off("voice:answer", onAnswer);
      socket.off("voice:ice", onIce);
      socket.off("voice:peer_left", onPeerLeft);
      clearInterval(interval);
    };
    // createRecvPC and closePeer are stable callbacks — no need in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // ── Leave channel on unmount ──────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (monitoringRef.current) {
        getSocket().emit("voice:monitor_leave", {
          donationId: monitoringRef.current,
        });
      }
      cleanupMonitor();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/admin"
            className="text-sm text-emerald-600 hover:underline flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            Canales de voz activos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitorea conversaciones en curso.{" "}
            <span className="font-medium text-gray-700">
              Eres completamente invisible e inaudible para los participantes.
            </span>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchChannels}
          disabled={loadingChannels}
        >
          <RefreshCw
            className={`h-4 w-4 mr-1.5 ${loadingChannels ? "animate-spin" : ""}`}
          />
          {loadingChannels ? "Actualizando…" : "Actualizar"}
        </Button>
      </div>

      {/* ── Active monitoring panel ─────────────────────────────────────── */}
      {monitoringId && (
        <div className="rounded-xl border-2 border-emerald-400 bg-emerald-50 p-5 space-y-4 shadow-sm">
          {/* Title row */}
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-emerald-600 animate-pulse shrink-0" />
            <span className="font-semibold text-emerald-800">
              Monitoreando canal
            </span>
            <span className="ml-auto text-xs text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
              Invisible · Solo escucha
            </span>
          </div>

          {/* Participant chips with connection indicator */}
          <div className="flex flex-wrap gap-2">
            {monitoringParticipants.length === 0 ? (
              <p className="text-sm text-amber-600">
                Canal vacío — los participantes se conectarán automáticamente al
                entrar.
              </p>
            ) : (
              monitoringParticipants.map((p) => {
                const isConnected = connectedPeers.has(p.id);
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      isConnected
                        ? "bg-white border border-emerald-300 text-emerald-800 shadow-sm"
                        : "bg-white border border-gray-200 text-gray-500"
                    }`}
                  >
                    {/* Connection dot */}
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        isConnected
                          ? "bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.7)]"
                          : "bg-gray-300"
                      }`}
                    />
                    {p.name}
                    {/* Audio icon when connected */}
                    {isConnected ? (
                      <Volume2 className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <WifiOff className="h-3 w-3 text-gray-300" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Connecting hint */}
          {monitoringParticipants.length > 0 &&
            connectedPeers.size < monitoringParticipants.length && (
              <p className="text-xs text-amber-600 flex items-center gap-1.5">
                <Wifi className="h-3.5 w-3.5 animate-pulse" />
                Estableciendo conexión de audio… puede tardar unos segundos.
              </p>
            )}

          {/* All connected */}
          {monitoringParticipants.length > 0 &&
            connectedPeers.size === monitoringParticipants.length && (
              <p className="text-xs text-emerald-700 flex items-center gap-1.5">
                <Volume2 className="h-3.5 w-3.5" />
                Recibiendo audio de todos los participantes.
              </p>
            )}

          {/* Footer */}
          <div className="flex items-center gap-3 pt-1 border-t border-emerald-200">
            <p className="text-xs text-gray-500 italic">
              🔇 No puedes ser escuchado — solo recibes audio
            </p>
            <button
              type="button"
              onClick={stopMonitor}
              className="ml-auto flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 active:bg-red-700 transition-colors"
            >
              <PhoneOff className="h-3.5 w-3.5" />
              Dejar de monitorear
            </button>
          </div>
        </div>
      )}

      {/* ── Channel list ────────────────────────────────────────────────── */}
      {loadingChannels && channels.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-8 justify-center">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Buscando canales activos…
        </div>
      ) : channels.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-gray-200 bg-white">
          <Radio className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-600 font-medium">
            No hay canales de voz activos en este momento
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Se actualiza automáticamente cada 5 segundos
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {channels.map((ch) => {
            const isThisMonitored = monitoringId === ch.donationId;

            return (
              <div
                key={ch.donationId}
                className={`rounded-xl border bg-white p-4 flex flex-wrap items-center gap-4 transition-all ${
                  isThisMonitored
                    ? "border-emerald-400 shadow-md bg-emerald-50/30"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {/* Channel info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 font-mono truncate mb-2">
                    Canal:{" "}
                    <span className="text-gray-600">{ch.donationId}</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ch.participants.map((p) => {
                      const connected =
                        isThisMonitored && connectedPeers.has(p.id);
                      return (
                        <span
                          key={p.id}
                          className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            connected
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              connected ? "bg-emerald-500" : "bg-gray-400"
                            }`}
                          />
                          {p.name}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Right side: count + action */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="flex items-center gap-1.5 text-sm text-gray-500 font-medium">
                    <Users className="h-4 w-4" />
                    {ch.participants.length}
                  </span>

                  {isThisMonitored ? (
                    <button
                      type="button"
                      onClick={stopMonitor}
                      className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white hover:bg-red-600 transition-colors"
                    >
                      <PhoneOff className="h-3.5 w-3.5" />
                      Salir
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        startMonitor(ch.donationId, ch.participants)
                      }
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                    >
                      <Ear className="h-3.5 w-3.5" />
                      Monitorear
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
