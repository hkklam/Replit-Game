import { useState, useEffect, useCallback } from 'react';
import { Link } from 'wouter';

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface Domino { id: number; high: number; low: number; }
interface PlacedTile { domino: Domino; leftVal: number; rightVal: number; }
interface Train {
  ownerId: number | null; // null = Mexican Train
  tiles: PlacedTile[];
  isPublic: boolean;
  openEnd: number;
  hasOpenDouble: boolean;
}
type Phase = 'setup' | 'playing' | 'double_pending' | 'round_over' | 'game_over';
interface GS {
  boneyard: Domino[];
  hands: Domino[][];
  trains: Train[]; // [0=You, 1=Cisco, 2=Tex, 3=Mexican Train]
  engine: number;
  current: number;
  phase: Phase;
  setupDone: boolean[];
  pendingDoubleTrainIdx: number | null;
  roundScores: number[];
  totalScores: number[];
  round: number;
  message: string;
  selectedTile: number | null;
  drawUsed: boolean;
  winner: number; // -1 = deadlock
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const PLAYER_NAMES = ['You', 'Cisco', 'Tex'];
const PLAYER_ICONS = ['🧑', '🤠', '🦅'];
const PLAYER_COLORS = ['#f0c040', '#60a5fa', '#4ade80'];

// ─── TILE BUILDING ────────────────────────────────────────────────────────────
function buildDeck(): Domino[] {
  const t: Domino[] = [];
  for (let h = 0; h <= 12; h++) for (let l = 0; l <= h; l++) t.push({ id: h * 13 + l, high: h, low: l });
  return t;
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const isDouble = (t: Domino) => t.high === t.low;
const pipCount = (t: Domino) => t.high + t.low;

function initRound(round: number, totalScores: number[]): GS {
  const engine = 12 - round;
  const all = shuffle(buildDeck());
  const eIdx = all.findIndex(t => t.high === engine && t.low === engine);
  all.splice(eIdx, 1);
  const hands: Domino[][] = [[], [], []];
  let idx = 0;
  for (let i = 0; i < 12; i++) for (let p = 0; p < 3; p++) hands[p].push(all[idx++]);
  const boneyard = all.slice(idx);
  const mkTrain = (ownerId: number | null): Train => ({
    ownerId, tiles: [], isPublic: ownerId === null, openEnd: engine, hasOpenDouble: false,
  });
  return {
    boneyard, hands, trains: [mkTrain(0), mkTrain(1), mkTrain(2), mkTrain(null)],
    engine, current: 0, phase: 'setup',
    setupDone: [false, false, false], pendingDoubleTrainIdx: null,
    roundScores: [0, 0, 0], totalScores: [...totalScores], round,
    message: `Round ${round + 1} — Engine: Double-${engine}. Start your train!`,
    selectedTile: null, drawUsed: false, winner: -1,
  };
}

// ─── GAME LOGIC ───────────────────────────────────────────────────────────────
function canFit(tile: Domino, train: Train) { return tile.high === train.openEnd || tile.low === train.openEnd; }

function validTrainIdxs(gs: GS, player: number, tile: Domino): number[] {
  const v: number[] = [];
  for (let i = 0; i < gs.trains.length; i++) {
    const tr = gs.trains[i];
    if (!canFit(tile, tr)) continue;
    if (gs.phase === 'setup') { if (i === player && !gs.setupDone[player]) v.push(i); continue; }
    if (gs.pendingDoubleTrainIdx !== null) { if (i === gs.pendingDoubleTrainIdx) v.push(i); continue; }
    if (tr.ownerId === player || tr.ownerId === null || tr.isPublic) v.push(i);
  }
  return v;
}

function finishRound(gs: GS, winner: number, newHands: Domino[][], newTrains: Train[]): GS {
  const roundScores = newHands.map(h => h.reduce((s, t) => s + pipCount(t), 0));
  const totalScores = gs.totalScores.map((s, i) => s + roundScores[i]);
  const isLast = gs.round === 12;
  return {
    ...gs, hands: newHands, trains: newTrains, roundScores, totalScores, winner,
    phase: isLast ? 'game_over' : 'round_over',
    message: winner < 0 ? 'Draw! Round ends.' : `${PLAYER_NAMES[winner]} wins Round ${gs.round + 1}! 🎉`,
    selectedTile: null,
  };
}

function markPublicAdvance(gs: GS, player: number, msg?: string): GS {
  const newTrains = gs.trains.map((t, i) => i === player ? { ...t, isPublic: true } : t);
  let newSetupDone = [...gs.setupDone];
  let newPhase = gs.phase as Phase;
  let next = gs.current;
  if (gs.phase === 'setup' && !gs.setupDone[player]) {
    newSetupDone[player] = true;
    const allDone = newSetupDone.every(Boolean);
    newPhase = allDone ? 'playing' : 'setup';
    next = allDone ? 0 : (player + 1) % 3;
  } else {
    next = (player + 1) % 3;
  }
  // Check deadlock
  if (gs.boneyard.length === 0) {
    const anyPlay = [0, 1, 2].some(p =>
      gs.hands[p].some(tile => newTrains.some((tr, i) =>
        canFit(tile, tr) && (tr.ownerId === p || tr.ownerId === null || tr.isPublic)
      ))
    );
    if (!anyPlay) return finishRound({ ...gs, trains: newTrains }, -1, gs.hands, newTrains);
  }
  return {
    ...gs, trains: newTrains, setupDone: newSetupDone, current: next,
    phase: gs.pendingDoubleTrainIdx !== null && newPhase !== 'setup' ? 'double_pending' : newPhase,
    selectedTile: null, drawUsed: false,
    message: msg || `${player === 0 ? 'Your' : PLAYER_NAMES[player] + "'s"} train is now public! 🚂`,
  };
}

function handlePlay(gs: GS, tileIdx: number, trainIdx: number): GS {
  const player = gs.current;
  const tile = gs.hands[player][tileIdx];
  const tr = gs.trains[trainIdx];
  const leftVal = tile.high === tr.openEnd ? tile.high : tile.low;
  const rightVal = leftVal === tile.high ? tile.low : tile.high;
  const dbl = isDouble(tile);
  const newTr: Train = { ...tr, tiles: [...tr.tiles, { domino: tile, leftVal, rightVal }], openEnd: rightVal, hasOpenDouble: dbl };
  const newHand = gs.hands[player].filter((_, i) => i !== tileIdx);
  let newHands = gs.hands.map((h, i) => i === player ? newHand : h);
  let newTrains = gs.trains.map((t, i) => i === trainIdx ? newTr : t);
  if (trainIdx === player && newTrains[player].isPublic)
    newTrains = newTrains.map((t, i) => i === player ? { ...t, isPublic: false } : t);
  let newSetupDone = [...gs.setupDone];
  if (gs.phase === 'setup') newSetupDone[player] = true;
  if (newHand.length === 0) return finishRound(gs, player, newHands, newTrains);
  let next = gs.current, newPhase: Phase = gs.phase, newPending = gs.pendingDoubleTrainIdx;
  if (gs.phase === 'setup') {
    const allDone = newSetupDone.every(Boolean);
    newPhase = allDone ? 'playing' : 'setup';
    next = allDone ? 0 : (player + 1) % 3;
    newPending = null;
  } else if (dbl) {
    newPending = trainIdx; newPhase = 'double_pending';
  } else {
    if (gs.pendingDoubleTrainIdx !== null) newPending = null;
    next = (player + 1) % 3;
    newPhase = 'playing';
  }
  return {
    ...gs, hands: newHands, trains: newTrains, setupDone: newSetupDone,
    current: next, phase: newPhase, pendingDoubleTrainIdx: newPending,
    selectedTile: null, drawUsed: false,
    message: dbl ? `${player === 0 ? 'You' : PLAYER_NAMES[player]} played double-${rightVal}! Must cover!`
      : `${player === 0 ? 'You' : PLAYER_NAMES[player]} played ${leftVal}|${rightVal}`,
  };
}

function handleDraw(gs: GS): GS {
  const player = gs.current;
  if (gs.drawUsed) return markPublicAdvance(gs, player, `${player === 0 ? 'You' : PLAYER_NAMES[player]} can't play — train now public!`);
  if (gs.boneyard.length === 0) return markPublicAdvance(gs, player, 'Boneyard empty — train now public!');
  const drawn = gs.boneyard[0];
  const newBoneyard = gs.boneyard.slice(1);
  const newHand = [...gs.hands[player], drawn];
  const newHands = gs.hands.map((h, i) => i === player ? newHand : h);
  const gs2 = { ...gs, boneyard: newBoneyard, hands: newHands };
  const validT = validTrainIdxs(gs2, player, drawn);
  if (validT.length === 0) return markPublicAdvance(gs2, player, `Drew ${drawn.high}|${drawn.low} but can't play — train now public!`);
  return { ...gs2, drawUsed: true, selectedTile: newHand.length - 1, message: `Drew ${drawn.high}|${drawn.low} — you must play it!` };
}

function computeAI(gs: GS): GS {
  const player = gs.current;
  const hand = gs.hands[player];
  if (gs.phase === 'setup' && !gs.setupDone[player]) {
    const starters = hand.filter(t => t.high === gs.engine || t.low === gs.engine);
    if (starters.length > 0) {
      const best = starters.reduce((a, b) => pipCount(b) > pipCount(a) ? b : a);
      return handlePlay(gs, hand.findIndex(t => t.id === best.id), player);
    }
    return handleDraw(gs);
  }
  let best: { ti: number; trainIdx: number; score: number } | null = null;
  for (let ti = 0; ti < hand.length; ti++) {
    if (gs.drawUsed && ti !== hand.length - 1) continue;
    const tile = hand[ti];
    const valids = validTrainIdxs(gs, player, tile);
    for (const trainIdx of valids) {
      let score = pipCount(tile);
      if (trainIdx === player) score += 8;
      if (trainIdx === 3) score += 3;
      if (isDouble(tile)) score -= 25;
      if (!best || score > best.score) best = { ti, trainIdx, score };
    }
  }
  if (best) return handlePlay(gs, best.ti, best.trainIdx);
  if (!gs.drawUsed) return handleDraw(gs);
  return markPublicAdvance(gs, player, `${PLAYER_NAMES[player]} can't play — train now public!`);
}

// ─── DOMINO RENDERING ─────────────────────────────────────────────────────────
const PIPS: [number, number][][] = [
  [],
  [[.5, .5]],
  [[.3, .3], [.7, .7]],
  [[.3, .3], [.5, .5], [.7, .7]],
  [[.3, .3], [.7, .3], [.3, .7], [.7, .7]],
  [[.3, .3], [.7, .3], [.5, .5], [.3, .7], [.7, .7]],
  [[.25, .2], [.75, .2], [.25, .5], [.75, .5], [.25, .8], [.75, .8]],
];

function PipHalf({ val, x, y, w, h, color = '#2d2d2d' }: { val: number; x: number; y: number; w: number; h: number; color?: string }) {
  if (val > 6) return <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="middle" fontSize={h * .72} fontWeight="bold" fill={color}>{val}</text>;
  const pips = PIPS[val] || [];
  const r = Math.min(w, h) * 0.1;
  return <>{pips.map(([px, py], i) => <circle key={i} cx={x + px * w} cy={y + py * h} r={r} fill={color} />)}</>;
}

function HandDomino({ high, low, selected, onClick, disabled }: { high: number; low: number; selected?: boolean; onClick?: () => void; disabled?: boolean }) {
  const w = 62, h = 36, hw = (w - 6) / 2, pad = 4;
  return (
    <svg width={w + 4} height={h + 4} onClick={disabled ? undefined : onClick}
      style={{ cursor: !disabled && onClick ? 'pointer' : 'default', userSelect: 'none', flexShrink: 0 }}>
      <rect x={3} y={3} width={w} height={h} rx={6} fill="rgba(0,0,0,0.4)" />
      <rect x={0} y={0} width={w} height={h} rx={6}
        fill={selected ? '#fffce0' : '#f5f0e0'}
        stroke={selected ? '#f0c040' : disabled ? '#bbb' : '#aaa'}
        strokeWidth={selected ? 2.5 : 1.5}
        opacity={disabled ? 0.5 : 1} />
      <line x1={w / 2} y1={pad + 2} x2={w / 2} y2={h - pad - 2} stroke="#ccc" strokeWidth={1} />
      <PipHalf val={high} x={pad} y={pad} w={hw - 2} h={h - pad * 2} />
      <PipHalf val={low} x={w / 2 + 2} y={pad} w={hw - 2} h={h - pad * 2} />
    </svg>
  );
}

function TinyDomino({ leftVal, rightVal, hasOpenDouble, isLast }: { leftVal: number; rightVal: number; hasOpenDouble?: boolean; isLast?: boolean }) {
  const w = 40, h = 22;
  return (
    <svg width={w} height={h} style={{ flexShrink: 0 }}>
      <rect x={0} y={0} width={w} height={h} rx={3}
        fill="#f5f0e0"
        stroke={hasOpenDouble && isLast ? '#f0c040' : '#ccc'}
        strokeWidth={hasOpenDouble && isLast ? 2 : 1} />
      <line x1={w / 2} y1={2} x2={w / 2} y2={h - 2} stroke="#ddd" strokeWidth={0.5} />
      <text x={w / 4} y={h / 2} textAnchor="middle" dominantBaseline="middle" fontSize={9} fill="#333">{leftVal}</text>
      <text x={3 * w / 4} y={h / 2} textAnchor="middle" dominantBaseline="middle" fontSize={9} fill="#333">{rightVal}</text>
    </svg>
  );
}

function HubToken({ engine }: { engine: number }) {
  return (
    <svg width={40} height={40} style={{ flexShrink: 0 }}>
      <circle cx={20} cy={20} r={19} fill="#1a1008" stroke="#f0c040" strokeWidth={2} />
      <circle cx={20} cy={20} r={14} fill="#f5f0e0" />
      <text x={20} y={20} textAnchor="middle" dominantBaseline="middle" fontSize={13} fontWeight="bold" fill="#333">{engine}|{engine}</text>
    </svg>
  );
}

// ─── TRAIN ROW ────────────────────────────────────────────────────────────────
function TrainRow({ train, trainIdx, playerName, playerIcon, playerColor, engine, isActive, canDrop, onDrop, pendingDoubleTrainIdx }: {
  train: Train; trainIdx: number; playerName: string; playerIcon: string; playerColor: string;
  engine: number; isActive: boolean; canDrop: boolean; onDrop: () => void; pendingDoubleTrainIdx: number | null;
}) {
  const isPendingDouble = pendingDoubleTrainIdx === trainIdx;
  return (
    <div onClick={canDrop ? onDrop : undefined}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px',
        background: canDrop ? 'rgba(240,192,64,0.12)' : isActive ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
        borderRadius: 10, cursor: canDrop ? 'pointer' : 'default',
        border: canDrop ? '2px solid #f0c040' : isPendingDouble ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.08)',
        transition: 'all 0.15s', overflowX: 'auto', minHeight: 52 }}>

