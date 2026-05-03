import { useEffect, useRef, useState, useCallback } from "react";

export type Suit = 'man' | 'sou' | 'pin' | 'wind' | 'dragon';
export type MeldType = 'pung' | 'chow';
export type ClaimOpt = 'win' | 'pung' | 'chow' | 'skip';

export interface Tile { id: number; suit: Suit; value: number; }
export interface Meld { type: MeldType; tiles: Tile[]; fromPlayer?: number; }
export interface WinInfo { player: number; fan: number; selfDraw: boolean; payer?: number; desc: string[]; }

export interface MjPlayerView {
  mySeat: number;
  myHand: Tile[];
  handSizes: number[];
  melds: Meld[][];
  discards: Tile[][];
  scores: number[];
  names: string[];
  isHuman: boolean[];
  current: number;
  myPhase: 'watch' | 'discard' | 'claim';
  claimOpts: ClaimOpt[];
  lastDiscard: { tile: Tile; from: number } | null;
  winner: WinInfo | null;
  phase: 'lobby' | 'turn' | 'claim_window' | 'won' | 'exhausted';
  msg: string;
  wallLeft: number;
  dealer: number;
  players: { name: string; seat: number }[];
  claimTimer: number;
  roomCode: string;
  revealHands: Tile[][] | null;
}

export type MjLobbyPlayer = { name: string; seat: number };
export type MjOnlineStatus = 'idle' | 'connecting' | 'lobby' | 'playing' | 'disconnected' | 'error';

type Callbacks = {
  onLobbyUpdate?: (players: MjLobbyPlayer[]) => void;
  onGameStarted?: () => void;
  onStateUpdate?: (view: MjPlayerView) => void;
  onPlayerLeft?: (seat: number) => void;
};

export function useMjOnline(callbacks: Callbacks = {}) {
  const ws = useRef<WebSocket | null>(null);
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [status, setStatus] = useState<MjOnlineStatus>('idle');
  const [roomCode, setRoomCode] = useState('');
  const [mySeat, setMySeat] = useState(-1);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState('');
  const [players, setPlayers] = useState<MjLobbyPlayer[]>([]);
  const [view, setView] = useState<MjPlayerView | null>(null);

  const openSocket = useCallback((): Promise<WebSocket> => {
    if (ws.current?.readyState === WebSocket.OPEN) return Promise.resolve(ws.current);
    return new Promise((resolve, reject) => {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${proto}//${window.location.host}/api/ws`;
      const socket = new WebSocket(url);
      ws.current = socket;
      socket.onopen = () => {
        if (pingRef.current) clearInterval(pingRef.current);
        pingRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'ping' }));
        }, 25000);
        resolve(socket);
      };
      socket.onerror = () => reject(new Error('Connection failed'));
      socket.onclose = () => {
        if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
        setStatus(s => s === 'idle' ? s : 'disconnected');
      };
      socket.onmessage = (ev) => {
        let msg: Record<string, unknown>;
        try { msg = JSON.parse(ev.data); } catch { return; }
        switch (msg.type) {
          case 'mj_room_created': {
            setRoomCode(String(msg.roomCode ?? ''));
            setMySeat(Number(msg.seat ?? 0));
            setIsHost(true);
            setPlayers((msg.players as MjLobbyPlayer[]) ?? []);
            setStatus('lobby');
            break;
          }
          case 'mj_joined': {
            setRoomCode(String(msg.roomCode ?? ''));
            setMySeat(Number(msg.seat ?? 1));
            setIsHost(false);
            setPlayers((msg.players as MjLobbyPlayer[]) ?? []);
            setStatus('lobby');
            break;
          }
          case 'mj_lobby_update': {
            const lp = (msg.players as MjLobbyPlayer[]) ?? [];
            setPlayers(lp);
            cbRef.current.onLobbyUpdate?.(lp);
            break;
          }
          case 'mj_started': {
            setStatus('playing');
            cbRef.current.onGameStarted?.();
            break;
          }
          case 'mj_state': {
            const v = msg.data as MjPlayerView;
            setView(v);
            if (v.phase !== 'lobby') setStatus('playing');
            cbRef.current.onStateUpdate?.(v);
            break;
          }
          case 'mj_player_left': {
            cbRef.current.onPlayerLeft?.(Number(msg.seat));
            break;
          }
          case 'error': {
            setError(String(msg.message ?? 'Unknown error'));
            setStatus('error');
            break;
          }
        }
      };
    });
  }, []);

  const create = useCallback(async (name: string) => {
    setError('');
    setStatus('connecting');
    try {
      const socket = await openSocket();
      socket.send(JSON.stringify({ type: 'mj_create', name }));
    } catch (e) {
      setError('Could not connect to server');
      setStatus('error');
    }
  }, [openSocket]);

  const join = useCallback(async (code: string, name: string) => {
    setError('');
    setStatus('connecting');
    try {
      const socket = await openSocket();
      socket.send(JSON.stringify({ type: 'mj_join', roomCode: code.toUpperCase().trim(), name }));
    } catch (e) {
      setError('Could not connect to server');
      setStatus('error');
    }
  }, [openSocket]);

  const start = useCallback(() => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return;
    ws.current.send(JSON.stringify({ type: 'mj_start' }));
  }, []);

  const discard = useCallback((tileId: number) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return;
    ws.current.send(JSON.stringify({ type: 'mj_discard', tileId }));
  }, []);

  const claim = useCallback((opt: ClaimOpt) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return;
    ws.current.send(JSON.stringify({ type: 'mj_claim', opt }));
  }, []);

  const disconnect = useCallback(() => {
    if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
    ws.current?.close();
    ws.current = null;
    setStatus('idle');
    setView(null);
    setPlayers([]);
    setRoomCode('');
    setMySeat(-1);
  }, []);

  useEffect(() => () => { disconnect(); }, [disconnect]);

  return { status, roomCode, mySeat, isHost, error, players, view, create, join, start, discard, claim, disconnect };
}
