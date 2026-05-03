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
import {
  createTrRoom, joinTrRoom, getTrRoom, removeTrPlayer,
  startTrGame, updateTrPlayerState, routeTrGarbage, lobbySnapshotTr, MAX_TR_HUMANS,
} from "./tr-rooms";
import {
  createSsRoom, joinSsRoom, getSsRoom, removeSsPlayer,
  startSsGame, handleSsAction, lobbySnapshotSs, MAX_SS_HUMANS,
} from "./ss-rooms";
import {
  createQbRoom, joinQbRoom, getQbRoom, removeQbPlayer,
  startQbGame, handleQbAction, lobbySnapshotQb, MAX_QB_HUMANS,
} from "./qb-rooms";
import type { QbEntry } from "./qb-rooms";
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

    // ── Tetris Royale state ────────────────────────────────────────────────────
    let trCode: string | null = null;
    let trSeat: number = -1;

    // ── Spin & Solve state ─────────────────────────────────────────────────────
    let ssCode: string | null = null;
    let ssSeat: number = -1;

    // ── Quiz Board state ───────────────────────────────────────────────────────
    let qbCode: string | null = null;
    let qbSeat: number = -1;

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

        // ── Tetris Royale ─────────────────────────────────────────────────────
        case "tr_create": {
          const name = String(msg.name ?? "Host").slice(0, 12).trim() || "Host";
          trCode = createTrRoom(ws, name);
          trSeat = 0;
          const room = getTrRoom(trCode)!;
          const snap = lobbySnapshotTr(room);
          send(ws, { type: "tr_room_created", roomCode: trCode, seat: 0, color: snap[0].color, name: snap[0].name, players: snap });
          logger.info({ trCode }, "TR room created");
          break;
        }
        case "tr_join": {
          const code = String(msg.roomCode ?? "").toUpperCase().trim();
          const name = String(msg.name ?? "Player").slice(0, 12).trim() || "Player";
          const result = joinTrRoom(code, ws, name);
          if (!result) {
            send(ws, { type: "error", message: `Room not found, already started, or full (max ${MAX_TR_HUMANS} players).` });
            break;
          }
          trCode = code; trSeat = result.seat;
          const snap = lobbySnapshotTr(result.room);
          const myEntry = snap.find(p => p.seat === trSeat)!;
          send(ws, { type: "tr_joined", roomCode: code, seat: trSeat, color: myEntry.color, players: snap });
          for (const p of result.room.players) {
            if (p.ws !== ws) send(p.ws, { type: "tr_lobby_update", players: snap });
          }
          logger.info({ trCode: code, trSeat }, "TR player joined");
          break;
        }
        case "tr_start": {
          if (!trCode || trSeat !== 0) break;
          const room = getTrRoom(trCode);
          if (!room || room.started) break;
          if (room.players.length < 2) { send(ws, { type: "error", message: "Need at least 2 players to start." }); break; }
          startTrGame(room);
          logger.info({ trCode, players: room.players.map(p => p.name) }, "TR game started");
          break;
        }
        case "tr_state": {
          if (!trCode || trSeat < 0) break;
          const room = getTrRoom(trCode);
          if (!room?.started) break;
          const board = Array.isArray(msg.board) ? msg.board as string[][] : [];
          updateTrPlayerState(room, trSeat, board, Number(msg.score ?? 0), Number(msg.lines ?? 0), Boolean(msg.alive ?? true));
          break;
        }
        case "tr_garbage": {
          if (!trCode || trSeat < 0) break;
          const room = getTrRoom(trCode);
          if (!room?.started) break;
          routeTrGarbage(room, trSeat, Number(msg.count ?? 0));
          break;
        }

        // ── Spin & Solve ──────────────────────────────────────────────────────
        case "ss_create": {
          const name = String(msg.name ?? "Host").slice(0, 12).trim() || "Host";
          ssCode = createSsRoom(ws, name);
          ssSeat = 0;
          const room = getSsRoom(ssCode)!;
          const snap = lobbySnapshotSs(room);
          send(ws, { type: "ss_room_created", roomCode: ssCode, seat: 0, color: snap[0].color, players: snap });
          logger.info({ ssCode }, "SS room created");
          break;
        }
        case "ss_join": {
          const code = String(msg.roomCode ?? "").toUpperCase().trim();
          const name = String(msg.name ?? "Player").slice(0, 12).trim() || "Player";
          const result = joinSsRoom(code, ws, name);
          if (!result) {
            send(ws, { type: "error", message: `Room not found, already started, or full (max ${MAX_SS_HUMANS} players).` });
            break;
          }
          ssCode = code; ssSeat = result.seat;
          const snap = lobbySnapshotSs(result.room);
          const myEntry = snap.find(p => p.seat === ssSeat)!;
          send(ws, { type: "ss_joined", roomCode: code, seat: ssSeat, color: myEntry.color, players: snap });
          for (const p of result.room.players) {
            if (p.ws !== ws) send(p.ws, { type: "ss_lobby_update", players: snap });
          }
          logger.info({ ssCode: code, ssSeat }, "SS player joined");
          break;
        }
        case "ss_start": {
          if (!ssCode || ssSeat !== 0) break;
          const room = getSsRoom(ssCode);
          if (!room || room.started) break;
          if (room.players.length < 2) { send(ws, { type: "error", message: "Need at least 2 players to start." }); break; }
          const totalRounds = typeof msg.totalRounds === 'number' ? Math.max(1, Math.min(10, msg.totalRounds)) : 5;
          startSsGame(room, totalRounds);
          logger.info({ ssCode, players: room.players.map(p => p.name) }, "SS game started");
          break;
        }
        case "ss_action": {
          if (!ssCode || ssSeat < 0) break;
          const room = getSsRoom(ssCode);
          if (!room?.started) break;
          handleSsAction(room, ssSeat, String(msg.action ?? ''), msg.letter ? String(msg.letter) : undefined, msg.answer ? String(msg.answer) : undefined);
          break;
        }

        // ── Quiz Board ────────────────────────────────────────────────────
        case "qb_create": {
          const name = String(msg.name ?? "Host").slice(0, 16).trim() || "Host";
          qbCode = createQbRoom(ws, name);
          qbSeat = 0;
          const room = getQbRoom(qbCode)!;
          send(ws, { type: "qb_room_created", roomCode: qbCode, seat: 0, players: lobbySnapshotQb(room) });
          logger.info({ qbCode }, "QB room created");
          break;
        }
        case "qb_join": {
          const code = String(msg.roomCode ?? "").toUpperCase().trim();
          const name = String(msg.name ?? "Player").slice(0, 16).trim() || "Player";
          const result = joinQbRoom(code, ws, name);
          if (!result) {
            send(ws, { type: "error", message: `Room not found, already started, or full (max ${MAX_QB_HUMANS} players).` });
            break;
          }
          qbCode = code; qbSeat = result.seat;
          const snap = lobbySnapshotQb(result.room);
          send(ws, { type: "qb_joined", roomCode: code, seat: qbSeat, players: snap });
          for (const p of result.room.players) {
            if (p.ws !== ws) send(p.ws, { type: "qb_lobby_update", players: snap });
          }
          logger.info({ qbCode: code, qbSeat }, "QB player joined");
          break;
        }
        case "qb_start": {
          if (!qbCode || qbSeat !== 0) break;
          const room = getQbRoom(qbCode);
          if (!room || room.started) break;
          if (room.players.length < 2) { send(ws, { type: "error", message: "Need at least 2 players to start." }); break; }
          const categories = Array.isArray(msg.categories) ? (msg.categories as string[]).slice(0, 12) : [];
          const timerSecs = [15, 30, 45, 60].includes(Number(msg.timerSecs)) ? Number(msg.timerSecs) : 30;
          const rawBoard = msg.board as Record<string, Record<string, { q: string; a: string; alt?: string[] }>>;
          if (!rawBoard || typeof rawBoard !== 'object') break;
          const board: Record<string, Record<number, QbEntry>> = {};
          for (const cat of categories) {
            if (!rawBoard[cat]) continue;
            board[cat] = {};
            for (const [v, e] of Object.entries(rawBoard[cat])) {
              const val = Number(v);
              if (e && typeof e.q === 'string' && typeof e.a === 'string') {
                board[cat][val] = { q: e.q, a: e.a, alt: Array.isArray(e.alt) ? e.alt : undefined };
              }
            }
          }
          startQbGame(room, categories, board, timerSecs);
          logger.info({ qbCode, categories, timerSecs, players: room.players.map(p => p.name) }, "QB game started");
          break;
        }
        case "qb_action": {
          if (!qbCode || qbSeat < 0) break;
          const room = getQbRoom(qbCode);
          if (!room?.started) break;
          const action = String(msg.action ?? '');
          const data = (msg.data && typeof msg.data === 'object') ? msg.data as Record<string, unknown> : {};
          handleQbAction(room, qbSeat, action, data);
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
      // Tetris Royale cleanup
      if (trCode) {
        const result = removeTrPlayer(trCode, ws);
        if (result && result.room.players.length > 0) {
          const snap = lobbySnapshotTr(result.room);
          for (const p of result.room.players) send(p.ws, { type: "tr_lobby_update", players: snap });
          for (const p of result.room.players) send(p.ws, { type: "tr_player_left", seat: result.seat, name: result.name });
        }
        logger.info({ trCode, trSeat }, "TR player left");
      }
      // Spin & Solve cleanup
      if (ssCode) {
        const result = removeSsPlayer(ssCode, ws);
        if (result && result.room.players.length > 0) {
          const snap = lobbySnapshotSs(result.room);
          for (const p of result.room.players) send(p.ws, { type: "ss_lobby_update", players: snap });
          for (const p of result.room.players) send(p.ws, { type: "ss_player_left", seat: result.seat, name: result.name });
        }
        logger.info({ ssCode, ssSeat }, "SS player left");
      }
      // Quiz Board cleanup
      if (qbCode) {
        const result = removeQbPlayer(qbCode, ws);
        if (result && result.room.players.length > 0) {
          const snap = lobbySnapshotQb(result.room);
          for (const p of result.room.players) send(p.ws, { type: "qb_lobby_update", players: snap });
          for (const p of result.room.players) send(p.ws, { type: "qb_player_left", seat: result.seat });
        }
        logger.info({ qbCode, qbSeat }, "QB player left");
      }
    });

    ws.on("error", (err) => logger.warn({ err }, "WS client error"));
  });

  logger.info("WebSocket relay attached at /api/ws");
}
