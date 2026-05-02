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

const CELL = 22;
const MAP_RAW = [
  "####################",
  "#........#.........#",
  "#.##.###.#.###.##.##",
  "#P##.###.#.###.##.##",
  "#.................##",
  "#.##.#.#####.#.##.##",
  "#....#...#...#....##",
  "####.### # ###.####",
  "#####.#  G  #.#####",
  "#####.# ### #.#####",
  "#####.# ### #.#####",
  "#####.#G   G#.#####",
  "#####.# ### #.#####",
  "#####.#     #.#####",
  "#####.# ####.#.####",
  "#....#...#...#....#",
  "#.##.#.#####.#.##.#",
  "#...#...........#.#",
  "##.###.###.###.###.#",
  "##.###.###.###.###.#",
  "#..................#",
  "####################",
].map(r => r.split(""));

const COLS = MAP_RAW[0].length; const ROWS = MAP_RAW.length;
const W = COLS * CELL; const H = ROWS * CELL;

type Dir = { x: number; y: number };
type Ghost = { r: number; c: number; color: string; dir: Dir; scared: boolean };

function initGame() {
  let pr = 0, pc = 0;
  const dots = new Set<string>();
  const pellets = new Set<string>();
  const grid = MAP_RAW.map((row, r) => row.map((ch, c) => {
    if (ch === "P") { pr = r; pc = c; return "."; }
    if (ch === ".") { dots.add(`${r},${c}`); return "."; }
    if (ch === "p") { pellets.add(`${r},${c}`); dots.add(`${r},${c}`); return "."; }
    return ch;
  }));
  const ghosts: Ghost[] = [
    { r: 8, c: 9, color: "#f43f5e", dir: { x: 1, y: 0 }, scared: false },
    { r: 11, c: 9, color: "#fb923c", dir: { x: -1, y: 0 }, scared: false },
    { r: 11, c: 11, color: "#a78bfa", dir: { x: 0, y: 1 }, scared: false },
    { r: 8, c: 11, color: "#34d399", dir: { x: 0, y: -1 }, scared: false },
  ];
  return { grid, pr, pc, dir: { x: 1, y: 0 } as Dir, nd: { x: 1, y: 0 } as Dir, dots, pellets, ghosts, score: 0, lives: 3, scared: 0, frame: 0, alive: true };
}

