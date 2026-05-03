import type { WebSocket } from "ws";
import {
  initMjGS, advanceToNextPlayer, doWin, doAIPung, doAIChow, doAITurn,
  canWin, checkChow, claimOrder, nextPlayer, tileLabel, sameKey, autoSelectChow, aiDecideClaim,
  PLAYER_NAMES,
} from "./mahjong-logic";
import type { MjGS, Tile, Meld, ClaimOpt, WinInfo } from "./mahjong-logic";

// ─── TYPES ────────────────────────────────────────────────────────────────────
export type MjLobbyPlayer = { name: string; seat: number };

export interface MjPlayerView {
  mySeat: number;
  myHand: Tile[];
  handSizes: number[];
  melds: Meld[][];
  discards: Tile[][];
  scores: number[];
  names: string[];
  isHuman: boolean[];
  current: number;
  myPhase: 'watch' | 'discard' | 'claim';
  claimOpts: ClaimOpt[];
  lastDiscard: { tile: Tile; from: number } | null;
  winner: WinInfo | null;
  phase: 'lobby' | 'turn' | 'claim_window' | 'won' | 'exhausted';
  msg: string;
  wallLeft: number;
  dealer: number;
  players: MjLobbyPlayer[];
  claimTimer: number;
  roomCode: string;
  revealHands: Tile[][] | null;
}

interface MjPlayer { ws: WebSocket; name: string; seat: number; }

interface MjRoom {
  code: string;
  players: MjPlayer[];
  humanSeats: Set<number>;
  names: string[];
  state: MjGS | null;
  started: boolean;
  createdAt: number;
  claimTimer: ReturnType<typeof setTimeout> | null;
  aiTimer: ReturnType<typeof setTimeout> | null;
  claimDeadline: number;
}

// ─── ROOM STORE ───────────────────────────────────────────────────────────────
const rooms = new Map<string, MjRoom>();
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const MAX_MJ_HUMANS = 3;
const CLAIM_SECS = 7;

