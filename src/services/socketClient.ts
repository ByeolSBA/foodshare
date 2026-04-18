import { io, Socket } from "socket.io-client";
import { getServerOrigin } from "./apiClient";

let _socket: Socket | null = null;

/**
 * Returns a singleton Socket.IO client connected to the backend.
 * Reuses the same connection across the app — no duplicate connections.
 */
export function getSocket(): Socket {
  if (!_socket) {
    _socket = io(getServerOrigin(), {
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    _socket.on("connect", () => {
      console.debug("[Socket] Connected:", _socket!.id);
    });

    _socket.on("disconnect", (reason) => {
      console.debug("[Socket] Disconnected:", reason);
    });

    _socket.on("connect_error", (err) => {
      console.debug("[Socket] Connection error:", err.message);
    });
  }

  return _socket;
}
