import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";

// ─── COLORS ───────────────────────────────────────────────────────────────────
const PAL: Record<string, string> = {
  red:    "#E63946",
  blue:   "#2176AE",
  green:  "#27AE60",
  yellow: "#F4A523",
  orange: "#F4631E",
  pink:   "#D966A0",
  maroon: "#8B2020",
  sky:    "#4EB8CE",
  lime:   "#5DC05D",
  purple: "#8B5CF6",
};

// ─── LEVEL DATA ───────────────────────────────────────────────────────────────
interface Dot { r: number; c: number; color: string; }
interface Level { size: number; dots: Dot[]; }

const LEVELS: Level[] = [
  // ── 5×5 ──────────────────────────────────────────────────────────────────────
  { size:5, dots:[{r:0,c:0,color:"red"},{r:4,c:2,color:"red"},
    {r:1,c:0,color:"blue"},{r:4,c:1,color:"blue"},
    {r:3,c:1,color:"green"},{r:3,c:3,color:"green"}] },

  { size:5, dots:[{r:0,c:0,color:"red"},{r:4,c:3,color:"red"},
    {r:0,c:4,color:"blue"},{r:3,c:2,color:"blue"},
    {r:1,c:2,color:"green"},{r:4,c:4,color:"green"},
    {r:2,c:2,color:"yellow"},{r:3,c:3,color:"yellow"}] },

  { size:5, dots:[{r:0,c:0,color:"red"},{r:1,c:2,color:"red"},
    {r:1,c:0,color:"blue"},{r:4,c:1,color:"blue"},
    {r:2,c:2,color:"green"},{r:4,c:2,color:"green"},
    {r:3,c:1,color:"yellow"},{r:3,c:3,color:"yellow"}] },

  { size:5, dots:[{r:0,c:0,color:"red"},{r:0,c:2,color:"red"},
    {r:0,c:3,color:"blue"},{r:2,c:4,color:"blue"},
    {r:1,c:0,color:"green"},{r:3,c:0,color:"green"},
    {r:3,c:1,color:"yellow"},{r:4,c:3,color:"yellow"},
    {r:4,c:0,color:"orange"},{r:4,c:2,color:"orange"}] },

  { size:5, dots:[{r:0,c:0,color:"red"},{r:4,c:4,color:"red"},
    {r:2,c:1,color:"green"},{r:2,c:4,color:"green"},
    {r:4,c:0,color:"blue"},{r:4,c:3,color:"blue"}] },

  // ── 6×6 ──────────────────────────────────────────────────────────────────────
  { size:6, dots:[{r:0,c:0,color:"red"},{r:5,c:5,color:"red"},
    {r:1,c:0,color:"blue"},{r:5,c:4,color:"blue"},
    {r:1,c:1,color:"green"},{r:2,c:1,color:"green"},
    {r:2,c:2,color:"yellow"},{r:3,c:2,color:"yellow"}] },

  { size:6, dots:[{r:0,c:0,color:"red"},{r:5,c:5,color:"red"},
    {r:0,c:5,color:"blue"},{r:5,c:0,color:"blue"},
    {r:0,c:2,color:"green"},{r:2,c:5,color:"green"},
    {r:2,c:2,color:"yellow"},{r:4,c:3,color:"yellow"},
    {r:1,c:4,color:"orange"},{r:3,c:1,color:"orange"}] },

  { size:6, dots:[{r:0,c:0,color:"red"},{r:5,c:3,color:"red"},
    {r:0,c:5,color:"blue"},{r:5,c:0,color:"blue"},
    {r:0,c:2,color:"green"},{r:2,c:5,color:"green"},
    {r:3,c:1,color:"yellow"},{r:3,c:4,color:"yellow"},
    {r:1,c:3,color:"orange"},{r:4,c:2,color:"orange"}] },

  { size:6, dots:[{r:0,c:1,color:"red"},{r:5,c:4,color:"red"},
    {r:0,c:4,color:"blue"},{r:5,c:1,color:"blue"},
    {r:1,c:0,color:"green"},{r:4,c:5,color:"green"},
    {r:1,c:5,color:"yellow"},{r:4,c:0,color:"yellow"},
    {r:2,c:2,color:"orange"},{r:3,c:3,color:"orange"},
    {r:0,c:0,color:"pink"},{r:5,c:5,color:"pink"}] },

  // ── 7×7 ──────────────────────────────────────────────────────────────────────
  { size:7, dots:[{r:0,c:0,color:"red"},{r:6,c:6,color:"red"},
    {r:0,c:6,color:"blue"},{r:6,c:0,color:"blue"},
    {r:0,c:3,color:"green"},{r:6,c:3,color:"green"},
    {r:3,c:0,color:"yellow"},{r:3,c:6,color:"yellow"},
    {r:2,c:2,color:"orange"},{r:4,c:4,color:"orange"}] },

  { size:7, dots:[{r:0,c:0,color:"red"},{r:6,c:4,color:"red"},
    {r:0,c:6,color:"blue"},{r:5,c:0,color:"blue"},
    {r:0,c:3,color:"green"},{r:4,c:6,color:"green"},
    {r:2,c:1,color:"yellow"},{r:5,c:5,color:"yellow"},
    {r:1,c:4,color:"orange"},{r:6,c:2,color:"orange"},
    {r:3,c:3,color:"pink"},{r:6,c:6,color:"pink"}] },

  { size:7, dots:[{r:0,c:0,color:"red"},{r:6,c:6,color:"red"},
    {r:0,c:6,color:"blue"},{r:6,c:0,color:"blue"},
    {r:1,c:1,color:"green"},{r:5,c:5,color:"green"},
    {r:1,c:5,color:"yellow"},{r:5,c:1,color:"yellow"},
    {r:2,c:3,color:"orange"},{r:4,c:3,color:"orange"},
    {r:3,c:2,color:"pink"},{r:3,c:4,color:"pink"}] },

  // ── 8×8 ──────────────────────────────────────────────────────────────────────
  { size:8, dots:[{r:0,c:0,color:"red"},{r:7,c:7,color:"red"},
    {r:0,c:7,color:"blue"},{r:7,c:0,color:"blue"},
    {r:0,c:3,color:"green"},{r:7,c:4,color:"green"},
    {r:3,c:0,color:"yellow"},{r:4,c:7,color:"yellow"},
    {r:2,c:2,color:"orange"},{r:5,c:5,color:"orange"},
    {r:2,c:5,color:"pink"},{r:5,c:2,color:"pink"}] },

  { size:8, dots:[{r:0,c:0,color:"red"},{r:7,c:7,color:"red"},
    {r:0,c:7,color:"blue"},{r:7,c:0,color:"blue"},
    {r:0,c:4,color:"green"},{r:7,c:3,color:"green"},
    {r:1,c:1,color:"yellow"},{r:6,c:6,color:"yellow"},
    {r:1,c:6,color:"orange"},{r:6,c:1,color:"orange"},
    {r:3,c:3,color:"pink"},{r:4,c:4,color:"pink"},
    {r:3,c:4,color:"maroon"},{r:4,c:3,color:"maroon"}] },

  { size:8, dots:[{r:0,c:0,color:"red"},{r:7,c:5,color:"red"},
    {r:0,c:7,color:"blue"},{r:6,c:0,color:"blue"},
    {r:0,c:3,color:"green"},{r:5,c:7,color:"green"},
    {r:2,c:0,color:"yellow"},{r:7,c:3,color:"yellow"},
    {r:1,c:5,color:"orange"},{r:6,c:2,color:"orange"},
    {r:3,c:2,color:"pink"},{r:4,c:5,color:"pink"},
    {r:3,c:6,color:"maroon"},{r:5,c:4,color:"maroon"}] },
];

