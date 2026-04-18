import { useState, useEffect, useRef, useCallback } from "react";
import { useStore } from "../context/StoreContext";
import { getSocket } from "../services/socketClient";
import { Volume2, LogIn, LogOut, Mic, MicOff } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type ChannelStatus = "outside" | "joining" | "inside";

interface Participant {
  id: string;
  name: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function micErrorMessage(e: unknown): string {
  if (e instanceof DOMException) {
    if (e.name === "NotAllowedError")
      return "Permiso de micrófono denegado. Habilítalo en la configuración del navegador.";
    if (e.name === "NotFoundError")
      return "No se encontró ningún micrófono en este dispositivo.";
    if (e.name === "NotReadableError")
      return "El micrófono está siendo usado por otra aplicación.";
  }
  return "No se pudo acceder al micrófono. Verifica que está conectado y permitido.";
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface VoiceCallProps {
  /** ID de la donación — identifica el canal de voz */
  donationId: string;
  /** No se usa para señalización directa, solo se mantiene por compatibilidad */
  otherUserId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function VoiceCall({ donationId }: VoiceCallProps) {
  const { currentUser } = useStore();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [status, setStatusRaw] = useState<ChannelStatus>("outside");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState("");

  // Mirror of status accessible inside callbacks without stale closures
  const statusRef = useRef<ChannelStatus>("outside");
  const setStatus = useCallback((s: ChannelStatus) => {
    statusRef.current = s;
    setStatusRaw(s);
  }, []);

  // ── WebRTC / media refs ───────────────────────────────────────────────────
  const localStreamRef = useRef<MediaStream | null>(null);
  // peerId → RTCPeerConnection
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  // peerId → buffered ICE candidates (received before remote description)
  const iceBufRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  // peerId → Audio element for remote stream
  const audiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Stable prop ref so callbacks always read the latest donationId
  const donationRef = useRef(donationId);
  useEffect(() => {
    donationRef.current = donationId;
  }, [donationId]);

  // ── Peek at channel state before joining ─────────────────────────────────
  // Requests the participant list without entering the room, so the UI
  // can show who's already in the channel even when status === "outside".
  useEffect(() => {
    if (!currentUser?.id) return;
    const socket = getSocket();

    // Make sure the socket is authenticated before peeking
    socket.emit("authenticate", currentUser.id);

    const onChannelState = ({
      participants: p,
      donationId: did,
    }: {
      participants: Participant[];
      donationId: string;
    }) => {
      if (did !== donationRef.current) return;
      // Only update from peek when outside — inside updates come via voice:channel_update
      if (statusRef.current === "outside") {
        setParticipants(p);
      }
    };

    socket.on("voice:channel_state", onChannelState);

    // Ask the server for the current participant list
    socket.emit("voice:peek", { donationId: donationRef.current });

    return () => {
      socket.off("voice:channel_state", onChannelState);
    };
  }, [currentUser?.id, donationId]);

  // ── Close a single peer connection ───────────────────────────────────────
  const closePeer = useCallback((peerId: string) => {
    const pc = peersRef.current.get(peerId);
    if (pc) {
      pc.close();
      peersRef.current.delete(peerId);
    }
    const audio = audiosRef.current.get(peerId);
    if (audio) {
      audio.srcObject = null;
      audiosRef.current.delete(peerId);
    }
    iceBufRef.current.delete(peerId);
  }, []);

  // ── Close every peer connection and stop the local stream ─────────────────
  const cleanupAll = useCallback(() => {
    for (const peerId of [...peersRef.current.keys()]) {
      closePeer(peerId);
    }
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    iceBufRef.current.clear();
    setIsMuted(false);
  }, [closePeer]);

  // ── Create a RTCPeerConnection for a specific remote peer ─────────────────
  const createPeerConnection = useCallback(
    (peerId: string): RTCPeerConnection => {
      // Close existing connection to this peer if any
      closePeer(peerId);

      const pc = new RTCPeerConnection(ICE_CONFIG);
      iceBufRef.current.set(peerId, []);

      // Add local audio tracks to the connection
      if (localStreamRef.current) {
        localStreamRef.current
          .getTracks()
          .forEach((t) => pc.addTrack(t, localStreamRef.current!));
      }

      // Send ICE candidates to the remote peer via Socket.IO
      pc.onicecandidate = ({ candidate }) => {
        if (candidate) {
          getSocket().emit("voice:ice", {
            to: peerId,
            candidate: candidate.toJSON(),
            donationId: donationRef.current,
          });
        }
      };

      // Play remote audio
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
          // Will auto-play when the browser allows it
        });
      };

      // Tear down on connection failure
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

  // ── Flush buffered ICE candidates after remote description is set ─────────
  const flushIce = useCallback(
    async (pc: RTCPeerConnection, peerId: string) => {
      const buf = iceBufRef.current.get(peerId) ?? [];
      for (const c of buf) {
        await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
      }
      iceBufRef.current.set(peerId, []);
    },
    [],
  );

  // ── Join the voice channel ────────────────────────────────────────────────
  const join = useCallback(async () => {
    setError("");
    setStatus("joining");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      getSocket().emit("voice:join", {
        donationId: donationRef.current,
        userName: currentUser?.name ?? "Usuario",
      });

      setStatus("inside");
    } catch (e) {
      setStatus("outside");
      setError(micErrorMessage(e));
    }
  }, [currentUser?.name, setStatus]);

  // ── Leave the voice channel ───────────────────────────────────────────────
  const leave = useCallback(() => {
    getSocket().emit("voice:leave", { donationId: donationRef.current });
    cleanupAll();
    setStatus("outside");
    setParticipants([]);
  }, [cleanupAll, setStatus]);

  // ── Toggle microphone mute ────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsMuted((m) => !m);
  }, []);

  // ── Socket.IO signaling events — registered once per user ────────────────
  useEffect(() => {
    if (!currentUser?.id) return;
    const socket = getSocket();

    // Authenticate so the server routes events to this socket
    socket.emit("authenticate", currentUser.id);

    // Server sends the updated participant list whenever someone joins or leaves
    const onChannelUpdate = ({
      participants: p,
      donationId: did,
    }: {
      participants: Participant[];
      donationId: string;
    }) => {
      if (did !== donationRef.current) return;
      setParticipants(p);
    };

    // A new participant joined while we are already inside —
    // WE initiate the WebRTC offer to them (they will answer)
    const onPeerJoined = async ({
      peerId,
      donationId: did,
    }: {
      peerId: string;
      peerName: string;
      donationId: string;
    }) => {
      if (did !== donationRef.current) return;
      if (statusRef.current !== "inside") return;
      if (peerId === currentUser.id) return;

      try {
        const pc = createPeerConnection(peerId);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("voice:offer", {
          to: peerId,
          offer: pc.localDescription,
          donationId: donationRef.current,
        });
      } catch {
        closePeer(peerId);
      }
    };

    // We received an offer — set remote description and reply with an answer
    const onOffer = async ({
      from,
      offer,
      donationId: did,
    }: {
      from: string;
      offer: RTCSessionDescriptionInit;
      donationId: string;
    }) => {
      if (did !== donationRef.current) return;
      if (statusRef.current !== "inside") return;

      try {
        const pc = createPeerConnection(from);

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await flushIce(pc, from);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("voice:answer", {
          to: from,
          answer: pc.localDescription,
          donationId: donationRef.current,
        });
      } catch {
        closePeer(from);
      }
    };

    // We received an answer to an offer we sent
    const onAnswer = async ({
      from,
      answer,
      donationId: did,
    }: {
      from: string;
      answer: RTCSessionDescriptionInit;
      donationId: string;
    }) => {
      if (did !== donationRef.current) return;
      const pc = peersRef.current.get(from);
      if (!pc) return;

      await pc
        .setRemoteDescription(new RTCSessionDescription(answer))
        .catch(() => {});
      await flushIce(pc, from);
    };

    // ICE candidate from a remote peer
    const onIce = async ({
      from,
      candidate,
      donationId: did,
    }: {
      from: string;
      candidate: RTCIceCandidateInit;
      donationId: string;
    }) => {
      if (did !== donationRef.current || !candidate) return;
      const pc = peersRef.current.get(from);
      if (!pc) return;

      if (pc.remoteDescription) {
        await pc
          .addIceCandidate(new RTCIceCandidate(candidate))
          .catch(() => {});
      } else {
        // Buffer until remote description is set
        const buf = iceBufRef.current.get(from) ?? [];
        buf.push(candidate);
        iceBufRef.current.set(from, buf);
      }
    };

    // A participant left — close our connection to them
    const onPeerLeft = ({
      peerId,
      donationId: did,
    }: {
      peerId: string;
      donationId: string;
    }) => {
      if (did !== donationRef.current) return;
      closePeer(peerId);
    };

    // voice:shadow_peer — sent by the server when an admin monitor joins.
    // Behaves exactly like voice:peer_joined (we create an offer to that peer)
    // but we intentionally DO NOT update the visible participant list, so the
    // admin stays completely invisible to the regular UI.
    const onShadowPeer = onPeerJoined;

    socket.on("voice:channel_update", onChannelUpdate);
    socket.on("voice:peer_joined", onPeerJoined);
    socket.on("voice:shadow_peer", onShadowPeer);
    socket.on("voice:offer", onOffer);
    socket.on("voice:answer", onAnswer);
    socket.on("voice:ice", onIce);
    socket.on("voice:peer_left", onPeerLeft);

    return () => {
      socket.off("voice:channel_update", onChannelUpdate);
      socket.off("voice:peer_joined", onPeerJoined);
      socket.off("voice:shadow_peer", onShadowPeer);
      socket.off("voice:offer", onOffer);
      socket.off("voice:answer", onAnswer);
      socket.off("voice:ice", onIce);
      socket.off("voice:peer_left", onPeerLeft);
    };
    // createPeerConnection and closePeer are stable (useCallback with no deps that change)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // ── Leave the channel automatically when the component unmounts ───────────
  useEffect(() => {
    return () => {
      if (statusRef.current !== "outside") {
        getSocket().emit("voice:leave", { donationId: donationRef.current });
        cleanupAll();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────────
  const isInside = status === "inside";
  const othersInChannel = participants.filter((p) => p.id !== currentUser?.id);
  const channelHasOthers = othersInChannel.length > 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 mb-2">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Volume2
          className={`h-4 w-4 ${isInside ? "text-emerald-600" : "text-gray-400"}`}
        />
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide select-none">
          Canal de voz
        </span>
        {participants.length > 0 && (
          <span className="ml-auto text-xs text-gray-500">
            {participants.length}{" "}
            {participants.length === 1 ? "persona" : "personas"}
          </span>
        )}
      </div>

      {/* Participant chips */}
      <div className="flex flex-wrap gap-1.5 mb-3 min-h-[28px]">
        {participants.length === 0 ? (
          <p className="text-xs text-gray-400 italic leading-7">
            Nadie aquí todavía — únete para empezar
          </p>
        ) : (
          participants.map((p) => {
            const isMe = p.id === currentUser?.id;
            return (
              <div
                key={p.id}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  isMe
                    ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {/* Green dot */}
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${
                    isMe ? "bg-emerald-500" : "bg-gray-500"
                  }`}
                />
                {isMe ? `${p.name} (tú)` : p.name}
                {/* Mic-off indicator */}
                {isMe && isMuted && (
                  <MicOff className="h-3 w-3 text-red-500 ml-0.5" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-2 flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <span className="flex-1">{error}</span>
          <button
            type="button"
            className="font-bold leading-none opacity-60 hover:opacity-100"
            onClick={() => setError("")}
          >
            ×
          </button>
        </div>
      )}

      {/* Hint when channel has people but you're outside */}
      {!isInside && channelHasOthers && (
        <p className="mb-2 text-xs text-emerald-700 font-medium">
          🎙️ {othersInChannel.map((p) => p.name).join(", ")}{" "}
          {othersInChannel.length === 1 ? "está" : "están"} en el canal
        </p>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Join */}
        {status === "outside" && (
          <button
            type="button"
            onClick={join}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 active:bg-emerald-800"
          >
            <LogIn className="h-3.5 w-3.5" />
            Unirse al canal
          </button>
        )}

        {/* Joining (loading) */}
        {status === "joining" && (
          <button
            type="button"
            disabled
            className="flex items-center gap-1.5 rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 cursor-not-allowed"
          >
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
            Conectando…
          </button>
        )}

        {/* Inside controls */}
        {status === "inside" && (
          <>
            {/* Mute toggle */}
            <button
              type="button"
              onClick={toggleMute}
              title={isMuted ? "Activar micrófono" : "Silenciar"}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                isMuted
                  ? "bg-red-100 text-red-600 hover:bg-red-200"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {isMuted ? (
                <>
                  <MicOff className="h-3.5 w-3.5" />
                  <span>Silenciado</span>
                </>
              ) : (
                <>
                  <Mic className="h-3.5 w-3.5" />
                  <span>Micrófono</span>
                </>
              )}
            </button>

            {/* Leave */}
            <button
              type="button"
              onClick={leave}
              className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-600 active:bg-red-700"
            >
              <LogOut className="h-3.5 w-3.5" />
              Salir del canal
            </button>
          </>
        )}
      </div>
    </div>
  );
}
