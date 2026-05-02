import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-4 px-4 py-3 border-b border-amber-500/30 bg-gradient-to-r from-amber-950/60 to-transparent">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Hub</span>
        </Link>
        <span className="text-2xl select-none" style={{ filter: "drop-shadow(0 0 8px #fbbf2480)" }}>👾</span>
        <h1 className="text-lg font-bold text-amber-400">{title}</h1>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-2 gap-2">{children}</div>
    </div>
  );
}

const CELL = 22;
const COLS = 20;
const ROWS = 22;
const W = COLS * CELL;
const H = ROWS * CELL;

type MapConfig = { raw: string[]; ghosts: [number, number][]; name: string };

const MAPS: MapConfig[] = [
  {
    name: "Classic", ghosts: [[8,8],[8,9],[11,10],[11,11]],
    raw: [
      "####################","#p.......#.......p.#","#.######.#.######..#","#P.................#",
      "#.######.#.######..#","#..................#","#.##.#...#...#.##..#","####.###   ###.#####",
      "#####.# GG   #.#####","#####.# #### #.#####","#####.#      #.#####","#####.#   GG #.#####",
      "#####.# #### #.#####","#####.#      #.#####","####.###   ###.#####","#.##.#...#...#.##..#",
      "#..................#","#.######.#.######..#","#...............p..#","##.###.###.###.###.#",
      "#p.................#","####################",
    ],
  },
  {
    name: "Corridors", ghosts: [[8,8],[8,9],[11,10],[11,11]],
    raw: [
      "####################","#p.....#.....#....p#","#.#####.....#####..#","#P.................#",
      "#..#####.....#####.#","#..................#","#.####.#...#.####..#","####.###   ###.#####",
      "#####.# GG   #.#####","#####.# #### #.#####","#####.#      #.#####","#####.#   GG #.#####",
      "#####.# #### #.#####","#####.#      #.#####","####.###   ###.#####","#.####.#...#.####..#",
      "#..................#","#..#####.....#####.#","#p.................#","#.#####.....#####..#",
      "#.....#.....#......#","####################",
    ],
  },
  {
    name: "Grid", ghosts: [[8,8],[8,9],[11,10],[11,11]],
    raw: [
      "####################","#p.#...#...#...#.p.#","#.##.##.#.#.##.##..#","#P.................#",
      "#.##.##.#.#.##.##..#","#..................#","#.#.#....##.#.#.#..#","####.###   ###.#####",
      "#####.# GG   #.#####","#####.# #### #.#####","#####.#      #.#####","#####.#   GG #.#####",
      "#####.# #### #.#####","#####.#      #.#####","####.###   ###.#####","#.#.#....##.#.#.#..#",
      "#..................#","#.##.##.#.#.##.##..#","#.#...........#...p#","#.##.##.#.#.##.##..#",
      "#p.#...#...#...#...#","####################",
    ],
  },
  {
    name: "Open", ghosts: [[8,8],[8,9],[11,10],[11,11]],
    raw: [
      "####################","#p.................#","#..##.......##.....#","#P.................#",
      "#..............##..#","#..................#","#....#.#...#.#.....#","####.###   ###.#####",
      "#####.# GG   #.#####","#####.# #### #.#####","#####.#      #.#####","#####.#   GG #.#####",
      "#####.# #### #.#####","#####.#      #.#####","####.###   ###.#####","#....#.#...#.#.....#",
      "#..................#","#..............##..#","#...p..........p...#","#..##.......##.....#",
      "#..................#","####################",
    ],
  },
  {
    name: "Channels", ghosts: [[8,8],[8,9],[11,10],[11,11]],
    raw: [
      "####################","#p..#.....#.....#p.#","#.###.###.###.###..#","#P..#.....#.....#..#",
      "#...#.###.###.#....#","#..........#.......#","#.##.....#.....##..#","####.###   ###.#####",
      "#####.# GG   #.#####","#####.# #### #.#####","#####.#      #.#####","#####.#   GG #.#####",
      "#####.# #### #.#####","#####.#      #.#####","####.###   ###.#####","#.##.....#.....##..#",
      "#..........#.......#","#...#.###.###.#....#","#p..#.....#.....#p.#","#.###.###.###.###..#",
      "#..................#","####################",
    ],
  },
];

