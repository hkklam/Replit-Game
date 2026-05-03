import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'wouter';

// ─── PUZZLE LIBRARY (52 puzzles) ──────────────────────────────────────────────
interface PuzzleDef { cat: string; answer: string; hint: string; difficulty: 'easy' | 'medium' | 'hard'; }
const PUZZLES: PuzzleDef[] = [
  { cat: 'Food & Drink',      answer: 'PIZZA PARTY',                    hint: 'A fun meal with friends',            difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'CHOCOLATE CAKE',                  hint: 'Sweet birthday classic',             difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'GRILLED CHEESE SANDWICH',         hint: 'Golden and gooey',                   difficulty: 'medium' },
  { cat: 'Food & Drink',      answer: 'SPAGHETTI AND MEATBALLS',         hint: 'Italian favourite',                  difficulty: 'medium' },
  { cat: 'Food & Drink',      answer: 'BANANA SPLIT',                    hint: 'Ice cream dessert',                  difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'HOT FUDGE SUNDAE',                hint: 'Drizzled with chocolate',            difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'CHICKEN NOODLE SOUP',             hint: 'Good for a cold day',                difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'FRENCH TOAST',                    hint: 'Egg-soaked breakfast bread',         difficulty: 'easy' },
  { cat: 'Places',            answer: 'NEW YORK CITY',                   hint: 'The Big Apple',                      difficulty: 'easy' },
  { cat: 'Places',            answer: 'EIFFEL TOWER',                    hint: 'Paris landmark',                     difficulty: 'easy' },
  { cat: 'Places',            answer: 'NIAGARA FALLS',                   hint: 'Thundering waterfall on the border', difficulty: 'easy' },
  { cat: 'Places',            answer: 'GRAND CANYON',                    hint: 'Deep gorge in Arizona',              difficulty: 'easy' },
  { cat: 'Places',            answer: 'MOUNT EVEREST',                   hint: "World's highest peak",               difficulty: 'medium' },
  { cat: 'Places',            answer: 'AMAZON RAIN FOREST',              hint: 'Lungs of the Earth',                 difficulty: 'medium' },
  { cat: 'Places',            answer: 'SYDNEY OPERA HOUSE',              hint: 'Iconic Australian venue',            difficulty: 'medium' },
  { cat: 'Places',            answer: 'GREAT BARRIER REEF',              hint: 'Coral wonder off Australia',         difficulty: 'medium' },
  { cat: 'Phrase',            answer: 'BETTER LATE THAN NEVER',          hint: 'Arriving on time is overrated',      difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'PIECE OF CAKE',                   hint: 'Extremely easy',                     difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'BREAK A LEG',                     hint: 'Good luck on stage',                 difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'UNDER THE WEATHER',               hint: 'Feeling ill',                        difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'HIT THE NAIL ON THE HEAD',        hint: 'Exactly right',                      difficulty: 'medium' },
  { cat: 'Phrase',            answer: 'LET THE CAT OUT OF THE BAG',      hint: 'Revealed a secret',                  difficulty: 'medium' },
  { cat: 'Phrase',            answer: 'BITE THE BULLET',                 hint: 'Endure a painful situation',         difficulty: 'medium' },
  { cat: 'Phrase',            answer: 'ACTIONS SPEAK LOUDER THAN WORDS', hint: 'Do, not just say',                   difficulty: 'hard' },
  { cat: 'Phrase',            answer: 'THE EARLY BIRD CATCHES THE WORM', hint: 'Rewards for being first',            difficulty: 'hard' },
  { cat: 'Phrase',            answer: 'EVERY CLOUD HAS A SILVER LINING', hint: 'Optimism in bad times',              difficulty: 'hard' },
  { cat: 'Phrase',            answer: 'WHEN IN ROME DO AS THE ROMANS DO',hint: 'Follow local customs',               difficulty: 'hard' },
  { cat: 'Thing',             answer: 'ROLLER COASTER',                  hint: 'Thrilling amusement ride',           difficulty: 'easy' },
  { cat: 'Thing',             answer: 'BIRTHDAY SURPRISE',               hint: 'Unexpected party!',                  difficulty: 'easy' },
  { cat: 'Thing',             answer: 'MAGIC CARPET RIDE',               hint: 'Flying on a rug',                    difficulty: 'medium' },
  { cat: 'Thing',             answer: 'SHOOTING STARS',                  hint: 'Make a wish!',                       difficulty: 'easy' },
  { cat: 'Thing',             answer: 'DIAMOND RING',                    hint: 'A sparkling proposal',               difficulty: 'easy' },
  { cat: 'Thing',             answer: 'TREASURE MAP',                    hint: 'X marks the spot',                   difficulty: 'easy' },
  { cat: 'Thing',             answer: 'TIME MACHINE',                    hint: 'Travel through history',             difficulty: 'medium' },
  { cat: 'Thing',             answer: 'SUBMARINE SANDWICH',              hint: 'Long deli creation',                 difficulty: 'medium' },
  { cat: 'Famous Person',     answer: 'ALBERT EINSTEIN',                 hint: 'Theory of relativity',               difficulty: 'easy' },
  { cat: 'Famous Person',     answer: 'MICHAEL JORDAN',                  hint: 'Basketball GOAT',                    difficulty: 'easy' },
  { cat: 'Famous Person',     answer: 'TAYLOR SWIFT',                    hint: 'Pop music superstar',                difficulty: 'easy' },
  { cat: 'Famous Person',     answer: 'OPRAH WINFREY',                   hint: 'Legendary talk show host',           difficulty: 'medium' },
  { cat: 'Famous Person',     answer: 'LEONARDO DA VINCI',               hint: 'Renaissance genius',                 difficulty: 'medium' },
  { cat: 'Famous Person',     answer: 'QUEEN ELIZABETH',                 hint: 'British monarch',                    difficulty: 'medium' },
  { cat: 'Movie',             answer: 'THE LION KING',                   hint: 'Hakuna Matata',                      difficulty: 'easy' },
  { cat: 'Movie',             answer: 'JURASSIC PARK',                   hint: 'Dinosaurs on the loose',             difficulty: 'easy' },
  { cat: 'Movie',             answer: 'THE WIZARD OF OZ',                hint: 'Follow the yellow brick road',       difficulty: 'easy' },
  { cat: 'Movie',             answer: 'STAR WARS',                       hint: 'May the Force be with you',          difficulty: 'easy' },
  { cat: 'Movie',             answer: 'HOME ALONE',                      hint: 'Kid defends the house',              difficulty: 'easy' },
  { cat: 'Movie',             answer: 'BACK TO THE FUTURE',              hint: 'Flux capacitor required',            difficulty: 'medium' },
  { cat: 'Fun & Games',       answer: 'WINNER WINNER CHICKEN DINNER',    hint: 'Battle royale catchphrase',          difficulty: 'hard' },
  { cat: 'Fun & Games',       answer: 'SPIN THE WHEEL',                  hint: 'Game show move',                     difficulty: 'easy' },
  { cat: 'Fun & Games',       answer: 'PRESS YOUR LUCK',                 hint: 'Risk it for the biscuit',            difficulty: 'medium' },
  { cat: 'Around the House',  answer: 'KITCHEN COUNTER',                 hint: 'Where meals are prepped',            difficulty: 'easy' },
  { cat: 'Around the House',  answer: 'LIVING ROOM SOFA',                hint: 'Cozy seating for TV time',           difficulty: 'easy' },
];

