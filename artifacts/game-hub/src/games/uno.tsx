import { useState, useCallback, useEffect, useRef } from "react";
import { Link } from "wouter";
import { ArrowLeft, HelpCircle, X } from "lucide-react";
import { useUnoOnline } from "../lib/uno-online";
import type { PlayerView, Variant as OnlineVariant } from "../lib/uno-online";
import { UnoOnlineLobby } from "../components/UnoOnlineLobby";

// ── Types ─────────────────────────────────────────────────────────────────────
type LColor = "red" | "green" | "blue" | "yellow";
type DColor = "pink" | "orange" | "teal" | "purple";
type Color  = LColor | DColor | "wild";
type CardType = "number" | "skip" | "reverse" | "draw2" | "wild" | "wild4"
              | "flip" | "draw5" | "skipAll" | "wildColor" | "wildAll";
type Variant  = "classic" | "flip" | "progressive" | "seveno";
type Card     = { id: number; color: Color; type: CardType; value?: number; dark?: boolean };
type UnoState = {
  deck: Card[]; hands: Card[][]; discard: Card[];
  turn: number; direction: 1 | -1; chosenColor: Color | null;
  winner: number | null; playerCount: number; isAI: boolean[]; names: string[];
  variant: Variant; isFlipped: boolean; stackedDraw: number; sevenSwap: boolean;
};

// ── Deck building ─────────────────────────────────────────────────────────────
let _id = 0;
const mk = (color: Color, type: CardType, value?: number, dark = false): Card =>
  ({ id: _id++, color, type, value, dark });
const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

function buildDeck(variant: Variant): Card[] {
  const lc: LColor[] = ["red","green","blue","yellow"];
  const dc: DColor[] = ["pink","orange","teal","purple"];
  const cards: Card[] = [];

  lc.forEach(c => {
    cards.push(mk(c, "number", 0));
    for (let v = 1; v <= 9; v++) { cards.push(mk(c,"number",v)); cards.push(mk(c,"number",v)); }
    [1,2].forEach(() => { cards.push(mk(c,"skip")); cards.push(mk(c,"reverse")); cards.push(mk(c,"draw2")); });
    if (variant === "flip") [1,2].forEach(() => cards.push(mk(c,"flip")));
  });
  for (let i = 0; i < 4; i++) { cards.push(mk("wild","wild")); cards.push(mk("wild","wild4")); }

  if (variant !== "flip") return shuffle(cards);

  const dark: Card[] = [];
  dc.forEach(c => {
    dark.push(mk(c,"number",1,true));
    for (let v = 2; v <= 9; v++) { dark.push(mk(c,"number",v,true)); dark.push(mk(c,"number",v,true)); }
    [1,2].forEach(() => { dark.push(mk(c,"skip",undefined,true)); dark.push(mk(c,"reverse",undefined,true)); dark.push(mk(c,"draw5",undefined,true)); });
    dark.push(mk(c,"skipAll",undefined,true)); dark.push(mk(c,"flip",undefined,true));
  });
  dark.push(mk("wild","wildColor",undefined,true)); dark.push(mk("wild","wildColor",undefined,true));
  dark.push(mk("wild","wildAll",undefined,true));   dark.push(mk("wild","wildAll",undefined,true));

  return shuffle([...cards, ...dark]);
}

function firstCard(deck: Card[]): { top: Card; remaining: Card[] } {
  const d = [...deck];
  let i = d.findIndex(c => c.type === "number" && !c.dark);
  if (i < 0) i = d.findIndex(c => !c.dark);
  const top = d.splice(i, 1)[0];
  return { top, remaining: d };
}

function initGame(pc: number, isAI: boolean[], names: string[], variant: Variant): UnoState {
  const fullDeck = buildDeck(variant);
  const hands: Card[][] = Array.from({ length: pc }, () => fullDeck.splice(0, 7));
  const { top, remaining } = firstCard(fullDeck);
  return {
    deck: remaining, hands, discard: [top], turn: 0, direction: 1,
    chosenColor: null, winner: null, playerCount: pc, isAI, names,
    variant, isFlipped: false, stackedDraw: 0, sevenSwap: false,
  };
}

// ── Playability ───────────────────────────────────────────────────────────────
function canPlay(card: Card, top: Card, cc: Color | null, variant: Variant, stacked: number): boolean {
  if (card.color === "wild") return true;
  const tc = cc ?? top.color;
  if (variant === "progressive" && stacked > 0) {
    if (top.type === "draw2") return card.type === "draw2";
    if (top.type === "wild4") return card.type === "wild4";
  }
  if (card.color === tc) return true;
  if (card.type === top.type) {
    if (top.type === "number") return card.value === top.value;
    return true;
  }
  return false;
}

