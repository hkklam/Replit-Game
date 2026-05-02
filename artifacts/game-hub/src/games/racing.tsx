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
      <div className="flex-1 flex flex-col items-center justify-center p-2 gap-2">{children}</div>
    </div>
  );
}

const W = 700, H = 560, CAR_W = 14, CAR_H = 24;

type WP = { x: number; y: number };
type TrackDef = {
  id: string; name: string; flag: string; desc: string;
  wps: WP[]; trackW: number; wpR: number;
  aiDiff: "easy" | "medium" | "hard"; stars: number;
};

const TRACKS: TrackDef[] = [
  {
    id: "monza", name: "Monza", flag: "🇮🇹", stars: 1,
    desc: "Fast & flowing · 2 chicanes · long straights",
    trackW: 76, wpR: 48, aiDiff: "easy",
    wps: [
      { x: 165, y: 100 }, { x: 380, y: 100 },
      { x: 428, y:  76 }, { x: 476, y: 124 },
      { x: 562, y: 100 }, { x: 618, y: 148 },
      { x: 638, y: 235 }, { x: 638, y: 388 },
      { x: 596, y: 460 }, { x: 478, y: 496 },
      { x: 330, y: 496 }, { x: 165, y: 496 },
      { x:  82, y: 450 }, { x:  62, y: 325 },
      { x:  68, y: 200 }, { x: 116, y: 128 },
    ],
  },
  {
    id: "silverstone", name: "Silverstone", flag: "🇬🇧", stars: 2,
    desc: "Flowing corners · Maggotts–Becketts L-R-L-R complex",
    trackW: 68, wpR: 44, aiDiff: "easy",
    wps: [
      { x: 128, y: 288 }, { x: 285, y: 226 }, { x: 392, y: 194 },
      { x: 465, y: 158 }, { x: 530, y: 132 }, { x: 586, y: 158 },
      { x: 632, y: 130 }, { x: 655, y: 172 }, { x: 655, y: 278 },
      { x: 632, y: 375 }, { x: 578, y: 440 }, { x: 468, y: 478 },
      { x: 328, y: 492 }, { x: 196, y: 470 }, { x: 132, y: 414 }, { x: 108, y: 345 },
    ],
  },
  {
    id: "spa", name: "Spa-Francorchamps", flag: "🇧🇪", stars: 3,
    desc: "Eau Rouge L–R · Pouhon sweeper · Bus Stop chicane",
    trackW: 64, wpR: 42, aiDiff: "medium",
    wps: [
      { x: 188, y: 115 }, { x: 375, y: 115 }, { x: 520, y: 115 },
      { x: 575, y: 158 }, { x: 600, y: 210 }, { x: 594, y: 276 }, { x: 560, y: 310 },
      { x: 582, y: 364 }, { x: 592, y: 435 }, { x: 566, y: 494 }, { x: 496, y: 512 },
      { x: 392, y: 500 }, { x: 290, y: 480 }, { x: 210, y: 448 }, { x: 146, y: 384 },
      { x:  94, y: 305 }, { x:  76, y: 226 }, { x:  96, y: 160 }, { x: 144, y: 128 },
    ],
  },
  {
    id: "suzuka", name: "Suzuka", flag: "🇯🇵", stars: 4,
    desc: "S-curves R-L-R-L · 130R · Spoon · Hairpin",
    trackW: 60, wpR: 38, aiDiff: "hard",
    wps: [
      { x: 218, y: 112 }, { x: 395, y: 112 },
      { x: 478, y: 142 }, { x: 518, y: 196 }, { x: 522, y: 262 },
      { x: 550, y: 292 }, { x: 508, y: 322 }, { x: 550, y: 352 }, { x: 508, y: 382 },
      { x: 478, y: 430 }, { x: 414, y: 456 }, { x: 346, y: 440 }, { x: 276, y: 402 },
      { x: 216, y: 350 }, { x: 170, y: 276 }, { x: 120, y: 210 }, { x: 126, y: 148 }, { x: 174, y: 118 },
    ],
  },
  {
    id: "monaco", name: "Monaco", flag: "🇲🇨", stars: 5,
    desc: "Street circuit · 22 turns · very narrow & technical",
    trackW: 54, wpR: 30, aiDiff: "hard",
    wps: [
      { x: 172, y: 258 }, { x: 298, y: 258 }, { x: 360, y: 232 }, { x: 400, y: 202 },
      { x: 446, y: 180 }, { x: 494, y: 170 }, { x: 536, y: 192 }, { x: 562, y: 234 },
      { x: 556, y: 282 }, { x: 524, y: 318 }, { x: 568, y: 364 }, { x: 606, y: 394 },
      { x: 634, y: 434 }, { x: 610, y: 476 }, { x: 562, y: 472 }, { x: 528, y: 494 },
      { x: 458, y: 504 }, { x: 390, y: 494 }, { x: 324, y: 504 }, { x: 260, y: 492 },
      { x: 212, y: 462 }, { x: 163, y: 437 }, { x: 136, y: 396 }, { x: 148, y: 336 }, { x: 154, y: 294 },
    ],
  },
];

