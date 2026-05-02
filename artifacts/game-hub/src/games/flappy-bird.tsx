import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

function Shell({ title, controls, children }: { title: string; controls?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-4 px-4 py-3 border-b border-lime-500/30 bg-gradient-to-r from-lime-950/60 to-transparent">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Hub</span>
        </Link>
        <span className="text-2xl select-none" style={{ filter: "drop-shadow(0 0 8px #a3e63580)" }}>🐦</span>
        <h1 className="text-lg font-bold text-lime-400">{title}</h1>
        {controls && <span className="text-xs text-muted-foreground ml-auto hidden sm:block">{controls}</span>}
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">{children}</div>
    </div>
  );
}

const W = 480; const H = 600; const GAP = 155; const PIPE_W = 60; const BIRD_R = 16;
const GRAVITY = 0.5; const JUMP = -9; const PIPE_SPD = 3; const PIPE_INTERVAL = 90;
const B1X = 110; const B2X = 330;

type Bird = { y: number; vy: number; alive: boolean; score: number; rot: number };
type GameState = {
  mode: "1p" | "2p";
  b1: Bird; b2: Bird;
  pipes: { x: number; top: number; scored1: boolean; scored2: boolean }[];
  frame: number; state: "idle" | "playing" | "dead";
  best: number;
};

function initState(mode: "1p" | "2p"): GameState {
  return {
    mode,
    b1: { y: H / 2, vy: 0, alive: true, score: 0, rot: 0 },
    b2: { y: H / 2 + 40, vy: 0, alive: true, score: 0, rot: 0 },
    pipes: [], frame: 0, state: "idle",
    best: +localStorage.getItem("fb-best")! || 0,
  };
}

function drawBird(ctx: CanvasRenderingContext2D, x: number, y: number, rot: number, color: string, alive: boolean) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.globalAlpha = alive ? 1 : 0.35;
  ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, 0, BIRD_R, BIRD_R - 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fb923c"; ctx.beginPath(); ctx.ellipse(BIRD_R - 4, 2, 7, 4, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(4, -5, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1e293b"; ctx.beginPath(); ctx.arc(6, -5, 3, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1; ctx.restore();
}

