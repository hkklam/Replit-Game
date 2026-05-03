import { useState, useCallback, useRef, forwardRef } from "react";
import { Link } from "wouter";

// ─── PALETTE ─────────────────────────────────────────────────────────────────
const PALETTE: { key: string; hex: string }[] = [
  { key: "red",    hex: "#ef4444" },
  { key: "blue",   hex: "#3b82f6" },
  { key: "green",  hex: "#22c55e" },
  { key: "orange", hex: "#f97316" },
  { key: "purple", hex: "#a855f7" },
  { key: "yellow", hex: "#fbbf24" },
  { key: "teal",   hex: "#2dd4bf" },
  { key: "pink",   hex: "#f472b6" },
  { key: "amber",  hex: "#d97706" },
  { key: "lime",   hex: "#a3e635" },
];
const COLOR_KEYS = PALETTE.map(p => p.key);
const COLOR_HEX  = Object.fromEntries(PALETTE.map(p => [p.key, p.hex]));
const CAP = 4;
const POUR_MS = 500;

// ─── LEVEL CONFIG ─────────────────────────────────────────────────────────────
// Difficulty rules:
//   More colors   → harder (more combinations to sort)
//   Fewer empties → harder (less room to maneuver)
// Progression: 2 empty = more forgiving, 1 empty = tight constraint
const LEVEL_CONFIGS = [
  { numColors: 3, numEmpty: 2 },  //  1  tutorial — very forgiving
  { numColors: 3, numEmpty: 2 },  //  2
  { numColors: 3, numEmpty: 2 },  //  3
  { numColors: 3, numEmpty: 1 },  //  4  easy — tighter
  { numColors: 4, numEmpty: 2 },  //  5  easy — more colors, room to breathe
  { numColors: 4, numEmpty: 2 },  //  6
  { numColors: 4, numEmpty: 2 },  //  7
  { numColors: 4, numEmpty: 1 },  //  8  medium — 4 colors, tight
  { numColors: 4, numEmpty: 1 },  //  9
  { numColors: 5, numEmpty: 2 },  // 10  medium — 5 colors, room
  { numColors: 5, numEmpty: 2 },  // 11
  { numColors: 5, numEmpty: 2 },  // 12
  { numColors: 5, numEmpty: 1 },  // 13  medium-hard — 5 colors, tight
  { numColors: 5, numEmpty: 1 },  // 14
  { numColors: 6, numEmpty: 2 },  // 15  hard — 6 colors
  { numColors: 6, numEmpty: 2 },  // 16
  { numColors: 6, numEmpty: 2 },  // 17
  { numColors: 6, numEmpty: 1 },  // 18  hard — 6 colors, tight
  { numColors: 6, numEmpty: 1 },  // 19
  { numColors: 7, numEmpty: 2 },  // 20  very hard — 7 colors
  { numColors: 7, numEmpty: 2 },  // 21
  { numColors: 7, numEmpty: 2 },  // 22
  { numColors: 7, numEmpty: 1 },  // 23  very hard — 7 colors, tight
  { numColors: 7, numEmpty: 1 },  // 24
  { numColors: 8, numEmpty: 2 },  // 25  expert — 8 colors
  { numColors: 8, numEmpty: 2 },  // 26
  { numColors: 8, numEmpty: 2 },  // 27
  { numColors: 8, numEmpty: 1 },  // 28  expert — 8 colors, tight
  { numColors: 9,  numEmpty: 2 },  // 29  master — 9 colors
  { numColors: 10, numEmpty: 2 },  // 30  max — 10 colors, full palette
  { numColors: 9,  numEmpty: 1 },  // 31  master tight
  { numColors: 10, numEmpty: 1 },  // 32  max tight
  { numColors: 8,  numEmpty: 1 },  // 33  expert refresh
  { numColors: 9,  numEmpty: 2 },  // 34
  { numColors: 9,  numEmpty: 1 },  // 35
  { numColors: 10, numEmpty: 2 },  // 36
  { numColors: 10, numEmpty: 1 },  // 37
  { numColors: 7,  numEmpty: 1 },  // 38  very hard loop
  { numColors: 8,  numEmpty: 2 },  // 39
  { numColors: 8,  numEmpty: 1 },  // 40
  { numColors: 9,  numEmpty: 2 },  // 41
  { numColors: 9,  numEmpty: 1 },  // 42
  { numColors: 10, numEmpty: 2 },  // 43
  { numColors: 10, numEmpty: 1 },  // 44
  { numColors: 8,  numEmpty: 1 },  // 45
  { numColors: 9,  numEmpty: 2 },  // 46
  { numColors: 9,  numEmpty: 1 },  // 47
  { numColors: 10, numEmpty: 2 },  // 48
  { numColors: 10, numEmpty: 1 },  // 49  penultimate
  { numColors: 10, numEmpty: 1 },  // 50  ultimate — all 10 colors, no mercy
];
const TOTAL_LEVELS = LEVEL_CONFIGS.length;
const INIT_UNDOS  = 3;
const STORAGE_KEY = "magic-sort-v2";

