import type { Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { createRoom, joinRoom, getRoom, closeRoom } from "./rooms";
import {
  createUnoRoom, joinUnoRoom, getUnoRoom, removeUnoPlayer,
  broadcastUno, sendToUnoPlayer, lobbySnapshot,
} from "./uno-rooms";
import { initGame, canPlay, applyPlay, applyForcedDraw, buildPlayerView } from "./uno-logic";
import type { Variant, Color } from "./uno-logic";
import { logger } from "./lib/logger";

type Msg = Record<string, unknown> & { type: string };

function send(ws: WebSocket, data: Msg): void {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

function broadcastGameState(roomCode: string): void {
  const room = getUnoRoom(roomCode);
  if (!room || !room.state) return;
  for (const p of room.players) {
    const view = buildPlayerView(room.state, p.idx);
    send(p.ws, { type: "uno_state", data: view });
  }
}

const VALID_VARIANTS = new Set(["classic", "flip", "progressive", "seveno"]);

export function attachWebSocket(server: Server): void {
  const wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", (ws) => {
    // ── 2-player relay state (other games) ───────────────────────────────────
    let roomCode: string | null = null;
    let isHost = false;

    // ── UNO 8-player state ───────────────────────────────────────────────────
    let unoCode: string | null = null;
    let unoIdx: number = -1;

    ws.on("message", (raw) => {
      let msg: Msg;
      try { msg = JSON.parse(String(raw)); } catch { return; }

      switch (msg.type) {
        // ── Existing 2-player relay (other games) ─────────────────────────────
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
          roomCode = code; isHost = false;
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

        // ── UNO 8-player ──────────────────────────────────────────────────────
        case "uno_create": {
          const name = String(msg.name ?? "Host").slice(0, 16).trim() || "Host";
          unoCode = createUnoRoom(ws, name);
          unoIdx = 0;
          const room = getUnoRoom(unoCode)!;
          send(ws, { type: "uno_room_created", roomCode: unoCode, playerIdx: 0, players: lobbySnapshot(room) });
          logger.info({ unoCode }, "UNO room created");
          break;
        }
        case "uno_join": {
          const code = String(msg.roomCode ?? "").toUpperCase().trim();
          const name = String(msg.name ?? "Player").slice(0, 16).trim() || "Player";
          const result = joinUnoRoom(code, ws, name);
          if (!result) {
            send(ws, { type: "error", message: "Room not found, already started, or full (max 8 players)." });
            break;
          }
          unoCode = code;
          unoIdx = result.playerIdx;
          const snap = lobbySnapshot(result.room);
          send(ws, { type: "uno_joined", roomCode: code, playerIdx: unoIdx, players: snap });
          broadcastUno(result.room, { type: "uno_lobby_update", players: snap });
          logger.info({ unoCode: code, unoIdx }, "UNO player joined");
          break;
        }
        case "uno_start": {
          if (!unoCode || unoIdx !== 0) break;
          const room = getUnoRoom(unoCode);
          if (!room || room.started) break;
          if (room.players.length < 2) {
            send(ws, { type: "error", message: "Need at least 2 players to start." });
            break;
          }
          const variant = (VALID_VARIANTS.has(String(msg.variant)) ? msg.variant : "classic") as Variant;
          room.variant = variant;
          room.started = true;
          const names = room.players.map(p => p.name);
          room.state = initGame(names, variant);
          broadcastUno(room, { type: "uno_started", variant });
          broadcastGameState(unoCode);
          logger.info({ unoCode, variant, players: names }, "UNO game started");
          break;
        }
        case "uno_play": {
          if (!unoCode) break;
          const room = getUnoRoom(unoCode);
          if (!room?.state) break;
          const s = room.state;
          if (s.turn !== unoIdx || s.winner !== null || s.sevenSwap) break;
          const cardId = Number(msg.cardId);
          const color = typeof msg.color === "string" ? msg.color as Color : null;
          const card = s.hands[unoIdx].find(c => c.id === cardId);
          if (!card) break;
          const top = s.discard[s.discard.length - 1];
          if (!canPlay(card, top, s.chosenColor, s.variant, s.stackedDraw)) break;
          room.state = applyPlay(s, card, color);
          broadcastGameState(unoCode);
          break;
        }
        case "uno_draw": {
          if (!unoCode) break;
          const room = getUnoRoom(unoCode);
          if (!room?.state) break;
          const s = room.state;
          if (s.turn !== unoIdx || s.winner !== null) break;
          room.state = applyForcedDraw(s);
          broadcastGameState(unoCode);
          break;
        }
        case "uno_swap": {
          if (!unoCode) break;
          const room = getUnoRoom(unoCode);
          if (!room?.state) break;
          const s = room.state;
          if (s.turn !== unoIdx || !s.sevenSwap) break;
          const targetIdx = Number(msg.targetIdx);
          if (targetIdx < 0 || targetIdx >= s.playerCount || targetIdx === unoIdx) break;
          room.state = applyPlay(s, s.discard[s.discard.length - 1], null, targetIdx);
          broadcastGameState(unoCode);
          break;
        }

        case "ping":
          send(ws, { type: "pong" });
          break;
      }
    });

    ws.on("close", () => {
      // 2-player relay cleanup
      if (roomCode) {
        const room = getRoom(roomCode);
        if (room) {
          const other = isHost ? room.guest : room.host;
          if (other) send(other, { type: "opponent_left" });
        }
        closeRoom(roomCode);
        logger.info({ roomCode }, "Room closed");
      }
      // UNO cleanup
      if (unoCode) {
        const result = removeUnoPlayer(unoCode, ws);
        if (result && result.room.players.length > 0) {
          broadcastUno(result.room, {
            type: "uno_player_left",
            playerIdx: result.player.idx,
            name: result.player.name,
          });
          if (!result.room.started) {
            broadcastUno(result.room, { type: "uno_lobby_update", players: lobbySnapshot(result.room) });
          }
        }
        logger.info({ unoCode, unoIdx }, "UNO player left");
      }
    });

    ws.on("error", (err) => logger.warn({ err }, "WS client error"));
  });

  logger.info("WebSocket relay attached at /api/ws");
}
