import type { WebSocket } from 'ws';

// ─── CONSTANTS (mirrored from client) ─────────────────────────────────────────
const VOWELS = new Set(['A','E','I','O','U']);
const CONSONANTS = 'BCDFGHJKLMNPQRSTVWXYZ'.split('');
const CONS_BY_FREQ = ['T','N','S','R','H','D','L','C','M','G','B','F','P','Y','W','K','V','X','J','Q','Z'];
const VOWEL_COST = 250;
const NUM_SEGS = 24;

type SpecialVal = 'BANKRUPT' | 'LOSE_TURN' | 'FREE_VOWEL' | 'DOUBLE' | 'EXTRA_SPIN';
type WheelVal = number | SpecialVal;
interface Seg { val: WheelVal; label: string; }
const SEGMENTS: Seg[] = [
  { val: 100, label: '100' }, { val: 200, label: '200' }, { val: 300, label: '300' },
  { val: 400, label: '400' }, { val: 500, label: '500' }, { val: 'LOSE_TURN', label: 'LOSE' },
  { val: 600, label: '600' }, { val: 700, label: '700' }, { val: 'BANKRUPT', label: 'BKRPT' },
  { val: 800, label: '800' }, { val: 300, label: '300' }, { val: 'FREE_VOWEL', label: 'FREE' },
  { val: 400, label: '400' }, { val: 900, label: '900' }, { val: 'LOSE_TURN', label: 'LOSE' },
  { val: 500, label: '500' }, { val: 'DOUBLE', label: '2X' }, { val: 200, label: '200' },
  { val: 600, label: '600' }, { val: 'BANKRUPT', label: 'BKRPT' }, { val: 700, label: '700' },
  { val: 'EXTRA_SPIN', label: '+SPIN' }, { val: 300, label: '300' }, { val: 1000, label: '1000' },
];