function applyPlay(s: UnoState, card: Card, newColor: Color | null, swapTarget?: number): UnoState {
  const pc = s.playerCount; const cur = s.turn; const dir = s.direction;
  const next1 = (cur + dir + pc) % pc;
  const next2 = (cur + 2*dir + pc) % pc;
  const newHands = s.hands.map((h,i) => i === cur ? h.filter(c => c.id !== card.id) : [...h]);
  const newDiscard = [...s.discard, card];
  let newDeck = [...s.deck];
  let newDir = dir as 1 | -1;
  let nextTurn = next1;
  let chosenColor = card.color === "wild" ? newColor : null;
  let stackedDraw = s.stackedDraw;
  let sevenSwap = false;
  let isFlipped = s.isFlipped;

  const ensureDeck = (n: number) => {
    if (newDeck.length < n && newDiscard.length > 1) {
      newDeck = [...newDeck, ...shuffle(newDiscard.slice(0, -1))];
    }
  };

  const drawN = (pidx: number, n: number) => {
    ensureDeck(n);
    newHands[pidx] = [...newHands[pidx], ...newDeck.splice(0, Math.min(n, newDeck.length))];
  };

  if (card.type === "reverse") {
    newDir = (dir === 1 ? -1 : 1) as 1 | -1;
    nextTurn = pc === 2 ? cur : (cur + newDir + pc) % pc;
  } else if (card.type === "skip") {
    nextTurn = next2;
  } else if (card.type === "skipAll") {
    nextTurn = cur;
  } else if (card.type === "draw2") {
    if (s.variant === "progressive") {
      stackedDraw += 2; nextTurn = next1;
    } else {
      drawN(next1, 2); nextTurn = next2;
    }
  } else if (card.type === "draw5") {
    drawN(next1, 5); nextTurn = next2;
  } else if (card.type === "wild4") {
    if (s.variant === "progressive") {
      stackedDraw += 4; nextTurn = next2;
    } else {
      drawN(next1, 4); nextTurn = next2;
    }
  } else if (card.type === "wildColor") {
    const targetColor = newColor!;
    let drawn: Card[] = [];
    ensureDeck(10);
    while (newDeck.length > 0) {
      const c = newDeck.splice(0, 1)[0];
      drawn.push(c);
      if (c.color === targetColor) break;
    }
    newHands[next1] = [...newHands[next1], ...drawn];
    nextTurn = next2; chosenColor = targetColor as Color;
  } else if (card.type === "wildAll") {
    const targetColor = newColor!;
    for (let i = 0; i < pc; i++) {
      if (i === cur) continue;
      ensureDeck(5);
      const drawn: Card[] = [];
      while (newDeck.length > 0) {
        const c = newDeck.splice(0, 1)[0];
        drawn.push(c);
        if (c.color === targetColor) break;
      }
      newHands[i] = [...newHands[i], ...drawn];
    }
    nextTurn = next1;
  } else if (card.type === "flip") {
    isFlipped = !isFlipped;
  }

  if (s.variant === "progressive" && stackedDraw > 0 && card.type !== "draw2" && card.type !== "wild4") {
    stackedDraw = 0;
  }

  if (s.variant === "seveno") {
    if (card.type === "number" && card.value === 7) {
      sevenSwap = true; nextTurn = cur;
    } else if (card.type === "number" && card.value === 0) {
      if (dir === 1) {
        const first = newHands[0];
        for (let i = 0; i < pc - 1; i++) newHands[i] = newHands[i+1];
        newHands[pc-1] = first;
      } else {
        const last = newHands[pc-1];
        for (let i = pc-1; i > 0; i--) newHands[i] = newHands[i-1];
        newHands[0] = last;
      }
    }
  }

  if (swapTarget !== undefined && swapTarget !== cur) {
    const tmp = newHands[cur];
    newHands[cur] = newHands[swapTarget];
    newHands[swapTarget] = tmp;
  }

  const winner = newHands[cur].length === 0 ? cur : null;
  return { ...s, hands: newHands, discard: newDiscard, deck: newDeck, turn: nextTurn,
    direction: newDir, chosenColor, winner, stackedDraw, sevenSwap, isFlipped };
}

function applyForcedDraw(s: UnoState): UnoState {
  let newDeck = [...s.deck];
  const ensureDeck = (n: number) => {
    if (newDeck.length < n && s.discard.length > 1)
      newDeck = [...newDeck, ...shuffle(s.discard.slice(0,-1))];
  };
  const n = s.stackedDraw > 0 ? s.stackedDraw : 1;
  ensureDeck(n);
  const newHands = s.hands.map((h,i) =>
    i === s.turn ? [...h, ...newDeck.splice(0, Math.min(n, newDeck.length))] : h);
  const nextTurn = (s.turn + s.direction + s.playerCount) % s.playerCount;
  return { ...s, deck: newDeck, hands: newHands, turn: nextTurn, stackedDraw: 0 };
}

function pickAICard(hand: Card[], top: Card, cc: Color | null, variant: Variant, stacked: number): Card | null {
  const playable = hand.filter(c => canPlay(c, top, cc, variant, stacked));
  if (!playable.length) return null;
  const pri = (c: Card) =>
    c.type==="wildAll"||c.type==="wildColor" ? 7 :
    c.type==="wild4" ? 6 : c.type==="draw5" ? 5 : c.type==="draw2" ? 4 :
    c.type==="skipAll" ? 4 : c.type==="wild" ? 3 : c.type==="skip" ? 2 :
    c.type==="reverse" ? 2 : c.type==="flip" ? 1 : 0;
  return [...playable].sort((a,b) => pri(b) - pri(a))[0];
}

function pickAIColor(hand: Card[], isFlipped: boolean): Color {
  const validColors = isFlipped
    ? ["pink","orange","teal","purple"] as DColor[]
    : ["red","green","blue","yellow"] as LColor[];
  const counts: Record<string, number> = {};
  validColors.forEach(c => { counts[c] = 0; });
  hand.forEach(c => { if (c.color in counts) counts[c.color]++; });
  return (Object.entries(counts).sort((a,b) => b[1]-a[1])[0]?.[0] ?? validColors[0]) as Color;
}

// ── Card visual (SVG) ─────────────────────────────────────────────────────────
const CARD_BG: Record<Color, string> = {
  red:"#c62828", green:"#2e7d32", blue:"#1565c0", yellow:"#f9a825",
  pink:"#ad1457", orange:"#e65100", teal:"#00695c", purple:"#6a1b9a", wild:"#111827",
};
const SYMBOL_COLOR: Record<Color, string> = {
  red:"#ef5350", green:"#66bb6a", blue:"#42a5f5", yellow:"#fdd835",
  pink:"#f06292", orange:"#ff7043", teal:"#4db6ac", purple:"#ba68c8", wild:"#fff",
};
const QUAD_COLORS = ["#ef5350","#fdd835","#66bb6a","#42a5f5"];
const DARK_QUADS  = ["#f06292","#ff7043","#4db6ac","#ba68c8"];

function cardLabel(c: Card): string {
  if (c.type==="number") return String(c.value);
  if (c.type==="skip") return "⊘";
  if (c.type==="reverse") return "⇄";
  if (c.type==="draw2") return "+2";
  if (c.type==="draw5") return "+5";
  if (c.type==="wild") return "W";
  if (c.type==="wild4") return "+4";
  if (c.type==="flip") return "↕";
  if (c.type==="skipAll") return "⊘⊘";
  if (c.type==="wildColor") return "DC";
  if (c.type==="wildAll") return "W!";
  return "?";
}

