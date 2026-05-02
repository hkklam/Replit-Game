import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

function Shell({ title, controls, children }: { title: string; controls?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-4 px-4 py-3 border-b border-sky-500/30 bg-gradient-to-r from-sky-950/60 to-transparent">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Hub</span>
        </Link>
        <span className="text-2xl select-none" style={{ filter: "drop-shadow(0 0 8px #38bdf880)" }}>🏓</span>
        <h1 className="text-lg font-bold text-sky-400">{title}</h1>
        {controls && <span className="text-xs text-muted-foreground ml-auto hidden sm:block">{controls}</span>}
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">{children}</div>
    </div>
  );
}

const W = 800; const H = 500; const PW = 12; const PH = 80; const BR = 8; const WIN = 7; const SPD0 = 5;

export default function Pong() {
  const cv = useRef<HTMLCanvasElement>(null);
  const g = useRef({
    p1y: H / 2 - PH / 2, p2y: H / 2 - PH / 2,
    bx: W / 2, by: H / 2, bvx: SPD0, bvy: 3,
    s1: 0, s2: 0, running: false, over: false, winner: "",
    keys: new Set<string>(),
  });
  const [scores, setScores] = useState([0, 0]);
  const [over, setOver] = useState(false);
  const [winner, setWinner] = useState("");
  const raf = useRef(0);

  const draw = useCallback(() => {
    const c = cv.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const s = g.current;
    ctx.fillStyle = "#0d1117"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.setLineDash([10, 10]);
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#10b981";
    ctx.fillRect(20, s.p1y, PW, PH);
    ctx.fillRect(W - 20 - PW, s.p2y, PW, PH);
    ctx.fillStyle = "#f0f0f0";
    ctx.beginPath(); ctx.arc(s.bx, s.by, BR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "bold 48px monospace"; ctx.textAlign = "center";
    ctx.fillText(String(s.s1), W / 4, 60);
    ctx.fillText(String(s.s2), 3 * W / 4, 60);
  }, []);

  const loop = useCallback(() => {
    const s = g.current;
    if (!s.running || s.over) { draw(); return; }
    const { keys } = s;
    const spd = 6;
    if (keys.has("w")) s.p1y = Math.max(0, s.p1y - spd);
    if (keys.has("s")) s.p1y = Math.min(H - PH, s.p1y + spd);
    if (keys.has("ArrowUp")) s.p2y = Math.max(0, s.p2y - spd);
    if (keys.has("ArrowDown")) s.p2y = Math.min(H - PH, s.p2y + spd);
    s.bx += s.bvx; s.by += s.bvy;
    if (s.by - BR <= 0) { s.by = BR; s.bvy = Math.abs(s.bvy); }
    if (s.by + BR >= H) { s.by = H - BR; s.bvy = -Math.abs(s.bvy); }
    // P1 paddle
    if (s.bx - BR <= 20 + PW && s.bx - BR >= 18 && s.by >= s.p1y - BR && s.by <= s.p1y + PH + BR) {
      s.bvx = Math.abs(s.bvx) * 1.05; s.bvy += ((s.by - (s.p1y + PH / 2)) / PH) * 5; s.bx = 20 + PW + BR;
    }
    // P2 paddle
    if (s.bx + BR >= W - 20 - PW && s.bx + BR <= W - 18 && s.by >= s.p2y - BR && s.by <= s.p2y + PH + BR) {
      s.bvx = -Math.abs(s.bvx) * 1.05; s.bvy += ((s.by - (s.p2y + PH / 2)) / PH) * 5; s.bx = W - 20 - PW - BR;
    }
    // Cap speed
    const speed = Math.sqrt(s.bvx * s.bvx + s.bvy * s.bvy);
    if (speed > 18) { s.bvx *= 18 / speed; s.bvy *= 18 / speed; }
    // Score
    if (s.bx < 0) { s.s2++; reset_ball(s, 1); setScores([s.s1, s.s2]); if (s.s2 >= WIN) { s.over = true; s.winner = "Player 2"; setWinner("Player 2"); setOver(true); } }
    if (s.bx > W) { s.s1++; reset_ball(s, -1); setScores([s.s1, s.s2]); if (s.s1 >= WIN) { s.over = true; s.winner = "Player 1"; setWinner("Player 1"); setOver(true); } }
    draw(); raf.current = requestAnimationFrame(loop);
  }, [draw]);

  function reset_ball(s: typeof g.current, dir: number) {
    s.bx = W / 2; s.by = H / 2;
    s.bvx = SPD0 * dir; s.bvy = (Math.random() - 0.5) * 6;
  }

  const start = useCallback(() => {
    const s = g.current;
    s.p1y = H / 2 - PH / 2; s.p2y = H / 2 - PH / 2;
    s.s1 = 0; s.s2 = 0; s.over = false; s.winner = ""; s.running = true;
    reset_ball(s, Math.random() > 0.5 ? 1 : -1);
    setScores([0, 0]); setOver(false); setWinner("");
    cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(loop);
  }, [loop]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      g.current.keys.add(e.key);
      if (["ArrowUp", "ArrowDown"].includes(e.key)) e.preventDefault();
      if (!g.current.running) { start(); }
    };
    const up = (e: KeyboardEvent) => g.current.keys.delete(e.key);
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    draw();
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); cancelAnimationFrame(raf.current); };
  }, [loop, draw, start]);

  return (
    <Shell title="Pong" controls="P1: W/S  ·  P2: ↑/↓">
      <div className="flex gap-12 font-mono text-sm text-white">
        <span className="text-sky-400">P1 (W/S): {scores[0]}</span>
        <span className="text-muted-foreground">First to {WIN}</span>
        <span className="text-rose-400">P2 (↑/↓): {scores[1]}</span>
      </div>
      <div className="relative">
        <canvas ref={cv} width={W} height={H} className="rounded-xl border border-slate-700 max-w-full" style={{ maxWidth: "min(800px, 95vw)" }} />
        {over && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-xl gap-4">
            <p className="text-3xl font-black text-primary">{winner} Wins!</p>
            <button onClick={start} className="px-8 py-2 bg-primary text-black font-bold rounded-lg">Play Again</button>
          </div>
        )}
        {!g.current.running && !over && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-xl gap-4">
            <p className="text-xl font-bold text-white">Press any key to start</p>
            <p className="text-sm text-muted-foreground">P1: W/S  ·  P2: Arrow Keys</p>
          </div>
        )}
      </div>
    </Shell>
  );
}
