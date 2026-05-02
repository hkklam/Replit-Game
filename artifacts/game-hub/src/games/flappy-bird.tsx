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

const W = 480; const H = 600; const GAP = 155; const PIPE_W = 60; const BIRD_R = 16;
const GRAVITY = 0.5; const JUMP = -9; const PIPE_SPD = 3; const PIPE_INTERVAL = 90;

export default function FlappyBird() {
  const cv = useRef<HTMLCanvasElement>(null);
  const g = useRef({ by: H / 2, bvy: 0, pipes: [] as { x: number; top: number }[], score: 0, best: +localStorage.getItem("fb-best")! || 0, frame: 0, state: "idle" as "idle" | "playing" | "dead", brot: 0 });
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => +localStorage.getItem("fb-best")! || 0);
  const [state, setState] = useState<"idle" | "playing" | "dead">("idle");
  const raf = useRef(0);

  const drawBird = (ctx: CanvasRenderingContext2D, x: number, y: number, rot: number) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.ellipse(0, 0, BIRD_R, BIRD_R - 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fb923c"; ctx.beginPath(); ctx.ellipse(BIRD_R - 4, 2, 7, 4, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(4, -5, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1e293b"; ctx.beginPath(); ctx.arc(6, -5, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };

  const draw = useCallback(() => {
    const c = cv.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const s = g.current;
    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#0ea5e9"); sky.addColorStop(1, "#7dd3fc");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    // Ground
    ctx.fillStyle = "#854d0e"; ctx.fillRect(0, H - 60, W, 60);
    ctx.fillStyle = "#65a30d"; ctx.fillRect(0, H - 65, W, 12);
    // Pipes
    s.pipes.forEach(p => {
      ctx.fillStyle = "#16a34a";
      ctx.fillRect(p.x, 0, PIPE_W, p.top);
      ctx.fillRect(p.x, p.top + GAP, PIPE_W, H - p.top - GAP);
      ctx.fillStyle = "#15803d";
      ctx.fillRect(p.x - 4, p.top - 18, PIPE_W + 8, 18);
      ctx.fillRect(p.x - 4, p.top + GAP, PIPE_W + 8, 18);
    });
    // Bird
    const rot = Math.max(-0.5, Math.min(1.2, s.bvy * 0.06));
    drawBird(ctx, 120, s.by, rot);
    // Score
    ctx.fillStyle = "#fff"; ctx.font = "bold 36px monospace"; ctx.textAlign = "center"; ctx.shadowColor = "rgba(0,0,0,0.4)"; ctx.shadowBlur = 4;
    ctx.fillText(String(s.score), W / 2, 60); ctx.shadowBlur = 0;
  }, []);

  const loop = useCallback(() => {
    const s = g.current;
    if (s.state !== "playing") { draw(); return; }
    s.bvy += GRAVITY; s.by += s.bvy;
    s.brot = Math.max(-0.5, Math.min(1.2, s.bvy * 0.06));
    s.frame++;
    if (s.frame % PIPE_INTERVAL === 0) {
      const top = 80 + Math.random() * (H - GAP - 140);
      s.pipes.push({ x: W, top });
    }
    s.pipes.forEach(p => { p.x -= PIPE_SPD; });
    s.pipes = s.pipes.filter(p => p.x > -PIPE_W);
    // Score
    s.pipes.forEach(p => { if (p.x + PIPE_SPD >= 120 - BIRD_R && p.x < 120 - BIRD_R) { s.score++; setScore(s.score); } });
    // Collide
    const hit = s.by - BIRD_R <= 0 || s.by + BIRD_R >= H - 60 ||
      s.pipes.some(p => 120 + BIRD_R > p.x && 120 - BIRD_R < p.x + PIPE_W && (s.by - BIRD_R < p.top || s.by + BIRD_R > p.top + GAP));
    if (hit) {
      s.state = "dead"; setState("dead");
      const nb = Math.max(s.score, s.best); s.best = nb;
      localStorage.setItem("fb-best", String(nb)); setBest(nb);
      draw(); return;
    }
    draw(); raf.current = requestAnimationFrame(loop);
  }, [draw]);

  const flap = useCallback(() => {
    const s = g.current;
    if (s.state === "dead") {
      s.by = H / 2; s.bvy = 0; s.pipes = []; s.score = 0; s.frame = 0; s.state = "playing";
      setState("playing"); setScore(0); cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(loop);
    } else if (s.state === "idle") {
      s.state = "playing"; setState("playing"); raf.current = requestAnimationFrame(loop); s.bvy = JUMP;
    } else {
      s.bvy = JUMP;
    }
  }, [loop]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); flap(); } };
    window.addEventListener("keydown", onKey); draw();
    return () => { window.removeEventListener("keydown", onKey); cancelAnimationFrame(raf.current); };
  }, [flap, draw]);

  return (
    <Shell title="Flappy Bird" controls="Space or tap to flap">
      <div className="flex gap-8 font-mono text-sm text-lime-400"><span>Score: {score}</span><span>Best: {best}</span></div>
      <div className="relative cursor-pointer" onClick={flap}>
        <canvas ref={cv} width={W} height={H} className="rounded-xl border border-slate-700" style={{ maxHeight: "75vh" }} />
        {state === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 rounded-xl gap-3">
            <p className="text-2xl font-black text-white">Flappy Bird</p>
            <p className="text-sm text-yellow-300">Tap or press Space to start</p>
          </div>
        )}
        {state === "dead" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-xl gap-4">
            <p className="text-2xl font-black text-white">Game Over!</p>
            <p className="text-lime-400 font-mono">Score: {score}  Best: {best}</p>
            <p className="text-sm text-yellow-300">Tap or press Space to retry</p>
          </div>
        )}
      </div>
    </Shell>
  );
}