// ─── RNG ─────────────────────────────────────────────────────────────────────
function makeRng(seed: number) {
  let s = (seed | 1) >>> 0;
  return () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 0xffffffff; };
}
function shuffleArr<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ─── GAME LOGIC ──────────────────────────────────────────────────────────────
// Array model: index 0 = physical bottom, last index = physical top (poured first)
function topOf(b: string[]): string | null { return b.length > 0 ? b[b.length - 1] : null; }
function countTop(b: string[]): number {
  if (b.length === 0) return 0;
  const tc = b[b.length - 1]; let n = 0;
  for (let i = b.length - 1; i >= 0 && b[i] === tc; i--) n++;
  return n;
}
function isBottleDone(b: string[]): boolean {
  return b.length === 0 || (b.length === CAP && b.every(s => s === b[0]));
}
function isSolved(bottles: string[][]): boolean { return bottles.every(isBottleDone); }
function canPour(src: string[], dst: string[]): boolean {
  if (src.length === 0) return false;
  if (src.length === CAP && src.every(s => s === src[0])) return false;
  if (dst.length >= CAP) return false;
  if (dst.length === 0) return true;
  return topOf(src) === topOf(dst);
}
function applyPour(bottles: string[][], si: number, di: number): string[][] {
  const next = bottles.map(b => [...b]);
  const tc = topOf(next[si])!;
  while (next[si].length > 0 && topOf(next[si]) === tc && next[di].length < CAP) {
    next[di].push(next[si].pop()!);
  }
  return next;
}
function isSolvable(initial: string[][], limit = 60000): boolean {
  if (isSolved(initial)) return true;
  const visited = new Set<string>();
  const stack: string[][][] = [initial.map(b => [...b])];
  while (stack.length > 0 && visited.size < limit) {
    const state = stack.pop()!;
    const key = state.map(b => b.join(",")).join("|");
    if (visited.has(key)) continue;
    visited.add(key);
    if (isSolved(state)) return true;
    for (let si = 0; si < state.length; si++)
      for (let di = 0; di < state.length; di++)
        if (si !== di && canPour(state[si], state[di])) stack.push(applyPour(state, si, di));
  }
  return visited.size >= limit;
}
function generateLevel(levelIdx: number): string[][] {
  const { numColors, numEmpty } = LEVEL_CONFIGS[levelIdx];
  const bigLevel = numColors >= 5;
  for (let attempt = 0; attempt < 40; attempt++) {
    const rng = makeRng(levelIdx * 1013 + attempt * 37 + 9001);
    const pool: string[] = [];
    for (let i = 0; i < numColors; i++) for (let j = 0; j < CAP; j++) pool.push(COLOR_KEYS[i]);
    const shuffled = shuffleArr(pool, rng);
    const bottles: string[][] = [];
    for (let i = 0; i < numColors; i++) bottles.push(shuffled.slice(i * CAP, (i + 1) * CAP));
    for (let i = 0; i < numEmpty; i++) bottles.push([]);
    if (bigLevel) return bottles;
    if (isSolvable(bottles)) return bottles;
  }
  const bottles: string[][] = [];
  for (let i = 0; i < numColors; i++) bottles.push([COLOR_KEYS[i], COLOR_KEYS[i], COLOR_KEYS[i], COLOR_KEYS[i]]);
  for (let i = 0; i < numEmpty; i++) bottles.push([]);
  return bottles;
}

