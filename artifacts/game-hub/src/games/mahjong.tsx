import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { Link } from 'wouter';
import { useMjOnline } from '../lib/mahjong-online';
import type { MjPlayerView, ClaimOpt as OnlineClaimOpt } from '../lib/mahjong-online';

// ─── TYPES ────────────────────────────────────────────────────────────────────
type Suit = 'man' | 'sou' | 'pin' | 'wind' | 'dragon';
type MeldType = 'pung' | 'chow';
type ClaimOpt = 'win' | 'pung' | 'chow' | 'skip';
type Phase = 'ai_act' | 'human_select' | 'claim_window' | 'won' | 'exhausted';

interface Tile { id: number; suit: Suit; value: number; }
interface Meld { type: MeldType; tiles: Tile[]; fromPlayer?: number; }
interface WinInfo { player: number; fan: number; selfDraw: boolean; payer?: number; desc: string[]; }
interface GS {
  wall: Tile[]; wIdx: number;
  hands: Tile[][]; melds: Meld[][]; discards: Tile[][];
  current: number; phase: Phase; dealer: number;
  selIdx: number | null;
  lastDiscard: { tile: Tile; from: number } | null;
  claimOpts: ClaimOpt[];
  winner: WinInfo | null;
  scores: number[];
  msg: string;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const PLAYER_NAMES = ['You', 'East', 'North', 'West'];
const NEXT_P: Record<number, number> = { 1: 0, 0: 3, 3: 2, 2: 1 };
const nextPlayer = (p: number) => NEXT_P[p];
const MAN_CN = ['一','二','三','四','五','六','七','八','九'];
const WIND_CN = ['東','南','西','北'];
const DRAGON_CN = ['白','發','中'];

function tileLabel(t: Tile): string {
  if (t.suit === 'man') return MAN_CN[t.value - 1] + '萬';
  if (t.suit === 'sou') return `${t.value}索`;
  if (t.suit === 'pin') return `${t.value}筒`;
  if (t.suit === 'wind') return WIND_CN[t.value - 1];
  return DRAGON_CN[t.value - 1];
}

const isHonor = (t: Tile) => t.suit === 'wind' || t.suit === 'dragon';
const isTerminal = (t: Tile) => !isHonor(t) && (t.value === 1 || t.value === 9);
const sameKey = (a: Tile, b: Tile) => a.suit === b.suit && a.value === b.value;
const tileKey = (t: Tile) => `${t.suit}${t.value}`;
const sortTiles = (ts: Tile[]) => [...ts].sort((a, b) => {
  const s = { man: 0, sou: 1, pin: 2, wind: 3, dragon: 4 };
  return s[a.suit] - s[b.suit] || a.value - b.value;
});

// ─── TILE BUILDING ────────────────────────────────────────────────────────────
function buildWall(): Tile[] {
  const tiles: Tile[] = [];
  let id = 0;
  for (const suit of ['man', 'sou', 'pin'] as Suit[])
    for (let v = 1; v <= 9; v++) for (let c = 0; c < 4; c++) tiles.push({ id: id++, suit, value: v });
  for (let v = 1; v <= 4; v++) for (let c = 0; c < 4; c++) tiles.push({ id: id++, suit: 'wind', value: v });
  for (let v = 1; v <= 3; v++) for (let c = 0; c < 4; c++) tiles.push({ id: id++, suit: 'dragon', value: v });
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return tiles;
}

// ─── WIN DETECTION ────────────────────────────────────────────────────────────
function canFormMelds(tiles: Tile[]): boolean {
  if (tiles.length === 0) return true;
  if (tiles.length % 3 !== 0) return false;
  const s = sortTiles(tiles);
  const first = s[0];
  const rest = s.slice(1);
  const i1 = rest.findIndex(t => sameKey(t, first));
  if (i1 >= 0) {
    const r1 = [...rest]; r1.splice(i1, 1);
    const i2 = r1.findIndex(t => sameKey(t, first));
    if (i2 >= 0) { const r2 = [...r1]; r2.splice(i2, 1); if (canFormMelds(r2)) return true; }
  }
  if (!isHonor(first)) {
    const j1 = rest.findIndex(t => t.suit === first.suit && t.value === first.value + 1);
    if (j1 >= 0) {
      const r1 = [...rest]; r1.splice(j1, 1);
      const j2 = r1.findIndex(t => t.suit === first.suit && t.value === first.value + 2);
      if (j2 >= 0) { const r2 = [...r1]; r2.splice(j2, 1); if (canFormMelds(r2)) return true; }
    }
  }
  return false;
}

function canWin(hand: Tile[], meldCount = 0): boolean {
  if (hand.length !== (4 - meldCount) * 3 + 2) return false;
  const tried = new Set<string>();
  for (let i = 0; i < hand.length; i++) {
    const k = tileKey(hand[i]);
    if (tried.has(k)) continue;
    const j = hand.findIndex((t, x) => x !== i && sameKey(t, hand[i]));
    if (j < 0) continue;
    tried.add(k);
    const rest = hand.filter((_, x) => x !== i && x !== j);
    if (canFormMelds(rest)) return true;
  }
  if (hand.length === 14 && meldCount === 0) {
    const counts = new Map<string, number>();
    for (const t of hand) counts.set(tileKey(t), (counts.get(tileKey(t)) || 0) + 1);
    if (counts.size === 7 && [...counts.values()].every(v => v >= 2)) return true;
  }
  return false;
}

// ─── FAN SCORING ──────────────────────────────────────────────────────────────
function calcFan(hand: Tile[], melds: Meld[], selfDraw: boolean): { fan: number; desc: string[] } {
  const all = [...hand, ...melds.flatMap(m => m.tiles)];
  const desc: string[] = [];
  let fan = 0;
  if (selfDraw) { fan++; desc.push('自摸 Self Draw +1'); }
  const suited = all.filter(t => !isHonor(t));
  const suits = new Set(suited.map(t => t.suit));
  const hasHonors = all.some(t => isHonor(t));
  if (!hasHonors && suits.size === 1) { fan += 7; desc.push('清一色 Full Flush +7'); }
  else if (suits.size === 1) { fan += 3; desc.push('混一色 Half Flush +3'); }
  if (melds.length === 4 && melds.every(m => m.type === 'pung')) { fan += 3; desc.push('碰碰糊 All Pungs +3'); }
  if (hand.length === 14 && melds.length === 0) {
    const counts = new Map<string, number>();
    for (const t of hand) counts.set(tileKey(t), (counts.get(tileKey(t)) || 0) + 1);
    if (counts.size === 7 && [...counts.values()].every(v => v >= 2)) { fan += 4; desc.push('七對子 Seven Pairs +4'); }
  }
  return { fan: Math.max(1, fan), desc };
}

// ─── AI LOGIC ─────────────────────────────────────────────────────────────────
function aiChooseDiscard(hand: Tile[]): number {
  let bestIdx = 0, bestScore = -Infinity;
  for (let i = 0; i < hand.length; i++) {
    const t = hand[i];
    let score = 0;
    if (isHonor(t)) {
      const cnt = hand.filter(h => sameKey(h, t)).length;
      score = cnt === 1 ? 80 : cnt === 2 ? -30 : -120;
    } else {
      const adj = hand.filter((h, j) => j !== i && h.suit === t.suit && Math.abs(h.value - t.value) <= 2).length;
      score = -adj * 14;
      if (isTerminal(t)) score += 5;
    }
    if (score > bestScore) { bestScore = score; bestIdx = i; }
  }
  return bestIdx;
}

function aiDecideClaim(hand: Tile[], disc: Tile, meldCount: number, isNext: boolean): 'win' | 'pung' | 'chow' | null {
  if (canWin([...hand, disc], meldCount)) return 'win';
  if (hand.filter(t => sameKey(t, disc)).length >= 2) return 'pung';
  if (isNext && !isHonor(disc) && checkChow(hand, disc) && Math.random() < 0.25) return 'chow';
  return null;
}

function checkChow(hand: Tile[], disc: Tile): boolean {
  if (isHonor(disc)) return false;
  const v = disc.value, s = disc.suit;
  return (hand.some(t => t.suit === s && t.value === v + 1) && hand.some(t => t.suit === s && t.value === v + 2)) ||
    (hand.some(t => t.suit === s && t.value === v - 1) && hand.some(t => t.suit === s && t.value === v + 1)) ||
    (hand.some(t => t.suit === s && t.value === v - 2) && hand.some(t => t.suit === s && t.value === v - 1));
}

function autoSelectChow(hand: Tile[], disc: Tile): [Tile, Tile] | null {
  const v = disc.value, s = disc.suit;
  const t1 = hand.find(t => t.suit === s && t.value === v + 1);
  const t2 = hand.find(t => t.suit === s && t.value === v + 2);
  if (t1 && t2) return [t1, t2];
  const t3 = hand.find(t => t.suit === s && t.value === v - 1);
  const t4 = hand.find(t => t.suit === s && t.value === v + 1);
  if (t3 && t4) return [t3, t4];
  const t5 = hand.find(t => t.suit === s && t.value === v - 2);
  const t6 = hand.find(t => t.suit === s && t.value === v - 1);
  if (t5 && t6) return [t5, t6];
  return null;
}

function claimOrder(from: number): number[] {
  const r: number[] = [];
  let p = nextPlayer(from);
  while (p !== from) { r.push(p); p = nextPlayer(p); }
  return r;
}

// ─── GAME LOGIC ────────────────────────────────────────────────────────────────
function initGS(): GS {
  const wall = buildWall();
  const hands: Tile[][] = [[], [], [], []];
  let wIdx = 0;
  for (let i = 0; i < 13; i++) for (let p = 0; p < 4; p++) hands[p].push(wall[wIdx++]);
  hands[1].push(wall[wIdx++]);
  return {
    wall, wIdx,
    hands: hands.map(h => sortTiles(h)),
    melds: [[], [], [], []],
    discards: [[], [], [], []],
    current: 1, phase: 'ai_act', dealer: 1, selIdx: null,
    lastDiscard: null, claimOpts: [], winner: null,
    scores: [500, 500, 500, 500],
    msg: 'East goes first — watching AI...',
  };
}

function advanceToNextPlayer(gs: GS, fromPlayer: number): GS {
  const next = nextPlayer(fromPlayer);
  if (gs.wIdx >= gs.wall.length) return { ...gs, phase: 'exhausted', msg: '荒牌！Draw game — wall exhausted.' };
  const drawn = gs.wall[gs.wIdx];
  const newHand = sortTiles([...gs.hands[next], drawn]);
  const newHands = gs.hands.map((h, i) => i === next ? newHand : h);
  const base = { ...gs, wIdx: gs.wIdx + 1, hands: newHands, current: next, claimOpts: [], lastDiscard: null };
  if (next === 0) {
    if (canWin(newHand, gs.melds[0].length)) {
      return { ...base, phase: 'claim_window', claimOpts: ['win', 'skip'],
        msg: `🀄 You drew ${tileLabel(drawn)} — Tsumo! Win or keep playing?` };
    }
    return { ...base, phase: 'human_select', selIdx: null, msg: `You drew ${tileLabel(drawn)}. Tap a tile to select, tap again to discard.` };
  }
  return { ...base, phase: 'ai_act', msg: `${PLAYER_NAMES[next]}'s turn...` };
}

function doWin(gs: GS, winner: number, selfDraw: boolean, payer: number | undefined, discTile: Tile | undefined): GS {
  const hand = discTile ? [...gs.hands[winner], discTile] : gs.hands[winner];
  const { fan, desc } = calcFan(hand, gs.melds[winner], selfDraw);
  const unit = Math.pow(2, fan - 1) * 100;
  const newScores = [...gs.scores];
  if (selfDraw) {
    for (let p = 0; p < 4; p++) {
      if (p === winner) continue;
      const pay = p === gs.dealer ? unit * 2 : unit;
      newScores[p] -= pay; newScores[winner] += pay;
    }
  } else if (payer !== undefined) {
    const pay = unit * 3;
    newScores[payer] -= pay; newScores[winner] += pay;
  }
  return {
    ...gs,
    hands: gs.hands.map((h, i) => i === winner ? hand : h),
    phase: 'won',
    winner: { player: winner, fan, selfDraw, payer, desc },
    scores: newScores,
    msg: selfDraw ? `🎉 ${PLAYER_NAMES[winner]} wins by self-draw!` : `🎉 ${PLAYER_NAMES[winner]} wins!`,
  };
}

function doAIPung(gs: GS, punger: number, disc: Tile, from: number): GS {
  const hand = gs.hands[punger];
  let cnt = 0;
  const newHand = hand.filter(t => { if (cnt < 2 && sameKey(t, disc)) { cnt++; return false; } return true; });
  const pungTiles = hand.filter(t => sameKey(t, disc)).slice(0, 2).concat(disc);
  return {
    ...gs,
    hands: gs.hands.map((h, i) => i === punger ? newHand : h),
    melds: gs.melds.map((m, i) => i === punger ? [...m, { type: 'pung', tiles: pungTiles, fromPlayer: from }] : m),
    current: punger, phase: 'ai_act',
    msg: `${PLAYER_NAMES[punger]} pungs ${tileLabel(disc)}!`,
  };
}

function doAIChow(gs: GS, chower: number, disc: Tile, from: number): GS {
  const pair = autoSelectChow(gs.hands[chower], disc);
  if (!pair) return advanceToNextPlayer(gs, from);
  const ids = new Set(pair.map(t => t.id));
  const newHand = gs.hands[chower].filter(t => !ids.has(t.id));
  const chowTiles = [...pair, disc].sort((a, b) => a.value - b.value);
  return {
    ...gs,
    hands: gs.hands.map((h, i) => i === chower ? newHand : h),
    melds: gs.melds.map((m, i) => i === chower ? [...m, { type: 'chow', tiles: chowTiles, fromPlayer: from }] : m),
    current: chower, phase: 'ai_act',
    msg: `${PLAYER_NAMES[chower]} chows ${tileLabel(disc)}!`,
  };
}

function processAfterDiscard(gs: GS, disc: Tile, from: number): GS {
  const newDiscards = gs.discards.map((d, i) => i === from ? [...d, disc] : d);
  const base = { ...gs, discards: newDiscards, lastDiscard: { tile: disc, from }, selIdx: null };
  for (const p of claimOrder(from)) {
    if (canWin([...base.hands[p], disc], base.melds[p].length)) {
      if (p === 0) return { ...base, phase: 'claim_window', claimOpts: ['win', 'skip'], msg: `🏆 ${tileLabel(disc)} completes your hand! Win?` };
      return doWin(base, p, false, from, disc);
    }
  }
  if (from !== 0) {
    const hPung = base.hands[0].filter(t => sameKey(t, disc)).length >= 2;
    const hIsNext = nextPlayer(from) === 0;
    const hChow = hIsNext && !isHonor(disc) && checkChow(base.hands[0], disc);
    if (hPung || hChow) {
      const opts: ClaimOpt[] = [];
      if (hPung) opts.push('pung');
      if (hChow) opts.push('chow');
      opts.push('skip');
      return { ...base, phase: 'claim_window', claimOpts: opts, msg: `${tileLabel(disc)} discarded — Claim?` };
    }
  }
  for (const p of [1, 2, 3]) {
    if (p === from) continue;
    const dec = aiDecideClaim(base.hands[p], disc, base.melds[p].length, nextPlayer(from) === p);
    if (dec === 'pung') return doAIPung(base, p, disc, from);
    if (dec === 'chow') return doAIChow(base, p, disc, from);
  }
  return advanceToNextPlayer(base, from);
}

function doAITurn(gs: GS): GS {
  const p = gs.current;
  if (canWin(gs.hands[p], gs.melds[p].length)) return doWin(gs, p, true, undefined, undefined);
  const idx = aiChooseDiscard(gs.hands[p]);
  const disc = gs.hands[p][idx];
  const newHands = gs.hands.map((h, i) => i === p ? h.filter((_, j) => j !== idx) : h);
  return processAfterDiscard({ ...gs, hands: newHands, msg: `${PLAYER_NAMES[p]} discards ${tileLabel(disc)}` }, disc, p);
}

// ─── TILE STYLE SYSTEM ────────────────────────────────────────────────────────
export type TileStyle = 'classic' | 'midnight' | 'jade';

interface TileTheme {
  faceBg: string; faceBorder: string;
  faceSelectedBg: string; faceSelectedBorder: string; faceSelectedShadow: string;
  backBg: string; backBorder: string; shadowBg: string;
}

const TILE_THEMES: Record<TileStyle, TileTheme> = {
  classic: {
    faceBg: 'linear-gradient(145deg, #fffef5, #f2e8d0)',
    faceBorder: '#c09030',
    faceSelectedBg: 'linear-gradient(145deg, #fffce0, #f5e8a0)',
    faceSelectedBorder: '#f0c040',
    faceSelectedShadow: '0 0 0 2px #f0c040, 0 6px 14px rgba(0,0,0,0.35)',
    backBg: 'linear-gradient(145deg, #1d6030, #0f3a1a)',
    backBorder: '#1a6025',
    shadowBg: '#5a380a',
  },
  midnight: {
    faceBg: 'linear-gradient(145deg, #dce8ff, #becee8)',
    faceBorder: '#4a72b8',
    faceSelectedBg: 'linear-gradient(145deg, #c0d8ff, #9cbaf0)',
    faceSelectedBorder: '#6098f8',
    faceSelectedShadow: '0 0 0 2px #6098f8, 0 6px 14px rgba(20,40,100,0.5)',
    backBg: 'linear-gradient(145deg, #1a2848, #0d1530)',
    backBorder: '#243870',
    shadowBg: '#0a1428',
  },
  jade: {
    faceBg: 'linear-gradient(145deg, #f0fce8, #d4ecbe)',
    faceBorder: '#4a7a38',
    faceSelectedBg: 'linear-gradient(145deg, #d8f8c0, #bcecac)',
    faceSelectedBorder: '#68b040',
    faceSelectedShadow: '0 0 0 2px #68b040, 0 6px 14px rgba(0,60,10,0.4)',
    backBg: 'linear-gradient(145deg, #183820, #0c2010)',
    backBorder: '#264c1e',
    shadowBg: '#1a2e10',
  },
};

const TileStyleCtx = createContext<TileStyle>('classic');

// ─── SVG TILE FACES ───────────────────────────────────────────────────────────
function ManFace({ value, w, h }: { value: number; w: number; h: number }) {
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h}>
      <text x={w / 2} y={h * 0.56} textAnchor="middle" fontSize={h * 0.44}
        fill="#CC2222" fontFamily="serif" fontWeight="bold" dominantBaseline="middle">
        {MAN_CN[value - 1]}
      </text>
      <text x={w / 2} y={h * 0.86} textAnchor="middle" fontSize={h * 0.21}
        fill="#CC2222" fontFamily="serif">萬</text>
    </svg>
  );
}

