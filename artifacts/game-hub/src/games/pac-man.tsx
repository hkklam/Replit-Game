import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

/* ── Shell ───────────────────────────────────────────────── */
function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-4 px-4 py-3 border-b border-amber-500/30 bg-gradient-to-r from-amber-950/60 to-transparent">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /><span className="text-sm">Hub</span>
        </Link>
        <span className="text-2xl select-none" style={{ filter: "drop-shadow(0 0 8px #fbbf2480)" }}>👾</span>
        <h1 className="text-lg font-bold text-amber-400">{title}</h1>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-2 gap-2">{children}</div>
    </div>
  );
}

/* ── Difficulty config ───────────────────────────────────── */
type Diff = "easy" | "normal" | "hard";
const DIFF_CFG: Record<Diff, {
  pacSpd: number; ghostSpd: number; chaseChance: number;
  label: string; emoji: string; desc: string; color: string;
}> = {
  easy:   { pacSpd: 2.3,  ghostSpd: 1.1,  chaseChance: 0.30, label: "Easy",   emoji: "🟢", desc: "Slow ghosts · mostly random",  color: "#34d399" },
  normal: { pacSpd: 2.65, ghostSpd: 1.75, chaseChance: 0.72, label: "Normal", emoji: "🟡", desc: "Balanced · smart hunters",       color: "#facc15" },
  hard:   { pacSpd: 3.1,  ghostSpd: 2.45, chaseChance: 1.00, label: "Hard",   emoji: "🔴", desc: "Full speed · always hunting",    color: "#ef4444" },
};

/* ── Constants ───────────────────────────────────────────── */
const CELL = 24, COLS = 20, ROWS = 22;
const CW = COLS * CELL, CH = ROWS * CELL;
const SCARED_TOTAL = 310;
const DX = [1, 0, -1, 0] as const;
const DY = [0, 1, 0, -1] as const;
const GHOST_CLRS  = ["#ef4444", "#f472b6", "#22d3ee", "#fb923c"] as const;
const GHOST_NAMES = ["Blinky",  "Pinky",   "Inky",    "Clyde"  ] as const;

function opp(d: number) { return (d + 2) % 4; }
function cellCol(px: number) { return Math.floor(px / CELL); }
function cellRow(py: number) { return Math.floor(py / CELL); }
function ccx(c: number) { return c * CELL + CELL / 2; }
function ccy(r: number) { return r * CELL + CELL / 2; }

function passable(grid: string[][], r: number, c: number, ghost = false) {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
  const ch = grid[r][c];
  if (ch === "#") return false;
  if (!ghost && (ch === " " || ch === "G")) return false;
  return true;
}

/* ── Map data ────────────────────────────────────────────── */
type MapCfg = { raw: string[]; ghosts: [number, number][]; name: string };
type MapSize = "simple" | "normal" | "complex";

// Ghost-pen rows 7–14 are shared across all maps
const PEN = [
  "####.###   ###.#####",
  "#####.# GG   #.#####",
  "#####.# #### #.#####",
  "#####.#      #.#####",
  "#####.#   GG #.#####",
  "#####.# #### #.#####",
  "#####.#      #.#####",
  "####.###   ###.#####",
] as const;

const MAPS: Record<MapSize, MapCfg> = {
  // Simple – wide-open corridors, very few walls, small maze space
  simple: {
    name: "Simple", ghosts: [[8,8],[8,9],[11,10],[11,11]],
    raw: [
      "####################",
      "#p................p#",
      "#..................#",
      "#P.................#",
      "#..................#",
      "#..................#",
      "#..................#",
      ...PEN,
      "#..................#",
      "#..................#",
      "#..................#",
      "#..................#",
      "#..................#",
      "#p...............p.#",
      "####################",
    ],
  },
  // Normal – balanced wall density, classic layout, medium maze space
  normal: {
    name: "Normal", ghosts: [[8,8],[8,9],[11,10],[11,11]],
    raw: [
      "####################",
      "#p.......#.......p.#",
      "#.######.#.######..#",
      "#P.................#",
      "#.######.#.######..#",
      "#..................#",
      "#.##.#...#...#.##..#",
      ...PEN,
      "#.##.#...#...#.##..#",
      "#..................#",
      "#.######.#.######..#",
      "#...............p..#",
      "##.###.###.###.###.#",
      "#p.................#",
      "####################",
    ],
  },
  // Complex – many walls, tight corridors, large maze space
  complex: {
    name: "Complex", ghosts: [[8,8],[8,9],[11,10],[11,11]],
    raw: [
      "####################",
      "#p.#...#.....#...p.#",
      "#.##.##.#.#.##.##..#",
      "#P.................#",
      "#.##.##.#.#.##.##..#",
      "#..#...#.....#...#.#",
      "#.##.#...#...#.##..#",
      ...PEN,
      "#.##.#...#...#.##..#",
      "#..#...#.....#...#.#",
      "#.##.##.#.#.##.##..#",
      "#p.#...#.....#...p.#",
      "#.###.###.###.###..#",
      "#p.................#",
      "####################",
    ],
  },
};

