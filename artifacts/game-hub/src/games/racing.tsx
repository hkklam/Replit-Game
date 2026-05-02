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

// Track: series of waypoints forming an oval circuit
const WAYPOINTS = [
  { x: 350, y: 80 }, { x: 500, y: 80 }, { x: 580, y: 130 }, { x: 620, y: 200 },
  { x: 620, y: 360 }, { x: 580, y: 430 }, { x: 500, y: 480 }, { x: 350, y: 480 },
  { x: 200, y: 480 }, { x: 120, y: 430 }, { x: 80, y: 360 }, { x: 80, y: 200 },
  { x: 120, y: 130 }, { x: 200, y: 80 },
];
const INNER_SCALE = 0.5;
const INNER_WPS = WAYPOINTS.map(wp => ({ x: (wp.x - W / 2) * INNER_SCALE + W / 2, y: (wp.y - H / 2) * INNER_SCALE + H / 2 }));
const TRACK_W = 70;

function drawTrack(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#1a1a1a"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#3b3b3b";
  ctx.beginPath(); ctx.moveTo(WAYPOINTS[0].x, WAYPOINTS[0].y);
  WAYPOINTS.forEach(wp => ctx.lineTo(wp.x, wp.y)); ctx.closePath();
  ctx.lineWidth = TRACK_W * 2; ctx.strokeStyle = "#3b3b3b"; ctx.lineJoin = "round"; ctx.stroke(); ctx.fill();
  // Infield green
  ctx.fillStyle = "#166534";
  ctx.beginPath(); ctx.moveTo(INNER_WPS[0].x, INNER_WPS[0].y);
  INNER_WPS.forEach(wp => ctx.lineTo(wp.x, wp.y)); ctx.closePath(); ctx.fill();
  // Outer green
  ctx.fillStyle = "#14532d"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#3b3b3b";
  ctx.beginPath(); ctx.moveTo(WAYPOINTS[0].x, WAYPOINTS[0].y);
  WAYPOINTS.forEach(wp => ctx.lineTo(wp.x, wp.y)); ctx.closePath();
  ctx.lineWidth = TRACK_W * 2; ctx.strokeStyle = "#3b3b3b"; ctx.stroke(); ctx.fill();
  ctx.fillStyle = "#166534";
  ctx.beginPath(); ctx.moveTo(INNER_WPS[0].x, INNER_WPS[0].y);
  INNER_WPS.forEach(wp => ctx.lineTo(wp.x, wp.y)); ctx.closePath(); ctx.fill();
  // Start/finish line
  ctx.fillStyle = "#fff"; ctx.fillRect(WAYPOINTS[0].x - 2, WAYPOINTS[0].y - TRACK_W, 4, TRACK_W * 2);
  // Lane markings
  ctx.setLineDash([15, 20]); ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2;
  ctx.beginPath(); WAYPOINTS.forEach((wp, i) => { i === 0 ? ctx.moveTo(wp.x, wp.y) : ctx.lineTo(wp.x, wp.y); }); ctx.closePath(); ctx.stroke();
  ctx.setLineDash([]);
}

function isOnTrack(x: number, y: number): boolean {
  const polyContains = (pts: { x: number; y: number }[]) => { let inside = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside; } return inside; };
  return polyContains(WAYPOINTS) && !polyContains(INNER_WPS);
}

type Car = { x: number; y: number; angle: number; speed: number; color: string; lap: number; wpIdx: number; bestLap: number; lapStart: number };

function makeCar(color: string): Car {
  return { x: WAYPOINTS[0].x + (Math.random() - 0.5) * 30, y: WAYPOINTS[0].y + 20, angle: 0, speed: 0, color, lap: 0, wpIdx: 1, bestLap: Infinity, lapStart: Date.now() };
}

