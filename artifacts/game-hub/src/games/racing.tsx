import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

// ─── Canvas / world constants ─────────────────────────────────────────────────
const CW      = 700;
const CH      = 480;
const SEG     = 26;       // world units per track segment
const ROAD_W  = 52;       // road half-width
const RUMBLE  = 13;       // rumble strip width
const BARRIER = ROAD_W + RUMBLE; // hard wall — car cannot pass this
const LAP_COUNT = 3;

// ─── Physics ──────────────────────────────────────────────────────────────────
const MAX_SPD   = 4.6;
const ACCEL     = 0.10;
const BRAKE_F   = 0.17;
const FRICTION  = 0.973;
const STEER_LAT = 1.9;
const CENTRI    = 0.38;
const OFF_MULT  = 0.935;  // speed multiplier on rumble/grass

export type Difficulty = "easy" | "medium" | "hard";
const AI_SPD: Record<Difficulty, number> = { easy: 2.1, medium: 3.0, hard: 3.85 };

// ─── Types ────────────────────────────────────────────────────────────────────
interface TrackCmd  { turn: number; count: number; }
interface TrackInfo {
  id: string; name: string; flag: string; stars: number;
  desc: string; aiDiff: Difficulty; cmds: TrackCmd[];
}
interface TrackPt   { x: number; y: number; h: number; col: number; }
interface CarState  {
  prog: number; lat: number; spd: number;
  lap: number; bestLap: number; lapStart: number;
  color: string; label: string;
}
interface MapBounds { x0: number; y0: number; x1: number; y1: number; }
interface BuiltTrack { pts: TrackPt[]; total: number; mb: MapBounds; levels: Uint8Array; }
interface GameState {
  pts: TrackPt[]; total: number; mb: MapBounds; info: TrackInfo;
  levels: Uint8Array;
  player: CarState; player2: CarState | null; ais: CarState[];
  keys: Set<string>; s1: number; s2: number;
  phase: "countdown" | "playing" | "done";
  startAt: number; winner: string; mode: "1p" | "2p";
}