/* ── Types ───────────────────────────────────────────────── */
type Pac = {
  px: number; py: number; dir: number; want: number;
  lives: number; score: number; alive: boolean;
  spawnPx: number; spawnPy: number;
};
type Ghost = {
  px: number; py: number; dir: number; scared: boolean;
  // `decided` prevents the oscillation bug: ghost only makes one decision per
  // cell-center visit instead of being snapped back every frame
  decided: boolean;
  color: string; name: string; personality: number;
  spawnPx: number; spawnPy: number;
};
type GS = {
  mode: "1p" | "2p"; diff: Diff; grid: string[][];
  p1: Pac; p2: Pac;
  ghosts: Ghost[];
  dots: Set<string>; pellets: Set<string>;
  scared: number; mapName: string;
};

/* ── Init ────────────────────────────────────────────────── */
function initGame(mode: "1p" | "2p", mapSize: MapSize, diff: Diff): GS {
  const cfg = MAPS[mapSize];
  const dots = new Set<string>(), pellets = new Set<string>();
  let p1r = 3, p1c = 1;

  const grid = cfg.raw.map((row, r) =>
    row.split("").map((ch, c) => {
      if (ch === "P") { p1r = r; p1c = c; return "."; }
      if (ch === "p") { pellets.add(`${r},${c}`); dots.add(`${r},${c}`); return "."; }
      if (ch === ".") { dots.add(`${r},${c}`); return "."; }
      return ch;
    })
  );

  const ghosts: Ghost[] = cfg.ghosts.map(([gr, gc], i) => ({
    px: ccx(gc), py: ccy(gr), dir: i % 2 === 0 ? 0 : 2,
    scared: false, decided: false,
    color: GHOST_CLRS[i], name: GHOST_NAMES[i],
    personality: i, spawnPx: ccx(gc), spawnPy: ccy(gr),
  }));

  const mkPac = (r: number, c: number, d: number): Pac => ({
    px: ccx(c), py: ccy(r), dir: d, want: d, lives: 3, score: 0, alive: true,
    spawnPx: ccx(c), spawnPy: ccy(r),
  });

  return {
    mode, diff, grid, dots, pellets, scared: 0, mapName: cfg.name,
    p1: mkPac(p1r, p1c, 0),
    p2: mkPac(20, 10, 2),
    ghosts,
  };
}

/* ── Smooth movement ─────────────────────────────────────── */
// SNAP threshold scales with speed so turning feels the same at all difficulties
function moveEntity(
  px: number, py: number, dir: number, want: number,
  speed: number, grid: string[][], ghost = false
): { px: number; py: number; dir: number } {
  const THRESH = speed + 1.3;
  const c = cellCol(px), r = cellRow(py);
  const cx = ccx(c), cy = ccy(r);

  if (Math.abs(px - cx) < THRESH && Math.abs(py - cy) < THRESH) {
    if (want !== dir) {
      const nc = c + DX[want], nr = r + DY[want];
      if (passable(grid, nr, nc, ghost)) {
        dir = want; px = cx; py = cy;
      }
    }
    const fc = c + DX[dir], fr = r + DY[dir];
    if (!passable(grid, fr, fc, ghost)) return { px: cx, py: cy, dir };
  }

  let npx = px + DX[dir] * speed;
  let npy = py + DY[dir] * speed;
  if (npx < 0) npx = CW - 1;
  if (npx >= CW) npx = 0;
  return { px: npx, py: npy, dir };
}