export default function FlappyBird() {
  const cv = useRef<HTMLCanvasElement>(null);
  const g = useRef<GameState>(initState("1p"));
  const [screen, setScreen] = useState<"menu" | "game">("menu");
  const [gameState, setGameState] = useState<"idle" | "playing" | "dead">("idle");
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [best, setBest] = useState(() => +localStorage.getItem("fb-best")! || 0);
  const [gameMode, setGameMode] = useState<"1p" | "2p">("1p");
  const raf = useRef(0);

  const draw = useCallback(() => {
    const c = cv.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const s = g.current;
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#0ea5e9"); sky.addColorStop(1, "#7dd3fc");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#854d0e"; ctx.fillRect(0, H - 60, W, 60);
    ctx.fillStyle = "#65a30d"; ctx.fillRect(0, H - 65, W, 12);
    s.pipes.forEach(p => {
      ctx.fillStyle = "#16a34a"; ctx.fillRect(p.x, 0, PIPE_W, p.top); ctx.fillRect(p.x, p.top + GAP, PIPE_W, H - p.top - GAP);
      ctx.fillStyle = "#15803d"; ctx.fillRect(p.x - 4, p.top - 18, PIPE_W + 8, 18); ctx.fillRect(p.x - 4, p.top + GAP, PIPE_W + 8, 18);
    });
    // Draw birds
    drawBird(ctx, B1X, s.b1.y, s.b1.rot, "#facc15", s.b1.alive);
    if (s.mode === "2p") drawBird(ctx, B2X, s.b2.y, s.b2.rot, "#67e8f9", s.b2.alive);
    // Score HUD
    ctx.fillStyle = "#fff"; ctx.font = "bold 28px monospace"; ctx.textAlign = "center"; ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 4;
    if (s.mode === "1p") { ctx.fillText(String(s.b1.score), W / 2, 55); }
    else { ctx.fillStyle = "#facc15"; ctx.fillText(String(s.b1.score), W / 2 - 50, 55); ctx.fillStyle = "#67e8f9"; ctx.fillText(String(s.b2.score), W / 2 + 50, 55); ctx.fillStyle = "#fff"; ctx.font = "16px monospace"; ctx.fillText("vs", W / 2, 50); }
    ctx.shadowBlur = 0;
  }, []);

  const loop = useCallback(() => {
    const s = g.current;
    if (s.state !== "playing") { draw(); return; }
    s.frame++;
    const updateBird = (b: Bird, bx: number) => {
      if (!b.alive) return;
      b.vy += GRAVITY; b.y += b.vy; b.rot = Math.max(-0.5, Math.min(1.2, b.vy * 0.06));
    };
    updateBird(s.b1, B1X); if (s.mode === "2p") updateBird(s.b2, B2X);
    if (s.frame % PIPE_INTERVAL === 0) s.pipes.push({ x: W, top: 80 + Math.random() * (H - GAP - 140), scored1: false, scored2: false });
    s.pipes.forEach(p => { p.x -= PIPE_SPD; });
    s.pipes = s.pipes.filter(p => p.x > -PIPE_W);
    // Scoring + collision
    const hitsBird = (b: Bird, bx: number) => {
      if (!b.alive) return false;
      return b.y - BIRD_R <= 0 || b.y + BIRD_R >= H - 60 ||
        s.pipes.some(p => bx + BIRD_R > p.x && bx - BIRD_R < p.x + PIPE_W && (b.y - BIRD_R < p.top || b.y + BIRD_R > p.top + GAP));
    };
    s.pipes.forEach(p => {
      if (!p.scored1 && s.b1.alive && p.x + PIPE_SPD >= B1X - BIRD_R && p.x < B1X - BIRD_R) { s.b1.score++; p.scored1 = true; setP1Score(s.b1.score); }
      if (!p.scored2 && s.b2.alive && p.x + PIPE_SPD >= B2X - BIRD_R && p.x < B2X - BIRD_R) { s.b2.score++; p.scored2 = true; setP2Score(s.b2.score); }
    });
    if (hitsBird(s.b1, B1X)) s.b1.alive = false;
    if (s.mode === "2p" && hitsBird(s.b2, B2X)) s.b2.alive = false;
    const allDead = !s.b1.alive && (s.mode === "1p" || !s.b2.alive);
    if (allDead) {
      s.state = "dead"; setGameState("dead");
      const nb = Math.max(s.mode === "2p" ? Math.max(s.b1.score, s.b2.score) : s.b1.score, s.best);
      s.best = nb; localStorage.setItem("fb-best", String(nb)); setBest(nb);
      draw(); return;
    }
    draw(); raf.current = requestAnimationFrame(loop);
  }, [draw]);

  const flapBird = useCallback((player: 1 | 2) => {
    const s = g.current;
    if (s.state === "idle") { s.state = "playing"; setGameState("playing"); raf.current = requestAnimationFrame(loop); }
    if (s.state === "dead") return;
    if (player === 1 && s.b1.alive) s.b1.vy = JUMP;
    if (player === 2 && s.b2.alive) s.b2.vy = JUMP;
  }, [loop]);

  const resetGame = useCallback((m: "1p" | "2p") => {
    g.current = initState(m); setGameMode(m); setP1Score(0); setP2Score(0); setGameState("idle");
    cancelAnimationFrame(raf.current); draw();
  }, [draw]);

  useEffect(() => {
    if (screen !== "game") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "KeyZ") { e.preventDefault(); flapBird(1); }
      if (e.code === "Enter" || e.code === "ShiftRight") { e.preventDefault(); flapBird(2); }
    };
    window.addEventListener("keydown", onKey); draw();
    return () => { window.removeEventListener("keydown", onKey); cancelAnimationFrame(raf.current); };
  }, [screen, flapBird, draw]);

  const b1 = g.current.b1; const b2 = g.current.b2;
  const winner2p = gameMode === "2p" ? (p1Score > p2Score ? "🟡 P1 Wins!" : p2Score > p1Score ? "🔵 P2 Wins!" : "🤝 Tie!") : null;

  if (screen === "menu") return (
    <Shell title="Flappy Bird" controls="">
      <div className="flex flex-col items-center gap-8 text-center max-w-sm">
        <div className="text-6xl select-none">🐦</div>
        <h2 className="text-2xl font-black text-lime-400">Select Mode</h2>
        <div className="flex gap-4 w-full">
          <button onClick={() => { resetGame("1p"); setScreen("game"); }} className="flex-1 py-4 bg-lime-500/20 hover:bg-lime-500/30 border border-lime-500/50 text-lime-400 font-black rounded-2xl transition-colors">
            👤<br /><span className="text-sm font-semibold">1 Player</span><br /><span className="text-xs font-normal text-muted-foreground">Space to flap</span>
          </button>
          <button onClick={() => { resetGame("2p"); setScreen("game"); }} className="flex-1 py-4 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-400 font-black rounded-2xl transition-colors">
            👥<br /><span className="text-sm font-semibold">2 Players</span><br /><span className="text-xs font-normal text-muted-foreground">P1: Space · P2: Enter</span>
          </button>
        </div>
      </div>
    </Shell>
  );

  return (
    <Shell title="Flappy Bird" controls={gameMode === "2p" ? "🟡 P1: Space · 🔵 P2: Enter" : "Space or tap to flap"}>
      {gameMode === "2p" && (
        <div className="flex gap-8 font-mono text-sm">
          <span className="text-yellow-400">🟡 P1: {p1Score}</span>
          <span className="text-cyan-400">🔵 P2: {p2Score}</span>
        </div>
      )}
      {gameMode === "1p" && <div className="flex gap-8 font-mono text-sm text-lime-400"><span>Score: {p1Score}</span><span>Best: {best}</span></div>}
      <div className="relative cursor-pointer" onClick={() => flapBird(1)}>
        <canvas ref={cv} width={W} height={H} className="rounded-xl border border-slate-700" style={{ maxHeight: "75vh" }} />
        {gameState === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 rounded-xl gap-3">
            <p className="text-2xl font-black text-white">Ready!</p>
            <p className="text-sm text-yellow-300">{gameMode === "2p" ? "P1: Space · P2: Enter" : "Tap or Space to start"}</p>
          </div>
        )}
        {gameState === "dead" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-xl gap-4">
            <p className="text-2xl font-black text-white">{winner2p ?? "Game Over!"}</p>
            {gameMode === "2p" ? <p className="font-mono text-sm text-muted-foreground">P1: {p1Score} · P2: {p2Score}</p> : <p className="text-lime-400 font-mono">Score: {p1Score}  Best: {best}</p>}
            <div className="flex gap-3">
              <button onClick={() => resetGame(gameMode)} className="px-6 py-2 bg-lime-500 hover:bg-lime-400 text-black font-bold rounded-xl">Play Again</button>
              <button onClick={() => setScreen("menu")} className="px-6 py-2 bg-secondary text-foreground font-bold rounded-xl">Menu</button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
