import type { Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { createRoom, joinRoom, getRoom, closeRoom } from "./rooms";
import {
  createUnoRoom, joinUnoRoom, getUnoRoom, removeUnoPlayer,
  broadcastUno, sendToUnoPlayer, lobbySnapshot,
} from "./uno-rooms";
import { initGame, canPlay, applyPlay, applyForcedDraw, buildPlayerView } from "./uno-logic";
import type { Variant, Color } from "./uno-logic";
import {
  createPicRoom, joinPicRoom, getPicRoom, removePicPlayer,
  broadcastPic, sendToPic, lobbySnapshotPic,
  startPicGame, startDrawingTimer, triggerScoring, applyPicScores,
} from "./pictionary-rooms";
import type { PicDiff } from "./pictionary-rooms";
import {
  createMjRoom, joinMjRoom, getMjRoom, removeMjPlayer,
  broadcastMjState, startMjGame, applyMjDiscard, applyMjClaim, lobbySnapshotMj, MAX_MJ_HUMANS,
} from "./mahjong-rooms";
import type { ClaimOpt } from "./mahjong-logic";
import {
  createSkRoom, joinSkRoom, getSkRoom, removeSkPlayer,
  broadcastSkState, startSkGame, applySkDraw, applySkPlay, applySkNope,
  applySkStealTarget, applySkPeekClose, lobbySnapshotSk, MAX_SK_HUMANS,
} from "./sk-rooms";
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
    // ── 2-player relay state ──────────────────────────────────────────────────
    let roomCode: string | null = null;
    let isHost = false;

    // ── UNO 8-player state ───────────────────────────────────────────────────
    let unoCode: string | null = null;
    let unoIdx: number = -1;

    // ── Pictionary state ─────────────────────────────────────────────────────
    let picCode: string | null = null;
    let picIdx: number = -1;

    // ── Mahjong state ─────────────────────────────────────────────────────────
    let mjCode: string | null = null;
    let mjSeat: number = -1;

    // ── Sneezing Kittens state ─────────────────────────────────────────────────
    let skCode: string | null = null;
    let skSeat: number = -1;

    ws.on("message", (raw) => {
      let msg: Msg;
      try { msg = JSON.parse(String(raw)); } catch { return; }

      switch (msg.type) {

        // ── 2-player relay ────────────────────────────────────────────────────
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
          unoCode = code; unoIdx = result.playerIdx;
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
          if (room.players.length < 2) { send(ws, { type: "error", message: "Need at least 2 players to start." }); break; }
          const variant = (VALID_VARIANTS.has(String(msg.variant)) ? msg.variant : "classic") as Variant;
          room.variant = variant; room.started = true;
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

        // ── Pictionary ────────────────────────────────────────────────────────
        case "pic_create": {
          const name = String(msg.name ?? "Host").slice(0, 16).trim() || "Host";
          const result = createPicRoom(ws, name);
          picCode = result.room.code; picIdx = 0;
          send(ws, { type: "pic_room_created", roomCode: picCode, playerIdx: 0, players: lobbySnapshotPic(result.room) });
          logger.info({ picCode }, "Pictionary room created");
          break;
        }
        case "pic_join": {
          const code = String(msg.roomCode ?? "").toUpperCase().trim();
          const name = String(msg.name ?? "Player").slice(0, 16).trim() || "Player";
          const result = joinPicRoom(code, ws, name);
          if (!result) { send(ws, { type: "error", message: "Room not found, full, or already started." }); break; }
          picCode = code; picIdx = result.playerIdx;
          send(ws, { type: "pic_joined", roomCode: code, playerIdx: picIdx, players: lobbySnapshotPic(result.room) });
          broadcastPic(result.room, { type: "pic_lobby_update", players: lobbySnapshotPic(result.room) }, picIdx);
          logger.info({ picCode: code, picIdx }, "Pictionary player joined");
          break;
        }
        case "pic_start": {
          if (!picCode || picIdx !== 0) break;
          const room = getPicRoom(picCode);
          if (!room || room.started || room.players.length < 2) {
            send(ws, { type: "error", message: "Need at least 2 players to start." }); break;
          }
          const rounds = Math.min(5, Math.max(1, Number(msg.rounds ?? 3)));
          const valid = [30, 45, 60];
          const timerSec = valid.includes(Number(msg.timerSeconds)) ? Number(msg.timerSeconds) : 60;
          startPicGame(room, rounds, timerSec);
          logger.info({ picCode, rounds, timerSec }, "Pictionary game started");
          break;
        }
        case "pic_select_word": {
          const room = getPicRoom(picCode!);
          if (!room?.state || room.state.phase !== "word_select" || picIdx !== room.state.drawerIdx) break;
          const diff = msg.diff as PicDiff;
          if (!["easy", "medium", "hard"].includes(diff)) break;

          const word = room.state.wordOpts![diff];
          room.state.selectedDiff = diff;
          room.state.selectedWord = word;
          room.state.phase = "drawing";
          room.state.timerEnd = Date.now() + room.settings.timerSeconds * 1000;
          room.state.canvasOps = [];
          room.state.chatMessages = [];
          room.state.guessCount = 0;

          const hint = word.split("").map(c => /[a-zA-Z]/.test(c) ? "_" : c).join(" ");
          broadcastPic(room, {
            type: "pic_drawing_started",
            drawerIdx: room.state.drawerIdx,
            timerEnd: room.state.timerEnd,
            wordHint: hint,
            wordLen: word.length,
          });
          // Drawer also needs timerEnd
          send(ws, { type: "pic_drawing_started_self", timerEnd: room.state.timerEnd });

          startDrawingTimer(room, () => {
            const r = getPicRoom(picCode!);
            if (r?.state?.phase === "drawing") triggerScoring(r);
          });
          break;
        }
        case "pic_draw": {
          const room = getPicRoom(picCode!);
          if (!room?.state || room.state.phase !== "drawing" || picIdx !== room.state.drawerIdx) break;
          const op = msg.op as Record<string, unknown> & { t: string };
          if (!op?.t) break;
          room.state.canvasOps.push(op);
          broadcastPic(room, { type: "pic_draw", op }, picIdx);
          break;
        }
        case "pic_end_turn": {
          const room = getPicRoom(picCode!);
          if (!room?.state || room.state.phase !== "drawing" || picIdx !== room.state.drawerIdx) break;
          triggerScoring(room);
          break;
        }
        case "pic_chat": {
          const room = getPicRoom(picCode!);
          if (!room?.state || room.state.phase !== "drawing" || picIdx === room.state.drawerIdx) break;
          const text = String(msg.text ?? "").slice(0, 120).trim();
          if (!text) break;
          const sender = room.players[picIdx];
          const chatMsg = { playerIdx: picIdx, name: sender?.name ?? "?", text };
          room.state.chatMessages.push(chatMsg);
          room.state.guessCount++;
          // Send to all guessers (not drawer)
          broadcastPic(room, { type: "pic_chat", ...chatMsg }, room.state.drawerIdx);
          // Send count to drawer
          sendToPic(room, room.state.drawerIdx, { type: "pic_guess_count", count: room.state.guessCount });
          break;
        }
        case "pic_score": {
          const room = getPicRoom(picCode!);
          if (!room?.state || room.state.phase !== "scoring" || picIdx !== room.state.drawerIdx) break;
          const winners = (Array.isArray(msg.winners) ? msg.winners as number[] : []).filter(
            i => typeof i === "number" && i !== room.state!.drawerIdx
          );
          const diff = (["easy","medium","hard"].includes(String(msg.diff)) ? msg.diff : room.state.selectedDiff) as PicDiff;
          applyPicScores(room, winners, diff);
          logger.info({ picCode, winners, diff }, "Pictionary scores applied");
          break;
        }

        // ── Mahjong ───────────────────────────────────────────────────────────
        case "mj_create": {
          const name = String(msg.name ?? "Host").slice(0, 16).trim() || "Host";
          mjCode = createMjRoom(ws, name);
          mjSeat = 0;
          const room = getMjRoom(mjCode)!;
          send(ws, { type: "mj_room_created", roomCode: mjCode, seat: 0, players: lobbySnapshotMj(room) });
          logger.info({ mjCode }, "Mahjong room created");
          break;
        }
        case "mj_join": {
          const code = String(msg.roomCode ?? "").toUpperCase().trim();
          const name = String(msg.name ?? "Player").slice(0, 16).trim() || "Player";
          const result = joinMjRoom(code, ws, name);
          if (!result) {
            send(ws, { type: "error", message: `Room not found, started, or full (max ${MAX_MJ_HUMANS} humans).` });
            break;
          }
          mjCode = code; mjSeat = result.seat;
          const snap = lobbySnapshotMj(result.room);
          send(ws, { type: "mj_joined", roomCode: code, seat: mjSeat, players: snap });
          for (const p of result.room.players) {
            if (p.ws !== ws) send(p.ws, { type: "mj_lobby_update", players: snap });
          }
          logger.info({ mjCode: code, mjSeat }, "Mahjong player joined");
          break;
        }
        case "mj_start": {
          if (!mjCode || mjSeat !== 0) break;
          const room = getMjRoom(mjCode);
          if (!room || room.started) break;
          if (room.players.length < 2) { send(ws, { type: "error", message: "Need at least 2 players to start." }); break; }
          for (const p of room.players) send(p.ws, { type: "mj_started" });
          startMjGame(room);
          logger.info({ mjCode, players: room.players.map(p => p.name) }, "Mahjong game started");
          break;
        }
        case "mj_discard": {
          if (!mjCode || mjSeat < 0) break;
          const room = getMjRoom(mjCode);
          if (!room?.state) break;
          const tileId = Number(msg.tileId);
          applyMjDiscard(room, mjSeat, tileId);
          break;
        }
        case "mj_claim": {
          if (!mjCode || mjSeat < 0) break;
          const room = getMjRoom(mjCode);
          if (!room?.state) break;
          const opt = String(msg.opt ?? "") as ClaimOpt;
          if (!["win","pung","chow","skip"].includes(opt)) break;
          applyMjClaim(room, mjSeat, opt);
          break;
        }

        // ── Sneezing Kittens ──────────────────────────────────────────────────
        case "sk_create": {
          const name = String(msg.name ?? "Host").slice(0, 16).trim() || "Host";
          skCode = createSkRoom(ws, name);
          skSeat = 0;
          const room = getSkRoom(skCode)!;
          send(ws, { type: "sk_room_created", roomCode: skCode, seat: 0, players: lobbySnapshotSk(room) });
          logger.info({ skCode }, "SK room created");
          break;
        }
        case "sk_join": {
          const code = String(msg.roomCode ?? "").toUpperCase().trim();
          const name = String(msg.name ?? "Player").slice(0, 16).trim() || "Player";
          const result = joinSkRoom(code, ws, name);
          if (!result) {
            send(ws, { type: "error", message: `Room not found, started, or full (max ${MAX_SK_HUMANS} humans).` });
            break;
          }
          skCode = code; skSeat = result.seat;
          const snap = lobbySnapshotSk(result.room);
          send(ws, { type: "sk_joined", roomCode: code, seat: skSeat, players: snap });
          for (const p of result.room.players) {
            if (p.ws !== ws) send(p.ws, { type: "sk_lobby_update", players: snap });
          }
          logger.info({ skCode: code, skSeat }, "SK player joined");
          break;
        }
        case "sk_start": {
          if (!skCode || skSeat !== 0) break;
          const room = getSkRoom(skCode);
          if (!room || room.started) break;
          if (room.players.length < 2) { send(ws, { type: "error", message: "Need at least 2 players to start." }); break; }
          const maxPlayers = Math.min(5, Math.max(room.players.length, Number(msg.maxPlayers ?? room.players.length)));
          room.maxPlayers = maxPlayers;
          for (const p of room.players) send(p.ws, { type: "sk_started" });
          startSkGame(room);
          logger.info({ skCode, maxPlayers, players: room.players.map(p => p.name) }, "SK game started");
          break;
        }
        case "sk_draw": {
          if (!skCode || skSeat < 0) break;
          const room = getSkRoom(skCode);
          if (!room?.state) break;
          applySkDraw(room, skSeat);
          break;
        }
        case "sk_play": {
          if (!skCode || skSeat < 0) break;
          const room = getSkRoom(skCode);
          if (!room?.state) break;
          const cardId = Number(msg.cardId);
          const pair2Id = msg.pair2Id !== undefined ? Number(msg.pair2Id) : undefined;
          applySkPlay(room, skSeat, cardId, pair2Id);
          break;
        }
        case "sk_nope": {
          if (!skCode || skSeat < 0) break;
          const room = getSkRoom(skCode);
          if (!room?.state) break;
          applySkNope(room, skSeat);
          break;
        }
        case "sk_steal_target": {
          if (!skCode || skSeat < 0) break;
          const room = getSkRoom(skCode);
          if (!room?.state) break;
          const targetSeat = Number(msg.targetSeat);
          applySkStealTarget(room, skSeat, targetSeat);
          break;
        }
        case "sk_peek_close": {
          if (!skCode || skSeat < 0) break;
          const room = getSkRoom(skCode);
          if (!room?.state) break;
          applySkPeekClose(room, skSeat);
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
        if (room) { const other = isHost ? room.guest : room.host; if (other) send(other, { type: "opponent_left" }); }
        closeRoom(roomCode);
      }
      // UNO cleanup
      if (unoCode) {
        const result = removeUnoPlayer(unoCode, ws);
        if (result && result.room.players.length > 0) {
          broadcastUno(result.room, { type: "uno_player_left", playerIdx: result.player.idx, name: result.player.name });
          if (!result.room.started) broadcastUno(result.room, { type: "uno_lobby_update", players: lobbySnapshot(result.room) });
        }
      }
      // Pictionary cleanup
      if (picCode) {
        const result = removePicPlayer(picCode, ws);
        if (result && result.room.players.length > 0) {
          broadcastPic(result.room, { type: "pic_lobby_update", players: lobbySnapshotPic(result.room) });
        }
        logger.info({ picCode, picIdx }, "Pictionary player left");
      }
      // Mahjong cleanup
      if (mjCode) {
        const result = removeMjPlayer(mjCode, ws);
        if (result && result.room.players.length > 0) {
          const snap = lobbySnapshotMj(result.room);
          for (const p of result.room.players) send(p.ws, { type: "mj_lobby_update", players: snap });
          if (result.room.state) broadcastMjState(result.room);
        }
        logger.info({ mjCode, mjSeat }, "Mahjong player left");
      }
      // Sneezing Kittens cleanup
      if (skCode) {
        const result = removeSkPlayer(skCode, ws);
        if (result && result.room.players.length > 0) {
          const snap = lobbySnapshotSk(result.room);
          for (const p of result.room.players) send(p.ws, { type: "sk_lobby_update", players: snap });
          if (result.room.state) broadcastSkState(result.room);
        }
        logger.info({ skCode, skSeat }, "SK player left");
      }
    });

    ws.on("error", (err) => logger.warn({ err }, "WS client error"));
  });

  logger.info("WebSocket relay attached at /api/ws");
}