/* ── Ghost AI ────────────────────────────────────────────── */
function ghostTarget(gh: Ghost, p1: Pac, frame: number, diff: Diff): { tr: number; tc: number } {
  const pr = cellRow(p1.py), pc = cellCol(p1.px);

  if (gh.scared) {
    return { tr: pr > ROWS / 2 ? 0 : ROWS - 1, tc: pc > COLS / 2 ? 0 : COLS - 1 };
  }

  // Randomise below chaseChance threshold (easy/normal only)
  if (Math.random() >= DIFF_CFG[diff].chaseChance) {
    return { tr: Math.floor(Math.random() * ROWS), tc: Math.floor(Math.random() * COLS) };
  }

  const lookAhead = diff === "hard" ? 6 : 4;

  switch (gh.personality) {
    case 0: // Blinky – always direct chase
      return { tr: pr, tc: pc };

    case 1: // Pinky – intercept ahead of pac
      return {
        tr: Math.max(0, Math.min(ROWS - 1, pr + DY[p1.dir] * lookAhead)),
        tc: Math.max(0, Math.min(COLS - 1, pc + DX[p1.dir] * lookAhead)),
      };

    case 2: // Inky – erratic on easy/normal; flanks from opposite side on hard
      if (diff === "hard") {
        const midR = Math.floor(ROWS / 2), midC = Math.floor(COLS / 2);
        return {
          tr: Math.max(0, Math.min(ROWS - 1, midR * 2 - pr)),
          tc: Math.max(0, Math.min(COLS - 1, midC * 2 - pc)),
        };
      }
      return Math.sin(frame * 0.07) > 0
        ? { tr: pr, tc: pc }
        : { tr: ROWS - 1 - pr, tc: COLS - 1 - pc };

    case 3: { // Clyde – scatter to corner when very close, chase when far
      const dist = (cellRow(gh.py) - pr) ** 2 + (cellCol(gh.px) - pc) ** 2;
      const thresh = diff === "hard" ? 9 : 64; // hard = rarely scatters
      return dist < thresh ? { tr: ROWS - 1, tc: 0 } : { tr: pr, tc: pc };
    }

    default: return { tr: pr, tc: pc };
  }
}

// Ghost movement with proper wall constraints:
// 1. Decisions are made once per cell-center arrival (`decided` flag prevents oscillation)
// 2. Reverse allowed only as a last resort (dead-end)
// 3. Current direction validated before moving — catches any invalid state
// 4. Hard wall-clamp after move — ghost is snapped back if it would enter a wall cell
function moveGhost(gh: Ghost, p1: Pac, grid: string[][], frame: number, ghostSpd: number, diff: Diff) {
  const c = cellCol(gh.px), r = cellRow(gh.py);
  const cx = ccx(c), cy = ccy(r);
  const THRESH = ghostSpd + 1.3;
  const nearCenter = Math.abs(gh.px - cx) < THRESH && Math.abs(gh.py - cy) < THRESH;

  if (nearCenter && !gh.decided) {
    gh.decided = true;
    gh.px = cx; gh.py = cy;

    const { tr, tc } = ghostTarget(gh, p1, frame, diff);
    const oppD = opp(gh.dir);

    // Prefer not to reverse — but allow it as the only fallback at a dead-end
    let valid = [0, 1, 2, 3].filter(d => d !== oppD && passable(grid, r + DY[d], c + DX[d], true));
    if (!valid.length) valid = [oppD].filter(d => passable(grid, r + DY[d], c + DX[d], true));

    if (valid.length) {
      gh.dir = gh.scared
        ? valid[Math.floor(Math.random() * valid.length)]
        : valid.reduce((best, d) => {
            const an = (c + DX[d] - tc) ** 2 + (r + DY[d] - tr) ** 2;
            const ab = (c + DX[best] - tc) ** 2 + (r + DY[best] - tr) ** 2;
            return an < ab ? d : best;
          });
    }
  } else if (!nearCenter) {
    gh.decided = false;
  }

  // Safety valve: if somehow the current direction is blocked, find any open direction
  // This prevents the ghost from tunnelling through walls in any edge-case state.
  if (!passable(grid, r + DY[gh.dir], c + DX[gh.dir], true)) {
    const rescue = [0, 1, 2, 3].find(d => passable(grid, r + DY[d], c + DX[d], true));
    if (rescue !== undefined) { gh.dir = rescue; }
    gh.px = cx; gh.py = cy; gh.decided = false;
    return;
  }

  const npx = gh.px + DX[gh.dir] * ghostSpd;
  const npy = gh.py + DY[gh.dir] * ghostSpd;

  // Hard wall-clamp: reject the move if the new pixel position falls inside a wall cell
  if (!passable(grid, cellRow(npy), cellCol(npx), true)) {
    gh.px = cx; gh.py = cy; gh.decided = false;
    return;
  }

  gh.px = npx;
  gh.py = npy;
}