interface PuzzleDef { cat: string; answer: string; hint: string; difficulty: 'easy'|'medium'|'hard'; }
const PUZZLES: PuzzleDef[] = [
  { cat: 'Food & Drink', answer: 'PIZZA PARTY', hint: 'A fun meal with friends', difficulty: 'easy' },
  { cat: 'Food & Drink', answer: 'CHOCOLATE CAKE', hint: 'Sweet birthday classic', difficulty: 'easy' },
  { cat: 'Food & Drink', answer: 'GRILLED CHEESE SANDWICH', hint: 'Golden and gooey', difficulty: 'medium' },
  { cat: 'Food & Drink', answer: 'SPAGHETTI AND MEATBALLS', hint: 'Italian favourite', difficulty: 'medium' },
  { cat: 'Food & Drink', answer: 'BANANA SPLIT', hint: 'Ice cream dessert', difficulty: 'easy' },
  { cat: 'Food & Drink', answer: 'HOT FUDGE SUNDAE', hint: 'Drizzled with chocolate', difficulty: 'easy' },
  { cat: 'Food & Drink', answer: 'CHICKEN NOODLE SOUP', hint: 'Good for a cold day', difficulty: 'easy' },
  { cat: 'Food & Drink', answer: 'FRENCH TOAST', hint: 'Egg-soaked breakfast bread', difficulty: 'easy' },
  { cat: 'Places', answer: 'NEW YORK CITY', hint: 'The Big Apple', difficulty: 'easy' },
  { cat: 'Places', answer: 'EIFFEL TOWER', hint: 'Paris landmark', difficulty: 'easy' },
  { cat: 'Places', answer: 'NIAGARA FALLS', hint: 'Thundering waterfall on the border', difficulty: 'easy' },
  { cat: 'Places', answer: 'GRAND CANYON', hint: 'Deep gorge in Arizona', difficulty: 'easy' },
  { cat: 'Places', answer: 'MOUNT EVEREST', hint: "World's highest peak", difficulty: 'medium' },
  { cat: 'Places', answer: 'AMAZON RAIN FOREST', hint: 'Lungs of the Earth', difficulty: 'medium' },
  { cat: 'Places', answer: 'SYDNEY OPERA HOUSE', hint: 'Iconic Australian venue', difficulty: 'medium' },
  { cat: 'Places', answer: 'GREAT BARRIER REEF', hint: 'Coral wonder off Australia', difficulty: 'medium' },
  { cat: 'Phrase', answer: 'BETTER LATE THAN NEVER', hint: 'Arriving on time is overrated', difficulty: 'easy' },
  { cat: 'Phrase', answer: 'PIECE OF CAKE', hint: 'Extremely easy', difficulty: 'easy' },
  { cat: 'Phrase', answer: 'BREAK A LEG', hint: 'Good luck on stage', difficulty: 'easy' },
  { cat: 'Phrase', answer: 'UNDER THE WEATHER', hint: 'Feeling ill', difficulty: 'easy' },
  { cat: 'Phrase', answer: 'HIT THE NAIL ON THE HEAD', hint: 'Exactly right', difficulty: 'medium' },
  { cat: 'Phrase', answer: 'LET THE CAT OUT OF THE BAG', hint: 'Revealed a secret', difficulty: 'medium' },
  { cat: 'Phrase', answer: 'BITE THE BULLET', hint: 'Endure a painful situation', difficulty: 'medium' },
  { cat: 'Phrase', answer: 'ACTIONS SPEAK LOUDER THAN WORDS', hint: 'Do, not just say', difficulty: 'hard' },
  { cat: 'Phrase', answer: 'THE EARLY BIRD CATCHES THE WORM', hint: 'Rewards for being first', difficulty: 'hard' },
  { cat: 'Phrase', answer: 'EVERY CLOUD HAS A SILVER LINING', hint: 'Optimism in bad times', difficulty: 'hard' },
  { cat: 'Thing', answer: 'ROLLER COASTER', hint: 'Thrilling amusement ride', difficulty: 'easy' },
  { cat: 'Thing', answer: 'BIRTHDAY SURPRISE', hint: 'Unexpected party!', difficulty: 'easy' },
  { cat: 'Thing', answer: 'MAGIC CARPET RIDE', hint: 'Flying on a rug', difficulty: 'medium' },
  { cat: 'Thing', answer: 'SHOOTING STARS', hint: 'Make a wish!', difficulty: 'easy' },
  { cat: 'Thing', answer: 'DIAMOND RING', hint: 'A sparkling proposal', difficulty: 'easy' },
  { cat: 'Thing', answer: 'TREASURE MAP', hint: 'X marks the spot', difficulty: 'easy' },
  { cat: 'Thing', answer: 'TIME MACHINE', hint: 'Travel through history', difficulty: 'medium' },
  { cat: 'Famous Person', answer: 'ALBERT EINSTEIN', hint: 'Theory of relativity', difficulty: 'easy' },
  { cat: 'Famous Person', answer: 'MICHAEL JORDAN', hint: 'Basketball GOAT', difficulty: 'easy' },
  { cat: 'Famous Person', answer: 'TAYLOR SWIFT', hint: 'Pop music superstar', difficulty: 'easy' },
  { cat: 'Famous Person', answer: 'OPRAH WINFREY', hint: 'Legendary talk show host', difficulty: 'medium' },
  { cat: 'Famous Person', answer: 'LEONARDO DA VINCI', hint: 'Renaissance genius', difficulty: 'medium' },
  { cat: 'Movie', answer: 'THE LION KING', hint: 'Hakuna Matata', difficulty: 'easy' },
  { cat: 'Movie', answer: 'JURASSIC PARK', hint: 'Dinosaurs on the loose', difficulty: 'easy' },
  { cat: 'Movie', answer: 'THE WIZARD OF OZ', hint: 'Follow the yellow brick road', difficulty: 'easy' },
  { cat: 'Movie', answer: 'STAR WARS', hint: 'May the Force be with you', difficulty: 'easy' },
  { cat: 'Movie', answer: 'HOME ALONE', hint: 'Kid defends the house', difficulty: 'easy' },
  { cat: 'Movie', answer: 'BACK TO THE FUTURE', hint: 'Flux capacitor required', difficulty: 'medium' },
  { cat: 'Fun & Games', answer: 'WINNER WINNER CHICKEN DINNER', hint: 'Battle royale catchphrase', difficulty: 'hard' },
  { cat: 'Fun & Games', answer: 'SPIN THE WHEEL', hint: 'Game show move', difficulty: 'easy' },
  { cat: 'Fun & Games', answer: 'PRESS YOUR LUCK', hint: 'Risk it for the biscuit', difficulty: 'medium' },
  { cat: 'Around the House', answer: 'KITCHEN COUNTER', hint: 'Where meals are prepped', difficulty: 'easy' },
  { cat: 'Around the House', answer: 'LIVING ROOM SOFA', hint: 'Cozy seating for TV time', difficulty: 'easy' },
];

// ─── ROOM / PLAYER TYPES ──────────────────────────────────────────────────────
export const MAX_SS_HUMANS = 4;
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SS_COLORS = ['#f472b6', '#34d399', '#60a5fa', '#fbbf24'];

export interface SsLobbyPlayer { seat: number; name: string; color: string; }