// ─── Track definitions ────────────────────────────────────────────────────────
const TRACKS: TrackInfo[] = [
  {
    id: "monza", name: "Monza", flag: "🇮🇹", stars: 1,
    desc: "Long straights · chicane complex · Parabolica hairpin",
    aiDiff: "easy",
    cmds: [
      { turn: 0,    count: 38 }, { turn: 68,   count: 10 },
      { turn: -88,  count: 12 }, { turn: 64,   count: 8  },
      { turn: 0,    count: 22 }, { turn: 80,   count: 14 },
      { turn: 0,    count: 12 }, { turn: 75,   count: 14 },
      { turn: 0,    count: 14 }, { turn: -80,  count: 10 },
      { turn: 80,   count: 10 }, { turn: 0,    count: 14 },
      { turn: 180,  count: 30 }, { turn: 0,    count: 38 },
    ],
  },
  {
    id: "silverstone", name: "Silverstone", flag: "🇬🇧", stars: 2,
    desc: "Maggotts–Becketts–Chapel S-complex · fast sweepers",
    aiDiff: "easy",
    cmds: [
      { turn: 60,   count: 14 }, { turn: 0,    count: 16 },
      { turn: -100, count: 10 }, { turn: 100,  count: 10 },
      { turn: -100, count: 10 }, { turn: 0,    count: 20 },
      { turn: 90,   count: 14 }, { turn: 0,    count: 12 },
      { turn: 78,   count: 12 }, { turn: 0,    count: 12 },
      { turn: -56,  count: 14 }, { turn: 0,    count: 18 },
      { turn: 60,   count: 14 }, { turn: 0,    count: 18 },
      { turn: -60,  count: 14 }, { turn: 0,    count: 18 },
      { turn: -68,  count: 14 }, { turn: 0,    count: 26 },
    ],
  },
  {
    id: "spa", name: "Spa-Francorchamps", flag: "🇧🇪", stars: 3,
    desc: "Eau Rouge · Kemmel straight · Pouhon · La Source",
    aiDiff: "medium",
    cmds: [
      { turn: 0,    count: 26 }, { turn: -195, count: 22 },
      { turn: 0,    count: 10 }, { turn: -80,  count: 8  },
      { turn: 105,  count: 7  }, { turn: 15,   count: 44 },
      { turn: -100, count: 9  }, { turn: 90,   count: 7  },
      { turn: 0,    count: 20 }, { turn: -75,  count: 20 },
      { turn: 0,    count: 18 }, { turn: -138, count: 9  },
      { turn: 138,  count: 7  }, { turn: 35,   count: 12 },
      { turn: 0,    count: 28 },
    ],
  },
  {
    id: "suzuka", name: "Suzuka", flag: "🇯🇵", stars: 4,
    desc: "S-curves · 130R · Spoon · Casio Triangle · overpass bridge",
    aiDiff: "hard",
    cmds: [
      { turn: 0,    count: 18 }, { turn: 115,  count: 7  },
      { turn: -115, count: 7  }, { turn: 115,  count: 7  },
      { turn: -115, count: 7  }, { turn: 0,    count: 14 },
      { turn: -90,  count: 10 }, { turn: 0,    count: 11 },
      { turn: 80,   count: 9  }, { turn: -100, count: 7  },
      { turn: 0,    count: 11 }, { turn: -215, count: 32 },
      { turn: 0,    count: 18 }, { turn: -70,  count: 22 },
      { turn: 0,    count: 22 }, { turn: -110, count: 14 },
      { turn: 0,    count: 9  }, { turn: 155,  count: 7  },
      { turn: -155, count: 6  }, { turn: 0,    count: 38 },
    ],
  },
  {
    id: "monaco", name: "Monaco", flag: "🇲🇨", stars: 5,
    desc: "Street circuit · Loews hairpin · tunnel · tight walls",
    aiDiff: "hard",
    cmds: [
      { turn: 0,    count: 13 }, { turn: 88,   count: 10 },
      { turn: 18,   count: 22 }, { turn: 72,   count: 9  },
      { turn: 88,   count: 9  }, { turn: -248, count: 32 },
      { turn: 78,   count: 9  }, { turn: -12,  count: 28 },
      { turn: -168, count: 10 }, { turn: 168,  count: 9  },
      { turn: 68,   count: 9  }, { turn: 168,  count: 9  },
      { turn: -168, count: 9  }, { turn: -148, count: 22 },
      { turn: 118,  count: 9  }, { turn: 0,    count: 38 },
    ],
  },
];

// ─── Segment-level intersection detection (for bridges / overpasses) ──────────
function segsIntersect(
  p1: TrackPt, p2: TrackPt,
  p3: TrackPt, p4: TrackPt,
): boolean {
  const dx1 = p2.x - p1.x, dy1 = p2.y - p1.y;
  const dx2 = p4.x - p3.x, dy2 = p4.y - p3.y;
  const cross = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(cross) < 1e-8) return false;
  const dx = p3.x - p1.x, dy = p3.y - p1.y;
  const t = (dx * dy2 - dy * dx2) / cross;
  const u = (dx * dy1 - dy * dx1) / cross;
  return t > 0.02 && t < 0.98 && u > 0.02 && u < 0.98;
}

// Returns a Uint8Array where 0 = ground level, 1 = bridge (above).
// When two segments cross, the one with the lower index is the overpass (bridge).
function computeSegmentLevels(pts: TrackPt[]): Uint8Array {
  const n = pts.length - 1;
  const levels = new Uint8Array(n);
  const SKIP = 6; // minimum gap — ignore nearly-adjacent segments

  for (let i = 0; i < n; i++) {
    for (let j = i + SKIP; j < n; j++) {
      // Skip segments that are close when going backward around the loop
      if (n - j + i < SKIP) continue;
      if (segsIntersect(pts[i], pts[i + 1], pts[j], pts[j + 1])) {
        // Lower-index segment is the overpass; mark a window around it as bridge
        const from = Math.max(0, i - 2);
        const to   = Math.min(n - 1, i + 22);
        for (let k = from; k <= to; k++) levels[k] = 1;
      }
    }
  }
  return levels;
}

