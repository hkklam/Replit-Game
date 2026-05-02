import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useOnlineMultiplayer } from "../lib/multiplayer";
import { OnlineLobby } from "../components/OnlineLobby";

function Shell({ title, controls, children }: { title: string; controls?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-4 px-4 py-3 border-b border-emerald-500/30 bg-gradient-to-r from-emerald-950/60 to-transparent">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Hub</span>
        </Link>
        <span className="text-2xl select-none" style={{ filter: "drop-shadow(0 0 8px #34d39980)" }}>🐍</span>
        <h1 className="text-lg font-bold text-emerald-400">{title}</h1>
        {controls && <span className="text-xs text-muted-foreground ml-auto hidden sm:block">{controls}</span>}
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">{children}</div>
    </div>
  );
}

const GRID = 26; const CELL = 24; const W = GRID * CELL; const H = GRID * CELL;
const SPEED0 = 120;
type P = { x: number; y: number };
type Snake = { snake: P[]; prevSnake: P[]; dir: P; nd: P; alive: boolean; score: number };
export type Difficulty = "easy" | "medium" | "hard";
type GameMode = "1p" | "2p" | "ai" | "online";

const DIFF_LABELS: Record<Difficulty, { label: string; color: string; desc: string; icon: string }> = {
  easy:   { label: "Easy",   color: "text-green-400",  desc: "Mostly random, wanders around",   icon: "🟢" },
  medium: { label: "Medium", color: "text-amber-400",  desc: "Chases food, occasional mistakes", icon: "🟡" },
  hard:   { label: "Hard",   color: "text-red-400",    desc: "BFS pathfinding, ruthless",        icon: "🔴" },
};

function rnd(occupied: P[]): P {
  let p: P;
  do { p = { x: (Math.random() * GRID) | 0, y: (Math.random() * GRID) | 0 }; }
  while (occupied.some(s => s.x === p.x && s.y === p.y));
  return p;
}

function bfsDir(head: P, body: P[], obstacles: P[], target: P, curDir: P): P | null {
  const key = (p: P) => `${p.x},${p.y}`;
  const blocked = new Set([...body.slice(1), ...obstacles].map(key));
  const visited = new Set<string>([key(head)]);
  const dirs: P[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
  const queue: { pos: P; first: P }[] = [];
  for (const d of dirs) {
    if (d.x === -curDir.x && d.y === -curDir.y) continue;
    const nx = head.x + d.x, ny = head.y + d.y;
    if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) continue;
    const nk = key({ x: nx, y: ny });
    if (blocked.has(nk)) continue;
    visited.add(nk); queue.push({ pos: { x: nx, y: ny }, first: d });
  }
  while (queue.length) {
    const { pos, first } = queue.shift()!;
    if (pos.x === target.x && pos.y === target.y) return first;
    for (const d of dirs) {
      const nx = pos.x + d.x, ny = pos.y + d.y;
      if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) continue;
      const nk = key({ x: nx, y: ny });
      if (visited.has(nk) || blocked.has(nk)) continue;
      visited.add(nk); queue.push({ pos: { x: nx, y: ny }, first });
    }
  }
  return null;
}

function computeAIDir(sn: Snake, other: P[], food: P, diff: Difficulty): P {
  const head = sn.snake[0];
  const dirs: P[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
  const key = (p: P) => `${p.x},${p.y}`;
  const allBlocked = new Set([...sn.snake, ...other].map(key));
  const safe = dirs.filter(d => {
    if (d.x === -sn.dir.x && d.y === -sn.dir.y) return false;
    const nx = head.x + d.x, ny = head.y + d.y;
    if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) return false;
    return !allBlocked.has(key({ x: nx, y: ny }));
  });
  if (safe.length === 0) return sn.nd;
  const closest = (candidates: P[]) =>
    candidates.reduce((best, d) => {
      const da = Math.abs(head.x + d.x - food.x) + Math.abs(head.y + d.y - food.y);
      const db = Math.abs(head.x + best.x - food.x) + Math.abs(head.y + best.y - food.y);
      return da < db ? d : best;
    });
  if (diff === "easy")   return Math.random() < 0.35 ? closest(safe) : safe[Math.floor(Math.random() * safe.length)];
  if (diff === "medium") return Math.random() < 0.12 ? safe[Math.floor(Math.random() * safe.length)] : closest(safe);
  const bfs = bfsDir(head, sn.snake, other, food, sn.dir);
  return bfs ?? closest(safe);
}

