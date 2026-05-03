import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = (() => {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}/api/ws`;
})();

export interface QbLobbyPlayer { seat: number; name: string; color: string; }

export type QbPhase = 'picking' | 'answering' | 'result' | 'final';

export interface QbOnlineGs {
  categories: string[];
  board: Record<string, Record<number, { q: string }>>;
  usedClues: string[];
  players: { name: string; score: number }[];
  currentPlayer: number;
  activeClue: { cat: string; val: number; q: string } | null;
  phase: QbPhase;
  lastResult: {
    correct: boolean;
    answer: string;
    earned: number;
    correctAnswer: string;
    clueQ: string;
    cat: string;
    val: number;
  } | null;
  timerSecs: number;
}

type OnlineStatus = 'idle' | 'connecting' | 'lobby' | 'playing' | 'error';

export interface QbOnlineState {
  status: OnlineStatus;
  error: string;
  roomCode: string;
  mySeat: number;
  lobbyPlayers: QbLobbyPlayer[];
  gs: QbOnlineGs | null;
}

export interface QbOnlineActions {
  createRoom: (name: string) => void;
  joinRoom: (code: string, name: string) => void;
  startGame: (categories: string[], board: Record<string, Record<number, { q: string; a: string; alt?: string[] }>>, timerSecs: number) => void;
  sendAction: (action: string, data?: Record<string, unknown>) => void;
  reset: () => void;
}

const INIT: QbOnlineState = {
  status: 'idle', error: '', roomCode: '', mySeat: -1,
  lobbyPlayers: [], gs: null,
};

export function useQbOnline(): [QbOnlineState, QbOnlineActions] {
  const [state, setState] = useState<QbOnlineState>(INIT);
  const wsRef = useRef<WebSocket | null>(null);

  const send = useCallback((data: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
  }, []);

  const connect = useCallback((onOpen: (ws: WebSocket) => void) => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    setState(s => ({ ...s, status: 'connecting', error: '' }));
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => onOpen(ws);

    ws.onmessage = (e) => {
      let msg: Record<string, unknown>;
      try { msg = JSON.parse(e.data); } catch { return; }
      const type = msg.type as string;

      if (type === 'qb_room_created') {
        setState(s => ({
          ...s, status: 'lobby',
          roomCode: msg.roomCode as string,
          mySeat: msg.seat as number,
          lobbyPlayers: (msg.players as QbLobbyPlayer[]) ?? [],
        }));
      } else if (type === 'qb_joined') {
        setState(s => ({
          ...s, status: 'lobby',
          roomCode: msg.roomCode as string,
          mySeat: msg.seat as number,
          lobbyPlayers: (msg.players as QbLobbyPlayer[]) ?? [],
        }));
      } else if (type === 'qb_lobby_update') {
        setState(s => ({ ...s, lobbyPlayers: (msg.players as QbLobbyPlayer[]) ?? [] }));
      } else if (type === 'qb_started') {
        setState(s => ({
          ...s, status: 'playing',
          lobbyPlayers: (msg.players as QbLobbyPlayer[]) ?? s.lobbyPlayers,
        }));
      } else if (type === 'qb_state') {
        setState(s => ({ ...s, gs: msg.gs as QbOnlineGs }));
      } else if (type === 'qb_player_left') {
        setState(s => ({
          ...s,
          lobbyPlayers: s.lobbyPlayers.filter(p => p.seat !== (msg.seat as number)),
        }));
      } else if (type === 'error') {
        setState(s => ({ ...s, error: msg.message as string }));
      }
    };

    ws.onerror = () => setState(s => ({ ...s, status: 'error', error: 'Connection failed.' }));
    ws.onclose = () => setState(s =>
      s.status === 'playing' || s.status === 'lobby'
        ? { ...s, status: 'error', error: 'Disconnected from server.' }
        : s
    );
  }, []);

  const createRoom = useCallback((name: string) => {
    connect((ws) => {
      const msg = JSON.stringify({ type: 'qb_create', name });
      if (ws.readyState === WebSocket.OPEN) ws.send(msg);
      else ws.onopen = () => ws.send(msg);
    });
  }, [connect]);

  const joinRoom = useCallback((code: string, name: string) => {
    connect((ws) => {
      const msg = JSON.stringify({ type: 'qb_join', roomCode: code.toUpperCase().trim(), name });
      if (ws.readyState === WebSocket.OPEN) ws.send(msg);
      else ws.onopen = () => ws.send(msg);
    });
  }, [connect]);

  const startGame = useCallback((
    categories: string[],
    board: Record<string, Record<number, { q: string; a: string; alt?: string[] }>>,
    timerSecs: number
  ) => {
    send({ type: 'qb_start', categories, board, timerSecs });
  }, [send]);

  const sendAction = useCallback((action: string, data?: Record<string, unknown>) => {
    send({ type: 'qb_action', action, data: data ?? {} });
  }, [send]);

  const reset = useCallback(() => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    setState(INIT);
  }, []);

  useEffect(() => () => { wsRef.current?.close(); }, []);

  const actions: QbOnlineActions = { createRoom, joinRoom, startGame, sendAction, reset };
  return [state, actions];
}