// ─── WHEEL SEGMENTS (24 exactly matching PRD) ────────────────────────────────
type SpecialVal = 'BANKRUPT' | 'LOSE_TURN' | 'FREE_VOWEL' | 'DOUBLE' | 'EXTRA_SPIN';
type WheelVal = number | SpecialVal;
interface Seg { val: WheelVal; label: string; color: string; fg: string; }

const SEGMENTS: Seg[] = [
  { val: 100,          label: '100',   color: '#ef4444', fg: '#fff' },
  { val: 200,          label: '200',   color: '#f97316', fg: '#fff' },
  { val: 300,          label: '300',   color: '#eab308', fg: '#000' },
  { val: 400,          label: '400',   color: '#22c55e', fg: '#fff' },
  { val: 500,          label: '500',   color: '#06b6d4', fg: '#fff' },
  { val: 'LOSE_TURN',  label: 'LOSE',  color: '#6b7280', fg: '#fff' },
  { val: 600,          label: '600',   color: '#3b82f6', fg: '#fff' },
  { val: 700,          label: '700',   color: '#8b5cf6', fg: '#fff' },
  { val: 'BANKRUPT',   label: 'BKRPT', color: '#111111', fg: '#ef4444' },
  { val: 800,          label: '800',   color: '#ec4899', fg: '#fff' },
  { val: 300,          label: '300',   color: '#f97316', fg: '#fff' },
  { val: 'FREE_VOWEL', label: 'FREE',  color: '#10b981', fg: '#fff' },
  { val: 400,          label: '400',   color: '#eab308', fg: '#000' },
  { val: 900,          label: '900',   color: '#22c55e', fg: '#fff' },
  { val: 'LOSE_TURN',  label: 'LOSE',  color: '#6b7280', fg: '#fff' },
  { val: 500,          label: '500',   color: '#06b6d4', fg: '#fff' },
  { val: 'DOUBLE',     label: '2X',    color: '#f59e0b', fg: '#000' },
  { val: 200,          label: '200',   color: '#ef4444', fg: '#fff' },
  { val: 600,          label: '600',   color: '#3b82f6', fg: '#fff' },
  { val: 'BANKRUPT',   label: 'BKRPT', color: '#111111', fg: '#ef4444' },
  { val: 700,          label: '700',   color: '#8b5cf6', fg: '#fff' },
  { val: 'EXTRA_SPIN', label: '+SPIN', color: '#a855f7', fg: '#fff' },
  { val: 300,          label: '300',   color: '#22c55e', fg: '#fff' },
  { val: 1000,         label: '1000',  color: '#fbbf24', fg: '#000' },
];

const NUM_SEGS = 24;
const SEG_DEG = 360 / NUM_SEGS;
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);
const CONSONANTS = 'BCDFGHJKLMNPQRSTVWXYZ'.split('');
// Ordered by frequency — AI picks the most statistically likely letters first
const CONS_BY_FREQ = ['T','N','S','R','H','D','L','C','M','G','B','F','P','Y','W','K','V','X','J','Q','Z'];
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const VOWEL_COST = 250;

// ─── TYPES ────────────────────────────────────────────────────────────────────
type Difficulty = 'easy' | 'normal' | 'hard';

interface Player {
  name: string;
  isAI: boolean;
  roundScore: number;
  totalScore: number;
  extraSpins: number;
}
type Phase = 'setup' | 'spin' | 'guessing' | 'vowel' | 'ai' | 'round_over' | 'game_over';

interface GS {
  players: Player[];
  turn: number;
  round: number;
  totalRounds: number;
  puzzles: PuzzleDef[];
  puzzle: PuzzleDef;
  revealed: string[];
  guessed: string[];
  phase: Phase;
  segValue: number | null;
  lastSegLabel: string;
  doubleActive: boolean;
  vowelFree: boolean;
  wheelAngle: number;
  spinning: boolean;
  message: string;
  roundWinner: string;
  difficulty: Difficulty;
  showHint: boolean;
}

// ─── PURE GAME LOGIC (no UI, fully testable) ──────────────────────────────────

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

function mkPlayer(name: string, isAI: boolean): Player {
  return { name, isAI, roundScore: 0, totalScore: 0, extraSpins: 0 };
}

