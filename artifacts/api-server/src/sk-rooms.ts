import type { WebSocket } from 'ws';

// ─── TYPES ────────────────────────────────────────────────────────────────────
type CardType =
  | 'sneezing_kitten' | 'tissue_box' | 'peeky_cat' | 'shuffle_paws'
  | 'skip_nap' | 'reverse_zoomies' | 'attack_cat' | 'steal_treat'
  | 'favor_fish' | 'nope_cat'
  | 'cat_taco' | 'cat_melon' | 'cat_potato' | 'cat_beard' | 'cat_rainbow';

const BASIC_CATS: CardType[] = ['cat_taco', 'cat_melon', 'cat_potato', 'cat_beard', 'cat_rainbow'];
const NOPE_ELIGIBLE: CardType[] = ['attack_cat', 'steal_treat', 'favor_fish', 'skip_nap'];
const AI_NAMES = ['Whiskers', 'Mr. Floof', 'Professor Mittens'];
export const MAX_SK_HUMANS = 4;
export const SK_NOPE_SECONDS = 4;
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface SkCard { id: number; type: CardType; }

export interface SkPlayerView {
  mySeat: number;
  myHand: SkCard[];
  handSizes: number[];
  topDiscard: SkCard | null;
  deckCount: number;
  names: string[];
  isHuman: boolean[];
  eliminated: boolean[];
  current: number;
  phase: 'action' | 'nope_window' | 'peek_view' | 'steal_target' | 'favor_target' | 'won';
  myPhase: 'idle' | 'action' | 'nope' | 'steal_target' | 'favor_target' | 'peek_view';
  nopeSeconds: number;
  peekCards: SkCard[];
  winner: number | null;
  direction: 1 | -1;
  extraTurns: number;
  log: string[];
  roomCode: string;
  players: { name: string; seat: number }[];
}

export interface SkPlayer { ws: WebSocket; name: string; seat: number; }

interface PendingEffect { fn: (gs: SkGS) => SkGS; }

interface SkGS {
  deck: SkCard[];
  hands: SkCard[][];
  discard: SkCard[];
  names: string[];
  isHuman: boolean[];
  eliminated: boolean[];
  current: number;
  direction: 1 | -1;
  extraTurns: number;
  phase: 'action' | 'nope_window' | 'peek_view' | 'steal_target' | 'favor_target' | 'won';
  nopeEnd: number;
  nopeTimerId: ReturnType<typeof setTimeout> | null;
  peekCards: SkCard[];
  pendingEffect: PendingEffect | null;
  winner: number | null;
  log: string[];
  stealActor: number;
}

export interface SkRoom {
  code: string;
  players: SkPlayer[];
  state: SkGS | null;
  started: boolean;
  maxPlayers: number;
  createdAt: number;
}

const rooms = new Map<string, SkRoom>();