// ─── Track builder ────────────────────────────────────────────────────────────
function buildTrack(info: TrackInfo): BuiltTrack {
  const pts: TrackPt[] = [];
  let x = 0, y = 0, h = -Math.PI / 2, colCnt = 0;
  for (const cmd of info.cmds) {
    const dh = (cmd.turn * Math.PI / 180) / Math.max(1, cmd.count);
    for (let i = 0; i < cmd.count; i++) {
      pts.push({ x, y, h, col: Math.floor(colCnt / 4) % 2 });
      colCnt++;
      h += dh;
      x += Math.cos(h) * SEG;
      y += Math.sin(h) * SEG;
    }
  }
  pts.push({ x, y, h, col: pts[pts.length - 1]?.col ?? 0 });

  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pts) {
    if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x;
    if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y;
  }
  const levels = computeSegmentLevels(pts);
  return { pts, total: (pts.length - 1) * SEG, mb: { x0, y0, x1, y1 }, levels };
}

// ─── Track helpers ────────────────────────────────────────────────────────────
function tpAt(pts: TrackPt[], total: number, prog: number): TrackPt {
  const p = ((prog % total) + total) % total;
  const idx = Math.min(Math.floor(p / SEG), pts.length - 2);
  const f = (p % SEG) / SEG;
  const a = pts[idx], b = pts[idx + 1];
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, h: a.h, col: a.col };
}

function carWP(pts: TrackPt[], total: number, prog: number, lat: number) {
  const tp = tpAt(pts, total, prog);
  const perp = tp.h + Math.PI / 2;
  return { wx: tp.x + Math.cos(perp) * lat, wy: tp.y + Math.sin(perp) * lat, h: tp.h };
}

function segCurvature(pts: TrackPt[], total: number, prog: number): number {
  const p = ((prog % total) + total) % total;
  const idx = Math.min(Math.floor(p / SEG), pts.length - 2);
  return pts[Math.min(idx + 1, pts.length - 1)].h - pts[idx].h;
}

// Returns the segment index for a given prog value
function segIdx(total: number, prog: number, n: number): number {
  const p = ((prog % total) + total) % total;
  return Math.min(Math.floor(p / SEG), n - 2);
}

function makeCar(prog: number, lat: number, color: string, label: string): CarState {
  return { prog, lat, spd: 0, lap: 0, bestLap: Infinity, lapStart: 0, color, label };
}

function stepCar(
  car: CarState, pts: TrackPt[], total: number,
  accel: boolean, brake: boolean, left: boolean, right: boolean,
): number | null {
  if (accel)       car.spd = Math.min(car.spd + ACCEL, MAX_SPD);
  else if (brake)  car.spd = Math.max(car.spd - BRAKE_F, 0);
  else             car.spd *= FRICTION;

  const steer = (left ? -1 : 0) + (right ? 1 : 0);
  car.lat += steer * STEER_LAT * Math.max(0.25, car.spd / MAX_SPD);

  // Centrifugal drift on curves
  const dh = segCurvature(pts, total, car.prog);
  car.lat += dh * car.spd * CENTRI;

  // Speed penalty on rumble / off-road
  if (Math.abs(car.lat) > ROAD_W) car.spd *= OFF_MULT;

  // Hard barrier — car cannot cross outer edge of rumble strip
  if (Math.abs(car.lat) > BARRIER) {
    car.lat  = Math.sign(car.lat) * BARRIER;
    car.spd *= 0.45; // bounce off wall, big speed reduction
  }

  car.prog += car.spd;
  if (car.prog >= total) {
    car.prog -= total;
    car.lap++;
    const lt = Date.now() - car.lapStart;
    if (lt < car.bestLap) car.bestLap = lt;
    car.lapStart = Date.now();
    return lt;
  }
  return null;
}

// ─── Drawing helpers ──────────────────────────────────────────────────────────
function shadeHex(color: string, amt: number): string {
  const n = parseInt(color.replace("#", ""), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (n & 0xff) + amt));
  return `rgb(${r},${g},${b})`;
}

