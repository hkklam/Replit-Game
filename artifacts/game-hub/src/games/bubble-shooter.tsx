import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

function Shell({ title, controls, children }: { title: string; controls?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-4 px-4 py-3 border-b border-pink-500/30 bg-gradient-to-r from-pink-950/60 to-transparent">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Hub</span>
        </Link>
        <span className="text-2xl select-none" style={{ filter: "drop-shadow(0 0 8px #f472b680)" }}>🫧</span>
        <h1 className="text-lg font-bold text-pink-400">{title}</h1>
        {controls && <span className="text-xs text-muted-foreground ml-auto hidden sm:block">{controls}</span>}
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">{children}</div>
    </div>
  );
}

const COLS = 11; const ROWS = 10; const R = 22; const DIAM = R * 2;
const W = COLS * DIAM; const H = 520;
const COLORS = ["#f43f5e", "#10b981", "#3b82f6", "#f59e0b", "#a78bfa"];
type Bubble = { color: string } | null;

function rndColor() { return COLORS[Math.floor(Math.random() * COLORS.length)]; }
function initGrid(): Bubble[][] { return Array.from({ length: 8 }, (_, r) => Array.from({ length: r % 2 === 0 ? COLS : COLS - 1 }, () => ({ color: rndColor() }))); }
function bx(col: number, row: number) { return col * DIAM + (row % 2 !== 0 ? R : 0) + R; }
function by(row: number) { return row * (DIAM - 6) + R + 40; }
function distSq(ax: number, ay: number, bxv: number, byv: number) { return (ax - bxv) ** 2 + (ay - byv) ** 2; }

type PlayerState = { color: string; nextColor: string; angle: number; score: number; shotsLeft: number };