function genCode(): string {
  return Array.from({ length: 4 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sendWs(ws: WebSocket, data: Record<string, unknown>) {
  if (ws.readyState === 1) ws.send(JSON.stringify(data));
}

// ─── ROOM MANAGEMENT ─────────────────────────────────────────────────────────
export function createSkRoom(ws: WebSocket, name: string): string {
  let code: string;
  do { code = genCode(); } while (rooms.has(code));
  rooms.set(code, { code, players: [{ ws, name, seat: 0 }], state: null, started: false, maxPlayers: 4, createdAt: Date.now() });
  for (const [k, r] of rooms) { if (Date.now() - r.createdAt > 7_200_000) rooms.delete(k); }
  return code;
}

export function joinSkRoom(code: string, ws: WebSocket, name: string): { room: SkRoom; seat: number } | null {
  const room = rooms.get(code.toUpperCase());
  if (!room || room.started || room.players.length >= MAX_SK_HUMANS) return null;
  const seat = room.players.length;
  room.players.push({ ws, name, seat });
  return { room, seat };
}

export function getSkRoom(code: string): SkRoom | undefined {
  return rooms.get(code.toUpperCase());
}

export function removeSkPlayer(code: string, ws: WebSocket): { room: SkRoom; player: SkPlayer } | null {
  const room = rooms.get(code.toUpperCase());
  if (!room) return null;
  const pIdx = room.players.findIndex(p => p.ws === ws);
  if (pIdx < 0) return null;
  const [player] = room.players.splice(pIdx, 1);
  if (room.players.length === 0) {
    if (room.state?.nopeTimerId) clearTimeout(room.state.nopeTimerId);
    rooms.delete(code);
  }
  return { room, player };
}

export function lobbySnapshotSk(room: SkRoom) {
  return room.players.map(p => ({ name: p.name, seat: p.seat }));
}

export function broadcastSkState(room: SkRoom): void {
  if (!room.state) return;
  const gs = room.state;
  for (const p of room.players) {
    const view = buildSkView(room, gs, p.seat);
    sendWs(p.ws, { type: 'sk_state', data: view });
  }
}

function buildSkView(room: SkRoom, gs: SkGS, seat: number): SkPlayerView {
  const nopeSeconds = gs.phase === 'nope_window'
    ? Math.max(0, Math.ceil((gs.nopeEnd - Date.now()) / 1000))
    : 0;

  let myPhase: SkPlayerView['myPhase'] = 'idle';
  if (gs.phase === 'action' && gs.current === seat) myPhase = 'action';
  else if (gs.phase === 'nope_window' && !gs.eliminated[seat] && seat !== gs.current) myPhase = 'nope';
  else if (gs.phase === 'steal_target' && gs.stealActor === seat) myPhase = 'steal_target';
  else if (gs.phase === 'favor_target' && gs.stealActor === seat) myPhase = 'favor_target';
  else if (gs.phase === 'peek_view' && gs.current === seat) myPhase = 'peek_view';

  return {
    mySeat: seat,
    myHand: gs.hands[seat],
    handSizes: gs.hands.map(h => h.length),
    topDiscard: gs.discard.length > 0 ? gs.discard[gs.discard.length - 1] : null,
    deckCount: gs.deck.length,
    names: gs.names,
    isHuman: gs.isHuman,
    eliminated: gs.eliminated,
    current: gs.current,
    phase: gs.phase,
    myPhase,
    nopeSeconds,
    peekCards: gs.current === seat && gs.phase === 'peek_view' ? gs.peekCards : [],
    winner: gs.winner,
    direction: gs.direction,
    extraTurns: gs.extraTurns,
    log: gs.log.slice(-10),
    roomCode: room.code,
    players: room.players.map(p => ({ name: p.name, seat: p.seat })),
  };
}

// ─── GAME HELPERS ────────────────────────────────────────────────────────────
function activePlayers(gs: SkGS): number[] {
  return gs.eliminated.map((e, i) => !e ? i : -1).filter(i => i >= 0);
}

function nextPlayer(gs: SkGS, from: number): number {
  const active = activePlayers(gs);
  if (active.length <= 1) return from;
  const idx = active.indexOf(from);
  return active[((idx + gs.direction) + active.length) % active.length];
}

function logAdd(gs: SkGS, msg: string): SkGS {
  return { ...gs, log: [...gs.log.slice(-14), msg] };
}

function checkWin(gs: SkGS): SkGS {
  const active = activePlayers(gs);
  if (active.length <= 1) return { ...gs, phase: 'won', winner: active[0] ?? 0 };
  return gs;
}

function endTurn(gs: SkGS): SkGS {
  if (gs.extraTurns > 1) return { ...gs, extraTurns: gs.extraTurns - 1, phase: 'action' };
  const next = nextPlayer(gs, gs.current);
  return { ...gs, current: next, extraTurns: 0, phase: 'action' };
}

function doDrawCard(gs: SkGS): SkGS {
  if (gs.deck.length === 0) return checkWin(endTurn(gs));
  const drawn = gs.deck[0];
  const newDeck = gs.deck.slice(1);
  const who = gs.names[gs.current];
  if (drawn.type === 'sneezing_kitten') {
    const hand = gs.hands[gs.current];
    const tbIdx = hand.findIndex(c => c.type === 'tissue_box');
    if (tbIdx >= 0) {
      const newHand = hand.filter((_, i) => i !== tbIdx);
      const gs2 = logAdd({
        ...gs, deck: newDeck,
        discard: [...gs.discard, drawn, hand[tbIdx]],
        hands: gs.hands.map((h, i) => i === gs.current ? newHand : h),
      }, `🧻 ${who} used Tissue Box and survived!`);
      return checkWin(endTurn(gs2));
    }
    const newElim = [...gs.eliminated]; newElim[gs.current] = true;
    const gs2 = logAdd({ ...gs, deck: newDeck, discard: [...gs.discard, drawn], eliminated: newElim },
      `🤧 ${who} drew a Sneezing Kitten and is ELIMINATED!`);
    return checkWin(endTurn(gs2));
  }
  const newHand = [...gs.hands[gs.current], drawn];
  const gs2 = logAdd({ ...gs, deck: newDeck, hands: gs.hands.map((h, i) => i === gs.current ? newHand : h) },
    `${who} drew a card 🃏`);
  return checkWin(endTurn(gs2));
}

function applyCardEffect(gs: SkGS, card: SkCard, player: number, room: SkRoom): SkGS {
  const who = gs.names[player];
  switch (card.type) {
    case 'skip_nap':
      return checkWin(logAdd(endTurn(gs), `${who} used Skip Nap — no draw! 😴`));
    case 'shuffle_paws':
      return logAdd({ ...gs, deck: shuffle(gs.deck) }, `${who} shuffled the deck! 🔀`);
    case 'peeky_cat': {
      const peekCards = gs.deck.slice(0, 3);
      if (!gs.isHuman[player]) return logAdd(gs, `${who} peeked at the top 3 cards! 👀`);
      return logAdd({ ...gs, peekCards, phase: 'peek_view' }, `${who} peeked at the top 3 cards! 👀`);
    }
    case 'reverse_zoomies':
      return logAdd({ ...gs, direction: (-gs.direction) as 1 | -1 }, `${who} reversed the turn order! 🔄`);
    case 'attack_cat': {
      const next = nextPlayer(gs, player);
      return logAdd({ ...gs, current: next, extraTurns: 2, phase: 'action' },
        `${who} played Attack Cat! 😾 ${gs.names[next]} takes 2 turns!`);
    }
    case 'steal_treat': {
      const targets = activePlayers(gs).filter(p => p !== player && gs.hands[p].length > 0);
      if (targets.length === 0) return checkWin(endTurn(gs));
      if (!gs.isHuman[player]) {
        const target = targets[Math.floor(Math.random() * targets.length)];
        const si = Math.floor(Math.random() * gs.hands[target].length);
        const stolen = gs.hands[target][si];
        const newHands = gs.hands.map((h, i) => i === player ? [...h, stolen] : i === target ? h.filter((_, j) => j !== si) : h);
        return checkWin(endTurn(logAdd({ ...gs, hands: newHands }, `${who} stole from ${gs.names[target]}! 🐱`)));
      }
      return logAdd({ ...gs, phase: 'steal_target', stealActor: player }, `${who} plays Steal Treat — pick a target! 🐱`);
    }
    case 'favor_fish': {
      const targets = activePlayers(gs).filter(p => p !== player && gs.hands[p].length > 0);
      if (targets.length === 0) return checkWin(endTurn(gs));
      if (!gs.isHuman[player]) {
        const target = targets[Math.floor(Math.random() * targets.length)];
        const gi = Math.floor(Math.random() * gs.hands[target].length);
        const given = gs.hands[target][gi];
        const newHands = gs.hands.map((h, i) => i === player ? [...h, given] : i === target ? h.filter((_, j) => j !== gi) : h);
        return checkWin(endTurn(logAdd({ ...gs, hands: newHands }, `${who} got a favor from ${gs.names[target]}! 🐟`)));
      }
      return logAdd({ ...gs, phase: 'favor_target', stealActor: player }, `${who} plays Favor Fish — pick who gives! 🐟`);
    }
    default: return gs;
  }
}

function openNopeWindow(gs: SkGS, room: SkRoom, pending: PendingEffect, logMsg: string): SkGS {
  const nopeEnd = Date.now() + SK_NOPE_SECONDS * 1000;
  const timerId = setTimeout(() => {
    const r = getSkRoom(room.code);
    if (!r?.state || r.state.phase !== 'nope_window') return;
    let gs2 = pending.fn({ ...r.state, pendingEffect: null, nopeTimerId: null });
    r.state = gs2;
    if (r.state.phase === 'action' && !r.state.isHuman[r.state.current]) scheduleSkAI(r, 800);
    broadcastSkState(r);
  }, SK_NOPE_SECONDS * 1000);
  return logAdd({ ...gs, phase: 'nope_window', nopeEnd, nopeTimerId: timerId, pendingEffect: pending }, logMsg);
}

function scheduleSkAI(room: SkRoom, delay = 1200): void {
  setTimeout(() => {
    const r = getSkRoom(room.code);
    if (!r?.state) return;
    const gs = r.state;
    if (gs.phase !== 'action' || gs.isHuman[gs.current]) return;
    r.state = aiTurn(gs, r);
    broadcastSkState(r);
    if (r.state.phase === 'action' && !r.state.isHuman[r.state.current]) scheduleSkAI(r, 1000);
  }, delay);
}

function aiTurn(gs: SkGS, room: SkRoom): SkGS {
  const p = gs.current;
  const hand = gs.hands[p];
  const who = gs.names[p];
  const dangerZone = gs.deck.length <= 6;

  const findIdx = (type: CardType) => hand.findIndex(c => c.type === type);
  const removeCard = (idx: number) => {
    const card = hand[idx];
    return { card, gs2: { ...gs, hands: gs.hands.map((h, i) => i === p ? hand.filter((_, j) => j !== idx) : h), discard: [...gs.discard, card] } };
  };

  if (dangerZone) {
    for (const type of ['skip_nap', 'shuffle_paws', 'attack_cat'] as CardType[]) {
      const idx = findIdx(type);
      if (idx >= 0) { const { card, gs2 } = removeCard(idx); return applyCardEffect(gs2, card, p, room); }
    }
  }

  // Cat pair?
  const catCounts = new Map<CardType, number[]>();
  hand.forEach((c, i) => { if (BASIC_CATS.includes(c.type)) { if (!catCounts.has(c.type)) catCounts.set(c.type, []); catCounts.get(c.type)!.push(i); } });
  const pairEntry = [...catCounts.entries()].find(([, idxs]) => idxs.length >= 2);

  const actionPool: number[] = [];
  const peekIdx = findIdx('peeky_cat'); if (peekIdx >= 0) actionPool.push(peekIdx);
  const stealIdx = findIdx('steal_treat');
  if (stealIdx >= 0 && activePlayers(gs).some(ap => ap !== p && gs.hands[ap].length > 0)) actionPool.push(stealIdx);
  const favorIdx = findIdx('favor_fish'); if (favorIdx >= 0) actionPool.push(favorIdx);

  if (pairEntry && actionPool.length === 0) {
    const [, catIdxs] = pairEntry;
    const targets = activePlayers(gs).filter(ap => ap !== p && gs.hands[ap].length > 0);
    if (targets.length > 0) {
      const target = targets[Math.floor(Math.random() * targets.length)];
      const si = Math.floor(Math.random() * gs.hands[target].length);
      const stolen = gs.hands[target][si];
      const newHand = hand.filter((_, i) => i !== catIdxs[0] && i !== catIdxs[1]);
      const cats = [hand[catIdxs[0]], hand[catIdxs[1]]];
      const newHands = gs.hands.map((h, i) => i === p ? [...newHand, stolen] : i === target ? h.filter((_, j) => j !== si) : h);
      return checkWin(endTurn(logAdd({ ...gs, hands: newHands, discard: [...gs.discard, ...cats] },
        `${who} played a pair & stole from ${gs.names[target]}! 🐱`)));
    }
  }

  if (actionPool.length > 0 && Math.random() < 0.55) {
    const pick = actionPool[Math.floor(Math.random() * actionPool.length)];
    const { card, gs2 } = removeCard(pick);
    return applyCardEffect(gs2, card, p, room);
  }

  return doDrawCard(gs);
}

// ─── PUBLIC ACTIONS ──────────────────────────────────────────────────────────
export function startSkGame(room: SkRoom): void {
  const humanCount = room.players.length;
  const total = Math.max(humanCount, Math.min(5, room.maxPlayers));
  const names: string[] = [];
  const isHuman: boolean[] = [];
  for (let i = 0; i < total; i++) {
    if (i < humanCount) { names.push(room.players[i].name); isHuman.push(true); }
    else { names.push(AI_NAMES[i - humanCount] ?? `Bot${i}`); isHuman.push(false); }
  }

  let fullDeck: SkCard[] = [];
  let id = 0;
  const add = (type: CardType, count: number) => { for (let i = 0; i < count; i++) fullDeck.push({ id: id++, type }); };
  add('tissue_box', 4); add('peeky_cat', 4); add('shuffle_paws', 4);
  add('skip_nap', 4); add('reverse_zoomies', 2); add('attack_cat', 2);
  add('steal_treat', 3); add('favor_fish', 3); add('nope_cat', 4);
  for (const cat of BASIC_CATS) add(cat, 4);
  fullDeck = shuffle(fullDeck);

  const hands: SkCard[][] = Array.from({ length: total }, () => []);
  let idx = 0;
  for (let i = 0; i < 5; i++) for (let p = 0; p < total; p++) hands[p].push(fullDeck[idx++]);
  let deckRem = fullDeck.slice(idx);
  let tbId = 900;
  for (let p = 0; p < total; p++) hands[p].push({ id: tbId++, type: 'tissue_box' });
  for (let k = 0; k < total - 1; k++) deckRem.push({ id: 990 + k, type: 'sneezing_kitten' });
  deckRem = shuffle(deckRem);

  room.state = {
    deck: deckRem, hands, discard: [], names, isHuman,
    eliminated: Array(total).fill(false),
    current: 0, direction: 1, extraTurns: 0, phase: 'action',
    nopeEnd: 0, nopeTimerId: null, peekCards: [], pendingEffect: null,
    winner: null, log: ['Game started! 🐱 Avoid the Sneezing Kitten!'], stealActor: 0,
  };
  room.started = true;

  broadcastSkState(room);
  if (!isHuman[0]) scheduleSkAI(room, 1500);
}

export function applySkDraw(room: SkRoom, seat: number): void {
  const gs = room.state;
  if (!gs || gs.phase !== 'action' || gs.current !== seat) return;
  room.state = doDrawCard(gs);
  if (room.state.phase === 'action' && !room.state.isHuman[room.state.current]) scheduleSkAI(room, 1000);
  broadcastSkState(room);
}

export function applySkPlay(room: SkRoom, seat: number, cardId: number, pair2Id?: number): void {
  const gs = room.state;
  if (!gs || gs.phase !== 'action' || gs.current !== seat) return;
  const hand = gs.hands[seat];
  const cardIdx = hand.findIndex(c => c.id === cardId);
  if (cardIdx < 0) return;
  const card = hand[cardIdx];
  if (card.type === 'sneezing_kitten' || card.type === 'tissue_box') return;

  // Cat pair
  if (BASIC_CATS.includes(card.type) && pair2Id !== undefined) {
    const p2Idx = hand.findIndex(c => c.id === pair2Id && c.type === card.type && c.id !== cardId);
    if (p2Idx < 0) return;
    const newHand = hand.filter((_, i) => i !== cardIdx && i !== p2Idx);
    let gs2: SkGS = { ...gs, hands: gs.hands.map((h, i) => i === seat ? newHand : h), discard: [...gs.discard, card, hand[p2Idx]] };
    const who = gs.names[seat];
    const targets = activePlayers(gs2).filter(p => p !== seat && gs2.hands[p].length > 0);
    if (targets.length === 0) { room.state = checkWin(endTurn(gs2)); broadcastSkState(room); return; }
    gs2 = logAdd({ ...gs2, phase: 'steal_target', stealActor: seat }, `${who} played a cat pair! Choose your steal target! 🐱`);
    room.state = gs2;
    broadcastSkState(room);
    return;
  }

  // Remove from hand
  const newHand = hand.filter((_, i) => i !== cardIdx);
  let gs2: SkGS = { ...gs, hands: gs.hands.map((h, i) => i === seat ? newHand : h), discard: [...gs.discard, card] };
  const who = gs.names[seat];

  // Check if any other active human player can nope this
  if (NOPE_ELIGIBLE.includes(card.type)) {
    const canNope = activePlayers(gs2).some(p => p !== seat && !gs2.eliminated[p] && gs2.isHuman[p] && gs2.hands[p].some(c => c.type === 'nope_cat'));
    if (canNope) {
      gs2 = openNopeWindow(gs2, room,
        { fn: (g) => applyCardEffect(g, card, seat, room) },
        `${who} plays ${card.type.replace(/_/g, ' ')}! You have ${SK_NOPE_SECONDS}s to Nope! 🙅`
      );
      room.state = gs2;
      broadcastSkState(room);
      return;
    }
  }

  room.state = applyCardEffect(gs2, card, seat, room);
  if (room.state.phase === 'action' && !room.state.isHuman[room.state.current]) scheduleSkAI(room, 1000);
  broadcastSkState(room);
}

export function applySkNope(room: SkRoom, seat: number): void {
  const gs = room.state;
  if (!gs || gs.phase !== 'nope_window' || gs.eliminated[seat] || seat === gs.current) return;
  const hand = gs.hands[seat];
  const nopeIdx = hand.findIndex(c => c.type === 'nope_cat');
  if (nopeIdx < 0) return;
  if (gs.nopeTimerId) clearTimeout(gs.nopeTimerId);
  const nopCard = hand[nopeIdx];
  const newHand = hand.filter((_, i) => i !== nopeIdx);
  let gs2 = logAdd({
    ...gs,
    hands: gs.hands.map((h, i) => i === seat ? newHand : h),
    discard: [...gs.discard, nopCard],
    phase: 'action', pendingEffect: null, nopeTimerId: null,
  }, `🙅 ${gs.names[seat]} played Nope Cat! Effect cancelled!`);
  gs2 = checkWin(endTurn(gs2));
  room.state = gs2;
  if (gs2.phase === 'action' && !gs2.isHuman[gs2.current]) scheduleSkAI(room, 1000);
  broadcastSkState(room);
}

export function applySkStealTarget(room: SkRoom, seat: number, targetSeat: number): void {
  const gs = room.state;
  if (!gs || !['steal_target', 'favor_target'].includes(gs.phase) || gs.stealActor !== seat) return;
  if (gs.eliminated[targetSeat] || targetSeat === seat || gs.hands[targetSeat].length === 0) return;
  const si = Math.floor(Math.random() * gs.hands[targetSeat].length);
  const stolen = gs.hands[targetSeat][si];
  const newHands = gs.hands.map((h, i) => i === seat ? [...h, stolen] : i === targetSeat ? h.filter((_, j) => j !== si) : h);
  let gs2 = logAdd({ ...gs, hands: newHands }, `${gs.names[seat]} stole a card from ${gs.names[targetSeat]}! 🐱`);
  gs2 = checkWin(endTurn({ ...gs2, phase: 'action' }));
  room.state = gs2;
  if (gs2.phase === 'action' && !gs2.isHuman[gs2.current]) scheduleSkAI(room, 1000);
  broadcastSkState(room);
}

export function applySkPeekClose(room: SkRoom, seat: number): void {
  const gs = room.state;
  if (!gs || gs.phase !== 'peek_view' || gs.current !== seat) return;
  room.state = { ...gs, phase: 'action', peekCards: [] };
  broadcastSkState(room);
}
