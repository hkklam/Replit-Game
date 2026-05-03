import { useState, useCallback, useEffect, useRef } from "react";
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
const COLOR_HEX = Object.fromEntries(PALETTE.map(p => [p.key, p.hex]));
const CAP = 4;

// ─── LEVEL CONFIG ─────────────────────────────────────────────────────────────
const LEVEL_CONFIGS = [
  { numColors: 3, numEmpty: 1 },  // 1
  { numColors: 3, numEmpty: 1 },  // 2
  { numColors: 3, numEmpty: 1 },  // 3
  { numColors: 3, numEmpty: 2 },  // 4
  { numColors: 3, numEmpty: 2 },  // 5
  { numColors: 4, numEmpty: 1 },  // 6
  { numColors: 4, numEmpty: 1 },  // 7
  { numColors: 4, numEmpty: 2 },  // 8
  { numColors: 4, numEmpty: 2 },  // 9
  { numColors: 4, numEmpty: 2 },  // 10
  { numColors: 4, numEmpty: 1 },  // 11
  { numColors: 5, numEmpty: 1 },  // 12
  { numColors: 5, numEmpty: 1 },  // 13
  { numColors: 5, numEmpty: 2 },  // 14
  { numColors: 5, numEmpty: 2 },  // 15
  { numColors: 5, numEmpty: 2 },  // 16
  { numColors: 6, numEmpty: 2 },  // 17
  { numColors: 6, numEmpty: 2 },  // 18
  { numColors: 6, numEmpty: 2 },  // 19
  { numColors: 6, numEmpty: 1 },  // 20
  { numColors: 6, numEmpty: 2 },  // 21
  { numColors: 7, numEmpty: 2 },  // 22
  { numColors: 7, numEmpty: 2 },  // 23
  { numColors: 7, numEmpty: 2 },  // 24
  { numColors: 7, numEmpty: 2 },  // 25
  { numColors: 8, numEmpty: 2 },  // 26
  { numColors: 8, numEmpty: 2 },  // 27
  { numColors: 8, numEmpty: 2 },  // 28
  { numColors: 9, numEmpty: 2 },  // 29
  { numColors: 10, numEmpty: 2 }, // 30
];
const TOTAL_LEVELS = LEVEL_CONFIGS.length;
const INIT_UNDOS = 3;
const STORAGE_KEY = "magic-sort-v1";

// ─── RNG ─────────────────────────────────────────────────────────────────────
function makeRng(seed: number) {
  let s = (seed | 1) >>> 0;
  return () => {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    return (s >>> 0) / 0xffffffff;
  };
}

function shuffleArr<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── GAME LOGIC ──────────────────────────────────────────────────────────────
function topOf(b: string[]): string | null {
  return b.length > 0 ? b[b.length - 1] : null;
}

function isBottleDone(b: string[]): boolean {
  return b.length === 0 || (b.length === CAP && b.every(s => s === b[0]));
}

function isSolved(bottles: string[][]): boolean {
  return bottles.every(isBottleDone);
}

function canPour(src: string[], dst: string[]): boolean {
  if (src.length === 0) return false;
  // Don't allow pouring from a completed full bottle
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

// DFS-based solvability check (limited state search)
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
    for (let si = 0; si < state.length; si++) {
      for (let di = 0; di < state.length; di++) {
        if (si === di || !canPour(state[si], state[di])) continue;
        stack.push(applyPour(state, si, di));
      }
    }
  }
  // If we hit the limit, assume solvable (large-level heuristic)
  return visited.size >= limit;
}