function initGame(difficulty: Difficulty = 'normal'): GS {
  const diffFilter: Record<Difficulty, Array<PuzzleDef['difficulty']>> = {
    easy: ['easy'],
    normal: ['easy', 'medium'],
    hard: ['medium', 'hard'],
  };
  const allowed = diffFilter[difficulty];
  const pool = shuffle(PUZZLES.filter(p => allowed.includes(p.difficulty)));
  const puzzles = pool.length >= 5 ? pool.slice(0, 5) : shuffle([...PUZZLES]).slice(0, 5);
  return {
    players: [
      mkPlayer('You', false),
      mkPlayer('Nikki', true),
      mkPlayer('Rex', true),
    ],
    turn: 0, round: 1, totalRounds: 5,
    puzzles, puzzle: puzzles[0],
    revealed: [], guessed: [],
    phase: 'spin', segValue: null, lastSegLabel: '', doubleActive: false, vowelFree: false,
    wheelAngle: 0, spinning: false,
    message: `Round 1 — ${puzzles[0].cat}. Spin to start!`,
    roundWinner: '',
    difficulty, showHint: false,
  };
}

function nextTurn(gs: GS, msg: string): GS {
  const next = (gs.turn + 1) % gs.players.length;
  return {
    ...gs,
    turn: next,
    segValue: null,
    lastSegLabel: '',
    doubleActive: false,
    vowelFree: false,
    phase: gs.players[next].isAI ? 'ai' : 'spin',
    message: msg,
    showHint: false,
  };
}

function finishRound(gs: GS, winnerIdx: number): GS {
  const winnerName = gs.players[winnerIdx].name;
  const newPlayers = gs.players.map(p => ({
    ...p,
    totalScore: p.totalScore + p.roundScore,
    roundScore: 0,
  }));
  return {
    ...gs,
    players: newPlayers,
    phase: gs.round >= gs.totalRounds ? 'game_over' : 'round_over',
    roundWinner: winnerName,
    message: `🎉 ${winnerName} solved it!`,
    showHint: false,
  };
}

function applySpinResult(gs: GS, segIdx: number): GS {
  const seg = SEGMENTS[segIdx];
  const who = gs.players[gs.turn].name;
  const noConsLeft = allConsonantsRevealed(gs.puzzle, gs.guessed);

  switch (seg.val as WheelVal) {
    case 'BANKRUPT': {
      const newPlayers = gs.players.map((p, i) =>
        i === gs.turn ? { ...p, roundScore: 0, extraSpins: 0 } : p
      );
      return nextTurn({ ...gs, players: newPlayers }, `💥 ${who} hit BANKRUPT! Round score gone.`);
    }
    case 'LOSE_TURN': {
      // Extra spin token cancels a lose turn
      const p = gs.players[gs.turn];
      if (p.extraSpins > 0) {
        const newPlayers = gs.players.map((pl, i) =>
          i === gs.turn ? { ...pl, extraSpins: pl.extraSpins - 1 } : pl
        );
        return { ...gs, players: newPlayers, phase: 'spin', lastSegLabel: seg.label,
          message: `${who} used an Extra Spin token to cancel Lose Turn! Spin again.` };
      }
      return nextTurn(gs, `😬 ${who} loses a turn!`);
    }
    case 'FREE_VOWEL':
      if (allVowelsRevealed(gs.puzzle, gs.guessed))
        return { ...gs, phase: 'spin', lastSegLabel: seg.label, message: `All vowels revealed! ${who} spins again.` };
      return { ...gs, phase: 'vowel', vowelFree: true, lastSegLabel: seg.label,
        message: `🎁 ${who} gets a FREE VOWEL! Pick one.` };
    case 'EXTRA_SPIN': {
      const newPlayers = gs.players.map((p, i) =>
        i === gs.turn ? { ...p, extraSpins: p.extraSpins + 1 } : p
      );
      return { ...gs, players: newPlayers, phase: 'spin', lastSegLabel: seg.label,
        message: `🎡 ${who} earned an Extra Spin token! Spin again.` };
    }
    case 'DOUBLE':
      if (noConsLeft)
        return { ...gs, phase: 'spin', lastSegLabel: seg.label, message: `No consonants left! ${who} spins again.` };
      return { ...gs, phase: 'guessing', segValue: 500, doubleActive: true, lastSegLabel: seg.label,
        message: `2️⃣ DOUBLE POINTS! Guess a consonant.` };
    default: {
      const val = seg.val as number;
      if (noConsLeft)
        return { ...gs, phase: 'spin', lastSegLabel: seg.label, message: `No consonants left! ${who} spins again.` };
      return { ...gs, phase: 'guessing', segValue: val, doubleActive: false, lastSegLabel: seg.label,
        message: `$${val}! Guess a consonant.` };
    }
  }
}

function handleGuess(gs: GS, letter: string): GS {
  if (gs.guessed.includes(letter)) return gs; // guard duplicate
  const newGuessed = [...gs.guessed, letter];
  const count = gs.puzzle.answer.split('').filter(c => c === letter).length;
  if (count === 0) {
    return nextTurn({ ...gs, guessed: newGuessed }, `No ${letter}s in the puzzle. Turn passes.`);
  }
  const newRevealed = gs.revealed.includes(letter) ? gs.revealed : [...gs.revealed, letter];
  const base = gs.doubleActive ? 500 : (gs.segValue ?? 0);
  const mult = gs.doubleActive ? 2 : 1;
  const earned = base * mult * count;
  const newPlayers = gs.players.map((p, i) =>
    i === gs.turn ? { ...p, roundScore: p.roundScore + earned } : p
  );
  const gs2: GS = {
    ...gs, guessed: newGuessed, revealed: newRevealed, players: newPlayers,
    phase: 'spin', segValue: null, doubleActive: false,
    message: `${count} ${letter}${count > 1 ? 's' : ''}! +$${earned}. Keep going!`,
  };
  if (isComplete(gs2.puzzle, gs2.revealed)) return finishRound(gs2, gs.turn);
  return gs2;
}

