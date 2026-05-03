import type { WebSocket } from "ws";
import type { UnoState, Variant } from "./uno-logic";

export type UnoPlayer = {
  ws: WebSocket;
  name: string;
  idx: number;
};

export type UnoRoom = {
  code: string;
  players: UnoPlayer[];
  state: UnoState | null;
  variant: Variant;
  createdAt: number;
  started: boolean;
};

const rooms = new Map<string, UnoRoom>();
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const MAX_UNO_PLAYERS = 8;

function genCode(): string {
  return Array.from({ length: 4 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
}

export function createUnoRoom(hostWs: WebSocket, hostName: string): string {
  let code: string;
  do { code = genCode(); } while (rooms.has(code));
  rooms.set(code, {
    code,
    players: [{ ws: hostWs, name: hostName, idx: 0 }],
    state: null,
    variant: "classic",
    createdAt: Date.now(),
    started: false,
  });
  for (const [k, r] of rooms) {
    if (Date.now() - r.createdAt > 7_200_000) rooms.delete(k);
  }
  return code;
}

export function joinUnoRoom(
  code: string,
  ws: WebSocket,
  name: string
): { room: UnoRoom; playerIdx: number } | null {
  const room = rooms.get(code.toUpperCase());
  if (!room || room.started || room.players.length >= MAX_UNO_PLAYERS) return null;
  const playerIdx = room.players.length;
  room.players.push({ ws, name, idx: playerIdx });
  return { room, playerIdx };
}

export function getUnoRoom(code: string): UnoRoom | undefined {
  return rooms.get(code);
}

export function removeUnoPlayer(code: string, ws: WebSocket): { room: UnoRoom; player: UnoPlayer } | null {
  const room = rooms.get(code);
  if (!room) return null;
  const pIdx = room.players.findIndex(p => p.ws === ws);
  if (pIdx < 0) return null;
  const [player] = room.players.splice(pIdx, 1);
  if (room.players.length === 0) rooms.delete(code);
  return { room, player };
}

export function broadcastUno(room: UnoRoom, msg: Record<string, unknown>): void {
  const data = JSON.stringify(msg);
  for (const p of room.players) {
    if (p.ws.readyState === 1) p.ws.send(data);
  }
}

export function sendToUnoPlayer(room: UnoRoom, playerIdx: number, msg: Record<string, unknown>): void {
  const player = room.players.find(p => p.idx === playerIdx);
  if (player?.ws.readyState === 1) player.ws.send(JSON.stringify(msg));
}

export function lobbySnapshot(room: UnoRoom) {
  return room.players.map(p => ({ idx: p.idx, name: p.name }));
}
