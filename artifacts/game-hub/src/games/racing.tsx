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

const W = 700, H = 560;
const CAR_W = 22, CAR_H = 42;

type WP = { x: number; y: number };
type TrackDef = {
  id: string; name: string; flag: string; desc: string;
  wps: WP[]; trackW: number; wpR: number;
  aiDiff: "easy" | "medium" | "hard"; stars: number;
};

const TRACKS: TrackDef[] = [
  {
    id: "monza", name: "Monza", flag: "🇮🇹", stars: 1,
    desc: "Fast straights · 3 chicanes · Parabolica hairpin",
    trackW: 50, wpR: 36, aiDiff: "easy",
    wps: [
      { x: 118, y: 452 }, { x: 290, y: 452 }, { x: 444, y: 452 },
      { x: 528, y: 426 }, { x: 574, y: 382 }, { x: 604, y: 322 },
      { x: 608, y: 248 }, { x: 608, y: 176 },
      { x: 580, y: 133 }, { x: 534, y: 106 },
      { x: 494, y: 136 }, { x: 454, y: 103 },
      { x: 406, y: 126 }, { x: 366, y:  93 }, { x: 320, y: 116 },
      { x: 255, y:  96 }, { x: 178, y:  93 },
      { x: 108, y: 116 }, { x:  76, y: 166 },
      { x:  66, y: 278 }, { x:  66, y: 396 }, { x:  86, y: 438 },
    ],
  },
  {
    id: "silverstone", name: "Silverstone", flag: "🇬🇧", stars: 2,
    desc: "Maggotts–Becketts–Chapel S-complex · flowing circuit",
    trackW: 44, wpR: 32, aiDiff: "easy",
    wps: [
      { x: 118, y: 308 }, { x: 268, y: 296 }, { x: 368, y: 260 },
      { x: 436, y: 230 }, { x: 474, y: 208 },
      { x: 512, y: 226 }, { x: 546, y: 204 },
      { x: 580, y: 170 }, { x: 620, y: 153 },
      { x: 656, y: 186 }, { x: 648, y: 248 },
      { x: 620, y: 306 }, { x: 574, y: 366 },
      { x: 510, y: 426 }, { x: 438, y: 460 },
      { x: 348, y: 478 }, { x: 254, y: 470 },
      { x: 166, y: 448 }, { x:  98, y: 410 },
      { x:  78, y: 360 }, { x:  88, y: 310 },
    ],
  },
  {
    id: "spa", name: "Spa-Francorchamps", flag: "🇧🇪", stars: 3,
    desc: "Eau Rouge · Pouhon sweeper · Bus Stop chicane",
    trackW: 40, wpR: 30, aiDiff: "medium",
    wps: [
      { x: 168, y: 118 }, { x: 348, y: 106 }, { x: 502, y:  98 },
      { x: 570, y: 136 }, { x: 608, y: 180 }, { x: 616, y: 242 },
      { x: 600, y: 300 }, { x: 568, y: 348 }, { x: 578, y: 396 },
      { x: 590, y: 452 }, { x: 556, y: 496 }, { x: 488, y: 512 },
      { x: 418, y: 502 }, { x: 328, y: 488 }, { x: 246, y: 460 },
      { x: 163, y: 422 }, { x:  98, y: 378 },
      { x:  70, y: 320 }, { x:  88, y: 260 },
      { x:  93, y: 198 }, { x:  98, y: 150 }, { x: 140, y: 126 },
    ],
  },
  {
    id: "suzuka", name: "Suzuka", flag: "🇯🇵", stars: 4,
    desc: "S-curves R-L-R-L · 130R · Spoon · Hairpin",
    trackW: 36, wpR: 26, aiDiff: "hard",
    wps: [
      { x: 216, y: 116 }, { x: 388, y: 110 },
      { x: 478, y: 138 }, { x: 518, y: 183 },
      { x: 516, y: 236 }, { x: 546, y: 266 },
      { x: 516, y: 296 }, { x: 550, y: 328 },
      { x: 576, y: 378 }, { x: 556, y: 422 },
      { x: 508, y: 448 }, { x: 453, y: 460 },
      { x: 393, y: 443 }, { x: 343, y: 406 },
      { x: 308, y: 363 }, { x: 290, y: 308 },
      { x: 250, y: 263 }, { x: 193, y: 243 },
      { x: 128, y: 226 }, { x:  96, y: 186 },
      { x: 116, y: 153 }, { x: 166, y: 126 },
    ],
  },
  {
    id: "monaco", name: "Monaco", flag: "🇲🇨", stars: 5,
    desc: "Street circuit · 22 turns · Tunnel · Swimming Pool",
    trackW: 32, wpR: 22, aiDiff: "hard",
    wps: [
      { x: 170, y: 266 }, { x: 308, y: 266 },
      { x: 378, y: 246 }, { x: 426, y: 216 },
      { x: 466, y: 186 }, { x: 503, y: 166 },
      { x: 540, y: 180 }, { x: 558, y: 216 },
      { x: 554, y: 263 }, { x: 530, y: 306 },
      { x: 563, y: 350 }, { x: 606, y: 380 },
      { x: 640, y: 420 }, { x: 620, y: 463 },
      { x: 573, y: 480 }, { x: 523, y: 498 },
      { x: 453, y: 508 }, { x: 383, y: 500 },
      { x: 316, y: 494 }, { x: 250, y: 482 },
      { x: 196, y: 456 }, { x: 146, y: 426 },
      { x: 120, y: 386 }, { x: 136, y: 333 },
      { x: 148, y: 293 },
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

function nearestOnTrack(x: number, y: number, wps: WP[]): { nx: number; ny: number; dist: number } {
  let best = Infinity, bnx = wps[0].x, bny = wps[0].y;
  for (let i = 0; i < wps.length; i++) {
    const a = wps[i], b = wps[(i + 1) % wps.length];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const t = len2 < 1 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / len2));
    const px = a.x + t * dx, py = a.y + t * dy;
    const d2 = (x - px) ** 2 + (y - py) ** 2;
    if (d2 < best) { best = d2; bnx = px; bny = py; }
  }
  return { nx: bnx, ny: bny, dist: Math.sqrt(best) };
}

function drawTrack(ctx: CanvasRenderingContext2D, track: TrackDef) {
  const { wps, trackW } = track;
  ctx.fillStyle = "#14532d"; ctx.fillRect(0, 0, W, H);

  const TRACK_W = trackW * 2;
  const KERB_W  = trackW * 2 + 10;

  const tracePath = () => {
    ctx.beginPath(); ctx.moveTo(wps[0].x, wps[0].y);
    for (let i = 1; i < wps.length; i++) ctx.lineTo(wps[i].x, wps[i].y);
    ctx.closePath();
  };
  ctx.lineJoin = "round"; ctx.lineCap = "round";

  tracePath(); ctx.strokeStyle = "#0a0a0a"; ctx.lineWidth = TRACK_W + 24; ctx.stroke();

  tracePath(); ctx.strokeStyle = "#ffffff"; ctx.lineWidth = KERB_W; ctx.stroke();
  ctx.setLineDash([16, 16]);
  tracePath(); ctx.strokeStyle = "#dc2626"; ctx.lineWidth = KERB_W; ctx.stroke();
  ctx.setLineDash([]);
  tracePath(); ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = KERB_W - 2; ctx.stroke();

  tracePath(); ctx.strokeStyle = "#252525"; ctx.lineWidth = TRACK_W; ctx.stroke();
  tracePath(); ctx.strokeStyle = "rgba(255,255,255,0.025)"; ctx.lineWidth = TRACK_W - 6; ctx.stroke();

  ctx.setLineDash([14, 20]); ctx.strokeStyle = "rgba(251,191,36,0.5)"; ctx.lineWidth = 2;
  tracePath(); ctx.stroke(); ctx.setLineDash([]);

  const w0 = wps[0], w1 = wps[1];
  const ang = Math.atan2(w1.y - w0.y, w1.x - w0.x);
  ctx.save(); ctx.translate(w0.x, w0.y); ctx.rotate(ang + Math.PI / 2);
  const sq = 9, cols = Math.ceil(TRACK_W / sq);
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? "#fff" : "#111";
      ctx.fillRect(c * sq - trackW, r * sq - sq, sq, sq);
    }
  ctx.restore();

  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(5, H - 26, 160, 22);
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
    ai: [makeCar(TRACKS[0], "#3b82f6", "AI 1", 0, 48), makeCar(TRACKS[0], "#a855f7", "AI 2", 24, 48)],
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
    const hw = CAR_W / 2;
    const hh = CAR_H / 2;

    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle + Math.PI / 2);

    // Drop shadow
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(2, 3, hw + 3, hh - 1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Front wing (wide flat piece)
    ctx.fillStyle = car.color;
    ctx.fillRect(-hw - 8, -hh + 3, (hw + 8) * 2, 5);
    // Front wing endplates
    ctx.fillStyle = "#111";
    ctx.fillRect(-hw - 8, -hh + 3, 3, 8);
    ctx.fillRect(hw + 5, -hh + 3, 3, 8);

    // Main body — tapered F1 monocoque
    ctx.fillStyle = car.color;
    ctx.beginPath();
    ctx.moveTo(0, -hh + 1);           // nose tip
    ctx.lineTo(hw * 0.45, -hh + 8);   // nose flare
    ctx.lineTo(hw, -hh + 18);         // widest point (front shoulder)
    ctx.lineTo(hw, hh - 13);          // sidepod
    ctx.lineTo(hw - 4, hh - 3);       // rear taper
    ctx.lineTo(-hw + 4, hh - 3);      // rear flat
    ctx.lineTo(-hw, hh - 13);         // rear taper left
    ctx.lineTo(-hw, -hh + 18);        // sidepod left
    ctx.lineTo(-hw * 0.45, -hh + 8);  // nose flare left
    ctx.closePath();
    ctx.fill();

    // Body centre highlight stripe
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.beginPath();
    ctx.moveTo(0, -hh + 2);
    ctx.lineTo(hw * 0.35, -hh + 10);
    ctx.lineTo(hw * 0.35, hh - 14);
    ctx.lineTo(-hw * 0.35, hh - 14);
    ctx.lineTo(-hw * 0.35, -hh + 10);
    ctx.closePath();
    ctx.fill();

    // Air intake / engine cover detail
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(-3, -hh + 18, 6, 12);

    // Cockpit surround
    ctx.fillStyle = "#0a0a1a";
    ctx.beginPath();
    ctx.ellipse(0, -hh + 28, 5.5, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Halo safety device
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, -hh + 23, 5, 3, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Helmet
    ctx.fillStyle = "#e8e8e8";
    ctx.beginPath();
    ctx.arc(0, -hh + 22, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = car.color;
    ctx.beginPath();
    ctx.arc(0, -hh + 22, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Rear wing (wide, double element)
    ctx.fillStyle = "#0d0d0d";
    ctx.fillRect(-hw - 6, hh - 9, (hw + 6) * 2, 6);
    ctx.fillStyle = car.color;
    ctx.fillRect(-hw - 6, hh - 9, (hw + 6) * 2, 2);  // color stripe
    // Rear wing endplates
    ctx.fillStyle = "#222";
    ctx.fillRect(-hw - 6, hh - 10, 3, 9);
    ctx.fillRect(hw + 3, hh - 10, 3, 9);

    // Wheels (4) — wider rear, narrower front
    const drawWheel = (wx: number, wy: number, ww: number, wh: number) => {
      ctx.fillStyle = "#111";
      ctx.fillRect(wx, wy, ww, wh);
      // Rim highlight
      ctx.strokeStyle = "#444";
      ctx.lineWidth = 1;
      ctx.strokeRect(wx + 1, wy + 1, ww - 2, wh - 2);
      // Center hub
      ctx.fillStyle = "#555";
      ctx.fillRect(wx + 2, wy + Math.floor(wh / 2) - 1, ww - 4, 3);
    };
    // Front wheels (narrower)
    drawWheel(-hw - 3, -hh + 12, 6, 12);
    drawWheel(hw - 3, -hh + 12, 6, 12);
    // Rear wheels (wider)
    drawWheel(-hw - 4, hh - 20, 7, 13);
    drawWheel(hw - 3, hh - 20, 7, 13);

    ctx.restore();

    // Label above car
    ctx.fillStyle = "#fff";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(car.label, car.x, car.y - 28);
  }, []);

  const draw = useCallback(() => {
    const c = cv.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const s = g.current;
    drawTrack(ctx, s.track);
    s.ai.forEach(ai => drawCar(ctx, ai));
    if (s.mode === "2p") drawCar(ctx, s.car2);
    drawCar(ctx, s.car);
    const hudH = s.mode === "2p" ? 52 : 30;
    ctx.fillStyle = "rgba(0,0,0,0.72)"; ctx.fillRect(0, 0, W, hudH);
    ctx.fillStyle = "#ef4444"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`You 🏎️  Lap ${s.car.lap}  ${Math.round(s.car.speed * 30)}km/h  Best: ${s.car.bestLap < Infinity ? (s.car.bestLap / 1000).toFixed(2) + "s" : "-"}`, 8, 16);
    if (s.mode === "2p") { ctx.fillStyle = "#22d3ee"; ctx.fillText(`P2 🏎️  Lap ${s.car2.lap}  ${Math.round(s.car2.speed * 30)}km/h  Best: ${s.car2.bestLap < Infinity ? (s.car2.bestLap / 1000).toFixed(2) + "s" : "-"}`, 8, 42); }
  }, [drawCar]);

  const loop = useCallback(() => {
    const s = g.current; s.frame++;
    const { wps, trackW, wpR } = s.track;
    const accel = 0.18, brake = 0.22, turnSpd = 0.055, friction = 0.96;
    // Kerb: 5px beyond tarmac edge on each side. Wall is 2px past kerb.
    const kerbExtra = 5;

    const updateCar = (c: Car, left: boolean, right: boolean, up: boolean, down: boolean, maxSpd = 5.5): boolean => {
      if (left)  c.angle -= turnSpd * Math.max(0.2, c.speed / 5);
      if (right) c.angle += turnSpd * Math.max(0.2, c.speed / 5);
      if (up)   c.speed = Math.min(c.speed + accel, maxSpd);
      else if (down) c.speed = Math.max(c.speed - brake, -2);

      const propX = c.x + Math.cos(c.angle) * c.speed;
      const propY = c.y + Math.sin(c.angle) * c.speed;

      const { nx, ny, dist } = nearestOnTrack(propX, propY, wps);

      if (dist <= trackW) {
        // Full tarmac — normal grip
        c.speed *= friction;
        c.x = propX; c.y = propY;
      } else if (dist <= trackW + kerbExtra) {
        // Kerb — slight penalty, car still moves
        c.speed *= friction * 0.97;
        c.x = propX; c.y = propY;
      } else {
        // Wall hit — heavy slowdown, push back to kerb edge
        c.speed *= 0.28;
        if (dist > 0.5) {
          const clampR = trackW + kerbExtra - 1;
          const ratio = clampR / dist;
          c.x = nx + (propX - nx) * ratio;
          c.y = ny + (propY - ny) * ratio;
        } else {
          c.x = propX; c.y = propY;
        }
      }

      if (Math.abs(c.speed) < 0.01) c.speed = 0;
      c.x = Math.max(5, Math.min(W - 5, c.x));
      c.y = Math.max(5, Math.min(H - 5, c.y));
      const wp = wps[c.wpIdx];
      if (Math.sqrt((c.x - wp.x) ** 2 + (c.y - wp.y) ** 2) < wpR) {
        c.wpIdx = (c.wpIdx + 1) % wps.length;
        if (c.wpIdx === 0) {
          c.wpIdx = 1; c.lap++;
          const lt = Date.now() - c.lapStart;
          if (lt < c.bestLap) c.bestLap = lt;
          c.lapStart = Date.now();
          return true;
        }
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
    // Side-by-side spacing: CAR_W + 4px gap; row gap: CAR_H + 10px
    const side = Math.min(CAR_W + 4, track.trackW - CAR_W - 4);
    const row = CAR_H + 10;
    g.current = {
      mode, track, aiDiff: track.aiDiff,
      car:  makeCar(track, "#ef4444", "You",  0,    0),
      car2: makeCar(track, "#22d3ee", "P2",   side, 0),
      ai: [makeCar(track, "#3b82f6", "AI 1",  0,    row),
           makeCar(track, "#a855f7", "AI 2",  side, row)],
      keys: new Set(), frame: 0, state: "playing", winner: "",
    };
    setGameMode(mode); setTrackName(track.name);
    setState("playing"); setLaps1([]); setLaps2([]); setLap1(0); setLap2(0); setWinner("");
    cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(loop);
  }, [loop]);

  const keyDown = useCallback((k: string) => g.current.keys.add(k), []);
  const keyUp   = useCallback((k: string) => g.current.keys.delete(k), []);

  useEffect(() => {
    if (screen !== "race") return;
    const down = (e: KeyboardEvent) => { g.current.keys.add(e.key); if (["Arrow", "w", "a", "s", "d"].some(k => e.key.startsWith(k) || e.key === k)) e.preventDefault(); };
    const up = (e: KeyboardEvent) => g.current.keys.delete(e.key);
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); draw();
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); cancelAnimationFrame(raf.current); };
  }, [screen, draw]);

  const STAR_COLORS   = ["", "text-green-400", "text-lime-400", "text-amber-400", "text-orange-400", "text-red-400"];
  const TRACK_BORDERS = ["", "border-green-500/50", "border-lime-500/50", "border-amber-500/50", "border-orange-500/50", "border-red-500/50"];
  const TRACK_BG      = ["", "bg-green-500/10", "bg-lime-500/10", "bg-amber-500/10", "bg-orange-500/10", "bg-red-500/10"];

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

      {gameMode === "1p" && state === "playing" && (
        <div className="flex items-center justify-between w-full max-w-md px-2 sm:hidden gap-2">
          <TBtn label="◀" className="w-24 h-16 bg-indigo-800/70" onDown={() => keyDown("left")} onUp={() => keyUp("left")} />
          <div className="flex flex-col gap-2 flex-1 max-w-[140px]">
            <TBtn label="▲ Gas" className="h-14 bg-green-700/70" onDown={() => keyDown("up")} onUp={() => keyUp("up")} />
            <TBtn label="▼ Brake" className="h-12 bg-red-700/70" onDown={() => keyDown("down")} onUp={() => keyUp("down")} />
          </div>
          <TBtn label="▶" className="w-24 h-16 bg-indigo-800/70" onDown={() => keyDown("right")} onUp={() => keyUp("right")} />
        </div>
      )}
      {gameMode === "1p" && state === "playing" && (
        <p className="text-xs text-muted-foreground hidden sm:block">Arrow keys · 3 laps</p>
      )}
    </Shell>
  );
}