function handleVowel(gs: GS, letter: string): GS {
  if (!VOWELS.has(letter)) return gs; // guard non-vowel
  if (gs.guessed.includes(letter)) return gs; // guard duplicate
  const cost = gs.vowelFree ? 0 : VOWEL_COST;
  const newGuessed = [...gs.guessed, letter];
  const newPlayers = gs.players.map((p, i) =>
    i === gs.turn ? { ...p, roundScore: Math.max(0, p.roundScore - cost) } : p
  );
  const count = gs.puzzle.answer.split('').filter(c => c === letter).length;
  if (count === 0) {
    return nextTurn(
      { ...gs, guessed: newGuessed, players: newPlayers, vowelFree: false },
      `No ${letter}s! ${cost > 0 ? '−$250. ' : ''}Turn passes.`
    );
  }
  const newRevealed = gs.revealed.includes(letter) ? gs.revealed : [...gs.revealed, letter];
  const gs2: GS = {
    ...gs, guessed: newGuessed, revealed: newRevealed, players: newPlayers,
    phase: 'spin', vowelFree: false,
    message: `${count} ${letter}${count > 1 ? 's' : ''}! ${cost > 0 ? '−$250. ' : 'Free! '}Keep going!`,
  };
  if (isComplete(gs2.puzzle, gs2.revealed)) return finishRound(gs2, gs.turn);
  return gs2;
}

function handleSolve(gs: GS, attempt: string): GS {
  const normalized = attempt.trim().toUpperCase().replace(/\s+/g, ' ');
  if (normalized === gs.puzzle.answer) return finishRound(gs, gs.turn);
  return nextTurn(gs, `❌ Wrong answer. Turn passes.`);
}

// ─── AI (V2: difficulty-aware) ────────────────────────────────────────────────
function computeAI(gs: GS): GS {
  const player = gs.players[gs.turn];
  const unrevVowels = ['A','E','I','O','U'].filter(v => !gs.guessed.includes(v) && gs.puzzle.answer.includes(v));
  const uniqueLetters = [...new Set(gs.puzzle.answer.replace(/[^A-Z]/g, '').split(''))];
  const revRatio = uniqueLetters.filter(c => gs.revealed.includes(c)).length / Math.max(uniqueLetters.length, 1);
  const diff = gs.difficulty;

  // Solve thresholds by difficulty
  const solveThreshold = diff === 'easy' ? 0.92 : diff === 'normal' ? 0.80 : 0.65;
  // How likely AI buys a vowel when it can
  const vowelChance = diff === 'easy' ? 0.1 : diff === 'normal' ? 0.22 : 0.35;

  // --- Phase: must guess consonant ---
  if (gs.phase === 'guessing') {
    // Hard AI picks rarer consonants sometimes (adds variety)
    const pool = diff === 'hard'
      ? CONS_BY_FREQ.filter(c => !gs.guessed.includes(c))
      : CONS_BY_FREQ.slice(0, 12).filter(c => !gs.guessed.includes(c));
    const pick = pool[0] ?? CONS_BY_FREQ.find(c => !gs.guessed.includes(c)) ?? 'Z';
    return handleGuess(gs, pick);
  }

  // --- Phase: must pick vowel ---
  if (gs.phase === 'vowel') {
    const v = unrevVowels[0];
    if (v) return handleVowel(gs, v);
    return nextTurn(gs, `${player.name} passes.`);
  }

  // --- Phase: spin / ai (AI decides action) ---
  // Try to solve if confident enough
  if (revRatio >= solveThreshold) {
    return finishRound(gs, gs.turn);
  }

  // Maybe buy a vowel
  const canBuyVowel = player.roundScore >= VOWEL_COST && unrevVowels.length > 0;
  if (canBuyVowel && Math.random() < vowelChance) {
    return handleVowel({ ...gs, phase: 'vowel', vowelFree: false }, unrevVowels[0]);
  }

  // Spin
  const segIdx = Math.floor(Math.random() * NUM_SEGS);
  const result = applySpinResult(gs, segIdx);

  // After spin, if we need to guess immediately
  if (result.phase === 'guessing') {
    const pool = CONS_BY_FREQ.filter(c => !result.guessed.includes(c));
    const pick = pool[0] ?? 'Z';
    return handleGuess(result, pick);
  }
  if (result.phase === 'vowel' && result.vowelFree) {
    const v = unrevVowels[0];
    if (v) return handleVowel(result, v);
    return nextTurn(result, `${player.name} passes.`);
  }
  return result;
}

// ─── WHEEL SVG ────────────────────────────────────────────────────────────────
function xyAt(deg: number, r: number, cx: number, cy: number): [number, number] {
  const rad = (deg - 90) * Math.PI / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function slicePath(idx: number, cx: number, cy: number, r: number): string {
  const [x1, y1] = xyAt(idx * SEG_DEG, r, cx, cy);
  const [x2, y2] = xyAt((idx + 1) * SEG_DEG, r, cx, cy);
  return `M ${cx},${cy} L ${x1},${y1} A ${r},${r} 0 0,1 ${x2},${y2} Z`;
}

function WheelSVG({ angle, spinning }: { angle: number; spinning: boolean }) {
  const cx = 130, cy = 130, r = 118, rt = 88;
  return (
    <div style={{ position: 'relative', width: 260, height: 260, margin: '0 auto', flexShrink: 0 }}>
      <div style={{
        position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)',
        zIndex: 10, width: 0, height: 0,
        borderLeft: '13px solid transparent',
        borderRight: '13px solid transparent',
        borderTop: '30px solid #f0c040',
        filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.7))',
      }} />
      <div style={{
        width: 260, height: 260,
        transform: `rotate(${angle}deg)`,
        transition: spinning ? 'transform 4.2s cubic-bezier(0.08,0.6,0.85,1)' : 'none',
        willChange: 'transform',
      }}>
        <svg width={260} height={260} viewBox="0 0 260 260">
          <circle cx={cx} cy={cy} r={r + 8} fill="#1a1a2e" />
          <circle cx={cx} cy={cy} r={r + 3} fill="#2a2a5e" />
          {SEGMENTS.map((seg, i) => {
            const mid = (i + 0.5) * SEG_DEG;
            const [tx, ty] = xyAt(mid, rt, cx, cy);
            return (
              <g key={i}>
                <path d={slicePath(i, cx, cy, r)} fill={seg.color}
                  stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
                <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle"
                  transform={`rotate(${mid},${tx},${ty})`}
                  fontSize={seg.label.length > 4 ? 7 : 9.5}
                  fontWeight="bold" fill={seg.fg}
                  style={{ userSelect: 'none', pointerEvents: 'none' }}>
                  {seg.label}
                </text>
              </g>
            );
          })}
          <circle cx={cx} cy={cy} r={20} fill="#1a1a2e" stroke="#f0c040" strokeWidth={2.5} />
          <circle cx={cx} cy={cy} r={12} fill="#f0c040" />
        </svg>
      </div>
    </div>
  );
}