// Draws a top-down car. h = world heading in radians (0 = east, π/2 = south).
// The sprite's "nose" points in the direction of h.
function drawTopCar(
  ctx: CanvasRenderingContext2D,
  wx: number, wy: number, h: number,
  color: string, label: string,
  steerLean = 0,
) {
  ctx.save();
  ctx.translate(wx, wy);
  // Rotate sprite so the car's nose points along h.
  // Sprite's "nose" is local -y (top of rectangle), so rotation = h + π/2.
  ctx.rotate(h + Math.PI / 2 + steerLean * 0.09);

  // Shadow
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "#000";
  ctx.beginPath(); ctx.ellipse(2, 2, 9, 15, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // Body
  const grad = ctx.createLinearGradient(-9, -15, 9, 15);
  grad.addColorStop(0, color); grad.addColorStop(1, shadeHex(color, -60));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-9, -15); ctx.lineTo(9, -15); ctx.lineTo(9, 15); ctx.lineTo(-9, 15); ctx.closePath();
  ctx.fill();

  // Windshield
  ctx.fillStyle = "rgba(150,210,255,0.52)";
  ctx.fillRect(-7, -13, 14, 9);

  // Wheels
  ctx.fillStyle = "#111";
  ctx.fillRect(-12, -11, 4, 6); ctx.fillRect(8, -11, 4, 6);
  ctx.fillRect(-12, 6,   4, 6); ctx.fillRect(8, 6,   4, 6);

  // Label
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
  ctx.fillText(label, 0, 4);

  ctx.restore();
}

// Draw a single track segment quad (rumble + road surface) with optional bridge styling
function drawSegment(
  ctx: CanvasRenderingContext2D,
  a: TrackPt, b: TrackPt,
  isBridge: boolean,
) {
  const ha = a.h + Math.PI / 2, hb = b.h + Math.PI / 2;
  const rw = ROAD_W + RUMBLE;
  const cha = Math.cos(ha), sha = Math.sin(ha);
  const chb = Math.cos(hb), shb = Math.sin(hb);

  // Rumble strip colour: bridge uses concrete/grey, ground uses red/white
  ctx.fillStyle = isBridge
    ? (a.col === 0 ? "#c8c8c8" : "#aaaaaa")
    : (a.col === 0 ? "#e8e8e8" : "#cc1111");
  ctx.beginPath();
  ctx.moveTo(a.x + cha * rw,  a.y + sha * rw);
  ctx.lineTo(a.x - cha * rw,  a.y - sha * rw);
  ctx.lineTo(b.x - chb * rw,  b.y - shb * rw);
  ctx.lineTo(b.x + chb * rw,  b.y + shb * rw);
  ctx.closePath(); ctx.fill();

  // Road surface — bridge is slightly lighter
  ctx.fillStyle = isBridge
    ? (a.col === 0 ? "#3c3c3c" : "#353535")
    : (a.col === 0 ? "#323232" : "#2b2b2b");
  ctx.beginPath();
  ctx.moveTo(a.x + cha * ROAD_W,  a.y + sha * ROAD_W);
  ctx.lineTo(a.x - cha * ROAD_W,  a.y - sha * ROAD_W);
  ctx.lineTo(b.x - chb * ROAD_W,  b.y - shb * ROAD_W);
  ctx.lineTo(b.x + chb * ROAD_W,  b.y + shb * ROAD_W);
  ctx.closePath(); ctx.fill();

  // Edge lines (every other segment)
  const ew = 2.2;
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.beginPath();
  ctx.moveTo(a.x + cha * ROAD_W,         a.y + sha * ROAD_W);
  ctx.lineTo(a.x + cha * (ROAD_W - ew),  a.y + sha * (ROAD_W - ew));
  ctx.lineTo(b.x + chb * (ROAD_W - ew),  b.y + shb * (ROAD_W - ew));
  ctx.lineTo(b.x + chb * ROAD_W,         b.y + shb * ROAD_W);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(a.x - cha * ROAD_W,         a.y - sha * ROAD_W);
  ctx.lineTo(a.x - cha * (ROAD_W - ew),  a.y - sha * (ROAD_W - ew));
  ctx.lineTo(b.x - chb * (ROAD_W - ew),  b.y - shb * (ROAD_W - ew));
  ctx.lineTo(b.x - chb * ROAD_W,         b.y - shb * ROAD_W);
  ctx.closePath(); ctx.fill();

  // Bridge guardrails — white barriers on outer edge
  if (isBridge) {
    const gw = 3.5;
    ctx.fillStyle = "#eeeeee";
    ctx.beginPath();
    ctx.moveTo(a.x + cha * (rw - gw),  a.y + sha * (rw - gw));
    ctx.lineTo(a.x + cha * rw,          a.y + sha * rw);
    ctx.lineTo(b.x + chb * rw,          b.y + shb * rw);
    ctx.lineTo(b.x + chb * (rw - gw),  b.y + shb * (rw - gw));
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(a.x - cha * (rw - gw),  a.y - sha * (rw - gw));
    ctx.lineTo(a.x - cha * rw,          a.y - sha * rw);
    ctx.lineTo(b.x - chb * rw,          b.y - shb * rw);
    ctx.lineTo(b.x - chb * (rw - gw),  b.y - shb * (rw - gw));
    ctx.closePath(); ctx.fill();
  }
}

