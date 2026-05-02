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
function TBtn({ label, onDown, onUp, className }: { label: string; onDown: () => void; onUp: () => void; className?: string }) {
  return (
    <button
      className={`flex items-center justify-center rounded-2xl text-white font-black text-xl select-none touch-manipulation border border-white/20 active:brightness-150 ${className ?? ""}`}
      onPointerDown={e => { e.preventDefault(); onDown(); }}
      onPointerUp={e => { e.preventDefault(); onUp(); }}
      onPointerLeave={e => { e.preventDefault(); onUp(); }}
      onPointerCancel={e => { e.preventDefault(); onUp(); }}
    >{label}</button>
  );
}

// ─── Projection constants ─────────────────────────────────────────────────────
const CW       = 700;
const CH       = 480;
const SEG_LEN  = 200;          // world units per track segment
const ROAD_H   = 1000;         // road half-width (world units)
const CAM_H    = 1000;         // camera height above road
const CAM_D    = 0.84;         // camera depth / focal length
const PL_Z     = CAM_H * CAM_D;  // near-plane z  = 840
const DRAW_N   = 220;          // segments rendered per frame
const N_SEGS   = 1600;         // segments per lap
const TRACK_LEN = N_SEGS * SEG_LEN;

// ─── Physics constants ────────────────────────────────────────────────────────
const MAX_SPD  = 180;
const ACCEL    = 4.5;
const BRAKE_F  = 8;
const FRICTION = 0.962;
const OFF_F    = 0.88;
const CENTRI   = 0.026;
const STEER    = 18;
const LAP_COUNT = 3;
const AI_SPD: Record<string, number> = { easy: 80, medium: 132, hard: 160 };

// ─── Types ────────────────────────────────────────────────────────────────────
interface Seg { curve: number; pitch: number; col: number; }
export type Difficulty = "easy" | "medium" | "hard";
interface TrackInfo {
  id: string; name: string; flag: string; stars: number; desc: string; aiDiff: Difficulty;
  cmds: { curve: number; pitch: number; count: number }[];
}
interface CarState {
  z: number; x: number; speed: number;
  lap: number; bestLap: number; lapStart: number;
  color: string; label: string;
}
interface GameState {
  track: Seg[]; info: TrackInfo;
  player: CarState; player2: CarState | null;
  ais: CarState[];
  keys: Set<string>;
  steer1: number; steer2: number;
  phase: "countdown" | "playing" | "done";
  startAt: number;
  winner: string;
  mode: "1p" | "2p";
}

