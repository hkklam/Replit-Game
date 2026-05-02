import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

function Shell({ title, controls, children }: { title: string; controls?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-4 px-4 py-3 border-b border-green-500/30 bg-gradient-to-r from-green-950/60 to-transparent">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Hub</span>
        </Link>
        <span className="text-2xl select-none" style={{ filter: "drop-shadow(0 0 8px #4ade8080)" }}>⛏️</span>
        <h1 className="text-lg font-bold text-green-400">{title}</h1>
        {controls && <span className="text-xs text-muted-foreground ml-auto hidden sm:block">{controls}</span>}
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">{children}</div>
    </div>
  );
}

const GRID_W = 20; const GRID_H = 15; const GRID_D = 20;
const ISO_X = 26; const ISO_Y = 13; const SCREEN_W = 800; const SCREEN_H = 520;

type Block = string | null;

const BLOCK_COLORS: Record<string, { top: string; left: string; right: string }> = {
  grass:  { top: "#4ade80", left: "#166534", right: "#15803d" },
  dirt:   { top: "#92400e", left: "#451a03", right: "#78350f" },
  stone:  { top: "#9ca3af", left: "#374151", right: "#4b5563" },
  wood:   { top: "#854d0e", left: "#431407", right: "#713f12" },
  water:  { top: "#38bdf8", left: "#0369a1", right: "#0284c7" },
  sand:   { top: "#fde68a", left: "#92400e", right: "#b45309" },
  leaves: { top: "#86efac", left: "#14532d", right: "#166534" },
  snow:   { top: "#f1f5f9", left: "#94a3b8", right: "#cbd5e1" },
};
const BLOCK_TYPES = Object.keys(BLOCK_COLORS);

// P1 and P2 can each select their own block type and mode
type PlayerConfig = { block: string; mode: "place" | "remove" };

function toScreen(gx: number, gy: number, gz: number) {
  return { sx: (gx - gz) * ISO_X + SCREEN_W / 2, sy: (gx + gz) * ISO_Y - gy * ISO_Y * 2 + SCREEN_H / 2 };
}

function initWorld(): Block[][][] {
  const w: Block[][][] = Array.from({ length: GRID_W }, () => Array.from({ length: GRID_H }, () => Array(GRID_D).fill(null)));
  for (let x = 0; x < GRID_W; x++) for (let z = 0; z < GRID_D; z++) { w[x][0][z] = "grass"; }
  for (let x = 0; x < GRID_W; x++) for (let z = 0; z < GRID_D; z++) for (let y = -3; y < 0; y++) { if (y + 4 >= 1) w[x][y + 4]?.[z] && (w[x][y + 4][z] = y === -1 ? "dirt" : "stone"); }
  return w;
}