function SouFace({ value, w, h }: { value: number; w: number; h: number }) {
  const pos: [number, number][][] = [
    [[0.5, 0.45]],
    [[0.5, 0.28], [0.5, 0.72]],
    [[0.5, 0.2], [0.5, 0.5], [0.5, 0.8]],
    [[0.3, 0.28], [0.7, 0.28], [0.3, 0.72], [0.7, 0.72]],
    [[0.3, 0.2], [0.7, 0.2], [0.5, 0.5], [0.3, 0.8], [0.7, 0.8]],
    [[0.3, 0.2], [0.7, 0.2], [0.3, 0.5], [0.7, 0.5], [0.3, 0.8], [0.7, 0.8]],
    [[0.5, 0.13], [0.3, 0.37], [0.7, 0.37], [0.3, 0.62], [0.7, 0.62], [0.3, 0.86], [0.7, 0.86]],
    [[0.25, 0.16], [0.75, 0.16], [0.25, 0.39], [0.75, 0.39], [0.25, 0.62], [0.75, 0.62], [0.25, 0.85], [0.75, 0.85]],
    [[0.25, 0.12], [0.5, 0.12], [0.75, 0.12], [0.25, 0.38], [0.5, 0.38], [0.75, 0.38], [0.25, 0.64], [0.5, 0.64], [0.75, 0.64]],
  ];
  const ps = pos[value - 1] || [];
  const sw = w * 0.14, sh = h * 0.25;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h}>
      {value === 1 ? (
        <>
          <ellipse cx={w * 0.5} cy={h * 0.3} rx={w * 0.22} ry={h * 0.15} fill="#CC3311" />
          <ellipse cx={w * 0.48} cy={h * 0.27} rx={w * 0.13} ry={h * 0.09} fill="#fff" />
          <circle cx={w * 0.39} cy={h * 0.255} r={w * 0.035} fill="#222" />
          <polygon points={`${w * 0.66},${h * 0.28} ${w * 0.76},${h * 0.255} ${w * 0.66},${h * 0.31}`} fill="#FF8800" />
          <rect x={w * 0.46} y={h * 0.44} width={sw} height={h * 0.4} rx={sw / 2} fill="#2a7a2a" />
          <rect x={w * 0.44} y={h * 0.52} width={sw + w * 0.04} height={h * 0.035} rx={h * 0.018} fill="#1a5a1a" />
        </>
      ) : ps.map(([rx, ry], i) => {
        const cx = rx * w, cy = ry * h;
        return (
          <g key={i}>
            <rect x={cx - sw / 2} y={cy - sh / 2} width={sw} height={sh} rx={sw / 2} fill="#3a8f3a" />
            <rect x={cx - sw / 2 - 1} y={cy - sh * 0.06} width={sw + 2} height={sh * 0.12} rx={2} fill="#2a6a2a" />
            <rect x={cx - sw / 2 + 1} y={cy - sh / 2 + 2} width={sw * 0.3} height={sh - 4} rx={sw * 0.15} fill="rgba(255,255,255,0.22)" />
          </g>
        );
      })}
    </svg>
  );
}