// ─── Track definitions ────────────────────────────────────────────────────────
const TRACKS: TrackInfo[] = [
  {
    id: "monza", name: "Monza", flag: "🇮🇹", stars: 1,
    desc: "Long straights · chicane complex · Parabolica hairpin",
    aiDiff: "easy",
    cmds: [
      { curve: 0,    pitch: 0, count: 350 },
      { curve: 190,  pitch: 0, count: 12  },
      { curve: -240, pitch: 0, count: 18  },
      { curve: 100,  pitch: 0, count: 10  },
      { curve: 0,    pitch: 0, count: 200 },
      { curve: 100,  pitch: 0, count: 28  },
      { curve: 0,    pitch: 0, count: 15  },
      { curve: 120,  pitch: 0, count: 22  },
      { curve: 0,    pitch: 0, count: 80  },
      { curve: -120, pitch: 0, count: 15  },
      { curve: 150,  pitch: 0, count: 15  },
      { curve: 0,    pitch: 0, count: 80  },
      { curve: -320, pitch: 0, count: 55  },
      { curve: 0,    pitch: 0, count: 200 },
    ],
  },
  {
    id: "silverstone", name: "Silverstone", flag: "🇬🇧", stars: 2,
    desc: "Maggotts–Becketts–Chapel S-complex · flowing bends",
    aiDiff: "easy",
    cmds: [
      { curve: 80,   pitch: 0, count: 28  },
      { curve: 0,    pitch: 0, count: 60  },
      { curve: -160, pitch: 0, count: 18  },
      { curve: 160,  pitch: 0, count: 18  },
      { curve: -160, pitch: 0, count: 18  },
      { curve: 0,    pitch: 0, count: 100 },
      { curve: 100,  pitch: 0, count: 30  },
      { curve: 0,    pitch: 0, count: 50  },
      { curve: 90,   pitch: 0, count: 25  },
      { curve: 0,    pitch: 0, count: 40  },
      { curve: -60,  pitch: 0, count: 30  },
      { curve: 0,    pitch: 0, count: 80  },
      { curve: 70,   pitch: 0, count: 30  },
      { curve: 0,    pitch: 0, count: 80  },
      { curve: -60,  pitch: 0, count: 28  },
      { curve: 0,    pitch: 0, count: 60  },
      { curve: -80,  pitch: 0, count: 28  },
      { curve: 0,    pitch: 0, count: 200 },
    ],
  },
  {
    id: "spa", name: "Spa-Francorchamps", flag: "🇧🇪", stars: 3,
    desc: "Eau Rouge uphill · Kemmel straight · Pouhon · hills",
    aiDiff: "medium",
    cmds: [
      { curve: 0,    pitch: 0,   count: 60  },
      { curve: -330, pitch: 0,   count: 50  },
      { curve: 0,    pitch: 0,   count: 20  },
      { curve: -100, pitch: 12,  count: 18  },
      { curve: 120,  pitch: 6,   count: 15  },
      { curve: 20,   pitch: -5,  count: 100 },
      { curve: -160, pitch: 0,   count: 16  },
      { curve: 130,  pitch: 0,   count: 14  },
      { curve: 0,    pitch: 0,   count: 60  },
      { curve: -80,  pitch: 0,   count: 40  },
      { curve: 0,    pitch: 0,   count: 50  },
      { curve: -200, pitch: 0,   count: 18  },
      { curve: 200,  pitch: 0,   count: 12  },
      { curve: 40,   pitch: 0,   count: 30  },
      { curve: 0,    pitch: 0,   count: 180 },
    ],
  },
  {
    id: "suzuka", name: "Suzuka", flag: "🇯🇵", stars: 4,
    desc: "S-curves · 130R · Spoon · tight hairpin · technical",
    aiDiff: "hard",
    cmds: [
      { curve: 0,    pitch: 0, count: 50  },
      { curve: 180,  pitch: 0, count: 14  },
      { curve: -180, pitch: 0, count: 14  },
      { curve: 180,  pitch: 0, count: 14  },
      { curve: -180, pitch: 0, count: 14  },
      { curve: 0,    pitch: 0, count: 40  },
      { curve: -130, pitch: 0, count: 22  },
      { curve: 0,    pitch: 0, count: 30  },
      { curve: 120,  pitch: 0, count: 18  },
      { curve: -150, pitch: 0, count: 15  },
      { curve: 0,    pitch: 0, count: 30  },
      { curve: -340, pitch: 0, count: 60  },
      { curve: 0,    pitch: 0, count: 50  },
      { curve: -90,  pitch: 0, count: 45  },
      { curve: 0,    pitch: 0, count: 70  },
      { curve: -160, pitch: 0, count: 28  },
      { curve: 0,    pitch: 0, count: 20  },
      { curve: 220,  pitch: 0, count: 14  },
      { curve: -220, pitch: 0, count: 12  },
      { curve: 0,    pitch: 0, count: 150 },
    ],
  },
  {
    id: "monaco", name: "Monaco", flag: "🇲🇨", stars: 5,
    desc: "Street circuit · Loews hairpin · tunnel · Swimming Pool",
    aiDiff: "hard",
    cmds: [
      { curve: 0,    pitch: 0,  count: 40  },
      { curve: 130,  pitch: 0,  count: 22  },
      { curve: 20,   pitch: 8,  count: 60  },
      { curve: 90,   pitch: 2,  count: 18  },
      { curve: 140,  pitch: -3, count: 18  },
      { curve: -400, pitch: 0,  count: 60  },
      { curve: 110,  pitch: 0,  count: 18  },
      { curve: -15,  pitch: 0,  count: 80  },
      { curve: -250, pitch: 0,  count: 18  },
      { curve: 250,  pitch: 0,  count: 15  },
      { curve: 90,   pitch: 0,  count: 18  },
      { curve: 260,  pitch: 0,  count: 18  },
      { curve: -260, pitch: 0,  count: 15  },
      { curve: -220, pitch: 0,  count: 40  },
      { curve: 160,  pitch: 0,  count: 18  },
      { curve: 0,    pitch: 0,  count: 200 },
    ],
  },
];

function buildTrack(info: TrackInfo): Seg[] {
  const segs: Seg[] = [];
  for (const cmd of info.cmds) {
    for (let i = 0; i < cmd.count; i++) {
      segs.push({ curve: cmd.curve, pitch: cmd.pitch, col: Math.floor(segs.length / 3) % 2 });
    }
  }
  const base = Math.max(1, segs.length);
  while (segs.length < N_SEGS) {
    const src = segs[segs.length % base];
    segs.push({ ...src, col: Math.floor(segs.length / 3) % 2 });
  }
  return segs.slice(0, N_SEGS);
}