export default function BubbleShooter() {
  const cv = useRef<HTMLCanvasElement>(null);
  const g = useRef({
    mode: "1p" as "1p" | "2p",
    grid: initGrid() as Bubble[][],
    p1: { color: rndColor(), nextColor: rndColor(), angle: -Math.PI / 2, score: 0, shotsLeft: 0 } as PlayerState,
    p2: { color: rndColor(), nextColor: rndColor(), angle: -Math.PI / 2, score: 0, shotsLeft: 0 } as PlayerState,
    turn: 1 as 1 | 2,
    projectile: null as { x: number; y: number; vx: number; vy: number; color: string; owner: 1 | 2 } | null,
    state: "playing" as "playing" | "win" | "lose",
  });
  const [screen, setScreen] = useState<"menu" | "game">("menu");
  const [p1Score, setP1Score] = useState(0); const [p2Score, setP2Score] = useState(0);
  const [turn, setTurn] = useState<1 | 2>(1);
  const [state, setState] = useState<"playing" | "win" | "lose">("playing");
  const [gameMode, setGameMode] = useState<"1p" | "2p">("1p");
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
    // Danger line
    ctx.strokeStyle = "rgba(239,68,68,0.3)"; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(0, H - 80); ctx.lineTo(W, H - 80); ctx.stroke(); ctx.setLineDash([]);
    // Shooter area — who's turn it is
    const activePl = s.mode === "2p" && s.turn === 2 ? s.p2 : s.p1;
    const shooterColor = s.mode === "2p" && s.turn === 2 ? "#f472b6" : "#6366f1";
    const cx2 = W / 2, cy2 = H - 40;
    ctx.fillStyle = "#334155"; ctx.beginPath(); ctx.arc(cx2, cy2, R + 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = activePl.color; ctx.beginPath(); ctx.arc(cx2, cy2, R - 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = shooterColor; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx2, cy2); ctx.lineTo(cx2 + Math.cos(activePl.angle) * 55, cy2 + Math.sin(activePl.angle) * 55); ctx.stroke();
    // Next bubble
    ctx.fillStyle = activePl.nextColor; ctx.beginPath(); ctx.arc(30, H - 40, R - 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#94a3b8"; ctx.font = "10px sans-serif"; ctx.textAlign = "left"; ctx.fillText("NEXT", 13, H - 70);
    // Turn indicator
    if (s.mode === "2p") {
      ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center";
      ctx.fillStyle = s.turn === 1 ? "#6366f1" : "#f472b6";
      ctx.fillText(s.turn === 1 ? "P1's Turn" : "P2's Turn", W / 2, H - 75);
    }
    // Projectile
    if (s.projectile) {
      const p = s.projectile;
      ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, R - 2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 1.5; ctx.stroke();
    }
    // Scores
    ctx.fillStyle = "#6366f1"; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "left"; ctx.fillText(`P1: ${s.p1.score}`, 8, 24);
    if (s.mode === "2p") { ctx.fillStyle = "#f472b6"; ctx.textAlign = "right"; ctx.fillText(`P2: ${s.p2.score}`, W - 8, 24); }
  }, []);

  const popMatches = useCallback((grid: Bubble[][], startR: number, startC: number, color: string) => {
    const visited = new Set<string>(); const queue = [[startR, startC]]; const matched: [number, number][] = [];
    while (queue.length) {
      const [r, c] = queue.pop()!; const k = `${r},${c}`;
      if (visited.has(k)) continue;
      if (r < 0 || r >= grid.length || c < 0 || c >= (grid[r]?.length ?? 0)) continue;
      if (!grid[r]?.[c] || grid[r][c]!.color !== color) continue;
      visited.add(k); matched.push([r, c]);
      const offs = r % 2 === 0
        ? [[0,1],[0,-1],[-1,-1],[-1,0],[1,-1],[1,0]]
        : [[0,1],[0,-1],[-1,0],[-1,1],[1,0],[1,1]];
      offs.forEach(([dr, dc]) => queue.push([r + dr, c + dc]));
    }
    if (matched.length >= 2) { matched.forEach(([r, c]) => { grid[r][c] = null; }); return matched.length * 10; }
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
      let hit = false;
      outer: for (let r = 0; r < s.grid.length; r++) {
        for (let col = 0; col < (s.grid[r]?.length ?? 0); col++) {
          if (!s.grid[r][col]) continue;
          if (distSq(p.x, p.y, bx(col, r), by(r)) < (DIAM - 4) ** 2) { hit = true; break outer; }
        }
      }
      if (p.y <= R + 40 || hit) {
        let bestR = 0, bestC = 0, bestD = Infinity;
        for (let r = 0; r < s.grid.length; r++) for (let col = 0; col <= (r % 2 === 0 ? COLS - 1 : COLS - 2); col++) {
          if (s.grid[r]?.[col]) continue;
          const d = distSq(p.x, p.y, bx(col, r), by(r));
          if (d < bestD) { bestD = d; bestR = r; bestC = col; }
        }
        if (!s.grid[bestR]) s.grid[bestR] = [];
        s.grid[bestR][bestC] = { color: p.color };
        const pts = popMatches(s.grid, bestR, bestC, p.color);
        if (p.owner === 1) { s.p1.score += pts; setP1Score(s.p1.score); }
        else { s.p2.score += pts; setP2Score(s.p2.score); }
        s.projectile = null;
        // Swap active player's colors
        const pl = p.owner === 1 ? s.p1 : s.p2;
        pl.color = pl.nextColor; pl.nextColor = rndColor();
        // Switch turn in 2P
        if (s.mode === "2p") { s.turn = s.turn === 1 ? 2 : 1; setTurn(s.turn); }
        const anyLeft = s.grid.some(r => r.some(b => b !== null));
        const tooLow = s.grid.some((r, ri) => r.some(b => b && by(ri) > H - 90));
        if (!anyLeft) { s.state = "win"; setState("win"); }
        else if (tooLow) { s.state = "lose"; setState("lose"); }
      }
    }
    draw(); raf.current = requestAnimationFrame(loop);
  }, [draw, popMatches]);

  const shoot = useCallback((player: 1 | 2) => {
    const s = g.current;
    if (s.projectile || s.state !== "playing") return;
    if (s.mode === "2p" && s.turn !== player) return;
    const pl = player === 1 ? s.p1 : s.p2;
    const speed = 12;
    s.projectile = { x: W / 2, y: H - 40, vx: Math.cos(pl.angle) * speed, vy: Math.sin(pl.angle) * speed, color: pl.color, owner: player };
  }, []);

  const startGame = useCallback((m: "1p" | "2p") => {
    g.current = { mode: m, grid: initGrid(), p1: { color: rndColor(), nextColor: rndColor(), angle: -Math.PI / 2, score: 0, shotsLeft: 0 }, p2: { color: rndColor(), nextColor: rndColor(), angle: -Math.PI / 2, score: 0, shotsLeft: 0 }, turn: 1, projectile: null, state: "playing" };
    setGameMode(m); setP1Score(0); setP2Score(0); setTurn(1); setState("playing");
    cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(loop);
  }, [loop]);

  useEffect(() => {
    if (screen !== "game") return;
    const onMove = (e: MouseEvent) => {
      const rect = cv.current?.getBoundingClientRect(); if (!rect) return;
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const ang = Math.atan2(my - (H - 40), mx - W / 2);
      const s = g.current;
      // In 2P, mouse controls whoever's turn it is (or always P1 in 1P)
      const activePl = s.mode === "2p" && s.turn === 2 ? s.p2 : s.p1;
      activePl.angle = Math.max(-Math.PI + 0.2, Math.min(-0.2, ang));
    };
    const onKey = (e: KeyboardEvent) => {
      const s = g.current;
      // P1: Space / click to shoot
      if (e.code === "Space") { e.preventDefault(); shoot(1); }
      // P2: ← → to aim, Enter to shoot
      if (e.code === "ArrowLeft") { s.p2.angle = Math.max(-Math.PI + 0.2, s.p2.angle - 0.08); e.preventDefault(); }
      if (e.code === "ArrowRight") { s.p2.angle = Math.min(-0.2, s.p2.angle + 0.08); e.preventDefault(); }
      if (e.code === "Enter") { e.preventDefault(); shoot(2); }
    };
    const c = cv.current;
    c?.addEventListener("mousemove", onMove); c?.addEventListener("click", () => shoot(1));
    window.addEventListener("keydown", onKey);
    raf.current = requestAnimationFrame(loop);
    return () => { c?.removeEventListener("mousemove", onMove); window.removeEventListener("keydown", onKey); cancelAnimationFrame(raf.current); };
  }, [screen, loop, shoot]);

  const winner2p = gameMode === "2p" ? (p1Score > p2Score ? "🟣 P1 Wins!" : p2Score > p1Score ? "🩷 P2 Wins!" : "🤝 Tie!") : null;

  if (screen === "menu") return (
    <Shell title="Bubble Shooter" controls="">
      <div className="flex flex-col items-center gap-8 text-center max-w-sm">
        <div className="text-6xl select-none">🫧</div>
        <h2 className="text-2xl font-black text-pink-400">Select Mode</h2>
        <div className="flex gap-4 w-full">
          <button onClick={() => { startGame("1p"); setScreen("game"); }} className="flex-1 py-4 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/50 text-pink-400 font-black rounded-2xl transition-colors">
            👤<br /><span className="text-sm font-semibold">1 Player</span><br /><span className="text-xs font-normal text-muted-foreground">Mouse + Space</span>
          </button>
          <button onClick={() => { startGame("2p"); setScreen("game"); }} className="flex-1 py-4 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/50 text-violet-400 font-black rounded-2xl transition-colors">
            👥<br /><span className="text-sm font-semibold">2 Players</span><br /><span className="text-xs font-normal text-muted-foreground">P1: Mouse · P2: ←→ Enter</span>
          </button>
        </div>
      </div>
    </Shell>
  );

  return (
    <Shell title="Bubble Shooter" controls={gameMode === "2p" ? `${turn === 1 ? "🟣 P1's turn" : "🩷 P2's turn"} · P1: Mouse · P2: ←→ Enter` : "Mouse to aim · Click/Space to shoot"}>
      <div className="relative">
        <canvas ref={cv} width={W} height={H} className="rounded-xl border border-slate-700 cursor-crosshair" style={{ maxWidth: "95vw" }} />
        {(state === "win" || state === "lose") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-xl gap-4">
            <p className="text-2xl font-black text-primary">{winner2p ?? (state === "win" ? "🎉 You Win!" : "💥 Game Over!")}</p>
            <p className="font-mono text-muted-foreground">{gameMode === "2p" ? `P1: ${p1Score} · P2: ${p2Score}` : `Score: ${p1Score}`}</p>
            <div className="flex gap-3">
              <button onClick={() => startGame(gameMode)} className="px-8 py-2 bg-primary text-black font-bold rounded-xl">Play Again</button>
              <button onClick={() => setScreen("menu")} className="px-6 py-2 bg-secondary text-foreground font-bold rounded-xl">Menu</button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