function PinFace({ value, w, h }: { value: number; w: number; h: number }) {
  const pos: [number, number][][] = [
    [[0.5, 0.48]],
    [[0.5, 0.3], [0.5, 0.7]],
    [[0.5, 0.2], [0.5, 0.5], [0.5, 0.8]],
    [[0.3, 0.28], [0.7, 0.28], [0.3, 0.72], [0.7, 0.72]],
    [[0.3, 0.2], [0.7, 0.2], [0.5, 0.5], [0.3, 0.8], [0.7, 0.8]],
    [[0.3, 0.2], [0.7, 0.2], [0.3, 0.5], [0.7, 0.5], [0.3, 0.8], [0.7, 0.8]],
    [[0.5, 0.13], [0.3, 0.37], [0.7, 0.37], [0.3, 0.62], [0.7, 0.62], [0.3, 0.86], [0.7, 0.86]],
    [[0.25, 0.16], [0.75, 0.16], [0.25, 0.39], [0.75, 0.39], [0.25, 0.62], [0.75, 0.62], [0.25, 0.85], [0.75, 0.85]],
    [[0.25, 0.12], [0.5, 0.12], [0.75, 0.12], [0.25, 0.38], [0.5, 0.38], [0.75, 0.38], [0.25, 0.64], [0.5, 0.64], [0.75, 0.64]],
  ];
  const ps = pos[value - 1] || [];
  const r = Math.min(w, h) * 0.105;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h}>
      {ps.map(([rx, ry], i) => {
        const cx = rx * w, cy = ry * h;
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={r} fill="#1a55aa" />
            <circle cx={cx} cy={cy} r={r * 0.67} fill="#fff" />
            <circle cx={cx} cy={cy} r={r * 0.34} fill="#CC2222" />
          </g>
        );
      })}
    </svg>
  );
}

