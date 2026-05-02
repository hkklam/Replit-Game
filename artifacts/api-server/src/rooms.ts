import type { WebSocket } from "ws";

export type Room = {
  gameType: string;
  host: WebSocket;
  guest: WebSocket | null;
  createdAt: number;
};

const rooms = new Map<string, Room>();
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function genCode(): string {
  return Array.from({ length: 4 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
}

export function createRoom(gameType: string, host: WebSocket): string {
  let code: string;
  do { code = genCode(); } while (rooms.has(code));
  rooms.set(code, { gameType, host, guest: null, createdAt: Date.now() });
  for (const [k, r] of rooms) {
    if (Date.now() - r.createdAt > 7_200_000) rooms.delete(k);
  }
  return code;
}

export function joinRoom(code: string, guest: WebSocket): Room | null {
  const room = rooms.get(code);
  if (!room || room.guest !== null) return null;
  room.guest = guest;
  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code);
}

export function closeRoom(code: string): void {
  rooms.delete(code);
}