const TOTAL = LEVELS.length;
const SAVE_KEY = "flow-free-v1";
const OFF = 10; // canvas padding

// ─── GAME STATE ───────────────────────────────────────────────────────────────
type Board = (string|null)[][];

interface GS {
  level:    Level;
  board:    Board;
  pipes:    Record<string, [number,number][]>;
  dragging: string|null;
  lastCell: [number,number]|null;
  won:      boolean;
  moves:    number;
}

function emptyBoard(n: number): Board {
  return Array.from({length:n}, () => new Array(n).fill(null));
}

function dotAt(level: Level, r: number, c: number): string|null {
  return level.dots.find(d => d.r===r && d.c===c)?.color ?? null;
}

function adj([r1,c1]: [number,number], [r2,c2]: [number,number]): boolean {
  return Math.abs(r1-r2) + Math.abs(c1-c2) === 1;
}

function initGS(level: Level): GS {
  const board = emptyBoard(level.size);
  const pipes: Record<string, [number,number][]> = {};
  for (const d of level.dots) {
    board[d.r][d.c] = d.color;
    if (!pipes[d.color]) pipes[d.color] = [];
  }
  return { level, board, pipes, dragging: null, lastCell: null, won: false, moves: 0 };
}

function clearPipe(gs: GS, color: string) {
  for (const [r,c] of gs.pipes[color] ?? []) {
    if (!dotAt(gs.level, r, c)) gs.board[r][c] = null;
  }
  gs.pipes[color] = [];
}

