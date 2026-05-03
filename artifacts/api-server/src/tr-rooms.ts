import type { WebSocket } from 'ws';

export const MAX_TR_HUMANS = 4;
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TR_COLORS = ['#ef4444', '#f472b6', '#34d399', '#fbbf24'];

export interface TrLobbyPlayer { seat: number; name: string; color: string; }

export interface TrPlayer {
  ws: WebSocket;
  seat: number;
  name: string;
  color: string;
  alive: boolean;
}

export interface TrRoom {
  code: string;
  players: TrPlayer[];
  started: boolean;
  winner: number | null;
  createdAt: number;
}

const rooms = new Map<string, TrRoom>();

function genCode(): string {
  return Array.from({ length: 4 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
}

function sendWs(ws: WebSocket, data: Record<string, unknown>) {
  if (ws.readyState === 1) ws.send(JSON.stringify(data));
}

function broadcastTr(room: TrRoom, data: Record<string, unknown>, excludeSeat?: number) {
  for (const p of room.players) {
    if (excludeSeat === undefined || p.seat !== excludeSeat) sendWs(p.ws, data);
  }
}

export function createTrRoom(ws: WebSocket, name: string): string {
  let code: string;
  do { code = genCode(); } while (rooms.has(code));
  rooms.set(code, {
    code, players: [{ ws, seat: 0, name, color: TR_COLORS[0], alive: true }],
    started: false, winner: null, createdAt: Date.now(),
  });
  for (const [k, r] of rooms) { if (Date.now() - r.createdAt > 7_200_000) rooms.delete(k); }
  return code;
}

export function joinTrRoom(code: string, ws: WebSocket, name: string): { room: TrRoom; seat: number } | null {
  const room = rooms.get(code.toUpperCase());
  if (!room || room.started || room.players.length >= MAX_TR_HUMANS) return null;
  const seat = room.players.length;
  room.players.push({ ws, seat, name, color: TR_COLORS[seat] ?? '#a78bfa', alive: true });
  return { room, seat };
}

export function getTrRoom(code: string): TrRoom | undefined {
  return rooms.get(code.toUpperCase());
}

export function removeTrPlayer(code: string, ws: WebSocket): { room: TrRoom; seat: number; name: string } | null {
  const room = rooms.get(code.toUpperCase());
  if (!room) return null;
  const idx = room.players.findIndex(p => p.ws === ws);
  if (idx < 0) return null;
  const [player] = room.players.splice(idx, 1);
  if (room.players.length === 0) rooms.delete(code);
  return { room, seat: player.seat, name: player.name };
}

export function lobbySnapshotTr(room: TrRoom): TrLobbyPlayer[] {
  return room.players.map(p => ({ seat: p.seat, name: p.name, color: p.color }));
}

export function startTrGame(room: TrRoom): void {
  room.started = true;
  room.winner = null;
  for (const p of room.players) p.alive = true;
  broadcastTr(room, { type: 'tr_started', players: lobbySnapshotTr(room) });
}

export function updateTrPlayerState(
  room: TrRoom, seat: number,
  board: string[][], score: number, lines: number, alive: boolean,
): void {
  const player = room.players.find(p => p.seat === seat);
  if (!player) return;
  const wasAlive = player.alive;
  player.alive = alive;
  broadcastTr(room, { type: 'tr_opponent_state', seat, board, score, lines, alive }, seat);
  if (wasAlive && !alive && room.winner === null) {
    const alivePlayers = room.players.filter(p => p.alive);
    if (alivePlayers.length <= 1 && room.players.length > 1) {
      const w = alivePlayers[0];
      room.winner = w?.seat ?? -1;
      broadcastTr(room, { type: 'tr_winner', seat: room.winner, name: w?.name ?? '?' });
    }
  }
}

export function routeTrGarbage(room: TrRoom, fromSeat: number, count: number): void {
  const targets = room.players.filter(p => p.seat !== fromSeat && p.alive);
  if (targets.length === 0) return;
  const target = targets[Math.floor(Math.random() * targets.length)];
  sendWs(target.ws, { type: 'tr_garbage', count });
}