// ─── BOTTLE COMPONENT ────────────────────────────────────────────────────────
type BSize = "lg" | "md" | "sm";
const DIMS = {
  lg: { w: 56, segH: 50, neck: 20, neckW: 30, r: 14 },
  md: { w: 46, segH: 42, neck: 17, neckW: 24, r: 12 },
  sm: { w: 38, segH: 34, neck: 14, neckW: 20, r: 10 },
};

interface BottleProps {
  segments: string[];
  isSelected: boolean;
  isDone: boolean;
  isShaking: boolean;
  onClick: () => void;
  size: BSize;
  pourDir?: "left" | "right" | "down" | null;
  pourMs?: number;
}

// Segments: index 0 = physical bottom, last = physical top (what gets poured first).
// We render in REVERSE so top color is visually at the top (near neck), bottom color at the base.
const BottleView = forwardRef<HTMLDivElement, BottleProps>(function BottleView(
  { segments, isSelected, isDone, isShaking, onClick, size, pourDir, pourMs = POUR_MS },
  ref,
) {
  const d = DIMS[size];
  const bodyH = d.segH * CAP;
  const borderColor = isSelected
    ? "rgba(192,132,252,0.9)"
    : isDone
    ? "rgba(74,222,128,0.7)"
    : "rgba(255,255,255,0.18)";

  // Rendered top-to-bottom in the flex column = visual top first.
  // We reverse so [last] (logical top) appears near neck, [0] (logical bottom) at base.
  const rendered = [...segments].reverse();

  const animName = pourDir === "right" ? "ms-tilt-right"
    : pourDir === "left"  ? "ms-tilt-left"
    : pourDir === "down"  ? "ms-tilt-down"
    : isShaking           ? "ms-shake"
    : undefined;
  const animDur = isShaking ? "0.35s" : `${pourMs}ms`;

  return (
    <div
      ref={ref}
      onClick={onClick}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        cursor: "pointer", position: "relative",
        transform: !pourDir && isSelected ? "translateY(-16px)" : "none",
        transition: pourDir ? undefined : "transform 0.15s ease",
        animation: animName ? `${animName} ${animDur} ease` : undefined,
        paddingTop: 20,
      }}
    >
      {isDone && segments.length > 0 && (
        <div style={{ position: "absolute", top: 2, left: "50%", transform: "translateX(-50%)",
          fontSize: size === "lg" ? 13 : 11, color: "#4ade80",
          textShadow: "0 0 8px #4ade80", fontWeight: 900 }}>✓</div>
      )}
      {isSelected && !pourDir && (
        <div style={{ position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)",
          width: d.w * 0.8, height: 8, background: "rgba(192,132,252,0.5)",
          filter: "blur(8px)", borderRadius: "50%", pointerEvents: "none" }} />
      )}

      {/* Neck */}
      <div style={{ width: d.neckW, height: d.neck, border: `2px solid ${borderColor}`,
        borderBottom: "none", borderRadius: `${d.r / 2}px ${d.r / 2}px 0 0`,
        background: "rgba(255,255,255,0.02)", flexShrink: 0,
        boxShadow: isDone ? "0 0 10px rgba(74,222,128,0.2)" : undefined }} />

      {/* Body */}
      <div style={{ width: d.w, height: bodyH, border: `2px solid ${borderColor}`,
        borderTop: "none", borderRadius: `0 0 ${d.r}px ${d.r}px`,
        background: "rgba(8,4,24,0.6)", overflow: "hidden", position: "relative",
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
        boxShadow: isDone
          ? "0 0 18px rgba(74,222,128,0.2)"
          : isSelected
          ? "0 0 18px rgba(192,132,252,0.25)"
          : undefined,
        transition: "box-shadow 0.2s" }}>

        {/* Segments rendered top→bottom: rendered[0] = logical top (near neck), rendered[last] = logical bottom */}
        {rendered.map((color, i) => {
          const isTopSeg = i === 0; // first in reversed order = logical top = what gets poured
          return (
            <div key={i} style={{
              width: "100%", height: d.segH,
              background: COLOR_HEX[color],
              boxShadow: isTopSeg ? `0 -2px 10px ${COLOR_HEX[color]}90` : undefined,
              flexShrink: 0,
              transition: "background 0.15s ease",
            }} />
          );
        })}

        {/* Glass shine */}
        <div style={{ position: "absolute", top: 6, left: 6, width: size === "lg" ? 5 : 4,
          height: "50%", background: "linear-gradient(to bottom, rgba(255,255,255,0.26), transparent)",
          borderRadius: 3, pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 8, left: 14, width: 2, height: "25%",
          background: "linear-gradient(to bottom, rgba(255,255,255,0.12), transparent)",
          borderRadius: 2, pointerEvents: "none" }} />
      </div>
    </div>
  );
});

