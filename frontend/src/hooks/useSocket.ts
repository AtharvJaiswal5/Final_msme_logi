import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "https://final-msme-logi.onrender.com";

/**
 * React hook for Socket.IO connection
 * Manages WebSocket connection lifecycle and event listeners
 */
export function useSocket(role: string, userId: string) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    const socket = socketRef.current;

    // Connection events
    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
      
      // Join role-specific room
      socket.emit("join", { role, userId });
    });

    socket.on("joined", (data) => {
      console.log("👤 Joined as:", data.message);
    });

    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected");
    });

    socket.on("connect_error", (error) => {
      console.error("🔴 Socket connection error:", error);
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [role, userId]);

  return socketRef.current;
}

/**
 * Hook for listening to specific Socket.IO events
 */
export function useSocketEvent(
  socket: Socket | null,
  event: string,
  callback: (data: any) => void
) {
  useEffect(() => {
    if (!socket) return;

    socket.on(event, callback);

    return () => {
      socket.off(event, callback);
    };
  }, [socket, event, callback]);
}