// ─── PUZZLE BOARD ─────────────────────────────────────────────────────────────
function PuzzleBoard({ puzzle, revealed }: { puzzle: PuzzleDef; revealed: string[] }) {
  const words = puzzle.answer.split(' ');
  const totalLetters = puzzle.answer.replace(/ /g, '').length;
  const tileSize = totalLetters > 20 ? 26 : totalLetters > 14 ? 30 : 34;
  const fontSize = tileSize - 12;
  return (
    <div style={{ padding: '10px 12px 8px', display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center' }}>
      {words.map((word, wi) => (
        <div key={wi} style={{ display: 'flex', gap: 2 }}>
          {word.split('').map((ch, ci) => {
            const rev = revealed.includes(ch) || !/[A-Z]/.test(ch);
            return (
              <div key={ci} style={{
                width: tileSize, height: tileSize + 8, flexShrink: 0,
                background: rev ? '#f0ece0' : '#1a2a60',
                borderRadius: 3,
                borderBottom: `3px solid ${rev ? '#c8a850' : '#2a3a80'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize, fontWeight: 900, color: '#1a1a1a',
                fontFamily: 'Georgia, serif',
                boxShadow: rev ? '0 2px 4px rgba(0,0,0,0.35)' : 'none',
                transition: 'background 0.2s, border-color 0.2s',
              }}>
                {rev ? ch : ''}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── LETTER KEYBOARD ──────────────────────────────────────────────────────────
function LetterKeys({ guessed, onGuess, mode }: {
  guessed: string[];
  onGuess: (l: string) => void;
  mode: 'consonant' | 'vowel';
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', maxWidth: 400, margin: '0 auto', padding: '4px 8px' }}>
      {ALPHABET.map(letter => {
        const isVowel = VOWELS.has(letter);
        const used = guessed.includes(letter);
        const inactive = mode === 'consonant' ? isVowel : !isVowel;
        const disabled = used || inactive;
        const bg = used ? '#0a0a14' : inactive ? '#12121e' : isVowel ? '#1e3a8a' : '#14532d';
        const border = used || inactive ? '#1e1e30' : isVowel ? '#3b82f6' : '#22c55e';
        return (
          <button key={letter} onClick={() => !disabled && onGuess(letter)} disabled={disabled}
            style={{
              width: 32, height: 36, background: bg, border: `1.5px solid ${border}`,
              borderRadius: 6, color: used || inactive ? '#2a2a3a' : '#fff',
              fontSize: 13, fontWeight: 700, cursor: disabled ? 'default' : 'pointer',
              transition: 'all 0.1s',
            }}>
            {letter}
          </button>
        );
      })}
    </div>
  );
}

// ─── SOLVE MODAL ──────────────────────────────────────────────────────────────
function SolveModal({ onSubmit, onCancel }: { onSubmit: (t: string) => void; onCancel: () => void }) {
  const [val, setVal] = useState('');
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)',
    }}>
      <div style={{ background: '#0d1b2a', border: '2px solid #f0c040', borderRadius: 16, padding: 28, textAlign: 'center', width: 340 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div>
        <h3 style={{ color: '#f0c040', margin: '0 0 16px' }}>Solve the Puzzle!</h3>
        <input value={val} onChange={e => setVal(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && val.trim() && onSubmit(val)}
          placeholder="Type your answer..."
          autoFocus
          style={{
            width: '100%', padding: '10px 12px',
            background: '#1a2a40', border: '2px solid #3a5a80',
            borderRadius: 8, color: '#fff', fontSize: 16, fontWeight: 700,
            boxSizing: 'border-box', fontFamily: 'Georgia, serif', letterSpacing: 1,
          }} />
        <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'center' }}>
          <button onClick={() => val.trim() && onSubmit(val)}
            style={{ padding: '10px 28px', background: '#16a34a', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
            Submit ✓
          </button>
          <button onClick={onCancel}
            style={{ padding: '10px 20px', background: '#374151', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ROUND OVER MODAL ─────────────────────────────────────────────────────────
function RoundModal({ gs, onNext }: { gs: GS; onNext: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)',
    }}>
      <div style={{ background: '#0d1b2a', border: '2px solid #f0c040', borderRadius: 20, padding: '28px 32px', textAlign: 'center', maxWidth: 420, width: '90%' }}>
        <div style={{ fontSize: 44 }}>🎉</div>
        <h2 style={{ color: '#f0c040', fontSize: 22, margin: '8px 0 4px' }}>Round {gs.round} Complete!</h2>
        <p style={{ color: '#22c55e', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{gs.roundWinner} solved it!</p>
        <p style={{ color: '#888', fontSize: 15, fontFamily: 'Georgia, serif', marginBottom: 18, fontStyle: 'italic' }}>
          "{gs.puzzle.answer}"
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 20 }}>
          {gs.players.map((p, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, padding: '10px 6px',
            }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>{p.name}</div>
              <div style={{ color: '#f0c040', fontWeight: 700, fontSize: 17 }}>${p.totalScore}</div>
              <div style={{ fontSize: 10, color: '#555' }}>total</div>
            </div>
          ))}
        </div>
        <button onClick={onNext}
          style={{ padding: '12px 36px', background: 'linear-gradient(135deg,#1a4a2a,#16a34a)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>
          {gs.round < gs.totalRounds ? `Round ${gs.round + 1} →` : 'Final Results →'}
        </button>
      </div>
    </div>
  );
}

// ─── GAME OVER MODAL ──────────────────────────────────────────────────────────
function GameOverModal({ gs, onNew }: { gs: GS; onNew: () => void }) {
  const sorted = [...gs.players].sort((a, b) => b.totalScore - a.totalScore);
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.94)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, backdropFilter: 'blur(6px)',
    }}>
      <div style={{ background: '#0d1b2a', border: '2px solid #f0c040', borderRadius: 20, padding: '30px 36px', textAlign: 'center', maxWidth: 400, width: '90%' }}>
        <div style={{ fontSize: 52 }}>🏆</div>
        <h2 style={{ color: '#f0c040', fontSize: 26, margin: '8px 0 4px' }}>Game Over!</h2>
        <p style={{ color: '#aaa', marginBottom: 20 }}>{sorted[0].name} wins!</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {sorted.map((p, i) => (
            <div key={p.name} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: i === 0 ? 'rgba(240,192,64,0.12)' : 'rgba(255,255,255,0.04)',
              border: i === 0 ? '1px solid rgba(240,192,64,0.4)' : '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, padding: '10px 16px',
            }}>
              <span style={{ fontSize: 22 }}>{medals[i] ?? ''}</span>
              <span style={{ flex: 1, textAlign: 'left', fontWeight: 700 }}>{p.name}</span>
              <span style={{ color: '#f0c040', fontWeight: 700, fontSize: 18 }}>${p.totalScore}</span>
            </div>
          ))}
        </div>
        <button onClick={onNew}
          style={{ padding: '12px 40px', background: 'linear-gradient(135deg,#7c1a8a,#a855f7)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer', boxShadow: '0 4px 16px rgba(168,85,247,0.4)' }}>
          Play Again 🎡
        </button>
      </div>
    </div>
  );
}

// ─── SETUP SCREEN (V2) ────────────────────────────────────────────────────────
function SetupScreen({ onStart }: { onStart: (d: Difficulty, rounds: number) => void }) {
  const [diff, setDiff] = useState<Difficulty>('normal');
  const [rounds, setRounds] = useState(5);

  const diffLabels: Record<Difficulty, string> = {
    easy: '😊 Easy — shorter phrases, familiar answers',
    normal: '🎯 Normal — mixed difficulty',
    hard: '🔥 Hard — long phrases and rare letters',
  };
  const diffColors: Record<Difficulty, string> = { easy: '#22c55e', normal: '#f0c040', hard: '#ef4444' };

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(180deg,#050518,#0a0a20)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', fontFamily: "'Segoe UI', sans-serif", color: '#fff',
    }}>
      <div style={{ fontSize: 60, marginBottom: 8 }}>🎡</div>
      <h1 style={{ color: '#f0c040', fontSize: 28, margin: '0 0 4px', textAlign: 'center' }}>Spin & Solve Arena</h1>
      <p style={{ color: '#888', marginBottom: 28, textAlign: 'center' }}>Wheel of Fortune style puzzle game</p>

      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '24px 24px', width: '100%', maxWidth: 380 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 2 }}>Difficulty</div>
          {(['easy', 'normal', 'hard'] as Difficulty[]).map(d => (
            <button key={d} onClick={() => setDiff(d)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', marginBottom: 6,
                background: diff === d ? `rgba(${d === 'easy' ? '34,197,94' : d === 'normal' ? '240,192,64' : '239,68,68'},0.15)` : 'rgba(255,255,255,0.04)',
                border: `2px solid ${diff === d ? diffColors[d] : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 10, color: diff === d ? diffColors[d] : '#888',
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}>
              {diffLabels[d]}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 2 }}>Rounds</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[3, 5, 7].map(r => (
              <button key={r} onClick={() => setRounds(r)}
                style={{
                  flex: 1, padding: '10px 0',
                  background: rounds === r ? 'rgba(240,192,64,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `2px solid ${rounds === r ? '#f0c040' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 10, color: rounds === r ? '#f0c040' : '#888',
                  fontWeight: 700, fontSize: 16, cursor: 'pointer',
                }}>
                {r}
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => onStart(diff, rounds)}
          style={{ width: '100%', padding: '14px 0', background: 'linear-gradient(135deg,#1a3a8a,#2563eb)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: 18, cursor: 'pointer', boxShadow: '0 4px 20px rgba(37,99,235,0.5)', letterSpacing: 1 }}>
          🎡 SPIN & SOLVE!
        </button>
      </div>

      <Link href="/">
        <span style={{ marginTop: 20, color: '#555', fontSize: 13, cursor: 'pointer' }}>← Back to Game Hub</span>
      </Link>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function SpinSolve() {
  const [gs, setGs] = useState<GS | null>(null);
  const [showSolve, setShowSolve] = useState(false);
  const pendingSegRef = useRef<number | null>(null);
  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Start a game from the setup screen
  const startGame = useCallback((difficulty: Difficulty, totalRounds: number) => {
    const base = initGame(difficulty);
    setGs({ ...base, totalRounds, puzzles: base.puzzles.slice(0, totalRounds) });
    setShowSolve(false);
  }, []);

  // AI turn auto-play
  const aiActive = !!gs && gs.players[gs.turn]?.isAI &&
    ['spin', 'guessing', 'vowel', 'ai'].includes(gs.phase) && !gs.spinning;

  useEffect(() => {
    if (!aiActive) return;
    const delay = 900 + Math.random() * 700;
    const t = setTimeout(() => {
      setGs(prev => {
        if (!prev || !prev.players[prev.turn]?.isAI) return prev;
        if (!['spin', 'guessing', 'vowel', 'ai'].includes(prev.phase) || prev.spinning) return prev;
        return computeAI(prev);
      });
    }, delay);
    return () => clearTimeout(t);
  }, [aiActive, gs?.turn, gs?.phase, gs?.guessed.length, gs?.revealed.length]);

  // Cleanup spin timer on unmount
  useEffect(() => () => { if (spinTimerRef.current) clearTimeout(spinTimerRef.current); }, []);

  const doSpin = useCallback(() => {
    setGs(prev => {
      if (!prev || prev.spinning || prev.phase !== 'spin' || prev.players[prev.turn].isAI) return prev;
      const segIdx = Math.floor(Math.random() * NUM_SEGS);
      pendingSegRef.current = segIdx;
      // Calculate exact angle so the pointer lands on the middle of the chosen segment
      const targetDeg = (segIdx + 0.5) * SEG_DEG;
      const prevNorm = ((prev.wheelAngle % 360) + 360) % 360;
      const diff = ((targetDeg - prevNorm) + 360) % 360;
      const newAngle = prev.wheelAngle + diff + (5 + Math.floor(Math.random() * 5)) * 360;
      return { ...prev, spinning: true, wheelAngle: newAngle, message: '🎡 Spinning...' };
    });
    spinTimerRef.current = setTimeout(() => {
      setGs(prev => {
        if (!prev || !prev.spinning) return prev;
        const idx = pendingSegRef.current ?? 0;
        pendingSegRef.current = null;
        return { ...applySpinResult(prev, idx), spinning: false };
      });
    }, 4300);
  }, []);

  const onGuess = useCallback((letter: string) => {
    setGs(prev => {
      if (!prev || prev.players[prev.turn].isAI || prev.spinning) return prev;
      if (prev.phase === 'guessing') return handleGuess(prev, letter);
      if (prev.phase === 'vowel') return handleVowel(prev, letter);
      return prev;
    });
  }, []);

  const doBuyVowel = useCallback(() => {
    setGs(prev => {
      if (!prev || prev.phase !== 'spin' || prev.players[prev.turn].isAI || prev.spinning) return prev;
      if (prev.players[prev.turn].roundScore < VOWEL_COST) return { ...prev, message: `Need $${VOWEL_COST} to buy a vowel!` };
      const unrevVowels = ['A','E','I','O','U'].filter(v => !prev.guessed.includes(v) && prev.puzzle.answer.includes(v));
      if (unrevVowels.length === 0) return { ...prev, message: 'All vowels already revealed!' };
      return { ...prev, phase: 'vowel', vowelFree: false, message: `Pick a vowel to buy for $${VOWEL_COST}.` };
    });
  }, []);

  const doSolveSubmit = useCallback((text: string) => {
    setGs(prev => prev ? handleSolve(prev, text) : prev);
    setShowSolve(false);
  }, []);

  const nextRound = useCallback(() => {
    setGs(prev => {
      if (!prev) return prev;
      const r = prev.round + 1;
      const nextPuzzle = prev.puzzles[r - 1] ?? prev.puzzles[0];
      const next = r % prev.players.length; // rotate starting player each round
      return {
        ...prev, round: r, puzzle: nextPuzzle,
        revealed: [], guessed: [],
        phase: prev.players[next].isAI ? 'ai' : 'spin',
        turn: next, segValue: null, lastSegLabel: '', doubleActive: false, vowelFree: false,
        spinning: false, roundWinner: '', showHint: false,
        message: `Round ${r} — ${nextPuzzle.cat}. ${prev.players[next].name} goes first!`,
      };
    });
  }, []);

  const toggleHint = useCallback(() => setGs(prev => prev ? { ...prev, showHint: !prev.showHint } : prev), []);

  if (!gs) return <SetupScreen onStart={startGame} />;

  const { players, turn, phase, puzzle, revealed, guessed, wheelAngle, spinning, message, doubleActive, showHint } = gs;
  const isHuman = !players[turn]?.isAI;
  const curPlayer = players[turn];
  const humanPlayer = players[0];
  const noConsLeft = allConsonantsRevealed(puzzle, guessed);
  const unrevVowelCount = ['A','E','I','O','U'].filter(v => !guessed.includes(v) && puzzle.answer.includes(v)).length;
  const canBuyVowel = isHuman && phase === 'spin' && !spinning && humanPlayer.roundScore >= VOWEL_COST && unrevVowelCount > 0;
  const canSpin = isHuman && phase === 'spin' && !spinning;
  const spinDisabled = noConsLeft && !canBuyVowel; // disable spin if no consonants left to guess

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(180deg,#050518,#0a0a20)',
      color: '#fff', display: 'flex', flexDirection: 'column',
      fontFamily: "'Segoe UI', sans-serif", userSelect: 'none',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,215,0,0.2)', flexShrink: 0 }}>
        <button onClick={() => setGs(null)}
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '5px 12px', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>
          ← Menu
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#f0c040', letterSpacing: 1 }}>🎡 Spin & Solve Arena</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
            Round {gs.round}/{gs.totalRounds} · {gs.difficulty.toUpperCase()}
          </div>
        </div>
        <button onClick={toggleHint}
          style={{ background: showHint ? 'rgba(240,192,64,0.2)' : 'rgba(255,255,255,0.07)', border: `1px solid ${showHint ? '#f0c040' : 'rgba(255,255,255,0.12)'}`, borderRadius: 8, padding: '5px 12px', color: showHint ? '#f0c040' : 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer' }}>
          💡 Hint
        </button>
      </div>

      {/* Category + Hint */}
      <div style={{ textAlign: 'center', padding: '5px 12px', background: '#0a0a2a', borderBottom: '1px solid rgba(255,215,0,0.12)' }}>
        <span style={{ color: '#555', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' }}>Category</span>
        <div style={{ color: '#f0c040', fontSize: 16, fontWeight: 800, letterSpacing: 2 }}>{puzzle.cat.toUpperCase()}</div>
        {showHint && <div style={{ color: '#888', fontSize: 12, marginTop: 2, fontStyle: 'italic' }}>💡 {puzzle.hint}</div>}
      </div>

      {/* Puzzle Board */}
      <div style={{ background: '#0d1230', borderBottom: '2px solid rgba(255,215,0,0.12)', flexShrink: 0, minHeight: 72 }}>
        <PuzzleBoard puzzle={puzzle} revealed={revealed} />
      </div>

      {/* Score row */}
      <div style={{ display: 'flex', gap: 5, padding: '6px 10px', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
        {players.map((p, i) => (
          <div key={i} style={{
            flex: 1, textAlign: 'center', padding: '4px 4px', borderRadius: 8,
            background: turn === i ? 'rgba(240,192,64,0.12)' : 'rgba(255,255,255,0.04)',
            border: turn === i ? '1px solid rgba(240,192,64,0.4)' : '1px solid rgba(255,255,255,0.07)',
          }}>
            <div style={{ fontSize: 10, color: '#888' }}>{p.name}{p.isAI ? ' 🤖' : ''}{p.extraSpins > 0 ? ` ✨×${p.extraSpins}` : ''}</div>
            <div style={{ color: '#f0c040', fontWeight: 700, fontSize: 14 }}>${p.roundScore}</div>
            <div style={{ fontSize: 10, color: '#555' }}>${p.totalScore} total</div>
          </div>
        ))}
      </div>

      {/* Used letters strip */}
      <div style={{ padding: '5px 12px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center', flexShrink: 0 }}>
        {ALPHABET.map(l => {
          const used = guessed.includes(l);
          const isVowel = VOWELS.has(l);
          return (
            <span key={l} style={{
              width: 21, height: 21, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: used ? (isVowel ? '#1e3a8a' : '#14532d') : 'rgba(255,255,255,0.04)',
              border: `1px solid ${used ? (isVowel ? '#3b82f6' : '#16a34a') : 'rgba(255,255,255,0.07)'}`,
              borderRadius: 3, fontSize: 11, fontWeight: 700,
              color: used ? '#fff' : '#2a2a3a',
            }}>
              {l}
            </span>
          );
        })}
      </div>

      {/* Message banner */}
      <div style={{ padding: '6px 14px', background: doubleActive ? 'rgba(245,158,11,0.12)' : 'rgba(0,0,0,0.15)', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: doubleActive ? '#f59e0b' : isHuman ? '#f0c040' : '#888', textAlign: 'center' }}>
          {message}
        </div>
      </div>

      {/* Wheel + Actions */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 12px 10px', gap: 8, overflowY: 'auto' }}>
        <WheelSVG angle={wheelAngle} spinning={spinning} />

        {/* Action buttons — human spin phase */}
        {isHuman && phase === 'spin' && !spinning && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={doSpin} disabled={!canSpin || spinDisabled}
              style={{
                padding: '11px 26px',
                background: (!canSpin || spinDisabled) ? 'rgba(37,99,235,0.25)' : 'linear-gradient(135deg,#1a3a8a,#2563eb)',
                border: '2px solid #3b82f6', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: 15,
                cursor: (!canSpin || spinDisabled) ? 'not-allowed' : 'pointer',
                boxShadow: (!canSpin || spinDisabled) ? 'none' : '0 4px 14px rgba(37,99,235,0.5)',
                opacity: (!canSpin || spinDisabled) ? 0.5 : 1,
              }}>
              🎡 SPIN!
            </button>
            <button onClick={doBuyVowel} disabled={!canBuyVowel}
              style={{
                padding: '11px 16px',
                background: canBuyVowel ? 'linear-gradient(135deg,#14532d,#16a34a)' : 'rgba(255,255,255,0.05)',
                border: `2px solid ${canBuyVowel ? '#22c55e' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 12, color: canBuyVowel ? '#fff' : '#444', fontWeight: 700, fontSize: 13,
                cursor: canBuyVowel ? 'pointer' : 'not-allowed',
              }}>
              Buy Vowel −$250
            </button>
            <button onClick={() => setShowSolve(true)}
              style={{ padding: '11px 16px', background: 'linear-gradient(135deg,#7c1a1a,#dc2626)', border: '2px solid #ef4444', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 12px rgba(220,38,38,0.4)' }}>
              Solve! 🏆
            </button>
          </div>
        )}

        {/* Consonant keyboard */}
        {isHuman && phase === 'guessing' && (
          <div style={{ width: '100%' }}>
            <div style={{ textAlign: 'center', fontSize: 12, color: '#888', marginBottom: 6 }}>
              ▼ Pick a consonant {doubleActive && <span style={{ color: '#f59e0b' }}>(DOUBLE POINTS!)</span>}
            </div>
            <LetterKeys guessed={guessed} onGuess={onGuess} mode="consonant" />
          </div>
        )}

        {/* Vowel keyboard */}
        {isHuman && phase === 'vowel' && (
          <div style={{ width: '100%' }}>
            <div style={{ textAlign: 'center', fontSize: 12, color: '#888', marginBottom: 6 }}>
              ▼ Pick a vowel ({gs.vowelFree ? '🎁 FREE!' : `−$${VOWEL_COST}`})
            </div>
            <LetterKeys guessed={guessed} onGuess={onGuess} mode="vowel" />
          </div>
        )}

        {/* Spinning indicator */}
        {isHuman && spinning && (
          <div style={{ color: '#888', fontSize: 14, fontWeight: 700 }}>🎡 The wheel is spinning...</div>
        )}

        {/* AI thinking */}
        {!isHuman && ['spin', 'guessing', 'vowel', 'ai'].includes(phase) && !spinning && (
          <div style={{ padding: '10px 24px', background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', color: '#888', fontSize: 13 }}>
            🤖 {curPlayer?.name} is thinking...
          </div>
        )}

        {/* No consonants left hint */}
        {isHuman && phase === 'spin' && noConsLeft && (
          <div style={{ fontSize: 12, color: '#f59e0b', textAlign: 'center', padding: '4px 12px', background: 'rgba(245,158,11,0.1)', borderRadius: 8 }}>
            All consonants revealed! Buy a vowel or try to Solve!
          </div>
        )}
      </div>

      {/* Modals */}
      {showSolve && <SolveModal onSubmit={doSolveSubmit} onCancel={() => setShowSolve(false)} />}
      {phase === 'round_over' && <RoundModal gs={gs} onNext={nextRound} />}
      {phase === 'game_over' && <GameOverModal gs={gs} onNew={() => setGs(null)} />}
    </div>
  );
}
