import { useEffect, useRef, useState, useCallback } from "react";
import { GameShell } from "@/components/game-shell";

const COLS = 11; const ROWS = 10; const R = 22; const DIAM = R * 2;
const W = COLS * DIAM; const H = 520;
const COLORS = ["#f43f5e", "#10b981", "#3b82f6", "#f59e0b", "#a78bfa"];
type Bubble = { color: string } | null;

function rndColor() { return COLORS[Math.floor(Math.random() * COLORS.length)]; }

function initGrid(): Bubble[][] {
  return Array.from({ length: 8 }, (_, r) =>
    Array.from({ length: r % 2 === 0 ? COLS : COLS - 1 }, () => ({ color: rndColor() }))
  );
}

function bx(col: number, row: number) { return col * DIAM + (row % 2 !== 0 ? R : 0) + R; }
function by(row: number) { return row * (DIAM - 6) + R + 40; }

function distSq(ax: number, ay: number, bx: number, by: number) { return (ax - bx) ** 2 + (ay - by) ** 2; }

export default function BubbleShooter() {
  const cv = useRef<HTMLCanvasElement>(null);
  const g = useRef({
    grid: initGrid() as Bubble[][],
    shootColor: rndColor(), nextColor: rndColor(),
    angle: -Math.PI / 2, score: 0, state: "playing" as "playing" | "win" | "lose",
    projectile: null as { x: number; y: number; vx: number; vy: number; color: string } | null,
  });
  const [score, setScore] = useState(0);
  const [state, setState] = useState<"playing" | "win" | "lose">("playing");
  const raf = useRef(0);

  const draw = useCallback(() => {
    const c = cv.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#0d1117"; ctx.fillRect(0, 0, W, H);
    const s = g.current;
    s.grid.forEach((row, r) => row.forEach((b, col) => {
      if (!b) return;
      const x = bx(col, r), y = by(r);
      ctx.beginPath(); ctx.arc(x, y, R - 2, 0, Math.PI * 2);
      ctx.fillStyle = b.color; ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.lineWidth = 1.5; ctx.stroke();
    }));
    // Shooter
    const cx = W / 2, cy = H - 40;
    ctx.fillStyle = "#334155"; ctx.beginPath(); ctx.arc(cx, cy, R + 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = s.shootColor; ctx.beginPath(); ctx.arc(cx, cy, R - 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(s.angle) * 50, cy + Math.sin(s.angle) * 50); ctx.stroke();
    // Next bubble
    ctx.fillStyle = s.nextColor; ctx.beginPath(); ctx.arc(30, H - 40, R - 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#94a3b8"; ctx.font = "10px sans-serif"; ctx.fillText("NEXT", 16, H - 70);
    // Projectile
    if (s.projectile) {
      const p = s.projectile;
      ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, R - 2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.stroke();
    }
    // Score
    ctx.fillStyle = "#e2e8f0"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "right";
    ctx.fillText(`Score: ${s.score}`, W - 8, 24); ctx.textAlign = "left";
    // Danger line
    ctx.strokeStyle = "rgba(239,68,68,0.3)"; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(0, H - 80); ctx.lineTo(W, H - 80); ctx.stroke(); ctx.setLineDash([]);
  }, []);

  const popMatches = useCallback((grid: Bubble[][], startR: number, startC: number, color: string) => {
    const visited = new Set<string>();
    const queue = [[startR, startC]];
    const matched: [number, number][] = [];
    while (queue.length) {
      const [r, c] = queue.pop()!;
      const k = `${r},${c}`;
      if (visited.has(k)) continue;
      if (r < 0 || r >= grid.length || c < 0 || c >= (grid[r]?.length ?? 0)) continue;
      if (!grid[r]?.[c] || grid[r][c]!.color !== color) continue;
      visited.add(k); matched.push([r, c]);
      const offs = r % 2 === 0 ? [[0,1],[0,-1],[-1,0],[1,0],[-1,-1],[-1,1]] : [[0,1],[0,-1],[-1,0],[1,0],[-1,0],[-1,1]];
      offs.forEach(([dr, dc]) => queue.push([r + dr, c + dc]));
    }
    if (matched.length >= 3) { matched.forEach(([r, c]) => { grid[r][c] = null; }); return matched.length * 10; }
    return 0;
  }, []);

  const loop = useCallback(() => {
    const s = g.current;
    if (s.state !== "playing") { draw(); return; }
    const p = s.projectile;
    if (p) {
      p.x += p.vx; p.y += p.vy;
      if (p.x <= R) { p.x = R; p.vx = Math.abs(p.vx); }
      if (p.x >= W - R) { p.x = W - R; p.vx = -Math.abs(p.vx); }
      // Collision check with grid
      let hit = false;
      outer: for (let r = 0; r < s.grid.length; r++) {
        for (let col = 0; col < (s.grid[r]?.length ?? 0); col++) {
          if (!s.grid[r][col]) continue;
          if (distSq(p.x, p.y, bx(col, r), by(r)) < (DIAM - 4) ** 2) { hit = true; break outer; }
        }
      }
      if (p.y <= R + 40 || hit) {
        // Snap to nearest empty cell
        let bestR = 0, bestC = 0, bestD = Infinity;
        for (let r = 0; r < s.grid.length; r++) {
          for (let col = 0; col <= (r % 2 === 0 ? COLS - 1 : COLS - 2); col++) {
            if (s.grid[r]?.[col]) continue;
            const d = distSq(p.x, p.y, bx(col, r), by(r));
            if (d < bestD) { bestD = d; bestR = r; bestC = col; }
          }
        }
        if (!s.grid[bestR]) s.grid[bestR] = [];
        s.grid[bestR][bestC] = { color: p.color };
        const pts = popMatches(s.grid, bestR, bestC, p.color);
        s.score += pts; setScore(s.score);
        s.projectile = null; s.shootColor = s.nextColor; s.nextColor = rndColor();
        // Check win/lose
        const anyLeft = s.grid.some(r => r.some(b => b !== null));
        const tooLow = s.grid.some((r, ri) => r.some(b => b && by(ri) > H - 90));
        if (!anyLeft) { s.state = "win"; setState("win"); }
        else if (tooLow) { s.state = "lose"; setState("lose"); }
      }
    }
    draw(); raf.current = requestAnimationFrame(loop);
  }, [draw, popMatches]);

  const shoot = useCallback(() => {
    const s = g.current;
    if (s.projectile || s.state !== "playing") return;
    const speed = 12;
    s.projectile = { x: W / 2, y: H - 40, vx: Math.cos(s.angle) * speed, vy: Math.sin(s.angle) * speed, color: s.shootColor };
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const rect = cv.current?.getBoundingClientRect(); if (!rect) return;
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const ang = Math.atan2(my - (H - 40), mx - W / 2);
      g.current.angle = Math.max(-Math.PI + 0.2, Math.min(-0.2, ang));
    };
    const onKey = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); shoot(); } };
    const c = cv.current;
    c?.addEventListener("mousemove", onMove);
    c?.addEventListener("click", shoot);
    window.addEventListener("keydown", onKey);
    raf.current = requestAnimationFrame(loop);
    return () => { c?.removeEventListener("mousemove", onMove); c?.removeEventListener("click", shoot); window.removeEventListener("keydown", onKey); cancelAnimationFrame(raf.current); };
  }, [loop, shoot]);

  const reset = () => { g.current = { grid: initGrid(), shootColor: rndColor(), nextColor: rndColor(), angle: -Math.PI / 2, score: 0, state: "playing", projectile: null }; setScore(0); setState("playing"); cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(loop); };

  return (
    <GameShell title="Bubble Shooter" controls="Move mouse to aim · Click or Space to shoot">
      <div className="relative">
        <canvas ref={cv} width={W} height={H} className="rounded-xl border border-slate-700 cursor-crosshair" style={{ maxWidth: "95vw" }} />
        {(state === "win" || state === "lose") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-xl gap-4">
            <p className="text-2xl font-black text-primary">{state === "win" ? "🎉 You Win!" : "💥 Game Over!"}</p>
            <p className="font-mono text-muted-foreground">Score: {score}</p>
            <button onClick={reset} className="px-8 py-2 bg-primary text-black font-bold rounded-xl">Play Again</button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
