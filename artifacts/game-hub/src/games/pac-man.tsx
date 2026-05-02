import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

function Shell({ title, controls, children }: { title: string; controls?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-4 px-4 py-3 border-b border-amber-500/30 bg-gradient-to-r from-amber-950/60 to-transparent">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Hub</span>
        </Link>
        <span className="text-2xl select-none" style={{ filter: "drop-shadow(0 0 8px #fbbf2480)" }}>👾</span>
        <h1 className="text-lg font-bold text-amber-400">{title}</h1>
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
type PacState = { r: number; c: number; dir: Dir; nd: Dir; alive: boolean; lives: number; score: number };

function initGame(mode: "1p" | "2p") {
  let p1r = 0, p1c = 0, p2r = 0, p2c = 0;
  const dots = new Set<string>(); const pellets = new Set<string>();
  const grid = MAP_RAW.map((row, r) => row.map((ch, c) => {
    if (ch === "P") { p1r = r; p1c = c; return "."; }
    if (ch === ".") { dots.add(`${r},${c}`); return "."; }
    if (ch === "p") { pellets.add(`${r},${c}`); dots.add(`${r},${c}`); return "."; }
    return ch;
  }));
  // P2 starts at bottom of map in open area
  if (mode === "2p") { p2r = 20; p2c = 10; }
  const ghosts: Ghost[] = [
    { r: 8, c: 9, color: "#f43f5e", dir: { x: 1, y: 0 }, scared: false },
    { r: 11, c: 9, color: "#fb923c", dir: { x: -1, y: 0 }, scared: false },
    { r: 11, c: 11, color: "#a78bfa", dir: { x: 0, y: 1 }, scared: false },
    { r: 8, c: 11, color: "#34d399", dir: { x: 0, y: -1 }, scared: false },
  ];
  const p1: PacState = { r: p1r, c: p1c, dir: { x: 1, y: 0 }, nd: { x: 1, y: 0 }, alive: true, lives: 3, score: 0 };
  const p2: PacState = { r: p2r, c: p2c, dir: { x: -1, y: 0 }, nd: { x: -1, y: 0 }, alive: true, lives: 3, score: 0 };
  return { mode, grid, p1, p2, dots, pellets, ghosts, scared: 0, frame: 0 };
}

export default function PacMan() {
  const cv = useRef<HTMLCanvasElement>(null);
  const g = useRef(initGame("1p"));
  const [screen, setScreen] = useState<"menu" | "game">("menu");
  const [p1Score, setP1Score] = useState(0); const [p2Score, setP2Score] = useState(0);
  const [p1Lives, setP1Lives] = useState(3); const [p2Lives, setP2Lives] = useState(3);
  const [gameState, setGameState] = useState<"idle" | "playing" | "dead" | "win">("idle");
  const [gameMode, setGameMode] = useState<"1p" | "2p">("1p");
  const raf = useRef(0);

  const drawPac = useCallback((ctx: CanvasRenderingContext2D, r: number, c: number, dir: Dir, frame: number, color: string, alive: boolean) => {
    if (!alive) return;
    const mouth = (Math.sin(frame * 0.3) + 1) * 0.25;
    const angle = Math.atan2(dir.y, dir.x);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(c * CELL + CELL / 2, r * CELL + CELL / 2);
    ctx.arc(c * CELL + CELL / 2, r * CELL + CELL / 2, CELL / 2 - 2, angle + mouth, angle + Math.PI * 2 - mouth);
    ctx.closePath(); ctx.fill();
  }, []);

  const draw = useCallback(() => {
    const c = cv.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const s = g.current;
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    s.grid.forEach((row, r) => row.forEach((cell, col) => {
      const x = col * CELL, y = r * CELL;
      if (cell === "#") { ctx.fillStyle = "#1e40af"; ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2); ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 1; ctx.strokeRect(x + 2, y + 2, CELL - 4, CELL - 4); }
      const key = `${r},${col}`;
      if (s.dots.has(key)) { ctx.fillStyle = s.pellets.has(key) ? "#fbbf24" : "#fff"; const sz = s.pellets.has(key) ? 6 : 3; ctx.beginPath(); ctx.arc(x + CELL / 2, y + CELL / 2, sz, 0, Math.PI * 2); ctx.fill(); }
    }));
    drawPac(ctx, s.p1.r, s.p1.c, s.p1.dir, s.frame, "#facc15", s.p1.alive);
    if (s.mode === "2p") drawPac(ctx, s.p2.r, s.p2.c, s.p2.dir, s.frame, "#f472b6", s.p2.alive);
    s.ghosts.forEach(gh => {
      const gx = gh.c * CELL + CELL / 2, gy = gh.r * CELL + CELL / 2;
      ctx.fillStyle = gh.scared ? "#4f46e5" : gh.color;
      ctx.beginPath(); ctx.arc(gx, gy - 2, CELL / 2 - 2, Math.PI, 0);
      ctx.lineTo(gx + CELL / 2 - 2, gy + CELL / 2 - 2);
      for (let i = 0; i < 3; i++) { ctx.lineTo(gx + CELL / 2 - 2 - i * (CELL - 4) / 3, gy + CELL / 2 - 5); ctx.lineTo(gx + CELL / 2 - 2 - (i + 0.5) * (CELL - 4) / 3, gy + CELL / 2 - 2); }
      ctx.lineTo(gx - CELL / 2 + 2, gy + CELL / 2 - 2); ctx.closePath(); ctx.fill();
      if (!gh.scared) { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(gx - 4, gy - 3, 3, 0, Math.PI * 2); ctx.arc(gx + 4, gy - 3, 3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(gx - 3, gy - 3, 1.5, 0, Math.PI * 2); ctx.arc(gx + 5, gy - 3, 1.5, 0, Math.PI * 2); ctx.fill(); }
    });
  }, [drawPac]);

  const loop = useCallback((frame: number) => {
    const s = g.current;
    s.frame = frame;
    const movePac = (pac: PacState) => {
      if (!pac.alive) return;
      if (frame % 6 === 0) {
        const nr = pac.r + pac.nd.y, nc = pac.c + pac.nd.x;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && s.grid[nr][nc] !== "#") { pac.dir = pac.nd; pac.r = nr; pac.c = nc; }
        else { const mr = pac.r + pac.dir.y, mc = pac.c + pac.dir.x; if (mr >= 0 && mr < ROWS && mc >= 0 && mc < COLS && s.grid[mr][mc] !== "#") { pac.r = mr; pac.c = mc; } }
        const key = `${pac.r},${pac.c}`;
        if (s.dots.has(key)) {
          s.dots.delete(key); pac.score += s.pellets.has(key) ? 50 : 10;
          if (s.pellets.has(key)) { s.scared = 300; s.ghosts.forEach(gh => gh.scared = true); }
          s.pellets.delete(key);
          setP1Score(s.p1.score); setP2Score(s.p2.score);
        }
      }
    };
    movePac(s.p1); if (s.mode === "2p") movePac(s.p2);
    if (s.dots.size === 0) { setGameState("win"); draw(); return; }
    if (s.scared > 0) { s.scared--; if (s.scared === 0) s.ghosts.forEach(gh => gh.scared = false); }
    if (frame % 10 === 0) {
      s.ghosts.forEach(gh => {
        const dirs: Dir[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
        const valid = dirs.filter(d => { const nr = gh.r + d.y, nc = gh.c + d.x; return nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && s.grid[nr][nc] !== "#" && !(d.x === -gh.dir.x && d.y === -gh.dir.y); });
        if (!valid.length) return;
        const target = s.mode === "2p" && Math.random() > 0.5 ? s.p2 : s.p1;
        const best = gh.scared ? valid[Math.floor(Math.random() * valid.length)] : (Math.random() > 0.3 ? valid.reduce((a, b) => { const da = (a.x + gh.c - target.c) ** 2 + (a.y + gh.r - target.r) ** 2; const db = (b.x + gh.c - target.c) ** 2 + (b.y + gh.r - target.r) ** 2; return da < db ? a : b; }) : valid[Math.floor(Math.random() * valid.length)]);
        gh.dir = best; gh.r += best.y; gh.c += best.x;
      });
    }
    const checkHit = (pac: PacState) => {
      if (!pac.alive) return;
      const hit = s.ghosts.some(gh => gh.r === pac.r && gh.c === pac.c);
      if (hit) {
        const scared = s.ghosts.find(gh => gh.scared && gh.r === pac.r && gh.c === pac.c);
        if (scared) { scared.r = 9; scared.c = 10; pac.score += 200; setP1Score(s.p1.score); setP2Score(s.p2.score); }
        else { pac.lives--; setP1Lives(s.p1.lives); setP2Lives(s.p2.lives); if (pac.lives <= 0) { pac.alive = false; } pac.r = pac === s.p1 ? 3 : 20; pac.c = pac === s.p1 ? 1 : 10; pac.dir = { x: 1, y: 0 }; }
      }
    };
    checkHit(s.p1); if (s.mode === "2p") checkHit(s.p2);
    const allDead = !s.p1.alive && (s.mode === "1p" || !s.p2.alive);
    if (allDead) { setGameState("dead"); draw(); return; }
    draw(); raf.current = requestAnimationFrame(() => loop(frame + 1));
  }, [draw]);

  const startGame = useCallback((m: "1p" | "2p") => {
    g.current = initGame(m); setGameMode(m); setP1Score(0); setP2Score(0); setP1Lives(3); setP2Lives(3); setGameState("playing");
    cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(() => loop(0));
  }, [loop]);

  useEffect(() => {
    if (screen !== "game") return;
    const onKey = (e: KeyboardEvent) => {
      const m1: Record<string, Dir> = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 } };
      const m2: Record<string, Dir> = { w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 } };
      const nd1 = m1[e.key]; if (nd1) { g.current.p1.nd = nd1; e.preventDefault(); }
      const nd2 = m2[e.key]; if (nd2) { g.current.p2.nd = nd2; e.preventDefault(); }
    };
    window.addEventListener("keydown", onKey); draw();
    return () => { window.removeEventListener("keydown", onKey); cancelAnimationFrame(raf.current); };
  }, [screen, draw]);

  const winner2p = gameMode === "2p" ? (p1Score > p2Score ? "🟡 P1 Wins!" : p2Score > p1Score ? "🩷 P2 Wins!" : "🤝 Tie!") : null;

  if (screen === "menu") return (
    <Shell title="Pac-Man" controls="">
      <div className="flex flex-col items-center gap-8 text-center max-w-sm">
        <div className="text-6xl select-none">👾</div>
        <h2 className="text-2xl font-black text-amber-400">Select Mode</h2>
        <div className="flex gap-4 w-full">
          <button onClick={() => { setScreen("game"); startGame("1p"); }} className="flex-1 py-4 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-400 font-black rounded-2xl transition-colors">
            👤<br /><span className="text-sm font-semibold">1 Player</span><br /><span className="text-xs font-normal text-muted-foreground">Arrow keys</span>
          </button>
          <button onClick={() => { setScreen("game"); startGame("2p"); }} className="flex-1 py-4 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/50 text-pink-400 font-black rounded-2xl transition-colors">
            👥<br /><span className="text-sm font-semibold">2 Players</span><br /><span className="text-xs font-normal text-muted-foreground">P1: Arrows · P2: WASD</span>
          </button>
        </div>
      </div>
    </Shell>
  );

  return (
    <Shell title="Pac-Man" controls={gameMode === "2p" ? "🟡 P1: Arrows · 🩷 P2: WASD" : "Arrow keys to move"}>
      <div className="flex gap-6 font-mono text-sm">
        <span className="text-yellow-400">🟡 P1: {p1Score} {"❤️".repeat(Math.max(0, p1Lives))}</span>
        {gameMode === "2p" && <span className="text-pink-400">🩷 P2: {p2Score} {"❤️".repeat(Math.max(0, p2Lives))}</span>}
      </div>
      <div className="relative">
        <canvas ref={cv} width={W} height={H} className="rounded-lg border border-slate-700" style={{ maxWidth: "95vw" }} />
        {(gameState === "dead" || gameState === "win") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-lg gap-4">
            {gameState === "win" && <p className="text-2xl font-black text-yellow-400">{winner2p ?? "You Win! 🎉"}</p>}
            {gameState === "dead" && <p className="text-2xl font-black text-red-400">{winner2p ?? "Game Over!"}</p>}
            <p className="font-mono text-sm text-muted-foreground">{gameMode === "2p" ? `P1: ${p1Score} · P2: ${p2Score}` : `Score: ${p1Score}`}</p>
            <div className="flex gap-3">
              <button onClick={() => startGame(gameMode)} className="px-8 py-2 bg-yellow-400 text-black font-bold rounded-xl">Play Again</button>
              <button onClick={() => setScreen("menu")} className="px-6 py-2 bg-secondary text-foreground font-bold rounded-xl">Menu</button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
