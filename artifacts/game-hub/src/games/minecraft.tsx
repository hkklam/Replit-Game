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

function toScreen(gx: number, gy: number, gz: number) {
  const sx = (gx - gz) * ISO_X + SCREEN_W / 2;
  const sy = (gx + gz) * ISO_Y - gy * ISO_Y * 2 + SCREEN_H / 2;
  return { sx, sy };
}

function initWorld(): Block[][][] {
  const w: Block[][][] = Array.from({ length: GRID_W }, () =>
    Array.from({ length: GRID_H }, () => Array(GRID_D).fill(null))
  );
  // Ground layer
  for (let x = 0; x < GRID_W; x++) for (let z = 0; z < GRID_D; z++) { w[x][0][z] = "grass"; }
  for (let x = 0; x < GRID_W; x++) for (let z = 0; z < GRID_D; z++) for (let y = -3; y < 0; y++) { if (y + 4 >= 1) w[x][y + 4]?.[z] && (w[x][y + 4][z] = y === -1 ? "dirt" : "stone"); }
  return w;
}

export default function Minecraft() {
  const cv = useRef<HTMLCanvasElement>(null);
  const world = useRef<Block[][][]>(initWorld());
  const [selectedBlock, setSelectedBlock] = useState("grass");
  const [mode, setMode] = useState<"place" | "remove">("place");
  const [blockCount, setBlockCount] = useState(0);
  const hov = useRef<{ gx: number; gy: number; gz: number } | null>(null);
  const raf = useRef(0);

  const drawBlock = useCallback((ctx: CanvasRenderingContext2D, gx: number, gy: number, gz: number, type: string, highlighted: boolean) => {
    const { sx, sy } = toScreen(gx, gy, gz);
    const c = BLOCK_COLORS[type] ?? BLOCK_COLORS.stone;
    // Only draw if visible
    if (sx < -ISO_X * 2 || sx > SCREEN_W + ISO_X * 2 || sy < -ISO_Y * 4 || sy > SCREEN_H + ISO_Y * 2) return;
    // Top face
    ctx.beginPath();
    ctx.moveTo(sx, sy - ISO_Y * 2);
    ctx.lineTo(sx + ISO_X, sy - ISO_Y);
    ctx.lineTo(sx, sy);
    ctx.lineTo(sx - ISO_X, sy - ISO_Y);
    ctx.closePath();
    ctx.fillStyle = highlighted ? "#fff" : c.top; ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.15)"; ctx.lineWidth = 0.5; ctx.stroke();
    // Left face
    ctx.beginPath();
    ctx.moveTo(sx - ISO_X, sy - ISO_Y);
    ctx.lineTo(sx, sy);
    ctx.lineTo(sx, sy + ISO_Y * 2);
    ctx.lineTo(sx - ISO_X, sy + ISO_Y);
    ctx.closePath();
    ctx.fillStyle = highlighted ? "#ccc" : c.left; ctx.fill(); ctx.stroke();
    // Right face
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + ISO_X, sy - ISO_Y);
    ctx.lineTo(sx + ISO_X, sy + ISO_Y);
    ctx.lineTo(sx, sy + ISO_Y * 2);
    ctx.closePath();
    ctx.fillStyle = highlighted ? "#aaa" : c.right; ctx.fill(); ctx.stroke();
  }, []);

  const draw = useCallback(() => {
    const c = cv.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#87ceeb";
    const sky = ctx.createLinearGradient(0, 0, 0, SCREEN_H);
    sky.addColorStop(0, "#1e3a5f"); sky.addColorStop(1, "#4a90d9");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    const w = world.current;
    const h = hov.current;
    // Draw back-to-front for proper occlusion
    for (let z = GRID_D - 1; z >= 0; z--) {
      for (let x = GRID_W - 1; x >= 0; x--) {
        for (let y = 0; y < GRID_H; y++) {
          const block = w[x]?.[y]?.[z];
          if (!block) continue;
          // Skip if covered on all visible sides
          const above = w[x]?.[y + 1]?.[z];
          const front = w[x - 1]?.[y]?.[z];
          const right2 = w[x]?.[y]?.[z - 1];
          if (above && front && right2) continue;
          const hl = h ? h.gx === x && h.gy === y && h.gz === z : false;
          drawBlock(ctx, x, y, z, block, hl);
        }
      }
    }
  }, [drawBlock]);

  const screenToGrid = useCallback((sx: number, sy: number): { gx: number; gy: number; gz: number } | null => {
    const w = world.current;
    // Find topmost block near cursor
    for (let y = GRID_H - 1; y >= 0; y--) {
      for (let gx = 0; gx < GRID_W; gx++) {
        for (let gz = 0; gz < GRID_D; gz++) {
          if (!w[gx]?.[y]?.[gz]) continue;
          const { sx: bsx, sy: bsy } = toScreen(gx, y, gz);
          if (Math.abs(sx - bsx) < ISO_X && Math.abs(sy - bsy) < ISO_Y * 2) return { gx, gy: y, gz };
        }
      }
    }
    return null;
  }, []);

  useEffect(() => {
    const c = cv.current;
    const onMove = (e: MouseEvent) => {
      const rect = c?.getBoundingClientRect(); if (!rect) return;
      const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
      hov.current = screenToGrid(sx * (SCREEN_W / rect.width), sy * (SCREEN_H / rect.height));
    };
    const onClick = (e: MouseEvent) => {
      const rect = c?.getBoundingClientRect(); if (!rect) return;
      const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
      const cell = screenToGrid(sx * (SCREEN_W / rect.width), sy * (SCREEN_H / rect.height));
      if (!cell) return;
      const w = world.current;
      if (mode === "remove") { w[cell.gx][cell.gy][cell.gz] = null; }
      else {
        // Place on top of hovered block
        const ny = cell.gy + 1;
        if (ny < GRID_H && !w[cell.gx][ny][cell.gz]) { w[cell.gx][ny][cell.gz] = selectedBlock; }
      }
      setBlockCount(prev => prev + 1);
    };
    c?.addEventListener("mousemove", onMove);
    c?.addEventListener("click", onClick);
    const loop = () => { draw(); raf.current = requestAnimationFrame(loop); };
    raf.current = requestAnimationFrame(loop);
    return () => { c?.removeEventListener("mousemove", onMove); c?.removeEventListener("click", onClick); cancelAnimationFrame(raf.current); };
  }, [draw, screenToGrid, mode, selectedBlock]);

  const reset = () => { world.current = initWorld(); setBlockCount(0); };

  return (
    <Shell title="Minecraft Voxel" controls="Click to place/remove blocks · Select block type below">
      <div className="flex gap-3 flex-wrap justify-center">
        <div className="flex gap-2 items-center">
          <span className="text-xs text-muted-foreground">Mode:</span>
          <button onClick={() => setMode("place")} className={`px-3 py-1 rounded text-xs font-bold ${mode === "place" ? "bg-primary text-black" : "bg-secondary text-foreground"}`}>Place</button>
          <button onClick={() => setMode("remove")} className={`px-3 py-1 rounded text-xs font-bold ${mode === "remove" ? "bg-red-500 text-white" : "bg-secondary text-foreground"}`}>Remove</button>
        </div>
        <div className="flex gap-1.5 flex-wrap justify-center">
          {BLOCK_TYPES.map(bt => (
            <button key={bt} onClick={() => { setSelectedBlock(bt); setMode("place"); }}
              className={`px-2 py-1 rounded text-xs font-semibold border ${selectedBlock === bt && mode === "place" ? "border-primary text-primary" : "border-border text-muted-foreground hover:border-foreground"}`}
              style={{ background: BLOCK_COLORS[bt].top + "33" }}
            >{bt}</button>
          ))}
        </div>
        <button onClick={reset} className="px-3 py-1 rounded text-xs bg-secondary text-foreground">Reset World</button>
      </div>
      <canvas ref={cv} width={SCREEN_W} height={SCREEN_H} className="rounded-xl border border-slate-700 cursor-pointer" style={{ maxWidth: "95vw" }} />
    </Shell>
  );
}