/* ── Drawing ─────────────────────────────────────────────── */
function drawAll(ctx: CanvasRenderingContext2D, s: GS, frame: number) {
  ctx.fillStyle = "#03040f";
  ctx.fillRect(0, 0, CW, CH);

  ctx.strokeStyle = "rgba(255,255,255,0.018)";
  ctx.lineWidth = 0.5;
  for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, CH); ctx.stroke(); }
  for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(CW, r * CELL); ctx.stroke(); }

  s.grid.forEach((row, r) => row.forEach((_, c) => {
    const key = `${r},${c}`;
    if (!s.dots.has(key)) return;
    const x = ccx(c), y = ccy(r);
    if (s.pellets.has(key)) {
      const pulse = 1 + 0.22 * Math.sin(frame * 0.13);
      ctx.save();
      ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 16;
      const g = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, 8 * pulse);
      g.addColorStop(0, "#fff9c4"); g.addColorStop(0.5, "#fde68a"); g.addColorStop(1, "#f59e0b");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, 8 * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else {
      ctx.save();
      ctx.shadowColor = "#a5b4fc"; ctx.shadowBlur = 4;
      ctx.fillStyle = "#c7d2fe";
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }));

  // Wall fill — "#" = maze wall, " "/"G" = ghost pen (also impassable for pac-man)
  s.grid.forEach((row, r) => row.forEach((cell, c) => {
    if (cell === "#") {
      ctx.fillStyle = "#0d1540";
      ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
    } else if (cell === " " || cell === "G") {
      // Ghost pen interior — slightly different shade so it's visually distinct from open space
      ctx.fillStyle = "#07112e";
      ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
    }
  }));

  // Wall neon edge lines for "#" cells
  s.grid.forEach((row, r) => row.forEach((cell, c) => {
    if (cell !== "#") return;
    const x = c * CELL, y = r * CELL;
    ctx.save();
    ctx.shadowColor = "#818cf8"; ctx.shadowBlur = 7;
    ctx.strokeStyle = "#4f46e5"; ctx.lineWidth = 2;
    const line = (x1: number, y1: number, x2: number, y2: number) => {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    };
    if (s.grid[r - 1]?.[c] !== "#") line(x + 1, y + 1, x + CELL - 1, y + 1);
    if (s.grid[r + 1]?.[c] !== "#") line(x + 1, y + CELL - 1, x + CELL - 1, y + CELL - 1);
    if (s.grid[r]?.[c - 1] !== "#") line(x + 1, y + 1, x + 1, y + CELL - 1);
    if (s.grid[r]?.[c + 1] !== "#") line(x + CELL - 1, y + 1, x + CELL - 1, y + CELL - 1);
    ctx.restore();
  }));

  // Ghost-house gate — pink glowing line at every edge between the ghost pen and open corridor.
  // This makes the entrance visible so players know pac-man can't pass through it.
  s.grid.forEach((row, r) => row.forEach((cell, c) => {
    if (cell !== " " && cell !== "G") return;
    const x = c * CELL, y = r * CELL;
    ctx.save();
    ctx.strokeStyle = "#f472b6"; ctx.lineWidth = 2.5;
    ctx.shadowColor = "#ec4899"; ctx.shadowBlur = 8;
    const isPen = (nr: number, nc: number) => {
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return true;
      return s.grid[nr][nc] === "#" || s.grid[nr][nc] === " " || s.grid[nr][nc] === "G";
    };
    // Draw a gate segment on any edge that faces open (passable) space
    if (!isPen(r - 1, c)) { ctx.beginPath(); ctx.moveTo(x + 1, y);        ctx.lineTo(x + CELL - 1, y);        ctx.stroke(); }
    if (!isPen(r + 1, c)) { ctx.beginPath(); ctx.moveTo(x + 1, y + CELL); ctx.lineTo(x + CELL - 1, y + CELL); ctx.stroke(); }
    if (!isPen(r, c - 1)) { ctx.beginPath(); ctx.moveTo(x, y + 1);        ctx.lineTo(x, y + CELL - 1);        ctx.stroke(); }
    if (!isPen(r, c + 1)) { ctx.beginPath(); ctx.moveTo(x + CELL, y + 1); ctx.lineTo(x + CELL, y + CELL - 1); ctx.stroke(); }
    ctx.restore();
  }));

  // Ghosts
  s.ghosts.forEach(gh => {
    const { px, py, dir, scared, color } = gh;
    const R = CELL / 2 - 2;
    const BUMPS = 3;
    const bumpW = (R * 2) / BUMPS;
    const bumpH = 3.8;
    const phase = frame * 0.14;
    const skirtY = py + R - 1;

    const fillColor = scared ? (frame % 40 < 22 ? "#312e81" : "#4c1d95") : color;

    ctx.save();
    ctx.shadowColor = scared ? "#4f46e5" : color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = fillColor;

    ctx.beginPath();
    ctx.arc(px, py - 2, R, Math.PI, 0);
    ctx.lineTo(px + R, skirtY);
    for (let i = 0; i < BUMPS; i++) {
      const bx = px + R - bumpW * (i + 0.5);
      const by = skirtY - bumpH * (1 + 0.4 * Math.sin(phase + i * 1.15));
      const ex = px + R - bumpW * (i + 1);
      ctx.quadraticCurveTo(bx, by, ex, skirtY);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    if (!scared) {
      const ex = DX[dir] * 1.5, ey = DY[dir] * 1.5;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.ellipse(px - 3.5, py - 3, 3.2, 4.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(px + 3.5, py - 3, 3.2, 4.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1e3a8a";
      ctx.beginPath(); ctx.arc(px - 3.5 + ex, py - 3 + ey, 2.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(px + 3.5 + ex, py - 3 + ey, 2.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#bfdbfe";
      ctx.beginPath(); ctx.arc(px - 3.5 + ex + 0.8, py - 3 + ey - 0.8, 0.9, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(px + 3.5 + ex + 0.8, py - 3 + ey - 0.8, 0.9, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeStyle = "#a5b4fc"; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px - 5, py - 1);
      for (let i = 0; i <= 10; i++) ctx.lineTo(px - 5 + i, py - 1 + (i % 2 === 0 ? -2 : 2));
      ctx.stroke();
    }

    if (!scared) {
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.font = "bold 7px monospace";
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.fillText(gh.name, px, py + R + 9);
      ctx.restore();
    }
  });

  // Pac-man
  const drawPac = (pac: Pac, baseColor: string, hiColor: string) => {
    if (!pac.alive) return;
    const { px, py, dir } = pac;
    const mouthOpen = Math.max(0.06, Math.abs(Math.sin(frame * 0.2)) * 0.48);
    const angle = Math.atan2(DY[dir], DX[dir]);
    const R = CELL / 2 - 2;

    const g = ctx.createRadialGradient(px - R * 0.3, py - R * 0.35, 1, px, py, R);
    g.addColorStop(0, hiColor);
    g.addColorStop(0.55, baseColor);
    g.addColorStop(1, "#78350f");

    ctx.save();
    ctx.shadowColor = baseColor; ctx.shadowBlur = 18;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, R, angle + mouthOpen, angle + Math.PI * 2 - mouthOpen);
    ctx.closePath();
    ctx.fill();
    const eyeAngle = dir === 2 ? angle + Math.PI * 0.42 : angle - Math.PI * 0.42;
    ctx.fillStyle = "#1a1a2e";
    ctx.beginPath();
    ctx.arc(px + Math.cos(eyeAngle) * R * 0.55, py + Math.sin(eyeAngle) * R * 0.55, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  drawPac(s.p1, "#facc15", "#fef9c3");
  if (s.mode === "2p") drawPac(s.p2, "#ec4899", "#fce7f3");
}

/* ── D-pad ───────────────────────────────────────────────── */
function DPadBtn({ label, onStart, className }: { label: string; onStart: () => void; className?: string }) {
  return (
    <button
      className={`flex items-center justify-center w-14 h-14 bg-slate-700/80 active:bg-slate-500 rounded-xl text-2xl select-none touch-manipulation border border-slate-600 ${className ?? ""}`}
      onPointerDown={e => { e.preventDefault(); onStart(); }}
    >
      {label}
    </button>
  );
}

/* ── Component ───────────────────────────────────────────── */
export default function PacMan() {
  const cv       = useRef<HTMLCanvasElement>(null);
  const gs       = useRef<GS>(initGame("1p", "normal", "normal"));
  const frameRef = useRef(0);
  const raf      = useRef(0);
  const swipe    = useRef<{ x: number; y: number } | null>(null);

  const [screen,   setScreen]   = useState<"menu" | "game">("menu");
  const [result,   setResult]   = useState<"idle" | "dead" | "win">("idle");
  const [gMode,    setGMode]    = useState<"1p" | "2p">("1p");
  const [diff,     setDiff]     = useState<Diff>("normal");
  const [mapSize,  setMapSize]  = useState<MapSize>("normal");
  const [mapName,  setMapName]  = useState("Normal");
  const [p1Score,  setP1Score]  = useState(0);
  const [p2Score,  setP2Score]  = useState(0);
  const [p1Lives,  setP1Lives]  = useState(3);
  const [p2Lives,  setP2Lives]  = useState(3);

  const loop = useCallback(() => {
    const s = gs.current;
    const cfg = DIFF_CFG[s.diff];
    const frame = ++frameRef.current;
    const ctx = cv.current?.getContext("2d");

    const movePac = (pac: Pac) => {
      if (!pac.alive) return;
      const mv = moveEntity(pac.px, pac.py, pac.dir, pac.want, cfg.pacSpd, s.grid);
      pac.px = mv.px; pac.py = mv.py; pac.dir = mv.dir;

      const key = `${cellRow(pac.py)},${cellCol(pac.px)}`;
      if (s.dots.has(key)) {
        s.dots.delete(key);
        if (s.pellets.has(key)) {
          pac.score += 50; s.pellets.delete(key);
          s.scared = SCARED_TOTAL;
          s.ghosts.forEach(gh => { gh.scared = true; });
        } else {
          pac.score += 10;
        }
        if (pac === s.p1) setP1Score(s.p1.score); else setP2Score(s.p2.score);
      }
    };

    movePac(s.p1);
    if (s.mode === "2p") movePac(s.p2);

    if (s.dots.size === 0) {
      if (ctx) drawAll(ctx, s, frame);
      setResult("win"); return;
    }

    if (s.scared > 0) { s.scared--; if (s.scared === 0) s.ghosts.forEach(gh => { gh.scared = false; }); }

    s.ghosts.forEach(gh => moveGhost(gh, s.p1, s.grid, frame, cfg.ghostSpd, s.diff));

    const checkHit = (pac: Pac) => {
      if (!pac.alive) return;
      s.ghosts.forEach(gh => {
        if (cellRow(gh.py) !== cellRow(pac.py) || cellCol(gh.px) !== cellCol(pac.px)) return;
        if (gh.scared) {
          gh.px = gh.spawnPx; gh.py = gh.spawnPy; gh.scared = false; gh.decided = false;
          pac.score += 200;
          if (pac === s.p1) setP1Score(s.p1.score); else setP2Score(s.p2.score);
        } else {
          pac.lives--;
          if (pac === s.p1) setP1Lives(pac.lives); else setP2Lives(pac.lives);
          if (pac.lives <= 0) pac.alive = false;
          else { pac.px = pac.spawnPx; pac.py = pac.spawnPy; pac.dir = 0; pac.want = 0; }
        }
      });
    };

    checkHit(s.p1);
    if (s.mode === "2p") checkHit(s.p2);

    if (ctx) drawAll(ctx, s, frame);

    const allDead = !s.p1.alive && (s.mode === "1p" || !s.p2.alive);
    if (allDead) { setResult("dead"); return; }

    raf.current = requestAnimationFrame(loop);
  }, []);

  const startGame = useCallback((m: "1p" | "2p", d: Diff, ms: MapSize) => {
    cancelAnimationFrame(raf.current);
    gs.current = initGame(m, ms, d);
    frameRef.current = 0;
    setMapName(gs.current.mapName);
    setGMode(m); setDiff(d); setMapSize(ms);
    setP1Score(0); setP2Score(0);
    setP1Lives(3); setP2Lives(3);
    setResult("idle");
    raf.current = requestAnimationFrame(loop);
  }, [loop]);

  const setWant = useCallback((dir: number, player: 1 | 2 = 1) => {
    if (player === 1) gs.current.p1.want = dir;
    else gs.current.p2.want = dir;
  }, []);

  useEffect(() => {
    if (screen !== "game") return;
    const onKey = (e: KeyboardEvent) => {
      const m1: Record<string, number> = { ArrowRight: 0, ArrowDown: 1, ArrowLeft: 2, ArrowUp: 3 };
      const m2: Record<string, number> = { d: 0, s: 1, a: 2, w: 3 };
      if (m1[e.key] !== undefined) { setWant(m1[e.key], 1); e.preventDefault(); }
      if (m2[e.key] !== undefined) { setWant(m2[e.key], 2); e.preventDefault(); }
    };
    const el = cv.current;
    const onTS = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0]; swipe.current = { x: t.clientX, y: t.clientY };
    };
    const onTE = (e: TouchEvent) => {
      e.preventDefault();
      if (!swipe.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - swipe.current.x, dy = t.clientY - swipe.current.y;
      swipe.current = null;
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      setWant(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 0 : 2) : (dy > 0 ? 1 : 3));
    };
    window.addEventListener("keydown", onKey);
    el?.addEventListener("touchstart", onTS, { passive: false });
    el?.addEventListener("touchend", onTE, { passive: false });
    return () => {
      window.removeEventListener("keydown", onKey);
      el?.removeEventListener("touchstart", onTS);
      el?.removeEventListener("touchend", onTE);
      cancelAnimationFrame(raf.current);
    };
  }, [screen, setWant]);

  const winner2p = gMode === "2p"
    ? p1Score > p2Score ? "🟡 P1 Wins!" : p2Score > p1Score ? "🩷 P2 Wins!" : "🤝 Tie!"
    : null;

  const diffCfg = DIFF_CFG[diff];

  if (screen === "menu") return (
    <Shell title="Pac-Man">
      <div className="flex flex-col items-center gap-5 text-center max-w-sm w-full px-2">
        <div className="text-7xl select-none" style={{ filter: "drop-shadow(0 0 18px #fbbf24)" }}>👾</div>

        {/* Ghost legend */}
        <div className="flex gap-2 flex-wrap justify-center">
          {GHOST_CLRS.map((c, i) => (
            <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono"
              style={{ background: `${c}22`, color: c, border: `1px solid ${c}55` }}>
              <span className="text-sm leading-none">●</span>{GHOST_NAMES[i]}
            </span>
          ))}
        </div>

        {/* Difficulty picker */}
        <div className="w-full">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Difficulty</p>
          <div className="flex gap-2 w-full">
            {(["easy", "normal", "hard"] as Diff[]).map(d => {
              const dc = DIFF_CFG[d];
              const sel = diff === d;
              return (
                <button key={d} onClick={() => setDiff(d)}
                  className="flex-1 py-3 rounded-xl border text-xs font-bold transition-all touch-manipulation"
                  style={{
                    background: sel ? `${dc.color}22` : "transparent",
                    borderColor: sel ? dc.color : "#334155",
                    color: sel ? dc.color : "#64748b",
                    boxShadow: sel ? `0 0 12px ${dc.color}44` : "none",
                  }}>
                  <div className="text-lg mb-0.5">{dc.emoji}</div>
                  <div className="font-black">{dc.label}</div>
                  <div className="text-[10px] opacity-75 font-normal leading-tight mt-0.5">{dc.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Map size picker */}
        <div className="w-full">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Map Size</p>
          <div className="flex gap-2 w-full">
            {([
              { id: "simple",  label: "Simple",  emoji: "🟦", desc: "Wide open · few walls",       color: "#38bdf8" },
              { id: "normal",  label: "Normal",  emoji: "🟨", desc: "Classic layout · balanced",   color: "#facc15" },
              { id: "complex", label: "Complex", emoji: "🟥", desc: "Tight corridors · many walls", color: "#f87171" },
            ] as const).map(({ id, label, emoji, desc, color }) => {
              const sel = mapSize === id;
              return (
                <button key={id} onClick={() => setMapSize(id)}
                  className="flex-1 py-3 rounded-xl border text-xs font-bold transition-all touch-manipulation"
                  style={{
                    background: sel ? `${color}22` : "transparent",
                    borderColor: sel ? color : "#334155",
                    color: sel ? color : "#64748b",
                    boxShadow: sel ? `0 0 12px ${color}44` : "none",
                  }}>
                  <div className="text-lg mb-0.5">{emoji}</div>
                  <div className="font-black">{label}</div>
                  <div className="text-[10px] opacity-75 font-normal leading-tight mt-0.5">{desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mode buttons */}
        <div className="flex gap-3 w-full">
          <button onClick={() => { setScreen("game"); startGame("1p", diff, mapSize); }}
            className="flex-1 py-4 border rounded-2xl font-black transition-colors touch-manipulation"
            style={{ background: `${diffCfg.color}18`, borderColor: `${diffCfg.color}55`, color: diffCfg.color }}>
            👤<br /><span className="text-sm font-semibold">1 Player</span><br />
            <span className="text-xs font-normal text-muted-foreground">Arrows / Swipe</span>
          </button>
          <button onClick={() => { setScreen("game"); startGame("2p", diff, mapSize); }}
            className="flex-1 py-4 bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/40 text-pink-400 font-black rounded-2xl transition-colors touch-manipulation">
            👥<br /><span className="text-sm font-semibold">2 Players</span><br />
            <span className="text-xs font-normal text-muted-foreground">P1: Arrows · P2: WASD</span>
          </button>
        </div>

        <p className="text-xs text-muted-foreground -mt-2">3 map sizes · Swipe or D-pad on mobile</p>
      </div>
    </Shell>
  );

  return (
    <Shell title={`Pac-Man · ${mapName} · ${DIFF_CFG[diff].label}`} >
      <div className="flex gap-6 font-mono text-sm items-center">
        <span className="text-yellow-400 font-bold">🟡 {p1Score} {"❤️".repeat(Math.max(0, p1Lives))}</span>
        {gMode === "2p" && <span className="text-pink-400 font-bold">🩷 {p2Score} {"❤️".repeat(Math.max(0, p2Lives))}</span>}
        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${diffCfg.color}20`, color: diffCfg.color, border: `1px solid ${diffCfg.color}50` }}>
          {diffCfg.emoji} {diffCfg.label}
        </span>
      </div>

      <div className="relative w-full flex justify-center">
        <canvas ref={cv} width={CW} height={CH}
          className="rounded-xl touch-none"
          style={{ width: "100%", maxWidth: CW, height: "auto", boxShadow: "0 0 32px #4f46e580, 0 0 4px #818cf840" }}
        />
        {(result === "dead" || result === "win") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-xl gap-4">
            {result === "win"  && <p className="text-2xl font-black text-yellow-400">{winner2p ?? "You Win! 🎉"}</p>}
            {result === "dead" && <p className="text-2xl font-black text-red-400">{winner2p ?? "Game Over!"}</p>}
            <p className="font-mono text-sm text-muted-foreground">
              {gMode === "2p" ? `P1: ${p1Score} · P2: ${p2Score}` : `Score: ${p1Score}`}
            </p>
            <div className="flex gap-3">
              <button onClick={() => startGame(gMode, diff, mapSize)}
                className="px-8 py-3 bg-yellow-400 text-black font-bold rounded-xl touch-manipulation">
                Play Again
              </button>
              <button onClick={() => { cancelAnimationFrame(raf.current); setScreen("menu"); }}
                className="px-6 py-3 bg-secondary text-foreground font-bold rounded-xl touch-manipulation">
                Menu
              </button>
            </div>
          </div>
        )}
      </div>

      {gMode === "1p" && (
        <div className="flex flex-col items-center gap-1 sm:hidden select-none mt-1">
          <DPadBtn label="▲" onStart={() => setWant(3)} />
          <div className="flex gap-1">
            <DPadBtn label="◀" onStart={() => setWant(2)} />
            <div className="w-14 h-14" />
            <DPadBtn label="▶" onStart={() => setWant(0)} />
          </div>
          <DPadBtn label="▼" onStart={() => setWant(1)} />
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center sm:hidden">Swipe the board or use the D-pad</p>
      <p className="text-xs text-muted-foreground text-center hidden sm:block">
        {gMode === "2p" ? "🟡 P1: Arrows · 🩷 P2: WASD" : "Arrow keys to move"}
      </p>
    </Shell>
  );
}