function WindFace({ value, w, h }: { value: number; w: number; h: number }) {
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h}>
      <text x={w / 2} y={h / 2} textAnchor="middle" fontSize={h * 0.52}
        fill="#1a5c1a" fontFamily="serif" fontWeight="bold" dominantBaseline="middle">
        {WIND_CN[value - 1]}
      </text>
    </svg>
  );
}

function DragonFace({ value, w, h }: { value: number; w: number; h: number }) {
  const [char, fill] = value === 1 ? ['白', '#444'] : value === 2 ? ['發', '#1a7c1a'] : ['中', '#CC2222'];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h}>
      {value === 1 && <rect x={2} y={2} width={w - 4} height={h - 4} fill="none" stroke="#CC2222" strokeWidth={1.5} rx={2} />}
      <text x={w / 2} y={h / 2} textAnchor="middle" fontSize={h * 0.52}
        fill={fill} fontFamily="serif" fontWeight="bold" dominantBaseline="middle">
        {char}
      </text>
    </svg>
  );
}

function TileFaceContent({ tile, w, h }: { tile: Tile; w: number; h: number }) {
  if (tile.suit === 'man') return <ManFace value={tile.value} w={w} h={h} />;
  if (tile.suit === 'sou') return <SouFace value={tile.value} w={w} h={h} />;
  if (tile.suit === 'pin') return <PinFace value={tile.value} w={w} h={h} />;
  if (tile.suit === 'wind') return <WindFace value={tile.value} w={w} h={h} />;
  return <DragonFace value={tile.value} w={w} h={h} />;
}

// ─── TILE VIEW (3D CSS TILE) ──────────────────────────────────────────────────
interface TVProps {
  tile?: Tile; faceDown?: boolean; selected?: boolean;
  onClick?: () => void; size?: 'xs' | 'sm' | 'md' | 'lg';
}
const TV_DIMS = {
  xs: { w: 20, h: 28, d: 2, pad: 2 },
  sm: { w: 28, h: 38, d: 3, pad: 2 },
  md: { w: 36, h: 50, d: 4, pad: 3 },
  lg: { w: 46, h: 64, d: 5, pad: 4 },
};

function TileView({ tile, faceDown = false, selected = false, onClick, size = 'md' }: TVProps) {
  const tileStyle = useContext(TileStyleCtx);
  const th = TILE_THEMES[tileStyle];
  const { w, h, d, pad } = TV_DIMS[size];
  return (
    <div onClick={onClick} title={!faceDown && tile ? tileLabel(tile) : ''}
      style={{ width: w + d, height: h + d, position: 'relative', display: 'inline-block',
        flexShrink: 0, cursor: onClick ? 'pointer' : 'default',
        transform: selected ? 'translateY(-12px)' : 'none',
        transition: 'transform 0.12s ease', userSelect: 'none' }}>
      <div style={{ position: 'absolute', top: d, left: d, width: w, height: h,
        background: faceDown ? th.backBg : th.shadowBg, borderRadius: 4 }} />
      <div style={{ position: 'absolute', top: 0, left: 0, width: w, height: h, borderRadius: 4,
        border: `1.5px solid ${faceDown ? th.backBorder : selected ? th.faceSelectedBorder : th.faceBorder}`,
        background: faceDown ? th.backBg : selected ? th.faceSelectedBg : th.faceBg,
        boxShadow: selected ? th.faceSelectedShadow : '0 2px 5px rgba(0,0,0,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {faceDown ? (
          <div style={{ width: w - 6, height: h - 6, border: '1px solid rgba(255,255,255,0.18)', borderRadius: 2,
            background: 'repeating-linear-gradient(-45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 2px, transparent 2px, transparent 9px)' }} />
        ) : tile ? (
          <TileFaceContent tile={tile} w={w - pad * 2} h={h - pad * 2} />
        ) : null}
      </div>
    </div>
  );
}

// ─── MELD ROW ─────────────────────────────────────────────────────────────────
function MeldRow({ melds, size = 'sm' }: { melds: Meld[]; size?: 'xs' | 'sm' }) {
  if (!melds.length) return null;
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      {melds.map((m, mi) => (
        <div key={mi} style={{ display: 'flex', gap: 1, background: 'rgba(255,255,255,0.06)', padding: '3px 5px', borderRadius: 5 }}>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginRight: 2, alignSelf: 'center' }}>{m.type === 'pung' ? '碰' : '吃'}</span>
          {m.tiles.map((t, ti) => <TileView key={ti} tile={t} size={size} />)}
        </div>
      ))}
    </div>
  );
}

// ─── DISCARD PILE ─────────────────────────────────────────────────────────────
function DiscardPile({ tiles, label, highlight }: { tiles: Tile[]; label?: string; highlight?: Tile }) {
  return (
    <div>
      {label && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 2, textAlign: 'center' }}>{label}</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, maxWidth: 180, justifyContent: 'flex-start' }}>
        {tiles.map((t, i) => (
          <div key={t.id} style={{
            outline: highlight && i === tiles.length - 1 && sameKey(t, highlight) ? '2px solid #f0c040' : 'none',
            borderRadius: 3,
          }}>
            <TileView tile={t} size="xs" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PLAYER PANEL ─────────────────────────────────────────────────────────────
function PlayerPanel({ player, gs, horizontal = false }: { player: number; gs: GS; horizontal?: boolean }) {
  const isActive = gs.current === player && (gs.phase === 'ai_act');
  const tileCount = gs.hands[player].length;
  return (
    <div style={{ display: 'flex', flexDirection: horizontal ? 'column' : 'row', gap: 6, alignItems: 'center' }}>
      <div style={{ fontSize: 11, color: isActive ? '#f0c040' : 'rgba(255,255,255,0.5)',
        fontWeight: 700, whiteSpace: 'nowrap', minWidth: 44, textAlign: 'center',
        background: isActive ? 'rgba(240,192,64,0.15)' : 'transparent', borderRadius: 4, padding: '2px 4px',
        transition: 'all 0.3s' }}>
        {PLAYER_NAMES[player]}<br />
        <span style={{ fontSize: 9, fontWeight: 400 }}>{gs.scores[player]}pt</span>
      </div>
      <div>
        <MeldRow melds={gs.melds[player]} size="xs" />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginTop: gs.melds[player].length ? 3 : 0 }}>
          {Array.from({ length: tileCount }).map((_, i) => <TileView key={i} faceDown size="xs" />)}
        </div>
      </div>
      <DiscardPile tiles={gs.discards[player]} highlight={gs.lastDiscard?.from === player ? gs.lastDiscard.tile : undefined} />
    </div>
  );
}

// ─── CLAIM WINDOW ─────────────────────────────────────────────────────────────
function ClaimWindow({ opts, timer, onClaim }: { opts: ClaimOpt[]; timer: number; onClaim: (o: ClaimOpt) => void }) {
  return (
    <div style={{ padding: '10px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ fontSize: 12, color: '#f0c040', fontWeight: 700 }}>Auto-skip in {timer}s</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {opts.map(o => {
          const labels: Record<ClaimOpt, string> = { win: '🏆 Win!', pung: '碰 Pung', chow: '吃 Chow', skip: 'Skip →' };
          const colors: Record<ClaimOpt, string> = { win: '#f0c040', pung: '#ff6644', chow: '#44aaff', skip: '#666' };
          return (
            <button key={o} onClick={() => onClaim(o)} style={{
              padding: '10px 20px', borderRadius: 10, border: 'none',
              background: o === 'skip' ? 'rgba(255,255,255,0.08)' : colors[o],
              color: o === 'skip' ? 'rgba(255,255,255,0.5)' : '#000',
              fontWeight: 700, fontSize: 14, cursor: 'pointer',
              boxShadow: o !== 'skip' ? `0 4px 14px ${colors[o]}66` : 'none',
            }}>{labels[o]}</button>
          );
        })}
      </div>
    </div>
  );
}