function UnoCard({ card, onClick, disabled, small, faceDown, glow, selected }: {
  card: Card; onClick?: () => void; disabled?: boolean; small?: boolean;
  faceDown?: boolean; glow?: boolean; selected?: boolean;
}) {
  const W = small ? 42 : 68;
  const H = small ? 62 : 100;
  const R = small ? 6 : 9;
  const fs  = small ? 9 : 14;
  const fsC = small ? 14 : 26;
  const isPlayable = !!onClick && !disabled;
  const isWild = card.color === "wild";

  const style: React.CSSProperties = {
    cursor: disabled ? "not-allowed" : onClick ? "pointer" : "default",
    display: "inline-block", flexShrink: 0, verticalAlign: "bottom",
    transition: "transform 0.12s, filter 0.12s",
    transform: selected ? "translateY(-12px) scale(1.05)" : isPlayable ? "" : "",
    filter: glow ? "drop-shadow(0 0 8px gold)" : disabled ? "brightness(0.5)" : undefined,
  };

  const hover = {
    onMouseEnter: (e: React.MouseEvent<SVGSVGElement>) => {
      if (isPlayable) { e.currentTarget.style.transform = "translateY(-10px) scale(1.06)"; e.currentTarget.style.filter = "drop-shadow(0 4px 8px rgba(0,0,0,0.5))"; }
    },
    onMouseLeave: (e: React.MouseEvent<SVGSVGElement>) => {
      if (isPlayable) { e.currentTarget.style.transform = ""; e.currentTarget.style.filter = disabled ? "brightness(0.5)" : ""; }
    },
  };

  if (faceDown) return (
    <svg width={W} height={H} style={style} onClick={onClick}>
      <rect width={W} height={H} rx={R} fill="#1a1a2e"/>
      <rect x={2} y={2} width={W-4} height={H-4} rx={R-1} fill="none" stroke="#ef4444" strokeWidth={2}/>
      <text x={W/2} y={H/2-4} textAnchor="middle" fill="#ef4444" fontWeight="900" fontSize={small?7:11} fontFamily="Arial, sans-serif">UNO</text>
      <ellipse cx={W/2} cy={H/2+6} rx={W*0.28} ry={H*0.16} fill="#ef4444" opacity={0.3}/>
    </svg>
  );

  const bg = CARD_BG[card.color];
  const label = cardLabel(card);
  const ovalRx = W * 0.36;
  const ovalRy = H * 0.38;
  const cx = W / 2, cy = H / 2;

  return (
    <svg width={W} height={H} style={{ ...style, opacity: disabled ? 0.45 : 1 }}
      onClick={disabled ? undefined : onClick} {...hover}>
      <rect width={W} height={H} rx={R} fill={bg}/>
      <rect x={2} y={2} width={W-4} height={H-4} rx={R-1} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1.5}/>

      {isWild ? (
        <>
          <clipPath id={`oval-${card.id}`}>
            <ellipse cx={cx} cy={cy} rx={ovalRx} ry={ovalRy} transform={`rotate(-30,${cx},${cy})`}/>
          </clipPath>
          {(card.dark ? DARK_QUADS : QUAD_COLORS).map((clr, qi) => (
            <rect key={qi} x={qi%2===0?0:cx} y={qi<2?0:cy} width={qi%2===0?cx:W-cx} height={qi<2?cy:H-cy} fill={clr} clipPath={`url(#oval-${card.id})`}/>
          ))}
          <text x={cx} y={cy+fsC*0.35} textAnchor="middle" fill="white" fontWeight="900" fontSize={fsC} fontFamily="Arial, sans-serif" style={{paintOrder:"stroke"}} stroke="rgba(0,0,0,0.4)" strokeWidth={2}>{label}</text>
        </>
      ) : (
        <>
          <ellipse cx={cx} cy={cy} rx={ovalRx} ry={ovalRy} fill="white" transform={`rotate(-30,${cx},${cy})`}/>
          <text x={cx} y={cy+fsC*0.38} textAnchor="middle" fill={bg} fontWeight="900" fontSize={fsC} fontFamily="Arial, sans-serif">{label}</text>
        </>
      )}

      <text x={4} y={fs+3} fill="white" fontWeight="900" fontSize={fs} fontFamily="Arial, sans-serif">{label}</text>
      <g transform={`rotate(180,${W/2},${H/2})`}>
        <text x={4} y={fs+3} fill="white" fontWeight="900" fontSize={fs} fontFamily="Arial, sans-serif">{label}</text>
      </g>
      {selected && <rect width={W} height={H} rx={R} fill="none" stroke="gold" strokeWidth={3}/>}
    </svg>
  );
}

function CardBack({ small }: { small?: boolean }) {
  return <UnoCard card={{ id:-1, color:"red", type:"number", value:0 }} faceDown small={small}/>;
}

// ── Color picker ──────────────────────────────────────────────────────────────
const ALL_COLORS: Color[] = ["red","green","blue","yellow"];
const DARK_PICK: Color[]  = ["pink","orange","teal","purple"];