// ─── Render one player's viewport ─────────────────────────────────────────────
// Camera is FIXED to north-up; it only TRANSLATES to keep the player centered.
// The car SPRITE rotates to show its heading. Track never rotates.
function renderScene(
  ctx: CanvasRenderingContext2D, gs: GameState,
  player: CarState, otherCars: CarState[],
  yOff: number, vH: number, position: number,
  steerLean = 0,
) {
  const { pts, total, mb, levels } = gs;
  const wp = carWP(pts, total, player.prog, player.lat);
  const n  = pts.length - 1;

  ctx.save();
  ctx.beginPath(); ctx.rect(0, yOff, CW, vH); ctx.clip();

  // Camera: center on player car, no rotation — track is always north-up
  ctx.translate(CW / 2, yOff + vH / 2);
  ctx.translate(-wp.wx, -wp.wy);

  // ── Grass background ──────────────────────────────────────────────────────
  const mg = 2400;
  ctx.fillStyle = "#2d5a1b";
  ctx.fillRect(mb.x0 - mg, mb.y0 - mg, (mb.x1 - mb.x0) + mg * 2, (mb.y1 - mb.y0) + mg * 2);
  ctx.fillStyle = "#275318";
  for (let gx = Math.floor((mb.x0 - mg) / 110) * 110; gx < mb.x1 + mg; gx += 110)
    ctx.fillRect(gx, mb.y0 - mg, 55, (mb.y1 - mb.y0) + mg * 2);

  // ── Pass 1: Ground-level road segments (level 0) ──────────────────────────
  for (let i = 0; i < n; i++) {
    if (levels[i] === 1) continue;
    drawSegment(ctx, pts[i], pts[i + 1], false);
  }

  // ── Cars under the bridge (ground level) — drawn before bridge overdraw ───
  const playerSeg   = segIdx(total, player.prog, n);
  const playerLevel = levels[playerSeg] ?? 0;

  for (const car of otherCars) {
    const si = segIdx(total, car.prog, n);
    if ((levels[si] ?? 0) === 0) {
      const cwp = carWP(pts, total, car.prog, car.lat);
      drawTopCar(ctx, cwp.wx, cwp.wy, cwp.h, car.color, car.label);
    }
  }
  if (playerLevel === 0) {
    drawTopCar(ctx, wp.wx, wp.wy, wp.h, player.color, player.label, steerLean);
  }

  // ── Pass 2: Bridge road (level 1) — overdraws cars on the ground under it ─
  for (let i = 0; i < n; i++) {
    if (levels[i] === 0) continue;
    drawSegment(ctx, pts[i], pts[i + 1], true);
  }

  // ── Cars on the bridge — drawn on top of bridge road ─────────────────────
  for (const car of otherCars) {
    const si = segIdx(total, car.prog, n);
    if ((levels[si] ?? 0) === 1) {
      const cwp = carWP(pts, total, car.prog, car.lat);
      drawTopCar(ctx, cwp.wx, cwp.wy, cwp.h, car.color, car.label);
    }
  }
  if (playerLevel === 1) {
    drawTopCar(ctx, wp.wx, wp.wy, wp.h, player.color, player.label, steerLean);
  }

  // ── Centre dashes (on top of everything) ─────────────────────────────────
  ctx.strokeStyle = "rgba(255,255,140,0.52)";
  ctx.lineWidth = 2.6;
  ctx.setLineDash([14, 14]);
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);

  // ── Start / finish line ───────────────────────────────────────────────────
  const sf0 = pts[0];
  const sfh = sf0.h + Math.PI / 2;
  const cs  = 9;
  for (let s = -3; s <= 3; s++) {
    for (let d = 0; d < 2; d++) {
      const bx = sf0.x + Math.cos(sfh) * (s * cs) + Math.cos(sf0.h) * (d * cs);
      const by = sf0.y + Math.sin(sfh) * (s * cs) + Math.sin(sf0.h) * (d * cs);
      ctx.fillStyle = (s + d) % 2 === 0 ? "#fff" : "#000";
      ctx.fillRect(bx - cs / 2, by - cs / 2, cs, cs);
    }
  }

  ctx.restore(); // back to screen space

  // ── Minimap ──────────────────────────────────────────────────────────────
  const msz = 88;
  const mpx = CW - msz - 8, mpy = yOff + 8;
  const mpad = 14;
  const mw = mb.x1 - mb.x0 + mpad * 2, mh = mb.y1 - mb.y0 + mpad * 2;
  const ms = Math.min(msz / mw, msz / mh);
  const mox = mpx + msz / 2 - (mb.x0 + mw / 2 - mpad) * ms;
  const moy = mpy + msz / 2 - (mb.y0 + mh / 2 - mpad) * ms;

  ctx.fillStyle = "rgba(0,0,0,0.70)";
  ctx.beginPath();
  ctx.roundRect(mpx - 2, mpy - 2, msz + 4, msz + 4, 7);
  ctx.fill();

  ctx.save();
  ctx.beginPath(); ctx.rect(mpx, mpy, msz, msz); ctx.clip();

  ctx.strokeStyle = "#444";
  ctx.lineWidth = (ROAD_W + RUMBLE) * 2 * ms;
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(pts[0].x * ms + mox, pts[0].y * ms + moy);
  for (const p of pts) ctx.lineTo(p.x * ms + mox, p.y * ms + moy);
  ctx.closePath(); ctx.stroke();

  ctx.strokeStyle = "#666";
  ctx.lineWidth = ROAD_W * 2 * ms;
  ctx.beginPath();
  ctx.moveTo(pts[0].x * ms + mox, pts[0].y * ms + moy);
  for (const p of pts) ctx.lineTo(p.x * ms + mox, p.y * ms + moy);
  ctx.closePath(); ctx.stroke();

  for (const car of [...otherCars, player]) {
    const cwp = carWP(pts, total, car.prog, car.lat);
    ctx.fillStyle = car.color;
    ctx.beginPath();
    ctx.arc(cwp.wx * ms + mox, cwp.wy * ms + moy, car === player ? 4 : 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  ctx.restore();

  // ── HUD bar ──────────────────────────────────────────────────────────────
  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.fillRect(0, yOff, CW, 36);
  ctx.fillStyle = player.color;
  ctx.font = "bold 13px sans-serif"; ctx.textAlign = "left";
  ctx.fillText(
    `${player.label}  P${position}  Lap ${Math.min(player.lap + 1, LAP_COUNT)}/${LAP_COUNT}`,
    10, yOff + 16,
  );
  ctx.fillStyle = "#aaa"; ctx.font = "11px sans-serif";
  const elapsed = (Date.now() - player.lapStart) / 1000;
  ctx.fillText(
    `Best: ${player.bestLap < Infinity ? (player.bestLap / 1000).toFixed(2) + "s" : "--"}  ·  ${Math.round(player.spd * 30)} km/h  ·  ${elapsed.toFixed(1)}s`,
    10, yOff + 29,
  );
}

// ─── UI Components ────────────────────────────────────────────────────────────
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

// ─── Main component ───────────────────────────────────────────────────────────
export default function Racing() {
  const cv    = useRef<HTMLCanvasElement>(null);
  const g     = useRef<GameState | null>(null);
  const raf   = useRef(0);
  const cache = useRef<Map<string, BuiltTrack>>(new Map());

  const [screen,   setScreen]   = useState<"menu" | "track-select" | "race">("menu");
  const [gameMode, setGameMode] = useState<"1p" | "2p">("1p");
  const [phase,    setPhase]    = useState<"countdown" | "playing" | "done">("countdown");
  const [winner,   setWinner]   = useState("");
  const [lapLog1,  setLapLog1]  = useState<number[]>([]);
  const [selTrack, setSelTrack] = useState(TRACKS[0]);

  const getTrack = useCallback((info: TrackInfo): BuiltTrack => {
    if (!cache.current.has(info.id)) cache.current.set(info.id, buildTrack(info));
    return cache.current.get(info.id)!;
  }, []);

  const draw = useCallback(() => {
    const c = cv.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const gs  = g.current; if (!gs) return;
    const is2p = gs.mode === "2p";
    const vH   = is2p ? CH / 2 : CH;

    ctx.clearRect(0, 0, CW, CH);

    const allCars = [gs.player, ...gs.ais, ...(gs.player2 ? [gs.player2] : [])];
    const pos = (p: CarState) =>
      1 + allCars.filter(c => c !== p && (c.lap * gs.total + c.prog) > (p.lap * gs.total + p.prog)).length;

    renderScene(ctx, gs, gs.player, [...gs.ais, ...(gs.player2 ? [gs.player2] : [])], 0, vH, pos(gs.player), gs.s1);
    if (is2p && gs.player2) {
      renderScene(ctx, gs, gs.player2, [gs.player, ...gs.ais], vH, vH, pos(gs.player2), gs.s2);
      ctx.fillStyle = "#000"; ctx.fillRect(0, vH - 1, CW, 3);
    }

    if (gs.phase === "countdown") {
      const left = (gs.startAt - Date.now()) / 1000;
      ctx.fillStyle = "rgba(0,0,0,0.50)"; ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${is2p ? 68 : 88}px sans-serif`; ctx.textAlign = "center";
      ctx.fillText(left > 0 ? String(Math.ceil(left)) : "GO!", CW / 2, CH / 2 + 28);
    }
    if (gs.phase === "done") {
      ctx.fillStyle = "rgba(0,0,0,0.78)"; ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = "#fff"; ctx.font = "bold 44px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(`🏁 ${gs.winner} Wins!`, CW / 2, CH / 2 - 16);
      if (gs.player.bestLap < Infinity) {
        ctx.fillStyle = "#ef4444"; ctx.font = "15px sans-serif";
        ctx.fillText(`Best lap: ${(gs.player.bestLap / 1000).toFixed(2)}s`, CW / 2, CH / 2 + 18);
      }
    }
  }, []);

  const loop = useCallback(() => {
    const gs = g.current; if (!gs) return;

    if (gs.phase === "countdown") {
      if (gs.startAt - Date.now() <= 0) {
        gs.phase = "playing";
        const now = Date.now();
        gs.player.lapStart = now;
        if (gs.player2) gs.player2.lapStart = now;
        gs.ais.forEach(a => a.lapStart = now);
        setPhase("playing");
      }
      draw(); raf.current = requestAnimationFrame(loop); return;
    }
    if (gs.phase === "done") return;

    const k = gs.keys;
    const ts1 = (k.has("ArrowLeft") || k.has("left")) ? -1 : (k.has("ArrowRight") || k.has("right")) ? 1 : 0;
    const ts2 = k.has("a") ? -1 : k.has("d") ? 1 : 0;
    gs.s1 += (ts1 - gs.s1) * 0.15;
    gs.s2 += (ts2 - gs.s2) * 0.15;

    const lt1 = stepCar(
      gs.player, gs.pts, gs.total,
      k.has("ArrowUp") || k.has("up"),
      k.has("ArrowDown") || k.has("down"),
      k.has("ArrowLeft") || k.has("left"),
      k.has("ArrowRight") || k.has("right"),
    );
    if (lt1 !== null) setLapLog1(prev => [...prev, lt1]);

    if (gs.mode === "2p" && gs.player2) {
      stepCar(gs.player2, gs.pts, gs.total, k.has("w"), k.has("s"), k.has("a"), k.has("d"));
    }

    for (const ai of gs.ais) {
      const spd = AI_SPD[gs.info.aiDiff];
      ai.spd = spd;
      ai.lat *= 0.90;
      const dh = segCurvature(gs.pts, gs.total, ai.prog);
      ai.lat += dh * spd * CENTRI;
      ai.lat = Math.max(-ROAD_W * 0.85, Math.min(ROAD_W * 0.85, ai.lat));
      ai.prog += spd;
      if (ai.prog >= gs.total) { ai.prog -= gs.total; ai.lap++; }
    }

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
    const { pts, total, mb, levels } = getTrack(info);
    const gs: GameState = {
      pts, total, mb, info, levels, mode,
      player:  makeCar(0, -ROAD_W * 0.25, "#ef4444", "You"),
      player2: mode === "2p" ? makeCar(0, ROAD_W * 0.25, "#22d3ee", "P2") : null,
      ais: [
        makeCar(0,  ROAD_W * 0.25, "#3b82f6", "AI1"),
        makeCar(0, -ROAD_W * 0.50, "#a855f7", "AI2"),
      ],
      keys: new Set(), s1: 0, s2: 0,
      phase: "countdown", startAt: Date.now() + 3200,
      winner: "",
    };
    g.current = gs;
    setGameMode(mode); setSelTrack(info);
    setPhase("countdown"); setWinner(""); setLapLog1([]);
    raf.current = requestAnimationFrame(loop);
  }, [getTrack, loop]);

  const kd = useCallback((k: string) => g.current?.keys.add(k), []);
  const ku = useCallback((k: string) => g.current?.keys.delete(k), []);

  useEffect(() => {
    if (screen !== "race") return;
    const down = (e: KeyboardEvent) => {
      g.current?.keys.add(e.key);
      if (["Arrow", "w", "a", "s", "d"].some(kk => e.key.startsWith(kk) || e.key === kk)) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => g.current?.keys.delete(e.key);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      cancelAnimationFrame(raf.current);
    };
  }, [screen]);

  const SC  = ["", "border-green-500/50 bg-green-500/10", "border-lime-500/50 bg-lime-500/10", "border-amber-500/50 bg-amber-500/10", "border-orange-500/50 bg-orange-500/10", "border-red-500/50 bg-red-500/10"];
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
            <div className="text-xs font-normal text-muted-foreground mt-1">Top-down · car rotates with heading · stay inside the barriers</div>
          </button>
          <button onClick={() => { setGameMode("2p"); setScreen("track-select"); }}
            className="w-full py-4 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-400 font-black rounded-2xl transition-colors touch-manipulation">
            👥 2 Players Local
            <div className="text-xs font-normal text-muted-foreground mt-1">Split-screen top-down · P1: Arrows · P2: WASD</div>
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
              className={`w-full py-3 px-5 rounded-2xl border transition-colors font-semibold text-left flex items-center gap-4 ${SC[t.stars]} hover:brightness-125 touch-manipulation`}>
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
    <Shell
      title={`Racing · ${selTrack.name}`}
      controls={gameMode === "2p" ? "🔴 P1: Arrows · 🔵 P2: WASD · 3 laps" : "↑ gas  ↓ brake  ← → steer · 3 laps"}
    >
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
        <p className="text-xs text-muted-foreground hidden sm:block">Arrow keys · {LAP_COUNT} laps to win · Stay inside the barriers!</p>
      )}
      {phase === "done" && lapLog1.length > 0 && (
        <p className="text-xs text-muted-foreground hidden sm:block">{winner === "You" ? "🏆 Excellent race!" : "Better luck next time!"}</p>
      )}
    </Shell>
  );
}
