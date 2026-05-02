import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

function Shell({ title, controls, children }: { title: string; controls?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-4 px-4 py-3 border-b border-indigo-500/30 bg-gradient-to-r from-indigo-950/60 to-transparent">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Hub</span>
        </Link>
        <span className="text-2xl select-none" style={{ filter: "drop-shadow(0 0 8px #818cf880)" }}>🏎️</span>
        <h1 className="text-lg font-bold text-indigo-400">{title}</h1>
        {controls && <span className="text-xs text-muted-foreground ml-auto hidden sm:block">{controls}</span>}
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">{children}</div>
    </div>
  );
}

const W = 700; const H = 560; const CAR_W = 14; const CAR_H = 24;
const WAYPOINTS = [
  { x: 350, y: 80 }, { x: 500, y: 80 }, { x: 580, y: 130 }, { x: 620, y: 200 },
  { x: 620, y: 360 }, { x: 580, y: 430 }, { x: 500, y: 480 }, { x: 350, y: 480 },
  { x: 200, y: 480 }, { x: 120, y: 430 }, { x: 80, y: 360 }, { x: 80, y: 200 },
  { x: 120, y: 130 }, { x: 200, y: 80 },
];
const INNER_SCALE = 0.5;
const INNER_WPS = WAYPOINTS.map(wp => ({ x: (wp.x - W / 2) * INNER_SCALE + W / 2, y: (wp.y - H / 2) * INNER_SCALE + H / 2 }));
const TRACK_W = 70;

export type Difficulty = "easy" | "medium" | "hard";

const AI_CFG: Record<Difficulty, { maxSpd: number; turnThresh: number; missChance: number; label: string; icon: string; desc: string; color: string }> = {
  easy:   { maxSpd: 3.2, turnThresh: 0.12, missChance: 0.28, label: "Easy",   icon: "🟢", desc: "Slow cars, wide turns",        color: "text-green-400" },
  medium: { maxSpd: 4.5, turnThresh: 0.06, missChance: 0.05, label: "Medium", icon: "🟡", desc: "Competitive pace, fair racing", color: "text-amber-400" },
  hard:   { maxSpd: 5.5, turnThresh: 0.03, missChance: 0,    label: "Hard",   icon: "🔴", desc: "Blazing speed, tight cornering", color: "text-red-400" },
};

function drawTrack(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#14532d"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#3b3b3b";
  ctx.beginPath(); ctx.moveTo(WAYPOINTS[0].x, WAYPOINTS[0].y);
  WAYPOINTS.forEach(wp => ctx.lineTo(wp.x, wp.y)); ctx.closePath();
  ctx.lineWidth = TRACK_W * 2; ctx.strokeStyle = "#3b3b3b"; ctx.lineJoin = "round"; ctx.stroke(); ctx.fill();
  ctx.fillStyle = "#166534";
  ctx.beginPath(); ctx.moveTo(INNER_WPS[0].x, INNER_WPS[0].y);
  INNER_WPS.forEach(wp => ctx.lineTo(wp.x, wp.y)); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#14532d"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#3b3b3b";
  ctx.beginPath(); ctx.moveTo(WAYPOINTS[0].x, WAYPOINTS[0].y);
  WAYPOINTS.forEach(wp => ctx.lineTo(wp.x, wp.y)); ctx.closePath();
  ctx.lineWidth = TRACK_W * 2; ctx.strokeStyle = "#3b3b3b"; ctx.stroke(); ctx.fill();
  ctx.fillStyle = "#166534";
  ctx.beginPath(); ctx.moveTo(INNER_WPS[0].x, INNER_WPS[0].y);
  INNER_WPS.forEach(wp => ctx.lineTo(wp.x, wp.y)); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.fillRect(WAYPOINTS[0].x - 2, WAYPOINTS[0].y - TRACK_W, 4, TRACK_W * 2);
  ctx.setLineDash([15, 20]); ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2;
  ctx.beginPath(); WAYPOINTS.forEach((wp, i) => { i === 0 ? ctx.moveTo(wp.x, wp.y) : ctx.lineTo(wp.x, wp.y); }); ctx.closePath(); ctx.stroke();
  ctx.setLineDash([]);
}