function getCoverage(gs: GS): number {
  const n = gs.level.size;
  let k = 0;
  for (let r=0;r<n;r++) for (let c=0;c<n;c++) if (gs.board[r][c]) k++;
  return k / (n*n);
}

function checkWin(gs: GS): boolean {
  const colors = new Set(gs.level.dots.map(d => d.color));
  for (const color of colors) {
    const dots = gs.level.dots.filter(d => d.color===color);
    const path = gs.pipes[color] ?? [];
    if (path.length < 2) return false;
    const [A,B] = dots;
    const f = path[0], l = path[path.length-1];
    if (!((f[0]===A.r&&f[1]===A.c&&l[0]===B.r&&l[1]===B.c)||
          (f[0]===B.r&&f[1]===B.c&&l[0]===A.r&&l[1]===A.c))) return false;
  }
  return true;
}

function pointerDown(gs: GS, r: number, c: number): boolean {
  const cellColor = gs.board[r][c];
  if (!cellColor) return false;
  const isDot = dotAt(gs.level, r, c);
  if (isDot) {
    clearPipe(gs, isDot);
    gs.pipes[isDot] = [[r,c]];
    gs.board[r][c] = isDot;
    gs.dragging = isDot;
    gs.lastCell = [r,c];
    gs.moves++;
  } else {
    const path = gs.pipes[cellColor] ?? [];
    const idx  = path.findIndex(([pr,pc]) => pr===r && pc===c);
    if (idx < 0) return false;
    const removed = path.splice(idx+1);
    for (const [pr,pc] of removed) if (!dotAt(gs.level,pr,pc)) gs.board[pr][pc]=null;
    gs.dragging = cellColor;
    gs.lastCell = [r,c];
  }
  return true;
}

function pointerMove(gs: GS, r: number, c: number): boolean {
  const color = gs.dragging;
  if (!color) return false;
  const path = gs.pipes[color] ?? [];
  if (path.length === 0) return false;
  const last = path[path.length-1];
  if (!adj(last, [r,c])) return false;

  // Backtrack if going backwards on our own path
  const bi = path.findIndex(([pr,pc]) => pr===r&&pc===c);
  if (bi >= 0) {
    const removed = path.splice(bi+1);
    for (const [pr,pc] of removed) if (!dotAt(gs.level,pr,pc)) gs.board[pr][pc]=null;
    gs.lastCell = [r,c];
    return true;
  }

  // Block entry into another color's dot
  const dc = dotAt(gs.level, r, c);
  if (dc && dc !== color) return false;

  // Erase another color's pipe if we enter it
  const cellColor = gs.board[r][c];
  if (cellColor && cellColor !== color) clearPipe(gs, cellColor);

  path.push([r,c]);
  gs.board[r][c] = color;
  gs.lastCell = [r,c];
  return true;
}

