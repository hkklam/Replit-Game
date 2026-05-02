import { useEffect, useRef, useState, useCallback } from "react";

export type MPRole = "host" | "guest";
export type MPStatus = "idle" | "connecting" | "waiting" | "connected" | "disconnected" | "error";

type Callbacks = {
  onGameState?: (data: unknown) => void;
  onInput?: (data: unknown) => void;
  onOpponentLeft?: () => void;
  onGuestJoined?: () => void;
};

export function useOnlineMultiplayer(callbacks: Callbacks = {}) {
  const ws = useRef<WebSocket | null>(null);
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [status, setStatus] = useState<MPStatus>("idle");
  const [roomCode, setRoomCode] = useState("");
  const [role, setRole] = useState<MPRole | null>(null);
  const [error, setError] = useState("");

  const openSocket = useCallback((): Promise<WebSocket> => {
    if (ws.current?.readyState === WebSocket.OPEN) return Promise.resolve(ws.current);
    return new Promise((resolve, reject) => {
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const url = `${proto}//${window.location.host}/api/ws`;
      const socket = new WebSocket(url);
      ws.current = socket;

      socket.onopen = () => {
        pingRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "ping" }));
        }, 25000);
        resolve(socket);
      };
      socket.onerror = () => reject(new Error("WebSocket connection failed"));

      socket.onmessage = (ev) => {
        let msg: { type: string; [k: string]: unknown };
        try { msg = JSON.parse(ev.data as string); } catch { return; }
        switch (msg.type) {
          case "room_created":
            setRoomCode(String(msg.roomCode)); setRole("host"); setStatus("waiting"); break;
          case "room_joined":
            setRoomCode(String(msg.roomCode)); setRole("guest"); setStatus("connected"); break;
          case "guest_joined":
            setStatus("connected"); cbRef.current.onGuestJoined?.(); break;
          case "game_state":
            cbRef.current.onGameState?.(msg.data); break;
          case "input":
            cbRef.current.onInput?.(msg.data); break;
          case "opponent_left":
            setStatus("disconnected"); cbRef.current.onOpponentLeft?.(); break;
          case "error":
            setError(String(msg.message ?? "Unknown error")); setStatus("error"); break;
        }
      };

      socket.onclose = () => {
        if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
        setStatus(s => s === "connected" || s === "waiting" ? "disconnected" : s);
      };
    });
  }, []);

  const createRoom = useCallback(async (gameType: string) => {
    setStatus("connecting"); setError("");
    try { const s = await openSocket(); s.send(JSON.stringify({ type: "create_room", gameType })); }
    catch { setError("Could not connect to server."); setStatus("error"); }
  }, [openSocket]);

  const joinRoom = useCallback(async (code: string) => {
    setStatus("connecting"); setError("");
    try { const s = await openSocket(); s.send(JSON.stringify({ type: "join_room", roomCode: code })); }
    catch { setError("Could not connect to server."); setStatus("error"); }
  }, [openSocket]);

  const sendGameState = useCallback((data: unknown) => {
    if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: "game_state", data }));
  }, []);

  const sendInput = useCallback((data: unknown) => {
    if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: "input", data }));
  }, []);

  const disconnect = useCallback(() => {
    if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
    ws.current?.close(); ws.current = null;
    setStatus("idle"); setRoomCode(""); setRole(null); setError("");
  }, []);

  useEffect(() => () => {
    if (pingRef.current) clearInterval(pingRef.current);
    ws.current?.close();
  }, []);

  return { status, roomCode, role, error, createRoom, joinRoom, sendGameState, sendInput, disconnect };
}