function isOnTrack(x: number, y: number): boolean {
  const poly = (pts: { x: number; y: number }[]) => { let inside = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside; } return inside; };
  return poly(WAYPOINTS) && !poly(INNER_WPS);
}

type Car = { x: number; y: number; angle: number; speed: number; color: string; lap: number; wpIdx: number; bestLap: number; lapStart: number; label: string };

function makeCar(color: string, label: string, offsetX = 0): Car {
  return { x: WAYPOINTS[0].x + offsetX, y: WAYPOINTS[0].y + 20, angle: 0, speed: 0, color, lap: 0, wpIdx: 1, bestLap: Infinity, lapStart: Date.now(), label };
}

type GameMode = "1p" | "2p";

export default function Racing() {
  const cv = useRef<HTMLCanvasElement>(null);
  const g = useRef({
    mode: "1p" as GameMode,
    aiDiff: "medium" as Difficulty,
    car: makeCar("#ef4444", "P1"), car2: makeCar("#22d3ee", "P2", 30),
    ai: [makeCar("#3b82f6", "AI 1"), makeCar("#a855f7", "AI 2", 40)],
    keys: new Set<string>(), frame: 0, state: "idle" as "idle" | "playing" | "done", winner: "",
  });
  const [screen, setScreen] = useState<"menu" | "ai-diff" | "race">("menu");
  const [state, setState] = useState<"idle" | "playing" | "done">("idle");
  const [lap1, setLap1] = useState(0); const [lap2, setLap2] = useState(0);
  const [laps1, setLaps1] = useState<number[]>([]); const [laps2, setLaps2] = useState<number[]>([]);
  const [winner, setWinner] = useState("");
  const [gameMode, setGameMode] = useState<GameMode>("1p");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const raf = useRef(0);

  const drawCar = useCallback((ctx: CanvasRenderingContext2D, car: Car) => {
    ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(car.angle + Math.PI / 2);
    ctx.fillStyle = car.color; ctx.fillRect(-CAR_W / 2, -CAR_H / 2, CAR_W, CAR_H);
    ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.fillRect(-CAR_W / 2, -CAR_H / 2, CAR_W, 6);
    ctx.fillStyle = "#000"; ctx.fillRect(-CAR_W / 2, CAR_H / 2 - 6, 5, 5); ctx.fillRect(CAR_W / 2 - 5, CAR_H / 2 - 6, 5, 5); ctx.fillRect(-CAR_W / 2, -CAR_H / 2, 5, 5); ctx.fillRect(CAR_W / 2 - 5, -CAR_H / 2, 5, 5);
    ctx.restore();
    ctx.fillStyle = "#fff"; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center"; ctx.fillText(car.label, car.x, car.y - 18);
  }, []);

  const draw = useCallback(() => {
    const c = cv.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    drawTrack(ctx);
    const s = g.current;
    s.ai.forEach(ai => drawCar(ctx, ai));
    if (s.mode === "2p") drawCar(ctx, s.car2);
    drawCar(ctx, s.car);
    ctx.fillStyle = "rgba(0,0,0,0.65)"; ctx.fillRect(0, 0, W, s.mode === "2p" ? 48 : 30);
    ctx.fillStyle = "#ef4444"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`P1 🏎️  Lap: ${s.car.lap}  ${Math.round(s.car.speed * 30)}km/h  Best: ${s.car.bestLap < Infinity ? (s.car.bestLap / 1000).toFixed(2) + "s" : "-"}`, 8, 16);
    if (s.mode === "2p") { ctx.fillStyle = "#22d3ee"; ctx.fillText(`P2 🏎️  Lap: ${s.car2.lap}  ${Math.round(s.car2.speed * 30)}km/h  Best: ${s.car2.bestLap < Infinity ? (s.car2.bestLap / 1000).toFixed(2) + "s" : "-"}`, 8, 38); }
  }, [drawCar]);

  const loop = useCallback(() => {
    const s = g.current; s.frame++;
    const accel = 0.18, brake = 0.22, turnSpd = 0.055, friction = 0.96, offRoad = 0.88;
    const updateCar = (c: Car, left: boolean, right: boolean, up: boolean, down: boolean, maxSpd = 5.5): boolean => {
      if (left) c.angle -= turnSpd * Math.max(0.2, c.speed / 5);
      if (right) c.angle += turnSpd * Math.max(0.2, c.speed / 5);
      if (up) c.speed = Math.min(c.speed + accel, maxSpd);
      else if (down) c.speed = Math.max(c.speed - brake, -2);
      c.speed *= isOnTrack(c.x + Math.cos(c.angle) * c.speed, c.y + Math.sin(c.angle) * c.speed) ? friction : offRoad;
      if (Math.abs(c.speed) < 0.01) c.speed = 0;
      c.x += Math.cos(c.angle) * c.speed; c.y += Math.sin(c.angle) * c.speed;
      c.x = Math.max(5, Math.min(W - 5, c.x)); c.y = Math.max(5, Math.min(H - 5, c.y));
      const wp = WAYPOINTS[c.wpIdx];
      if (Math.sqrt((c.x - wp.x) ** 2 + (c.y - wp.y) ** 2) < 40) {
        c.wpIdx = (c.wpIdx + 1) % WAYPOINTS.length;
        if (c.wpIdx === 0) { c.wpIdx = 1; c.lap++; const lt = Date.now() - c.lapStart; if (lt < c.bestLap) c.bestLap = lt; c.lapStart = Date.now(); return true; }
      }
      return false;
    };
    const k = s.keys;
    const lap1Done = updateCar(s.car, k.has("ArrowLeft"), k.has("ArrowRight"), k.has("ArrowUp"), k.has("ArrowDown"));
    if (lap1Done) { setLap1(s.car.lap); setLaps1(prev => [...prev, s.car.bestLap]); if (s.car.lap >= 3) { s.state = "done"; s.winner = "P1"; setWinner("P1"); setState("done"); draw(); return; } }
    if (s.mode === "2p") {
      const lap2Done = updateCar(s.car2, k.has("a"), k.has("d"), k.has("w"), k.has("s"));
      if (lap2Done) { setLap2(s.car2.lap); setLaps2(prev => [...prev, s.car2.bestLap]); if (s.car2.lap >= 3) { s.state = "done"; s.winner = "P2"; setWinner("P2"); setState("done"); draw(); return; } }
    }
    const cfg = AI_CFG[s.aiDiff];
    s.ai.forEach(ai => {
      const twp = WAYPOINTS[ai.wpIdx];
      const ang = Math.atan2(twp.y - ai.y, twp.x - ai.x);
      let da = ang - ai.angle; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      const accelNow = Math.random() > cfg.missChance;
      const lapDone = updateCar(ai, da < -cfg.turnThresh, da > cfg.turnThresh, accelNow, false, cfg.maxSpd);
      if (lapDone && ai.lap >= 3 && s.mode === "1p") { s.state = "done"; s.winner = ai.label; setWinner(ai.label); setState("done"); draw(); return; }
    });
    draw(); raf.current = requestAnimationFrame(loop);
  }, [draw]);

  const startRace = useCallback((m: GameMode, diff?: Difficulty) => {
    const d = diff ?? g.current.aiDiff;
    g.current = {
      mode: m, aiDiff: d,
      car: makeCar("#ef4444", "You"), car2: makeCar("#22d3ee", "P2", 30),
      ai: [makeCar("#3b82f6", "AI 1"), makeCar("#a855f7", "AI 2", 40)],
      keys: new Set(), frame: 0, state: "playing", winner: "",
    };
    if (diff) setDifficulty(diff);
    setGameMode(m); setState("playing"); setLaps1([]); setLaps2([]); setLap1(0); setLap2(0); setWinner("");
    cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(loop);
  }, [loop]);

  useEffect(() => {
    if (screen !== "race") return;
    const down = (e: KeyboardEvent) => { g.current.keys.add(e.key); if (["Arrow", "w", "a", "s", "d"].some(k => e.key.startsWith(k) || e.key === k)) e.preventDefault(); };
    const up = (e: KeyboardEvent) => g.current.keys.delete(e.key);
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); draw();
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); cancelAnimationFrame(raf.current); };
  }, [screen, draw]);

  if (screen === "menu") return (
    <Shell title="Racing Game">
      <div className="flex flex-col items-center gap-8 text-center max-w-sm">
        <div className="text-6xl select-none">🏎️</div>
        <h2 className="text-2xl font-black text-indigo-400">Select Mode</h2>
        <div className="flex flex-col gap-3 w-full">
          <button onClick={() => setScreen("ai-diff")} className="w-full py-4 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-300 font-black rounded-2xl transition-colors">
            🤖 vs Computer AI
            <div className="text-xs font-normal text-muted-foreground mt-1">Race against 2 AI opponents · choose difficulty</div>
          </button>
          <button onClick={() => { startRace("2p"); setScreen("race"); }} className="w-full py-4 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-400 font-black rounded-2xl transition-colors">
            👥 2 Players Local
            <div className="text-xs font-normal text-muted-foreground mt-1">P1: Arrows · P2: WASD</div>
          </button>
        </div>
      </div>
    </Shell>
  );

  if (screen === "ai-diff") return (
    <Shell title="Racing — vs AI">
      <div className="flex flex-col items-center gap-6 max-w-sm w-full">
        <div className="text-5xl">🤖</div>
        <h2 className="text-xl font-black text-purple-400">AI Difficulty</h2>
        <div className="flex flex-col gap-3 w-full">
          {(["easy", "medium", "hard"] as Difficulty[]).map(d => {
            const cfg = AI_CFG[d];
            return (
              <button key={d} onClick={() => { startRace("1p", d); setScreen("race"); }} className={`w-full py-4 px-5 rounded-2xl border transition-colors font-black flex items-center gap-4 text-left
                ${d === "easy" ? "bg-green-500/15 hover:bg-green-500/25 border-green-500/40" : d === "medium" ? "bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40" : "bg-red-500/15 hover:bg-red-500/25 border-red-500/40"}`}>
                <span className="text-2xl">{cfg.icon}</span>
                <div>
                  <div className={`font-black ${cfg.color}`}>{cfg.label} AI</div>
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

  const diffCfg = AI_CFG[difficulty];

  return (
    <Shell title="Racing Game" controls={gameMode === "2p" ? "🔴 P1: Arrows · 🔵 P2: WASD · 3 laps" : `Arrow keys · 3 laps · vs ${diffCfg.icon} ${diffCfg.label} AI`}>
      {gameMode === "1p" && (
        <div className="flex items-center gap-2 text-xs">
          {(["easy", "medium", "hard"] as Difficulty[]).map(d => {
            const c = AI_CFG[d];
            return (
              <span key={d} className={`px-2 py-0.5 rounded-full ${d === difficulty ? (d === "easy" ? "bg-green-500/20 text-green-400 border border-green-500/50" : d === "medium" ? "bg-amber-500/20 text-amber-400 border border-amber-500/50" : "bg-red-500/20 text-red-400 border border-red-500/50") : "text-muted-foreground"}`}>
                {c.icon} {c.label}
              </span>
            );
          })}
        </div>
      )}
      <div className="relative">
        <canvas ref={cv} width={W} height={H} className="rounded-xl border border-slate-700" style={{ maxWidth: "95vw" }} />
        {(state === "idle" || state === "done") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-xl gap-4">
            {state === "done" && (
              <p className="text-2xl font-black text-primary">
                {gameMode === "2p" ? `🏁 ${winner} Wins!` : winner === "You" ? "🏁 You Win! 🎉" : `🏁 ${winner} Won!`}
              </p>
            )}
            {state === "idle" && <p className="text-2xl font-black text-white">🏎️ Ready to Race?</p>}
            {laps1.length > 0 && <div className="font-mono text-sm text-red-400">{laps1.slice(-3).map((t, i) => <div key={i}>You Lap {i + 1}: {(t / 1000).toFixed(2)}s</div>)}</div>}
            {gameMode === "2p" && laps2.length > 0 && <div className="font-mono text-sm text-cyan-400">{laps2.slice(-3).map((t, i) => <div key={i}>P2 Lap {i + 1}: {(t / 1000).toFixed(2)}s</div>)}</div>}
            <div className="flex gap-3">
              <button onClick={() => startRace(gameMode)} className="px-8 py-2 bg-primary text-black font-bold rounded-xl">{state === "done" ? "Race Again" : "Start Race"}</button>
              <button onClick={() => setScreen("menu")} className="px-6 py-2 bg-secondary text-foreground font-bold rounded-xl">Menu</button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