function genCode(): string {
  return Array.from({ length: 4 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
}

export function createMjRoom(ws: WebSocket, name: string): string {
  let code: string;
  do { code = genCode(); } while (rooms.has(code));
  const names = [name, 'Bot East', 'Bot North', 'Bot West'];
  rooms.set(code, {
    code, players: [{ ws, name, seat: 0 }],
    humanSeats: new Set([0]), names,
    state: null, started: false, createdAt: Date.now(),
    claimTimer: null, aiTimer: null, claimDeadline: 0,
  });
  for (const [k, r] of rooms) {
    if (Date.now() - r.createdAt > 7_200_000) rooms.delete(k);
  }
  return code;
}

export function joinMjRoom(code: string, ws: WebSocket, name: string): { room: MjRoom; seat: number } | null {
  const room = rooms.get(code.toUpperCase());
  if (!room || room.started || room.players.length >= MAX_MJ_HUMANS) return null;
  const seat = room.players.length;
  room.players.push({ ws, name, seat });
  room.humanSeats.add(seat);
  room.names[seat] = name;
  return { room, seat };
}

export function getMjRoom(code: string): MjRoom | undefined { return rooms.get(code); }

export function removeMjPlayer(code: string, ws: WebSocket): { room: MjRoom; seat: number } | null {
  const room = rooms.get(code);
  if (!room) return null;
  const idx = room.players.findIndex(p => p.ws === ws);
  if (idx < 0) return null;
  const seat = room.players[idx].seat;
  room.players.splice(idx, 1);
  room.humanSeats.delete(seat);
  room.names[seat] = `Bot ${PLAYER_NAMES[seat]}`;
  if (room.players.length === 0) {
    if (room.claimTimer) clearTimeout(room.claimTimer);
    if (room.aiTimer) clearTimeout(room.aiTimer);
    rooms.delete(code);
  }
  return { room, seat };
}

export function lobbySnapshotMj(room: MjRoom): MjLobbyPlayer[] {
  return room.players.map(p => ({ name: p.name, seat: p.seat }));
}

// ─── BROADCAST ────────────────────────────────────────────────────────────────
function sendTo(ws: WebSocket, data: Record<string, unknown>): void {
  if (ws.readyState === 1) ws.send(JSON.stringify(data));
}

export function broadcastMjState(room: MjRoom): void {
  if (!room.state) return;
  const gs = room.state;
  const timeLeft = room.claimDeadline > 0 ? Math.max(0, Math.ceil((room.claimDeadline - Date.now()) / 1000)) : CLAIM_SECS;
  for (const player of room.players) {
    sendTo(player.ws, { type: 'mj_state', data: buildPlayerView(room, gs, player.seat, timeLeft) });
  }
}

function buildPlayerView(room: MjRoom, gs: MjGS, seat: number, timeLeft: number): MjPlayerView {
  const isClaim = gs.phase === 'claim_window';
  const myPending = isClaim && gs.claimPending?.seat === seat;
  let myPhase: 'watch' | 'discard' | 'claim' = 'watch';
  if (gs.phase === 'turn' && gs.current === seat) myPhase = 'discard';
  if (myPending) myPhase = 'claim';
  const isOver = gs.phase === 'won' || gs.phase === 'exhausted';
  return {
    mySeat: seat,
    myHand: gs.hands[seat],
    handSizes: gs.hands.map(h => h.length),
    melds: gs.melds,
    discards: gs.discards,
    scores: gs.scores,
    names: room.names,
    isHuman: [0,1,2,3].map(i => room.humanSeats.has(i)),
    current: gs.current,
    myPhase,
    claimOpts: myPending ? (gs.claimPending?.opts ?? []) : [],
    lastDiscard: gs.lastDiscard,
    winner: gs.winner,
    phase: gs.phase === 'turn' ? 'turn' : gs.phase,
    msg: gs.msg,
    wallLeft: gs.wall.length - gs.wIdx,
    dealer: gs.dealer,
    players: room.players.map(p => ({ name: p.name, seat: p.seat })),
    claimTimer: timeLeft,
    roomCode: room.code,
    revealHands: isOver ? gs.hands : null,
  };
}

// ─── GAME FLOW ────────────────────────────────────────────────────────────────
export function startMjGame(room: MjRoom): void {
  room.state = initMjGS();
  room.started = true;
  broadcastMjState(room);
  scheduleNextTurn(room);
}

function scheduleNextTurn(room: MjRoom): void {
  const gs = room.state;
  if (!gs || gs.phase === 'won' || gs.phase === 'exhausted') return;
  if (gs.phase !== 'turn') return;
  const cur = gs.current;
  if (room.humanSeats.has(cur)) {
    // Check self-draw win for human player
    if (canWin(gs.hands[cur], gs.melds[cur].length)) {
      room.state = { ...gs, phase: 'claim_window', claimPending: { seat: cur, opts: ['win', 'skip'] },
        msg: `🀄 Tsumo! You can win by self-draw!` };
      room.claimDeadline = Date.now() + CLAIM_SECS * 1000;
      broadcastMjState(room);
      startClaimTimer(room);
      return;
    }
    broadcastMjState(room);
    return;
  }
  // AI turn with delay
  const delay = 600 + Math.random() * 600;
  if (room.aiTimer) clearTimeout(room.aiTimer);
  room.aiTimer = setTimeout(() => {
    if (!room.state || room.state.phase !== 'turn' || room.state.current !== cur) return;
    const { gs: newGs, disc } = doAITurn(room.state);
    if (newGs.phase === 'won') { room.state = newGs; broadcastMjState(room); return; }
    room.state = newGs;
    processAfterDiscard(room, disc, cur);
  }, delay);
}

function processAfterDiscard(room: MjRoom, disc: Tile, from: number): void {
  let gs = room.state!;
  // Add disc to discard pile
  gs = { ...gs, discards: gs.discards.map((d, i) => i === from ? [...d, disc] : d), lastDiscard: { tile: disc, from } };
  room.state = gs;

  const order = claimOrder(from);

  // Check for wins first (human gets claim window, AI auto-wins)
  for (const p of order) {
    if (canWin([...gs.hands[p], disc], gs.melds[p].length)) {
      if (room.humanSeats.has(p)) {
        room.state = { ...gs, phase: 'claim_window', claimPending: { seat: p, opts: ['win', 'skip'] },
          msg: `🏆 ${tileLabel(disc)} completes your hand! Win?` };
        room.claimDeadline = Date.now() + CLAIM_SECS * 1000;
        broadcastMjState(room);
        startClaimTimer(room);
        return;
      } else {
        room.state = doWin(gs, p, false, from, disc);
        broadcastMjState(room);
        return;
      }
    }
  }

  // Check pung/chow in order — first eligible human gets claim window, AI auto-decides
  for (const p of order) {
    const canPung = gs.hands[p].filter(t => sameKey(t, disc)).length >= 2;
    const isNext = nextPlayer(from) === p;
    const canChowP = isNext && checkChow(gs.hands[p], disc);
    if (!canPung && !canChowP) continue;

    if (room.humanSeats.has(p)) {
      const opts: ClaimOpt[] = [];
      if (canPung) opts.push('pung');
      if (canChowP) opts.push('chow');
      opts.push('skip');
      room.state = { ...gs, phase: 'claim_window', claimPending: { seat: p, opts },
        msg: `${tileLabel(disc)} discarded — Claim?` };
      room.claimDeadline = Date.now() + CLAIM_SECS * 1000;
      broadcastMjState(room);
      startClaimTimer(room);
      return;
    } else {
      const dec = aiDecideClaim(gs.hands[p], disc, gs.melds[p].length, isNext);
      if (dec === 'pung') {
        room.state = doAIPung(gs, p, disc, from);
        broadcastMjState(room);
        scheduleNextTurn(room);
        return;
      }
      if (dec === 'chow') {
        room.state = doAIChow(gs, p, disc, from);
        broadcastMjState(room);
        scheduleNextTurn(room);
        return;
      }
    }
  }

  // No claims — advance
  room.state = advanceToNextPlayer({ ...gs, current: from });
  broadcastMjState(room);
  scheduleNextTurn(room);
}

function startClaimTimer(room: MjRoom): void {
  if (room.claimTimer) clearTimeout(room.claimTimer);
  room.claimTimer = setTimeout(() => {
    if (!room.state || room.state.phase !== 'claim_window') return;
    const pending = room.state.claimPending;
    if (!pending) return;
    // Auto-skip
    applyMjClaim(room, pending.seat, 'skip');
  }, CLAIM_SECS * 1000);
}

// ─── PLAYER ACTIONS ───────────────────────────────────────────────────────────
export function applyMjDiscard(room: MjRoom, seat: number, tileId: number): boolean {
  const gs = room.state;
  if (!gs || gs.phase !== 'turn' || gs.current !== seat) return false;
  if (!room.humanSeats.has(seat)) return false;
  const tileIdx = gs.hands[seat].findIndex(t => t.id === tileId);
  if (tileIdx < 0) return false;
  const disc = gs.hands[seat][tileIdx];
  const newHands = gs.hands.map((h, i) => i === seat ? h.filter((_, j) => j !== tileIdx) : h);
  room.state = { ...gs, hands: newHands, msg: `${room.names[seat]} discards ${tileLabel(disc)}` };
  processAfterDiscard(room, disc, seat);
  return true;
}

export function applyMjClaim(room: MjRoom, seat: number, opt: ClaimOpt): boolean {
  const gs = room.state;
  if (!gs || gs.phase !== 'claim_window') return false;
  const pending = gs.claimPending;
  if (!pending || pending.seat !== seat) return false;
  if (room.claimTimer) { clearTimeout(room.claimTimer); room.claimTimer = null; }
  room.claimDeadline = 0;

  const ld = gs.lastDiscard;

  if (opt === 'skip') {
    if (!ld) {
      // Self-draw skip → just discard phase
      room.state = { ...gs, phase: 'turn', claimPending: null, msg: `${room.names[seat]}'s turn — choose a tile to discard` };
      broadcastMjState(room);
      return true;
    }
    // Check remaining players after this seat
    const remaining = claimOrder(ld.from).filter(p => {
      // Players after `seat` in claim order
      const order = claimOrder(ld.from);
      return order.indexOf(p) > order.indexOf(seat);
    });
    for (const p of remaining) {
      const canPung = gs.hands[p].filter(t => sameKey(t, ld.tile)).length >= 2;
      const isNext = nextPlayer(ld.from) === p;
      const canChowP = isNext && checkChow(gs.hands[p], ld.tile);
      if (!canPung && !canChowP) continue;
      if (room.humanSeats.has(p)) {
        const opts: ClaimOpt[] = [];
        if (canPung) opts.push('pung');
        if (canChowP) opts.push('chow');
        opts.push('skip');
        room.state = { ...gs, phase: 'claim_window', claimPending: { seat: p, opts } };
        room.claimDeadline = Date.now() + CLAIM_SECS * 1000;
        broadcastMjState(room);
        startClaimTimer(room);
        return true;
      }
      const dec = aiDecideClaim(gs.hands[p], ld.tile, gs.melds[p].length, isNext);
      if (dec === 'pung') {
        room.state = doAIPung({ ...gs, claimPending: null }, p, ld.tile, ld.from);
        broadcastMjState(room);
        scheduleNextTurn(room);
        return true;
      }
      if (dec === 'chow') {
        room.state = doAIChow({ ...gs, claimPending: null }, p, ld.tile, ld.from);
        broadcastMjState(room);
        scheduleNextTurn(room);
        return true;
      }
    }
    // All skipped
    room.state = advanceToNextPlayer({ ...gs, current: ld.from, claimPending: null });
    broadcastMjState(room);
    scheduleNextTurn(room);
    return true;
  }

  if (opt === 'win') {
    if (!ld) {
      room.state = doWin({ ...gs, claimPending: null }, seat, true, undefined, undefined);
    } else {
      room.state = doWin({ ...gs, claimPending: null }, seat, false, ld.from, ld.tile);
    }
    broadcastMjState(room);
    return true;
  }

  if (!ld) return false;

  if (opt === 'pung') {
    const hand = gs.hands[seat];
    let cnt = 0;
    const newHand = hand.filter(t => { if (cnt < 2 && sameKey(t, ld.tile)) { cnt++; return false; } return true; });
    const pTiles = hand.filter(t => sameKey(t, ld.tile)).slice(0, 2).concat(ld.tile);
    room.state = {
      ...gs, claimPending: null, phase: 'turn', current: seat,
      hands: gs.hands.map((h, i) => i === seat ? newHand : h),
      melds: gs.melds.map((m, i) => i === seat ? [...m, { type: 'pung', tiles: pTiles, fromPlayer: ld.from }] : m),
      msg: `${room.names[seat]} pungs ${tileLabel(ld.tile)}!`,
    };
    broadcastMjState(room);
    return true;
  }

  if (opt === 'chow') {
    const pair = autoSelectChow(gs.hands[seat], ld.tile);
    if (!pair) {
      room.state = advanceToNextPlayer({ ...gs, current: ld.from, claimPending: null });
      broadcastMjState(room);
      scheduleNextTurn(room);
      return true;
    }
    const ids = new Set(pair.map(t => t.id));
    const newHand = gs.hands[seat].filter(t => !ids.has(t.id));
    const cTiles = [...pair, ld.tile].sort((a, b) => a.value - b.value);
    room.state = {
      ...gs, claimPending: null, phase: 'turn', current: seat,
      hands: gs.hands.map((h, i) => i === seat ? newHand : h),
      melds: gs.melds.map((m, i) => i === seat ? [...m, { type: 'chow', tiles: cTiles, fromPlayer: ld.from }] : m),
      msg: `${room.names[seat]} chows ${tileLabel(ld.tile)}!`,
    };
    broadcastMjState(room);
    return true;
  }

  return false;
}