function pointerUp(gs: GS) {
  gs.dragging = null;
  gs.lastCell = null;
  gs.won = checkWin(gs);
}

// ─── RENDERING ────────────────────────────────────────────────────────────────
function render(canvas: HTMLCanvasElement, gs: GS, winPulse: number) {
  const ctx = canvas.getContext("2d")!;
  const { level, board, pipes, won } = gs;
  const n   = level.size;
  const CW  = canvas.width;
  const CH  = canvas.height;
  const CS  = (CW - OFF*2) / n;

  // ── Background
  ctx.fillStyle = "#f2f2ed";
  ctx.fillRect(0, 0, CW, CH);

  // ── Board background
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(OFF, OFF, n*CS, n*CS, 10);
  ctx.fill();

  // ── Grid lines
  ctx.strokeStyle = "#e2e2e2";
  ctx.lineWidth = 0.8;
  for (let i=0; i<=n; i++) {
    ctx.beginPath(); ctx.moveTo(OFF+i*CS, OFF); ctx.lineTo(OFF+i*CS, OFF+n*CS); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(OFF, OFF+i*CS); ctx.lineTo(OFF+n*CS, OFF+i*CS); ctx.stroke();
  }
  // Outer border
  ctx.strokeStyle = "#c8c8c8";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(OFF, OFF, n*CS, n*CS);

  // ── Pipes
  const PW = CS * 0.52;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const [color, path] of Object.entries(pipes)) {
    if (path.length < 2) continue;
    ctx.save();
    ctx.strokeStyle = PAL[color] ?? "#888";
    ctx.lineWidth = PW;
    if (won) {
      const pulse = 0.85 + 0.15 * Math.sin(winPulse * 0.18);
      ctx.globalAlpha = pulse;
    }
    ctx.beginPath();
    ctx.moveTo(OFF + path[0][1]*CS + CS/2, OFF + path[0][0]*CS + CS/2);
    for (let i=1; i<path.length; i++) {
      ctx.lineTo(OFF + path[i][1]*CS + CS/2, OFF + path[i][0]*CS + CS/2);
    }
    ctx.stroke();
    ctx.restore();
  }

  // ── Dots (rendered on top)
  for (const dot of level.dots) {
    const px = OFF + dot.c*CS + CS/2;
    const py = OFF + dot.r*CS + CS/2;
    const dr = CS * 0.29;

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.22)";
    ctx.shadowBlur  = 6;
    ctx.fillStyle   = PAL[dot.color] ?? "#888";
    ctx.beginPath();
    ctx.arc(px, py, dr, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    // White inner ring
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth   = dr * 0.28;
    ctx.beginPath();
    ctx.arc(px, py, dr * 0.52, 0, Math.PI*2);
    ctx.stroke();
  }

  // ── Win glow overlay
  if (won) {
    const alpha = 0.06 + 0.04 * Math.sin(winPulse * 0.22);
    ctx.fillStyle = `rgba(39,174,96,${alpha})`;
    ctx.beginPath();
    ctx.roundRect(OFF, OFF, n*CS, n*CS, 10);
    ctx.fill();
  }
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
type Screen = "menu" | "game";