// ─── Rendering helpers ────────────────────────────────────────────────────────
function trap(ctx: CanvasRenderingContext2D, x1: number, y1: number, w1: number, x2: number, y2: number, w2: number) {
  ctx.beginPath();
  ctx.moveTo(x1, y1); ctx.lineTo(x1 + w1, y1);
  ctx.lineTo(x2 + w2, y2); ctx.lineTo(x2, y2);
  ctx.closePath(); ctx.fill();
}

function shadeHex(col: string, amt: number): string {
  try {
    const n = parseInt(col.slice(1), 16);
    const r = Math.max(0, Math.min(255, (n >> 16) + amt));
    const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amt));
    const b = Math.max(0, Math.min(255, (n & 0xff) + amt));
    return `rgb(${r},${g},${b})`;
  } catch { return col; }
}

function drawCarSprite(ctx: CanvasRenderingContext2D, sx: number, sy: number, scale: number, color: string, label: string) {
  const cw = scale * ROAD_H * 0.42 * (CW / 2);
  const ch = scale * 290 * (CH / 2);
  if (cw < 2) return;

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#000";
  ctx.beginPath(); ctx.ellipse(sx, sy + 2, cw * 1.1, cw * 0.22, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  const grad = ctx.createLinearGradient(sx - cw, sy - ch, sx + cw, sy);
  grad.addColorStop(0, shadeHex(color, -50));
  grad.addColorStop(0.45, color);
  grad.addColorStop(1, shadeHex(color, -35));
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.roundRect(sx - cw, sy - ch, cw * 2, ch, cw * 0.14); ctx.fill();

  ctx.fillStyle = "rgba(155,210,255,0.38)";
  ctx.fillRect(sx - cw * 0.62, sy - ch * 0.95, cw * 1.24, ch * 0.3);

  ctx.fillStyle = "#0d0d0d";
  const ww = cw * 0.3, wh = ch * 0.2;
  ctx.fillRect(sx - cw * 1.12, sy - wh, ww, wh);
  ctx.fillRect(sx + cw * 0.82, sy - wh, ww, wh);

  if (cw > 12) {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = `bold ${Math.max(8, Math.round(cw * 0.52))}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(label, sx, sy - ch - 3);
  }
}

function drawCockpit(ctx: CanvasRenderingContext2D, speed: number, steer: number, yOff: number, vH: number) {
  const W = CW;
  const dashY = yOff + vH * 0.76;

  ctx.fillStyle = "#090909";
  ctx.beginPath();
  ctx.moveTo(0, yOff); ctx.lineTo(W * 0.21, dashY); ctx.lineTo(0, yOff + vH);
  ctx.closePath(); ctx.fill();

  ctx.beginPath();
  ctx.moveTo(W, yOff); ctx.lineTo(W * 0.79, dashY); ctx.lineTo(W, yOff + vH);
  ctx.closePath(); ctx.fill();

  const hg = ctx.createLinearGradient(0, dashY, 0, yOff + vH);
  hg.addColorStop(0, "#181818"); hg.addColorStop(1, "#0c0c0c");
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.moveTo(W * 0.21, dashY); ctx.lineTo(W * 0.79, dashY);
  ctx.lineTo(W, yOff + vH); ctx.lineTo(0, yOff + vH);
  ctx.closePath(); ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.055)"; ctx.lineWidth = 1.5;
  const vpx = W / 2, vpy = dashY - vH * 0.14;
  ctx.beginPath(); ctx.moveTo(vpx - 16, vpy); ctx.lineTo(vpx - 50, yOff + vH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(vpx + 16, vpy); ctx.lineTo(vpx + 50, yOff + vH); ctx.stroke();

  ctx.fillStyle = "#0e0e0e";
  ctx.fillRect(0, dashY, W, (yOff + vH) - dashY);
  ctx.strokeStyle = "rgba(255,255,255,0.11)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, dashY); ctx.lineTo(W, dashY); ctx.stroke();

  const spx = W - 76, spy = yOff + vH - 24, spr = 44;
  ctx.strokeStyle = "rgba(255,255,255,0.1)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(spx, spy, spr, 0.65 * Math.PI, 2.35 * Math.PI); ctx.stroke();
  const sf = Math.min(1, speed / MAX_SPD);
  const sa = 0.65 * Math.PI + sf * 1.7 * Math.PI;
  ctx.strokeStyle = sf > 0.82 ? "#ff4433" : sf > 0.55 ? "#ffaa22" : "#33ff88";
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(spx, spy);
  ctx.lineTo(spx + Math.cos(sa) * spr * 0.8, spy + Math.sin(sa) * spr * 0.8); ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "9px sans-serif"; ctx.textAlign = "center";
  ctx.fillText(`${Math.round(speed * 30)}`, spx, spy + 4);
  ctx.fillText("km/h", spx, spy + 13);

  if (vH >= 220) {
    const swx = W / 2, swy = dashY + vH * 0.095, swR = 27;
    const swa = steer * (Math.PI / 4);
    ctx.strokeStyle = "#2e2e2e"; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(swx, swy, swR, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "#464646"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(swx, swy, swR, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "#3c3c3c"; ctx.lineWidth = 4; ctx.lineCap = "round";
    for (let i = 0; i < 3; i++) {
      const a = swa + i * Math.PI * 2 / 3;
      ctx.beginPath();
      ctx.moveTo(swx + Math.cos(a) * swR * 0.8, swy + Math.sin(a) * swR * 0.8);
      ctx.lineTo(swx - Math.cos(a) * swR * 0.26, swy - Math.sin(a) * swR * 0.26);
      ctx.stroke();
    }
    ctx.fillStyle = "#1a1a1a"; ctx.beginPath(); ctx.arc(swx, swy, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#2c2c2c"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(swx, swy, 8, 0, Math.PI * 2); ctx.stroke();
    ctx.lineCap = "butt";
  }
}

// ─── Cockpit view renderer ────────────────────────────────────────────────────
function renderView(
  ctx: CanvasRenderingContext2D,
  gs: GameState,
  player: CarState,
  otherCars: CarState[],
  yOff: number,
  vH: number,
  steer: number,
  position: number,
) {
  const W2 = CW / 2, H2 = vH / 2;
  const px = player.x;
  const pz = player.z;

  ctx.save();
  ctx.beginPath(); ctx.rect(0, yOff, CW, vH); ctx.clip();

  // Sky
  const skyG = ctx.createLinearGradient(0, yOff, 0, yOff + vH * 0.55);
  skyG.addColorStop(0, "#06011a"); skyG.addColorStop(0.5, "#150830"); skyG.addColorStop(1, "#221244");
  ctx.fillStyle = skyG; ctx.fillRect(0, yOff, CW, vH);

  for (let i = 0; i < 50; i++) {
    const sx2 = (i * 173 + 41) % CW;
    const sy2 = yOff + (i * 97 + 13) % (vH * 0.44);
    ctx.fillStyle = `rgba(255,255,255,${0.25 + (i % 4) * 0.12})`;
    ctx.fillRect(sx2, sy2, 1, 1);
  }

  // Horizon glow
  const hg = ctx.createLinearGradient(0, yOff + H2 - 20, 0, yOff + H2 + 20);
  hg.addColorStop(0, "rgba(80,40,160,0)"); hg.addColorStop(0.5, "rgba(80,40,180,0.18)"); hg.addColorStop(1, "rgba(80,40,160,0)");
  ctx.fillStyle = hg; ctx.fillRect(0, yOff + H2 - 20, CW, 40);

  // Camera
  const camSeg = Math.floor(pz / SEG_LEN) % N_SEGS;
  const camFrac = (pz % SEG_LEN) / SEG_LEN;

  const cumX = new Float32Array(DRAW_N + 2);
  const cumY = new Float32Array(DRAW_N + 2);
  for (let n = 1; n <= DRAW_N + 1; n++) {
    const si = (camSeg + n) % N_SEGS;
    cumX[n] = cumX[n - 1] + gs.track[si].curve;
    cumY[n] = cumY[n - 1] + gs.track[si].pitch;
  }

  // Sprites
  type Spr = { n: number; sx: number; sy: number; sc: number; color: string; label: string };
  const sprites: Spr[] = [];
  for (const car of otherCars) {
    const diff = (car.lap * TRACK_LEN + car.z) - (player.lap * TRACK_LEN + pz);
    const nF = diff / SEG_LEN;
    const n = Math.floor(nF);
    if (n < 1 || n > DRAW_N - 1) continue;
    const wz = PL_Z + n * SEG_LEN - camFrac * SEG_LEN;
    if (wz <= 0) continue;
    const sc = CAM_D / wz;
    sprites.push({
      n,
      sx: W2 + sc * (cumX[n] + car.x - px) * W2,
      sy: yOff + H2 + sc * (CAM_H - cumY[n]) * H2,
      sc, color: car.color, label: car.label,
    });
  }
  sprites.sort((a, b) => b.n - a.n);

  // Road bands (far → near)
  let maxy = yOff + vH;
  let sprI = 0;

  for (let n = DRAW_N; n >= 1; n--) {
    const si = (camSeg + n) % N_SEGS;
    const seg = gs.track[si];

    const wf = PL_Z + n * SEG_LEN - camFrac * SEG_LEN;
    const wn = PL_Z + (n - 1) * SEG_LEN - camFrac * SEG_LEN;
    if (wn <= 0) continue;

    const sf = wf > 0 ? CAM_D / wf : 0;
    const sn = CAM_D / wn;

    const cxf = W2 + sf * (cumX[n]     - px) * W2;
    const cxn = W2 + sn * (cumX[n - 1] - px) * W2;
    const hwf = sf * ROAD_H * W2;
    const hwn = sn * ROAD_H * W2;
    const cyf = yOff + H2 + sf * (CAM_H - cumY[n])     * H2;
    const cyn = yOff + H2 + sn * (CAM_H - cumY[n - 1]) * H2;

    if (cyn <= cyf || cyn < yOff || cyf > yOff + vH) continue;
    if (cyn >= maxy) continue;

    const cn = Math.min(cyn, maxy);
    const col = seg.col;
    const fog = Math.min(0.88, Math.pow(n / DRAW_N, 1.65) * 1.45);

    // Grass
    ctx.fillStyle = col === 0 ? "#1d601d" : "#185218";
    ctx.fillRect(0, cyf, CW, cn - cyf);

    // Rumble strips
    const rw = { f: hwf * 0.13, n: hwn * 0.13 };
    ctx.fillStyle = col === 0 ? "#ffffff" : "#dd1111";
    trap(ctx, cxf - hwf - rw.f, cyf, rw.f * 2, cxn - hwn - rw.n, cn, rw.n * 2);
    trap(ctx, cxf + hwf, cyf, rw.f * 2, cxn + hwn, cn, rw.n * 2);

    // Road
    ctx.fillStyle = col === 0 ? "#333" : "#2b2b2b";
    trap(ctx, cxf - hwf, cyf, hwf * 2, cxn - hwn, cn, hwn * 2);

    // Center lane dash
    if (col === 0 && hwf > 8) {
      const lf = hwf * 0.038, ln = hwn * 0.038;
      ctx.fillStyle = "rgba(255,255,140,0.52)";
      trap(ctx, cxf - lf * 0.5, cyf, lf, cxn - ln * 0.5, cn, ln);
    }

    // Fog
    if (fog > 0.04) {
      ctx.fillStyle = `rgba(8,2,20,${fog.toFixed(2)})`;
      ctx.fillRect(0, cyf, CW, cn - cyf);
    }

    // Sprites at this depth
    while (sprI < sprites.length && sprites[sprI].n >= n) {
      const sp = sprites[sprI++];
      if (sp.n === n) drawCarSprite(ctx, sp.sx, sp.sy, sp.sc, sp.color, sp.label);
    }
    maxy = Math.min(maxy, cn);
  }

  // Cockpit overlay
  drawCockpit(ctx, player.speed, steer, yOff, vH);

  // HUD bar
  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fillRect(0, yOff, CW, 38);
  ctx.fillStyle = player.color;
  ctx.font = "bold 13px sans-serif"; ctx.textAlign = "left";
  ctx.fillText(`${player.label} · P${position} · Lap ${Math.min(player.lap + 1, LAP_COUNT)}/${LAP_COUNT}`, 10, yOff + 16);
  ctx.fillStyle = "#aaa"; ctx.font = "11px sans-serif";
  const elapsed = (Date.now() - player.lapStart) / 1000;
  ctx.fillText(`Best: ${player.bestLap < Infinity ? (player.bestLap / 1000).toFixed(2) + "s" : "--"}  ·  ${Math.round(player.speed * 30)} km/h  ·  ${elapsed.toFixed(1)}s`, 10, yOff + 30);

  ctx.restore();
}

// ─── Main component ────────────────────────────────────────────────────────────
function makeCar(z: number, x: number, color: string, label: string): CarState {
  return { z, x, speed: 0, lap: 0, bestLap: Infinity, lapStart: 0, color, label };
}

export default function Racing() {
  const cv = useRef<HTMLCanvasElement>(null);
  const g = useRef<GameState | null>(null);
  const raf = useRef(0);
  const built = useRef<Map<string, Seg[]>>(new Map());
  const [screen, setScreen] = useState<"menu" | "track-select" | "race">("menu");
  const [gameMode, setGameMode] = useState<"1p" | "2p">("1p");
  const [phase, setPhase] = useState<"countdown" | "playing" | "done">("countdown");
  const [winner, setWinner] = useState("");
  const [lapLog1, setLapLog1] = useState<number[]>([]);
  const [lapLog2, setLapLog2] = useState<number[]>([]);
  const [selTrack, setSelTrack] = useState(TRACKS[0]);

  const getTrack = useCallback((info: TrackInfo) => {
    if (!built.current.has(info.id)) built.current.set(info.id, buildTrack(info));
    return built.current.get(info.id)!;
  }, []);

  const draw = useCallback(() => {
    const c = cv.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const gs = g.current; if (!gs) return;
    const is2p = gs.mode === "2p";
    const vH = is2p ? CH / 2 : CH;

    ctx.clearRect(0, 0, CW, CH);

    const allCars = [gs.player, ...gs.ais, ...(gs.player2 ? [gs.player2] : [])];
    function pos(p: CarState) {
      const t = p.lap * TRACK_LEN + p.z;
      return 1 + allCars.filter(c => c !== p && c.lap * TRACK_LEN + c.z > t).length;
    }

    const others1 = [...gs.ais, ...(gs.player2 ? [gs.player2] : [])];
    renderView(ctx, gs, gs.player, others1, 0, vH, gs.steer1, pos(gs.player));
    if (is2p && gs.player2) {
      renderView(ctx, gs, gs.player2, [gs.player, ...gs.ais], vH, vH, gs.steer2, pos(gs.player2));
      ctx.fillStyle = "#000"; ctx.fillRect(0, vH - 1, CW, 3);
    }

    // Countdown
    if (gs.phase === "countdown") {
      const left = (gs.startAt - Date.now()) / 1000;
      ctx.fillStyle = "rgba(0,0,0,0.52)"; ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${is2p ? 68 : 88}px sans-serif`;
      ctx.textAlign = "center";
      const cdStr = left > 0 ? String(Math.ceil(left)) : "GO!";
      ctx.fillText(cdStr, CW / 2, CH / 2 + 28);
    }

    // Done
    if (gs.phase === "done") {
      ctx.fillStyle = "rgba(0,0,0,0.80)"; ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = "#fff"; ctx.font = "bold 44px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(`🏁 ${gs.winner} Wins!`, CW / 2, CH / 2 - 16);
      const p1b = gs.player.bestLap;
      if (p1b < Infinity) {
        ctx.fillStyle = "#ef4444"; ctx.font = "15px sans-serif";
        ctx.fillText(`Best lap: ${(p1b / 1000).toFixed(2)}s`, CW / 2, CH / 2 + 18);
      }
    }
  }, []);

  const loop = useCallback(() => {
    const gs = g.current; if (!gs) return;

    if (gs.phase === "countdown") {
      const left = gs.startAt - Date.now();
      if (left <= 0) {
        gs.phase = "playing";
        const now = Date.now();
        gs.player.lapStart = now;
        if (gs.player2) gs.player2.lapStart = now;
        gs.ais.forEach(a => a.lapStart = now);
        setPhase("playing");
      }
      draw();
      raf.current = requestAnimationFrame(loop);
      return;
    }

    if (gs.phase === "done") return;

    const k = gs.keys;
    const tgt1 = (k.has("ArrowLeft") || k.has("left")) ? -1 : (k.has("ArrowRight") || k.has("right")) ? 1 : 0;
    const tgt2 = k.has("a") ? -1 : k.has("d") ? 1 : 0;
    gs.steer1 += (tgt1 - gs.steer1) * 0.13;
    gs.steer2 += (tgt2 - gs.steer2) * 0.13;

    const gsTrack = gs.track;
    function stepCar(p: CarState, up: boolean, dn: boolean, lf: boolean, rt: boolean) {
      if (up)       p.speed = Math.min(p.speed + ACCEL, MAX_SPD);
      else if (dn)  p.speed = Math.max(p.speed - BRAKE_F, 0);
      else          p.speed *= FRICTION;
      if (lf) p.x -= STEER * Math.max(0.25, p.speed / MAX_SPD);
      if (rt) p.x += STEER * Math.max(0.25, p.speed / MAX_SPD);
      const si = Math.floor((p.z + PL_Z) / SEG_LEN) % N_SEGS;
      p.x += gsTrack[si].curve * (p.speed / MAX_SPD) * CENTRI;
      if (Math.abs(p.x) > ROAD_H * 1.12) p.speed *= OFF_F;
      p.x = Math.max(-ROAD_H * 2.2, Math.min(ROAD_H * 2.2, p.x));
      p.z += p.speed;
      if (p.z >= TRACK_LEN) {
        p.z -= TRACK_LEN;
        const lt = Date.now() - p.lapStart;
        if (lt < p.bestLap) p.bestLap = lt;
        p.lapStart = Date.now();
        p.lap++;
        return lt;
      }
      return null;
    }

    const lt1 = stepCar(gs.player,
      k.has("ArrowUp") || k.has("up"), k.has("ArrowDown") || k.has("down"),
      k.has("ArrowLeft") || k.has("left"), k.has("ArrowRight") || k.has("right"),
    );
    if (lt1 !== null) setLapLog1(prev => [...prev, lt1]);

    if (gs.mode === "2p" && gs.player2) {
      const lt2 = stepCar(gs.player2, k.has("w"), k.has("s"), k.has("a"), k.has("d"));
      if (lt2 !== null) setLapLog2(prev => [...prev, lt2]);
    }

    for (const ai of gs.ais) {
      const spd = AI_SPD[gs.info.aiDiff] ?? 120;
      ai.speed = spd;
      ai.x *= 0.94;
      const si = Math.floor(ai.z / SEG_LEN) % N_SEGS;
      ai.x += gs.track[si].curve * (spd / MAX_SPD) * CENTRI;
      ai.x = Math.max(-ROAD_H, Math.min(ROAD_H, ai.x));
      ai.z += spd;
      if (ai.z >= TRACK_LEN) { ai.z -= TRACK_LEN; ai.lap++; }
    }

    // Win detection
    const p1w = gs.player.lap >= LAP_COUNT;
    const p2w = gs.mode === "2p" && !!gs.player2 && gs.player2.lap >= LAP_COUNT;
    const aiw = gs.ais.find(a => a.lap >= LAP_COUNT);
    if (p1w || p2w || (gs.mode === "1p" && aiw)) {
      const w = p1w ? (gs.mode === "2p" ? "P1" : "You") : p2w ? "P2" : (aiw?.label ?? "AI");
      gs.phase = "done"; gs.winner = w;
      setWinner(w); setPhase("done");
      draw(); return;
    }

    draw();
    raf.current = requestAnimationFrame(loop);
  }, [draw]);

  const startRace = useCallback((mode: "1p" | "2p", info: TrackInfo) => {
    cancelAnimationFrame(raf.current);
    const track = getTrack(info);
    const gs: GameState = {
      track, info, mode,
      player:  makeCar(0,  -ROAD_H * 0.22, "#ef4444", "You"),
      player2: mode === "2p" ? makeCar(0, ROAD_H * 0.22, "#22d3ee", "P2") : null,
      ais: [
        makeCar(0, ROAD_H * 0.22,  "#3b82f6", "AI 1"),
        makeCar(0, -ROAD_H * 0.44, "#a855f7", "AI 2"),
      ],
      keys: new Set(), steer1: 0, steer2: 0,
      phase: "countdown", startAt: Date.now() + 3200,
      winner: "",
    };
    g.current = gs;
    setGameMode(mode); setSelTrack(info);
    setPhase("countdown"); setWinner(""); setLapLog1([]); setLapLog2([]);
    raf.current = requestAnimationFrame(loop);
  }, [getTrack, loop]);

  const kd = useCallback((k: string) => g.current?.keys.add(k), []);
  const ku = useCallback((k: string) => g.current?.keys.delete(k), []);

  useEffect(() => {
    if (screen !== "race") return;
    const down = (e: KeyboardEvent) => {
      g.current?.keys.add(e.key);
      if (["Arrow", "w","a","s","d"].some(k => e.key.startsWith(k) || e.key === k)) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => g.current?.keys.delete(e.key);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); cancelAnimationFrame(raf.current); };
  }, [screen]);

  const SC = ["", "border-green-500/50 bg-green-500/10", "border-lime-500/50 bg-lime-500/10", "border-amber-500/50 bg-amber-500/10", "border-orange-500/50 bg-orange-500/10", "border-red-500/50 bg-red-500/10"];
  const STR = ["", "text-green-400", "text-lime-400", "text-amber-400", "text-orange-400", "text-red-400"];

  if (screen === "menu") return (
    <Shell title="Racing Game">
      <div className="flex flex-col items-center gap-8 text-center max-w-sm">
        <div className="text-6xl select-none">🏎️</div>
        <h2 className="text-2xl font-black text-indigo-400">Select Mode</h2>
        <div className="flex flex-col gap-3 w-full">
          <button onClick={() => { setGameMode("1p"); setScreen("track-select"); }}
            className="w-full py-4 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-300 font-black rounded-2xl transition-colors touch-manipulation">
            🤖 vs Computer AI
            <div className="text-xs font-normal text-muted-foreground mt-1">Cockpit view · AI difficulty scales with track</div>
          </button>
          <button onClick={() => { setGameMode("2p"); setScreen("track-select"); }}
            className="w-full py-4 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-400 font-black rounded-2xl transition-colors touch-manipulation">
            👥 2 Players Local
            <div className="text-xs font-normal text-muted-foreground mt-1">Split-screen cockpit view · P1: Arrows · P2: WASD</div>
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
            <button key={t.id} onClick={() => { startRace(gameMode, t); setScreen("race"); }}
              className={`w-full py-3 px-5 rounded-2xl border transition-colors font-semibold text-left flex items-center gap-4 ${SC[t.stars]} hover:brightness-125 touch-manipulation`}
            >
              <span className="text-2xl w-8 text-center">{t.flag}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-black ${STR[t.stars]}`}>{t.name}</span>
                  <span className={`text-sm ${STR[t.stars]}`}>{"★".repeat(t.stars)}{"☆".repeat(5 - t.stars)}</span>
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
    <Shell title={`Racing · ${selTrack.name}`} controls={gameMode === "2p" ? "🔴 P1: Arrows · 🔵 P2: WASD · 3 laps" : "Arrow keys · 3 laps"}>
      <div className="relative w-full flex justify-center">
        <canvas ref={cv} width={CW} height={CH}
          className="rounded-xl border border-slate-700"
          style={{ width: "100%", maxWidth: CW, height: "auto" }}
        />
        {phase === "done" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none">
            <div className="pointer-events-auto flex gap-3 mt-64 flex-wrap justify-center">
              <button onClick={() => startRace(gameMode, selTrack)} className="px-8 py-3 bg-primary text-black font-bold rounded-xl touch-manipulation">Race Again</button>
              <button onClick={() => setScreen("track-select")} className="px-6 py-3 bg-secondary text-foreground font-bold rounded-xl touch-manipulation">Change Track</button>
              <button onClick={() => setScreen("menu")} className="px-4 py-3 bg-secondary text-foreground font-bold rounded-xl touch-manipulation">Menu</button>
            </div>
            {lapLog1.length > 0 && (
              <div className="pointer-events-none font-mono text-sm text-red-400 mt-2">
                {lapLog1.map((t, i) => <div key={i}>You Lap {i + 1}: {(t / 1000).toFixed(2)}s</div>)}
              </div>
            )}
          </div>
        )}
      </div>

      {gameMode === "1p" && phase === "playing" && (
        <div className="flex items-center justify-between w-full max-w-md px-2 sm:hidden gap-2">
          <TBtn label="◀" className="w-24 h-16 bg-indigo-800/70" onDown={() => kd("left")} onUp={() => ku("left")} />
          <div className="flex flex-col gap-2 flex-1 max-w-[140px]">
            <TBtn label="▲ Gas"   className="h-14 bg-green-700/70" onDown={() => kd("up")}   onUp={() => ku("up")} />
            <TBtn label="▼ Brake" className="h-12 bg-red-700/70"   onDown={() => kd("down")} onUp={() => ku("down")} />
          </div>
          <TBtn label="▶" className="w-24 h-16 bg-indigo-800/70" onDown={() => kd("right")} onUp={() => ku("right")} />
        </div>
      )}
      {gameMode === "1p" && phase === "playing" && (
        <p className="text-xs text-muted-foreground hidden sm:block">Arrow keys · 3 laps to win · Stay on the road!</p>
      )}
      {phase === "done" && lapLog1.length > 0 && (
        <p className="text-xs text-muted-foreground hidden sm:block">{winner === "You" ? "🏆 Excellent race!" : "Better luck next time!"}</p>
      )}
    </Shell>
  );
}