      {/* Label */}
      <div style={{ minWidth: 70, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
        <span style={{ fontSize: 18 }}>{playerIcon}</span>
        <span style={{ fontSize: 10, color: playerColor, fontWeight: 700 }}>{playerName}</span>
        {train.isPublic && train.ownerId !== null && <span style={{ fontSize: 9, color: '#f87171' }}>🚂 PUBLIC</span>}
        {train.ownerId === null && <span style={{ fontSize: 9, color: '#4ade80' }}>OPEN</span>}
      </div>

      {/* Hub connection */}
      <div style={{ flexShrink: 0 }}>
        <HubToken engine={engine} />
      </div>

      {/* Arrow */}
      <span style={{ color: '#555', fontSize: 14, flexShrink: 0 }}>›</span>

      {/* Tiles */}
      {train.tiles.length === 0 ? (
        <div style={{ fontSize: 11, color: '#444', fontStyle: 'italic', flexShrink: 0 }}>
          {canDrop ? '← drop here' : '— empty —'}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {train.tiles.map((pt, i) => (
            <TinyDomino key={pt.domino.id} leftVal={pt.leftVal} rightVal={pt.rightVal}
              isLast={i === train.tiles.length - 1}
              hasOpenDouble={train.hasOpenDouble && i === train.tiles.length - 1} />
          ))}
        </div>
      )}

      {/* Open end badge */}
      <div style={{ marginLeft: 'auto', flexShrink: 0, minWidth: 32, height: 28,
        background: canDrop ? '#f0c040' : isPendingDouble ? '#ef4444' : '#1a1a1a',
        borderRadius: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        color: canDrop ? '#000' : isPendingDouble ? '#fff' : '#666', fontSize: 11, fontWeight: 700 }}>
        {train.hasOpenDouble && <span style={{ fontSize: 8 }}>DBL</span>}
        <span>{train.openEnd}</span>
      </div>
    </div>
  );
}

// ─── ROUND OVER MODAL ─────────────────────────────────────────────────────────
function RoundModal({ gs, onNext, onNew }: { gs: GS; onNext: () => void; onNew: () => void }) {
  const isGameOver = gs.phase === 'game_over';
  const gameWinner = isGameOver ? gs.totalScores.indexOf(Math.min(...gs.totalScores)) : -1;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#111', border: '2px solid #f0c040', borderRadius: 20, padding: '28px 36px',
        textAlign: 'center', maxWidth: 440, width: '90%' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>{isGameOver ? '🏆' : '🚂'}</div>
        <h2 style={{ color: '#f0c040', fontSize: 22, margin: '0 0 6px' }}>
          {isGameOver ? 'Game Over!' : `Round ${gs.round + 1} Complete!`}
        </h2>
        <p style={{ color: '#888', fontSize: 13, margin: '0 0 16px' }}>{gs.message}</p>
        {/* Scores */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 20 }}>
          {[0, 1, 2].map(p => (
            <div key={p} style={{ background: p === gameWinner && isGameOver ? 'rgba(240,192,64,0.15)' : 'rgba(255,255,255,0.06)',
              border: p === gameWinner && isGameOver ? '1px solid #f0c040' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, padding: 10 }}>
              <div style={{ fontSize: 20 }}>{PLAYER_ICONS[p]}</div>
              <div style={{ fontSize: 12, color: PLAYER_COLORS[p], fontWeight: 700 }}>{PLAYER_NAMES[p]}</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                Round: <strong style={{ color: '#ccc' }}>{gs.roundScores[p]}</strong>
              </div>
              <div style={{ fontSize: 13, color: gs.totalScores[p] === Math.min(...gs.totalScores) ? '#4ade80' : '#f87171', fontWeight: 700 }}>
                Total: {gs.totalScores[p]}
              </div>
            </div>
          ))}
        </div>
        {isGameOver ? (
          <>
            <p style={{ color: '#4ade80', fontSize: 14, marginBottom: 16 }}>
              🏆 {PLAYER_NAMES[gameWinner]} wins with {gs.totalScores[gameWinner]} points (lowest score)!
            </p>
            <button onClick={onNew} style={{ padding: '12px 36px', background: 'linear-gradient(135deg,#c09030,#f0c040)',
              border: 'none', borderRadius: 12, color: '#000', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>
              New Game
            </button>
          </>
        ) : (
          <button onClick={onNext} style={{ padding: '12px 32px', background: 'linear-gradient(135deg,#1a4d2a,#16a34a)',
            border: 'none', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
            Next Round →
          </button>
        )}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function TrainYard() {
  const [gs, setGs] = useState<GS>(() => initRound(0, [0, 0, 0]));

  // AI turns
  useEffect(() => {
    if (gs.current === 0) return;
    if (!['setup', 'playing', 'double_pending'].includes(gs.phase)) return;
    const t = setTimeout(() => {
      setGs(prev => {
        if (prev.current === 0) return prev;
        if (!['setup', 'playing', 'double_pending'].includes(prev.phase)) return prev;
        return computeAI(prev);
      });
    }, 700 + Math.random() * 500);
    return () => clearTimeout(t);
  }, [gs.current, gs.phase, gs.trains[0].tiles.length + gs.trains[1].tiles.length + gs.trains[2].tiles.length]);

  const onSelectTile = useCallback((idx: number) => {
    if (gs.current !== 0 || !['setup', 'playing', 'double_pending'].includes(gs.phase)) return;
    setGs(prev => ({ ...prev, selectedTile: prev.selectedTile === idx ? null : idx }));
  }, [gs.current, gs.phase]);

  const onClickTrain = useCallback((trainIdx: number) => {
    if (gs.current !== 0 || gs.selectedTile === null) return;
    const tile = gs.hands[0][gs.selectedTile];
    const valid = validTrainIdxs(gs, 0, tile);
    if (!valid.includes(trainIdx)) return;
    setGs(prev => {
      if (prev.selectedTile === null) return prev;
      return handlePlay(prev, prev.selectedTile, trainIdx);
    });
  }, [gs.current, gs.selectedTile, gs.hands, gs.phase, gs.pendingDoubleTrainIdx]);

  const onDraw = useCallback(() => {
    if (gs.current !== 0) return;
    setGs(prev => handleDraw(prev));
  }, [gs.current]);

  const onNextRound = useCallback(() => {
    setGs(prev => initRound(prev.round + 1, prev.totalScores));
  }, []);

  const onNewGame = useCallback(() => setGs(initRound(0, [0, 0, 0])), []);

  // Derived
  const selTile = gs.selectedTile !== null && gs.current === 0 ? gs.hands[0][gs.selectedTile] : null;
  const validTrains = selTile ? validTrainIdxs(gs, 0, selTile) : [];
  const isHumanTurn = gs.current === 0 && ['setup', 'playing', 'double_pending'].includes(gs.phase);
  const canDraw = isHumanTurn && !gs.drawUsed;
  const mustDraw = isHumanTurn && !gs.drawUsed && gs.hands[0].every(tile => validTrainIdxs(gs, 0, tile).length === 0);
  const hasPendingDouble = gs.pendingDoubleTrainIdx !== null;

  const trainConfigs = [
    { name: PLAYER_NAMES[1], icon: PLAYER_ICONS[1], color: PLAYER_COLORS[1] },
    { name: PLAYER_NAMES[2], icon: PLAYER_ICONS[2], color: PLAYER_COLORS[2] },
    { name: '🇲🇽 Mexican Train', icon: '🚂', color: '#4ade80' },
    { name: PLAYER_NAMES[0], icon: PLAYER_ICONS[0], color: PLAYER_COLORS[0] },
  ];
  // Display order: AI1(idx1), AI2(idx2), MexTrain(idx3), Human(idx0)
  const displayOrder = [1, 2, 3, 0];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0a1208 0%, #050d04 100%)',
      color: '#fff', display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI', sans-serif", userSelect: 'none' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(0,0,0,0.4)', flexShrink: 0 }}>
        <Link href="/"><span style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8, padding: '5px 12px', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>← Menu</span></Link>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#f0c040' }}>🚂 TrainYard</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>Mexican Train Dominoes</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          <div>Round <strong style={{ color: '#f0c040' }}>{gs.round + 1}</strong>/13</div>
          <div style={{ fontSize: 10 }}>Boneyard: {gs.boneyard.length}</div>
        </div>
      </div>

      {/* Scores bar */}
      <div style={{ display: 'flex', gap: 6, padding: '6px 12px', background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {[0, 1, 2].map(p => (
          <div key={p} style={{ flex: 1, background: gs.current === p ? 'rgba(240,192,64,0.1)' : 'rgba(255,255,255,0.04)',
            borderRadius: 8, padding: '4px 8px', textAlign: 'center',
            border: gs.current === p ? '1px solid rgba(240,192,64,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 11, color: PLAYER_COLORS[p], fontWeight: 700 }}>{PLAYER_ICONS[p]} {PLAYER_NAMES[p]}</div>
            <div style={{ fontSize: 13, color: gs.current === p ? '#f0c040' : '#ccc', fontWeight: 700 }}>{gs.totalScores[p]}<span style={{ fontSize: 9, color: '#666', marginLeft: 2 }}>pts</span></div>
          </div>
        ))}
      </div>

      {/* Message */}
      <div style={{ padding: '8px 14px', background: hasPendingDouble ? 'rgba(239,68,68,0.1)' : 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: 13, color: hasPendingDouble ? '#fca5a5' : isHumanTurn ? '#f0c040' : '#888', fontWeight: 600 }}>
          {hasPendingDouble ? `⚠️ Open double on Train ${gs.pendingDoubleTrainIdx === 3 ? '🇲🇽' : PLAYER_NAMES[gs.pendingDoubleTrainIdx ?? 0]}! Must be covered!` : gs.message}
        </div>
      </div>

      {/* Board - Trains */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 10px 6px', overflowY: 'auto' }}>
        {displayOrder.map(trainIdx => {
          const cfg = trainIdx === 0 ? trainConfigs[3] : trainIdx === 1 ? trainConfigs[0] : trainIdx === 2 ? trainConfigs[1] : trainConfigs[2];
          const canDrop = validTrains.includes(trainIdx) && gs.current === 0;
          return (
            <TrainRow key={trainIdx} train={gs.trains[trainIdx]} trainIdx={trainIdx}
              playerName={cfg.name} playerIcon={cfg.icon} playerColor={cfg.color}
              engine={gs.engine} isActive={gs.current === (gs.trains[trainIdx].ownerId ?? 0)}
              canDrop={canDrop} onDrop={() => onClickTrain(trainIdx)}
              pendingDoubleTrainIdx={gs.pendingDoubleTrainIdx} />
          );
        })}
      </div>

      {/* Action bar */}
      <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {isHumanTurn && (
          <>
            {mustDraw && <div style={{ fontSize: 12, color: '#f87171' }}>No valid plays — you must draw!</div>}
            {selTile && validTrains.length > 0 && <div style={{ fontSize: 12, color: '#a3e635' }}>✓ Click a gold-bordered train to play {selTile.high}|{selTile.low}</div>}
            {selTile && validTrains.length === 0 && <div style={{ fontSize: 12, color: '#f87171' }}>That tile has no valid train — pick another or draw.</div>}
            {!selTile && !mustDraw && <div style={{ fontSize: 12, color: '#888' }}>Select a tile from your hand to play it.</div>}
            <button onClick={onDraw} disabled={!canDraw}
              style={{ marginLeft: 'auto', padding: '8px 20px', background: mustDraw ? '#2563eb' : 'rgba(37,99,235,0.5)',
                border: '2px solid #3b82f6', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 13,
                cursor: canDraw ? 'pointer' : 'not-allowed', opacity: canDraw ? 1 : 0.5 }}>
              {gs.drawUsed ? '✓ Drew tile' : `Draw (${gs.boneyard.length})`} 🃏
            </button>
          </>
        )}
        {!isHumanTurn && ['setup', 'playing', 'double_pending'].includes(gs.phase) && (
          <div style={{ fontSize: 13, color: '#888' }}>🤔 {PLAYER_NAMES[gs.current]} is thinking...</div>
        )}
      </div>

      {/* Human Hand */}
      <div style={{ padding: '10px 12px 14px', background: 'rgba(0,0,0,0.35)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 11, color: PLAYER_COLORS[0], fontWeight: 700, marginBottom: 6 }}>
          {PLAYER_ICONS[0]} Your Hand ({gs.hands[0].length} tiles)
          {gs.phase === 'setup' && !gs.setupDone[0] && <span style={{ color: '#f59e0b', marginLeft: 8 }}>← Start your train first!</span>}
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {gs.hands[0].map((tile, i) => {
            const isDrawnTile = gs.drawUsed && i === gs.hands[0].length - 1;
            const validT = isHumanTurn ? validTrainIdxs(gs, 0, tile) : [];
            const disabled = !isHumanTurn || (gs.drawUsed && !isDrawnTile);
            return (
              <div key={tile.id} style={{ position: 'relative', transform: gs.selectedTile === i ? 'translateY(-10px)' : 'none', transition: 'transform 0.12s' }}>
                {isDrawnTile && (
                  <div style={{ position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)',
                    fontSize: 9, color: '#f0c040', whiteSpace: 'nowrap', fontWeight: 700 }}>DRAW</div>
                )}
                {validT.length > 0 && gs.selectedTile !== i && (
                  <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                    fontSize: 8, color: '#4ade80', whiteSpace: 'nowrap' }}>✓ valid</div>
                )}
                <HandDomino high={tile.high} low={tile.low}
                  selected={gs.selectedTile === i}
                  disabled={disabled}
                  onClick={() => onSelectTile(i)} />
              </div>
            );
          })}
          {gs.hands[0].length === 0 && <div style={{ color: '#555', fontSize: 13 }}>No tiles remaining</div>}
        </div>
      </div>

      {/* Modals */}
      {(gs.phase === 'round_over' || gs.phase === 'game_over') && (
        <RoundModal gs={gs} onNext={onNextRound} onNew={onNewGame} />
      )}
    </div>
  );
}
