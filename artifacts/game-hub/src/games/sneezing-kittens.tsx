import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'wouter';

// ─── TYPES ────────────────────────────────────────────────────────────────────
type CardType =
  | 'sneezing_kitten' | 'tissue_box' | 'peeky_cat' | 'shuffle_paws'
  | 'skip_nap' | 'reverse_zoomies' | 'attack_cat' | 'steal_treat'
  | 'favor_fish' | 'nope_cat'
  | 'cat_taco' | 'cat_melon' | 'cat_potato' | 'cat_beard' | 'cat_rainbow';

interface CardDef { name: string; emoji: string; bg: string; border: string; desc: string; }
const DEFS: Record<CardType, CardDef> = {
  sneezing_kitten: { name: 'Sneezing Kitten', emoji: '🤧', bg: 'linear-gradient(135deg,#7f1d1d,#dc2626)', border: '#fca5a5', desc: 'DANGER! Use a Tissue Box or be eliminated!' },
  tissue_box:      { name: 'Tissue Box',       emoji: '🧻', bg: 'linear-gradient(135deg,#14532d,#16a34a)', border: '#86efac', desc: 'Auto-saves you from a Sneezing Kitten.' },
  peeky_cat:       { name: 'Peeky Cat',         emoji: '👀', bg: 'linear-gradient(135deg,#3b0764,#7c3aed)', border: '#c4b5fd', desc: 'Look at the top 3 cards of the deck.' },
  shuffle_paws:    { name: 'Shuffle Paws',      emoji: '🔀', bg: 'linear-gradient(135deg,#1e3a5f,#2563eb)', border: '#93c5fd', desc: 'Shuffle the deck.' },
  skip_nap:        { name: 'Skip Nap',          emoji: '😴', bg: 'linear-gradient(135deg,#78350f,#d97706)', border: '#fcd34d', desc: 'End your turn without drawing.' },
  reverse_zoomies: { name: 'Reverse Zoomies',  emoji: '🔄', bg: 'linear-gradient(135deg,#134e4a,#0d9488)', border: '#5eead4', desc: 'Reverse the turn order.' },
  attack_cat:      { name: 'Attack Cat',        emoji: '😾', bg: 'linear-gradient(135deg,#450a0a,#b91c1c)', border: '#fca5a5', desc: 'End your turn. Next player takes 2 turns.' },
  steal_treat:     { name: 'Steal Treat',       emoji: '🐱', bg: 'linear-gradient(135deg,#713f12,#ca8a04)', border: '#fde047', desc: 'Steal a random card from an opponent.' },
  favor_fish:      { name: 'Favor Fish',        emoji: '🐟', bg: 'linear-gradient(135deg,#164e63,#0891b2)', border: '#67e8f9', desc: 'A chosen opponent must give you a card.' },
  nope_cat:        { name: 'Nope Cat',          emoji: '🙅', bg: 'linear-gradient(135deg,#831843,#db2777)', border: '#f9a8d4', desc: 'Cancel any action card!' },
  cat_taco:    { name: 'Tacocat',            emoji: '🌮', bg: 'linear-gradient(135deg,#1e1b4b,#7c3aed)', border: '#a5b4fc', desc: 'Basic cat. Play 2 same to steal a card!' },
  cat_melon:   { name: 'Cattermelon',        emoji: '🍉', bg: 'linear-gradient(135deg,#052e16,#16a34a)', border: '#86efac', desc: 'Basic cat. Play 2 same to steal a card!' },
  cat_potato:  { name: 'Hairy Potato Cat',   emoji: '🥔', bg: 'linear-gradient(135deg,#292524,#a16207)', border: '#fde047', desc: 'Basic cat. Play 2 same to steal a card!' },
  cat_beard:   { name: 'Bearded Cat',        emoji: '🧔', bg: 'linear-gradient(135deg,#1e293b,#475569)', border: '#cbd5e1', desc: 'Basic cat. Play 2 same to steal a card!' },
  cat_rainbow: { name: 'Rainbow Ralphing',   emoji: '🌈', bg: 'linear-gradient(135deg,#2d1b69,#9333ea)', border: '#d8b4fe', desc: 'Basic cat. Play 2 same to steal a card!' },
};

const BASIC_CATS: CardType[] = ['cat_taco', 'cat_melon', 'cat_potato', 'cat_beard', 'cat_rainbow'];
const AI_NAMES = ['Whiskers', 'Mr. Floof'];
const ALL_NAMES = ['You', ...AI_NAMES];