export default function PacMan() {
  const cv = useRef<HTMLCanvasElement>(null);
  const g = useRef(initGame());
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [state, setState] = useState<"idle" | "playing" | "dead" | "win">("idle");
  const raf = useRef(0);

  const draw = useCallback(() => {
    const c = cv.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const s = g.current;
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    s.grid.forEach((row, r) => row.forEach((cell, col) => {
      const x = col * CELL, y = r * CELL;
      if (cell === "#") { ctx.fillStyle = "#1e40af"; ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2); ctx.strokeStyle = "#3b82f6"; ctx.strokeRect(x + 2, y + 2, CELL - 4, CELL - 4); }
      const key = `${r},${col}`;
      if (s.dots.has(key)) {
        ctx.fillStyle = s.pellets.has(key) ? "#fbbf24" : "#fff";
        const sz = s.pellets.has(key) ? 6 : 3;
        ctx.beginPath(); ctx.arc(x + CELL / 2, y + CELL / 2, sz, 0, Math.PI * 2); ctx.fill();
      }
    }));
    // Pac-Man mouth animation
    const mouthAngle = (Math.sin(s.frame * 0.3) + 1) * 0.25;
    const angle = Math.atan2(s.dir.y, s.dir.x);
    ctx.fillStyle = "#facc15";
    ctx.beginPath(); ctx.moveTo(s.pc * CELL + CELL / 2, s.pr * CELL + CELL / 2);
    ctx.arc(s.pc * CELL + CELL / 2, s.pr * CELL + CELL / 2, CELL / 2 - 2, angle + mouthAngle, angle + Math.PI * 2 - mouthAngle); ctx.closePath(); ctx.fill();
    // Ghosts
    s.ghosts.forEach(gh => {
      const gx = gh.c * CELL + CELL / 2, gy = gh.r * CELL + CELL / 2;
      ctx.fillStyle = gh.scared ? "#4f46e5" : gh.color;
      ctx.beginPath(); ctx.arc(gx, gy - 2, CELL / 2 - 2, Math.PI, 0);
      ctx.lineTo(gx + CELL / 2 - 2, gy + CELL / 2 - 2);
      for (let i = 0; i < 3; i++) { ctx.lineTo(gx + CELL / 2 - 2 - i * (CELL - 4) / 3, gy + CELL / 2 - 5); ctx.lineTo(gx + CELL / 2 - 2 - (i + 0.5) * (CELL - 4) / 3, gy + CELL / 2 - 2); }
      ctx.lineTo(gx - CELL / 2 + 2, gy + CELL / 2 - 2); ctx.closePath(); ctx.fill();
      if (!gh.scared) { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(gx - 4, gy - 3, 3, 0, Math.PI * 2); ctx.arc(gx + 4, gy - 3, 3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(gx - 3, gy - 3, 1.5, 0, Math.PI * 2); ctx.arc(gx + 5, gy - 3, 1.5, 0, Math.PI * 2); ctx.fill(); }
    });
  }, []);

  const loop = useCallback((frame: number) => {
    const s = g.current;
    if (!s.alive) { draw(); return; }
    s.frame = frame;
    // Move Pac-Man every 6 frames
    if (frame % 6 === 0) {
      const nr = s.pr + s.nd.y, nc = s.pc + s.nd.x;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && s.grid[nr][nc] !== "#") { s.dir = s.nd; s.pr = nr; s.pc = nc; }
      else { const mr = s.pr + s.dir.y, mc = s.pc + s.dir.x; if (mr >= 0 && mr < ROWS && mc >= 0 && mc < COLS && s.grid[mr][mc] !== "#") { s.pr = mr; s.pc = mc; } }
      const key = `${s.pr},${s.pc}`;
      if (s.dots.has(key)) { s.dots.delete(key); s.score += s.pellets.has(key) ? 50 : 10; s.pellets.delete(key); if (s.pellets.has(key)) { s.scared = 300; s.ghosts.forEach(gh => gh.scared = true); } setScore(s.score); }
      if (s.dots.size === 0) { s.alive = false; setState("win"); draw(); return; }
    }
    if (s.scared > 0) { s.scared--; if (s.scared === 0) s.ghosts.forEach(gh => gh.scared = false); }
    // Move ghosts every 10 frames
    if (frame % 10 === 0) {
      s.ghosts.forEach(gh => {
        const dirs: Dir[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
        const valid = dirs.filter(d => { const nr = gh.r + d.y, nc = gh.c + d.x; return nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && s.grid[nr][nc] !== "#" && !(d.x === -gh.dir.x && d.y === -gh.dir.y); });
        if (!valid.length) return;
        let best = valid[0];
        if (!gh.scared && Math.random() > 0.3) { best = valid.reduce((a, b) => { const da = (a.x + gh.c - s.pc) ** 2 + (a.y + gh.r - s.pr) ** 2; const db = (b.x + gh.c - s.pc) ** 2 + (b.y + gh.r - s.pr) ** 2; return da < db ? a : b; }); }
        else { best = valid[Math.floor(Math.random() * valid.length)]; }
        gh.dir = best; gh.r += best.y; gh.c += best.x;
      });
    }
    // Collision with ghost
    const hit = s.ghosts.some(gh => gh.r === s.pr && gh.c === s.pc);
    if (hit) {
      const scared = s.ghosts.find(gh => gh.scared && gh.r === s.pr && gh.c === s.pc);
      if (scared) { scared.r = 9; scared.c = 10; s.score += 200; setScore(s.score); }
      else { s.lives--; setLives(s.lives); if (s.lives <= 0) { s.alive = false; setState("dead"); draw(); return; } s.pr = 3; s.pc = 1; s.dir = { x: 1, y: 0 }; }
    }
    draw(); raf.current = requestAnimationFrame(() => loop(frame + 1));
  }, [draw]);

  const startGame = useCallback(() => {
    g.current = initGame(); setScore(0); setLives(3); setState("playing");
    cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(() => loop(0));
  }, [loop]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const m: Record<string, Dir> = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 } };
      const nd = m[e.key]; if (nd) { g.current.nd = nd; e.preventDefault(); }
    };
    window.addEventListener("keydown", onKey);
    draw();
    return () => { window.removeEventListener("keydown", onKey); cancelAnimationFrame(raf.current); };
  }, [draw]);

  return (
    <Shell title="Pac-Man" controls="Arrow keys to move">
      <div className="flex gap-8 font-mono text-sm"><span className="text-yellow-400">Score: {score}</span><span className="text-red-400">Lives: {"❤️".repeat(lives)}</span></div>
      <div className="relative">
        <canvas ref={cv} width={W} height={H} className="rounded-lg border border-slate-700" style={{ maxWidth: "95vw" }} />
        {(state === "idle" || state === "dead" || state === "win") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-lg gap-4">
            {state === "win" && <p className="text-2xl font-black text-yellow-400">You Win! 🎉</p>}
            {state === "dead" && <p className="text-2xl font-black text-red-400">Game Over!</p>}
            {state === "idle" && <p className="text-2xl font-black text-yellow-400">PAC-MAN</p>}
            <p className="font-mono text-sm text-muted-foreground">Score: {score}</p>
            <button onClick={startGame} className="px-8 py-2 bg-yellow-400 text-black font-bold rounded-xl">{state === "idle" ? "Start Game" : "Play Again"}</button>
          </div>
        )}
      </div>
    </Shell>
  );
}
