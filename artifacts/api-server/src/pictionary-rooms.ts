import type { WebSocket } from "ws";
import { pickWordCard } from "./pictionary-words";

export type PicDiff = "easy" | "medium" | "hard";
export type DrawOp = Record<string, unknown> & { t: string };

export interface PicPlayer {
  ws: WebSocket;
  name: string;
  idx: number;
  score: number;
}

export interface ChatMsg {
  playerIdx: number;
  name: string;
  text: string;
}

export interface PicState {
  phase: "word_select" | "drawing" | "scoring" | "between" | "ended";
  round: number;
  turnIdx: number;
  turnOrder: number[];
  drawerIdx: number;
  wordOpts: { easy: string; medium: string; hard: string } | null;
  selectedDiff: PicDiff | null;
  selectedWord: string | null;
  timerEnd: number | null;
  timerHandle: ReturnType<typeof setTimeout> | null;
  canvasOps: DrawOp[];
  chatMessages: ChatMsg[];
  guessCount: number;
  usedWords: Set<string>;
}

export interface PicRoom {
  code: string;
  players: PicPlayer[];
  settings: { rounds: number; timerSeconds: number };
  state: PicState | null;
  started: boolean;
  createdAt: number;
}

const rooms = new Map<string, PicRoom>();
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function genCode(): string {
  return Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
}

export function createPicRoom(ws: WebSocket, name: string): { room: PicRoom; playerIdx: number } {
  let code: string;
  do { code = genCode(); } while (rooms.has(code));
  const player: PicPlayer = { ws, name, idx: 0, score: 0 };
  const room: PicRoom = {
    code, players: [player],
    settings: { rounds: 3, timerSeconds: 60 },
    state: null, started: false,
    createdAt: Date.now(),
  };
  rooms.set(code, room);
  for (const [k, r] of rooms) {
    if (Date.now() - r.createdAt > 7_200_000) rooms.delete(k);
  }
  return { room, playerIdx: 0 };
}

export function joinPicRoom(code: string, ws: WebSocket, name: string): { room: PicRoom; playerIdx: number } | null {
  const room = rooms.get(code);
  if (!room || room.started || room.players.length >= 8) return null;
  const idx = room.players.length;
  const player: PicPlayer = { ws, name, idx, score: 0 };
  room.players.push(player);
  return { room, playerIdx: idx };
}

export function getPicRoom(code: string): PicRoom | undefined {
  return rooms.get(code);
}

export function removePicPlayer(code: string, ws: WebSocket): { room: PicRoom; player: PicPlayer } | null {
  const room = rooms.get(code);
  if (!room) return null;
  const i = room.players.findIndex(p => p.ws === ws);
  if (i === -1) return null;
  const [player] = room.players.splice(i, 1);
  room.players.forEach((p, j) => { p.idx = j; });
  if (room.players.length === 0) rooms.delete(code);
  return { room, player };
}

export function broadcastPic(room: PicRoom, msg: Record<string, unknown>, excludeIdx?: number): void {
  const data = JSON.stringify(msg);
  for (const p of room.players) {
    if (p.idx !== excludeIdx && p.ws.readyState === 1) p.ws.send(data);
  }
}

export function sendToPic(room: PicRoom, playerIdx: number, msg: Record<string, unknown>): void {
  const p = room.players[playerIdx];
  if (p?.ws.readyState === 1) p.ws.send(JSON.stringify(msg));
}

export function lobbySnapshotPic(room: PicRoom) {
  return room.players.map(p => ({ idx: p.idx, name: p.name, score: p.score }));
}

export function startPicGame(room: PicRoom, rounds: number, timerSeconds: number): void {
  room.started = true;
  room.settings = { rounds, timerSeconds };
  const turnOrder = room.players.map(p => p.idx);
  for (let i = turnOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [turnOrder[i], turnOrder[j]] = [turnOrder[j], turnOrder[i]];
  }
  const usedWords = new Set<string>();
  room.state = {
    phase: "word_select", round: 1, turnIdx: 0, turnOrder,
    drawerIdx: turnOrder[0], wordOpts: pickWordCard(usedWords),
    selectedDiff: null, selectedWord: null, timerEnd: null, timerHandle: null,
    canvasOps: [], chatMessages: [], guessCount: 0, usedWords,
  };
  broadcastPic(room, {
    type: "pic_game_started",
    drawerIdx: room.state.drawerIdx,
    round: 1, totalRounds: rounds,
    players: lobbySnapshotPic(room),
  });
  sendToPic(room, room.state.drawerIdx, { type: "pic_word_options", words: room.state.wordOpts });
}

export function startDrawingTimer(room: PicRoom, onTimeUp: () => void): void {
  const state = room.state!;
  if (state.timerHandle) clearTimeout(state.timerHandle);
  state.timerHandle = setTimeout(() => {
    state.timerHandle = null;
    onTimeUp();
  }, room.settings.timerSeconds * 1000 + 800);
}

export function triggerScoring(room: PicRoom): void {
  const state = room.state!;
  if (state.timerHandle) { clearTimeout(state.timerHandle); state.timerHandle = null; }
  state.phase = "scoring";
  broadcastPic(room, { type: "pic_time_up" }, state.drawerIdx);
  sendToPic(room, state.drawerIdx, {
    type: "pic_score_modal",
    players: lobbySnapshotPic(room).filter(p => p.idx !== state.drawerIdx),
    diff: state.selectedDiff,
    chatLog: state.chatMessages,
  });
}

export function applyPicScores(
  room: PicRoom,
  winners: number[],
  diff: PicDiff,
): void {
  const state = room.state!;
  const pts = diff === "easy" ? 1 : diff === "medium" ? 3 : 5;
  const scoresDelta: { idx: number; delta: number }[] = [];

  if (winners.length > 0) {
    room.players[state.drawerIdx].score += pts;
    scoresDelta.push({ idx: state.drawerIdx, delta: pts });
  }
  for (const idx of winners) {
    const p = room.players[idx];
    if (p) { p.score += pts; scoresDelta.push({ idx, delta: pts }); }
  }

  broadcastPic(room, {
    type: "pic_turn_end",
    word: state.selectedWord,
    diff,
    scoresDelta,
    scores: lobbySnapshotPic(room),
  });

  setTimeout(() => advancePicTurn(room), 4000);
}

function advancePicTurn(room: PicRoom): void {
  const state = room.state!;
  const nextTurnIdx = state.turnIdx + 1;
  let newRound = state.round;

  if (nextTurnIdx >= state.turnOrder.length) {
    newRound = state.round + 1;
    if (newRound > room.settings.rounds) {
      state.phase = "ended";
      broadcastPic(room, { type: "pic_game_over", players: lobbySnapshotPic(room) });
      return;
    }
    state.turnIdx = 0;
    state.round = newRound;
  } else {
    state.turnIdx = nextTurnIdx;
  }

  state.drawerIdx = state.turnOrder[state.turnIdx];
  state.phase = "word_select";
  state.selectedDiff = null;
  state.selectedWord = null;
  state.timerEnd = null;
  state.canvasOps = [];
  state.chatMessages = [];
  state.guessCount = 0;
  state.wordOpts = pickWordCard(state.usedWords);

  broadcastPic(room, {
    type: "pic_new_turn",
    round: state.round,
    drawerIdx: state.drawerIdx,
    players: lobbySnapshotPic(room),
  });
  sendToPic(room, state.drawerIdx, { type: "pic_word_options", words: state.wordOpts });
}