// ─── WIN MODAL ────────────────────────────────────────────────────────────────
function WinModal({ winner, hands, melds, scores, names, onNew }: {
  winner: WinInfo; hands: Tile[][]; melds: Meld[][]; scores: number[];
  names?: string[]; onNew: () => void;
}) {
  const w = winner;
  const pNames = names ?? PLAYER_NAMES;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#1a1a1a', border: '2px solid #f0c040', borderRadius: 20,
        padding: '28px 36px', textAlign: 'center', maxWidth: 520, width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🀄</div>
        <h2 style={{ color: '#f0c040', fontSize: 26, margin: '0 0 6px', fontWeight: 900 }}>
          {pNames[w.player]} Wins!
        </h2>
        <p style={{ color: '#ccc', margin: '0 0 8px', fontSize: 15 }}>
          {w.fan} Fan • {w.selfDraw ? '自摸 Self-Draw' : '栓 Discard Win'}
        </p>
        {w.desc.map((d, i) => (
          <div key={i} style={{ color: '#f0c040', fontSize: 13, marginBottom: 2 }}>{d}</div>
        ))}
        <div style={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap',
          margin: '16px 0', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: 10 }}>
          {melds[w.player].flatMap(m => m.tiles).map((t, i) => <TileView key={`m${i}`} tile={t} size="sm" />)}
          {hands[w.player].map((t, i) => <TileView key={`h${i}`} tile={t} size="sm" />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 20 }}>
          {[0, 1, 2, 3].map(p => (
            <div key={p} style={{ background: p === w.player ? 'rgba(240,192,64,0.15)' : 'rgba(255,255,255,0.05)',
              border: p === w.player ? '1px solid #f0c040' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '8px 4px' }}>
              <div style={{ fontSize: 11, color: '#aaa', marginBottom: 2 }}>{pNames[p]}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: scores[p] >= 500 ? '#4ade80' : '#f87171' }}>
                {scores[p]}
              </div>
            </div>
          ))}
        </div>
        <button onClick={onNew} style={{ padding: '12px 36px', background: 'linear-gradient(135deg,#c09030,#f0c040)',
          border: 'none', borderRadius: 12, color: '#000', fontWeight: 800, fontSize: 15, cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(240,192,64,0.4)' }}>
          {onNew ? 'New Game' : 'Back to Menu'}
        </button>
      </div>
    </div>
  );
}

function ExhaustedModal({ scores, names, onNew }: { scores: number[]; names?: string[]; onNew: () => void }) {
  const pNames = names ?? PLAYER_NAMES;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#1a1a1a', border: '2px solid #555', borderRadius: 20,
        padding: '28px 36px', textAlign: 'center', maxWidth: 400, width: '90%' }}>
        <div style={{ fontSize: 48 }}>🎴</div>
        <h2 style={{ color: '#ccc', margin: '8px 0' }}>荒牌 Draw Game</h2>
        <p style={{ color: '#888', marginBottom: 20 }}>Wall exhausted — no winner this round!</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 20 }}>
          {[0, 1, 2, 3].map(p => (
            <div key={p} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 8 }}>
              <div style={{ fontSize: 11, color: '#aaa' }}>{pNames[p]}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: scores[p] >= 500 ? '#4ade80' : '#f87171' }}>{scores[p]}</div>
            </div>
          ))}
        </div>
        <button onClick={onNew} style={{ padding: '10px 28px', background: '#333', border: '1px solid #555',
          borderRadius: 10, color: '#ccc', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          New Game
        </button>
      </div>
    </div>
  );
}

// ─── TILE STYLE PICKER ────────────────────────────────────────────────────────
const STYLE_LABELS: Record<TileStyle, string> = {
  classic: 'Classic HK',
  midnight: 'Midnight',
  jade: 'Jade Garden',
};