function initState(mode: GameMode) {
  const s1Body = [{ x: 5, y: 13 }];
  const s2Body = [{ x: 21, y: 13 }];
  return {
    mode,
    s1: { snake: s1Body, prevSnake: [...s1Body], dir: { x: 1, y: 0 }, nd: { x: 1, y: 0 }, alive: true, score: 0 } as Snake,
    s2: { snake: s2Body, prevSnake: [...s2Body], dir: { x: -1, y: 0 }, nd: { x: -1, y: 0 }, alive: true, score: 0 } as Snake,
    food: rnd([...s1Body, ...s2Body]),
    last: 0, spd: SPEED0,
  };
}

type StatePayload = { s1: Snake; s2: Snake; food: P; spd: number; done: boolean; p1Score: number; p2Score: number };

// ─── Snake drawing helpers ────────────────────────────────────────────────────
type SnakePalette = [number, number, number, number, number, number];
// [hHead, sHead, lHead, hTail, sTail, lTail]
const PAL_GREEN:  SnakePalette = [145, 82, 52, 162, 68, 24];
const PAL_ORANGE: SnakePalette = [28,  90, 58, 18,  76, 30];
const PAL_PURPLE: SnakePalette = [278, 78, 64, 258, 62, 34];

function segCol(pal: SnakePalette, t: number): string {
  const [hH, sH, lH, hT, sT, lT] = pal;
  return `hsl(${hH + (hT - hH) * t},${sH + (sT - sH) * t}%,${lH + (lT - lH) * t}%)`;
}

// Linearly interpolate a grid position using prev/curr arrays and frame fraction
function ipos(segs: P[], prev: P[], i: number, frac: number): { px: number; py: number } {
  const cur = segs[i];
  const p   = prev[i] ?? cur;
  return {
    px: (p.x + (cur.x - p.x) * frac) * CELL + CELL / 2,
    py: (p.y + (cur.y - p.y) * frac) * CELL + CELL / 2,
  };
}

