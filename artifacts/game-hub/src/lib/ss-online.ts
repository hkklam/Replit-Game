import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = (() => {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}/api/ws`;
})();

export interface SsLobbyPlayer { seat: number; name: string; color: string; }

export type SsPhase = 'spin' | 'guessing' | 'vowel' | 'round_over' | 'game_over';

export interface SsGsPlayer {
  name: string;
  roundScore: number;
  totalScore: number;
  extraSpins: number;
}

export interface SsGs {
  players: SsGsPlayer[];
  turn: number;
  round: number;
  totalRounds: number;
  puzzle: { cat: string; answer: string; hint: string; difficulty: string };
  revealed: string[];
  guessed: string[];
  phase: SsPhase;
  segValue: number | null;
  lastSegLabel: string;
  doubleActive: boolean;
  vowelFree: boolean;
  message: string;
  roundWinner: string;
  lastSegIdx: number | null;
}

type OnlineStatus = 'idle' | 'connecting' | 'lobby' | 'playing' | 'error';

export interface SsOnlineState {
  status: OnlineStatus;
  error: string;
  roomCode: string;
  mySeat: number;
  myColor: string;
  lobbyPlayers: SsLobbyPlayer[];
  gs: SsGs | null;
}

export interface SsOnlineActions {
  createRoom: (name: string) => void;
  joinRoom: (code: string, name: string) => void;
  startGame: (totalRounds: number) => void;
  sendAction: (action: string, opts?: { letter?: string; answer?: string }) => void;
  reset: () => void;
}

const INIT: SsOnlineState = {
  status: 'idle', error: '', roomCode: '', mySeat: -1, myColor: '#fff',
  lobbyPlayers: [], gs: null,
};

export function useSsOnline(): [SsOnlineState, SsOnlineActions] {
  const [state, setState] = useState<SsOnlineState>(INIT);
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

      if (type === 'ss_room_created') {
        setState(s => ({
          ...s, status: 'lobby',
          roomCode: msg.roomCode as string,
          mySeat: msg.seat as number,
          myColor: msg.color as string,
          lobbyPlayers: (msg.players as SsLobbyPlayer[]) ?? [],
        }));
      } else if (type === 'ss_joined') {
        setState(s => ({
          ...s, status: 'lobby',
          roomCode: msg.roomCode as string,
          mySeat: msg.seat as number,
          myColor: msg.color as string,
          lobbyPlayers: (msg.players as SsLobbyPlayer[]) ?? [],
        }));
      } else if (type === 'ss_lobby_update') {
        setState(s => ({ ...s, lobbyPlayers: (msg.players as SsLobbyPlayer[]) ?? [] }));
      } else if (type === 'ss_started') {
        setState(s => ({
          ...s, status: 'playing',
          lobbyPlayers: (msg.players as SsLobbyPlayer[]) ?? s.lobbyPlayers,
          gs: msg.gs as SsGs,
        }));
      } else if (type === 'ss_state') {
        setState(s => ({ ...s, gs: msg.gs as SsGs }));
      } else if (type === 'ss_player_left') {
        setState(s => ({
          ...s,
          lobbyPlayers: s.lobbyPlayers.filter(p => p.seat !== (msg.seat as number)),
        }));
      } else if (type === 'error') {
        setState(s => ({ ...s, error: msg.message as string }));
      }
    };

    ws.onerror = () => setState(s => ({ ...s, status: 'error', error: 'Connection failed.' }));
    ws.onclose = () => setState(s => s.status === 'playing' || s.status === 'lobby'
      ? { ...s, status: 'error', error: 'Disconnected from server.' } : s);
  }, []);

  const createRoom = useCallback((name: string) => {
    connect((ws) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ss_create', name }));
      else ws.onopen = () => ws.send(JSON.stringify({ type: 'ss_create', name }));
    });
  }, [connect]);

  const joinRoom = useCallback((code: string, name: string) => {
    connect((ws) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ss_join', roomCode: code, name }));
      else ws.onopen = () => ws.send(JSON.stringify({ type: 'ss_join', roomCode: code, name }));
    });
  }, [connect]);

  const startGame = useCallback((totalRounds: number) => {
    send({ type: 'ss_start', totalRounds });
  }, [send]);

  const sendAction = useCallback((action: string, opts?: { letter?: string; answer?: string }) => {
    send({ type: 'ss_action', action, ...opts });
  }, [send]);

  const reset = useCallback(() => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    setState(INIT);
  }, []);

  useEffect(() => () => { wsRef.current?.close(); }, []);

  const actions: SsOnlineActions = { createRoom, joinRoom, startGame, sendAction, reset };
  return [state, actions];
}