function TileStylePicker({ value, onChange }: { value: TileStyle; onChange: (s: TileStyle) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase' }}>Tile Style</div>
      <div style={{ display: 'flex', gap: 8 }}>
        {(['classic', 'midnight', 'jade'] as TileStyle[]).map(s => {
          const th = TILE_THEMES[s];
          return (
            <button key={s} onClick={() => onChange(s)} title={STYLE_LABELS[s]}
              style={{ width: 48, height: 64, borderRadius: 8, border: `2px solid ${value === s ? th.faceSelectedBorder : 'rgba(255,255,255,0.15)'}`,
                background: th.faceBg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, boxShadow: value === s ? `0 0 12px ${th.faceSelectedBorder}66` : 'none',
                transition: 'all 0.2s' }}>
              {s === 'classic' ? '🀄' : s === 'midnight' ? '🌙' : '🎋'}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{STYLE_LABELS[value]}</div>
    </div>
  );
}

// ─── MENU SCREEN ──────────────────────────────────────────────────────────────
function MahjongMenu({ tileStyle, setTileStyle, onSolo, onOnline }: {
  tileStyle: TileStyle; setTileStyle: (s: TileStyle) => void; onSolo: () => void; onOnline: () => void;
}) {
  const sampleTiles: Tile[] = [
    { id: 0, suit: 'man', value: 1 }, { id: 1, suit: 'pin', value: 5 },
    { id: 2, suit: 'sou', value: 9 }, { id: 3, suit: 'wind', value: 1 },
    { id: 4, suit: 'dragon', value: 3 },
  ];
  return (
    <TileStyleCtx.Provider value={tileStyle}>
      <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 50% 0%, #0a2a12 0%, #061808 60%, #020a04 100%)',
        color: '#fff', display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI', sans-serif" }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.3)' }}>
          <Link href="/"><span style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, padding: '5px 12px', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>← Menu</span></Link>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 32 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 8 }}>🀄</div>
            <h1 style={{ color: '#f0c040', fontSize: 30, margin: 0, fontWeight: 900, letterSpacing: 1 }}>麻雀</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', margin: '4px 0 0', fontSize: 13, letterSpacing: 2 }}>HONG KONG MAHJONG</p>
          </div>

          {/* Tile Style Preview */}
          <div style={{ display: 'flex', gap: 4 }}>
            {sampleTiles.map(t => <TileView key={t.id} tile={t} size="md" />)}
          </div>

          {/* Style Picker */}
          <TileStylePicker value={tileStyle} onChange={setTileStyle} />

          {/* Mode Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}>
            <button onClick={onSolo} style={{
              padding: '16px 24px', background: 'linear-gradient(135deg, #c09030, #f0c040)',
              border: 'none', borderRadius: 14, color: '#000', fontWeight: 800, fontSize: 17,
              cursor: 'pointer', boxShadow: '0 4px 20px rgba(240,192,64,0.35)', letterSpacing: 0.5,
            }}>
              🎴 Solo vs AI
            </button>
            <button onClick={onOnline} style={{
              padding: '16px 24px', background: 'linear-gradient(135deg, #1a4a6a, #2a7aaa)',
              border: '1px solid #3a8abba0', borderRadius: 14, color: '#fff', fontWeight: 700, fontSize: 17,
              cursor: 'pointer', boxShadow: '0 4px 20px rgba(42,122,170,0.3)', letterSpacing: 0.5,
            }}>
              🌐 Play Online
              <span style={{ display: 'block', fontSize: 11, fontWeight: 400, opacity: 0.7, marginTop: 2 }}>
                Up to 3 humans + 1 AI bot
              </span>
            </button>
          </div>
        </div>
      </div>
    </TileStyleCtx.Provider>
  );
}

// ─── ONLINE LOBBY ─────────────────────────────────────────────────────────────
function MahjongLobby({ mj, onBack }: { mj: ReturnType<typeof useMjOnline>; onBack: () => void }) {
  const [nameInput, setNameInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [tab, setTab] = useState<'create' | 'join'>('create');

  const handleCreate = () => {
    const name = nameInput.trim() || 'Player';
    mj.create(name);
  };

  const handleJoin = () => {
    const name = nameInput.trim() || 'Player';
    mj.join(codeInput, name);
  };

  if (mj.status === 'lobby') {
    return (
      <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 50% 0%, #0a2a12 0%, #061808 100%)',
        color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 24, fontFamily: "'Segoe UI', sans-serif", gap: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>Room Code</div>
          <div style={{ fontSize: 44, fontWeight: 900, color: '#f0c040', letterSpacing: 6, fontFamily: 'monospace' }}>{mj.roomCode}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>Share this code with friends</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 14, padding: '16px 24px', width: '100%', maxWidth: 340 }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 12, letterSpacing: 1 }}>PLAYERS ({mj.players.length}/3 humans)</div>
          {mj.players.map(p => (
            <div key={p.seat} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
              borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#c09030,#f0c040)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#000', fontSize: 13 }}>
                {p.name[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                  {['South', 'East', 'North', 'West'][p.seat]} {p.seat === mj.mySeat ? '• You' : ''}
                </div>
              </div>
              {p.seat === 0 && <div style={{ marginLeft: 'auto', fontSize: 10, color: '#f0c040' }}>Host</div>}
            </div>
          ))}
          {mj.players.length < 3 && (
            <div style={{ padding: '8px 0', fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center', fontStyle: 'italic' }}>
              Waiting for players... (AI fills empty seats)
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {mj.isHost && (
            <button onClick={mj.start} style={{ padding: '14px 32px', background: 'linear-gradient(135deg,#c09030,#f0c040)',
              border: 'none', borderRadius: 12, color: '#000', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
              Start Game
            </button>
          )}
          {!mj.isHost && (
            <div style={{ padding: '14px 32px', background: 'rgba(255,255,255,0.05)', borderRadius: 12,
              color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center' }}>
              Waiting for host to start...
            </div>
          )}
          <button onClick={() => { mj.disconnect(); onBack(); }} style={{ padding: '14px 20px',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12, color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer' }}>
            Leave
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 50% 0%, #0a2a12 0%, #061808 100%)',
      color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: "'Segoe UI', sans-serif", gap: 20 }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 36 }}>🌐</div>
        <h2 style={{ color: '#f0c040', margin: '8px 0 4px', fontWeight: 900 }}>Online Mahjong</h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0, fontSize: 13 }}>Up to 3 human players + 1 AI</p>
      </div>

      {mj.error && (
        <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', borderRadius: 10,
          padding: '10px 16px', color: '#fca5a5', fontSize: 13, maxWidth: 320 }}>{mj.error}</div>
      )}

      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 14, padding: 24, width: '100%', maxWidth: 340 }}>
        <input value={nameInput} onChange={e => setNameInput(e.target.value.slice(0, 16))}
          placeholder="Your name"
          style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#fff', fontSize: 14,
            outline: 'none', boxSizing: 'border-box', marginBottom: 16 }} />

        <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderRadius: 8, overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.12)' }}>
          {(['create', 'join'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '9px 0', border: 'none',
              background: tab === t ? 'rgba(240,192,64,0.2)' : 'transparent',
              color: tab === t ? '#f0c040' : 'rgba(255,255,255,0.5)',
              fontWeight: tab === t ? 700 : 400, fontSize: 13, cursor: 'pointer' }}>
              {t === 'create' ? 'Create Room' : 'Join Room'}
            </button>
          ))}
        </div>

        {tab === 'join' && (
          <input value={codeInput} onChange={e => setCodeInput(e.target.value.toUpperCase().slice(0, 4))}
            placeholder="Room Code"
            style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#fff', fontSize: 18,
              fontWeight: 700, letterSpacing: 4, textAlign: 'center', outline: 'none', boxSizing: 'border-box',
              marginBottom: 16, fontFamily: 'monospace' }} />
        )}

        <button onClick={tab === 'create' ? handleCreate : handleJoin}
          disabled={mj.status === 'connecting'}
          style={{ width: '100%', padding: '12px 0', background: mj.status === 'connecting' ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg,#c09030,#f0c040)',
            border: 'none', borderRadius: 10, color: mj.status === 'connecting' ? 'rgba(255,255,255,0.5)' : '#000',
            fontWeight: 800, fontSize: 15, cursor: mj.status === 'connecting' ? 'default' : 'pointer' }}>
          {mj.status === 'connecting' ? 'Connecting...' : tab === 'create' ? 'Create Room' : 'Join Room'}
        </button>
      </div>

      <button onClick={onBack} style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none',
        cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}>← Back to Menu</button>
    </div>
  );
}

// ─── ONLINE PLAYER PANEL ──────────────────────────────────────────────────────
function OnlinePlayerPanel({ seat, view, horizontal = false }: { seat: number; view: MjPlayerView; horizontal?: boolean }) {
  const isActive = view.current === seat;
  const isMine = view.mySeat === seat;
  const tileCount = view.handSizes[seat];
  const melds = view.melds[seat] as Meld[];
  const discards = view.discards[seat] as Tile[];
  const lastDiscard = view.lastDiscard as { tile: Tile; from: number } | null;
  return (
    <div style={{ display: 'flex', flexDirection: horizontal ? 'column' : 'row', gap: 6, alignItems: 'center' }}>
      <div style={{ fontSize: 11, color: isActive ? '#f0c040' : 'rgba(255,255,255,0.5)',
        fontWeight: 700, whiteSpace: 'nowrap', minWidth: 44, textAlign: 'center',
        background: isActive ? 'rgba(240,192,64,0.15)' : 'transparent', borderRadius: 4, padding: '2px 4px' }}>
        {view.names[seat]}{isMine ? ' ★' : ''}<br />
        <span style={{ fontSize: 9, fontWeight: 400 }}>{view.scores[seat]}pt</span>
      </div>
      <div>
        <MeldRow melds={melds} size="xs" />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginTop: melds.length ? 3 : 0 }}>
          {Array.from({ length: tileCount }).map((_, i) => <TileView key={i} faceDown size="xs" />)}
        </div>
      </div>
      <DiscardPile tiles={discards} highlight={lastDiscard?.from === seat ? lastDiscard.tile as Tile : undefined} />
    </div>
  );
}

// ─── ONLINE GAME BOARD ────────────────────────────────────────────────────────
function MahjongOnlineGame({ view, mj, onBack, tileStyle }: {
  view: MjPlayerView; mj: ReturnType<typeof useMjOnline>; onBack: () => void; tileStyle: TileStyle;
}) {
  const [selIdx, setSelIdx] = useState<number | null>(null);
  const myHand = view.myHand as Tile[];
  const isMyTurn = view.myPhase === 'discard';
  const isClaiming = view.myPhase === 'claim';
  const wallLeft = view.wallLeft;
  const isOver = view.phase === 'won' || view.phase === 'exhausted';

  const handleTileClick = (idx: number) => {
    if (!isMyTurn) return;
    if (selIdx === idx) {
      mj.discard(myHand[idx].id);
      setSelIdx(null);
    } else {
      setSelIdx(idx);
    }
  };

  useEffect(() => { setSelIdx(null); }, [view.current, view.phase]);

  const boardBg = 'radial-gradient(ellipse at 50% 0%, #0a2a12 0%, #061808 60%, #020a04 100%)';

  return (
    <TileStyleCtx.Provider value={tileStyle}>
      <div style={{ minHeight: '100vh', background: boardBg, color: '#fff', display: 'flex',
        flexDirection: 'column', fontFamily: "'Segoe UI', sans-serif", userSelect: 'none' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.3)', flexShrink: 0 }}>
          <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, padding: '5px 12px', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>
            ← Leave
          </button>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#f0c040' }}>🀄 Online</span>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 2 }}>
              {view.roomCode ?? ''} · {view.names[view.mySeat]}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            <div>Wall: <strong style={{ color: wallLeft < 15 ? '#f87171' : '#4ade80' }}>{wallLeft}</strong></div>
          </div>
        </div>

        {/* Table */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px', gap: 6, overflowY: 'auto' }}>
          {/* North (seat 2) */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '8px 12px',
            border: view.current === 2 ? '1px solid rgba(240,192,64,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
            <OnlinePlayerPanel seat={2} view={view} horizontal />
          </div>

          {/* Middle */}
          <div style={{ display: 'flex', gap: 6, flex: 1, minHeight: 120 }}>
            {/* West (seat 3) */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '8px',
              border: view.current === 3 ? '1px solid rgba(240,192,64,0.3)' : '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', minWidth: 90 }}>
              <OnlinePlayerPanel seat={3} view={view} />
            </div>

            {/* Center */}
            <div style={{ flex: 1, background: 'rgba(10,40,18,0.8)', borderRadius: 10,
              border: '2px solid rgba(240,192,64,0.15)', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', padding: '12px', gap: 8 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, textTransform: 'uppercase' }}>
                {view.dealer === 1 ? 'East Round' : view.dealer === 0 ? 'South Round' : view.dealer === 3 ? 'West Round' : 'North Round'}
              </div>
              <div style={{ textAlign: 'center', padding: '8px 16px', background: 'rgba(0,0,0,0.3)',
                borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', maxWidth: 260 }}>
                <div style={{ fontSize: 13, color: '#f0c040', fontWeight: 600 }}>{view.msg}</div>
              </div>
              {view.lastDiscard && view.phase === 'claim_window' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Last discard</div>
                  <TileView tile={view.lastDiscard.tile as Tile} size="md" />
                </div>
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                {[1, 2, 3].map(p => (
                  <div key={p} style={{ width: 8, height: 8, borderRadius: '50%',
                    background: view.current === p ? '#f0c040' : 'rgba(255,255,255,0.15)', transition: 'background 0.3s' }} />
                ))}
              </div>
            </div>

            {/* East (seat 1) */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '8px',
              border: view.current === 1 ? '1px solid rgba(240,192,64,0.3)' : '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', minWidth: 90 }}>
              <OnlinePlayerPanel seat={1} view={view} />
            </div>
          </div>

          {/* My hand (seat 0 = South in this view, but show MY tiles regardless) */}
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px',
            border: isMyTurn || isClaiming ? '1px solid rgba(240,192,64,0.5)' : '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>Your discards</div>
                <DiscardPile tiles={view.discards[view.mySeat] as Tile[]} />
              </div>
              {(view.melds[view.mySeat] as Meld[]).length > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>Your melds</div>
                  <MeldRow melds={view.melds[view.mySeat] as Meld[]} size="sm" />
                </div>
              )}
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: '#f0c040', fontWeight: 700 }}>
                  {['南','東','北','西'][view.mySeat]} {view.names[view.mySeat]}
                </div>
                <div style={{ fontSize: 13, color: view.scores[view.mySeat] >= 500 ? '#4ade80' : '#f87171' }}>
                  {view.scores[view.mySeat]} pts
                </div>
              </div>
            </div>

            {isClaiming && (
              <ClaimWindow opts={view.claimOpts as ClaimOpt[]} timer={view.claimTimer}
                onClaim={(o) => mj.claim(o as OnlineClaimOpt)} />
            )}

            <div>
              {isMyTurn && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 4, textAlign: 'center' }}>
                  {selIdx !== null ? 'Tap the same tile again to discard it' : 'Tap a tile to select it'}
                </div>
              )}
              {!isMyTurn && !isClaiming && view.phase !== 'won' && view.phase !== 'exhausted' && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '6px 0' }}>
                  {view.phase === 'claim_window' ? 'Waiting for claim decision...' : 'Waiting for your turn...'}
                </div>
              )}
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-end', padding: '4px 0' }}>
                {myHand.map((tile, i) => (
                  <TileView key={tile.id} tile={tile} selected={selIdx === i}
                    onClick={isMyTurn ? () => handleTileClick(i) : undefined} size="lg" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {isOver && view.winner && (
          <WinModal winner={view.winner as WinInfo}
            hands={view.revealHands ? (view.revealHands as Tile[][]) : view.melds.map(() => [] as Tile[])}
            melds={view.melds as Meld[][]} scores={view.scores} names={view.names}
            onNew={onBack} />
        )}
        {isOver && !view.winner && (
          <ExhaustedModal scores={view.scores} names={view.names} onNew={onBack} />
        )}
      </div>
    </TileStyleCtx.Provider>
  );
}

// ─── SOLO GAME ────────────────────────────────────────────────────────────────
function MahjongSolo({ tileStyle, onBack }: { tileStyle: TileStyle; onBack: () => void }) {
  const [gs, setGs] = useState<GS>(initGS);
  const [claimTimer, setClaimTimer] = useState(5);
  const claimRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startNewGame = useCallback(() => {
    if (claimRef.current) { clearInterval(claimRef.current); claimRef.current = null; }
    setGs(initGS());
  }, []);

  useEffect(() => {
    if (gs.phase !== 'ai_act' || gs.current === 0) return;
    const t = setTimeout(() => {
      setGs(prev => {
        if (prev.phase !== 'ai_act' || prev.current === 0) return prev;
        return doAITurn(prev);
      });
    }, 700 + Math.random() * 500);
    return () => clearTimeout(t);
  }, [gs.phase, gs.current]);

  useEffect(() => {
    if (gs.phase !== 'claim_window') {
      if (claimRef.current) { clearInterval(claimRef.current); claimRef.current = null; }
      return;
    }
    setClaimTimer(5);
    claimRef.current = setInterval(() => {
      setClaimTimer(prev => {
        if (prev <= 1) {
          clearInterval(claimRef.current!);
          claimRef.current = null;
          setGs(g => {
            if (g.phase !== 'claim_window') return g;
            if (!g.lastDiscard) return { ...g, phase: 'human_select', claimOpts: [], msg: 'Choose a tile to discard.' };
            return advanceToNextPlayer(g, g.lastDiscard.from);
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (claimRef.current) { clearInterval(claimRef.current); claimRef.current = null; } };
  }, [gs.phase]);

  const onTileClick = useCallback((idx: number) => {
    setGs(prev => {
      if (prev.phase !== 'human_select') return prev;
      if (prev.selIdx === idx) {
        const disc = prev.hands[0][idx];
        const newHands = prev.hands.map((h, i) => i === 0 ? h.filter((_, j) => j !== idx) : h);
        return processAfterDiscard({ ...prev, hands: newHands, selIdx: null, msg: `You discarded ${tileLabel(disc)}` }, disc, 0);
      }
      return { ...prev, selIdx: idx };
    });
  }, []);

  const onClaim = useCallback((opt: ClaimOpt) => {
    if (claimRef.current) { clearInterval(claimRef.current); claimRef.current = null; }
    setGs(prev => {
      const ld = prev.lastDiscard;
      if (opt === 'skip') {
        if (!ld) return { ...prev, phase: 'human_select', claimOpts: [], msg: 'Choose a tile to discard.' };
        return advanceToNextPlayer(prev, ld.from);
      }
      if (opt === 'win') {
        if (!ld) return doWin(prev, 0, true, undefined, undefined);
        return doWin(prev, 0, false, ld.from, ld.tile);
      }
      if (opt === 'pung' && ld) {
        const hand = prev.hands[0];
        let cnt = 0;
        const newHand = hand.filter(t => { if (cnt < 2 && sameKey(t, ld.tile)) { cnt++; return false; } return true; });
        const pTiles = hand.filter(t => sameKey(t, ld.tile)).slice(0, 2).concat(ld.tile);
        return { ...prev, hands: prev.hands.map((h, i) => i === 0 ? newHand : h),
          melds: prev.melds.map((m, i) => i === 0 ? [...m, { type: 'pung', tiles: pTiles, fromPlayer: ld.from }] : m),
          current: 0, phase: 'human_select', claimOpts: [], selIdx: null,
          msg: `You punged ${tileLabel(ld.tile)}! Select a tile to discard.` };
      }
      if (opt === 'chow' && ld) {
        const pair = autoSelectChow(prev.hands[0], ld.tile);
        if (!pair) return advanceToNextPlayer(prev, ld.from);
        const ids = new Set(pair.map(t => t.id));
        const newHand = prev.hands[0].filter(t => !ids.has(t.id));
        const cTiles = [...pair, ld.tile].sort((a, b) => a.value - b.value);
        return { ...prev, hands: prev.hands.map((h, i) => i === 0 ? newHand : h),
          melds: prev.melds.map((m, i) => i === 0 ? [...m, { type: 'chow', tiles: cTiles, fromPlayer: ld.from }] : m),
          current: 0, phase: 'human_select', claimOpts: [], selIdx: null, msg: 'You chowed! Select a tile to discard.' };
      }
      return prev;
    });
  }, []);

  const wallLeft = gs.wall.length - gs.wIdx;
  const isHumanTurn = gs.phase === 'human_select';
  const isClaiming = gs.phase === 'claim_window';

  return (
    <TileStyleCtx.Provider value={tileStyle}>
      <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 50% 0%, #0a2a12 0%, #061808 60%, #020a04 100%)',
        color: '#fff', display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI', sans-serif", userSelect: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(0,0,0,0.3)', flexShrink: 0 }}>
          <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, padding: '5px 12px', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>← Menu</button>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#f0c040', letterSpacing: 1 }}>🀄 麻雀</span>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 1 }}>HONG KONG MAHJONG</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            <div>Wall: <strong style={{ color: wallLeft < 15 ? '#f87171' : '#4ade80' }}>{wallLeft}</strong></div>
            <div style={{ fontSize: 10 }}>tiles left</div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px', gap: 6, overflowY: 'auto' }}>
          {/* North */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '8px 12px',
            border: gs.current === 2 && gs.phase === 'ai_act' ? '1px solid rgba(240,192,64,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
            <PlayerPanel player={2} gs={gs} horizontal />
          </div>
          {/* Middle row: West | Center | East */}
          <div style={{ display: 'flex', gap: 6, flex: 1, minHeight: 120 }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '8px',
              border: gs.current === 3 && gs.phase === 'ai_act' ? '1px solid rgba(240,192,64,0.3)' : '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', minWidth: 100 }}>
              <PlayerPanel player={3} gs={gs} />
            </div>
            <div style={{ flex: 1, background: 'rgba(10,40,18,0.8)', borderRadius: 10,
              border: '2px solid rgba(240,192,64,0.15)', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', padding: '12px', gap: 8 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, textTransform: 'uppercase' }}>
                {gs.dealer === 1 ? 'East Round' : gs.dealer === 0 ? 'South Round' : gs.dealer === 3 ? 'West Round' : 'North Round'}
              </div>
              <div style={{ textAlign: 'center', padding: '8px 16px', background: 'rgba(0,0,0,0.3)',
                borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', maxWidth: 260 }}>
                <div style={{ fontSize: 13, color: '#f0c040', fontWeight: 600 }}>{gs.msg}</div>
              </div>
              {gs.lastDiscard && gs.phase === 'claim_window' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Last discard</div>
                  <TileView tile={gs.lastDiscard.tile} size="md" />
                </div>
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                {[1, 2, 3].map(p => (
                  <div key={p} style={{ width: 8, height: 8, borderRadius: '50%',
                    background: gs.current === p && gs.phase === 'ai_act' ? '#f0c040' : 'rgba(255,255,255,0.15)',
                    transition: 'background 0.3s' }} />
                ))}
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '8px',
              border: gs.current === 1 && gs.phase === 'ai_act' ? '1px solid rgba(240,192,64,0.3)' : '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', minWidth: 100 }}>
              <PlayerPanel player={1} gs={gs} />
            </div>
          </div>
          {/* Human area */}
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px',
            border: isHumanTurn || isClaiming ? '1px solid rgba(240,192,64,0.4)' : '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>Your discards</div>
                <DiscardPile tiles={gs.discards[0]} />
              </div>
              {gs.melds[0].length > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>Your melds</div>
                  <MeldRow melds={gs.melds[0]} size="sm" />
                </div>
              )}
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: '#f0c040', fontWeight: 700 }}>南 You</div>
                <div style={{ fontSize: 13, color: gs.scores[0] >= 500 ? '#4ade80' : '#f87171' }}>{gs.scores[0]} pts</div>
              </div>
            </div>
            {isClaiming && <ClaimWindow opts={gs.claimOpts} timer={claimTimer} onClaim={onClaim} />}
            <div>
              {isHumanTurn && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 4, textAlign: 'center' }}>
                  {gs.selIdx !== null ? 'Tap the same tile again to discard it' : 'Tap a tile to select it'}
                </div>
              )}
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-end', padding: '4px 0' }}>
                {gs.hands[0].map((tile, i) => (
                  <TileView key={tile.id} tile={tile} selected={gs.selIdx === i}
                    onClick={isHumanTurn ? () => onTileClick(i) : undefined} size="lg" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {gs.phase === 'won' && (
          <WinModal winner={gs.winner!} hands={gs.hands} melds={gs.melds} scores={gs.scores} onNew={startNewGame} />
        )}
        {gs.phase === 'exhausted' && <ExhaustedModal scores={gs.scores} onNew={startNewGame} />}
      </div>
    </TileStyleCtx.Provider>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function Mahjong() {
  const [mode, setMode] = useState<'menu' | 'solo' | 'online'>('menu');
  const [tileStyle, setTileStyle] = useState<TileStyle>(() => {
    try { return (localStorage.getItem('mj-tile-style') as TileStyle) || 'classic'; } catch { return 'classic'; }
  });

  const mj = useMjOnline();

  const handleSetStyle = (s: TileStyle) => {
    setTileStyle(s);
    try { localStorage.setItem('mj-tile-style', s); } catch {}
  };

  // Auto-transition to playing when game starts
  useEffect(() => {
    if (mj.status === 'playing' && mode !== 'online') setMode('online');
  }, [mj.status, mode]);

  if (mode === 'solo') {
    return <MahjongSolo tileStyle={tileStyle} onBack={() => setMode('menu')} />;
  }

  if (mode === 'online') {
    if ((mj.status === 'idle' || mj.status === 'connecting' || mj.status === 'lobby' || mj.status === 'error') && !mj.view) {
      return <MahjongLobby mj={mj} onBack={() => { mj.disconnect(); setMode('menu'); }} />;
    }
    if (mj.view) {
      return <MahjongOnlineGame view={mj.view} mj={mj} tileStyle={tileStyle}
        onBack={() => { mj.disconnect(); setMode('menu'); }} />;
    }
    return <MahjongLobby mj={mj} onBack={() => { mj.disconnect(); setMode('menu'); }} />;
  }

  return (
    <MahjongMenu tileStyle={tileStyle} setTileStyle={handleSetStyle}
      onSolo={() => setMode('solo')}
      onOnline={() => setMode('online')} />
  );
}
