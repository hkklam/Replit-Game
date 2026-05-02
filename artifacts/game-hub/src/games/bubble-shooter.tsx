import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

function Shell({ title, controls, children }: { title: string; controls?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-4 px-4 py-3 border-b border-pink-500/30 bg-gradient-to-r from-pink-950/60 to-transparent">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Hub</span>
        </Link>
        <span className="text-2xl select-none" style={{ filter: "drop-shadow(0 0 8px #f472b680)" }}>🫧</span>
        <h1 className="text-lg font-bold text-pink-400">{title}</h1>
        {controls && <span className="text-xs text-muted-foreground ml-auto hidden sm:block">{controls}</span>}
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">{children}</div>
    </div>
  );
}

const COLS = 11;
const R = 18;
const DIAM = R * 2;
const ROW_H = DIAM + 2;
const W = COLS * DIAM;           // 396
const H = 560;
const TOP_PAD = 18;
const DANGER_Y = H - 90;
const SHOOTER_X = W / 2;
const SHOOTER_Y = H - 42;
const COLORS = ["#f43f5e", "#10b981", "#3b82f6", "#f59e0b", "#a78bfa"];

type Difficulty = "easy" | "medium" | "hard";
const DIFF: Record<Difficulty, { rows: number; interval: number; label: string; desc: string }> = {
  easy:   { rows: 3, interval: 20000, label: "Easy",   desc: "3 starting rows · new row every 20s" },
  medium: { rows: 5, interval: 12000, label: "Medium", desc: "5 starting rows · new row every 12s" },
  hard:   { rows: 7, interval: 7000,  label: "Hard",   desc: "7 starting rows · new row every 7s"  },
};

function rndColor() { return COLORS[Math.floor(Math.random() * COLORS.length)]; }
function bx(col: number) { return col * DIAM + R; }
function by(row: number) { return row * ROW_H + R + TOP_PAD; }

function makeRow(): (string | null)[] {
  return Array.from({ length: COLS }, () => rndColor());
}
function initGrid(rows: number): (string | null)[][] {
  return Array.from({ length: rows }, () => makeRow());
}

// Only 4-directional neighbours — bubbles only "physically touch" when directly adjacent
// (diagonal cells are ~51 px apart; circles with R=18 don't reach each other)
function cellNbrs(r: number, c: number): [number, number][] {
  return ([ [-1,0],[1,0],[0,-1],[0,1] ] as [number,number][])
    .map(([dr, dc]) => [r + dr, c + dc] as [number, number])
    .filter(([nr, nc]) => nr >= 0 && nc >= 0 && nc < COLS);
}

function floodFill(grid: (string | null)[][], r: number, c: number): [number, number][] {
  const color = grid[r]?.[c];
  if (!color) return [];
  const vis = new Set<string>();
  const q: [number, number][] = [[r, c]];
  const out: [number, number][] = [];
  while (q.length) {
    const [cr, cc] = q.pop()!;
    const k = `${cr},${cc}`;
    if (vis.has(k)) continue;
    if (cr < 0 || cr >= grid.length || cc < 0 || cc >= COLS) continue;
    if (grid[cr]?.[cc] !== color) continue;
    vis.add(k); out.push([cr, cc]);
    cellNbrs(cr, cc).forEach(n => q.push(n));
  }
  return out;
}

function findDetached(grid: (string | null)[][]): [number, number][] {
  const conn = new Set<string>();
  const q: [number, number][] = [];
  for (let c = 0; c < COLS; c++) {
    if (grid[0]?.[c]) { conn.add(`0,${c}`); q.push([0, c]); }
  }
  while (q.length) {
    const [r, c] = q.pop()!;
    cellNbrs(r, c).forEach(([nr, nc]) => {
      const k = `${nr},${nc}`;
      if (conn.has(k) || nr >= grid.length || !grid[nr]?.[nc]) return;
      conn.add(k); q.push([nr, nc]);
    });
  }
  const det: [number, number][] = [];
  for (let r = 1; r < grid.length; r++)
    for (let c = 0; c < COLS; c++)
      if (grid[r]?.[c] && !conn.has(`${r},${c}`)) det.push([r, c]);
  return det;
}

