import { useEffect, useRef, useState, useCallback } from 'react';

const WS_URL = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/ws`;

export interface TrLobbyPlayer { seat: number; name: string; color: string; }
export interface TrOpponentState { seat: number; board: string[][]; score: number; lines: number; alive: boolean; }

export interface UseTrOnlineReturn {
  status: 'idle' | 'connecting' | 'lobby' | 'playing' | 'disconnected';
  roomCode: string;
  mySeat: number;
  myColor: string;
  isHost: boolean;
  error: string;
  players: TrLobbyPlayer[];
  // Refs for game-loop polling (stable across renders)
  opponentsRef: React.MutableRefObject<Map<number, TrOpponentState>>;
  garbageQueueRef: React.MutableRefObject<number>;
  winnerRef: React.MutableRefObject<{ seat: number; name: string } | null>;
  // Callbacks
  create: (name: string) => void;
  join: (code: string, name: string) => void;
  start: () => void;
  sendState: (board: string[][], score: number, lines: number, alive: boolean) => void;
  sendGarbage: (count: number) => void;
  disconnect: () => void;
}

export function useTrOnline(): UseTrOnlineReturn {
  const [status, setStatus] = useState<UseTrOnlineReturn['status']>('idle');
  const [roomCode, setRoomCode] = useState('');
  const [mySeat, setMySeat] = useState(0);
  const [myColor, setMyColor] = useState('#ef4444');
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState('');
  const [players, setPlayers] = useState<TrLobbyPlayer[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const roomCodeRef = useRef('');
  const mySeatRef = useRef(0);

  // Refs polled by the game loop
  const opponentsRef = useRef<Map<number, TrOpponentState>>(new Map());
  const garbageQueueRef = useRef(0);
  const winnerRef = useRef<{ seat: number; name: string } | null>(null);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setStatus('disconnected');
    opponentsRef.current.clear();
    garbageQueueRef.current = 0;
    winnerRef.current = null;
  }, []);

  const connect = useCallback((onOpen: (ws: WebSocket) => void) => {
    if (wsRef.current) wsRef.current.close();
    setError('');
    setStatus('connecting');
    opponentsRef.current.clear();
    garbageQueueRef.current = 0;
    winnerRef.current = null;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => onOpen(ws);

    ws.onmessage = (ev) => {
      let msg: Record<string, unknown>;
      try { msg = JSON.parse(String(ev.data)); } catch { return; }

      switch (msg.type) {
        case 'tr_room_created': {
          const code = String(msg.roomCode ?? '');
          roomCodeRef.current = code;
          setRoomCode(code);
          setMySeat(0); mySeatRef.current = 0;
          setMyColor(String(msg.color ?? '#ef4444'));
          setIsHost(true);
          setStatus('lobby');
          setPlayers([{ seat: 0, name: String(msg.name ?? 'Host'), color: String(msg.color ?? '#ef4444') }]);
          break;
        }
        case 'tr_joined': {
          const code = String(msg.roomCode ?? '');
          const seat = Number(msg.seat ?? 0);
          roomCodeRef.current = code;
          setRoomCode(code);
          setMySeat(seat); mySeatRef.current = seat;
          setMyColor(String(msg.color ?? '#f472b6'));
          setIsHost(false);
          setStatus('lobby');
          if (Array.isArray(msg.players)) setPlayers(msg.players as TrLobbyPlayer[]);
          break;
        }
        case 'tr_lobby_update': {
          if (Array.isArray(msg.players)) setPlayers(msg.players as TrLobbyPlayer[]);
          break;
        }
        case 'tr_started': {
          if (Array.isArray(msg.players)) setPlayers(msg.players as TrLobbyPlayer[]);
          opponentsRef.current.clear();
          winnerRef.current = null;
          setStatus('playing');
          break;
        }
        case 'tr_opponent_state': {
          const seat = Number(msg.seat);
          opponentsRef.current.set(seat, {
            seat,
            board: msg.board as string[][],
            score: Number(msg.score ?? 0),
            lines: Number(msg.lines ?? 0),
            alive: Boolean(msg.alive ?? true),
          });
          break;
        }
        case 'tr_garbage': {
          garbageQueueRef.current += Number(msg.count ?? 0);
          break;
        }
        case 'tr_winner': {
          winnerRef.current = { seat: Number(msg.seat), name: String(msg.name ?? '?') };
          break;
        }
        case 'tr_player_left': {
          const leavingSeat = Number(msg.seat);
          opponentsRef.current.delete(leavingSeat);
          setPlayers(prev => prev.filter(p => p.seat !== leavingSeat));
          break;
        }
        case 'error': {
          setError(String(msg.message ?? 'Unknown error'));
          setStatus('idle');
          break;
        }
      }
    };

    ws.onclose = () => {
      if (wsRef.current === ws) {
        setStatus(prev => prev === 'playing' ? 'disconnected' : 'idle');
        wsRef.current = null;
      }
    };

    ws.onerror = () => {
      setError('Connection failed — check your network');
      setStatus('idle');
    };
  }, []);

  const create = useCallback((name: string) => {
    connect((ws) => {
      ws.send(JSON.stringify({ type: 'tr_create', name }));
    });
  }, [connect]);

  const join = useCallback((code: string, name: string) => {
    connect((ws) => {
      ws.send(JSON.stringify({ type: 'tr_join', roomCode: code.toUpperCase(), name }));
    });
  }, [connect]);

  const start = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'tr_start' }));
  }, []);

  const sendState = useCallback((board: string[][], score: number, lines: number, alive: boolean) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'tr_state', board, score, lines, alive }));
  }, []);

  const sendGarbage = useCallback((count: number) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'tr_garbage', count }));
  }, []);

  useEffect(() => () => { wsRef.current?.close(); }, []);

  return { status, roomCode, mySeat, myColor, isHost, error, players, opponentsRef, garbageQueueRef, winnerRef, create, join, start, sendState, sendGarbage, disconnect };
}