type Dir = { x: number; y: number };
type Ghost = { r: number; c: number; color: string; dir: Dir; scared: boolean };
type PacState = { r: number; c: number; dir: Dir; nd: Dir; alive: boolean; lives: number; score: number };

function initGame(mode: "1p" | "2p", mapIdx: number) {
  const cfg = MAPS[mapIdx % MAPS.length];
  let p1r = 0, p1c = 0;
  const dots = new Set<string>(); const pellets = new Set<string>();
  const grid = cfg.raw.map((row, r) => row.split("").map((ch, c) => {
    if (ch === "P") { p1r = r; p1c = c; return "."; }
    if (ch === ".") { dots.add(`${r},${c}`); return "."; }
    if (ch === "p") { pellets.add(`${r},${c}`); dots.add(`${r},${c}`); return "."; }
    return ch;
  }));
  const ghostColors = ["#f43f5e", "#fb923c", "#a78bfa", "#34d399"];
  const ghosts: Ghost[] = cfg.ghosts.map(([gr, gc], i) => ({ r: gr, c: gc, color: ghostColors[i % ghostColors.length], dir: { x: i % 2 === 0 ? 1 : -1, y: 0 }, scared: false }));
  const p1: PacState = { r: p1r, c: p1c, dir: { x: 1, y: 0 }, nd: { x: 1, y: 0 }, alive: true, lives: 3, score: 0 };
  const p2: PacState = { r: 20, c: 10, dir: { x: -1, y: 0 }, nd: { x: -1, y: 0 }, alive: true, lives: 3, score: 0 };
  return { mode, grid, p1, p2, dots, pellets, ghosts, scared: 0, frame: 0, mapName: cfg.name };
}

// D-pad button component
function DPadBtn({ label, onStart, onEnd, className }: { label: string; onStart: () => void; onEnd: () => void; className?: string }) {
  return (
    <button
      className={`flex items-center justify-center w-14 h-14 bg-slate-700/80 active:bg-slate-500/80 rounded-xl text-2xl select-none touch-manipulation border border-slate-600 ${className ?? ""}`}
      onPointerDown={e => { e.preventDefault(); onStart(); }}
      onPointerUp={onEnd}
      onPointerLeave={onEnd}
    >
      {label}
    </button>
  );
}