type GS = {
  grid: (string | null)[][];
  color: string; nextColor: string; angle: number;
  proj: { x: number; y: number; vx: number; vy: number; color: string } | null;
  score: number;
  state: "playing" | "lose";
  lastAdd: number;
  interval: number;
};
function mkGS(d: Difficulty): GS {
  const cfg = DIFF[d];
  return {
    grid: initGrid(cfg.rows),
    color: rndColor(), nextColor: rndColor(),
    angle: -Math.PI / 2,
    proj: null,
    score: 0, state: "playing",
    lastAdd: Date.now(), interval: cfg.interval,
  };
}

export default function BubbleShooter() {
  const cv = useRef<HTMLCanvasElement>(null);
  const g = useRef<GS>(mkGS("easy"));
  const raf = useRef(0);
  const [screen, setScreen] = useState<"menu" | "game">("menu");
  const [score, setScore] = useState(0);
  const [gstate, setGState] = useState<"playing" | "lose">("playing");
  const [diff, setDiff] = useState<Difficulty>("easy");

  const draw = useCallback(() => {
    const cvEl = cv.current; if (!cvEl) return;
    const ctx = cvEl.getContext("2d")!;
    const s = g.current;

    ctx.fillStyle = "#0d1117"; ctx.fillRect(0, 0, W, H);

    // Danger zone
    ctx.fillStyle = "rgba(239,68,68,0.07)"; ctx.fillRect(0, DANGER_Y, W, H - DANGER_Y);
    ctx.strokeStyle = "rgba(239,68,68,0.5)"; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(0, DANGER_Y); ctx.lineTo(W, DANGER_Y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(239,68,68,0.6)"; ctx.font = "9px sans-serif"; ctx.textAlign = "right";
    ctx.fillText("DANGER", W - 4, DANGER_Y - 3);

    // Grid bubbles
    s.grid.forEach((row, r) => row.forEach((b, col) => {
      if (!b) return;
      const x = bx(col), y = by(r);
      ctx.beginPath(); ctx.arc(x, y, R - 1, 0, Math.PI * 2);
      ctx.fillStyle = b; ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(x - R * 0.28, y - R * 0.28, R * 0.27, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fill();
    }));

    // Projectile
    if (s.proj) {
      const p = s.proj;
      ctx.beginPath(); ctx.arc(p.x, p.y, R - 1, 0, Math.PI * 2);
      ctx.fillStyle = p.color; ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 2; ctx.stroke();
    }

    // Aim arrow — solid line + arrowhead pointing from the shooter ball
    if (!s.proj && s.state === "playing") {
      const aimLen = 62;
      const ax = SHOOTER_X + Math.cos(s.angle) * (R + 4);
      const ay = SHOOTER_Y + Math.sin(s.angle) * (R + 4);
      const bx2 = SHOOTER_X + Math.cos(s.angle) * (R + 4 + aimLen);
      const by2 = SHOOTER_Y + Math.sin(s.angle) * (R + 4 + aimLen);

      // Shaft
      ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 2; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx2, by2); ctx.stroke();

      // Arrowhead
      const headLen = 10, headAngle = Math.PI / 6;
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.moveTo(bx2, by2);
      ctx.lineTo(bx2 - headLen * Math.cos(s.angle - headAngle), by2 - headLen * Math.sin(s.angle - headAngle));
      ctx.lineTo(bx2 - headLen * Math.cos(s.angle + headAngle), by2 - headLen * Math.sin(s.angle + headAngle));
      ctx.closePath(); ctx.fill();
    }

    // Shooter circle
    ctx.fillStyle = "#1e293b"; ctx.beginPath(); ctx.arc(SHOOTER_X, SHOOTER_Y, R + 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#334155"; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(SHOOTER_X, SHOOTER_Y, R - 1, 0, Math.PI * 2);
    ctx.fillStyle = s.color; ctx.fill();

    // Next bubble preview
    ctx.fillStyle = "#1e293b"; ctx.beginPath(); ctx.arc(W - 30, SHOOTER_Y, R + 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#334155"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(W - 30, SHOOTER_Y, R - 3, 0, Math.PI * 2);
    ctx.fillStyle = s.nextColor; ctx.fill();
    ctx.fillStyle = "#64748b"; ctx.font = "9px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("NEXT", W - 30, SHOOTER_Y - R - 5);

    // Score
    ctx.fillStyle = "#e2e8f0"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`Score: ${s.score}`, 8, 18);

    // Row timer bar
    const frac = Math.max(0, 1 - (Date.now() - s.lastAdd) / s.interval);
    ctx.fillStyle = "#1e293b"; ctx.fillRect(8, 26, 80, 5);
    ctx.fillStyle = frac > 0.35 ? "#22d3ee" : "#f43f5e";
    ctx.fillRect(8, 26, frac * 80, 5);
    ctx.fillStyle = "#475569"; ctx.font = "9px sans-serif";
    ctx.fillText("next row ▼", 8, 40);
  }, []);

  const applyHit = useCallback((px: number, py: number, color: string, hitR: number, hitC: number) => {
    const s = g.current;
    // Find the best adjacent empty cell to place the bubble
    const cands = cellNbrs(hitR, hitC).filter(([r, c]) => {
      if (r < 0) return false;
      if (r >= s.grid.length) return true; // new row below
      return !s.grid[r]?.[c];
    });
    let plR = hitR + 1, plC = hitC, bestD = Infinity;
    for (const [r, c] of cands) {
      const d = (px - bx(c)) ** 2 + (py - by(r)) ** 2;
      if (d < bestD) { bestD = d; plR = r; plC = c; }
    }
    plC = Math.max(0, Math.min(COLS - 1, plC));
    // Extend grid if new row needed
    while (s.grid.length <= plR) s.grid.push(Array(COLS).fill(null));
    s.grid[plR][plC] = color;
    // Flood fill same color
    const matched = floodFill(s.grid, plR, plC);
    if (matched.length >= 2) {
      matched.forEach(([r, c]) => { s.grid[r][c] = null; });
      s.score += matched.length * 10;
      // Bonus: detached bubbles fall off
      const det = findDetached(s.grid);
      det.forEach(([r, c]) => { s.grid[r][c] = null; });
      s.score += det.length * 5;
      // Trim fully-empty bottom rows
      while (s.grid.length > 0 && s.grid[s.grid.length - 1].every(b => !b)) s.grid.pop();
    }
    setScore(s.score);
    if (s.grid.length > 0 && by(s.grid.length - 1) + R >= DANGER_Y) {
      s.state = "lose"; setGState("lose");
    }
  }, []);

  const placeAtTop = useCallback((px: number, color: string) => {
    const s = g.current;
    if (!s.grid[0]) s.grid.unshift(Array(COLS).fill(null));
    const c0 = Math.max(0, Math.min(COLS - 1, Math.round((px - R) / DIAM)));
    let col = c0;
    // Find nearest empty in row 0
    for (let offset = 0; offset <= COLS; offset++) {
      if (!s.grid[0][c0 + offset] && c0 + offset < COLS) { col = c0 + offset; break; }
      if (!s.grid[0][c0 - offset] && c0 - offset >= 0) { col = c0 - offset; break; }
    }
    s.grid[0][col] = color;
    const matched = floodFill(s.grid, 0, col);
    if (matched.length >= 2) {
      matched.forEach(([r, c]) => { s.grid[r][c] = null; });
      s.score += matched.length * 10;
      const det = findDetached(s.grid);
      det.forEach(([r, c]) => { s.grid[r][c] = null; });
      s.score += det.length * 5;
      while (s.grid.length > 0 && s.grid[s.grid.length - 1].every(b => !b)) s.grid.pop();
    }
    setScore(s.score);
    if (s.grid.length > 0 && by(s.grid.length - 1) + R >= DANGER_Y) {
      s.state = "lose"; setGState("lose");
    }
  }, []);

  const loop = useCallback(() => {
    const s = g.current;
    if (s.state !== "playing") { draw(); return; }

    // Periodic new row from top
    if (Date.now() - s.lastAdd >= s.interval) {
      s.grid.unshift(makeRow());
      s.lastAdd = Date.now();
      if (by(s.grid.length - 1) + R >= DANGER_Y) {
        s.state = "lose"; setGState("lose"); draw(); return;
      }
    }

    const p = s.proj;
    if (p) {
      p.x += p.vx; p.y += p.vy;
      if (p.x <= R) { p.x = R; p.vx = Math.abs(p.vx); }
      if (p.x >= W - R) { p.x = W - R; p.vx = -Math.abs(p.vx); }

      // Hit top wall
      if (p.y <= R + TOP_PAD) {
        placeAtTop(p.x, p.color);
        s.proj = null; s.color = s.nextColor; s.nextColor = rndColor();
        draw(); raf.current = requestAnimationFrame(loop); return;
      }

      // Hit existing bubble
      let hitR = -1, hitC = -1;
      outer: for (let r = 0; r < s.grid.length; r++) {
        for (let c = 0; c < COLS; c++) {
          if (!s.grid[r]?.[c]) continue;
          const dx = p.x - bx(c), dy = p.y - by(r);
          if (dx * dx + dy * dy < (DIAM - 1) ** 2) { hitR = r; hitC = c; break outer; }
        }
      }
      if (hitR >= 0) {
        applyHit(p.x, p.y, p.color, hitR, hitC);
        s.proj = null; s.color = s.nextColor; s.nextColor = rndColor();
      }
    }

    draw();
    raf.current = requestAnimationFrame(loop);
  }, [draw, applyHit, placeAtTop]);

  const shoot = useCallback(() => {
    const s = g.current;
    if (s.proj || s.state !== "playing") return;
    s.proj = {
      x: SHOOTER_X, y: SHOOTER_Y,
      vx: Math.cos(s.angle) * 12,
      vy: Math.sin(s.angle) * 12,
      color: s.color,
    };
  }, []);

  const startGame = useCallback((d: Difficulty) => {
    g.current = mkGS(d);
    setDiff(d); setScore(0); setGState("playing");
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(loop);
  }, [loop]);

  useEffect(() => {
    if (screen !== "game") return;
    const onMove = (e: MouseEvent) => {
      const rect = cv.current?.getBoundingClientRect(); if (!rect) return;
      const ang = Math.atan2(e.clientY - rect.top - SHOOTER_Y, e.clientX - rect.left - SHOOTER_X);
      g.current.angle = Math.max(-Math.PI + 0.15, Math.min(-0.15, ang));
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); shoot(); }
      if (e.code === "ArrowLeft") { g.current.angle = Math.max(-Math.PI + 0.15, g.current.angle - 0.06); e.preventDefault(); }
      if (e.code === "ArrowRight") { g.current.angle = Math.min(-0.15, g.current.angle + 0.06); e.preventDefault(); }
    };
    const c = cv.current;
    c?.addEventListener("mousemove", onMove);
    c?.addEventListener("click", shoot);
    window.addEventListener("keydown", onKey);
    raf.current = requestAnimationFrame(loop);
    return () => {
      c?.removeEventListener("mousemove", onMove);
      c?.removeEventListener("click", shoot);
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf.current);
    };
  }, [screen, loop, shoot]);

  if (screen === "menu") return (
    <Shell title="Bubble Shooter">
      <div className="flex flex-col items-center gap-8 text-center max-w-sm w-full">
        <div className="text-6xl select-none">🫧</div>
        <div>
          <h2 className="text-2xl font-black text-pink-400">Bubble Shooter</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Pop connected same-color bubbles before they fill the screen.<br />
            New rows drop from the top — clear fast to survive!
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full">
          {(["easy", "medium", "hard"] as Difficulty[]).map(d => (
            <button key={d}
              onClick={() => { startGame(d); setScreen("game"); }}
              className={`py-4 px-6 rounded-2xl border font-black transition-colors text-left ${
                d === "easy"   ? "bg-green-500/20  hover:bg-green-500/30  border-green-500/50  text-green-400"  :
                d === "medium" ? "bg-yellow-500/20 hover:bg-yellow-500/30 border-yellow-500/50 text-yellow-400" :
                                 "bg-red-500/20    hover:bg-red-500/30    border-red-500/50    text-red-400"
              }`}>
              <span className="text-lg">{DIFF[d].label}</span>
              <br />
              <span className="text-xs font-normal text-muted-foreground">{DIFF[d].desc}</span>
            </button>
          ))}
        </div>
      </div>
    </Shell>
  );

  return (
    <Shell title="Bubble Shooter" controls="Mouse to aim · Click or Space to shoot · ← → to aim with keyboard">
      <div className="relative">
        <canvas ref={cv} width={W} height={H} className="rounded-xl border border-slate-700 cursor-crosshair" style={{ maxWidth: "95vw" }} />
        {gstate === "lose" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-xl gap-4">
            <p className="text-3xl font-black text-red-400">💥 Game Over!</p>
            <p className="text-muted-foreground font-mono">Score: {score}</p>
            <div className="flex gap-3">
              <button onClick={() => startGame(diff)} className="px-8 py-2 bg-pink-500 text-white font-bold rounded-xl">Play Again</button>
              <button onClick={() => setScreen("menu")} className="px-6 py-2 bg-secondary text-foreground font-bold rounded-xl">Menu</button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
