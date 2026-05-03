import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'wouter';
import { useSkOnline, type SkCard, type SkCardType, type SkPlayerView, type SkLobbyPlayer } from '../lib/sk-online';

// ─── CARD DEFINITIONS ─────────────────────────────────────────────────────────
interface CardDef { name: string; emoji: string; bg: string; border: string; desc: string; }
const DEFS: Record<SkCardType, CardDef> = {
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
const BASIC_CATS: SkCardType[] = ['cat_taco', 'cat_melon', 'cat_potato', 'cat_beard', 'cat_rainbow'];

// ─── SHARED CARD COMPONENT ────────────────────────────────────────────────────
function CardView({ card, selected, onClick, disabled, small = false, faceDown = false }: {
  card?: SkCard; selected?: boolean; onClick?: () => void; disabled?: boolean; small?: boolean; faceDown?: boolean;
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
    <div onClick={disabled ? undefined : onClick} title={def.desc}
      style={{ width: w, height: h, borderRadius: 8, flexShrink: 0, background: def.bg,
        border: `2px solid ${selected ? '#fff' : def.border}`,
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
        transform: selected ? 'translateY(-10px)' : 'none',
        transition: 'transform 0.12s, box-shadow 0.12s',
        boxShadow: selected ? '0 8px 20px rgba(255,255,255,0.25)' : '0 2px 6px rgba(0,0,0,0.4)',
        padding: 4, userSelect: 'none' }}>
      <div style={{ fontSize: small ? 22 : 30 }}>{def.emoji}</div>
      <div style={{ fontSize: small ? 7 : 9, color: '#fff', textAlign: 'center', fontWeight: 700,
        textShadow: '0 1px 3px rgba(0,0,0,0.8)', lineHeight: 1.2, padding: '0 2px' }}>{def.name}</div>
    </div>
  );
}

// ─── SOLO GAME TYPES ──────────────────────────────────────────────────────────
type SoloPhase = 'human_action' | 'nope_window' | 'peeky_view' | 'steal_target' | 'ai_turn' | 'won' | 'lost';
const AI_NAMES_SOLO = ['Whiskers', 'Mr. Floof'];
const ALL_NAMES_SOLO = ['You', ...AI_NAMES_SOLO];
interface SoloPendingEffect { fn: (g: SoloGS) => SoloGS; }
interface SoloGS {
  deck: SkCard[]; hands: SkCard[][]; discard: SkCard[];
  current: number; eliminated: boolean[];
  phase: SoloPhase; direction: 1 | -1; extraTurns: number;
  peekCards: SkCard[]; pending: SoloPendingEffect | null;
  winner: number | null; log: string[];
  selectedIdxs: number[]; stealFrom: number | null;
}

function buildSoloDeck(): SkCard[] {
  let id = 0;
  const cards: SkCard[] = [];
  const add = (type: SkCardType, count: number) => { for (let i = 0; i < count; i++) cards.push({ id: id++, type }); };
  add('tissue_box', 4); add('peeky_cat', 4); add('shuffle_paws', 4);
  add('skip_nap', 4); add('reverse_zoomies', 2); add('attack_cat', 2);
  add('steal_treat', 3); add('favor_fish', 3); add('nope_cat', 4);
  for (const cat of BASIC_CATS) add(cat, 4);
  return shuffleArr(cards);
}

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function initSoloGS(): SoloGS {
  const fullDeck = buildSoloDeck();
  const hands: SkCard[][] = [[], [], []];
  let idx = 0;
  for (let i = 0; i < 5; i++) for (let p = 0; p < 3; p++) hands[p].push(fullDeck[idx++]);
  let deckRem = fullDeck.slice(idx);
  let tbId = 900;
  for (let p = 0; p < 3; p++) hands[p].push({ id: tbId++, type: 'tissue_box' });
  deckRem.push({ id: 990, type: 'sneezing_kitten' }, { id: 991, type: 'sneezing_kitten' });
  deckRem = shuffleArr(deckRem);
  return {
    deck: deckRem, hands, discard: [], current: 0, eliminated: [false, false, false],
    phase: 'human_action', direction: 1, extraTurns: 0,
    peekCards: [], pending: null, winner: null,
    log: ['Game started! 🐱 Avoid the Sneezing Kitten!'], selectedIdxs: [], stealFrom: null,
  };
}

function soloActivePlayers(gs: SoloGS) { return gs.eliminated.map((e, i) => !e ? i : -1).filter(i => i >= 0); }
function soloNextPlayer(gs: SoloGS, from: number): number {
  const active = soloActivePlayers(gs);
  if (active.length <= 1) return from;
  const idx = active.indexOf(from);
  return active[((idx + gs.direction) + active.length) % active.length];
}
function soloLogAdd(gs: SoloGS, msg: string): SoloGS { return { ...gs, log: [...gs.log.slice(-8), msg] }; }
function soloEndTurn(gs: SoloGS): SoloGS {
  if (gs.extraTurns > 1) {
    return { ...gs, extraTurns: gs.extraTurns - 1, phase: gs.current === 0 ? 'human_action' : 'ai_turn', selectedIdxs: [], pending: null };
  }
  const next = soloNextPlayer(gs, gs.current);
  const active = soloActivePlayers(gs);
  if (active.length <= 1) { const w = active[0] ?? 0; return { ...gs, phase: w === 0 ? 'won' : 'lost', winner: w, pending: null }; }
  return { ...gs, current: next, extraTurns: 0, phase: next === 0 ? 'human_action' : 'ai_turn', selectedIdxs: [], pending: null, stealFrom: null };
}
function soloDoDrawCard(gs: SoloGS): SoloGS {
  if (gs.deck.length === 0) return gs;
  const drawn = gs.deck[0]; const newDeck = gs.deck.slice(1);
  if (drawn.type === 'sneezing_kitten') {
    const hand = gs.hands[gs.current]; const tbIdx = hand.findIndex(c => c.type === 'tissue_box');
    const who = gs.current === 0 ? 'You' : AI_NAMES_SOLO[gs.current - 1];
    if (tbIdx >= 0) {
      const newHand = hand.filter((_, i) => i !== tbIdx);
      return soloEndTurn(soloLogAdd({ ...gs, deck: newDeck, discard: [...gs.discard, drawn, hand[tbIdx]], hands: gs.hands.map((h, i) => i === gs.current ? newHand : h) }, `🧻 ${who} used Tissue Box and survived!`));
    }
    const newElim = [...gs.eliminated]; newElim[gs.current] = true;
    const gs2 = soloLogAdd({ ...gs, deck: newDeck, discard: [...gs.discard, drawn], eliminated: newElim }, `🤧 ${who} drew a Sneezing Kitten and is ELIMINATED!`);
    const active = soloActivePlayers(gs2);
    if (active.length <= 1) { const w = active[0] ?? 0; return { ...gs2, phase: w === 0 ? 'won' : 'lost', winner: w }; }
    return soloEndTurn(gs2);
  }
  const who = gs.current === 0 ? 'You' : AI_NAMES_SOLO[gs.current - 1];
  return soloEndTurn(soloLogAdd({ ...gs, deck: newDeck, hands: gs.hands.map((h, i) => i === gs.current ? [...h, drawn] : h) },
    gs.current === 0 ? `You drew ${DEFS[drawn.type].name} ${DEFS[drawn.type].emoji}` : `${who} drew a card 🃏`));
}
function soloApplyCard(gs: SoloGS, card: SkCard, player: number): SoloGS {
  const who = player === 0 ? 'You' : AI_NAMES_SOLO[player - 1];
  const newDiscard = [...gs.discard, card];
  const base = { ...gs, discard: newDiscard };
  switch (card.type) {
    case 'skip_nap': return soloEndTurn(soloLogAdd(base, `${who} used Skip Nap — no draw! 😴`));
    case 'shuffle_paws': return soloLogAdd({ ...base, deck: shuffleArr(base.deck) }, `${who} shuffled the deck! 🔀`);
    case 'peeky_cat':
      if (player === 0) return { ...base, phase: 'peeky_view', peekCards: base.deck.slice(0, 3) };
      return soloLogAdd(base, `${who} peeked at the top 3 cards! 👀`);
    case 'reverse_zoomies': return soloLogAdd({ ...base, direction: (-base.direction) as 1 | -1 }, `${who} reversed the turn order! 🔄`);
    case 'attack_cat': { const next = soloNextPlayer(base, player); return soloLogAdd({ ...base, current: next, extraTurns: 2, phase: next === 0 ? 'human_action' : 'ai_turn', selectedIdxs: [] }, `${who} played Attack Cat! 😾 ${ALL_NAMES_SOLO[next]} takes 2 turns!`); }
    case 'steal_treat': {
      if (player !== 0) {
        const targets = soloActivePlayers(gs).filter(p => p !== player && gs.hands[p].length > 0);
        if (targets.length === 0) return base;
        const target = targets[Math.floor(Math.random() * targets.length)];
        const si = Math.floor(Math.random() * gs.hands[target].length); const stolen = gs.hands[target][si];
        return soloLogAdd({ ...base, hands: gs.hands.map((h, i) => i === target ? h.filter((_, j) => j !== si) : i === player ? [...h, stolen] : h) }, `${who} stole from ${ALL_NAMES_SOLO[target]}! 🐱`);
      }
      return { ...base, phase: 'steal_target' };
    }
    case 'favor_fish': {
      if (player !== 0) {
        const targets = soloActivePlayers(gs).filter(p => p !== player && gs.hands[p].length > 0);
        if (targets.length === 0) return base;
        const target = targets[Math.floor(Math.random() * targets.length)];
        const gi = Math.floor(Math.random() * gs.hands[target].length); const given = gs.hands[target][gi];
        return soloLogAdd({ ...base, hands: gs.hands.map((h, i) => i === target ? h.filter((_, j) => j !== gi) : i === player ? [...h, given] : h) }, `${who} asked for a favor — got a card from ${ALL_NAMES_SOLO[target]}! 🐟`);
      }
      return { ...base, phase: 'steal_target' };
    }
    default: return base;
  }
}
function soloAI(gs: SoloGS, p: number): SoloGS {
  const hand = gs.hands[p]; const dangerZone = gs.deck.length <= 6;
  const findIdx = (type: SkCardType) => hand.findIndex(c => c.type === type);
  const removeCard = (idx: number) => { const card = hand[idx]; return { gs2: { ...gs, hands: gs.hands.map((h, i) => i === p ? hand.filter((_, j) => j !== idx) : h), discard: [...gs.discard, card] }, card }; };
  if (dangerZone) { for (const t of ['skip_nap', 'shuffle_paws', 'attack_cat'] as SkCardType[]) { const i = findIdx(t); if (i >= 0) { const { gs2, card } = removeCard(i); return soloApplyCard(gs2, card, p); } } }
  const catCounts = new Map<SkCardType, number[]>();
  hand.forEach((c, i) => { if (BASIC_CATS.includes(c.type)) { if (!catCounts.has(c.type)) catCounts.set(c.type, []); catCounts.get(c.type)!.push(i); } });
  const pairType = [...catCounts.entries()].find(([, idxs]) => idxs.length >= 2);
  const actionPool: number[] = [];
  const peekIdx = findIdx('peeky_cat'); if (peekIdx >= 0) actionPool.push(peekIdx);
  const stealIdx = findIdx('steal_treat'); if (stealIdx >= 0 && soloActivePlayers(gs).some(ap => ap !== p && gs.hands[ap].length > 0)) actionPool.push(stealIdx);
  const favorIdx = findIdx('favor_fish'); if (favorIdx >= 0) actionPool.push(favorIdx);
  if (pairType && actionPool.length === 0) {
    const [, catIdxs] = pairType;
    const hand2 = gs.hands[p].filter((_, i) => i !== catIdxs[0] && i !== catIdxs[1]);
    const targets = soloActivePlayers(gs).filter(ap => ap !== p && gs.hands[ap].length > 0);
    if (targets.length > 0) {
      const target = targets[Math.floor(Math.random() * targets.length)];
      const si = Math.floor(Math.random() * gs.hands[target].length); const stolen = gs.hands[target][si];
      const newHands = gs.hands.map((h, i) => i === p ? [...hand2, stolen] : i === target ? h.filter((_, j) => j !== si) : h);
      const cats = [hand[catIdxs[0]], hand[catIdxs[1]]];
      return soloLogAdd({ ...gs, hands: newHands, discard: [...gs.discard, ...cats] }, `${AI_NAMES_SOLO[p - 1]} played a pair & stole from ${ALL_NAMES_SOLO[target]}! 🐱`);
    }
  }
  if (actionPool.length > 0 && Math.random() < 0.55) { const pick = actionPool[Math.floor(Math.random() * actionPool.length)]; const { gs2, card } = removeCard(pick); return soloApplyCard(gs2, card, p); }
  return soloDoDrawCard(gs);
}

// ─── MODALS (SOLO) ────────────────────────────────────────────────────────────
function PeekyModal({ cards, onClose }: { cards: SkCard[]; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#1e1b4b', border: '2px solid #7c3aed', borderRadius: 16, padding: 24, textAlign: 'center', maxWidth: 380 }}>
        <div style={{ fontSize: 32 }}>👀</div>
        <h3 style={{ color: '#c4b5fd', margin: '8px 0' }}>Peeky Cat — Top 3 Cards</h3>
        <p style={{ color: '#a78bfa', fontSize: 12, margin: '0 0 16px' }}>Top card is drawn first</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {cards.length === 0 ? <p style={{ color: '#888' }}>Deck is empty!</p> :
            cards.map((c, i) => <div key={c.id} style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>#{i + 1}</div><CardView card={c} /></div>)}
        </div>
        <button onClick={onClose} style={{ marginTop: 20, padding: '10px 28px', background: '#7c3aed', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Got it!</button>
      </div>
    </div>
  );
}

function StealModal({ names, handSizes, onSteal, onCancel, label, excludeSeat }: {
  names: string[]; handSizes: number[]; onSteal: (target: number) => void; onCancel: () => void; label: string; excludeSeat: number;
}) {
  const targets = names.map((_, i) => i).filter(i => i !== excludeSeat && handSizes[i] > 0);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#1c1917', border: '2px solid #ca8a04', borderRadius: 16, padding: 24, textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 32 }}>🐱</div>
        <h3 style={{ color: '#fde047', margin: '8px 0' }}>{label}</h3>
        <p style={{ color: '#a3a3a3', fontSize: 13, marginBottom: 16 }}>Choose an opponent:</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {targets.map(t => (
            <button key={t} onClick={() => onSteal(t)} style={{ padding: '12px 20px', background: 'linear-gradient(135deg,#713f12,#ca8a04)', border: '2px solid #fde047', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
              {names[t]}<br /><span style={{ fontSize: 11, opacity: 0.8 }}>{handSizes[t]} cards</span>
            </button>
          ))}
        </div>
        {onCancel && <button onClick={onCancel} style={{ marginTop: 14, padding: '8px 20px', background: 'transparent', border: '1px solid #555', borderRadius: 8, color: '#888', cursor: 'pointer', fontSize: 13 }}>Cancel</button>}
      </div>
    </div>
  );
}

function WinLossModal({ winner, names, mySeat, onNew }: { winner: number; names: string[]; mySeat: number; onNew: () => void }) {
  const won = winner === mySeat;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, backdropFilter: 'blur(6px)' }}>
      <div style={{ background: won ? '#052e16' : '#450a0a', border: `2px solid ${won ? '#16a34a' : '#dc2626'}`, borderRadius: 20, padding: '32px 40px', textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 64, marginBottom: 8 }}>{won ? '🏆' : '🤧'}</div>
        <h2 style={{ color: won ? '#4ade80' : '#f87171', fontSize: 28, margin: '0 0 8px', fontWeight: 900 }}>
          {won ? 'You Win!' : `${names[winner]} Wins!`}
        </h2>
        <p style={{ color: '#888', marginBottom: 20 }}>
          {won ? '🎉 Last cat standing!' : `😿 ${names[winner]} survived the sneezes!`}
        </p>
        <button onClick={onNew} style={{ padding: '12px 36px', background: won ? '#16a34a' : '#dc2626', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer', boxShadow: `0 4px 16px ${won ? 'rgba(22,163,74,0.5)' : 'rgba(220,38,38,0.5)'}` }}>
          Play Again
        </button>
      </div>
    </div>
  );
}

// ─── SOLO GAME ────────────────────────────────────────────────────────────────
function SneezingKittensSolo({ onBack }: { onBack: () => void }) {
  const [gs, setGs] = useState<SoloGS>(initSoloGS);
  const [nopeTimer, setNopeTimer] = useState(0);
  const nopeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [pendingEffect, setPendingEffect] = useState<null | { fn: (g: SoloGS) => SoloGS }>(null);
  const startNewGame = useCallback(() => {
    if (nopeRef.current) { clearInterval(nopeRef.current); nopeRef.current = null; }
    setPendingEffect(null);
    setGs(initSoloGS());
  }, []);

  useEffect(() => {
    if (gs.phase !== 'ai_turn' || gs.eliminated[gs.current]) return;
    const t = setTimeout(() => { setGs(prev => prev.phase !== 'ai_turn' ? prev : soloAI(prev, prev.current)); }, 900 + Math.random() * 600);
    return () => clearTimeout(t);
  }, [gs.phase, gs.current, gs.discard.length]);

  useEffect(() => {
    if (gs.phase !== 'nope_window') { if (nopeRef.current) { clearInterval(nopeRef.current); nopeRef.current = null; } return; }
    setNopeTimer(3);
    nopeRef.current = setInterval(() => {
      setNopeTimer(p => {
        if (p <= 1) {
          clearInterval(nopeRef.current!); nopeRef.current = null;
          setGs(g => { if (!pendingEffect) return { ...g, phase: 'ai_turn' }; return pendingEffect.fn(g); });
          setPendingEffect(null); return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => { if (nopeRef.current) { clearInterval(nopeRef.current); nopeRef.current = null; } };
  }, [gs.phase]);

  const onSelectCard = useCallback((idx: number) => {
    setGs(prev => {
      if (prev.phase !== 'human_action') return prev;
      const sel = prev.selectedIdxs;
      if (sel.includes(idx)) return { ...prev, selectedIdxs: sel.filter(i => i !== idx) };
      return { ...prev, selectedIdxs: [...sel, idx] };
    });
  }, []);

  const onPlaySelected = useCallback(() => {
    setGs(prev => {
      if (prev.phase !== 'human_action' || prev.selectedIdxs.length === 0) return prev;
      const sel = prev.selectedIdxs; const selCards = sel.map(i => prev.hands[0][i]);
      if (sel.length === 1) {
        const card = selCards[0];
        if (['sneezing_kitten', 'tissue_box'].includes(card.type)) return prev;
        const newHand = prev.hands[0].filter((_, i) => !sel.includes(i));
        const gs2 = { ...prev, hands: prev.hands.map((h, i) => i === 0 ? newHand : h), selectedIdxs: [] };
        return soloApplyCard({ ...gs2, discard: [...gs2.discard, card] }, card, 0);
      }
      if (sel.length === 2 && selCards.every(c => BASIC_CATS.includes(c.type)) && selCards[0].type === selCards[1].type) {
        return { ...prev, hands: prev.hands.map((h, i) => i === 0 ? h.filter((_, j) => !sel.includes(j)) : h),
          discard: [...prev.discard, ...selCards], selectedIdxs: [], phase: 'steal_target' as SoloPhase };
      }
      return prev;
    });
  }, []);

  const humanHand = gs.hands[0];
  const sel = gs.selectedIdxs;
  const canPlay = (sel.length === 1 && !['sneezing_kitten', 'tissue_box'].includes(humanHand[sel[0]]?.type ?? 'tissue_box'))
    || (sel.length === 2 && sel.map(i => humanHand[i]).every(c => BASIC_CATS.includes(c.type)) && humanHand[sel[0]]?.type === humanHand[sel[1]]?.type);
  const isHumanTurn = gs.phase === 'human_action';
  const isAITurn = gs.phase === 'ai_turn' || gs.phase === 'nope_window';

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 50% 0%, #1c0533 0%, #0c0a1a 60%, #050510 100%)', color: '#fff', display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI', sans-serif", userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.4)', flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '5px 12px', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>← Menu</button>
        <div style={{ textAlign: 'center' }}><span style={{ fontSize: 20, fontWeight: 900, color: '#f472b6', letterSpacing: 1 }}>🤧 Sneezing Kittens</span><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>vs AI</div></div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Deck: <strong style={{ color: gs.deck.length < 8 ? '#f87171' : '#4ade80' }}>{gs.deck.length}</strong></div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 8, gap: 6, overflowY: 'auto' }}>
        {[1, 2].map(p => { const elim = gs.eliminated[p]; const isActive = gs.current === p; return (
          <div key={p} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '8px 12px', border: isActive ? '1px solid rgba(244,114,182,0.4)' : '1px solid rgba(255,255,255,0.07)', opacity: elim ? 0.35 : 1, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ minWidth: 80 }}><div style={{ fontSize: 12, fontWeight: 700, color: isActive ? '#f472b6' : '#888' }}>{AI_NAMES_SOLO[p - 1]}</div><div style={{ fontSize: 10, color: '#666' }}>{elim ? '💀 Eliminated' : isActive ? (isAITurn ? '🤔 Thinking...' : 'Waiting') : 'Waiting'}</div></div>
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>{elim ? <span style={{ fontSize: 24 }}>💀</span> : Array.from({ length: gs.hands[p].length }).map((_, i) => <CardView key={i} faceDown small />)}</div>
          </div>
        ); })}
        <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>DECK ({gs.deck.length})</div><div style={{ position: 'relative', cursor: isHumanTurn ? 'pointer' : 'default' }} onClick={isHumanTurn ? () => setGs(prev => prev.phase !== 'human_action' ? prev : soloDoDrawCard({ ...prev, selectedIdxs: [] })) : undefined}><CardView faceDown />{isHumanTurn && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', borderRadius: 8, fontSize: 24 }}>➕</div>}</div></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>DISCARD</div>{gs.discard.length > 0 ? <CardView card={gs.discard[gs.discard.length - 1]} /> : <div style={{ width: 72, height: 100, borderRadius: 8, border: '2px dashed #333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: 12 }}>Empty</div>}</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', padding: 10, overflowY: 'auto', maxHeight: 220 }}>
            <div style={{ fontSize: 10, color: '#666', marginBottom: 6, letterSpacing: 1 }}>GAME LOG</div>
            {gs.log.map((entry, i) => <div key={i} style={{ fontSize: 12, color: i === gs.log.length - 1 ? '#e2e8f0' : '#64748b', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{entry}</div>)}
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            {isHumanTurn && <div style={{ color: '#f472b6', fontWeight: 700, fontSize: 14 }}>⭐ Your turn — play a card or draw</div>}
            {isAITurn && !gs.eliminated[gs.current] && <div style={{ color: '#888', fontSize: 14 }}>{gs.phase === 'nope_window' ? <span style={{ color: '#f59e0b', fontWeight: 700 }}>⏳ {nopeTimer}s — Play Nope Cat to cancel!</span> : <span>🤔 {AI_NAMES_SOLO[gs.current - 1]} is thinking...</span>}</div>}
            {gs.extraTurns > 1 && <div style={{ fontSize: 11, color: '#f87171', marginTop: 2 }}>{gs.extraTurns - 1} extra turn(s) remaining {gs.current === 0 ? 'for you' : `for ${AI_NAMES_SOLO[gs.current - 1]}`}</div>}
          </div>
          {isHumanTurn && <button onClick={() => setGs(prev => prev.phase !== 'human_action' ? prev : soloDoDrawCard({ ...prev, selectedIdxs: [] }))} style={{ padding: '10px 20px', background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', border: '2px solid #3b82f6', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.4)' }}>Draw Card 🃏</button>}
          {isHumanTurn && canPlay && <button onClick={onPlaySelected} style={{ padding: '10px 20px', background: 'linear-gradient(135deg,#831843,#db2777)', border: '2px solid #f472b6', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 12px rgba(219,39,119,0.4)' }}>Play Card ▶</button>}
          {gs.phase === 'nope_window' && humanHand.some(c => c.type === 'nope_cat') && (
            <button onClick={() => {
              if (nopeRef.current) { clearInterval(nopeRef.current); nopeRef.current = null; }
              setGs(prev => { const nopIdx = prev.hands[0].findIndex(c => c.type === 'nope_cat'); if (nopIdx < 0) return prev; const card = prev.hands[0][nopIdx]; const newHand = prev.hands[0].filter((_, i) => i !== nopIdx); const gs2 = soloLogAdd({ ...prev, hands: prev.hands.map((h, i) => i === 0 ? newHand : h), discard: [...prev.discard, card], phase: 'ai_turn' }, '🙅 You played Nope Cat! Effect cancelled!'); setPendingEffect(null); return gs2; });
            }} style={{ padding: '10px 20px', background: 'linear-gradient(135deg,#831843,#db2777)', border: '2px solid #f9a8d4', borderRadius: 10, color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer', boxShadow: '0 4px 16px rgba(219,39,119,0.6)' }}>
              🙅 Nope! ({nopeTimer}s)
            </button>
          )}
        </div>
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px', border: isHumanTurn ? '1px solid rgba(244,114,182,0.35)' : '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: '#f472b6', fontWeight: 700 }}>Your Hand ({humanHand.length} cards)</div>
            {sel.length > 0 && <div style={{ fontSize: 11, color: '#888' }}>{sel.length === 1 ? `${DEFS[humanHand[sel[0]]?.type]?.name} selected` : `${sel.length} cards selected`}</div>}
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
            {humanHand.map((card, i) => <CardView key={card.id} card={card} selected={sel.includes(i)} onClick={() => onSelectCard(i)} disabled={!isHumanTurn || ['sneezing_kitten', 'tissue_box'].includes(card.type)} />)}
            {humanHand.length === 0 && <div style={{ color: '#555', fontSize: 13, padding: 16 }}>No cards in hand</div>}
          </div>
          {isHumanTurn && <div style={{ marginTop: 6, fontSize: 10, color: '#4b5563', textAlign: 'center' }}>Tap a card to select • Select 2 matching basic cats to steal</div>}
        </div>
      </div>
      {gs.phase === 'peeky_view' && <PeekyModal cards={gs.peekCards} onClose={() => setGs(prev => ({ ...prev, phase: 'human_action', peekCards: [] }))} />}
      {gs.phase === 'steal_target' && (
        <StealModal names={ALL_NAMES_SOLO} handSizes={gs.hands.map(h => h.length)} excludeSeat={0}
          label="Choose a target to steal from:"
          onSteal={target => setGs(prev => {
            if (prev.hands[target].length === 0) return { ...prev, phase: 'human_action' };
            const si = Math.floor(Math.random() * prev.hands[target].length); const stolen = prev.hands[target][si];
            return soloLogAdd({ ...prev, hands: prev.hands.map((h, i) => i === 0 ? [...h, stolen] : i === target ? h.filter((_, j) => j !== si) : h), phase: 'human_action' }, `You stole ${DEFS[stolen.type].name} from ${ALL_NAMES_SOLO[target]}! ${DEFS[stolen.type].emoji}`);
          })}
          onCancel={() => setGs(prev => ({ ...prev, phase: 'human_action', selectedIdxs: [] }))} />
      )}
      {(gs.phase === 'won' || gs.phase === 'lost') && gs.winner !== null && (
        <WinLossModal winner={gs.winner} names={ALL_NAMES_SOLO} mySeat={0} onNew={startNewGame} />
      )}
    </div>
  );
}

// ─── ONLINE LOBBY ─────────────────────────────────────────────────────────────
function SkLobby({ players, roomCode, isHost, mySeat, status, error, onStart, onBack }: {
  players: SkLobbyPlayer[]; roomCode: string; isHost: boolean; mySeat: number;
  status: string; error: string; onStart: (maxPlayers: number) => void; onBack: () => void;
}) {
  const [maxPlayers, setMaxPlayers] = useState(4);
  const copyCode = () => { navigator.clipboard?.writeText(roomCode); };

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 50% 0%, #1c0533 0%, #0c0a1a 60%, #050510 100%)', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', sans-serif", padding: 24 }}>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 32, maxWidth: 480, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40 }}>🤧</div>
          <h2 style={{ color: '#f472b6', margin: '8px 0 4px', fontSize: 22 }}>Sneezing Kittens</h2>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Online Multiplayer</div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(244,114,182,0.3)', borderRadius: 12, padding: 16, textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6, letterSpacing: 2 }}>ROOM CODE</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#f472b6', letterSpacing: 8, fontFamily: 'monospace' }}>{roomCode}</div>
          <button onClick={copyCode} style={{ marginTop: 8, padding: '6px 16px', background: 'rgba(244,114,182,0.15)', border: '1px solid rgba(244,114,182,0.3)', borderRadius: 8, color: '#f9a8d4', cursor: 'pointer', fontSize: 12 }}>Copy Code</button>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8, letterSpacing: 1 }}>PLAYERS ({players.length}/4)</div>
          {players.map(p => (
            <div key={p.seat} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: p.seat === mySeat ? 'rgba(244,114,182,0.1)' : 'rgba(255,255,255,0.03)', border: p.seat === mySeat ? '1px solid rgba(244,114,182,0.3)' : '1px solid rgba(255,255,255,0.06)', borderRadius: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 16 }}>{p.seat === 0 ? '👑' : '🐱'}</span>
              <span style={{ fontWeight: 600, color: p.seat === mySeat ? '#f9a8d4' : '#e2e8f0' }}>{p.name}</span>
              {p.seat === mySeat && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>You</span>}
              {p.seat === 0 && p.seat !== mySeat && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>Host</span>}
            </div>
          ))}
          {players.length < 4 && Array.from({ length: 4 - players.length }).map((_, i) => (
            <div key={i} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 8, marginBottom: 6, color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>🤖 AI Bot (auto-fills)</div>
          ))}
        </div>
        {isHost && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>TOTAL PLAYERS (AI fills remaining seats)</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setMaxPlayers(n)} style={{ flex: 1, padding: '10px 0', background: maxPlayers === n ? 'rgba(244,114,182,0.2)' : 'rgba(255,255,255,0.04)', border: maxPlayers === n ? '2px solid #f472b6' : '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: maxPlayers === n ? '#f9a8d4' : '#888', fontWeight: maxPlayers === n ? 700 : 400, cursor: 'pointer', fontSize: 16 }}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}
        {error && <div style={{ color: '#f87171', fontSize: 13, textAlign: 'center', marginBottom: 12, background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: '8px 12px' }}>{error}</div>}
        {isHost && (
          <button onClick={() => onStart(maxPlayers)} disabled={players.length < 2 || status === 'connecting'}
            style={{ width: '100%', padding: '14px 0', background: players.length >= 2 ? 'linear-gradient(135deg,#831843,#db2777)' : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: 16, cursor: players.length >= 2 ? 'pointer' : 'not-allowed', boxShadow: players.length >= 2 ? '0 4px 16px rgba(219,39,119,0.4)' : 'none', marginBottom: 10 }}>
            Start Game 🐾 {players.length < 2 ? '(need 2+ players)' : ''}
          </button>
        )}
        {!isHost && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 10, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
            ⏳ Waiting for the host to start...
          </div>
        )}
        <button onClick={onBack} style={{ width: '100%', padding: '10px 0', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13 }}>← Leave Room</button>
      </div>
    </div>
  );
}

// ─── ONLINE GAME ──────────────────────────────────────────────────────────────
function SkOnlineGame({ view, onDraw, onPlay, onNope, onStealTarget, onPeekClose, onBack }: {
  view: SkPlayerView;
  onDraw: () => void; onPlay: (id: number, p2?: number) => void;
  onNope: () => void; onStealTarget: (seat: number) => void;
  onPeekClose: () => void; onBack: () => void;
}) {
  const [selIdxs, setSelIdxs] = useState<number[]>([]);
  const nopeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [nopeCountdown, setNopeCountdown] = useState(0);
  const prevPhase = useRef(view.phase);

  useEffect(() => {
    if (view.phase !== prevPhase.current) { setSelIdxs([]); prevPhase.current = view.phase; }
  }, [view.phase]);

  useEffect(() => {
    if (view.phase === 'nope_window') {
      setNopeCountdown(view.nopeSeconds);
      if (nopeRef.current) clearInterval(nopeRef.current);
      nopeRef.current = setInterval(() => setNopeCountdown(p => Math.max(0, p - 1)), 1000);
    } else {
      if (nopeRef.current) { clearInterval(nopeRef.current); nopeRef.current = null; }
    }
    return () => { if (nopeRef.current) { clearInterval(nopeRef.current); nopeRef.current = null; } };
  }, [view.phase, view.nopeSeconds]);

  const myHand = view.myHand;
  const isMyTurn = view.myPhase === 'action';
  const canNope = view.myPhase === 'nope' && myHand.some(c => c.type === 'nope_cat');

  const selCards = selIdxs.map(i => myHand[i]);
  const isPair = selIdxs.length === 2 && selCards.every(c => ['cat_taco','cat_melon','cat_potato','cat_beard','cat_rainbow'].includes(c.type)) && selCards[0]?.type === selCards[1]?.type;
  const canPlay = (selIdxs.length === 1 && !['sneezing_kitten','tissue_box'].includes(selCards[0]?.type ?? 'tissue_box')) || isPair;

  const handlePlay = () => {
    if (!canPlay) return;
    if (isPair) { onPlay(selCards[0].id, selCards[1].id); }
    else { onPlay(selCards[0].id); }
    setSelIdxs([]);
  };

  const otherSeats = view.names.map((_, i) => i).filter(i => i !== view.mySeat);

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 50% 0%, #1c0533 0%, #0c0a1a 60%, #050510 100%)', color: '#fff', display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI', sans-serif", userSelect: 'none' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.4)', flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '4px 10px', color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer' }}>← Leave</button>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 900, color: '#f472b6' }}>🤧 Sneezing Kittens</span>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Room: {view.roomCode} · Deck: {view.deckCount}</div>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{view.direction === 1 ? '→' : '←'} {view.extraTurns > 1 ? `×${view.extraTurns}` : ''}</div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 8, gap: 6, overflowY: 'auto' }}>
        {/* Other players */}
        {otherSeats.map(seat => {
          const elim = view.eliminated[seat];
          const isActive = view.current === seat;
          const isHuman = view.isHuman[seat];
          return (
            <div key={seat} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '7px 12px', border: isActive ? '1px solid rgba(244,114,182,0.4)' : '1px solid rgba(255,255,255,0.07)', opacity: elim ? 0.35 : 1, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ minWidth: 90 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: isActive ? '#f472b6' : '#888' }}>
                  {isHuman ? '👤' : '🤖'} {view.names[seat]}
                </div>
                <div style={{ fontSize: 10, color: '#555' }}>
                  {elim ? '💀 Eliminated' : isActive ? (view.phase === 'action' ? '⭐ Their turn' : '⏳') : 'Waiting'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {elim ? <span style={{ fontSize: 22 }}>💀</span> : Array.from({ length: view.handSizes[seat] }).map((_, i) => <CardView key={i} faceDown small />)}
              </div>
            </div>
          );
        })}

        {/* Deck + Discard + Log */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>DECK ({view.deckCount})</div>
              <div onClick={isMyTurn ? onDraw : undefined} style={{ cursor: isMyTurn ? 'pointer' : 'default', position: 'relative' }}>
                <CardView faceDown />
                {isMyTurn && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', borderRadius: 8, fontSize: 22 }}>➕</div>}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>DISCARD</div>
              {view.topDiscard ? <CardView card={view.topDiscard} /> : <div style={{ width: 72, height: 100, borderRadius: 8, border: '2px dashed #333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: 12 }}>Empty</div>}
            </div>
          </div>
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', padding: 10, overflowY: 'auto', maxHeight: 200 }}>
            <div style={{ fontSize: 10, color: '#666', marginBottom: 6, letterSpacing: 1 }}>GAME LOG</div>
            {view.log.map((entry, i) => <div key={i} style={{ fontSize: 12, color: i === view.log.length - 1 ? '#e2e8f0' : '#64748b', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{entry}</div>)}
          </div>
        </div>

        {/* Status + Action bar */}
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            {isMyTurn && <div style={{ color: '#f472b6', fontWeight: 700, fontSize: 14 }}>⭐ Your turn — play a card or draw</div>}
            {view.myPhase === 'idle' && !isMyTurn && <div style={{ color: '#555', fontSize: 14 }}>⏳ Waiting for {view.names[view.current]}...</div>}
            {view.myPhase === 'nope' && <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: 14 }}>⏳ {nopeCountdown}s — Play Nope Cat to cancel!</div>}
            {view.extraTurns > 1 && isMyTurn && <div style={{ fontSize: 11, color: '#f87171', marginTop: 2 }}>Extra turns: {view.extraTurns}</div>}
          </div>
          {isMyTurn && <button onClick={onDraw} style={{ padding: '10px 18px', background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', border: '2px solid #3b82f6', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Draw 🃏</button>}
          {isMyTurn && canPlay && <button onClick={handlePlay} style={{ padding: '10px 18px', background: 'linear-gradient(135deg,#831843,#db2777)', border: '2px solid #f472b6', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Play ▶</button>}
          {canNope && <button onClick={onNope} style={{ padding: '10px 18px', background: 'linear-gradient(135deg,#831843,#db2777)', border: '2px solid #f9a8d4', borderRadius: 10, color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 16px rgba(219,39,119,0.6)' }}>🙅 Nope! ({nopeCountdown}s)</button>}
        </div>

        {/* My hand */}
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px', border: isMyTurn ? '1px solid rgba(244,114,182,0.35)' : '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: '#f472b6', fontWeight: 700 }}>Your Hand ({myHand.length})</div>
            {selIdxs.length > 0 && <div style={{ fontSize: 11, color: '#888' }}>{selIdxs.length === 1 ? `${DEFS[myHand[selIdxs[0]]?.type]?.name} selected` : `${selIdxs.length} selected`}</div>}
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
            {myHand.map((card, i) => (
              <CardView key={card.id} card={card}
                selected={selIdxs.includes(i)}
                onClick={() => {
                  if (!isMyTurn) return;
                  if (['sneezing_kitten','tissue_box'].includes(card.type)) return;
                  setSelIdxs(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
                }}
                disabled={!isMyTurn || ['sneezing_kitten','tissue_box'].includes(card.type)} />
            ))}
            {myHand.length === 0 && <div style={{ color: '#555', fontSize: 13, padding: 16 }}>No cards</div>}
          </div>
          {isMyTurn && <div style={{ marginTop: 6, fontSize: 10, color: '#4b5563', textAlign: 'center' }}>Tap to select • 2 matching cats = steal</div>}
        </div>
      </div>

      {/* Steal target modal */}
      {(view.myPhase === 'steal_target' || view.myPhase === 'favor_target') && (
        <StealModal
          names={view.names}
          handSizes={view.handSizes}
          excludeSeat={view.mySeat}
          label={view.myPhase === 'steal_target' ? 'Steal from:' : 'Ask for a favor from:'}
          onSteal={onStealTarget}
          onCancel={() => {}} />
      )}

      {/* Peek modal */}
      {view.myPhase === 'peek_view' && view.peekCards.length > 0 && (
        <PeekyModal cards={view.peekCards} onClose={onPeekClose} />
      )}

      {/* Win/loss modal */}
      {view.phase === 'won' && view.winner !== null && (
        <WinLossModal winner={view.winner} names={view.names} mySeat={view.mySeat} onNew={onBack} />
      )}
    </div>
  );
}

// ─── MAIN MENU ────────────────────────────────────────────────────────────────
function SkMainMenu({ onSolo, onOnline }: { onSolo: () => void; onOnline: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 50% 0%, #1c0533 0%, #0c0a1a 60%, #050510 100%)', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', sans-serif", padding: 24 }}>
      <Link href="/"><span style={{ position: 'absolute', top: 14, left: 14, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '5px 12px', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>← Menu</span></Link>
      <div style={{ textAlign: 'center', maxWidth: 400, width: '100%' }}>
        <div style={{ fontSize: 64, marginBottom: 8 }}>🤧</div>
        <h1 style={{ color: '#f472b6', fontWeight: 900, fontSize: 28, margin: '0 0 4px' }}>Sneezing Kittens</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 32, fontSize: 13 }}>Don't draw the Sneezing Kitten!</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 28 }}>
          {(['sneezing_kitten', 'tissue_box', 'nope_cat', 'attack_cat', 'peeky_cat'] as SkCardType[]).map(type => (
            <CardView key={type} card={{ id: 0, type }} small />
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={onSolo} style={{ padding: '18px 0', background: 'linear-gradient(135deg,#713f12,#d97706)', border: '2px solid #fcd34d', borderRadius: 14, color: '#fff', fontWeight: 800, fontSize: 18, cursor: 'pointer', boxShadow: '0 4px 20px rgba(217,119,6,0.4)' }}>
            🐱 Solo vs AI
          </button>
          <button onClick={onOnline} style={{ padding: '18px 0', background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', border: '2px solid #60a5fa', borderRadius: 14, color: '#fff', fontWeight: 800, fontSize: 18, cursor: 'pointer', boxShadow: '0 4px 20px rgba(37,99,235,0.4)' }}>
            🌐 Play Online
            <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.7, marginTop: 2 }}>Up to 4 humans + AI bots</div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ONLINE HUB ──────────────────────────────────────────────────────────────
function SkOnlineHub({ onBack }: { onBack: () => void }) {
  const [screen, setScreen] = useState<'join_or_create' | 'lobby' | 'game'>('join_or_create');
  const [name, setName] = useState(() => localStorage.getItem('sk_name') || '');
  const [codeInput, setCodeInput] = useState('');
  const { status, roomCode, mySeat, isHost, error, players, view, create, join, start, playCard, draw, nope, stealTarget, peekClose, disconnect } = useSkOnline();

  useEffect(() => {
    if (status === 'lobby') setScreen('lobby');
    if (status === 'playing') setScreen('game');
    if (status === 'disconnected' || status === 'idle') setScreen('join_or_create');
  }, [status]);

  const saveName = (n: string) => { setName(n); localStorage.setItem('sk_name', n); };

  const handleLeave = () => { disconnect(); setScreen('join_or_create'); onBack(); };

  if (screen === 'lobby') {
    return <SkLobby players={players} roomCode={roomCode} isHost={isHost} mySeat={mySeat}
      status={status} error={error}
      onStart={(maxP) => start(maxP)}
      onBack={() => { disconnect(); setScreen('join_or_create'); }} />;
  }

  if (screen === 'game' && view) {
    return <SkOnlineGame view={view} onDraw={draw} onPlay={playCard} onNope={nope}
      onStealTarget={stealTarget} onPeekClose={peekClose} onBack={handleLeave} />;
  }

  // Join / Create screen
  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 50% 0%, #1c0533 0%, #0c0a1a 60%, #050510 100%)', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', sans-serif", padding: 24 }}>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 32, maxWidth: 420, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40 }}>🤧</div>
          <h2 style={{ color: '#f472b6', margin: '8px 0 4px' }}>Online Multiplayer</h2>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Up to 4 humans + AI bots</div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', letterSpacing: 1 }}>YOUR NAME</label>
          <input value={name} onChange={e => saveName(e.target.value)} maxLength={16} placeholder="Enter your name..."
            style={{ display: 'block', width: '100%', marginTop: 6, padding: '10px 14px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <button onClick={() => create(name || 'Host')} disabled={status === 'connecting'}
          style={{ width: '100%', padding: '14px 0', background: 'linear-gradient(135deg,#831843,#db2777)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer', boxShadow: '0 4px 16px rgba(219,39,119,0.4)', marginBottom: 12 }}>
          Create Room 🐾
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>or join</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input value={codeInput} onChange={e => setCodeInput(e.target.value.toUpperCase())} maxLength={4} placeholder="ROOM CODE"
            style={{ flex: 1, padding: '10px 14px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: '#fff', fontSize: 18, fontFamily: 'monospace', letterSpacing: 4, textAlign: 'center', outline: 'none' }} />
          <button onClick={() => join(codeInput, name || 'Player')} disabled={codeInput.length < 4 || status === 'connecting'}
            style={{ padding: '10px 20px', background: codeInput.length >= 4 ? 'linear-gradient(135deg,#1e3a5f,#2563eb)' : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: codeInput.length >= 4 ? 'pointer' : 'not-allowed', fontSize: 14 }}>
            Join
          </button>
        </div>
        {error && <div style={{ color: '#f87171', fontSize: 13, background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>{error}</div>}
        {status === 'connecting' && <div style={{ textAlign: 'center', color: '#888', fontSize: 13, marginBottom: 12 }}>Connecting...</div>}
        <button onClick={onBack} style={{ width: '100%', padding: '10px 0', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13 }}>← Back</button>
      </div>
    </div>
  );
}

// ─── ROOT EXPORT ──────────────────────────────────────────────────────────────
type Screen = 'menu' | 'solo' | 'online';
export default function SneezingKittens() {
  const [screen, setScreen] = useState<Screen>('menu');
  if (screen === 'solo') return <SneezingKittensSolo onBack={() => setScreen('menu')} />;
  if (screen === 'online') return <SkOnlineHub onBack={() => setScreen('menu')} />;
  return <SkMainMenu onSolo={() => setScreen('solo')} onOnline={() => setScreen('online')} />;
}