export type Difficulty = "easy" | "medium" | "hard";
const AI_CFG: Record<Difficulty, { maxSpd: number; turnThresh: number; missChance: number }> = {
  easy:   { maxSpd: 3.1, turnThresh: 0.12, missChance: 0.25 },
  medium: { maxSpd: 4.3, turnThresh: 0.06, missChance: 0.05 },
  hard:   { maxSpd: 5.1, turnThresh: 0.03, missChance: 0.00 },
};

function ptSegDist2(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1) return (px - ax) ** 2 + (py - ay) ** 2;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return (px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2;
}

function isOnTrack(x: number, y: number, wps: WP[], halfW: number): boolean {
  const hw2 = halfW * halfW;
  for (let i = 0; i < wps.length; i++) {
    const a = wps[i], b = wps[(i + 1) % wps.length];
    if (ptSegDist2(x, y, a.x, a.y, b.x, b.y) < hw2) return true;
  }
  return false;
}

function drawTrack(ctx: CanvasRenderingContext2D, track: TrackDef) {
  const { wps, trackW } = track;
  ctx.fillStyle = "#166534"; ctx.fillRect(0, 0, W, H);
  const tracePath = (close = true) => {
    ctx.beginPath(); ctx.moveTo(wps[0].x, wps[0].y);
    for (let i = 1; i < wps.length; i++) ctx.lineTo(wps[i].x, wps[i].y);
    if (close) ctx.closePath();
  };
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  tracePath(); ctx.strokeStyle = "#555"; ctx.lineWidth = trackW * 2 + 10; ctx.stroke();
  tracePath(); ctx.strokeStyle = "#2a2a2a"; ctx.lineWidth = trackW * 2; ctx.stroke();
  ctx.setLineDash([16, 22]); ctx.strokeStyle = "rgba(251,191,36,0.55)"; ctx.lineWidth = 2;
  tracePath(); ctx.stroke(); ctx.setLineDash([]);
  const w0 = wps[0], w1 = wps[1];
  const ang = Math.atan2(w1.y - w0.y, w1.x - w0.x);
  ctx.save(); ctx.translate(w0.x, w0.y); ctx.rotate(ang + Math.PI / 2);
  const sq = 9, cols = Math.ceil((trackW * 2) / sq);
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? "#fff" : "#111";
      ctx.fillRect(c * sq - trackW, r * sq - sq, sq, sq);
    }
  ctx.restore();
  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(5, H - 26, 150, 22);
  ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "left";
  ctx.fillText(`${track.flag}  ${track.name}  ${"★".repeat(track.stars)}${"☆".repeat(5 - track.stars)}`, 10, H - 10);
}

type Car = { x: number; y: number; angle: number; speed: number; color: string; lap: number; wpIdx: number; bestLap: number; lapStart: number; label: string };