export default function Minecraft() {
  const cv = useRef<HTMLCanvasElement>(null);
  const world = useRef<Block[][][]>(initWorld());
  const [p1, setP1] = useState<PlayerConfig>({ block: "grass", mode: "place" });
  const [p2, setP2] = useState<PlayerConfig>({ block: "stone", mode: "place" });
  const [blockCount, setBlockCount] = useState(0);
  const hov = useRef<{ gx: number; gy: number; gz: number } | null>(null);
  const raf = useRef(0);
  // Track last action for co-op info
  const [lastActor, setLastActor] = useState<1 | 2>(1);

  const drawBlock = useCallback((ctx: CanvasRenderingContext2D, gx: number, gy: number, gz: number, type: string, highlighted: boolean) => {
    const { sx, sy } = toScreen(gx, gy, gz);
    const c = BLOCK_COLORS[type] ?? BLOCK_COLORS.stone;
    if (sx < -ISO_X * 2 || sx > SCREEN_W + ISO_X * 2 || sy < -ISO_Y * 4 || sy > SCREEN_H + ISO_Y * 2) return;
    ctx.beginPath(); ctx.moveTo(sx, sy - ISO_Y * 2); ctx.lineTo(sx + ISO_X, sy - ISO_Y); ctx.lineTo(sx, sy); ctx.lineTo(sx - ISO_X, sy - ISO_Y); ctx.closePath();
    ctx.fillStyle = highlighted ? "#fff" : c.top; ctx.fill(); ctx.strokeStyle = "rgba(0,0,0,0.15)"; ctx.lineWidth = 0.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx - ISO_X, sy - ISO_Y); ctx.lineTo(sx, sy); ctx.lineTo(sx, sy + ISO_Y * 2); ctx.lineTo(sx - ISO_X, sy + ISO_Y); ctx.closePath();
    ctx.fillStyle = highlighted ? "#ccc" : c.left; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + ISO_X, sy - ISO_Y); ctx.lineTo(sx + ISO_X, sy + ISO_Y); ctx.lineTo(sx, sy + ISO_Y * 2); ctx.closePath();
    ctx.fillStyle = highlighted ? "#aaa" : c.right; ctx.fill(); ctx.stroke();
  }, []);

  const draw = useCallback(() => {
    const c = cv.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const sky = ctx.createLinearGradient(0, 0, 0, SCREEN_H);
    sky.addColorStop(0, "#1e3a5f"); sky.addColorStop(1, "#4a90d9");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    const w = world.current; const h = hov.current;
    for (let z = GRID_D - 1; z >= 0; z--) for (let x = GRID_W - 1; x >= 0; x--) for (let y = 0; y < GRID_H; y++) {
      const block = w[x]?.[y]?.[z]; if (!block) continue;
      if (w[x]?.[y + 1]?.[z] && w[x - 1]?.[y]?.[z] && w[x]?.[y]?.[z - 1]) continue;
      const hl = h ? h.gx === x && h.gy === y && h.gz === z : false;
      drawBlock(ctx, x, y, z, block, hl);
    }
  }, [drawBlock]);

  const screenToGrid = useCallback((sx: number, sy: number) => {
    const w = world.current;
    for (let y = GRID_H - 1; y >= 0; y--) for (let gx = 0; gx < GRID_W; gx++) for (let gz = 0; gz < GRID_D; gz++) {
      if (!w[gx]?.[y]?.[gz]) continue;
      const { sx: bsx, sy: bsy } = toScreen(gx, y, gz);
      if (Math.abs(sx - bsx) < ISO_X && Math.abs(sy - bsy) < ISO_Y * 2) return { gx, gy: y, gz };
    }
    return null;
  }, []);

  const handleAction = useCallback((sx: number, sy: number, player: 1 | 2) => {
    const cell = screenToGrid(sx, sy); if (!cell) return;
    const cfg = player === 1 ? p1 : p2;
    const w = world.current;
    if (cfg.mode === "remove") { w[cell.gx][cell.gy][cell.gz] = null; }
    else { const ny = cell.gy + 1; if (ny < GRID_H && !w[cell.gx][ny][cell.gz]) w[cell.gx][ny][cell.gz] = cfg.block; }
    setBlockCount(prev => prev + 1); setLastActor(player);
  }, [p1, p2, screenToGrid]);

  useEffect(() => {
    const c = cv.current;
    const onMove = (e: MouseEvent) => {
      const rect = c?.getBoundingClientRect(); if (!rect) return;
      hov.current = screenToGrid((e.clientX - rect.left) * (SCREEN_W / rect.width), (e.clientY - rect.top) * (SCREEN_H / rect.height));
    };
    const onClick = (e: MouseEvent) => {
      const rect = c?.getBoundingClientRect(); if (!rect) return;
      handleAction((e.clientX - rect.left) * (SCREEN_W / rect.width), (e.clientY - rect.top) * (SCREEN_H / rect.height), 1);
    };
    // P2 uses keyboard shortcut: press Q over hovered cell
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "q" || e.key === "Q") && hov.current) {
        const { sx, sy } = toScreen(hov.current.gx, hov.current.gy, hov.current.gz);
        handleAction(sx, sy, 2); e.preventDefault();
      }
    };
    c?.addEventListener("mousemove", onMove); c?.addEventListener("click", onClick);
    window.addEventListener("keydown", onKey);
    const loop = () => { draw(); raf.current = requestAnimationFrame(loop); };
    raf.current = requestAnimationFrame(loop);
    return () => { c?.removeEventListener("mousemove", onMove); c?.removeEventListener("click", onClick); window.removeEventListener("keydown", onKey); cancelAnimationFrame(raf.current); };
  }, [draw, screenToGrid, handleAction]);

  return (
    <Shell title="Minecraft Voxel" controls="Co-op · P1: Click · P2: Hover + Q">
      <div className="flex gap-4 items-start flex-wrap justify-center">
        {/* P1 controls */}
        <div className="flex flex-col gap-1.5 items-center">
          <span className="text-xs font-bold text-blue-400">🔵 P1 (Click)</span>
          <div className="flex gap-1">
            <button onClick={() => setP1(p => ({ ...p, mode: "place" }))} className={`px-2 py-1 rounded text-xs font-bold ${p1.mode === "place" ? "bg-blue-600 text-white" : "bg-secondary text-foreground"}`}>Place</button>
            <button onClick={() => setP1(p => ({ ...p, mode: "remove" }))} className={`px-2 py-1 rounded text-xs font-bold ${p1.mode === "remove" ? "bg-red-600 text-white" : "bg-secondary text-foreground"}`}>Remove</button>
          </div>
          <div className="flex gap-1 flex-wrap justify-center max-w-[180px]">
            {BLOCK_TYPES.map(bt => (
              <button key={bt} onClick={() => setP1({ block: bt, mode: "place" })}
                className={`px-1.5 py-0.5 rounded text-xs border ${p1.block === bt && p1.mode === "place" ? "border-blue-400 text-blue-300" : "border-border text-muted-foreground hover:border-foreground"}`}
                style={{ background: BLOCK_COLORS[bt].top + "33" }}>{bt}</button>
            ))}
          </div>
        </div>
        {/* P2 controls */}
        <div className="flex flex-col gap-1.5 items-center">
          <span className="text-xs font-bold text-violet-400">🟣 P2 (Hover + Q)</span>
          <div className="flex gap-1">
            <button onClick={() => setP2(p => ({ ...p, mode: "place" }))} className={`px-2 py-1 rounded text-xs font-bold ${p2.mode === "place" ? "bg-violet-600 text-white" : "bg-secondary text-foreground"}`}>Place</button>
            <button onClick={() => setP2(p => ({ ...p, mode: "remove" }))} className={`px-2 py-1 rounded text-xs font-bold ${p2.mode === "remove" ? "bg-red-600 text-white" : "bg-secondary text-foreground"}`}>Remove</button>
          </div>
          <div className="flex gap-1 flex-wrap justify-center max-w-[180px]">
            {BLOCK_TYPES.map(bt => (
              <button key={bt} onClick={() => setP2({ block: bt, mode: "place" })}
                className={`px-1.5 py-0.5 rounded text-xs border ${p2.block === bt && p2.mode === "place" ? "border-violet-400 text-violet-300" : "border-border text-muted-foreground hover:border-foreground"}`}
                style={{ background: BLOCK_COLORS[bt].top + "33" }}>{bt}</button>
            ))}
          </div>
        </div>
        <button onClick={() => { world.current = initWorld(); setBlockCount(0); }} className="px-3 py-1 rounded text-xs bg-secondary text-foreground self-start mt-5">Reset World</button>
      </div>
      <div className="text-xs text-muted-foreground">Last action: {lastActor === 1 ? "🔵 P1" : "🟣 P2"} · Total blocks placed: {blockCount}</div>
      <canvas ref={cv} width={SCREEN_W} height={SCREEN_H} className="rounded-xl border border-slate-700 cursor-pointer" style={{ maxWidth: "95vw" }} />
    </Shell>
  );
}