export default function Racing() {
  const cv = useRef<HTMLCanvasElement>(null);
  const g = useRef({
    car: makeCar("#ef4444"), ai: [makeCar("#3b82f6"), makeCar("#a855f7")],
    keys: new Set<string>(), frame: 0, state: "idle" as "idle" | "playing" | "done",
    lapTimes: [] as number[],
  });
  const [state, setState] = useState<"idle" | "playing" | "done">("idle");
  const [laps, setLaps] = useState<number[]>([]);
  const [lap, setLap] = useState(0);
  const raf = useRef(0);

  const drawCar = useCallback((ctx: CanvasRenderingContext2D, car: Car, label: string) => {
    ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(car.angle + Math.PI / 2);
    ctx.fillStyle = car.color; ctx.fillRect(-CAR_W / 2, -CAR_H / 2, CAR_W, CAR_H);
    ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.fillRect(-CAR_W / 2, -CAR_H / 2, CAR_W, 6);
    ctx.fillStyle = "#000"; ctx.fillRect(-CAR_W / 2, CAR_H / 2 - 6, 5, 5); ctx.fillRect(CAR_W / 2 - 5, CAR_H / 2 - 6, 5, 5);
    ctx.fillRect(-CAR_W / 2, -CAR_H / 2, 5, 5); ctx.fillRect(CAR_W / 2 - 5, -CAR_H / 2, 5, 5);
    ctx.restore();
    ctx.fillStyle = "#fff"; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center"; ctx.fillText(label, car.x, car.y - 18);
  }, []);

  const draw = useCallback(() => {
    const c = cv.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    drawTrack(ctx);
    const s = g.current;
    s.ai.forEach((ai, i) => drawCar(ctx, ai, `AI ${i + 1}`));
    drawCar(ctx, s.car, "YOU");
    // HUD
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(0, 0, W, 32);
    ctx.fillStyle = "#e2e8f0"; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`🏎️ Lap: ${s.car.lap}  Speed: ${Math.round(s.car.speed * 30)} km/h  Best: ${s.car.bestLap < Infinity ? (s.car.bestLap / 1000).toFixed(2) + "s" : "-"}`, 8, 20);
  }, [drawCar]);

  const loop = useCallback(() => {
    const s = g.current;
    s.frame++;
    const car = s.car;
    const keys = s.keys;
    const accel = 0.18, brake = 0.22, turnSpd = 0.055, friction = 0.96, offRoad = 0.88;

    const updateCar = (c: Car, left: boolean, right: boolean, up: boolean, down: boolean) => {
      if (left) c.angle -= turnSpd * Math.max(0.2, c.speed / 5);
      if (right) c.angle += turnSpd * Math.max(0.2, c.speed / 5);
      if (up) c.speed = Math.min(c.speed + accel, 5.5);
      else if (down) c.speed = Math.max(c.speed - brake, -2);
      c.speed *= isOnTrack(c.x + Math.cos(c.angle) * c.speed, c.y + Math.sin(c.angle) * c.speed) ? friction : offRoad;
      if (Math.abs(c.speed) < 0.01) c.speed = 0;
      const nx = c.x + Math.cos(c.angle) * c.speed, ny = c.y + Math.sin(c.angle) * c.speed;
      c.x = nx; c.y = ny;
      c.x = Math.max(5, Math.min(W - 5, c.x)); c.y = Math.max(5, Math.min(H - 5, c.y));
      // Waypoint / lap tracking
      const wp = WAYPOINTS[c.wpIdx];
      if (Math.sqrt((c.x - wp.x) ** 2 + (c.y - wp.y) ** 2) < 40) { c.wpIdx = (c.wpIdx + 1) % WAYPOINTS.length; if (c.wpIdx === 0) { c.wpIdx = 1; c.lap++; const lapTime = Date.now() - c.lapStart; if (lapTime < c.bestLap) c.bestLap = lapTime; c.lapStart = Date.now(); return true; } } return false;
    };

    const lapDone = updateCar(car, keys.has("ArrowLeft") || keys.has("a"), keys.has("ArrowRight") || keys.has("d"), keys.has("ArrowUp") || keys.has("w"), keys.has("ArrowDown") || keys.has("s"));
    if (lapDone) { const lt = s.car.bestLap; setLap(s.car.lap); setLaps(prev => [...prev, lt]); if (s.car.lap >= 3) { s.state = "done"; setState("done"); draw(); return; } }

    s.ai.forEach((ai, idx) => {
      const twp = WAYPOINTS[ai.wpIdx];
      const ang = Math.atan2(twp.y - ai.y, twp.x - ai.x);
      let da = ang - ai.angle; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      updateCar(ai, da < -0.05, da > 0.05, true, false);
    });
    draw(); raf.current = requestAnimationFrame(loop);
  }, [draw]);

  const start = useCallback(() => {
    g.current = { car: makeCar("#ef4444"), ai: [makeCar("#3b82f6"), makeCar("#a855f7")], keys: new Set(), frame: 0, state: "playing", lapTimes: [] };
    g.current.ai[1].x += 40; setState("playing"); setLaps([]); setLap(0);
    cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(loop);
  }, [loop]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => { g.current.keys.add(e.key); if (["Arrow", "w", "a", "s", "d"].some(k => e.key.startsWith(k) || e.key === k)) e.preventDefault(); };
    const up = (e: KeyboardEvent) => g.current.keys.delete(e.key);
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    draw();
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); cancelAnimationFrame(raf.current); };
  }, [draw]);

  return (
    <Shell title="Racing Game" controls="Arrow keys or WASD to drive · 3 laps to win">
      <div className="relative">
        <canvas ref={cv} width={W} height={H} className="rounded-xl border border-slate-700" style={{ maxWidth: "95vw" }} />
        {(state === "idle" || state === "done") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-xl gap-4">
            {state === "done" && <p className="text-2xl font-black text-primary">🏁 Race Complete! {lap} laps</p>}
            {state === "idle" && <p className="text-2xl font-black text-white">🏎️ Ready to Race?</p>}
            {laps.length > 0 && <div className="font-mono text-sm text-muted-foreground">{laps.map((t, i) => <div key={i}>Lap {i + 1}: {(t / 1000).toFixed(2)}s</div>)}</div>}
            <button onClick={start} className="px-8 py-2 bg-primary text-black font-bold rounded-xl">{state === "done" ? "Race Again" : "Start Race"}</button>
          </div>
        )}
      </div>
    </Shell>
  );
}
