// ─── TYPES ────────────────────────────────────────────────────────────────────
export type Suit = 'man' | 'sou' | 'pin' | 'wind' | 'dragon';
export type MeldType = 'pung' | 'chow';
export type ClaimOpt = 'win' | 'pung' | 'chow' | 'skip';

export interface Tile { id: number; suit: Suit; value: number; }
export interface Meld { type: MeldType; tiles: Tile[]; fromPlayer?: number; }
export interface WinInfo { player: number; fan: number; selfDraw: boolean; payer?: number; desc: string[]; }

export interface MjGS {
  wall: Tile[]; wIdx: number;
  hands: Tile[][]; melds: Meld[][]; discards: Tile[][];
  current: number;
  phase: 'turn' | 'claim_window' | 'won' | 'exhausted';
  dealer: number;
  lastDiscard: { tile: Tile; from: number } | null;
  claimPending: { seat: number; opts: ClaimOpt[] } | null;
  winner: WinInfo | null;
  scores: number[];
  msg: string;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const MAN_CN = ['一','二','三','四','五','六','七','八','九'];
const WIND_CN = ['東','南','西','北'];
const DRAGON_CN = ['白','發','中'];
export const PLAYER_NAMES = ['South','East','North','West'];
const NEXT_P: Record<number,number> = { 1:0, 0:3, 3:2, 2:1 };

// ─── HELPERS ──────────────────────────────────────────────────────────────────
export const nextPlayer = (p: number) => NEXT_P[p];
export const isHonor = (t: Tile) => t.suit === 'wind' || t.suit === 'dragon';
export const isTerminal = (t: Tile) => !isHonor(t) && (t.value === 1 || t.value === 9);
export const sameKey = (a: Tile, b: Tile) => a.suit === b.suit && a.value === b.value;
export const tileKey = (t: Tile) => `${t.suit}${t.value}`;

export function tileLabel(t: Tile): string {
  if (t.suit === 'man') return MAN_CN[t.value - 1] + '萬';
  if (t.suit === 'sou') return `${t.value}索`;
  if (t.suit === 'pin') return `${t.value}筒`;
  if (t.suit === 'wind') return WIND_CN[t.value - 1];
  return DRAGON_CN[t.value - 1];
}

export const sortTiles = (ts: Tile[]) => [...ts].sort((a, b) => {
  const s = { man: 0, sou: 1, pin: 2, wind: 3, dragon: 4 };
  return s[a.suit] - s[b.suit] || a.value - b.value;
});

export function claimOrder(from: number): number[] {
  const r: number[] = [];
  let p = nextPlayer(from);
  while (p !== from) { r.push(p); p = nextPlayer(p); }
  return r;
}

// ─── TILE BUILDING ────────────────────────────────────────────────────────────
export function buildWall(): Tile[] {
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

export function canWin(hand: Tile[], meldCount = 0): boolean {
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

// ─── SCORING ──────────────────────────────────────────────────────────────────
export function calcFan(hand: Tile[], melds: Meld[], selfDraw: boolean): { fan: number; desc: string[] } {
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
export function aiChooseDiscard(hand: Tile[]): number {
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

export function aiDecideClaim(hand: Tile[], disc: Tile, meldCount: number, isNext: boolean): 'win' | 'pung' | 'chow' | null {
  if (canWin([...hand, disc], meldCount)) return 'win';
  if (hand.filter(t => sameKey(t, disc)).length >= 2) return 'pung';
  if (isNext && !isHonor(disc) && checkChow(hand, disc) && Math.random() < 0.25) return 'chow';
  return null;
}

export function checkChow(hand: Tile[], disc: Tile): boolean {
  if (isHonor(disc)) return false;
  const v = disc.value, s = disc.suit;
  return (hand.some(t => t.suit === s && t.value === v + 1) && hand.some(t => t.suit === s && t.value === v + 2)) ||
    (hand.some(t => t.suit === s && t.value === v - 1) && hand.some(t => t.suit === s && t.value === v + 1)) ||
    (hand.some(t => t.suit === s && t.value === v - 2) && hand.some(t => t.suit === s && t.value === v - 1));
}

export function autoSelectChow(hand: Tile[], disc: Tile): [Tile, Tile] | null {
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

// ─── CORE GAME FUNCTIONS ──────────────────────────────────────────────────────
export function initMjGS(): MjGS {
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
    current: 1, phase: 'turn', dealer: 1,
    lastDiscard: null, claimPending: null, winner: null,
    scores: [500, 500, 500, 500],
    msg: 'East goes first',
  };
}

export function advanceToNextPlayer(gs: MjGS): MjGS {
  const from = gs.current;
  const next = nextPlayer(from);
  if (gs.wIdx >= gs.wall.length) return { ...gs, phase: 'exhausted', msg: '荒牌! Draw game.' };
  const drawn = gs.wall[gs.wIdx];
  const newHand = sortTiles([...gs.hands[next], drawn]);
  const newHands = gs.hands.map((h, i) => i === next ? newHand : h);
  return { ...gs, wIdx: gs.wIdx + 1, hands: newHands, current: next, claimPending: null, lastDiscard: null, phase: 'turn', msg: `${PLAYER_NAMES[next]}'s turn` };
}

export function doWin(gs: MjGS, winner: number, selfDraw: boolean, payer: number | undefined, discTile: Tile | undefined): MjGS {
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
    phase: 'won', winner: { player: winner, fan, selfDraw, payer, desc },
    scores: newScores, claimPending: null,
    msg: selfDraw ? `🎉 ${PLAYER_NAMES[winner]} wins by self-draw!` : `🎉 ${PLAYER_NAMES[winner]} wins!`,
  };
}

export function doAIPung(gs: MjGS, punger: number, disc: Tile, from: number): MjGS {
  const hand = gs.hands[punger];
  let cnt = 0;
  const newHand = hand.filter(t => { if (cnt < 2 && sameKey(t, disc)) { cnt++; return false; } return true; });
  const pungTiles = hand.filter(t => sameKey(t, disc)).slice(0, 2).concat(disc);
  return {
    ...gs,
    hands: gs.hands.map((h, i) => i === punger ? newHand : h),
    melds: gs.melds.map((m, i) => i === punger ? [...m, { type: 'pung', tiles: pungTiles, fromPlayer: from }] : m),
    current: punger, phase: 'turn', claimPending: null,
    msg: `${PLAYER_NAMES[punger]} pungs ${tileLabel(disc)}!`,
  };
}

export function doAIChow(gs: MjGS, chower: number, disc: Tile, from: number): MjGS {
  const pair = autoSelectChow(gs.hands[chower], disc);
  if (!pair) return advanceToNextPlayer({ ...gs, discards: gs.discards.map((d,i) => i===from?[...d,disc]:d), lastDiscard: { tile: disc, from } });
  const ids = new Set(pair.map(t => t.id));
  const newHand = gs.hands[chower].filter(t => !ids.has(t.id));
  const chowTiles = [...pair, disc].sort((a, b) => a.value - b.value);
  return {
    ...gs,
    hands: gs.hands.map((h, i) => i === chower ? newHand : h),
    melds: gs.melds.map((m, i) => i === chower ? [...m, { type: 'chow', tiles: chowTiles, fromPlayer: from }] : m),
    current: chower, phase: 'turn', claimPending: null,
    msg: `${PLAYER_NAMES[chower]} chows ${tileLabel(disc)}!`,
  };
}

export function doAITurn(gs: MjGS): { gs: MjGS; disc: Tile } {
  const p = gs.current;
  if (canWin(gs.hands[p], gs.melds[p].length)) {
    return { gs: doWin(gs, p, true, undefined, undefined), disc: gs.hands[p][0] };
  }
  const idx = aiChooseDiscard(gs.hands[p]);
  const disc = gs.hands[p][idx];
  const newHands = gs.hands.map((h, i) => i === p ? h.filter((_, j) => j !== idx) : h);
  return { gs: { ...gs, hands: newHands }, disc };
}
