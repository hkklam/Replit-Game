import { useEffect, useRef, useState, useCallback } from "react";

export type RelayRole   = "host" | "guest";
export type RelayStatus = "idle" | "connecting" | "waiting" | "connected" | "disconnected" | "error";

type RelayCallbacks = {
  onRoomCreated?:   (code: string) => void;
  onRoomJoined?:    (code: string) => void;
  onOpponentJoined?: () => void;
  onMessage?:       (data: unknown) => void;
  onOpponentLeft?:  () => void;
  onError?:         (msg: string) => void;
};

export function useRelaySocket(gameType: string, callbacks: RelayCallbacks) {
  const wsRef   = useRef<WebSocket | null>(null);
  const cbRef   = useRef(callbacks);
  cbRef.current = callbacks;
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [status,   setStatus]   = useState<RelayStatus>("idle");
  const [roomCode, setRoomCode] = useState("");
  const [role,     setRole]     = useState<RelayRole | null>(null);

  const openSocket = useCallback((): Promise<WebSocket> => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return Promise.resolve(wsRef.current);
    return new Promise((resolve, reject) => {
      const proto  = window.location.protocol === "https:" ? "wss:" : "ws:";
      const socket = new WebSocket(`${proto}//${window.location.host}/api/ws`);
      wsRef.current = socket;

      socket.onopen = () => {
        pingRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN)
            socket.send(JSON.stringify({ type: "ping" }));
        }, 25_000);
        resolve(socket);
      };
      socket.onerror = () => reject(new Error("Connection failed"));

      socket.onmessage = (e) => {
        let msg: Record<string, unknown>;
        try { msg = JSON.parse(e.data as string); } catch { return; }
        const cb = cbRef.current;
        switch (msg.type) {
          case "room_created":
            setRoomCode(String(msg.roomCode)); setRole("host"); setStatus("waiting");
            cb.onRoomCreated?.(String(msg.roomCode)); break;
          case "room_joined":
            setRoomCode(String(msg.roomCode)); setRole("guest"); setStatus("connected");
            cb.onRoomJoined?.(String(msg.roomCode)); break;
          case "guest_joined":
            setStatus("connected"); cb.onOpponentJoined?.(); break;
          case "game_state":
          case "input":
            cb.onMessage?.(msg.data); break;
          case "opponent_left":
            setStatus("disconnected"); cb.onOpponentLeft?.(); break;
          case "error":
            setStatus("error"); cb.onError?.(String(msg.message ?? "Error")); break;
        }
      };

      socket.onclose = () => {
        if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
        setStatus(s => (["waiting","connected","connecting"] as RelayStatus[]).includes(s) ? "disconnected" : s);
      };
    });
  }, []);

  const createRoom = useCallback(async () => {
    setStatus("connecting");
    try { const s = await openSocket(); s.send(JSON.stringify({ type: "create_room", gameType })); }
    catch { setStatus("error"); cbRef.current.onError?.("Could not connect to server."); }
  }, [gameType, openSocket]);

  const joinRoom = useCallback(async (code: string) => {
    setStatus("connecting");
    try { const s = await openSocket(); s.send(JSON.stringify({ type: "join_room", roomCode: code.toUpperCase().trim() })); }
    catch { setStatus("error"); cbRef.current.onError?.("Could not connect to server."); }
  }, [openSocket]);

  const send = useCallback((data: unknown) => {
    wsRef.current?.send(JSON.stringify({ type: "input", data }));
  }, []);

  const disconnect = useCallback(() => {
    if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
    wsRef.current?.close(); wsRef.current = null;
    setStatus("idle"); setRoomCode(""); setRole(null);
  }, []);

  useEffect(() => () => {
    if (pingRef.current) clearInterval(pingRef.current);
    wsRef.current?.close();
  }, []);

  return { status, roomCode, role, createRoom, joinRoom, send, disconnect };
}