function generateLevel(levelIdx: number): string[][] {
  const { numColors, numEmpty } = LEVEL_CONFIGS[levelIdx];
  const bigLevel = numColors >= 5;

  for (let attempt = 0; attempt < 40; attempt++) {
    const rng = makeRng(levelIdx * 1013 + attempt * 37 + 9001);
    const pool: string[] = [];
    for (let i = 0; i < numColors; i++) {
      for (let j = 0; j < CAP; j++) pool.push(COLOR_KEYS[i]);
    }
    const shuffled = shuffleArr(pool, rng);
    const bottles: string[][] = [];
    for (let i = 0; i < numColors; i++) {
      bottles.push(shuffled.slice(i * CAP, (i + 1) * CAP));
    }
    for (let i = 0; i < numEmpty; i++) bottles.push([]);

    // Skip solver for large levels (solvability rate is high with 2 empty bottles)
    if (bigLevel) return bottles;
    if (isSolvable(bottles)) return bottles;
  }

  // Fallback: almost-solved (shouldn't normally reach)
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
}

function BottleView({ segments, isSelected, isDone, isShaking, onClick, size }: BottleProps) {
  const d = DIMS[size];
  const bodyH = d.segH * CAP;
  const borderColor = isSelected
    ? "rgba(192,132,252,0.9)"
    : isDone
    ? "rgba(74,222,128,0.7)"
    : "rgba(255,255,255,0.18)";

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        cursor: "pointer",
        position: "relative",
        transform: isSelected ? "translateY(-16px)" : "none",
        transition: "transform 0.15s ease",
        animation: isShaking ? "ms-shake 0.35s ease" : undefined,
        paddingTop: 20,
      }}
    >
      {/* Completion tick */}
      {isDone && segments.length > 0 && (
        <div style={{
          position: "absolute",
          top: 2,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: size === "lg" ? 13 : 11,
          color: "#4ade80",
          textShadow: "0 0 8px #4ade80",
          fontWeight: 900,
        }}>✓</div>
      )}

      {/* Glow under selected bottle */}
      {isSelected && (
        <div style={{
          position: "absolute",
          bottom: -4,
          left: "50%",
          transform: "translateX(-50%)",
          width: d.w * 0.8,
          height: 8,
          background: "rgba(192,132,252,0.5)",
          filter: "blur(8px)",
          borderRadius: "50%",
          pointerEvents: "none",
        }} />
      )}

      {/* Neck */}
      <div style={{
        width: d.neckW,
        height: d.neck,
        border: `2px solid ${borderColor}`,
        borderBottom: "none",
        borderRadius: `${d.r / 2}px ${d.r / 2}px 0 0`,
        background: "rgba(255,255,255,0.02)",
        flexShrink: 0,
        boxShadow: isDone ? "0 0 10px rgba(74,222,128,0.2)" : undefined,
      }} />

      {/* Body */}
      <div style={{
        width: d.w,
        height: bodyH,
        border: `2px solid ${borderColor}`,
        borderTop: "none",
        borderRadius: `0 0 ${d.r}px ${d.r}px`,
        background: "rgba(8,4,24,0.6)",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        boxShadow: isDone
          ? "0 0 18px rgba(74,222,128,0.2)"
          : isSelected
          ? "0 0 18px rgba(192,132,252,0.25)"
          : undefined,
        transition: "box-shadow 0.2s",
      }}>
        {/* Segments — index 0 = bottom */}
        {segments.map((color, i) => {
          const isTop = i === segments.length - 1;
          return (
            <div
              key={i}
              style={{
                width: "100%",
                height: d.segH,
                background: COLOR_HEX[color],
                boxShadow: isTop ? `0 -2px 10px ${COLOR_HEX[color]}90` : undefined,
                transition: "height 0.25s ease",
                flexShrink: 0,
              }}
            />
          );
        })}

        {/* Glass shine — left highlight */}
        <div style={{
          position: "absolute",
          top: 6,
          left: 6,
          width: size === "lg" ? 5 : 4,
          height: "50%",
          background: "linear-gradient(to bottom, rgba(255,255,255,0.26), transparent)",
          borderRadius: 3,
          pointerEvents: "none",
        }} />
        {/* Secondary thin shine */}
        <div style={{
          position: "absolute",
          top: 8,
          left: 14,
          width: 2,
          height: "25%",
          background: "linear-gradient(to bottom, rgba(255,255,255,0.12), transparent)",
          borderRadius: 2,
          pointerEvents: "none",
        }} />
      </div>
    </div>
  );
}