function drawSnake(ctx: CanvasRenderingContext2D, segs: P[], prev: P[], frac: number, dir: P, pal: SnakePalette, alive: boolean) {
  if (!segs.length) return;
  const r = CELL / 2 - 2;

  if (!alive) {
    segs.forEach((_, i) => {
      const { px: cx, py: cy } = ipos(segs, prev, i, frac);
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = "#374151"; ctx.fill();
    });
    return;
  }

  // 1. Connecting quads (fill gaps between circle centres)
  for (let i = 0; i < segs.length - 1; i++) {
    const t  = i / Math.max(segs.length - 1, 1);
    const t2 = (i + 1) / Math.max(segs.length - 1, 1);
    const { px: ax, py: ay } = ipos(segs, prev, i,     frac);
    const { px: bx, py: by } = ipos(segs, prev, i + 1, frac);
    const dx = bx - ax, dy = by - ay;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const px2 = (-dy / len) * r, py2 = (dx / len) * r;
    const r2 = i === segs.length - 2 ? r * 0.45 : r; // taper near tail
    const grd = ctx.createLinearGradient(ax, ay, bx, by);
    grd.addColorStop(0, segCol(pal, t)); grd.addColorStop(1, segCol(pal, t2));
    ctx.beginPath();
    ctx.moveTo(ax + px2,  ay + py2);
    ctx.lineTo(bx + ((-dy/len)*r2), by + ((dx/len)*r2));
    ctx.lineTo(bx - ((-dy/len)*r2), by - ((dx/len)*r2));
    ctx.lineTo(ax - px2,  ay - py2);
    ctx.closePath();
    ctx.fillStyle = grd; ctx.fill();
  }

  // 2. Circles (tail → head so head paints on top)
  for (let i = segs.length - 1; i >= 1; i--) {
    const t  = i / Math.max(segs.length - 1, 1);
    const { px: cx, py: cy } = ipos(segs, prev, i, frac);
    const isTail = i === segs.length - 1;
    const segR = isTail ? r * 0.45 : r;

    ctx.beginPath(); ctx.arc(cx, cy, segR, 0, Math.PI * 2);
    ctx.fillStyle = segCol(pal, t); ctx.fill();

    // Scale marks: small perpendicular arc every 3rd segment
    if (!isTail && i % 3 === 0 && i < segs.length - 1) {
      const { px: ppx, py: ppy } = ipos(segs, prev, i - 1, frac);
      const { px: npx, py: npy } = ipos(segs, prev, i + 1, frac);
      const mdx = ppx - npx, mdy = ppy - npy;
      const mlen = Math.sqrt(mdx*mdx + mdy*mdy) || 1;
      const scx = -mdy / mlen, scy = mdx / mlen;
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = segCol(pal, Math.min(t + 0.15, 1));
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + scx * segR * 0.75, cy + scy * segR * 0.75);
      ctx.lineTo(cx - scx * segR * 0.75, cy - scy * segR * 0.75);
      ctx.stroke();
      ctx.restore();
    }

    // 3D shine on each body segment
    const shine = ctx.createRadialGradient(cx - segR * 0.32, cy - segR * 0.34, 0, cx, cy, segR);
    shine.addColorStop(0, "rgba(255,255,255,0.28)"); shine.addColorStop(1, "rgba(255,255,255,0)");
    ctx.beginPath(); ctx.arc(cx, cy, segR, 0, Math.PI * 2);
    ctx.fillStyle = shine; ctx.fill();
  }

  // 3. Head
  if (segs.length > 0) {
    const { px: hx, py: hy } = ipos(segs, prev, 0, frac);
    const hr = r + 1.5;
    const dx = dir.x, dy = dir.y;

    // Head circle
    ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI * 2);
    ctx.fillStyle = segCol(pal, 0); ctx.fill();

    // Head shine
    const hshine = ctx.createRadialGradient(hx - hr * 0.3, hy - hr * 0.35, 0, hx, hy, hr);
    hshine.addColorStop(0, "rgba(255,255,255,0.38)"); hshine.addColorStop(1, "rgba(255,255,255,0)");
    ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI * 2); ctx.fillStyle = hshine; ctx.fill();

    // Nostrils (small darker dots near the tip of the head)
    const nx2 = hx + dx * hr * 0.62, ny2 = hy + dy * hr * 0.62;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    [1, -1].forEach(s => {
      ctx.beginPath(); ctx.arc(nx2 + dy * s * hr * 0.28, ny2 - dx * s * hr * 0.28, hr * 0.1, 0, Math.PI * 2); ctx.fill();
    });

    // Eyes
    [1, -1].forEach(side => {
      const ex = hx + dx * hr * 0.28 + dy * side * hr * 0.42;
      const ey = hy + dy * hr * 0.28 - dx * side * hr * 0.42;
      // Sclera
      ctx.beginPath(); ctx.arc(ex, ey, hr * 0.24, 0, Math.PI * 2);
      ctx.fillStyle = "#f0f0f0"; ctx.fill();
      // Pupil — vertical slit
      ctx.save();
      ctx.translate(ex + dx * hr * 0.08, ey + dy * hr * 0.08);
      ctx.scale(0.55, 1);
      ctx.beginPath(); ctx.arc(0, 0, hr * 0.14, 0, Math.PI * 2);
      ctx.fillStyle = "#111"; ctx.fill();
      ctx.restore();
      // Specular dot
      ctx.beginPath(); ctx.arc(ex - hr * 0.08, ey - hr * 0.1, hr * 0.07, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fill();
    });

    // Forked tongue
    const tx = hx + dx * (hr + 2), ty = hy + dy * (hr + 2);
    const tmx = tx + dx * hr * 0.55, tmy = ty + dy * hr * 0.55;
    ctx.save();
    ctx.strokeStyle = "#f43f5e"; ctx.lineWidth = 1.8; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(tx, ty); ctx.lineTo(tmx, tmy);
    ctx.moveTo(tmx, tmy); ctx.lineTo(tmx + dx * hr * 0.32 + dy * hr * 0.28, tmy + dy * hr * 0.32 - dx * hr * 0.28);
    ctx.moveTo(tmx, tmy); ctx.lineTo(tmx + dx * hr * 0.32 - dy * hr * 0.28, tmy + dy * hr * 0.32 + dx * hr * 0.28);
    ctx.stroke();
    ctx.restore();
  }
}