// ─── MENU / LEVEL SELECT ─────────────────────────────────────────────────────
function LevelSelect({ completed, onSelect }: { completed: Set<number>; onSelect: (idx: number) => void }) {
  const maxUnlocked = Math.min(TOTAL_LEVELS - 1, completed.size);
  return (
    <div style={{ minHeight: "100vh",
      background: "radial-gradient(ellipse at 50% 0%, #1e0a3c 0%, #0a0520 55%, #050012 100%)",
      color: "#fff", display: "flex", flexDirection: "column", alignItems: "center",
      padding: "16px 20px 40px" }}>
      <div style={{ alignSelf: "flex-start", marginBottom: 20 }}>
        <Link href="/"><span style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "6px 14px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>← Menu</span></Link>
      </div>
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{ fontSize: 60, marginBottom: 10, filter: "drop-shadow(0 0 30px #a855f7)" }}>🧪</div>
        <h1 style={{ fontSize: 40, fontWeight: 900, margin: 0, letterSpacing: "-1.5px",
          background: "linear-gradient(135deg, #c084fc 0%, #818cf8 50%, #38bdf8 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Magic Sort</h1>
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, margin: "6px 0 0" }}>Pour &amp; sort the potions</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 9,
        maxWidth: 420, width: "100%", marginBottom: 28 }}>
        {LEVEL_CONFIGS.map((cfg, idx) => {
          const done = completed.has(idx);
          const unlocked = idx <= maxUnlocked;
          const numE = cfg.numEmpty;
          const difficulty = cfg.numColors <= 3 ? "★" : cfg.numColors <= 5 ? "★★" : cfg.numColors <= 7 ? "★★★" : "★★★★";
          return (
            <button key={idx} onClick={() => unlocked && onSelect(idx)} style={{
              aspectRatio: "1", borderRadius: 10,
              border: `1.5px solid ${done ? "rgba(74,222,128,0.45)" : unlocked ? "rgba(167,139,250,0.3)" : "rgba(255,255,255,0.06)"}`,
              background: done ? "rgba(74,222,128,0.1)" : unlocked ? "rgba(167,139,250,0.08)" : "rgba(255,255,255,0.02)",
              color: done ? "#4ade80" : unlocked ? "#c4b5fd" : "rgba(255,255,255,0.18)",
              fontSize: 12, fontWeight: 700, cursor: unlocked ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexDirection: "column", gap: 2, transition: "background 0.15s, transform 0.1s", padding: 0 }}>
              {!unlocked ? "🔒" : done ? "✓" : idx + 1}
              {unlocked && (
                <span style={{ fontSize: 7, opacity: 0.45, fontWeight: 400, letterSpacing: 0 }}>
                  {cfg.numColors}c {numE}e
                </span>
              )}
              {unlocked && !done && (
                <span style={{ fontSize: 7, opacity: 0.4 }}>{difficulty}</span>
              )}
            </button>
          );
        })}
      </div>
      <div style={{ padding: "11px 26px", background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.09)", borderRadius: 14,
        color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
        {completed.size} / {TOTAL_LEVELS} completed
      </div>
    </div>
  );
}

