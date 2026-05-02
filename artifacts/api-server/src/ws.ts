import type { Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { createRoom, joinRoom, getRoom, closeRoom } from "./rooms";
import { logger } from "./lib/logger";

type Msg = Record<string, unknown> & { type: string };

function send(ws: WebSocket, data: Msg): void {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

export function attachWebSocket(server: Server): void {
  const wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", (ws) => {
    let roomCode: string | null = null;
    let isHost = false;

    ws.on("message", (raw) => {
      let msg: Msg;
      try { msg = JSON.parse(String(raw)); } catch { return; }

      switch (msg.type) {
        case "create_room": {
          const gameType = typeof msg.gameType === "string" ? msg.gameType : "game";
          roomCode = createRoom(gameType, ws);
          isHost = true;
          send(ws, { type: "room_created", roomCode, role: "host" });
          logger.info({ roomCode, gameType }, "Room created");
          break;
        }
        case "join_room": {
          const code = String(msg.roomCode ?? "").toUpperCase().trim();
          const room = joinRoom(code, ws);
          if (!room) { send(ws, { type: "error", message: "Room not found or already full." }); break; }
          roomCode = code;
          isHost = false;
          send(ws, { type: "room_joined", roomCode: code, role: "guest", gameType: room.gameType });
          send(room.host, { type: "guest_joined" });
          logger.info({ roomCode: code }, "Guest joined room");
          break;
        }
        case "game_state":
        case "input": {
          if (!roomCode) break;
          const room = getRoom(roomCode);
          if (!room) break;
          const other = isHost ? room.guest : room.host;
          if (other) send(other, { type: msg.type, data: msg.data });
          break;
        }
        case "ping":
          send(ws, { type: "pong" });
          break;
      }
    });

    ws.on("close", () => {
      if (!roomCode) return;
      const room = getRoom(roomCode);
      if (room) {
        const other = isHost ? room.guest : room.host;
        if (other) send(other, { type: "opponent_left" });
      }
      closeRoom(roomCode);
      logger.info({ roomCode }, "Room closed");
    });

    ws.on("error", (err) => logger.warn({ err }, "WS client error"));
  });

  logger.info("WebSocket relay attached at /api/ws");
}