export default function PacMan() {
  const cv = useRef<HTMLCanvasElement>(null);
  const g = useRef(initGame("1p", 0));
  const mapIdxRef = useRef(0);
  const [screen, setScreen] = useState<"menu" | "game">("menu");
  const [p1Score, setP1Score] = useState(0); const [p2Score, setP2Score] = useState(0);
  const [p1Lives, setP1Lives] = useState(3); const [p2Lives, setP2Lives] = useState(3);
  const [gameState, setGameState] = useState<"idle" | "playing" | "dead" | "win">("idle");
  const [gameMode, setGameMode] = useState<"1p" | "2p">("1p");
  const [mapName, setMapName] = useState("Classic");
  const raf = useRef(0);
  // Swipe tracking
  const swipeRef = useRef<{ x: number; y: number } | null>(null);

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
    const s = g.current; s.frame = frame;
    const movePac = (pac: PacState) => {
      if (!pac.alive) return;
      if (frame % 12 === 0) {
        const nr = pac.r + pac.nd.y, nc = pac.c + pac.nd.x;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && s.grid[nr]?.[nc] !== "#") { pac.dir = pac.nd; pac.r = nr; pac.c = nc; }
        else { const mr = pac.r + pac.dir.y, mc = pac.c + pac.dir.x; if (mr >= 0 && mr < ROWS && mc >= 0 && mc < COLS && s.grid[mr]?.[mc] !== "#") { pac.r = mr; pac.c = mc; } }
        const key = `${pac.r},${pac.c}`;
        if (s.dots.has(key)) {
          s.dots.delete(key); pac.score += s.pellets.has(key) ? 50 : 10;
          if (s.pellets.has(key)) { s.scared = 300; s.ghosts.forEach(gh => gh.scared = true); }
          s.pellets.delete(key); setP1Score(s.p1.score); setP2Score(s.p2.score);
        }
      }
    };
    movePac(s.p1); if (s.mode === "2p") movePac(s.p2);
    if (s.dots.size === 0) { setGameState("win"); draw(); return; }
    if (s.scared > 0) { s.scared--; if (s.scared === 0) s.ghosts.forEach(gh => gh.scared = false); }
    if (frame % 20 === 0) {
      s.ghosts.forEach(gh => {
        const dirs: Dir[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
        const valid = dirs.filter(d => { const nr = gh.r + d.y, nc = gh.c + d.x; return nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && s.grid[nr]?.[nc] !== "#" && !(d.x === -gh.dir.x && d.y === -gh.dir.y); });
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
        if (scared) { scared.r = 10; scared.c = 9; pac.score += 200; setP1Score(s.p1.score); setP2Score(s.p2.score); }
        else { pac.lives--; setP1Lives(s.p1.lives); setP2Lives(s.p2.lives); if (pac.lives <= 0) pac.alive = false; pac.r = pac === s.p1 ? 3 : 20; pac.c = pac === s.p1 ? 1 : 10; pac.dir = { x: 1, y: 0 }; }
      }
    };
    checkHit(s.p1); if (s.mode === "2p") checkHit(s.p2);
    const allDead = !s.p1.alive && (s.mode === "1p" || !s.p2.alive);
    if (allDead) { setGameState("dead"); draw(); return; }
    draw(); raf.current = requestAnimationFrame(() => loop(frame + 1));
  }, [draw]);

  const startGame = useCallback((m: "1p" | "2p") => {
    const idx = mapIdxRef.current; mapIdxRef.current = (idx + 1) % MAPS.length;
    g.current = initGame(m, idx);
    setMapName(MAPS[idx % MAPS.length].name);
    setGameMode(m); setP1Score(0); setP2Score(0); setP1Lives(3); setP2Lives(3); setGameState("playing");
    cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(() => loop(0));
  }, [loop]);

  const setDir = useCallback((dir: Dir, player: 1 | 2 = 1) => {
    if (player === 1) g.current.p1.nd = dir;
    else g.current.p2.nd = dir;
  }, []);

  useEffect(() => {
    if (screen !== "game") return;
    const onKey = (e: KeyboardEvent) => {
      const m1: Record<string, Dir> = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 } };
      const m2: Record<string, Dir> = { w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 } };
      const nd1 = m1[e.key]; if (nd1) { g.current.p1.nd = nd1; e.preventDefault(); }
      const nd2 = m2[e.key]; if (nd2) { g.current.p2.nd = nd2; e.preventDefault(); }
    };

    // Swipe detection on canvas
    const cvEl = cv.current;
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0]; swipeRef.current = { x: t.clientX, y: t.clientY };
    };
    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (!swipeRef.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - swipeRef.current.x, dy = t.clientY - swipeRef.current.y;
      swipeRef.current = null;
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 });
      else setDir(dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });
    };

    window.addEventListener("keydown", onKey);
    cvEl?.addEventListener("touchstart", onTouchStart, { passive: false });
    cvEl?.addEventListener("touchend", onTouchEnd, { passive: false });
    draw();
    return () => {
      window.removeEventListener("keydown", onKey);
      cvEl?.removeEventListener("touchstart", onTouchStart);
      cvEl?.removeEventListener("touchend", onTouchEnd);
      cancelAnimationFrame(raf.current);
    };
  }, [screen, draw, setDir]);

  const winner2p = gameMode === "2p" ? (p1Score > p2Score ? "🟡 P1 Wins!" : p2Score > p1Score ? "🩷 P2 Wins!" : "🤝 Tie!") : null;

  if (screen === "menu") return (
    <Shell title="Pac-Man">
      <div className="flex flex-col items-center gap-8 text-center max-w-sm">
        <div className="text-6xl select-none">👾</div>
        <h2 className="text-2xl font-black text-amber-400">Select Mode</h2>
        <p className="text-xs text-muted-foreground -mt-4">5 rotating maps · Swipe or D-pad on mobile</p>
        <div className="flex gap-4 w-full">
          <button onClick={() => { setScreen("game"); startGame("1p"); }} className="flex-1 py-4 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-400 font-black rounded-2xl transition-colors touch-manipulation">
            👤<br /><span className="text-sm font-semibold">1 Player</span><br /><span className="text-xs font-normal text-muted-foreground">Arrows / Swipe</span>
          </button>
          <button onClick={() => { setScreen("game"); startGame("2p"); }} className="flex-1 py-4 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/50 text-pink-400 font-black rounded-2xl transition-colors touch-manipulation">
            👥<br /><span className="text-sm font-semibold">2 Players</span><br /><span className="text-xs font-normal text-muted-foreground">P1: Arrows · P2: WASD</span>
          </button>
        </div>
      </div>
    </Shell>
  );

  return (
    <Shell title={`Pac-Man · ${mapName}`}>
      <div className="flex gap-4 font-mono text-sm">
        <span className="text-yellow-400">🟡 P1: {p1Score} {"❤️".repeat(Math.max(0, p1Lives))}</span>
        {gameMode === "2p" && <span className="text-pink-400">🩷 P2: {p2Score} {"❤️".repeat(Math.max(0, p2Lives))}</span>}
      </div>
      <div className="relative w-full flex justify-center">
        <canvas ref={cv} width={W} height={H} className="rounded-lg border border-slate-700 touch-none" style={{ width: "100%", maxWidth: W, height: "auto" }} />
        {(gameState === "dead" || gameState === "win") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-lg gap-4">
            {gameState === "win" && <p className="text-2xl font-black text-yellow-400">{winner2p ?? "You Win! 🎉"}</p>}
            {gameState === "dead" && <p className="text-2xl font-black text-red-400">{winner2p ?? "Game Over!"}</p>}
            <p className="font-mono text-sm text-muted-foreground">{gameMode === "2p" ? `P1: ${p1Score} · P2: ${p2Score}` : `Score: ${p1Score}`}</p>
            <p className="text-xs text-muted-foreground">Next map on restart</p>
            <div className="flex gap-3">
              <button onClick={() => startGame(gameMode)} className="px-8 py-3 bg-yellow-400 text-black font-bold rounded-xl touch-manipulation">Play Again</button>
              <button onClick={() => setScreen("menu")} className="px-6 py-3 bg-secondary text-foreground font-bold rounded-xl touch-manipulation">Menu</button>
            </div>
          </div>
        )}
      </div>
      {/* On-screen D-pad for mobile (1p only, shown below canvas) */}
      {gameMode === "1p" && (
        <div className="flex flex-col items-center gap-1 sm:hidden select-none mt-1">
          <DPadBtn label="▲" onStart={() => setDir({ x: 0, y: -1 })} onEnd={() => {}} />
          <div className="flex gap-1">
            <DPadBtn label="◀" onStart={() => setDir({ x: -1, y: 0 })} onEnd={() => {}} />
            <div className="w-14 h-14" />
            <DPadBtn label="▶" onStart={() => setDir({ x: 1, y: 0 })} onEnd={() => {}} />
          </div>
          <DPadBtn label="▼" onStart={() => setDir({ x: 0, y: 1 })} onEnd={() => {}} />
        </div>
      )}
      <p className="text-xs text-muted-foreground text-center sm:hidden">Swipe the board or use the D-pad</p>
      <p className="text-xs text-muted-foreground text-center hidden sm:block">{gameMode === "2p" ? "🟡 P1: Arrows · 🩷 P2: WASD" : "Arrow keys to move"}</p>
    </Shell>
  );
}