function ColorPicker({ onPick, isFlipped }: { onPick: (c: Color) => void; isFlipped: boolean }) {
  const colors = isFlipped ? DARK_PICK : ALL_COLORS;
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 flex flex-col gap-4 items-center shadow-2xl">
        <p className="font-black text-xl text-white">Choose a color</p>
        <div className="flex gap-3">
          {colors.map(c => (
            <button key={c} onClick={() => onPick(c)}
              className="w-16 h-16 rounded-xl border-4 border-white/20 hover:scale-110 transition-transform"
              style={{ background: CARD_BG[c] }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Seven-O swap picker ───────────────────────────────────────────────────────
function SwapPicker({ names, currentIdx, onPick }: { names: string[]; currentIdx: number; onPick: (i: number) => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-yellow-500/50 rounded-2xl p-6 flex flex-col gap-4 items-center shadow-2xl">
        <p className="font-black text-xl text-yellow-300">Swap hands with who?</p>
        <div className="flex flex-wrap gap-3 justify-center">
          {names.map((n, i) => i === currentIdx ? null : (
            <button key={i} onClick={() => onPick(i)}
              className="px-5 py-3 bg-yellow-500/20 hover:bg-yellow-500/40 border border-yellow-500/50 text-yellow-300 font-black rounded-xl transition-colors">
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Variant rules ─────────────────────────────────────────────────────────────
const VARIANT_INFO: Record<Variant, { name: string; icon: string; tag: string; rules: string[] }> = {
  classic: {
    name: "Classic UNO", icon: "🃏", tag: "The original",
    rules: [
      "Match the top card by COLOR or NUMBER/SYMBOL.",
      "Wild: Choose any color. Wild Draw 4: Next player draws 4, skip; challenge if played illegally.",
      "Draw 2 (⊕2): Next player draws 2 and is skipped.",
      "Skip (⊘): Next player is skipped.",
      "Reverse (⇄): Direction of play flips.",
      "Say UNO when you have 1 card left or draw 2 as penalty!",
    ],
  },
  flip: {
    name: "UNO Flip", icon: "↕️", tag: "Two-sided deck",
    rules: [
      "Same as Classic, but the deck has a LIGHT and a DARK side.",
      "FLIP card: Flips the active side of the deck for everyone.",
      "Dark side uses Pink/Orange/Teal/Purple cards.",
      "Draw 5 (+5): Next player draws 5 and is skipped.",
      "Skip All (⊘⊘): You get to play again; everyone else is skipped.",
      "Wild Draw Color: Next player draws until they pull the chosen color.",
      "Wild All Hit: ALL opponents draw until they each pull the chosen color.",
    ],
  },
  progressive: {
    name: "Progressive UNO", icon: "📈", tag: "Stacking draws",
    rules: [
      "Same as Classic, with one key twist: DRAW CARDS STACK.",
      "If you're hit with +2, play another +2 to pass the stack along.",
      "If you're hit with +4, play another +4 to pass it along.",
      "If you can't or won't stack, you draw the ENTIRE accumulated total.",
      "You cannot stack +2 onto +4 or vice versa.",
    ],
  },
  seveno: {
    name: "Seven-O", icon: "7️⃣", tag: "Hand swapping",
    rules: [
      "Same as Classic, with two extra rules for 7 and 0 cards.",
      "Play a SEVEN: Choose any opponent and swap hands with them!",
      "Play a ZERO: All hands rotate in the direction of play.",
      "Use 7 strategically — give your full hand to someone else and steal their empty hand!",
    ],
  },
};

function RulesPanel({ variant, onClose }: { variant: Variant; onClose: () => void }) {
  const info = VARIANT_INFO[variant];
  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black text-white">{info.icon} {info.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
        </div>
        <p className="text-xs text-purple-400 mb-3 font-semibold uppercase tracking-widest">{info.tag}</p>
        <ul className="space-y-2">
          {info.rules.map((r, i) => (
            <li key={i} className="flex gap-2 text-sm text-gray-300">
              <span className="text-yellow-400 shrink-0 mt-0.5">✦</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <p className="text-xs text-yellow-300 font-semibold">Card Reference</p>
          <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-400">
            <span>⊘ Skip</span><span>⇄ Reverse</span><span>+2 Draw 2</span>
            <span>W Wild</span><span>+4 Wild Draw 4</span>
            {variant==="flip" && <><span>↕ Flip</span><span>+5 Draw 5</span><span>⊘⊘ Skip All</span><span>DC Draw Color</span></>}
            {variant==="seveno" && <span>7 = Swap • 0 = Rotate</span>}
          </div>
        </div>
        <button onClick={onClose} className="w-full mt-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-xl transition-colors">
          Got it! Play on 🃏
        </button>
      </div>
    </div>
  );
}

// ── Player setup ──────────────────────────────────────────────────────────────
type PlayerConfig = { name: string; isAI: boolean };

function PlayerSetup({ onStart, onBack }: { onStart: (configs: PlayerConfig[], variant: Variant) => void; onBack: () => void }) {
  const [count, setCount] = useState(2);
  const [variant, setVariant] = useState<Variant>("classic");
  const [players, setPlayers] = useState<PlayerConfig[]>(
    Array.from({ length: 8 }, (_, i) => ({ name: i === 0 ? "You" : `AI ${i}`, isAI: i > 0 }))
  );
  const [showRules, setShowRules] = useState(false);

  const updatePlayer = (i: number, patch: Partial<PlayerConfig>) =>
    setPlayers(p => p.map((pl, j) => j === i ? { ...pl, ...patch } : pl));

  return (
    <div className="min-h-screen bg-[#0d0d1f] flex flex-col">
      {showRules && <RulesPanel variant={variant} onClose={() => setShowRules(false)}/>}
      <header className="flex items-center gap-4 px-4 py-3 border-b border-red-500/30 bg-gradient-to-r from-red-950/60 to-transparent">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4"/><span className="text-sm">Hub</span>
        </Link>
        <span className="text-2xl">🃏</span>
        <h1 className="text-lg font-black text-red-400">UNO — Setup</h1>
      </header>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 max-w-lg mx-auto w-full">
        {/* Variant */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-2">Game Variant</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(VARIANT_INFO) as [Variant, typeof VARIANT_INFO[Variant]][]).map(([v, info]) => (
              <button key={v} onClick={() => setVariant(v)}
                className={`py-2 px-3 rounded-xl border text-left transition-colors ${variant===v ? "bg-purple-500/30 border-purple-400" : "bg-white/5 border-white/10 hover:border-white/20"}`}>
                <div className="font-black text-sm text-white">{info.icon} {info.name}</div>
                <div className="text-xs text-gray-400">{info.tag}</div>
              </button>
            ))}
          </div>
          <button onClick={() => setShowRules(true)} className="mt-2 text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
            <HelpCircle className="w-3 h-3"/> How does {VARIANT_INFO[variant].name} work?
          </button>
        </div>

        {/* Player count */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-2">Number of Players</p>
          <div className="flex gap-2 flex-wrap">
            {[2,3,4,5,6,7,8].map(n => (
              <button key={n} onClick={() => setCount(n)}
                className={`w-11 h-11 rounded-xl border font-black transition-colors ${count===n ? "bg-purple-500/40 border-purple-400 text-purple-300" : "bg-white/5 border-white/10 text-gray-400 hover:border-white/25"}`}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Player configs */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-2">Players</p>
          <div className="space-y-2">
            {players.slice(0, count).map((pl, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                <span className="text-lg w-7 text-center">{i === 0 ? "👤" : pl.isAI ? "🤖" : "👤"}</span>
                <input
                  value={pl.name}
                  onChange={e => updatePlayer(i, { name: e.target.value })}
                  className="flex-1 bg-transparent text-white font-semibold text-sm outline-none placeholder-gray-600"
                  placeholder={`Player ${i+1}`}
                  maxLength={12}
                />
                {i > 0 && (
                  <button onClick={() => updatePlayer(i, { isAI: !pl.isAI })}
                    className={`px-3 py-1 rounded-lg text-xs font-black border transition-colors ${pl.isAI ? "bg-blue-500/20 border-blue-500/50 text-blue-300" : "bg-green-500/20 border-green-500/50 text-green-300"}`}>
                    {pl.isAI ? "AI" : "Human"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onBack} className="px-5 py-3 text-sm text-gray-400 hover:text-white border border-white/10 rounded-xl">← Back</button>
          <button onClick={() => onStart(players.slice(0, count), variant)}
            className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-lg transition-colors">
            Deal Cards 🃏
          </button>
        </div>
      </div>
    </div>
  );
}

// ── UNO button / call tracker ─────────────────────────────────────────────────
function UnoCallButton({ onCall, deadline, maxTime, called }: {
  onCall: () => void; deadline: number; maxTime: number; called: boolean;
}) {
  const [localCalled, setLocalCalled] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 80);
    return () => clearInterval(id);
  }, []);

  const isDone = localCalled || called;
  const timeLeft = Math.max(0, deadline - Date.now());
  const pct = timeLeft / maxTime;
  const urgent = pct < 0.35 && !isDone;
  const r = 52, circ = 2 * Math.PI * r;

  const handleClick = () => {
    if (isDone) return;
    setLocalCalled(true);
    onCall();
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-40 flex items-end justify-center pb-36">
      <div className="pointer-events-auto flex flex-col items-center gap-3">
        {isDone ? (
          <div className="flex flex-col items-center gap-2">
            <div className="px-10 py-4 rounded-3xl font-black text-2xl text-black shadow-2xl shadow-green-400/60"
              style={{ background: "linear-gradient(135deg,#4ade80,#22c55e)", boxShadow: "0 0 40px rgba(74,222,128,0.7)" }}>
              ✓ UNO CALLED!
            </div>
            <span className="text-green-400 text-sm font-bold animate-bounce">Nice! 🎉</span>
          </div>
        ) : (
          <>
            <div className={`text-sm font-black uppercase tracking-widest px-4 py-1 rounded-full border ${
              urgent
                ? "text-red-300 border-red-500/60 bg-red-500/15 animate-pulse"
                : "text-yellow-300 border-yellow-500/50 bg-yellow-500/10"
            }`}>
              {urgent ? "⚠ Say UNO fast!" : "🔔 1 card left — say UNO!"}
            </div>
            <div className="relative" style={{ width: 136, height: 136 }}>
              <svg className="absolute inset-0 -rotate-90" width={136} height={136}>
                <circle cx={68} cy={68} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={10}/>
                <circle cx={68} cy={68} r={r} fill="none"
                  stroke={pct > 0.5 ? "#22c55e" : pct > 0.25 ? "#f59e0b" : "#ef4444"}
                  strokeWidth={10} strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
                  strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.08s linear, stroke 0.3s" }}/>
              </svg>
              <button
                onClick={handleClick}
                className={`absolute inset-2.5 rounded-full font-black text-3xl flex items-center justify-center transition-all select-none ${
                  urgent ? "text-white animate-pulse" : "text-black animate-bounce"
                }`}
                style={{
                  background: urgent
                    ? "linear-gradient(135deg,#ef4444,#dc2626)"
                    : "linear-gradient(135deg,#fde047,#facc15)",
                  boxShadow: urgent
                    ? "0 0 32px rgba(239,68,68,0.8), 0 4px 20px rgba(0,0,0,0.5)"
                    : "0 0 28px rgba(250,204,21,0.75), 0 4px 20px rgba(0,0,0,0.5)",
                }}
              >
                UNO!
              </button>
            </div>
            <span className="text-xs text-gray-400 font-medium">{(timeLeft / 1000).toFixed(1)}s left</span>
          </>
        )}
      </div>
    </div>
  );
}

// ── Pass-and-play interstitial ────────────────────────────────────────────────
function PassScreen({ name, onReveal }: { name: string; onReveal: () => void }) {
  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-center z-30 gap-6">
      <div className="text-6xl">🃏</div>
      <div className="text-center">
        <p className="text-gray-400 text-sm">Pass device to</p>
        <h2 className="text-3xl font-black text-white">{name}</h2>
      </div>
      <button onClick={onReveal}
        className="px-10 py-4 bg-purple-600 hover:bg-purple-500 text-white font-black text-xl rounded-2xl transition-colors">
        Show My Hand 👁
      </button>
      <p className="text-xs text-gray-500">Make sure nobody else is looking!</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
const UNO_TIMER = 3000;

export default function Uno() {
  const [screen, setScreen] = useState<"menu" | "setup" | "online-lobby" | "game">("menu");
  const [mode, setMode] = useState<"ai" | "online">("ai");
  const [gs, setGs] = useState<UnoState | null>(null);
  const [picking, setPicking] = useState(false);
  const [pendingWild, setPendingWild] = useState<Card | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [handRevealed, setHandRevealed] = useState(true);
  const [onlineView, setOnlineView] = useState<PlayerView | null>(null);
  // UNO call tracking
  const [unoCall, setUnoCall] = useState<{ playerIdx: number; deadline: number; called: boolean } | null>(null);
  const unoTimerRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const gsRef = useRef<UnoState | null>(null);
  gsRef.current = gs;

  // ── 8-player online hook ──────────────────────────────────────────────────
  const unoOnline = useUnoOnline({
    onGameStarted: useCallback((_variant: OnlineVariant) => {
      setScreen("game");
      setMsg(null); setPicking(false); setPendingWild(null); setUnoCall(null);
    }, []),
    onStateUpdate: useCallback((view: PlayerView) => {
      setOnlineView(view);
    }, []),
    onPlayerLeft: useCallback((_, name: string) => {
      setMsg(`${name} left the game`);
    }, []),
  });

  // Sync online view → fake UnoState for rendering
  useEffect(() => {
    if (mode !== "online" || !onlineView) return;
    const fakeGs: UnoState = {
      deck: Array.from({ length: onlineView.deckSize }, (_, i) => ({
        id: -(i + 500), color: "red" as Color, type: "number" as CardType, value: 0,
      })),
      hands: onlineView.handSizes.map((size, i) =>
        i === onlineView.myIdx
          ? (onlineView.myHand as Card[])
          : Array.from({ length: size }, (_, j) => ({
              id: -(i * 1000 + j + 5000), color: "red" as Color, type: "number" as CardType, value: 0,
            }))
      ),
      discard: [onlineView.topCard as Card],
      turn: onlineView.turn,
      direction: onlineView.direction,
      chosenColor: onlineView.chosenColor as Color | null,
      winner: onlineView.winner,
      playerCount: onlineView.names.length,
      isAI: onlineView.names.map(() => false),
      names: onlineView.names,
      variant: onlineView.variant as Variant,
      isFlipped: onlineView.isFlipped,
      stackedDraw: onlineView.stackedDraw,
      sevenSwap: onlineView.sevenSwap,
    };
    setGs(fakeGs);
  }, [onlineView, mode]);

  const showMsg = useCallback((m: string, dur = 2000) => {
    setMsg(m); setTimeout(() => setMsg(null), dur);
  }, []);

  // UNO timer
  const startUnoTimer = useCallback((pidx: number) => {
    if (unoTimerRef.current) clearTimeout(unoTimerRef.current);
    const deadline = Date.now() + UNO_TIMER;
    setUnoCall({ playerIdx: pidx, deadline, called: false });
    unoTimerRef.current = setTimeout(() => {
      setUnoCall(prev => {
        if (!prev || prev.called) return null;
        setGs(s => {
          if (!s) return s;
          let nd = [...s.deck];
          if (nd.length < 2 && s.discard.length > 1) nd = [...nd, ...shuffle(s.discard.slice(0,-1))];
          const newHands = s.hands.map((h, i) => i === prev.playerIdx ? [...h, ...nd.splice(0,2)] : h);
          showMsg(`${s.names[prev.playerIdx]} forgot to say UNO! +2 cards 😬`);
          return { ...s, deck: nd, hands: newHands };
        });
        return null;
      });
    }, UNO_TIMER);
  }, [showMsg]);

  // AI turn
  useEffect(() => {
    if (!gs || gs.winner !== null || mode !== "ai" || !gs.isAI[gs.turn]) return;
    if (gs.sevenSwap && gs.isAI[gs.turn]) {
      const target = gs.hands.reduce((best, h, i) =>
        i !== gs.turn && h.length > gs.hands[best].length ? i : best, (gs.turn + 1) % gs.playerCount);
      setGs(s => s ? applyPlay(s, s.discard[s.discard.length-1], null, target) : s);
      return;
    }
    setAiThinking(true);
    const id = setTimeout(() => {
      const s = gsRef.current;
      if (!s || !s.isAI[s.turn] || s.winner !== null) { setAiThinking(false); return; }
      const top = s.discard[s.discard.length-1];
      const card = pickAICard(s.hands[s.turn], top, s.chosenColor, s.variant, s.stackedDraw);
      if (card) {
        const color = card.color === "wild" ? pickAIColor(s.hands[s.turn], s.isFlipped) : null;
        const ns = applyPlay(s, card, color);
        if (ns.hands[s.turn].length === 1 && !ns.winner) {
          setTimeout(() => {
            setUnoCall(prev => prev?.playerIdx === s.turn ? { ...prev, called: true } : prev);
            showMsg(`${s.names[s.turn]} says UNO! 🔔`);
          }, 700 + Math.random()*500);
          startUnoTimer(s.turn);
        }
        setGs(ns);
      } else {
        setGs(applyForcedDraw(s));
      }
      setAiThinking(false);
    }, 750);
    return () => { clearTimeout(id); setAiThinking(false); };
  }, [gs?.turn, gs?.winner, gs?.sevenSwap, mode, showMsg, startUnoTimer]);

  // Pass screen for local multi-human
  useEffect(() => {
    if (!gs || gs.winner !== null) return;
    if (mode === "online") { setHandRevealed(true); return; }
    const isHuman = !gs.isAI[gs.turn];
    if (isHuman) {
      const humanCount = gs.isAI.filter(a => !a).length;
      if (humanCount > 1) setHandRevealed(false);
      else setHandRevealed(true);
    }
  }, [gs?.turn, gs?.winner, mode]);

  // Online: myIdx is always fixed to onlineView.myIdx
  const myIdx = mode === "online" ? (onlineView?.myIdx ?? -1) : (gs?.turn ?? 0);
  const viewIdx = mode === "ai" ? (gs?.turn ?? 0) : myIdx;

  const playCard = useCallback((card: Card) => {
    const s = gsRef.current;
    if (!s || s.winner !== null || picking) return;
    if (mode === "ai" && s.isAI[s.turn]) return;
    if (mode === "online" && s.turn !== myIdx) return;
    const top = s.discard[s.discard.length-1];
    if (!canPlay(card, top, s.chosenColor, s.variant, s.stackedDraw)) { showMsg("Can't play that card!"); return; }
    if (card.color === "wild") { setPendingWild(card); setPicking(true); return; }
    if (mode === "online") { unoOnline.playCard(card.id); return; }
    const ns = applyPlay(s, card, null);
    if (ns.hands[s.turn].length === 1 && !ns.winner && !ns.sevenSwap) startUnoTimer(s.turn);
    setGs(ns);
  }, [picking, myIdx, mode, unoOnline, showMsg, startUnoTimer]);

  const pickColor = useCallback((color: Color) => {
    const s = gsRef.current;
    if (!pendingWild || !s) return;
    if (mode === "online") {
      unoOnline.playCard(pendingWild.id, color as string);
    } else {
      const ns = applyPlay(s, pendingWild, color);
      if (ns.hands[s.turn].length === 1 && !ns.winner) startUnoTimer(s.turn);
      setGs(ns);
    }
    setPendingWild(null); setPicking(false);
  }, [pendingWild, mode, unoOnline, startUnoTimer]);

  const drawCard = useCallback(() => {
    const s = gsRef.current;
    if (!s || s.winner !== null) return;
    if (mode === "ai" && s.isAI[s.turn]) return;
    if (mode === "online" && s.turn !== myIdx) return;
    if (mode === "online") { unoOnline.drawCard(); return; }
    setGs(applyForcedDraw(s));
  }, [myIdx, mode, unoOnline]);

  const handleSevenSwap = useCallback((targetIdx: number) => {
    const s = gsRef.current;
    if (!s) return;
    if (mode === "online") { unoOnline.swapPick(targetIdx); return; }
    const ns = { ...s, sevenSwap: false };
    const newHands = [...ns.hands];
    const tmp = newHands[s.turn];
    newHands[s.turn] = newHands[targetIdx];
    newHands[targetIdx] = tmp;
    const nextTurn = (s.turn + s.direction + s.playerCount) % s.playerCount;
    setGs({ ...ns, hands: newHands, turn: nextTurn });
  }, [mode, unoOnline]);

  const callUno = useCallback(() => {
    setUnoCall(prev => {
      if (!prev) return null;
      showMsg("UNO! 🔔");
      return { ...prev, called: true };
    });
  }, [showMsg]);

  const startGame = useCallback((configs: PlayerConfig[], variant: Variant) => {
    const names = configs.map(c => c.name);
    const isAI  = configs.map(c => c.isAI);
    const newGs = initGame(configs.length, isAI, names, variant);
    setGs(newGs); setMode("ai"); setScreen("game");
    setMsg(null); setPicking(false); setPendingWild(null);
    setUnoCall(null); setHandRevealed(true);
    setShowHelp(true);
  }, []);

  // ── Screens ──────────────────────────────────────────────────────────────────
  if (screen === "menu") return (
    <div className="min-h-screen bg-[#0d0d1f] flex flex-col">
      <header className="flex items-center gap-4 px-4 py-3 border-b border-red-500/30 bg-gradient-to-r from-red-950/60 to-transparent">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4"/><span className="text-sm">Hub</span>
        </Link>
        <span className="text-2xl">🃏</span>
        <h1 className="text-lg font-black text-red-400">UNO</h1>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-6">
        <div className="flex gap-1">
          {["red","blue","green","yellow"].map((c,i) => (
            <div key={c} className="rounded-lg flex items-center justify-center font-black text-white shadow-xl"
              style={{ width:52, height:76, background:CARD_BG[c as Color], transform:`rotate(${(i-1.5)*8}deg)`, fontSize:22 }}>
              {i===0?"U":i===1?"N":i===2?"O":"!"}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button onClick={() => setScreen("setup")} className="w-full py-4 bg-red-600/30 hover:bg-red-600/50 border border-red-500/50 text-red-300 font-black rounded-2xl transition-colors text-lg">
            🎮 Local / vs AI
            <div className="text-xs font-normal text-gray-400 mt-1">1–8 players · Classic or variation</div>
          </button>
          <button onClick={() => { setMode("online"); setScreen("online-lobby"); }} className="w-full py-4 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/50 text-sky-400 font-black rounded-2xl transition-colors">
            🌐 Online Multiplayer
            <div className="text-xs font-normal text-gray-400 mt-1">2–8 real players · Real-time · All variants</div>
          </button>
        </div>
      </div>
    </div>
  );

  if (screen === "setup") return <PlayerSetup onStart={startGame} onBack={() => setScreen("menu")}/>;

  if (screen === "online-lobby") return (
    <div className="min-h-screen bg-[#0d0d1f] flex flex-col">
      <header className="flex items-center gap-4 px-4 py-3 border-b border-red-500/30">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white"><ArrowLeft className="h-4 w-4"/><span className="text-sm">Hub</span></Link>
        <span className="text-2xl">🃏</span>
        <h1 className="text-lg font-black text-red-400">UNO — Online</h1>
      </header>
      <div className="flex-1 flex items-center justify-center p-4">
        <UnoOnlineLobby
          status={unoOnline.status}
          roomCode={unoOnline.roomCode}
          myIdx={unoOnline.myIdx}
          isHost={unoOnline.isHost}
          players={unoOnline.players}
          error={unoOnline.error}
          onCreate={(name) => { setMode("online"); unoOnline.createRoom(name); }}
          onJoin={(code, name) => { setMode("online"); unoOnline.joinRoom(code, name); }}
          onStart={(variant) => unoOnline.startGame(variant as OnlineVariant)}
          onDisconnect={() => { unoOnline.disconnect(); setScreen("menu"); }}
          onBack={() => { unoOnline.disconnect(); setScreen("menu"); }}
        />
      </div>
    </div>
  );

  if (!gs) return (
    <div className="min-h-screen bg-[#0d0d1f] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin text-4xl">🃏</div>
        <p className="text-gray-400">{mode === "online" ? "Waiting for game to start…" : "Loading…"}</p>
        <button onClick={() => { unoOnline.disconnect(); setScreen("menu"); }} className="text-sm text-gray-400 hover:text-white">← Back</button>
      </div>
    </div>
  );

  // ── Game screen ──────────────────────────────────────────────────────────────
  const top = gs.discard[gs.discard.length-1];
  const activeColor = gs.chosenColor ?? top?.color;
  // In online mode, show my hand always; in AI mode, show active player's hand
  const isMyTurn = mode === "online" ? gs.turn === myIdx : !gs.isAI[gs.turn];
  const curPlayerIsHuman = mode === "online" ? (gs.turn === myIdx) : !gs.isAI[gs.turn];
  // My hand: in online show my fixed hand, in AI show active player's hand
  const myHand = mode === "online"
    ? (onlineView?.myHand as Card[] ?? gs.hands[myIdx] ?? [])
    : gs.hands[gs.turn];
  const unoNeeded = unoCall?.playerIdx === gs.turn && curPlayerIsHuman;

  // Opponents: everyone except viewIdx
  const opponents = gs.names
    .map((name, i) => ({ name, hand: gs.hands[i], idx: i, isAI: gs.isAI[i] }))
    .filter(p => p.idx !== viewIdx);

  // For seven-O swap: show picker when it's my turn and sevenSwap is active
  const showSwapPicker = gs.sevenSwap && (mode === "online" ? gs.turn === myIdx : !gs.isAI[gs.turn]);

  return (
    <div className="min-h-screen bg-[#0a0a18] flex flex-col select-none">
      {picking && <ColorPicker onPick={pickColor} isFlipped={gs.isFlipped}/>}
      {showSwapPicker && (
        <SwapPicker names={gs.names} currentIdx={viewIdx} onPick={handleSevenSwap}/>
      )}
      {showHelp && <RulesPanel variant={gs.variant} onClose={() => setShowHelp(false)}/>}
      {!handRevealed && curPlayerIsHuman && mode === "ai" && (
        <PassScreen name={gs.names[gs.turn]} onReveal={() => setHandRevealed(true)}/>
      )}
      {unoNeeded && <UnoCallButton onCall={callUno} deadline={unoCall!.deadline} maxTime={UNO_TIMER} called={unoCall!.called}/>}

      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-2.5 border-b border-red-900/40 bg-gray-950">
        <Link href="/" className="flex items-center gap-1.5 text-gray-500 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4"/><span className="text-xs">Hub</span>
        </Link>
        <span className="text-xl">🃏</span>
        <span className="text-sm font-black text-red-400 flex-1">UNO · {VARIANT_INFO[gs.variant].name}</span>
        {mode === "online" && (
          <span className="text-xs px-2 py-0.5 bg-sky-500/20 border border-sky-500/50 text-sky-300 rounded-full font-bold">
            🌐 Online · {gs.playerCount}P
          </span>
        )}
        {gs.isFlipped && <span className="text-xs px-2 py-0.5 bg-purple-500/20 border border-purple-500/50 text-purple-300 rounded-full font-bold">🌑 Dark Side</span>}
        <button onClick={() => setShowHelp(true)} className="text-gray-400 hover:text-white transition-colors">
          <HelpCircle className="w-5 h-5"/>
        </button>
      </header>

      {gs.winner !== null ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center p-6">
          <div className="text-6xl">🎉</div>
          <p className="text-4xl font-black text-yellow-300">{gs.names[gs.winner]} Wins!</p>
          {mode === "online" && gs.winner === myIdx && (
            <p className="text-lg text-green-400 font-bold">🏆 That's you!</p>
          )}
          <div className="flex gap-3 flex-wrap justify-center">
            <button onClick={() => {
              if (mode === "online") { unoOnline.disconnect(); setScreen("menu"); setGs(null); setOnlineView(null); }
              else { setScreen("setup"); setGs(null); }
            }} className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl transition-colors">
              {mode === "online" ? "← Menu" : "Play Again"}
            </button>
            <button onClick={() => { unoOnline.disconnect(); setScreen("menu"); setGs(null); setOnlineView(null); }}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-black rounded-xl transition-colors">
              Main Menu
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Opponents row */}
          <div className="flex gap-2 px-3 pt-2 pb-1 overflow-x-auto flex-wrap">
            {opponents.map(p => (
              <div key={p.idx} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold min-w-fit ${
                gs.turn === p.idx
                  ? "bg-yellow-500/15 border-yellow-500/50 text-yellow-300"
                  : "bg-gray-800/60 border-gray-700/50 text-gray-400"
              }`}>
                <span>{gs.turn === p.idx ? "▶" : (p.isAI ? "🤖" : "👤")}</span>
                <span className="max-w-[80px] truncate">{p.name}</span>
                <span className="text-gray-500">({p.hand.length})</span>
                <div className="flex gap-0.5 ml-1">
                  {p.hand.slice(0, Math.min(p.hand.length, 6)).map((_, ci) => (
                    <CardBack key={ci} small/>
                  ))}
                  {p.hand.length > 6 && <span className="text-gray-500 text-[10px] self-end">+{p.hand.length-6}</span>}
                </div>
              </div>
            ))}
            {aiThinking && <span className="text-xs text-gray-500 italic self-center">thinking…</span>}
          </div>

          {/* Center: deck & discard */}
          <div className="flex items-center justify-center gap-6 py-3 px-4">
            {/* Deck */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-gray-500">DECK ({gs.deck.length})</span>
              <div onClick={isMyTurn ? drawCard : undefined}
                className={`rounded-lg transition-transform ${isMyTurn ? "cursor-pointer hover:scale-105" : "opacity-60"}`}>
                <CardBack/>
              </div>
              {isMyTurn && <span className="text-xs text-gray-400">tap to draw</span>}
            </div>

            {/* Discard / status */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-gray-500">DISCARD</span>
              {top && (
                <div className="relative">
                  <UnoCard card={{ ...top, color: activeColor as Color }} />
                  {gs.chosenColor && top.color === "wild" && (
                    <div className="absolute -bottom-5 left-0 right-0 text-center text-xs font-black"
                      style={{ color: SYMBOL_COLOR[gs.chosenColor] }}>▲ {gs.chosenColor}</div>
                  )}
                </div>
              )}
            </div>

            {/* Game info */}
            <div className="flex flex-col items-center gap-2 min-w-[80px]">
              <div className={`text-xs font-black px-3 py-1.5 rounded-full text-center ${isMyTurn ? "bg-green-600/30 border border-green-500/60 text-green-400" : "bg-gray-800 text-gray-400 border border-gray-700"}`}>
                {isMyTurn ? "Your Turn" : `${gs.names[gs.turn]}'s\nTurn`}
              </div>
              <div className="text-xs text-gray-500">{gs.direction === 1 ? "↻ CW" : "↺ CCW"}</div>
              {gs.stackedDraw > 0 && (
                <div className="text-xs font-black text-red-400 animate-pulse bg-red-500/10 border border-red-500/30 px-2 py-1 rounded-lg">
                  Stack: +{gs.stackedDraw}!
                </div>
              )}
              {msg && <div className="text-xs text-yellow-400 font-semibold animate-bounce text-center max-w-[90px]">{msg}</div>}
            </div>
          </div>

          {/* Current player's hand */}
          <div className="flex-1 flex flex-col min-h-0 border-t border-gray-800 bg-gray-950">
            <div className="flex items-center gap-2 px-4 pt-2 pb-1">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                {mode === "online"
                  ? `YOUR HAND (${gs.names[myIdx] ?? "You"})`
                  : curPlayerIsHuman
                    ? (mode === "ai" ? `${gs.names[gs.turn]}'s Hand` : "YOUR HAND")
                    : `${gs.names[gs.turn]}'s Hand (hidden)`}
                {" "}({myHand.length})
              </span>
              {myHand.length === 1 && isMyTurn && (
                <span className="text-yellow-400 text-xs font-black animate-pulse">⚡ UNO!</span>
              )}
              {gs.stackedDraw > 0 && isMyTurn && (
                <span className="text-xs text-orange-400 ml-auto">Must stack or draw {gs.stackedDraw}</span>
              )}
            </div>
            <div className="flex-1 overflow-x-auto overflow-y-hidden">
              <div className="flex gap-1 px-3 pb-3 items-end min-w-max" style={{ minHeight: 120 }}>
                {myHand.map(card => {
                  const playable = isMyTurn && canPlay(card, top, gs.chosenColor, gs.variant, gs.stackedDraw);
                  return (
                    <UnoCard key={card.id} card={card}
                      faceDown={!curPlayerIsHuman && mode === "ai"}
                      onClick={playable ? () => playCard(card) : undefined}
                      disabled={!playable}
                      small={myHand.length > 12}/>
                  );
                })}
                {myHand.length === 0 && <p className="text-gray-500 italic text-sm self-center">No cards!</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