function makeCar(track: TrackDef, color: string, label: string, perp = 0, back = 0): Car {
  const w0 = track.wps[0], w1 = track.wps[1];
  const ang = Math.atan2(w1.y - w0.y, w1.x - w0.x);
  const x = w0.x - Math.sin(ang) * perp - Math.cos(ang) * back;
  const y = w0.y + Math.cos(ang) * perp - Math.sin(ang) * back;
  return { x, y, angle: ang, speed: 0, color, lap: 0, wpIdx: 1, bestLap: Infinity, lapStart: Date.now(), label };
}

type GameMode = "1p" | "2p";

// Touch control button
function TBtn({ label, onDown, onUp, className }: { label: string; onDown: () => void; onUp: () => void; className?: string }) {
  return (
    <button
      className={`flex items-center justify-center rounded-2xl text-white font-black text-xl select-none touch-manipulation border border-white/20 active:brightness-150 ${className ?? ""}`}
      onPointerDown={e => { e.preventDefault(); onDown(); }}
      onPointerUp={e => { e.preventDefault(); onUp(); }}
      onPointerLeave={e => { e.preventDefault(); onUp(); }}
      onPointerCancel={e => { e.preventDefault(); onUp(); }}
    >
      {label}
    </button>
  );
}

export default function Racing() {
  const cv = useRef<HTMLCanvasElement>(null);
  const g = useRef({
    mode: "1p" as GameMode, track: TRACKS[0], aiDiff: "easy" as Difficulty,
    car: makeCar(TRACKS[0], "#ef4444", "You"),
    car2: makeCar(TRACKS[0], "#22d3ee", "P2", 24),
    ai: [makeCar(TRACKS[0], "#3b82f6", "AI 1", 0, 28), makeCar(TRACKS[0], "#a855f7", "AI 2", 24, 28)],
    keys: new Set<string>(), frame: 0, state: "idle" as "idle" | "playing" | "done", winner: "",
  });
  const [screen, setScreen] = useState<"menu" | "track-select" | "race">("menu");
  const [gameMode, setGameMode] = useState<GameMode>("1p");
  const [state, setState] = useState<"idle" | "playing" | "done">("idle");
  const [lap1, setLap1] = useState(0); const [lap2, setLap2] = useState(0);
  const [laps1, setLaps1] = useState<number[]>([]); const [laps2, setLaps2] = useState<number[]>([]);
  const [winner, setWinner] = useState("");
  const [trackName, setTrackName] = useState(TRACKS[0].name);
  const raf = useRef(0);

  const drawCar = useCallback((ctx: CanvasRenderingContext2D, car: Car) => {
    ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(car.angle + Math.PI / 2);
    ctx.fillStyle = car.color; ctx.fillRect(-CAR_W / 2, -CAR_H / 2, CAR_W, CAR_H);
    ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.fillRect(-CAR_W / 2, -CAR_H / 2, CAR_W, 6);
    ctx.fillStyle = "#000";
    ctx.fillRect(-CAR_W / 2, CAR_H / 2 - 6, 5, 5); ctx.fillRect(CAR_W / 2 - 5, CAR_H / 2 - 6, 5, 5);
    ctx.fillRect(-CAR_W / 2, -CAR_H / 2, 5, 5); ctx.fillRect(CAR_W / 2 - 5, -CAR_H / 2, 5, 5);
    ctx.restore();
    ctx.fillStyle = "#fff"; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(car.label, car.x, car.y - 18);
  }, []);

  const draw = useCallback(() => {
    const c = cv.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const s = g.current;
    drawTrack(ctx, s.track);
    s.ai.forEach(ai => drawCar(ctx, ai));
    if (s.mode === "2p") drawCar(ctx, s.car2);
    drawCar(ctx, s.car);
    const hudH = s.mode === "2p" ? 50 : 30;
    ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(0, 0, W, hudH);
    ctx.fillStyle = "#ef4444"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`You 🏎️  Lap ${s.car.lap}  ${Math.round(s.car.speed * 30)}km/h  Best: ${s.car.bestLap < Infinity ? (s.car.bestLap / 1000).toFixed(2) + "s" : "-"}`, 8, 16);
    if (s.mode === "2p") { ctx.fillStyle = "#22d3ee"; ctx.fillText(`P2 🏎️  Lap ${s.car2.lap}  ${Math.round(s.car2.speed * 30)}km/h  Best: ${s.car2.bestLap < Infinity ? (s.car2.bestLap / 1000).toFixed(2) + "s" : "-"}`, 8, 40); }
  }, [drawCar]);

  const loop = useCallback(() => {
    const s = g.current; s.frame++;
    const { wps, trackW, wpR } = s.track;
    const accel = 0.18, brake = 0.22, turnSpd = 0.055, friction = 0.96, offRoad = 0.88;
    const updateCar = (c: Car, left: boolean, right: boolean, up: boolean, down: boolean, maxSpd = 5.5): boolean => {
      if (left)  c.angle -= turnSpd * Math.max(0.2, c.speed / 5);
      if (right) c.angle += turnSpd * Math.max(0.2, c.speed / 5);
      if (up)   c.speed = Math.min(c.speed + accel, maxSpd);
      else if (down) c.speed = Math.max(c.speed - brake, -2);
      const nx = c.x + Math.cos(c.angle) * c.speed, ny = c.y + Math.sin(c.angle) * c.speed;
      c.speed *= isOnTrack(nx, ny, wps, trackW / 2) ? friction : offRoad;
      if (Math.abs(c.speed) < 0.01) c.speed = 0;
      c.x += Math.cos(c.angle) * c.speed; c.y += Math.sin(c.angle) * c.speed;
      c.x = Math.max(5, Math.min(W - 5, c.x)); c.y = Math.max(5, Math.min(H - 5, c.y));
      const wp = wps[c.wpIdx];
      if (Math.sqrt((c.x - wp.x) ** 2 + (c.y - wp.y) ** 2) < wpR) {
        c.wpIdx = (c.wpIdx + 1) % wps.length;
        if (c.wpIdx === 0) { c.wpIdx = 1; c.lap++; const lt = Date.now() - c.lapStart; if (lt < c.bestLap) c.bestLap = lt; c.lapStart = Date.now(); return true; }
      }
      return false;
    };
    const k = s.keys;
    const lap1Done = updateCar(s.car, k.has("ArrowLeft") || k.has("left"), k.has("ArrowRight") || k.has("right"), k.has("ArrowUp") || k.has("up"), k.has("ArrowDown") || k.has("down"));
    if (lap1Done) { setLap1(s.car.lap); setLaps1(prev => [...prev, s.car.bestLap]); if (s.car.lap >= 3) { s.state = "done"; s.winner = "You"; setWinner("You"); setState("done"); draw(); return; } }
    if (s.mode === "2p") {
      const lap2Done = updateCar(s.car2, k.has("a"), k.has("d"), k.has("w"), k.has("s"));
      if (lap2Done) { setLap2(s.car2.lap); setLaps2(prev => [...prev, s.car2.bestLap]); if (s.car2.lap >= 3) { s.state = "done"; s.winner = "P2"; setWinner("P2"); setState("done"); draw(); return; } }
    }
    const cfg = AI_CFG[s.aiDiff];
    for (const ai of s.ai) {
      const twp = wps[ai.wpIdx];
      const ang = Math.atan2(twp.y - ai.y, twp.x - ai.x);
      let da = ang - ai.angle;
      while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      const accelNow = Math.random() > cfg.missChance;
      const lapDone = updateCar(ai, da < -cfg.turnThresh, da > cfg.turnThresh, accelNow, false, cfg.maxSpd);
      if (lapDone && ai.lap >= 3 && s.mode === "1p") { s.state = "done"; s.winner = ai.label; setWinner(ai.label); setState("done"); draw(); return; }
    }
    draw(); raf.current = requestAnimationFrame(loop);
  }, [draw]);

  const startRace = useCallback((mode: GameMode, track: TrackDef) => {
    const pw = track.trackW * 0.35, bk = track.trackW * 0.45;
    g.current = {
      mode, track, aiDiff: track.aiDiff,
      car: makeCar(track, "#ef4444", "You", 0, 0),
      car2: makeCar(track, "#22d3ee", "P2", pw, 0),
      ai: [makeCar(track, "#3b82f6", "AI 1", 0, bk), makeCar(track, "#a855f7", "AI 2", pw, bk)],
      keys: new Set(), frame: 0, state: "playing", winner: "",
    };
    setGameMode(mode); setTrackName(track.name);
    setState("playing"); setLaps1([]); setLaps2([]); setLap1(0); setLap2(0); setWinner("");
    cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(loop);
  }, [loop]);

  // Touch key helpers for on-screen controls
  const keyDown = useCallback((k: string) => g.current.keys.add(k), []);
  const keyUp = useCallback((k: string) => g.current.keys.delete(k), []);

  useEffect(() => {
    if (screen !== "race") return;
    const down = (e: KeyboardEvent) => { g.current.keys.add(e.key); if (["Arrow", "w", "a", "s", "d"].some(k => e.key.startsWith(k) || e.key === k)) e.preventDefault(); };
    const up = (e: KeyboardEvent) => g.current.keys.delete(e.key);
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); draw();
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); cancelAnimationFrame(raf.current); };
  }, [screen, draw]);

  const STAR_COLORS = ["", "text-green-400", "text-lime-400", "text-amber-400", "text-orange-400", "text-red-400"];
  const TRACK_BORDERS = ["", "border-green-500/50", "border-lime-500/50", "border-amber-500/50", "border-orange-500/50", "border-red-500/50"];
  const TRACK_BG = ["", "bg-green-500/10", "bg-lime-500/10", "bg-amber-500/10", "bg-orange-500/10", "bg-red-500/10"];

  if (screen === "menu") return (
    <Shell title="Racing Game">
      <div className="flex flex-col items-center gap-8 text-center max-w-sm">
        <div className="text-6xl select-none">🏎️</div>
        <h2 className="text-2xl font-black text-indigo-400">Select Mode</h2>
        <div className="flex flex-col gap-3 w-full">
          <button onClick={() => { setGameMode("1p"); setScreen("track-select"); }} className="w-full py-4 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-300 font-black rounded-2xl transition-colors touch-manipulation">
            🤖 vs Computer AI
            <div className="text-xs font-normal text-muted-foreground mt-1">Choose a circuit · AI difficulty scales with track</div>
          </button>
          <button onClick={() => { setGameMode("2p"); setScreen("track-select"); }} className="w-full py-4 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-400 font-black rounded-2xl transition-colors touch-manipulation">
            👥 2 Players Local
            <div className="text-xs font-normal text-muted-foreground mt-1">P1: Arrow keys · P2: WASD · keyboard only</div>
          </button>
        </div>
      </div>
    </Shell>
  );

  if (screen === "track-select") return (
    <Shell title="Choose Circuit">
      <div className="flex flex-col items-center gap-4 max-w-lg w-full">
        <div className="flex flex-col gap-2 w-full">
          {TRACKS.map(t => (
            <button key={t.id}
              onClick={() => { startRace(gameMode, t); setScreen("race"); }}
              className={`w-full py-3 px-5 rounded-2xl border transition-colors font-semibold text-left flex items-center gap-4 ${TRACK_BG[t.stars]} ${TRACK_BORDERS[t.stars]} hover:brightness-125 touch-manipulation`}
            >
              <span className="text-2xl w-8 text-center">{t.flag}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-black ${STAR_COLORS[t.stars]}`}>{t.name}</span>
                  <span className={`text-sm ${STAR_COLORS[t.stars]}`}>{"★".repeat(t.stars)}{"☆".repeat(5 - t.stars)}</span>
                </div>
                <div className="text-xs text-muted-foreground font-normal truncate">{t.desc}</div>
              </div>
              {gameMode === "1p" && (
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${t.aiDiff === "easy" ? "bg-green-500/20 text-green-400" : t.aiDiff === "medium" ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"}`}>
                  {t.aiDiff} AI
                </span>
              )}
            </button>
          ))}
        </div>
        <button onClick={() => setScreen("menu")} className="text-sm text-muted-foreground hover:text-foreground transition-colors touch-manipulation">← Back</button>
      </div>
    </Shell>
  );

  return (
    <Shell title={`Racing · ${trackName}`} controls={gameMode === "2p" ? "🔴 P1: Arrows · 🔵 P2: WASD · 3 laps" : "Arrow keys · 3 laps"}>
      <div className="relative w-full flex justify-center">
        <canvas ref={cv} width={W} height={H} className="rounded-xl border border-slate-700" style={{ width: "100%", maxWidth: W, height: "auto" }} />
        {(state === "idle" || state === "done") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-xl gap-4">
            {state === "done" && (
              <p className="text-2xl font-black text-primary">
                {gameMode === "2p" ? `🏁 ${winner} Wins!` : winner === "You" ? "🏁 You Win! 🎉" : `🏁 ${winner} Won!`}
              </p>
            )}
            {state === "idle" && <p className="text-2xl font-black text-white">🏎️ Ready to Race?</p>}
            {laps1.length > 0 && <div className="font-mono text-sm text-red-400">{laps1.map((t, i) => <div key={i}>You Lap {i + 1}: {(t / 1000).toFixed(2)}s</div>)}</div>}
            {gameMode === "2p" && laps2.length > 0 && <div className="font-mono text-sm text-cyan-400">{laps2.map((t, i) => <div key={i}>P2 Lap {i + 1}: {(t / 1000).toFixed(2)}s</div>)}</div>}
            <div className="flex gap-3 flex-wrap justify-center">
              <button onClick={() => { const t = g.current.track; startRace(gameMode, t); }} className="px-8 py-3 bg-primary text-black font-bold rounded-xl touch-manipulation">{state === "done" ? "Race Again" : "Start Race"}</button>
              <button onClick={() => setScreen("track-select")} className="px-6 py-3 bg-secondary text-foreground font-bold rounded-xl touch-manipulation">Change Track</button>
              <button onClick={() => setScreen("menu")} className="px-4 py-3 bg-secondary text-foreground font-bold rounded-xl touch-manipulation">Menu</button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile on-screen controls (1p only — 2p requires keyboard) */}
      {gameMode === "1p" && state === "playing" && (
        <div className="flex items-center justify-between w-full max-w-md px-2 sm:hidden gap-2">
          {/* Left side: steer left */}
          <TBtn label="◀" className="w-24 h-16 bg-indigo-800/70" onDown={() => keyDown("left")} onUp={() => keyUp("left")} />
          {/* Centre: accelerate / brake */}
          <div className="flex flex-col gap-2 flex-1 max-w-[140px]">
            <TBtn label="▲ Gas" className="h-14 bg-green-700/70" onDown={() => keyDown("up")} onUp={() => keyUp("up")} />
            <TBtn label="▼ Brake" className="h-12 bg-red-700/70" onDown={() => keyDown("down")} onUp={() => keyUp("down")} />
          </div>
          {/* Right side: steer right */}
          <TBtn label="▶" className="w-24 h-16 bg-indigo-800/70" onDown={() => keyDown("right")} onUp={() => keyUp("right")} />
        </div>
      )}
      {gameMode === "1p" && state === "playing" && (
        <p className="text-xs text-muted-foreground hidden sm:block">Arrow keys · 3 laps</p>
      )}
    </Shell>
  );
}