interface Card { id: number; type: CardType; }
type Phase = 'human_action' | 'nope_window' | 'peeky_view' | 'steal_target' | 'ai_turn' | 'won' | 'lost';

interface PendingEffect { card: Card; player: number; desc: string; effect: (gs: GS) => GS; }
interface GS {
  deck: Card[]; hands: Card[][]; discard: Card[];
  current: number; eliminated: boolean[];
  phase: Phase; direction: 1 | -1; extraTurns: number;
  peekCards: Card[]; pending: PendingEffect | null;
  winner: number | null; log: string[];
  selectedIdxs: number[]; stealFrom: number | null;
}

// ─── DECK BUILDER ─────────────────────────────────────────────────────────────
function buildDeck(): Card[] {
  let id = 0;
  const cards: Card[] = [];
  const add = (type: CardType, count: number) => {
    for (let i = 0; i < count; i++) cards.push({ id: id++, type });
  };
  add('tissue_box', 4); add('peeky_cat', 4); add('shuffle_paws', 4);
  add('skip_nap', 4); add('reverse_zoomies', 2); add('attack_cat', 2);
  add('steal_treat', 3); add('favor_fish', 3); add('nope_cat', 4);
  for (const cat of BASIC_CATS) add(cat, 4);
  return shuffle(cards);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function initGS(): GS {
  const fullDeck = buildDeck();
  const hands: Card[][] = [[], [], []];
  let idx = 0;
  for (let i = 0; i < 5; i++) for (let p = 0; p < 3; p++) hands[p].push(fullDeck[idx++]);
  let deckRem = fullDeck.slice(idx);
  // Give each player 1 Tissue Box (not from deck)
  let tbId = 900;
  for (let p = 0; p < 3; p++) hands[p].push({ id: tbId++, type: 'tissue_box' });
  // Insert 2 Sneezing Kittens into deck and reshuffle
  deckRem.push({ id: 990, type: 'sneezing_kitten' }, { id: 991, type: 'sneezing_kitten' });
  deckRem = shuffle(deckRem);
  return {
    deck: deckRem, hands, discard: [],
    current: 0, eliminated: [false, false, false],
    phase: 'human_action', direction: 1, extraTurns: 0,
    peekCards: [], pending: null, winner: null,
    log: ['Game started! 🐱 Avoid the Sneezing Kitten!'], selectedIdxs: [], stealFrom: null,
  };
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function activePlayers(gs: GS) { return gs.eliminated.map((e, i) => !e ? i : -1).filter(i => i >= 0); }

function nextPlayerIdx(gs: GS, from: number): number {
  const active = activePlayers(gs);
  if (active.length <= 1) return from;
  const idx = active.indexOf(from);
  const nextIdx = ((idx + gs.direction) + active.length) % active.length;
  return active[nextIdx];
}

function logAdd(gs: GS, msg: string): GS { return { ...gs, log: [...gs.log.slice(-8), msg] }; }

function endTurn(gs: GS, skipDraw = false): GS {
  if (gs.extraTurns > 1) {
    const phase = gs.current === 0 ? 'human_action' : 'ai_turn';
    return { ...gs, extraTurns: gs.extraTurns - 1, phase, selectedIdxs: [], pending: null };
  }
  const next = nextPlayerIdx(gs, gs.current);
  const active = activePlayers(gs);
  if (active.length <= 1) {
    const w = active[0] ?? 0;
    return { ...gs, phase: w === 0 ? 'won' : 'lost', winner: w, pending: null };
  }
  const phase: Phase = next === 0 ? 'human_action' : 'ai_turn';
  return { ...gs, current: next, extraTurns: 0, phase, selectedIdxs: [], pending: null, stealFrom: null };
}

function doDrawCard(gs: GS): GS {
  if (gs.deck.length === 0) return gs;
  const drawn = gs.deck[0];
  const newDeck = gs.deck.slice(1);
  if (drawn.type === 'sneezing_kitten') {
    const hand = gs.hands[gs.current];
    const tbIdx = hand.findIndex(c => c.type === 'tissue_box');
    const who = gs.current === 0 ? 'You' : AI_NAMES[gs.current - 1];
    if (tbIdx >= 0) {
      const newHand = hand.filter((_, i) => i !== tbIdx);
      const gs2 = logAdd({ ...gs, deck: newDeck, discard: [...gs.discard, drawn, hand[tbIdx]], hands: gs.hands.map((h, i) => i === gs.current ? newHand : h) }, `🧻 ${who} used Tissue Box and survived!`);
      return endTurn(gs2);
    } else {
      const newElim = [...gs.eliminated]; newElim[gs.current] = true;
      const gs2 = logAdd({ ...gs, deck: newDeck, discard: [...gs.discard, drawn], eliminated: newElim }, `🤧 ${who} drew a Sneezing Kitten and is ELIMINATED!`);
      const active = activePlayers(gs2);
      if (active.length <= 1) {
        const w = active[0] ?? 0;
        return { ...gs2, phase: w === 0 ? 'won' : 'lost', winner: w };
      }
      return endTurn(gs2);
    }
  }
  const who = gs.current === 0 ? 'You' : AI_NAMES[gs.current - 1];
  const newHand = [...gs.hands[gs.current], drawn];
  const gs2 = logAdd({ ...gs, deck: newDeck, hands: gs.hands.map((h, i) => i === gs.current ? newHand : h) },
    gs.current === 0 ? `You drew ${DEFS[drawn.type].name} ${DEFS[drawn.type].emoji}` : `${who} drew a card 🃏`);
  return endTurn(gs2);
}

function applyCardEffect(gs: GS, card: Card, player: number): GS {
  const who = player === 0 ? 'You' : AI_NAMES[player - 1];
  const newDiscard = [...gs.discard, card];
  const base = { ...gs, discard: newDiscard };
  switch (card.type) {
    case 'skip_nap':
      return endTurn(logAdd(base, `${who} used Skip Nap — no draw! 😴`), true);
    case 'shuffle_paws':
      return logAdd({ ...base, deck: shuffle(base.deck), hands: base.hands, current: base.current, phase: base.phase },
        `${who} shuffled the deck! 🔀`);
    case 'peeky_cat':
      if (player === 0) {
        return { ...base, phase: 'peeky_view', peekCards: base.deck.slice(0, 3) };
      }
      return logAdd(base, `${who} peeked at the top 3 cards! 👀`);
    case 'reverse_zoomies':
      return logAdd({ ...base, direction: (-base.direction) as 1 | -1 }, `${who} reversed the turn order! 🔄`);
    case 'attack_cat': {
      const next = nextPlayerIdx(base, player);
      const nextPhase: Phase = next === 0 ? 'human_action' : 'ai_turn';
      return logAdd({ ...base, current: next, extraTurns: 2, phase: nextPhase, selectedIdxs: [] },
        `${who} played Attack Cat! 😾 ${ALL_NAMES[next]} takes 2 turns!`);
    }
    case 'steal_treat': {
      if (player !== 0) {
        const targets = activePlayers(gs).filter(p => p !== player && gs.hands[p].length > 0);
        if (targets.length === 0) return base;
        const target = targets[Math.floor(Math.random() * targets.length)];
        const stealIdx = Math.floor(Math.random() * gs.hands[target].length);
        const stolen = gs.hands[target][stealIdx];
        const newHands = gs.hands.map((h, i) => {
          if (i === target) return h.filter((_, j) => j !== stealIdx);
          if (i === player) return [...h, stolen];
          return h;
        });
        return logAdd({ ...base, hands: newHands }, `${who} stole a card from ${ALL_NAMES[target]}! 🐱`);
      }
      return { ...base, phase: 'steal_target' };
    }
    case 'favor_fish': {
      if (player !== 0) {
        const targets = activePlayers(gs).filter(p => p !== player && gs.hands[p].length > 0);
        if (targets.length === 0) return base;
        const target = targets[Math.floor(Math.random() * targets.length)];
        const giveIdx = Math.floor(Math.random() * gs.hands[target].length);
        const given = gs.hands[target][giveIdx];
        const newHands = gs.hands.map((h, i) => {
          if (i === target) return h.filter((_, j) => j !== giveIdx);
          if (i === player) return [...h, given];
          return h;
        });
        return logAdd({ ...base, hands: newHands }, `${who} asked for a favor — got a card from ${ALL_NAMES[target]}! 🐟`);
      }
      return { ...base, phase: 'steal_target' };
    }
    default: return base;
  }
}

// ─── AI LOGIC ─────────────────────────────────────────────────────────────────
function aiChooseAction(gs: GS, p: number): GS {
  const hand = gs.hands[p];
  const dangerZone = gs.deck.length <= 6;
  const skipIdx = hand.findIndex(c => c.type === 'skip_nap');
  const shuffleIdx = hand.findIndex(c => c.type === 'shuffle_paws');
  const attackIdx = hand.findIndex(c => c.type === 'attack_cat');
  const peekIdx = hand.findIndex(c => c.type === 'peeky_cat');
  const stealIdx = hand.findIndex(c => c.type === 'steal_treat');
  const favorIdx = hand.findIndex(c => c.type === 'favor_fish');

  // Check for matching cat pair to steal
  const catCounts = new Map<CardType, number[]>();
  hand.forEach((c, i) => { if (BASIC_CATS.includes(c.type)) { if (!catCounts.has(c.type)) catCounts.set(c.type, []); catCounts.get(c.type)!.push(i); } });
  const pairType = [...catCounts.entries()].find(([, idxs]) => idxs.length >= 2);

  // Remove card from hand helper
  const removeFromHand = (gs2: GS, pi: number, cardIdx: number) => {
    const card = gs2.hands[pi][cardIdx];
    const newHand = gs2.hands[pi].filter((_, i) => i !== cardIdx);
    return { gs2: { ...gs2, hands: gs2.hands.map((h, i) => i === pi ? newHand : h), discard: [...gs2.discard, card] }, card };
  };

  if (dangerZone) {
    if (skipIdx >= 0) {
      const { gs2, card } = removeFromHand(gs, p, skipIdx);
      return applyCardEffect(gs2, card, p);
    }
    if (shuffleIdx >= 0) {
      const { gs2, card } = removeFromHand(gs, p, shuffleIdx);
      return applyCardEffect(gs2, card, p);
    }
    if (attackIdx >= 0) {
      const { gs2, card } = removeFromHand(gs, p, attackIdx);
      return applyCardEffect(gs2, card, p);
    }
  }

  const actionPool: number[] = [];
  if (peekIdx >= 0) actionPool.push(peekIdx);
  if (stealIdx >= 0 && activePlayers(gs).some(ap => ap !== p && gs.hands[ap].length > 0)) actionPool.push(stealIdx);
  if (favorIdx >= 0) actionPool.push(favorIdx);
  if (pairType && actionPool.length === 0) {
    // Play a pair of basic cats to steal
    const [type, catIdxs] = pairType;
    const hand2 = gs.hands[p].filter((_, i) => i !== catIdxs[0] && i !== catIdxs[1]);
    const targets = activePlayers(gs).filter(ap => ap !== p && gs.hands[ap].length > 0);
    if (targets.length > 0) {
      const target = targets[Math.floor(Math.random() * targets.length)];
      const stealIdxT = Math.floor(Math.random() * gs.hands[target].length);
      const stolen = gs.hands[target][stealIdxT];
      const newHands = gs.hands.map((h, i) => {
        if (i === p) return [...hand2, stolen];
        if (i === target) return h.filter((_, j) => j !== stealIdxT);
        return h;
      });
      const cats = gs.hands[p].slice(catIdxs[0], catIdxs[0] + 1).concat(gs.hands[p].slice(catIdxs[1], catIdxs[1] + 1));
      return logAdd({ ...gs, hands: newHands, discard: [...gs.discard, ...cats] },
        `${AI_NAMES[p - 1]} played a pair & stole from ${ALL_NAMES[target]}! 🐱`);
    }
  }

  if (actionPool.length > 0 && Math.random() < 0.55) {
    const pick = actionPool[Math.floor(Math.random() * actionPool.length)];
    const { gs2, card } = removeFromHand(gs, p, pick);
    return applyCardEffect(gs2, card, p);
  }

  // Draw
  return doDrawCard(gs);
}

// ─── CARD COMPONENT ───────────────────────────────────────────────────────────
function CardView({ card, selected, onClick, disabled, small = false, faceDown = false }: {
  card?: Card; selected?: boolean; onClick?: () => void; disabled?: boolean; small?: boolean; faceDown?: boolean;
}) {
  const w = small ? 52 : 72, h = small ? 74 : 100;
  if (faceDown || !card) {
    return (
      <div style={{ width: w, height: h, borderRadius: 8, flexShrink: 0,
        background: 'linear-gradient(135deg,#1e3a5f,#1e293b)',
        border: '2px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: small ? 18 : 26 }}>🐾</span>
      </div>
    );
  }
  const def = DEFS[card.type];
  return (
    <div onClick={disabled ? undefined : onClick}
      title={def.desc}
      style={{ width: w, height: h, borderRadius: 8, flexShrink: 0,
        background: def.bg, border: `2px solid ${selected ? '#fff' : def.border}`,
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
        transform: selected ? 'translateY(-10px)' : 'none',
        transition: 'transform 0.12s, box-shadow 0.12s',
        boxShadow: selected ? `0 8px 20px rgba(255,255,255,0.25)` : '0 2px 6px rgba(0,0,0,0.4)',
        padding: 4, userSelect: 'none' }}>
      <div style={{ fontSize: small ? 22 : 30 }}>{def.emoji}</div>
      <div style={{ fontSize: small ? 7 : 9, color: '#fff', textAlign: 'center', fontWeight: 700,
        textShadow: '0 1px 3px rgba(0,0,0,0.8)', lineHeight: 1.2, padding: '0 2px' }}>{def.name}</div>
    </div>
  );
}

// ─── MODALS ───────────────────────────────────────────────────────────────────
function PeekyModal({ cards, onClose }: { cards: Card[]; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#1e1b4b', border: '2px solid #7c3aed', borderRadius: 16,
        padding: 24, textAlign: 'center', maxWidth: 380 }}>
        <div style={{ fontSize: 32 }}>👀</div>
        <h3 style={{ color: '#c4b5fd', margin: '8px 0' }}>Peeky Cat — Top 3 Cards</h3>
        <p style={{ color: '#a78bfa', fontSize: 12, margin: '0 0 16px' }}>Top card is drawn first</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {cards.length === 0 ? <p style={{ color: '#888' }}>Deck is empty!</p> :
            cards.map((c, i) => (
              <div key={c.id} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>#{i + 1}</div>
                <CardView card={c} />
              </div>
            ))}
        </div>
        <button onClick={onClose} style={{ marginTop: 20, padding: '10px 28px', background: '#7c3aed',
          border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          Got it!
        </button>
      </div>
    </div>
  );
}

function StealModal({ gs, onSteal, onCancel, label }: {
  gs: GS; onSteal: (target: number) => void; onCancel: () => void; label: string;
}) {
  const targets = activePlayers(gs).filter(p => p !== 0 && gs.hands[p].length > 0);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#1c1917', border: '2px solid #ca8a04', borderRadius: 16,
        padding: 24, textAlign: 'center', maxWidth: 360 }}>
        <div style={{ fontSize: 32 }}>🐱</div>
        <h3 style={{ color: '#fde047', margin: '8px 0' }}>{label}</h3>
        <p style={{ color: '#a3a3a3', fontSize: 13, marginBottom: 16 }}>Choose an opponent:</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {targets.map(t => (
            <button key={t} onClick={() => onSteal(t)} style={{
              padding: '12px 20px', background: 'linear-gradient(135deg,#713f12,#ca8a04)',
              border: '2px solid #fde047', borderRadius: 10, color: '#fff', fontWeight: 700,
              cursor: 'pointer', fontSize: 14 }}>
              {AI_NAMES[t - 1]}<br /><span style={{ fontSize: 11, opacity: 0.8 }}>{gs.hands[t].length} cards</span>
            </button>
          ))}
        </div>
        <button onClick={onCancel} style={{ marginTop: 14, padding: '8px 20px', background: 'transparent',
          border: '1px solid #555', borderRadius: 8, color: '#888', cursor: 'pointer', fontSize: 13 }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function WinLossModal({ gs, onNew }: { gs: GS; onNew: () => void }) {
  const won = gs.phase === 'won';
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 300, backdropFilter: 'blur(6px)' }}>
      <div style={{ background: won ? '#052e16' : '#450a0a', border: `2px solid ${won ? '#16a34a' : '#dc2626'}`,
        borderRadius: 20, padding: '32px 40px', textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 64, marginBottom: 8 }}>{won ? '🏆' : '🤧'}</div>
        <h2 style={{ color: won ? '#4ade80' : '#f87171', fontSize: 28, margin: '0 0 8px', fontWeight: 900 }}>
          {won ? 'You Win!' : 'You Sneezed!'}
        </h2>
        <p style={{ color: '#888', marginBottom: 20 }}>
          {won ? '🎉 All kittens eliminated — you survived!' : `😿 ${gs.winner !== null ? AI_NAMES[gs.winner - 1] : 'An AI'} wins this round!`}
        </p>
        <button onClick={onNew} style={{ padding: '12px 36px', background: won ? '#16a34a' : '#dc2626',
          border: 'none', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer',
          boxShadow: `0 4px 16px ${won ? 'rgba(22,163,74,0.5)' : 'rgba(220,38,38,0.5)'}` }}>
          Play Again
        </button>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function SneezingKittens() {
  const [gs, setGs] = useState<GS>(initGS);
  const [nopeTimer, setNopeTimer] = useState(0);
  const nopeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [pendingEffect, setPendingEffect] = useState<null | { fn: (g: GS) => GS; label: string }>(null);
  const [catPairSelected, setCatPairSelected] = useState<number[]>([]); // indices of selected cat pair in human hand

  const startNewGame = useCallback(() => {
    if (nopeRef.current) { clearInterval(nopeRef.current); nopeRef.current = null; }
    setPendingEffect(null);
    setCatPairSelected([]);
    setGs(initGS());
  }, []);

  // AI turn effect
  useEffect(() => {
    if (gs.phase !== 'ai_turn' || gs.eliminated[gs.current]) return;
    const t = setTimeout(() => {
      setGs(prev => {
        if (prev.phase !== 'ai_turn') return prev;
        return aiChooseAction(prev, prev.current);
      });
    }, 900 + Math.random() * 600);
    return () => clearTimeout(t);
  }, [gs.phase, gs.current, gs.discard.length]);

  // Nope window timer
  useEffect(() => {
    if (gs.phase !== 'nope_window') {
      if (nopeRef.current) { clearInterval(nopeRef.current); nopeRef.current = null; }
      return;
    }
    setNopeTimer(3);
    nopeRef.current = setInterval(() => {
      setNopeTimer(p => {
        if (p <= 1) {
          clearInterval(nopeRef.current!); nopeRef.current = null;
          // resolve pending
          setGs(g => {
            if (!pendingEffect) return { ...g, phase: 'ai_turn' };
            return pendingEffect.fn(g);
          });
          setPendingEffect(null);
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => { if (nopeRef.current) { clearInterval(nopeRef.current); nopeRef.current = null; } };
  }, [gs.phase]);

  // Human actions
  const onSelectCard = useCallback((idx: number) => {
    if (gs.phase !== 'human_action') return;
    const card = gs.hands[0][idx];
    setGs(prev => {
      if (prev.phase !== 'human_action') return prev;
      const sel = prev.selectedIdxs;
      if (sel.includes(idx)) return { ...prev, selectedIdxs: sel.filter(i => i !== idx) };
      return { ...prev, selectedIdxs: [...sel, idx] };
    });
  }, [gs.phase]);

  const onPlaySelected = useCallback(() => {
    setGs(prev => {
      if (prev.phase !== 'human_action' || prev.selectedIdxs.length === 0) return prev;
      const sel = prev.selectedIdxs;
      const selCards = sel.map(i => prev.hands[0][i]);

      // Single card play
      if (sel.length === 1) {
        const card = selCards[0];
        if (['sneezing_kitten', 'tissue_box'].includes(card.type)) return prev;
        const newHand = prev.hands[0].filter((_, i) => !sel.includes(i));
        const gs2 = { ...prev, hands: prev.hands.map((h, i) => i === 0 ? newHand : h), selectedIdxs: [] };
        return applyCardEffect({ ...gs2, discard: [...gs2.discard, card] }, card, 0);
      }

      // Pair of basic cats → steal
      if (sel.length === 2 && selCards.every(c => BASIC_CATS.includes(c.type)) && selCards[0].type === selCards[1].type) {
        const newHand = prev.hands[0].filter((_, i) => !sel.includes(i));
        const gs2 = { ...prev, hands: prev.hands.map((h, i) => i === 0 ? newHand : h),
          discard: [...prev.discard, ...selCards], selectedIdxs: [], phase: 'steal_target' as Phase };
        return gs2;
      }
      return prev;
    });
  }, []);

  const onDraw = useCallback(() => {
    setGs(prev => {
      if (prev.phase !== 'human_action') return prev;
      return doDrawCard({ ...prev, selectedIdxs: [] });
    });
  }, []);

  const onSteal = useCallback((target: number) => {
    setGs(prev => {
      if (prev.hands[target].length === 0) return { ...prev, phase: 'human_action' };
      const stealIdx = Math.floor(Math.random() * prev.hands[target].length);
      const stolen = prev.hands[target][stealIdx];
      const newHands = prev.hands.map((h, i) => {
        if (i === 0) return [...h, stolen];
        if (i === target) return h.filter((_, j) => j !== stealIdx);
        return h;
      });
      return logAdd({ ...prev, hands: newHands, phase: 'human_action' },
        `You stole ${DEFS[stolen.type].name} from ${AI_NAMES[target - 1]}! ${DEFS[stolen.type].emoji}`);
    });
  }, []);

  const onCancelSteal = useCallback(() => {
    setGs(prev => ({ ...prev, phase: 'human_action', selectedIdxs: [] }));
  }, []);

  const onClosePeeky = useCallback(() => {
    setGs(prev => ({ ...prev, phase: 'human_action', peekCards: [] }));
  }, []);

  // Derived state
  const humanHand = gs.hands[0];
  const sel = gs.selectedIdxs;
  const canPlay = sel.length === 1 && !['sneezing_kitten', 'tissue_box'].includes(humanHand[sel[0]]?.type || 'tissue_box')
    || (sel.length === 2 && sel.map(i => humanHand[i]).every(c => BASIC_CATS.includes(c.type)) && humanHand[sel[0]]?.type === humanHand[sel[1]]?.type);
  const isHumanTurn = gs.phase === 'human_action';
  const isAITurn = gs.phase === 'ai_turn' || gs.phase === 'nope_window';

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 50% 0%, #1c0533 0%, #0c0a1a 60%, #050510 100%)',
      color: '#fff', display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI', sans-serif", userSelect: 'none' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(0,0,0,0.4)', flexShrink: 0 }}>
        <Link href="/"><span style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8, padding: '5px 12px', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>← Menu</span></Link>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: '#f472b6', letterSpacing: 1 }}>🤧 Sneezing Kittens</span>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>Avoid the Sneezing Kitten!</div>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'right' }}>
          <div>Deck: <strong style={{ color: gs.deck.length < 8 ? '#f87171' : '#4ade80' }}>{gs.deck.length}</strong></div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 8, gap: 6, overflowY: 'auto' }}>

        {/* AI Players */}
        {[1, 2].map(p => {
          const name = AI_NAMES[p - 1];
          const elim = gs.eliminated[p];
          const isActive = gs.current === p;
          return (
            <div key={p} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10,
              padding: '8px 12px', border: isActive ? '1px solid rgba(244,114,182,0.4)' : '1px solid rgba(255,255,255,0.07)',
              opacity: elim ? 0.35 : 1, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ minWidth: 80 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: isActive ? '#f472b6' : '#888' }}>{name}</div>
                <div style={{ fontSize: 10, color: '#666' }}>
                  {elim ? '💀 Eliminated' : isActive ? (isAITurn ? '🤔 Thinking...' : 'Waiting') : 'Waiting'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {elim ? (
                  <span style={{ fontSize: 24 }}>💀</span>
                ) : (
                  Array.from({ length: gs.hands[p].length }).map((_, i) => (
                    <CardView key={i} faceDown small />
                  ))
                )}
              </div>
            </div>
          );
        })}

        {/* Center: deck + discard + log */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
          {/* Deck + Discard */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'rgba(255,255,255,0.04)',
            borderRadius: 10, padding: '10px 14px', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>DECK ({gs.deck.length})</div>
              <div style={{ position: 'relative', cursor: isHumanTurn ? 'pointer' : 'default' }}
                onClick={isHumanTurn ? onDraw : undefined}>
                <CardView faceDown />
                {isHumanTurn && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.5)', borderRadius: 8, fontSize: 24 }}>➕</div>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>DISCARD</div>
              {gs.discard.length > 0 ? <CardView card={gs.discard[gs.discard.length - 1]} /> : (
                <div style={{ width: 72, height: 100, borderRadius: 8, border: '2px dashed #333',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: 12 }}>Empty</div>
              )}
            </div>
          </div>

          {/* Game Log */}
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.07)', padding: 10, overflowY: 'auto', maxHeight: 220 }}>
            <div style={{ fontSize: 10, color: '#666', marginBottom: 6, letterSpacing: 1 }}>GAME LOG</div>
            {gs.log.map((entry, i) => (
              <div key={i} style={{ fontSize: 12, color: i === gs.log.length - 1 ? '#e2e8f0' : '#64748b',
                padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {entry}
              </div>
            ))}
          </div>
        </div>

        {/* Turn status + action buttons */}
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px',
          border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            {isHumanTurn && <div style={{ color: '#f472b6', fontWeight: 700, fontSize: 14 }}>⭐ Your turn — play a card or draw</div>}
            {isAITurn && !gs.eliminated[gs.current] && (
              <div style={{ color: '#888', fontSize: 14 }}>
                {gs.phase === 'nope_window'
                  ? <span style={{ color: '#f59e0b', fontWeight: 700 }}>⏳ {nopeTimer}s — Play Nope Cat to cancel!</span>
                  : <span>🤔 {AI_NAMES[gs.current - 1]} is thinking...</span>}
              </div>
            )}
            {gs.extraTurns > 1 && (
              <div style={{ fontSize: 11, color: '#f87171', marginTop: 2 }}>
                {gs.extraTurns - 1} extra turn(s) remaining {gs.current === 0 ? 'for you' : `for ${AI_NAMES[gs.current - 1]}`}
              </div>
            )}
          </div>
          {isHumanTurn && (
            <button onClick={onDraw} style={{ padding: '10px 20px', background: 'linear-gradient(135deg,#1e3a5f,#2563eb)',
              border: '2px solid #3b82f6', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37,99,235,0.4)' }}>
              Draw Card 🃏
            </button>
          )}
          {isHumanTurn && canPlay && (
            <button onClick={onPlaySelected} style={{ padding: '10px 20px',
              background: 'linear-gradient(135deg,#831843,#db2777)',
              border: '2px solid #f472b6', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(219,39,119,0.4)' }}>
              Play Card ▶
            </button>
          )}
          {gs.phase === 'nope_window' && humanHand.some(c => c.type === 'nope_cat') && (
            <button onClick={() => {
              if (nopeRef.current) { clearInterval(nopeRef.current); nopeRef.current = null; }
              setGs(prev => {
                const nopIdx = prev.hands[0].findIndex(c => c.type === 'nope_cat');
                if (nopIdx < 0) return prev;
                const card = prev.hands[0][nopIdx];
                const newHand = prev.hands[0].filter((_, i) => i !== nopIdx);
                const gs2 = logAdd({ ...prev, hands: prev.hands.map((h, i) => i === 0 ? newHand : h),
                  discard: [...prev.discard, card], phase: 'ai_turn' }, '🙅 You played Nope Cat! Effect cancelled!');
                setPendingEffect(null);
                return gs2;
              });
            }} style={{ padding: '10px 20px', background: 'linear-gradient(135deg,#831843,#db2777)',
              border: '2px solid #f9a8d4', borderRadius: 10, color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer',
              animation: 'pulse 0.8s infinite', boxShadow: '0 4px 16px rgba(219,39,119,0.6)' }}>
              🙅 Nope! ({nopeTimer}s)
            </button>
          )}
        </div>

        {/* Human hand */}
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px',
          border: isHumanTurn ? '1px solid rgba(244,114,182,0.35)' : '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: '#f472b6', fontWeight: 700 }}>
              Your Hand ({humanHand.length} cards)
            </div>
            {sel.length > 0 && (
              <div style={{ fontSize: 11, color: '#888' }}>
                {sel.length === 1 ? `${DEFS[humanHand[sel[0]]?.type]?.name} selected` : `${sel.length} cards selected`}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
            {humanHand.map((card, i) => (
              <CardView key={card.id} card={card}
                selected={sel.includes(i)}
                onClick={() => onSelectCard(i)}
                disabled={!isHumanTurn || ['sneezing_kitten', 'tissue_box'].includes(card.type)} />
            ))}
            {humanHand.length === 0 && (
              <div style={{ color: '#555', fontSize: 13, padding: 16 }}>No cards in hand</div>
            )}
          </div>
          {isHumanTurn && (
            <div style={{ marginTop: 6, fontSize: 10, color: '#4b5563', textAlign: 'center' }}>
              Tap a card to select • Tap again to deselect • Select 2 matching basic cats to steal
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {gs.phase === 'peeky_view' && <PeekyModal cards={gs.peekCards} onClose={onClosePeeky} />}
      {gs.phase === 'steal_target' && <StealModal gs={gs} onSteal={onSteal} onCancel={onCancelSteal}
        label={humanHand.length > 0 && BASIC_CATS.includes(humanHand[0]?.type) ? 'Cat Pair — Steal from:' : 'Steal Treat — Take from:'} />}
      {(gs.phase === 'won' || gs.phase === 'lost') && <WinLossModal gs={gs} onNew={startNewGame} />}
    </div>
  );
}
