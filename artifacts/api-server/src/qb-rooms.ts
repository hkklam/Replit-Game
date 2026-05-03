import type { WebSocket } from 'ws';

export const MAX_QB_HUMANS = 4;
const VALUES = [100, 200, 300, 400, 500];
const PLAYER_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'];

function genCode(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

export interface QbEntry { q: string; a: string; alt?: string[]; }

type QbPhase = 'picking' | 'answering' | 'result' | 'final';

interface QbGsPlayer { name: string; score: number; }

interface QbClue { cat: string; val: number; q: string; a: string; alt?: string[]; }

interface QbGs {
  categories: string[];
  board: Record<string, Record<number, QbEntry>>;
  usedClues: Set<string>;
  players: QbGsPlayer[];
  currentPlayer: number;
  activeClue: QbClue | null;
  phase: QbPhase;
  lastResult: {
    correct: boolean;
    answer: string;
    earned: number;
    clue: QbClue;
  } | null;
  timerSecs: number;
}

interface QbPlayer { name: string; seat: number; ws: WebSocket; }

export interface QbRoom {
  code: string;
  players: QbPlayer[];
  started: boolean;
  gs: QbGs | null;
}

const rooms = new Map<string, QbRoom>();

export function createQbRoom(ws: WebSocket, name: string): string {
  let code: string;
  do { code = genCode(); } while (rooms.has(code));
  rooms.set(code, {
    code,
    players: [{ name: (name || 'Host').slice(0, 16), seat: 0, ws }],
    started: false,
    gs: null,
  });
  return code;
}

export function joinQbRoom(code: string, ws: WebSocket, name: string): { room: QbRoom; seat: number } | null {
  const room = rooms.get(code);
  if (!room || room.started || room.players.length >= MAX_QB_HUMANS) return null;
  const seat = room.players.length;
  room.players.push({ name: (name || `Player ${seat + 1}`).slice(0, 16), seat, ws });
  return { room, seat };
}

export function getQbRoom(code: string): QbRoom | undefined {
  return rooms.get(code);
}

export function removeQbPlayer(code: string, ws: WebSocket): { room: QbRoom; seat: number } | null {
  const room = rooms.get(code);
  if (!room) return null;
  const idx = room.players.findIndex(p => p.ws === ws);
  if (idx < 0) return null;
  const [player] = room.players.splice(idx, 1);
  if (room.players.length === 0) rooms.delete(code);
  return { room, seat: player.seat };
}

export function lobbySnapshotQb(room: QbRoom) {
  return room.players.map(p => ({ seat: p.seat, name: p.name, color: PLAYER_COLORS[p.seat] ?? '#fff' }));
}

function sendToQb(ws: WebSocket, msg: Record<string, unknown>): void {
  if ((ws as WebSocket & { readyState: number }).readyState === 1) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcastQb(room: QbRoom, msg: Record<string, unknown>): void {
  const json = JSON.stringify(msg);
  for (const p of room.players) {
    if ((p.ws as WebSocket & { readyState: number }).readyState === 1) p.ws.send(json);
  }
}

function buildStatePayload(gs: QbGs): Record<string, unknown> {
  return {
    categories: gs.categories,
    board: Object.fromEntries(
      Object.entries(gs.board).map(([cat, vals]) => [
        cat,
        Object.fromEntries(Object.entries(vals).map(([v, e]) => [v, { q: e.q }])),
      ])
    ),
    usedClues: [...gs.usedClues],
    players: gs.players,
    currentPlayer: gs.currentPlayer,
    activeClue: gs.activeClue
      ? { cat: gs.activeClue.cat, val: gs.activeClue.val, q: gs.activeClue.q }
      : null,
    phase: gs.phase,
    lastResult: gs.lastResult
      ? {
          correct: gs.lastResult.correct,
          answer: gs.lastResult.answer,
          earned: gs.lastResult.earned,
          correctAnswer: gs.lastResult.clue.a,
          clueQ: gs.lastResult.clue.q,
          cat: gs.lastResult.clue.cat,
          val: gs.lastResult.clue.val,
        }
      : null,
    timerSecs: gs.timerSecs,
  };
}

function normalizeAns(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function checkQbAnswer(input: string, entry: QbEntry): boolean {
  const norm = normalizeAns(input);
  if (!norm) return false;
  const na = normalizeAns(entry.a);
  if (na.includes(norm) || norm.includes(na)) return true;
  if (entry.alt) {
    for (const alt of entry.alt) {
      const nalt = normalizeAns(alt);
      if (nalt.includes(norm) || norm.includes(nalt)) return true;
    }
  }
  return false;
}

export function startQbGame(
  room: QbRoom,
  categories: string[],
  board: Record<string, Record<number, QbEntry>>,
  timerSecs: number
): void {
  room.started = true;
  room.gs = {
    categories,
    board,
    usedClues: new Set(),
    players: room.players.map(p => ({ name: p.name, score: 0 })),
    currentPlayer: 0,
    activeClue: null,
    phase: 'picking',
    lastResult: null,
    timerSecs,
  };
  broadcastQb(room, { type: 'qb_started', players: lobbySnapshotQb(room) });
  broadcastQb(room, { type: 'qb_state', gs: buildStatePayload(room.gs) });
}

export function handleQbAction(
  room: QbRoom,
  seat: number,
  action: string,
  data: Record<string, unknown>
): void {
  const gs = room.gs;
  if (!gs) return;

  if (action === 'pick_clue') {
    if (gs.phase !== 'picking' || seat !== gs.currentPlayer) return;
    const cat = String(data.cat ?? '');
    const val = Number(data.val);
    const entry = gs.board[cat]?.[val];
    if (!entry || gs.usedClues.has(`${cat}:${val}`)) return;
    gs.activeClue = { cat, val, q: entry.q, a: entry.a, alt: entry.alt };
    gs.phase = 'answering';
    broadcastQb(room, { type: 'qb_state', gs: buildStatePayload(gs) });

  } else if (action === 'submit_answer') {
    if (gs.phase !== 'answering' || seat !== gs.currentPlayer || !gs.activeClue) return;
    const answer = String(data.answer ?? '').slice(0, 200).trim();
    const correct = checkQbAnswer(answer, gs.activeClue);
    const earned = gs.activeClue.val;
    const delta = correct ? earned : -earned;
    gs.players[gs.currentPlayer].score += delta;
    gs.usedClues.add(`${gs.activeClue.cat}:${gs.activeClue.val}`);
    gs.lastResult = { correct, answer, earned, clue: gs.activeClue };
    if (!correct) {
      gs.currentPlayer = (gs.currentPlayer + 1) % gs.players.length;
    }
    gs.activeClue = null;
    gs.phase = 'result';
    broadcastQb(room, { type: 'qb_state', gs: buildStatePayload(gs) });

  } else if (action === 'timeout') {
    if (gs.phase !== 'answering' || seat !== gs.currentPlayer || !gs.activeClue) return;
    gs.usedClues.add(`${gs.activeClue.cat}:${gs.activeClue.val}`);
    gs.lastResult = { correct: false, answer: '(time out)', earned: 0, clue: gs.activeClue };
    gs.currentPlayer = (gs.currentPlayer + 1) % gs.players.length;
    gs.activeClue = null;
    gs.phase = 'result';
    broadcastQb(room, { type: 'qb_state', gs: buildStatePayload(gs) });

  } else if (action === 'next') {
    if (gs.phase !== 'result') return;
    const totalClues = gs.categories.length * VALUES.length;
    gs.phase = gs.usedClues.size >= totalClues ? 'final' : 'picking';
    broadcastQb(room, { type: 'qb_state', gs: buildStatePayload(gs) });
  }
}