export default function FlowFree() {
  const [screen, setScreen]   = useState<Screen>("menu");
  const [lvlIdx, setLvlIdx]   = useState(0);
  const [won, setWon]         = useState(false);
  const [moves, setMoves]     = useState(0);
  const [cov, setCov]         = useState(0);
  const [cSize, setCSize]     = useState(360);
  const [completed, setCompleted] = useState<Set<number>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(SAVE_KEY)||"[]") as number[]); }
    catch { return new Set(); }
  });

  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const gsRef      = useRef<GS|null>(null);
  const dragging   = useRef(false);
  const winPulse   = useRef(0);
  const animRef    = useRef(0);

  // Responsive canvas size
  useEffect(() => {
    const upd = () => {
      const avail = Math.min(window.innerWidth - 32, window.innerHeight - 210, 500);
      setCSize(Math.max(250, avail));
    };
    upd();
    window.addEventListener("resize", upd);
    return () => window.removeEventListener("resize", upd);
  }, []);

  const doRender = useCallback((gs: GS) => {
    if (!canvasRef.current) return;
    render(canvasRef.current, gs, winPulse.current);
    setCov(Math.round(getCoverage(gs) * 100));
    setMoves(gs.moves);
  }, []);

  // Win pulse animation
  useEffect(() => {
    if (!won) return;
    const loop = () => {
      winPulse.current++;
      if (gsRef.current) doRender(gsRef.current);
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [won, doRender]);

  // Re-render when canvas size changes
  useEffect(() => {
    if (screen === "game" && gsRef.current) doRender(gsRef.current);
  }, [cSize, screen, doRender]);

  // Touch: prevent scroll while playing
  useEffect(() => {
    if (screen !== "game") return;
    const el = canvasRef.current;
    if (!el) return;
    const block = (e: TouchEvent) => e.preventDefault();
    el.addEventListener("touchstart", block, { passive: false });
    el.addEventListener("touchmove",  block, { passive: false });
    return () => { el.removeEventListener("touchstart", block); el.removeEventListener("touchmove", block); };
  }, [screen]);

  const startLevel = useCallback((idx: number) => {
    cancelAnimationFrame(animRef.current);
    winPulse.current = 0;
    gsRef.current = initGS(LEVELS[idx]);
    setLvlIdx(idx);
    setWon(false);
    setMoves(0);
    setCov(0);
    setScreen("game");
    requestAnimationFrame(() => { if (gsRef.current) doRender(gsRef.current); });
  }, [doRender]);

  // ── Pointer helpers ─────────────────────────────────────────────────────────
  function getPos(e: React.MouseEvent | React.TouchEvent): {x:number;y:number}|null {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = cSize / rect.width, sy = cSize / rect.height;
    if ("touches" in e) {
      if (!e.touches.length) return null;
      return { x:(e.touches[0].clientX - rect.left)*sx, y:(e.touches[0].clientY - rect.top)*sy };
    }
    return { x:(e.clientX - rect.left)*sx, y:(e.clientY - rect.top)*sy };
  }

  function posToCell(x: number, y: number): [number,number]|null {
    const gs = gsRef.current!;
    const CS = (cSize - OFF*2) / gs.level.size;
    const c = Math.floor((x - OFF) / CS), r = Math.floor((y - OFF) / CS);
    if (r<0||r>=gs.level.size||c<0||c>=gs.level.size) return null;
    return [r,c];
  }

  const onDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (won) return;
    const pos = getPos(e); if (!pos) return;
    const cell = posToCell(pos.x, pos.y); if (!cell) return;
    if (pointerDown(gsRef.current!, cell[0], cell[1])) {
      dragging.current = true;
      doRender(gsRef.current!);
    }
  };

  const onMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragging.current || won) return;
    const pos = getPos(e); if (!pos) return;
    const cell = posToCell(pos.x, pos.y); if (!cell) return;
    const last = gsRef.current!.lastCell;
    if (last && last[0]===cell[0] && last[1]===cell[1]) return;
    pointerMove(gsRef.current!, cell[0], cell[1]);
    doRender(gsRef.current!);
  };

  const onUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    const gs = gsRef.current!;
    pointerUp(gs);
    if (gs.won) {
      setWon(true);
      const next = new Set(completed); next.add(lvlIdx);
      setCompleted(next);
      try { localStorage.setItem(SAVE_KEY, JSON.stringify([...next])); } catch {}
    }
    doRender(gs);
  };

  const reset = () => {
    if (!gsRef.current) return;
    cancelAnimationFrame(animRef.current);
    winPulse.current = 0;
    gsRef.current = initGS(LEVELS[lvlIdx]);
    setWon(false); setMoves(0); setCov(0);
    doRender(gsRef.current);
  };

  // ── MENU ────────────────────────────────────────────────────────────────────
  if (screen === "menu") {
    const maxUnlocked = Math.min(TOTAL - 1, completed.size);
    return (
      <div style={{
        minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center",
        background:"#f0f0eb", padding:"16px 16px 40px", fontFamily:"'Segoe UI',sans-serif",
      }}>
        <div style={{ alignSelf:"flex-start", marginBottom:16 }}>
          <Link href="/"><span style={{ color:"#888", fontSize:14, cursor:"pointer" }}>← Hub</span></Link>
        </div>

        {/* Title */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:52, marginBottom:8 }}>🔵</div>
          <h1 style={{
            fontSize:38, fontWeight:900, margin:"0 0 4px",
            background:"linear-gradient(135deg,#E63946,#F4A523,#27AE60,#2176AE)",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            letterSpacing:-1,
          }}>Flow Free</h1>
          <p style={{ color:"#999", fontSize:14, margin:0 }}>Connect the dots · Cover the board</p>
        </div>

        {/* Level grid */}
        <div style={{
          display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8,
          maxWidth:380, width:"100%", marginBottom:24,
        }}>
          {LEVELS.map((lv, idx) => {
            const done = completed.has(idx);
            const locked = idx > maxUnlocked;
            return (
              <button key={idx} onClick={() => !locked && startLevel(idx)} style={{
                aspectRatio:"1", borderRadius:10, border:"none", fontSize:13, fontWeight:700,
                cursor: locked ? "not-allowed" : "pointer",
                background: done ? "#e6f7ee" : locked ? "#eee" : "#fff",
                color: done ? "#27AE60" : locked ? "#bbb" : "#333",
                boxShadow: locked ? "none" : "0 1px 4px rgba(0,0,0,0.10)",
                display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:2,
                transition:"transform 0.1s",
              }}>
                {locked ? "🔒" : done ? "✓" : idx+1}
                {!locked && <span style={{ fontSize:9, fontWeight:400, color:"#bbb" }}>{lv.size}×{lv.size}</span>}
              </button>
            );
          })}
        </div>

        <div style={{
          padding:"10px 24px", background:"#fff", borderRadius:12,
          color:"#888", fontSize:13,
          boxShadow:"0 1px 4px rgba(0,0,0,0.08)",
        }}>
          {completed.size}/{TOTAL} solved
        </div>
      </div>
    );
  }

  // ── GAME SCREEN ─────────────────────────────────────────────────────────────
  const level = LEVELS[lvlIdx];
  const colorCount = new Set(level.dots.map(d => d.color)).size;
  const allConnected = won;

  return (
    <div style={{
      minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center",
      background:"#f2f2ed", fontFamily:"'Segoe UI',sans-serif", userSelect:"none",
      paddingBottom:24,
    }}>
      {/* Header */}
      <div style={{
        width:"100%", maxWidth:520, padding:"12px 16px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        borderBottom:"1px solid #e0e0da", background:"#f2f2ed",
      }}>
        <button onClick={() => setScreen("menu")} style={{
          background:"rgba(0,0,0,0.06)", border:"none", borderRadius:8,
          padding:"5px 12px", fontSize:13, cursor:"pointer", color:"#555",
        }}>← Menu</button>

        <div style={{ textAlign:"center", lineHeight:1.3 }}>
          <div style={{ fontSize:11, color:"#aaa", textTransform:"uppercase", letterSpacing:1 }}>Level</div>
          <div style={{ fontSize:20, fontWeight:900, color:"#333" }}>{lvlIdx+1}</div>
          <div style={{ fontSize:10, color:"#ccc" }}>{level.size}×{level.size} · {colorCount} colors</div>
        </div>

        <div style={{ textAlign:"right", lineHeight:1.3 }}>
          <div style={{ fontSize:11, color:"#aaa", textTransform:"uppercase", letterSpacing:1 }}>Moves</div>
          <div style={{ fontSize:20, fontWeight:900, color:"#333" }}>{moves}</div>
        </div>
      </div>

      {/* Coverage bar */}
      <div style={{ width: cSize, marginTop:10, marginBottom:6 }}>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#aaa", marginBottom:3 }}>
          <span>Coverage</span>
          <span style={{ fontWeight:700, color: cov===100 ? "#27AE60" : "#aaa" }}>{cov}%</span>
        </div>
        <div style={{ height:5, background:"#e8e8e3", borderRadius:3, overflow:"hidden" }}>
          <div style={{
            height:"100%", borderRadius:3,
            width:`${cov}%`,
            background: cov===100 ? "#27AE60" : "#2176AE",
            transition:"width 0.2s, background 0.3s",
          }} />
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={cSize}
        height={cSize}
        style={{ display:"block", borderRadius:12, boxShadow:"0 2px 16px rgba(0,0,0,0.10)", touchAction:"none" }}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        onTouchStart={onDown}
        onTouchMove={onMove}
        onTouchEnd={onUp}
      />

      {/* Win overlay */}
      {won && (
        <div style={{
          position:"fixed", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
          background:"rgba(0,0,0,0.45)", zIndex:100, backdropFilter:"blur(4px)",
        }}>
          <div style={{
            background:"#fff", borderRadius:24, padding:"36px 48px",
            textAlign:"center", boxShadow:"0 20px 60px rgba(0,0,0,0.2)",
            animation:"ff-pop 0.3s ease",
          }}>
            <style>{`@keyframes ff-pop{0%{transform:scale(0.8);opacity:0}100%{transform:scale(1);opacity:1}}`}</style>
            <div style={{ fontSize:52, marginBottom:10 }}>🎉</div>
            <h2 style={{ fontSize:28, fontWeight:900, color:"#27AE60", margin:"0 0 6px" }}>Solved!</h2>
            <p style={{ color:"#aaa", fontSize:15, margin:"0 0 4px" }}>
              {moves} move{moves!==1?"s":""}
            </p>
            {cov===100 && (
              <p style={{ color:"#2176AE", fontWeight:700, fontSize:14, margin:"0 0 24px" }}>
                ✨ Perfect — board fully covered!
              </p>
            )}
            {cov < 100 && <div style={{ marginBottom:24 }} />}
            <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
              {lvlIdx+1 < TOTAL && (
                <button onClick={() => startLevel(lvlIdx+1)} style={{
                  padding:"12px 28px", background:"linear-gradient(135deg,#27AE60,#1e8749)",
                  border:"none", borderRadius:14, color:"#fff", fontWeight:800, fontSize:15,
                  cursor:"pointer", boxShadow:"0 4px 16px rgba(39,174,96,0.4)",
                }}>Next Level →</button>
              )}
              <button onClick={() => setScreen("menu")} style={{
                padding:"12px 20px", background:"#f2f2ed", border:"1.5px solid #e0e0da",
                borderRadius:14, color:"#666", fontWeight:600, fontSize:14, cursor:"pointer",
              }}>Menu</button>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{ display:"flex", gap:10, marginTop:14 }}>
        <button onClick={reset} style={{
          padding:"9px 20px", background:"#fff", border:"1.5px solid #e0e0da",
          borderRadius:11, fontSize:14, fontWeight:600, color:"#555", cursor:"pointer",
          boxShadow:"0 1px 4px rgba(0,0,0,0.07)",
        }}>↺ Reset</button>
        {lvlIdx+1 < TOTAL && !won && (
          <button onClick={() => startLevel(lvlIdx+1)} style={{
            padding:"9px 20px", background:"#fff", border:"1.5px solid #e0e0da",
            borderRadius:11, fontSize:14, fontWeight:600, color:"#aaa", cursor:"pointer",
            boxShadow:"0 1px 4px rgba(0,0,0,0.07)",
          }}>Skip →</button>
        )}
      </div>
    </div>
  );
}
