import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

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

const GRID = 20; const CELL = 24; const W = GRID * CELL; const H = GRID * CELL;
const SPEED0 = 140;
type P = { x: number; y: number };
type Snake = { snake: P[]; dir: P; nd: P; alive: boolean; score: number };

function rnd(occupied: P[]): P {
  let p: P;
  do { p = { x: (Math.random() * GRID) | 0, y: (Math.random() * GRID) | 0 }; }
  while (occupied.some(s => s.x === p.x && s.y === p.y));
  return p;
}

function initState(mode: "1p" | "2p") {
  const s1Body = [{ x: 5, y: 10 }];
  const s2Body = [{ x: 15, y: 10 }];
  return {
    mode,
    s1: { snake: s1Body, dir: { x: 1, y: 0 }, nd: { x: 1, y: 0 }, alive: true, score: 0 } as Snake,
    s2: { snake: s2Body, dir: { x: -1, y: 0 }, nd: { x: -1, y: 0 }, alive: true, score: 0 } as Snake,
    food: rnd([...s1Body, ...s2Body]),
    last: 0, spd: SPEED0,
  };
}

export default function SnakeGame() {
  const cv = useRef<HTMLCanvasElement>(null);
  const g = useRef(initState("1p"));
  const [screen, setScreen] = useState<"menu" | "playing" | "over">("menu");
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [best, setBest] = useState(() => +localStorage.getItem("snk-best")! || 0);
  const [gameMode, setGameMode] = useState<"1p" | "2p">("1p");
  const raf = useRef(0);

  const draw = useCallback(() => {
    const c = cv.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#0d1117"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    for (let x = 0; x < GRID; x++) for (let y = 0; y < GRID; y++) ctx.fillRect(x * CELL + 11, y * CELL + 11, 2, 2);
    const { s1, s2, food, mode } = g.current;
    ctx.fillStyle = "#f43f5e";
    ctx.beginPath(); ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 3, 0, Math.PI * 2); ctx.fill();
    s1.snake.forEach((s, i) => {
      const t = i / Math.max(s1.snake.length - 1, 1);
      ctx.fillStyle = s1.alive ? `hsl(${160 - t * 30},84%,${45 - t * 15}%)` : "#374151";
      ctx.beginPath(); ctx.roundRect(s.x * CELL + 2, s.y * CELL + 2, CELL - 4, CELL - 4, 4); ctx.fill();
    });
    if (mode === "2p") {
      s2.snake.forEach((s, i) => {
        const t = i / Math.max(s2.snake.length - 1, 1);
        ctx.fillStyle = s2.alive ? `hsl(${28 - t * 10},90%,${55 - t * 15}%)` : "#374151";
        ctx.beginPath(); ctx.roundRect(s.x * CELL + 2, s.y * CELL + 2, CELL - 4, CELL - 4, 4); ctx.fill();
      });
    }
  }, []);

  const loop = useCallback((now: number) => {
    const st = g.current;
    const done1p = st.mode === "1p" && !st.s1.alive;
    const done2p = st.mode === "2p" && !st.s1.alive && !st.s2.alive;
    if (done1p || done2p) { draw(); return; }
    if (now - st.last > st.spd) {
      st.last = now;
      const moveSnake = (sn: Snake, other: P[]) => {
        if (!sn.alive) return;
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
      const p2Body = st.mode === "2p" ? st.s2.snake : [];
      moveSnake(st.s1, p2Body);
      if (st.mode === "2p") moveSnake(st.s2, st.s1.snake);
      setP1Score(st.s1.score); setP2Score(st.s2.score);
      if ((st.mode === "1p" && !st.s1.alive) || (st.mode === "2p" && !st.s1.alive && !st.s2.alive)) {
        if (st.mode === "1p") { const nb = Math.max(st.s1.score, +localStorage.getItem("snk-best")! || 0); localStorage.setItem("snk-best", String(nb)); setBest(nb); }
        setScreen("over"); draw(); return;
      }
    }
    draw(); raf.current = requestAnimationFrame(loop);
  }, [draw]);

  const startGame = useCallback((m: "1p" | "2p") => {
    g.current = initState(m); setGameMode(m); setP1Score(0); setP2Score(0); setScreen("playing");
    cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(loop);
  }, [loop]);

  useEffect(() => {
    if (screen !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      const m1: Record<string, P> = { w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 } };
      const m2: Record<string, P> = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 } };
      const nd1 = m1[e.key];
      if (nd1 && g.current.s1.alive && !(nd1.x === -g.current.s1.dir.x && nd1.y === -g.current.s1.dir.y)) g.current.s1.nd = nd1;
      const nd2 = m2[e.key];
      if (nd2 && g.current.s2.alive && !(nd2.x === -g.current.s2.dir.x && nd2.y === -g.current.s2.dir.y)) g.current.s2.nd = nd2;
      if (["Arrow", "w", "a", "s", "d"].some(k => e.key.startsWith(k) || e.key === k)) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen]);

  const winner = gameMode === "2p"
    ? (!g.current.s1.alive && g.current.s2.alive ? "🟠 P2 Wins!" : g.current.s1.alive && !g.current.s2.alive ? "🟢 P1 Wins!" : p1Score > p2Score ? "🟢 P1 Wins!" : p2Score > p1Score ? "🟠 P2 Wins!" : "🤝 Draw!")
    : null;

  if (screen === "menu") return (
    <Shell title="Snake" controls="">
      <div className="flex flex-col items-center gap-8 text-center max-w-sm">
        <div className="text-6xl select-none">🐍</div>
        <h2 className="text-2xl font-black text-emerald-400">Select Mode</h2>
        <div className="flex gap-4 w-full">
          <button onClick={() => startGame("1p")} className="flex-1 py-4 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-400 font-black rounded-2xl text-base transition-colors">
            👤<br /><span className="text-sm font-semibold">1 Player</span><br /><span className="text-xs font-normal text-muted-foreground">WASD / Arrows</span>
          </button>
          <button onClick={() => startGame("2p")} className="flex-1 py-4 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 text-orange-400 font-black rounded-2xl text-base transition-colors">
            👥<br /><span className="text-sm font-semibold">2 Players</span><br /><span className="text-xs font-normal text-muted-foreground">P1: WASD · P2: Arrows</span>
          </button>
        </div>
      </div>
    </Shell>
  );

  return (
    <Shell title="Snake" controls={gameMode === "2p" ? "🟢 P1: WASD · 🟠 P2: Arrows" : "WASD or Arrow keys"}>
      <div className="flex gap-8 font-mono text-sm">
        <span className="text-emerald-400">🟢 P1: {p1Score}</span>
        {gameMode === "2p" && <span className="text-orange-400">🟠 P2: {p2Score}</span>}
        {gameMode === "1p" && <span className="text-muted-foreground">Best: {best}</span>}
      </div>
      <div className="relative">
        <canvas ref={cv} width={W} height={H} className="rounded-lg border border-slate-700" />
        {screen === "over" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 rounded-lg gap-4">
            <p className="text-2xl font-black text-white">{winner ?? "Game Over"}</p>
            <p className="font-mono text-sm text-muted-foreground">{gameMode === "2p" ? `P1: ${p1Score}  ·  P2: ${p2Score}` : `Score: ${p1Score}  ·  Best: ${best}`}</p>
            <div className="flex gap-3">
              <button onClick={() => startGame(gameMode)} className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg">Play Again</button>
              <button onClick={() => setScreen("menu")} className="px-6 py-2 bg-secondary text-foreground font-bold rounded-lg">Menu</button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