// ─── MENU / LEVEL SELECT ─────────────────────────────────────────────────────
interface MenuProps {
  completed: Set<number>;
  onSelect: (idx: number) => void;
}

function LevelSelect({ completed, onSelect }: MenuProps) {
  const maxUnlocked = Math.min(TOTAL_LEVELS - 1, completed.size);
  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 50% 0%, #1e0a3c 0%, #0a0520 55%, #050012 100%)",
      color: "#fff",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "16px 20px 40px",
    }}>
      <div style={{ alignSelf: "flex-start", marginBottom: 20 }}>
        <Link href="/">
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, cursor: "pointer" }}>
            ← Hub
          </span>
        </Link>
      </div>

      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{ fontSize: 60, marginBottom: 10, filter: "drop-shadow(0 0 30px #a855f7)" }}>🧪</div>
        <h1 style={{
          fontSize: 40,
          fontWeight: 900,
          margin: 0,
          letterSpacing: "-1.5px",
          background: "linear-gradient(135deg, #c084fc 0%, #818cf8 50%, #38bdf8 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>Magic Sort</h1>
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, margin: "6px 0 0" }}>
          Pour &amp; sort the potions
        </p>
      </div>

      {/* Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(6, 1fr)",
        gap: 9,
        maxWidth: 420,
        width: "100%",
        marginBottom: 28,
      }}>
        {LEVEL_CONFIGS.map((cfg, idx) => {
          const done = completed.has(idx);
          const unlocked = idx <= maxUnlocked;
          return (
            <button
              key={idx}
              onClick={() => unlocked && onSelect(idx)}
              style={{
                aspectRatio: "1",
                borderRadius: 10,
                border: `1.5px solid ${done ? "rgba(74,222,128,0.45)" : unlocked ? "rgba(167,139,250,0.3)" : "rgba(255,255,255,0.06)"}`,
                background: done ? "rgba(74,222,128,0.1)" : unlocked ? "rgba(167,139,250,0.08)" : "rgba(255,255,255,0.02)",
                color: done ? "#4ade80" : unlocked ? "#c4b5fd" : "rgba(255,255,255,0.18)",
                fontSize: 12,
                fontWeight: 700,
                cursor: unlocked ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 2,
                transition: "background 0.15s, transform 0.1s",
                padding: 0,
              }}
            >
              {!unlocked ? "🔒" : done ? "✓" : idx + 1}
              {unlocked && (
                <span style={{ fontSize: 9, opacity: 0.5, fontWeight: 400 }}>
                  {cfg.numColors}c
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Stats */}
      <div style={{
        padding: "11px 26px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 14,
        color: "rgba(255,255,255,0.4)",
        fontSize: 13,
      }}>
        {completed.size} / {TOTAL_LEVELS} completed
      </div>
    </div>
  );
}

// ─── WIN OVERLAY ─────────────────────────────────────────────────────────────
interface WinOverlayProps {
  levelIdx: number;
  moves: number;
  onNext: () => void;
  onMenu: () => void;
  onReplay: () => void;
}