function drawFood(ctx: CanvasRenderingContext2D, food: P) {
  const cx = food.x * CELL + CELL / 2, cy = food.y * CELL + CELL / 2;
  const r = CELL / 2 - 2;

  // Glow
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.2);
  glow.addColorStop(0, "rgba(239,68,68,0.25)"); glow.addColorStop(1, "rgba(239,68,68,0)");
  ctx.beginPath(); ctx.arc(cx, cy, r * 2.2, 0, Math.PI * 2); ctx.fillStyle = glow; ctx.fill();

  // Apple body
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "#ef4444"; ctx.fill();

  // Body gradient
  const bg = ctx.createRadialGradient(cx - r * 0.32, cy - r * 0.32, 0, cx + r * 0.1, cy + r * 0.1, r * 1.1);
  bg.addColorStop(0, "rgba(255,180,180,0.65)"); bg.addColorStop(0.5, "rgba(239,68,68,0.1)"); bg.addColorStop(1, "rgba(80,0,0,0.4)");
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = bg; ctx.fill();

  // Stem
  ctx.save(); ctx.strokeStyle = "#854d0e"; ctx.lineWidth = 2; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.quadraticCurveTo(cx + 3, cy - r - 5, cx + 4, cy - r - 9); ctx.stroke();
  ctx.restore();

  // Leaf
  ctx.save(); ctx.fillStyle = "#22c55e";
  ctx.beginPath(); ctx.ellipse(cx + 5, cy - r - 6, 5, 3, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Shine
  ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.33, r * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.65)"; ctx.fill();
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SnakeGame() {
  const cv = useRef<HTMLCanvasElement>(null);
  const g = useRef(initState("1p"));
  const [screen, setScreen] = useState<"menu" | "ai-diff" | "game" | "over" | "online-lobby">("menu");
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [best, setBest] = useState(() => +localStorage.getItem("snk-best")! || 0);
  const [gameMode, setGameMode] = useState<GameMode>("1p");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const diffRef = useRef<Difficulty>("medium");
  const raf = useRef(0);

  const mp = useOnlineMultiplayer({
    onGuestJoined: useCallback(() => { startOnlineGame("host"); }, []),
    onGameState: useCallback((data: unknown) => {
      const st = data as StatePayload;
      g.current.s1 = st.s1; g.current.s2 = st.s2; g.current.food = st.food; g.current.spd = st.spd;
      setP1Score(st.p1Score); setP2Score(st.p2Score);
      if (st.done) setScreen("over");
      draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
    onInput: useCallback((data: unknown) => {
      const inp = data as { nd: P };
      if (inp?.nd && g.current.s2.alive) {
        if (!(inp.nd.x === -g.current.s2.dir.x && inp.nd.y === -g.current.s2.dir.y)) g.current.s2.nd = inp.nd;
      }
    }, []),
    onOpponentLeft: useCallback(() => { setScreen("over"); }, []),
  });

  const draw = useCallback(() => {
    const c = cv.current; if (!c) return;
    const ctx = c.getContext("2d")!;

    // Background: dark green-tinted
    ctx.fillStyle = "#071a0f"; ctx.fillRect(0, 0, W, H);

    // Subtle grid dots
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    for (let x = 0; x < GRID; x++)
      for (let y = 0; y < GRID; y++)
        ctx.fillRect(x * CELL + CELL / 2 - 0.8, y * CELL + CELL / 2 - 0.8, 1.6, 1.6);

    // Border
    ctx.strokeStyle = "rgba(52,211,153,0.12)"; ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);

    const { s1, s2, food, mode, last, spd } = g.current;
    const frac = spd > 0 ? Math.min(1, (performance.now() - last) / spd) : 1;

    drawFood(ctx, food);

    drawSnake(ctx, s1.snake, s1.prevSnake, frac, s1.dir, PAL_GREEN, s1.alive);
    if (mode !== "1p") {
      const isAI = mode === "ai";
      drawSnake(ctx, s2.snake, s2.prevSnake, frac, s2.dir, isAI ? PAL_PURPLE : PAL_ORANGE, s2.alive);
    }
  }, []);

  const loop = useCallback((now: number) => {
    const st = g.current;
    const done1p = st.mode === "1p" && !st.s1.alive;
    const done2p = st.mode !== "1p" && !st.s1.alive && !st.s2.alive;
    if (done1p || done2p) { draw(); return; }
    if (now - st.last > st.spd) {
      st.last = now;
      if (st.mode === "ai" && st.s2.alive) {
        st.s2.nd = computeAIDir(st.s2, st.s1.snake, st.food, diffRef.current);
      }
      const moveSnake = (sn: Snake, other: P[]) => {
        if (!sn.alive) return;
        sn.prevSnake = sn.snake.map(p => ({ x: p.x, y: p.y }));
        sn.dir = sn.nd;
        const h = { x: sn.snake[0].x + sn.dir.x, y: sn.snake[0].y + sn.dir.y };
        if (h.x < 0 || h.x >= GRID || h.y < 0 || h.y >= GRID ||
            sn.snake.some(p => p.x === h.x && p.y === h.y) ||
            other.some(p => p.x === h.x && p.y === h.y)) { sn.alive = false; return; }
        sn.snake.unshift(h);
        if (h.x === st.food.x && h.y === st.food.y) {
          sn.score++; st.spd = Math.max(65, SPEED0 - sn.score * 4);
          st.food = rnd([...st.s1.snake, ...st.s2.snake]);
        } else sn.snake.pop();
      };
      const p2Body = st.mode !== "1p" ? st.s2.snake : [];
      moveSnake(st.s1, p2Body);
      if (st.mode !== "1p") moveSnake(st.s2, st.s1.snake);
      setP1Score(st.s1.score); setP2Score(st.s2.score);
      const isDone = (st.mode === "1p" && !st.s1.alive) || (st.mode !== "1p" && !st.s1.alive && !st.s2.alive);
      if (st.mode === "online") {
        const payload: StatePayload = { s1: st.s1, s2: st.s2, food: st.food, spd: st.spd, done: isDone, p1Score: st.s1.score, p2Score: st.s2.score };
        mp.sendGameState(payload);
      }
      if (isDone) {
        if (st.mode === "1p") {
          const nb = Math.max(st.s1.score, +localStorage.getItem("snk-best")! || 0);
          localStorage.setItem("snk-best", String(nb)); setBest(nb);
        }
        setScreen("over"); draw(); return;
      }
    }
    draw(); raf.current = requestAnimationFrame(loop);
  }, [draw, mp.sendGameState]);

  const startGame = useCallback((m: GameMode, diff?: Difficulty) => {
    if (diff) { setDifficulty(diff); diffRef.current = diff; }
    g.current = initState(m); setGameMode(m); setP1Score(0); setP2Score(0); setScreen("game");
    cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(loop);
  }, [loop]);

  const startOnlineGame = useCallback((role: "host" | "guest") => {
    g.current = initState("online");
    setGameMode("online"); setP1Score(0); setP2Score(0); setScreen("game");
    if (role === "host") { cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(loop); }
  }, [loop]);

  useEffect(() => {
    if (screen !== "game") return;
    const onKey = (e: KeyboardEvent) => {
      const isGuest = gameMode === "online" && mp.role === "guest";
      const m1: Record<string, P> = { w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 } };
      const m2: Record<string, P> = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 } };
      if (!isGuest && gameMode !== "ai") {
        const nd1 = m1[e.key] || m2[e.key];
        if (nd1 && g.current.s1.alive && !(nd1.x === -g.current.s1.dir.x && nd1.y === -g.current.s1.dir.y)) g.current.s1.nd = nd1;
      }
      if (gameMode === "1p" || gameMode === "ai") {
        const nd1 = m1[e.key] || m2[e.key];
        if (nd1 && g.current.s1.alive && !(nd1.x === -g.current.s1.dir.x && nd1.y === -g.current.s1.dir.y)) g.current.s1.nd = nd1;
      }
      if (gameMode === "2p" || isGuest) {
        const nd2 = isGuest ? (m1[e.key] || m2[e.key]) : m2[e.key];
        if (nd2 && g.current.s2.alive && !(nd2.x === -g.current.s2.dir.x && nd2.y === -g.current.s2.dir.y)) {
          if (isGuest) mp.sendInput({ nd: nd2 });
          else g.current.s2.nd = nd2;
        }
      }
      if (["Arrow", "w", "a", "s", "d"].some(k => e.key.startsWith(k) || e.key === k)) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, gameMode, mp.role, mp.sendInput]);

  const isAI = gameMode === "ai";
  const isOnlineGuest = gameMode === "online" && mp.role === "guest";
  const winner = (gameMode !== "1p" && screen === "over")
    ? (!g.current.s1.alive && g.current.s2.alive
        ? (isAI ? `🤖 AI Wins!` : "🟠 P2 Wins!")
        : g.current.s1.alive && !g.current.s2.alive
          ? (isAI ? "🟢 You Win!" : "🟢 P1 Wins!")
          : p1Score > p2Score ? (isAI ? "🟢 You Win!" : "🟢 P1 Wins!")
          : p2Score > p1Score ? (isAI ? "🤖 AI Wins!" : "🟠 P2 Wins!")
          : "🤝 Draw!")
    : null;

  if (screen === "menu") return (
    <Shell title="Snake">
      <div className="flex flex-col items-center gap-8 text-center max-w-sm">
        <div className="text-6xl select-none">🐍</div>
        <h2 className="text-2xl font-black text-emerald-400">Select Mode</h2>
        <div className="flex flex-col gap-3 w-full">
          <div className="flex gap-3">
            <button onClick={() => startGame("1p")} className="flex-1 py-4 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-400 font-black rounded-2xl transition-colors text-sm">
              👤<br />1 Player<br /><span className="text-xs font-normal text-muted-foreground">WASD / Arrows</span>
            </button>
            <button onClick={() => setScreen("ai-diff")} className="flex-1 py-4 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-300 font-black rounded-2xl transition-colors text-sm">
              🤖<br />vs AI<br /><span className="text-xs font-normal text-muted-foreground">Choose difficulty</span>
            </button>
          </div>
          <div className="flex gap-3">
            <button onClick={() => startGame("2p")} className="flex-1 py-4 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 text-orange-400 font-black rounded-2xl transition-colors text-sm">
              👥<br />2 Players<br /><span className="text-xs font-normal text-muted-foreground">P1: WASD · P2: Arrows</span>
            </button>
            <button onClick={() => setScreen("online-lobby")} className="flex-1 py-4 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/50 text-sky-400 font-black rounded-2xl transition-colors text-sm">
              🌐<br />Online<br /><span className="text-xs font-normal text-muted-foreground">vs friend</span>
            </button>
          </div>
        </div>
      </div>
    </Shell>
  );

  if (screen === "ai-diff") return (
    <Shell title="Snake — vs AI">
      <div className="flex flex-col items-center gap-6 max-w-sm w-full">
        <div className="text-5xl">🤖</div>
        <h2 className="text-xl font-black text-purple-400">Choose Difficulty</h2>
        <div className="flex flex-col gap-3 w-full">
          {(["easy", "medium", "hard"] as Difficulty[]).map(d => {
            const cfg = DIFF_LABELS[d];
            return (
              <button key={d} onClick={() => startGame("ai", d)} className={`w-full py-4 px-5 rounded-2xl border transition-colors font-black flex items-center gap-4 text-left
                ${d === "easy" ? "bg-green-500/15 hover:bg-green-500/25 border-green-500/40" : d === "medium" ? "bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40" : "bg-red-500/15 hover:bg-red-500/25 border-red-500/40"}`}>
                <span className="text-2xl">{cfg.icon}</span>
                <div>
                  <div className={`font-black ${cfg.color}`}>{cfg.label}</div>
                  <div className="text-xs text-muted-foreground font-normal">{cfg.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
        <button onClick={() => setScreen("menu")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</button>
      </div>
    </Shell>
  );

  if (screen === "online-lobby") return (
    <Shell title="Snake — Online">
      <OnlineLobby
        status={mp.status} roomCode={mp.roomCode} role={mp.role} error={mp.error}
        onCreate={() => mp.createRoom("snake")}
        onJoin={(code) => { mp.joinRoom(code); startOnlineGame("guest"); }}
        onDisconnect={() => { mp.disconnect(); }}
        onBack={() => { mp.disconnect(); setScreen("menu"); }}
      />
    </Shell>
  );

  const p2Label = isAI ? `🤖 AI (${DIFF_LABELS[difficulty].label})` : gameMode === "online" ? (mp.role === "host" ? "🟠 Guest" : "🟢 Host") : "🟠 P2";
  const controlsLabel = isAI ? `🟢 You: WASD/Arrows  ·  ${DIFF_LABELS[difficulty].icon} AI: ${DIFF_LABELS[difficulty].label}`
    : gameMode === "online" ? (mp.role === "host" ? "🟢 HOST (WASD)" : "🟠 GUEST (WASD/Arrows)")
    : gameMode === "2p" ? "🟢 P1: WASD · 🟠 P2: Arrows"
    : "WASD or Arrow keys";

  return (
    <Shell title="Snake" controls={controlsLabel}>
      <div className="flex gap-6 font-mono text-sm items-center">
        <span className="text-emerald-400">🟢 You: {p1Score}</span>
        {gameMode !== "1p" && <span className={isAI ? "text-purple-400" : "text-orange-400"}>{p2Label}: {p2Score}</span>}
        {gameMode === "1p" && <span className="text-muted-foreground">Best: {best}</span>}
        {isAI && (
          <span className={`text-xs px-2 py-0.5 rounded-full border ${difficulty === "easy" ? "border-green-500/50 text-green-400" : difficulty === "medium" ? "border-amber-500/50 text-amber-400" : "border-red-500/50 text-red-400"}`}>
            {DIFF_LABELS[difficulty].icon} {DIFF_LABELS[difficulty].label}
          </span>
        )}
      </div>
      <div className="relative">
        <canvas ref={cv} width={W} height={H}
          className="rounded-lg border border-emerald-900/60"
          style={{ maxWidth: "min(95vw, 624px)", height: "auto" }}
        />
        {isOnlineGuest && screen === "game" && (
          <div className="absolute top-2 left-0 right-0 flex justify-center pointer-events-none">
            <span className="bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs px-3 py-1 rounded-full">You are 🟠 P2 — WASD or Arrows</span>
          </div>
        )}
        {screen === "over" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 rounded-lg gap-4">
            <p className="text-2xl font-black text-white">{winner ?? "Game Over"}</p>
            <p className="font-mono text-sm text-muted-foreground">
              {gameMode !== "1p" ? `You: ${p1Score}  ·  ${isAI ? "AI" : "P2"}: ${p2Score}` : `Score: ${p1Score}  ·  Best: ${best}`}
            </p>
            <div className="flex gap-3">
              {gameMode !== "online" && <button onClick={() => startGame(gameMode, isAI ? difficulty : undefined)} className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg">
                {isAI ? "Try Again" : "Play Again"}
              </button>}
              <button onClick={() => { mp.disconnect(); setScreen("menu"); }} className="px-6 py-2 bg-secondary text-foreground font-bold rounded-lg">Menu</button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