// ─── WIN OVERLAY ─────────────────────────────────────────────────────────────
function WinOverlay({ levelIdx, moves, onNext, onMenu, onReplay }: {
  levelIdx: number; moves: number; onNext: () => void; onMenu: () => void; onReplay: () => void;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
      backdropFilter: "blur(8px)" }}>
      <div style={{ background: "linear-gradient(145deg, #1a0838, #0d0522)",
        border: "1.5px solid rgba(192,132,252,0.4)", borderRadius: 28, padding: "44px 52px",
        textAlign: "center", animation: "ms-celebrate 0.35s ease",
        boxShadow: "0 0 80px rgba(168,85,247,0.3), 0 30px 60px rgba(0,0,0,0.5)",
        maxWidth: 360, width: "90vw" }}>
        <div style={{ fontSize: 60, marginBottom: 14 }}>🎉</div>
        <h2 style={{ fontSize: 30, fontWeight: 900, margin: "0 0 8px",
          background: "linear-gradient(135deg, #c084fc, #818cf8)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Level Complete!</h2>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 15, margin: "0 0 30px" }}>
          Solved in <strong style={{ color: "#c084fc" }}>{moves}</strong> move{moves !== 1 ? "s" : ""}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {levelIdx + 1 < TOTAL_LEVELS && (
            <button onClick={onNext} style={{ padding: "13px 0",
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)", border: "none",
              borderRadius: 14, color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer",
              boxShadow: "0 4px 24px rgba(124,58,237,0.5)", letterSpacing: 0.3 }}>
              Next Level →
            </button>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onReplay} style={{ flex: 1, padding: "11px 0",
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 12, color: "rgba(255,255,255,0.65)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>↺ Replay</button>
            <button onClick={onMenu} style={{ flex: 1, padding: "11px 0",
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 12, color: "rgba(255,255,255,0.65)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Menu</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── POUR ANIMATION OVERLAY ───────────────────────────────────────────────────
interface PourAnim {
  srcIdx: number;
  color: string;
  count: number;
  srcX: number; srcY: number;
  dstX: number; dstY: number;
  dir: "left" | "right" | "down";
  key: number; // force re-mount to restart animation
}

function PourOverlay({ anim }: { anim: PourAnim }) {
  const midX = (anim.srcX + anim.dstX) / 2;
  // Arc control point: raised well above both bottles so liquid curves naturally
  const arcHeight = Math.max(70, Math.abs(anim.srcX - anim.dstX) * 0.5);
  const midY = Math.min(anim.srcY, anim.dstY) - arcHeight;
  const strokeW = Math.min(anim.count * 7 + 3, 24);
  const hex = COLOR_HEX[anim.color];

  return (
    <svg
      key={anim.key}
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 150, overflow: "visible" }}
      width="100%" height="100%"
    >
      <defs>
        <filter id="pour-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Glow arc (wider, blurred) */}
      <path
        d={`M ${anim.srcX} ${anim.srcY} Q ${midX} ${midY} ${anim.dstX} ${anim.dstY}`}
        stroke={hex}
        strokeWidth={strokeW + 8}
        fill="none" strokeLinecap="round" opacity={0.3}
        style={{
          strokeDasharray: 800,
          animation: `ms-pour-glow ${POUR_MS}ms ease-out forwards`,
        }}
      />
      {/* Main arc stream */}
      <path
        d={`M ${anim.srcX} ${anim.srcY} Q ${midX} ${midY} ${anim.dstX} ${anim.dstY}`}
        stroke={hex}
        strokeWidth={strokeW}
        fill="none" strokeLinecap="round"
        filter="url(#pour-glow)"
        style={{
          strokeDasharray: 800,
          animation: `ms-pour-stream ${POUR_MS}ms ease-out forwards`,
        }}
      />
      {/* Drip dot at destination */}
      <circle cx={anim.dstX} cy={anim.dstY} r={strokeW / 2} fill={hex} opacity={0}
        style={{ animation: `ms-pour-drip ${POUR_MS}ms ease-out forwards` }} />
    </svg>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
type Screen = "menu" | "game";

export default function MagicSort() {
  const [screen, setScreen]     = useState<Screen>("menu");
  const [levelIdx, setLevelIdx] = useState(0);
  const [bottles, setBottles]   = useState<string[][]>([]);
  const [initBottles, setInitBottles] = useState<string[][]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [undos, setUndos]       = useState(INIT_UNDOS);
  const [history, setHistory]   = useState<string[][][]>([]);
  const [moves, setMoves]       = useState(0);
  const [shaking, setShaking]   = useState<number | null>(null);
  const [won, setWon]           = useState(false);
  const [pourAnim, setPourAnim] = useState<PourAnim | null>(null);
  const animKeyRef              = useRef(0);

  // Refs to bottle DOM elements for position calculation
  const bottleRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [completed, setCompleted] = useState<Set<number>>(() => {
    try { const raw = localStorage.getItem(STORAGE_KEY); return new Set(raw ? JSON.parse(raw) as number[] : []); }
    catch { return new Set<number>(); }
  });
  const saveCompleted = useCallback((s: Set<number>) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...s])); } catch {}
  }, []);

  const startLevel = useCallback((idx: number) => {
    const lvl = generateLevel(idx);
    setLevelIdx(idx); setBottles(lvl); setInitBottles(lvl.map(b => [...b]));
    setSelected(null); setUndos(INIT_UNDOS); setHistory([]); setMoves(0);
    setWon(false); setShaking(null); setPourAnim(null); setScreen("game");
  }, []);

  const triggerPourAnim = useCallback((si: number, di: number, bottlesBefore: string[][]): void => {
    const srcEl = bottleRefs.current[si];
    const dstEl = bottleRefs.current[di];
    if (!srcEl || !dstEl) return;

    const srcRect = srcEl.getBoundingClientRect();
    const dstRect = dstEl.getBoundingClientRect();

    // Neck opening = top-center of the bottle element (accounting for paddingTop: 20)
    const srcX = srcRect.left + srcRect.width / 2;
    const srcY = srcRect.top + 20; // top of neck
    const dstX = dstRect.left + dstRect.width / 2;
    const dstY = dstRect.top + 20;

    const color = topOf(bottlesBefore[si])!;
    const count = countTop(bottlesBefore[si]);
    const dir: PourAnim["dir"] = dstX < srcX - 5 ? "left" : dstX > srcX + 5 ? "right" : "down";

    animKeyRef.current++;
    setPourAnim({ srcIdx: si, color, count, srcX, srcY, dstX, dstY, dir, key: animKeyRef.current });
    setTimeout(() => setPourAnim(null), POUR_MS + 80);
  }, []);

  const handleBottleClick = useCallback((idx: number) => {
    if (won) return;

    if (selected === null) {
      if (bottles[idx].length > 0) setSelected(idx);
      return;
    }
    if (selected === idx) { setSelected(null); return; }

    if (canPour(bottles[selected], bottles[idx])) {
      triggerPourAnim(selected, idx, bottles);
      const next = applyPour(bottles, selected, idx);
      setHistory(h => [...h, bottles]);
      setBottles(next);
      setMoves(m => m + 1);
      setSelected(null);
      if (isSolved(next)) {
        setWon(true);
        setCompleted(prev => { const u = new Set(prev); u.add(levelIdx); saveCompleted(u); return u; });
      }
    } else {
      setShaking(idx);
      setTimeout(() => setShaking(s => s === idx ? null : s), 400);
      if (bottles[idx].length > 0) setSelected(idx);
      else setSelected(null);
    }
  }, [bottles, selected, won, levelIdx, saveCompleted, triggerPourAnim]);

  const handleUndo = useCallback(() => {
    if (history.length === 0 || undos <= 0) return;
    setBottles(history[history.length - 1]);
    setHistory(h => h.slice(0, -1));
    setMoves(m => Math.max(0, m - 1));
    setUndos(u => u - 1);
    setSelected(null); setWon(false); setPourAnim(null);
  }, [history, undos]);

  const handleRestart = useCallback(() => {
    setBottles(initBottles.map(b => [...b]));
    setSelected(null); setUndos(INIT_UNDOS); setHistory([]);
    setMoves(0); setWon(false); setShaking(null); setPourAnim(null);
  }, [initBottles]);

  if (screen === "menu") return <LevelSelect completed={completed} onSelect={startLevel} />;

  const numBottles  = bottles.length;
  const bottleSize: BSize = numBottles <= 6 ? "lg" : numBottles <= 9 ? "md" : "sm";
  const gapSize    = bottleSize === "lg" ? 14 : bottleSize === "md" ? 10 : 8;
  const rowMax     = numBottles <= 5 ? numBottles : numBottles <= 10 ? Math.ceil(numBottles / 2) : Math.ceil(numBottles / 3);
  const { numColors } = LEVEL_CONFIGS[levelIdx];

  return (
    <div style={{ minHeight: "100vh",
      background: "radial-gradient(ellipse at 50% 0%, #1e0a3c 0%, #0a0520 55%, #050012 100%)",
      color: "#fff", display: "flex", flexDirection: "column", alignItems: "center",
      userSelect: "none", overflowX: "hidden" }}>

      <style>{`
        @keyframes ms-shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-7px); }
          40%      { transform: translateX(7px); }
          60%      { transform: translateX(-4px); }
          80%      { transform: translateX(4px); }
        }
        @keyframes ms-celebrate {
          0%   { transform: scale(0.85) translateY(16px); opacity: 0; }
          100% { transform: scale(1)    translateY(0);    opacity: 1; }
        }
        /* Tilt source bottle toward destination */
        @keyframes ms-tilt-right {
          0%   { transform: translateY(-16px) rotate(0deg); }
          18%  { transform: translateY(-22px) rotate(32deg) translateX(6px); }
          72%  { transform: translateY(-22px) rotate(32deg) translateX(6px); }
          100% { transform: translateY(0)     rotate(0deg); }
        }
        @keyframes ms-tilt-left {
          0%   { transform: translateY(-16px) rotate(0deg); }
          18%  { transform: translateY(-22px) rotate(-32deg) translateX(-6px); }
          72%  { transform: translateY(-22px) rotate(-32deg) translateX(-6px); }
          100% { transform: translateY(0)     rotate(0deg); }
        }
        @keyframes ms-tilt-down {
          0%   { transform: translateY(-16px); }
          20%  { transform: translateY(-26px); }
          75%  { transform: translateY(-26px); }
          100% { transform: translateY(0); }
        }
        /* Pour arc animations */
        @keyframes ms-pour-stream {
          0%   { stroke-dashoffset: 800; opacity: 1; }
          65%  { stroke-dashoffset: 0;   opacity: 1; }
          85%  { stroke-dashoffset: 0;   opacity: 0.6; }
          100% { stroke-dashoffset: 0;   opacity: 0; }
        }
        @keyframes ms-pour-glow {
          0%   { stroke-dashoffset: 800; opacity: 0.35; }
          65%  { stroke-dashoffset: 0;   opacity: 0.3; }
          100% { stroke-dashoffset: 0;   opacity: 0; }
        }
        @keyframes ms-pour-drip {
          0%   { opacity: 0; transform: scale(0); }
          60%  { opacity: 0; }
          75%  { opacity: 1; transform: scale(1.4); }
          100% { opacity: 0; transform: scale(0.6); }
        }
      `}</style>

      {/* Pour animation overlay */}
      {pourAnim && <PourOverlay anim={pourAnim} />}

      {won && (
        <WinOverlay levelIdx={levelIdx} moves={moves}
          onNext={() => startLevel(levelIdx + 1)}
          onMenu={() => setScreen("menu")}
          onReplay={handleRestart}
        />
      )}

      {/* Header */}
      <div style={{ width: "100%", maxWidth: 640, padding: "14px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
        <button onClick={() => setScreen("menu")} style={{ background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.11)", borderRadius: 9,
          color: "rgba(255,255,255,0.55)", padding: "5px 13px", fontSize: 13, cursor: "pointer" }}>
          ← Menu
        </button>
        <div style={{ textAlign: "center", lineHeight: 1.2 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 1 }}>Level</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#c084fc" }}>{levelIdx + 1}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{numColors} colors</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 1 }}>Moves</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "rgba(255,255,255,0.7)" }}>{moves}</div>
        </div>
      </div>

      {/* Bottles */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "20px 16px", width: "100%", gap: gapSize }}>
        {Array.from({ length: Math.ceil(numBottles / rowMax) }, (_, rowIdx) => {
          const start = rowIdx * rowMax;
          const rowBottles = bottles.slice(start, start + rowMax);
          return (
            <div key={rowIdx} style={{ display: "flex", gap: gapSize, justifyContent: "center", flexWrap: "wrap" }}>
              {rowBottles.map((b, i) => {
                const globalIdx = start + i;
                const isPourSrc = pourAnim?.srcIdx === globalIdx;
                const tiltDir = isPourSrc ? pourAnim!.dir : undefined;
                return (
                  <BottleView
                    key={globalIdx}
                    ref={el => { bottleRefs.current[globalIdx] = el; }}
                    segments={b}
                    isSelected={selected === globalIdx}
                    isDone={isBottleDone(b)}
                    isShaking={shaking === globalIdx}
                    onClick={() => handleBottleClick(globalIdx)}
                    size={bottleSize}
                    pourDir={tiltDir}
                    pourMs={POUR_MS}
                  />
                );
              })}
            </div>
          );
        })}
        {!won && (
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", marginTop: 8, textAlign: "center" }}>
            {selected === null ? "Tap a bottle to select" : "Tap another bottle to pour"}
          </p>
        )}
      </div>

      {/* Controls */}
      <div style={{ padding: "14px 20px 30px", display: "flex", gap: 10,
        justifyContent: "center", width: "100%",
        borderTop: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 }}>
        <button onClick={handleUndo} disabled={history.length === 0 || undos <= 0}
          style={{ padding: "10px 20px", background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.11)", borderRadius: 12,
            color: history.length === 0 || undos <= 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.65)",
            fontWeight: 600, fontSize: 14,
            cursor: history.length === 0 || undos <= 0 ? "not-allowed" : "pointer", transition: "color 0.15s" }}>
          ↩ Undo ({undos})
        </button>
        <button onClick={handleRestart}
          style={{ padding: "10px 20px", background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.11)", borderRadius: 12,
            color: "rgba(255,255,255,0.65)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
          ↺ Restart
        </button>
        {levelIdx + 1 < TOTAL_LEVELS && (
          <button onClick={() => startLevel(levelIdx + 1)}
            style={{ padding: "10px 20px", background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12,
              color: "rgba(255,255,255,0.35)", fontWeight: 500, fontSize: 13, cursor: "pointer" }}>
            Skip →
          </button>
        )}
      </div>
    </div>
  );
}