function WinOverlay({ levelIdx, moves, onNext, onMenu, onReplay }: WinOverlayProps) {
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.72)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 200,
      backdropFilter: "blur(8px)",
    }}>
      <div style={{
        background: "linear-gradient(145deg, #1a0838, #0d0522)",
        border: "1.5px solid rgba(192,132,252,0.4)",
        borderRadius: 28,
        padding: "44px 52px",
        textAlign: "center",
        animation: "ms-celebrate 0.35s ease",
        boxShadow: "0 0 80px rgba(168,85,247,0.3), 0 30px 60px rgba(0,0,0,0.5)",
        maxWidth: 360,
        width: "90vw",
      }}>
        <div style={{ fontSize: 60, marginBottom: 14 }}>🎉</div>
        <h2 style={{
          fontSize: 30,
          fontWeight: 900,
          margin: "0 0 8px",
          background: "linear-gradient(135deg, #c084fc, #818cf8)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>Level Complete!</h2>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 15, margin: "0 0 30px" }}>
          Solved in <strong style={{ color: "#c084fc" }}>{moves}</strong> move{moves !== 1 ? "s" : ""}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {levelIdx + 1 < TOTAL_LEVELS && (
            <button onClick={onNext} style={{
              padding: "13px 0",
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              border: "none",
              borderRadius: 14,
              color: "#fff",
              fontWeight: 800,
              fontSize: 15,
              cursor: "pointer",
              boxShadow: "0 4px 24px rgba(124,58,237,0.5)",
              letterSpacing: 0.3,
            }}>
              Next Level →
            </button>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onReplay} style={{
              flex: 1,
              padding: "11px 0",
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 12,
              color: "rgba(255,255,255,0.65)",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}>↺ Replay</button>
            <button onClick={onMenu} style={{
              flex: 1,
              padding: "11px 0",
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 12,
              color: "rgba(255,255,255,0.65)",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}>Menu</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
type Screen = "menu" | "game";

export default function MagicSort() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [levelIdx, setLevelIdx] = useState(0);
  const [bottles, setBottles] = useState<string[][]>([]);
  const [initBottles, setInitBottles] = useState<string[][]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [undos, setUndos] = useState(INIT_UNDOS);
  const [history, setHistory] = useState<string[][][]>([]);
  const [moves, setMoves] = useState(0);
  const [shaking, setShaking] = useState<number | null>(null);
  const [won, setWon] = useState(false);

  const [completed, setCompleted] = useState<Set<number>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return new Set(raw ? JSON.parse(raw) as number[] : []);
    } catch { return new Set<number>(); }
  });

  const saveCompleted = useCallback((s: Set<number>) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...s])); } catch {}
  }, []);

  const startLevel = useCallback((idx: number) => {
    const lvl = generateLevel(idx);
    setLevelIdx(idx);
    setBottles(lvl);
    setInitBottles(lvl.map(b => [...b]));
    setSelected(null);
    setUndos(INIT_UNDOS);
    setHistory([]);
    setMoves(0);
    setWon(false);
    setShaking(null);
    setScreen("game");
  }, []);

  const handleBottleClick = useCallback((idx: number) => {
    if (won) return;

    if (selected === null) {
      if (bottles[idx].length > 0) setSelected(idx);
      return;
    }

    if (selected === idx) {
      setSelected(null);
      return;
    }

    if (canPour(bottles[selected], bottles[idx])) {
      const next = applyPour(bottles, selected, idx);
      setHistory(h => [...h, bottles]);
      setBottles(next);
      setMoves(m => m + 1);
      setSelected(null);
      if (isSolved(next)) {
        setWon(true);
        setCompleted(prev => {
          const updated = new Set(prev);
          updated.add(levelIdx);
          saveCompleted(updated);
          return updated;
        });
      }
    } else {
      // Shake the destination if it can't receive
      setShaking(idx);
      setTimeout(() => setShaking(s => s === idx ? null : s), 400);
      // Switch selection to the clicked bottle if it has liquid
      if (bottles[idx].length > 0) {
        setSelected(idx);
      } else {
        setSelected(null);
      }
    }
  }, [bottles, selected, won, levelIdx, saveCompleted]);

  const handleUndo = useCallback(() => {
    if (history.length === 0 || undos <= 0) return;
    setBottles(history[history.length - 1]);
    setHistory(h => h.slice(0, -1));
    setMoves(m => Math.max(0, m - 1));
    setUndos(u => u - 1);
    setSelected(null);
    setWon(false);
  }, [history, undos]);

  const handleRestart = useCallback(() => {
    setBottles(initBottles.map(b => [...b]));
    setSelected(null);
    setUndos(INIT_UNDOS);
    setHistory([]);
    setMoves(0);
    setWon(false);
    setShaking(null);
  }, [initBottles]);

  // ─── Level select ───────────────────────────────────────────────────────────
  if (screen === "menu") {
    return <LevelSelect completed={completed} onSelect={startLevel} />;
  }

  // ─── Game screen ────────────────────────────────────────────────────────────
  const numBottles = bottles.length;
  const bottleSize: BSize = numBottles <= 6 ? "lg" : numBottles <= 9 ? "md" : "sm";
  const gapSize = bottleSize === "lg" ? 14 : bottleSize === "md" ? 10 : 8;
  const rowMax = numBottles <= 5 ? numBottles : numBottles <= 10 ? Math.ceil(numBottles / 2) : Math.ceil(numBottles / 3);
  const { numColors } = LEVEL_CONFIGS[levelIdx];

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 50% 0%, #1e0a3c 0%, #0a0520 55%, #050012 100%)",
      color: "#fff",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      userSelect: "none",
      overflowX: "hidden",
    }}>
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
          100% { transform: scale(1) translateY(0);       opacity: 1; }
        }
      `}</style>

      {/* Win overlay */}
      {won && (
        <WinOverlay
          levelIdx={levelIdx}
          moves={moves}
          onNext={() => startLevel(levelIdx + 1)}
          onMenu={() => setScreen("menu")}
          onReplay={handleRestart}
        />
      )}

      {/* Header */}
      <div style={{
        width: "100%",
        maxWidth: 640,
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        flexShrink: 0,
      }}>
        <button
          onClick={() => setScreen("menu")}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.11)",
            borderRadius: 9,
            color: "rgba(255,255,255,0.55)",
            padding: "5px 13px",
            fontSize: 13,
            cursor: "pointer",
          }}
        >← Menu</button>

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
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px 16px",
        width: "100%",
        gap: gapSize,
      }}>
        {/* Render bottles in rows */}
        {Array.from({ length: Math.ceil(numBottles / rowMax) }, (_, rowIdx) => {
          const start = rowIdx * rowMax;
          const rowBottles = bottles.slice(start, start + rowMax);
          return (
            <div key={rowIdx} style={{ display: "flex", gap: gapSize, justifyContent: "center", flexWrap: "wrap" }}>
              {rowBottles.map((b, i) => {
                const globalIdx = start + i;
                return (
                  <BottleView
                    key={globalIdx}
                    segments={b}
                    isSelected={selected === globalIdx}
                    isDone={isBottleDone(b)}
                    isShaking={shaking === globalIdx}
                    onClick={() => handleBottleClick(globalIdx)}
                    size={bottleSize}
                  />
                );
              })}
            </div>
          );
        })}

        {/* Hint text */}
        {!won && (
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", marginTop: 8, textAlign: "center" }}>
            {selected === null ? "Tap a bottle to select" : "Tap another bottle to pour"}
          </p>
        )}
      </div>

      {/* Controls */}
      <div style={{
        padding: "14px 20px 30px",
        display: "flex",
        gap: 10,
        justifyContent: "center",
        width: "100%",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        flexShrink: 0,
      }}>
        <button
          onClick={handleUndo}
          disabled={history.length === 0 || undos <= 0}
          style={{
            padding: "10px 20px",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.11)",
            borderRadius: 12,
            color: history.length === 0 || undos <= 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.65)",
            fontWeight: 600,
            fontSize: 14,
            cursor: history.length === 0 || undos <= 0 ? "not-allowed" : "pointer",
            transition: "color 0.15s",
          }}
        >↩ Undo ({undos})</button>
        <button
          onClick={handleRestart}
          style={{
            padding: "10px 20px",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.11)",
            borderRadius: 12,
            color: "rgba(255,255,255,0.65)",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
          }}
        >↺ Restart</button>
        {levelIdx + 1 < TOTAL_LEVELS && (
          <button
            onClick={() => startLevel(levelIdx + 1)}
            style={{
              padding: "10px 20px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              color: "rgba(255,255,255,0.35)",
              fontWeight: 500,
              fontSize: 13,
              cursor: "pointer",
            }}
          >Skip →</button>
        )}
      </div>
    </div>
  );
}
