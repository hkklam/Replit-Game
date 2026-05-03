import { useEffect, useRef, useState, useCallback } from 'react';

export type SkCardType =
  | 'sneezing_kitten' | 'tissue_box' | 'peeky_cat' | 'shuffle_paws'
  | 'skip_nap' | 'reverse_zoomies' | 'attack_cat' | 'steal_treat'
  | 'favor_fish' | 'nope_cat'
  | 'cat_taco' | 'cat_melon' | 'cat_potato' | 'cat_beard' | 'cat_rainbow';

export interface SkCard { id: number; type: SkCardType; }

export interface SkPlayerView {
  mySeat: number;
  myHand: SkCard[];
  handSizes: number[];
  topDiscard: SkCard | null;
  deckCount: number;
  names: string[];
  isHuman: boolean[];
  eliminated: boolean[];
  current: number;
  phase: 'action' | 'nope_window' | 'peek_view' | 'steal_target' | 'favor_target' | 'won';
  myPhase: 'idle' | 'action' | 'nope' | 'steal_target' | 'favor_target' | 'peek_view';
  nopeSeconds: number;
  peekCards: SkCard[];
  winner: number | null;
  direction: 1 | -1;
  extraTurns: number;
  log: string[];
  roomCode: string;
  players: { name: string; seat: number }[];
}

export type SkOnlineStatus = 'idle' | 'connecting' | 'lobby' | 'playing' | 'disconnected' | 'error';
export type SkLobbyPlayer = { name: string; seat: number };

type Callbacks = {
  onLobbyUpdate?: (players: SkLobbyPlayer[]) => void;
  onGameStarted?: () => void;
  onStateUpdate?: (view: SkPlayerView) => void;
};

export function useSkOnline(callbacks: Callbacks = {}) {
  const ws = useRef<WebSocket | null>(null);
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [status, setStatus] = useState<SkOnlineStatus>('idle');
  const [roomCode, setRoomCode] = useState('');
  const [mySeat, setMySeat] = useState(-1);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState('');
  const [players, setPlayers] = useState<SkLobbyPlayer[]>([]);
  const [view, setView] = useState<SkPlayerView | null>(null);

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
          case 'sk_room_created':
            setRoomCode(String(msg.roomCode ?? ''));
            setMySeat(Number(msg.seat ?? 0));
            setIsHost(true);
            setPlayers((msg.players as SkLobbyPlayer[]) ?? []);
            setStatus('lobby');
            break;
          case 'sk_joined':
            setRoomCode(String(msg.roomCode ?? ''));
            setMySeat(Number(msg.seat ?? 0));
            setIsHost(false);
            setPlayers((msg.players as SkLobbyPlayer[]) ?? []);
            setStatus('lobby');
            break;
          case 'sk_lobby_update': {
            const lp = (msg.players as SkLobbyPlayer[]) ?? [];
            setPlayers(lp);
            cbRef.current.onLobbyUpdate?.(lp);
            break;
          }
          case 'sk_started':
            setStatus('playing');
            cbRef.current.onGameStarted?.();
            break;
          case 'sk_state': {
            const v = msg.data as SkPlayerView;
            setView(v);
            if (v.phase !== 'won') setStatus('playing');
            cbRef.current.onStateUpdate?.(v);
            break;
          }
          case 'error':
            setError(String(msg.message ?? 'Unknown error'));
            setStatus('error');
            break;
        }
      };
    });
  }, []);

  const create = useCallback(async (name: string) => {
    setError(''); setStatus('connecting');
    try { const s = await openSocket(); s.send(JSON.stringify({ type: 'sk_create', name })); }
    catch { setError('Could not connect to server'); setStatus('error'); }
  }, [openSocket]);

  const join = useCallback(async (code: string, name: string) => {
    setError(''); setStatus('connecting');
    try { const s = await openSocket(); s.send(JSON.stringify({ type: 'sk_join', roomCode: code.toUpperCase().trim(), name })); }
    catch { setError('Could not connect to server'); setStatus('error'); }
  }, [openSocket]);

  const start = useCallback((maxPlayers: number) => {
    ws.current?.send(JSON.stringify({ type: 'sk_start', maxPlayers }));
  }, []);

  const playCard = useCallback((cardId: number, pair2Id?: number) => {
    ws.current?.send(JSON.stringify({ type: 'sk_play', cardId, pair2Id }));
  }, []);

  const draw = useCallback(() => {
    ws.current?.send(JSON.stringify({ type: 'sk_draw' }));
  }, []);

  const nope = useCallback(() => {
    ws.current?.send(JSON.stringify({ type: 'sk_nope' }));
  }, []);

  const stealTarget = useCallback((targetSeat: number) => {
    ws.current?.send(JSON.stringify({ type: 'sk_steal_target', targetSeat }));
  }, []);

  const peekClose = useCallback(() => {
    ws.current?.send(JSON.stringify({ type: 'sk_peek_close' }));
  }, []);

  const disconnect = useCallback(() => {
    if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
    ws.current?.close(); ws.current = null;
    setStatus('idle'); setView(null); setPlayers([]); setRoomCode(''); setMySeat(-1);
  }, []);

  useEffect(() => () => { disconnect(); }, [disconnect]);

  return { status, roomCode, mySeat, isHost, error, players, view, create, join, start, playCard, draw, nope, stealTarget, peekClose, disconnect };
}