export interface SsRoomPlayer {
  ws: WebSocket;
  seat: number;
  name: string;
  color: string;
}

export interface SsGsPlayer {
  name: string;
  roundScore: number;
  totalScore: number;
  extraSpins: number;
}

export type SsPhase = 'spin' | 'guessing' | 'vowel' | 'round_over' | 'game_over';

export interface SsGs {
  players: SsGsPlayer[];
  turn: number;
  round: number;
  totalRounds: number;
  puzzles: PuzzleDef[];
  puzzle: PuzzleDef;
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

export interface SsRoom {
  code: string;
  players: SsRoomPlayer[];
  gs: SsGs | null;
  totalRounds: number;
  started: boolean;
  createdAt: number;
}

const rooms = new Map<string, SsRoom>();

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function genCode(): string {
  return Array.from({ length: 4 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
}
function sendWs(ws: WebSocket, data: Record<string, unknown>) {
  if (ws.readyState === 1) ws.send(JSON.stringify(data));
}
function broadcastSs(room: SsRoom, data: Record<string, unknown>) {
  for (const p of room.players) sendWs(p.ws, data);
}

// ─── PURE GAME LOGIC ──────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function isComplete(puzzle: PuzzleDef, revealed: string[]): boolean {
  return puzzle.answer.split('').every(c => c === ' ' || !/[A-Z]/.test(c) || revealed.includes(c));
}
function allConsonantsRevealed(puzzle: PuzzleDef, guessed: string[]): boolean {
  const cons = [...new Set(puzzle.answer.split('').filter(c => CONSONANTS.includes(c)))];
  return cons.every(c => guessed.includes(c));
}
function allVowelsRevealed(puzzle: PuzzleDef, guessed: string[]): boolean {
  const vow = [...new Set(puzzle.answer.split('').filter(c => VOWELS.has(c)))];
  return vow.length === 0 || vow.every(v => guessed.includes(v));
}

function nextTurn(gs: SsGs, msg: string): SsGs {
  const next = (gs.turn + 1) % gs.players.length;
  return { ...gs, turn: next, segValue: null, lastSegLabel: '', doubleActive: false, vowelFree: false, phase: 'spin', message: msg, lastSegIdx: null };
}

function finishRound(gs: SsGs, winnerIdx: number): SsGs {
  const winnerName = gs.players[winnerIdx].name;
  const newPlayers = gs.players.map(p => ({ ...p, totalScore: p.totalScore + p.roundScore, roundScore: 0 }));
  return { ...gs, players: newPlayers, phase: gs.round >= gs.totalRounds ? 'game_over' : 'round_over', roundWinner: winnerName, message: `🎉 ${winnerName} solved it!`, lastSegIdx: null };
}

function applySpinResult(gs: SsGs, segIdx: number): SsGs {
  const seg = SEGMENTS[segIdx];
  const who = gs.players[gs.turn].name;
  const noConsLeft = allConsonantsRevealed(gs.puzzle, gs.guessed);
  switch (seg.val as WheelVal) {
    case 'BANKRUPT': {
      const newPlayers = gs.players.map((p, i) => i === gs.turn ? { ...p, roundScore: 0, extraSpins: 0 } : p);
      return nextTurn({ ...gs, players: newPlayers }, `💥 ${who} hit BANKRUPT! Round score gone.`);
    }
    case 'LOSE_TURN': {
      const p = gs.players[gs.turn];
      if (p.extraSpins > 0) {
        const newPlayers = gs.players.map((pl, i) => i === gs.turn ? { ...pl, extraSpins: pl.extraSpins - 1 } : pl);
        return { ...gs, players: newPlayers, phase: 'spin', lastSegLabel: seg.label, lastSegIdx: segIdx, message: `${who} used an Extra Spin token to cancel Lose Turn! Spin again.` };
      }
      return nextTurn(gs, `😬 ${who} loses a turn!`);
    }
    case 'FREE_VOWEL':
      if (allVowelsRevealed(gs.puzzle, gs.guessed))
        return { ...gs, phase: 'spin', lastSegLabel: seg.label, lastSegIdx: segIdx, message: `All vowels revealed! ${who} spins again.` };
      return { ...gs, phase: 'vowel', vowelFree: true, lastSegLabel: seg.label, lastSegIdx: segIdx, message: `🎁 ${who} gets a FREE VOWEL! Pick one.` };
    case 'EXTRA_SPIN': {
      const newPlayers = gs.players.map((p, i) => i === gs.turn ? { ...p, extraSpins: p.extraSpins + 1 } : p);
      return { ...gs, players: newPlayers, phase: 'spin', lastSegLabel: seg.label, lastSegIdx: segIdx, message: `🎡 ${who} earned an Extra Spin token! Spin again.` };
    }
    case 'DOUBLE':
      if (noConsLeft) return { ...gs, phase: 'spin', lastSegLabel: seg.label, lastSegIdx: segIdx, message: `No consonants left! ${who} spins again.` };
      return { ...gs, phase: 'guessing', segValue: 500, doubleActive: true, lastSegLabel: seg.label, lastSegIdx: segIdx, message: `2️⃣ DOUBLE POINTS! Guess a consonant.` };
    default: {
      const val = seg.val as number;
      if (noConsLeft) return { ...gs, phase: 'spin', lastSegLabel: seg.label, lastSegIdx: segIdx, message: `No consonants left! ${who} spins again.` };
      return { ...gs, phase: 'guessing', segValue: val, doubleActive: false, lastSegLabel: seg.label, lastSegIdx: segIdx, message: `$${val}! Guess a consonant.` };
    }
  }
}

function handleGuess(gs: SsGs, letter: string): SsGs {
  if (gs.guessed.includes(letter)) return gs;
  const newGuessed = [...gs.guessed, letter];
  const count = gs.puzzle.answer.split('').filter(c => c === letter).length;
  if (count === 0) return nextTurn({ ...gs, guessed: newGuessed }, `No ${letter}s in the puzzle. Turn passes.`);
  const newRevealed = gs.revealed.includes(letter) ? gs.revealed : [...gs.revealed, letter];
  const base = gs.doubleActive ? 500 : (gs.segValue ?? 0);
  const mult = gs.doubleActive ? 2 : 1;
  const earned = base * mult * count;
  const newPlayers = gs.players.map((p, i) => i === gs.turn ? { ...p, roundScore: p.roundScore + earned } : p);
  const gs2: SsGs = { ...gs, guessed: newGuessed, revealed: newRevealed, players: newPlayers, phase: 'spin', segValue: null, doubleActive: false, lastSegIdx: null, message: `${count} ${letter}${count > 1 ? 's' : ''}! +$${earned}. Keep going!` };
  if (isComplete(gs2.puzzle, gs2.revealed)) return finishRound(gs2, gs.turn);
  return gs2;
}

function handleVowel(gs: SsGs, letter: string): SsGs {
  if (!VOWELS.has(letter) || gs.guessed.includes(letter)) return gs;
  const cost = gs.vowelFree ? 0 : VOWEL_COST;
  const newGuessed = [...gs.guessed, letter];
  const newPlayers = gs.players.map((p, i) => i === gs.turn ? { ...p, roundScore: Math.max(0, p.roundScore - cost) } : p);
  const count = gs.puzzle.answer.split('').filter(c => c === letter).length;
  if (count === 0) return nextTurn({ ...gs, guessed: newGuessed, players: newPlayers, vowelFree: false }, `No ${letter}s! ${cost > 0 ? '−$250. ' : ''}Turn passes.`);
  const newRevealed = gs.revealed.includes(letter) ? gs.revealed : [...gs.revealed, letter];
  const gs2: SsGs = { ...gs, guessed: newGuessed, revealed: newRevealed, players: newPlayers, phase: 'spin', vowelFree: false, lastSegIdx: null, message: `${count} ${letter}${count > 1 ? 's' : ''}! ${cost > 0 ? '−$250. ' : 'Free! '}Keep going!` };
  if (isComplete(gs2.puzzle, gs2.revealed)) return finishRound(gs2, gs.turn);
  return gs2;
}

function handleSolve(gs: SsGs, attempt: string): SsGs {
  const normalized = attempt.trim().toUpperCase().replace(/\s+/g, ' ');
  if (normalized === gs.puzzle.answer) return finishRound(gs, gs.turn);
  return nextTurn(gs, `❌ Wrong answer. Turn passes.`);
}

function startRound(gs: SsGs, round: number, startTurn: number): SsGs {
  const puzzle = gs.puzzles[round - 1] ?? gs.puzzles[0];
  return {
    ...gs, round, puzzle, revealed: [], guessed: [],
    phase: 'spin', turn: startTurn,
    segValue: null, lastSegLabel: '', doubleActive: false, vowelFree: false, roundWinner: '', lastSegIdx: null,
    message: `Round ${round} — ${puzzle.cat}. ${gs.players[startTurn].name} goes first!`,
  };
}

function buildGs(players: SsRoomPlayer[], totalRounds: number): SsGs {
  const pool = shuffle([...PUZZLES]).slice(0, totalRounds);
  const gsPlayers: SsGsPlayer[] = players.map(p => ({ name: p.name, roundScore: 0, totalScore: 0, extraSpins: 0 }));
  const puzzle = pool[0];
  return {
    players: gsPlayers, turn: 0, round: 1, totalRounds,
    puzzles: pool, puzzle, revealed: [], guessed: [],
    phase: 'spin', segValue: null, lastSegLabel: '', doubleActive: false, vowelFree: false,
    message: `Round 1 — ${puzzle.cat}. ${gsPlayers[0].name} goes first!`,
    roundWinner: '', lastSegIdx: null,
  };
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────
export function createSsRoom(ws: WebSocket, name: string): string {
  let code: string;
  do { code = genCode(); } while (rooms.has(code));
  rooms.set(code, { code, players: [{ ws, seat: 0, name, color: SS_COLORS[0] }], gs: null, totalRounds: 5, started: false, createdAt: Date.now() });
  for (const [k, r] of rooms) { if (Date.now() - r.createdAt > 7_200_000) rooms.delete(k); }
  return code;
}

export function joinSsRoom(code: string, ws: WebSocket, name: string): { room: SsRoom; seat: number } | null {
  const room = rooms.get(code.toUpperCase());
  if (!room || room.started || room.players.length >= MAX_SS_HUMANS) return null;
  const seat = room.players.length;
  room.players.push({ ws, seat, name, color: SS_COLORS[seat] ?? '#a78bfa' });
  return { room, seat };
}

export function getSsRoom(code: string): SsRoom | undefined {
  return rooms.get(code.toUpperCase());
}

export function lobbySnapshotSs(room: SsRoom): SsLobbyPlayer[] {
  return room.players.map(p => ({ seat: p.seat, name: p.name, color: p.color }));
}

export function startSsGame(room: SsRoom, totalRounds: number): void {
  room.totalRounds = totalRounds;
  room.started = true;
  room.gs = buildGs(room.players, totalRounds);
  broadcastSs(room, { type: 'ss_started', gs: room.gs, players: lobbySnapshotSs(room) });
}

export function removeSsPlayer(code: string, ws: WebSocket): { room: SsRoom; seat: number; name: string } | null {
  const room = rooms.get(code.toUpperCase());
  if (!room) return null;
  const idx = room.players.findIndex(p => p.ws === ws);
  if (idx < 0) return null;
  const [player] = room.players.splice(idx, 1);
  if (room.players.length === 0) { rooms.delete(code); return { room, seat: player.seat, name: player.name }; }
  return { room, seat: player.seat, name: player.name };
}

export function handleSsAction(room: SsRoom, seat: number, action: string, letter?: string, answer?: string): void {
  if (!room.gs) return;
  let gs = room.gs;

  // Only the current player can act (except next_round which host can trigger)
  if (action !== 'next_round' && gs.turn !== seat) return;
  if (['round_over', 'game_over'].includes(gs.phase) && action !== 'next_round') return;

  switch (action) {
    case 'spin': {
      if (gs.phase !== 'spin') return;
      const segIdx = Math.floor(Math.random() * NUM_SEGS);
      gs = applySpinResult(gs, segIdx);
      break;
    }
    case 'guess': {
      if (gs.phase !== 'guessing' || !letter) return;
      gs = handleGuess(gs, letter.toUpperCase());
      break;
    }
    case 'buy_vowel': {
      if (gs.phase !== 'spin') return;
      const p = gs.players[gs.turn];
      if (p.roundScore < VOWEL_COST) return;
      const unrevVowels = ['A','E','I','O','U'].filter(v => !gs.guessed.includes(v) && gs.puzzle.answer.includes(v));
      if (unrevVowels.length === 0) return;
      gs = { ...gs, phase: 'vowel', vowelFree: false, lastSegIdx: null, message: `Pick a vowel to buy for $${VOWEL_COST}.` };
      break;
    }
    case 'vowel': {
      if (gs.phase !== 'vowel' || !letter) return;
      gs = handleVowel(gs, letter.toUpperCase());
      break;
    }
    case 'solve': {
      if (!answer) return;
      gs = handleSolve(gs, answer);
      break;
    }
    case 'next_round': {
      if (gs.phase !== 'round_over') return;
      const nextRound = gs.round + 1;
      const nextTurnIdx = nextRound % gs.players.length;
      gs = startRound(gs, nextRound, nextTurnIdx);
      break;
    }
    default: return;
  }

  room.gs = gs;
  broadcastSs(room, { type: 'ss_state', gs });
}
