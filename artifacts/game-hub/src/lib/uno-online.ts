import { useEffect, useRef, useState, useCallback } from "react";

export type Color = "red" | "green" | "blue" | "yellow" | "pink" | "orange" | "teal" | "purple" | "wild";
export type CardType =
  | "number" | "skip" | "reverse" | "draw2" | "wild" | "wild4"
  | "flip" | "draw5" | "skipAll" | "wildColor" | "wildAll";
export type Variant = "classic" | "flip" | "progressive" | "seveno";
export type Card = { id: number; color: Color; type: CardType; value?: number; dark?: boolean };

export type PlayerView = {
  myHand: Card[];
  handSizes: number[];
  names: string[];
  turn: number;
  direction: 1 | -1;
  chosenColor: Color | null;
  topCard: Card;
  winner: number | null;
  deckSize: number;
  stackedDraw: number;
  isFlipped: boolean;
  myIdx: number;
  variant: Variant;
  sevenSwap: boolean;
  winnerName: string | null;
};

export type LobbyPlayer = { idx: number; name: string };
export type UnoOnlineStatus =
  | "idle" | "connecting" | "lobby" | "playing" | "disconnected" | "error";

type Callbacks = {
  onLobbyUpdate?: (players: LobbyPlayer[]) => void;
  onGameStarted?: (variant: Variant) => void;
  onStateUpdate?: (view: PlayerView) => void;
  onPlayerLeft?: (playerIdx: number, name: string) => void;
};

export function useUnoOnline(callbacks: Callbacks = {}) {
  const ws = useRef<WebSocket | null>(null);
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [status, setStatus] = useState<UnoOnlineStatus>("idle");
  const [roomCode, setRoomCode] = useState("");
  const [myIdx, setMyIdx] = useState(-1);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState("");
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);

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
        let msg: { type: string;[k: string]: unknown };
        try { msg = JSON.parse(ev.data as string); } catch { return; }

        switch (msg.type) {
          case "uno_room_created": {
            setRoomCode(String(msg.roomCode));
            setMyIdx(0);
            setIsHost(true);
            setStatus("lobby");
            const ps = (msg.players as LobbyPlayer[]) ?? [];
            setPlayers(ps);
            cbRef.current.onLobbyUpdate?.(ps);
            break;
          }
          case "uno_joined": {
            setRoomCode(String(msg.roomCode));
            setMyIdx(Number(msg.playerIdx));
            setIsHost(false);
            setStatus("lobby");
            const ps = (msg.players as LobbyPlayer[]) ?? [];
            setPlayers(ps);
            cbRef.current.onLobbyUpdate?.(ps);
            break;
          }
          case "uno_lobby_update": {
            const ps = (msg.players as LobbyPlayer[]) ?? [];
            setPlayers(ps);
            cbRef.current.onLobbyUpdate?.(ps);
            break;
          }
          case "uno_started": {
            setStatus("playing");
            cbRef.current.onGameStarted?.(msg.variant as Variant);
            break;
          }
          case "uno_state": {
            cbRef.current.onStateUpdate?.(msg.data as PlayerView);
            break;
          }
          case "uno_player_left": {
            cbRef.current.onPlayerLeft?.(Number(msg.playerIdx), String(msg.name));
            break;
          }
          case "error":
            setError(String(msg.message ?? "Unknown error"));
            setStatus("error");
            break;
        }
      };

      socket.onclose = () => {
        if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
        setStatus(s => (s === "lobby" || s === "playing" || s === "connecting") ? "disconnected" : s);
      };
    });
  }, []);

  const createRoom = useCallback(async (name: string) => {
    setStatus("connecting"); setError("");
    try {
      const s = await openSocket();
      s.send(JSON.stringify({ type: "uno_create", name }));
    } catch {
      setError("Could not connect to server."); setStatus("error");
    }
  }, [openSocket]);

  const joinRoom = useCallback(async (code: string, name: string) => {
    setStatus("connecting"); setError("");
    try {
      const s = await openSocket();
      s.send(JSON.stringify({ type: "uno_join", roomCode: code, name }));
    } catch {
      setError("Could not connect to server."); setStatus("error");
    }
  }, [openSocket]);

  const startGame = useCallback((variant: Variant) => {
    if (ws.current?.readyState === WebSocket.OPEN)
      ws.current.send(JSON.stringify({ type: "uno_start", variant }));
  }, []);

  const playCard = useCallback((cardId: number, color?: Color) => {
    if (ws.current?.readyState === WebSocket.OPEN)
      ws.current.send(JSON.stringify({ type: "uno_play", cardId, color }));
  }, []);

  const drawCard = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN)
      ws.current.send(JSON.stringify({ type: "uno_draw" }));
  }, []);

  const swapPick = useCallback((targetIdx: number) => {
    if (ws.current?.readyState === WebSocket.OPEN)
      ws.current.send(JSON.stringify({ type: "uno_swap", targetIdx }));
  }, []);

  const disconnect = useCallback(() => {
    if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
    ws.current?.close(); ws.current = null;
    setStatus("idle"); setRoomCode(""); setMyIdx(-1); setIsHost(false); setError(""); setPlayers([]);
  }, []);

  useEffect(() => () => {
    if (pingRef.current) clearInterval(pingRef.current);
    ws.current?.close();
  }, []);

  return {
    status, roomCode, myIdx, isHost, error, players,
    createRoom, joinRoom, startGame, playCard, drawCard, swapPick, disconnect,
  };
}
