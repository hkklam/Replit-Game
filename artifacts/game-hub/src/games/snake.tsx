import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

function Shell({ title, controls, children }: { title: string; controls?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-4 px-4 py-3 border-b border-border">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Hub</span>
        </Link>
        <h1 className="text-lg font-bold text-primary">{title}</h1>
        {controls && <span className="text-xs text-muted-foreground ml-auto hidden sm:block">{controls}</span>}
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">{children}</div>
    </div>
  );
}

const GRID = 20; const CELL = 24; const W = GRID * CELL; const H = GRID * CELL;
const SPEED0 = 140;
type P = { x: number; y: number };

function rnd(snake: P[]): P {
  let p: P;
  do { p = { x: (Math.random() * GRID) | 0, y: (Math.random() * GRID) | 0 }; }
  while (snake.some(s => s.x === p.x && s.y === p.y));
  return p;
}

export default function Snake() {
  const cv = useRef<HTMLCanvasElement>(null);
  const g = useRef({ snake: [{ x: 10, y: 10 }] as P[], dir: { x: 1, y: 0 }, nd: { x: 1, y: 0 }, food: { x: 5, y: 5 } as P, score: 0, alive: true, last: 0, spd: SPEED0 });
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => +localStorage.getItem("snk-best")! || 0);
  const [dead, setDead] = useState(false);
  const raf = useRef(0);

  const draw = useCallback(() => {
    const c = cv.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#0d1117"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    for (let x = 0; x < GRID; x++) for (let y = 0; y < GRID; y++) ctx.fillRect(x * CELL + 11, y * CELL + 11, 2, 2);
    const { snake, food } = g.current;
    ctx.fillStyle = "#f43f5e";
    ctx.beginPath(); ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 3, 0, Math.PI * 2); ctx.fill();
    snake.forEach((s, i) => {
      const t = i / Math.max(snake.length - 1, 1);
      ctx.fillStyle = `hsl(${160 - t * 30},84%,${45 - t * 15}%)`;
      ctx.beginPath(); ctx.roundRect(s.x * CELL + 2, s.y * CELL + 2, CELL - 4, CELL - 4, 4); ctx.fill();
    });
  }, []);

  const loop = useCallback((now: number) => {
    const s = g.current;
    if (!s.alive) { draw(); return; }
    if (now - s.last > s.spd) {
      s.last = now; s.dir = s.nd;
      const h = { x: s.snake[0].x + s.dir.x, y: s.snake[0].y + s.dir.y };
      if (h.x < 0 || h.x >= GRID || h.y < 0 || h.y >= GRID || s.snake.some(p => p.x === h.x && p.y === h.y)) {
        s.alive = false;
        const nb = Math.max(s.score, +localStorage.getItem("snk-best")! || 0);
        localStorage.setItem("snk-best", String(nb)); setBest(nb); setDead(true); draw(); return;
      }
      s.snake.unshift(h);
      if (h.x === s.food.x && h.y === s.food.y) { s.score++; s.spd = Math.max(65, SPEED0 - s.score * 4); s.food = rnd(s.snake); setScore(s.score); }
      else s.snake.pop();
    }
    draw(); raf.current = requestAnimationFrame(loop);
  }, [draw]);

  const reset = useCallback(() => {
    g.current = { snake: [{ x: 10, y: 10 }], dir: { x: 1, y: 0 }, nd: { x: 1, y: 0 }, food: rnd([{ x: 10, y: 10 }]), score: 0, alive: true, last: 0, spd: SPEED0 };
    setScore(0); setDead(false); cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(loop);
  }, [loop]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const m: Record<string, P> = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 } };
      const nd = m[e.key]; if (!nd) return;
      if (nd.x === -g.current.dir.x && nd.y === -g.current.dir.y) return;
      g.current.nd = nd; if (["Arrow","w","a","s","d"].some(k => e.key.startsWith(k))) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    raf.current = requestAnimationFrame(loop);
    return () => { window.removeEventListener("keydown", onKey); cancelAnimationFrame(raf.current); };
  }, [loop]);

  return (
    <Shell title="Snake" controls="Arrow keys or WASD to move">
      <div className="flex gap-8 font-mono text-emerald-400 text-sm"><span>Score: {score}</span><span>Best: {best}</span></div>
      <div className="relative">
        <canvas ref={cv} width={W} height={H} className="rounded-lg border border-slate-700" />
        {dead && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 rounded-lg gap-4">
            <p className="text-2xl font-black text-white">Game Over</p>
            <p className="text-emerald-400 font-mono">Score: {score}</p>
            <button onClick={reset} className="px-8 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg">Play Again</button>
          </div>
        )}
      </div>
      {!dead && score === 0 && <p className="text-xs text-muted-foreground">Press any arrow key to start</p>}
    </Shell>
  );
}
