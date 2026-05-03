import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const COLS = 10;
const ROWS = 20;
const CELL = 30;

const PANEL_L = 140;
const PANEL_R = 130;
const BOARD_X = PANEL_L;
const BOARD_Y = 10;
const BOARD_W = COLS * CELL;   // 300
const BOARD_H = ROWS * CELL;   // 600
const CVS_W = PANEL_L + BOARD_W + PANEL_R;  // 570
const CVS_H = BOARD_H + BOARD_Y * 2;        // 620

// ms per gravity drop, indexed by level 0-15+
const GRAVITY = [800,720,630,550,470,380,300,215,130,100,80,80,80,70,70,60];
const LINE_PTS  = [0, 100, 300, 500, 800]; // pts per line-clear count
const LOCK_DELAY = 500;
const DAS_DELAY  = 160;
const DAS_TICK   = 48;
const CLEAR_ANIM = 180; // ms line-clear flash

// ─── PIECE DATA ───────────────────────────────────────────────────────────────
type Matrix = (0|1)[][];

interface PieceDef { color:string; hi:string; lo:string; matrix:Matrix; spawnCol:number; }

const DEFS: Record<string,PieceDef> = {
  I: { color:"#00e5ff", hi:"#7ef9ff", lo:"#007399", matrix:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], spawnCol:3 },
  O: { color:"#ffe000", hi:"#fff176", lo:"#998700", matrix:[[1,1],[1,1]],                              spawnCol:4 },
  T: { color:"#cc44ff", hi:"#e599ff", lo:"#660099", matrix:[[0,1,0],[1,1,1],[0,0,0]],                 spawnCol:3 },
  S: { color:"#33dd55", hi:"#88ffa0", lo:"#116622", matrix:[[0,1,1],[1,1,0],[0,0,0]],                 spawnCol:3 },
  Z: { color:"#ff3344", hi:"#ff8899", lo:"#991122", matrix:[[1,1,0],[0,1,1],[0,0,0]],                 spawnCol:3 },
  J: { color:"#3399ff", hi:"#88ccff", lo:"#114488", matrix:[[1,0,0],[1,1,1],[0,0,0]],                 spawnCol:3 },
  L: { color:"#ff8833", hi:"#ffbb77", lo:"#994400", matrix:[[0,0,1],[1,1,1],[0,0,0]],                 spawnCol:3 },
};
const TYPES = Object.keys(DEFS);

function rotateCW(m: Matrix): Matrix {
  const R = m.length, C = m[0].length;
  const out: Matrix = Array.from({length:C},()=>new Array(R).fill(0) as (0|1)[]);
  for (let r=0;r<R;r++) for (let c=0;c<C;c++) out[c][R-1-r]=m[r][c];
  return out;
}

function cells(m: Matrix, row:number, col:number): [number,number][] {
  const out:[number,number][]=[];
  for (let r=0;r<m.length;r++) for (let c=0;c<m[r].length;c++) if(m[r][c]) out.push([row+r,col+c]);
  return out;
}

function valid(m: Matrix, row:number, col:number, board: string[][]): boolean {
  for (const [r,c] of cells(m,row,col)) {
    if (c<0||c>=COLS||r>=ROWS) return false;
    if (r>=0 && board[r][c]) return false;
  }
  return true;
}

// SRS wall kick offsets (try in order): [row, col] deltas
const KICKS_NORMAL: [number,number][] = [[0,0],[0,-1],[0,1],[0,-2],[0,2],[-1,0]];
const KICKS_I:      [number,number][] = [[0,0],[0,-2],[0,2],[0,-3],[0,3],[0,1],[-1,0]];

// ─── GAME STATE ───────────────────────────────────────────────────────────────
interface Piece { type:string; matrix:Matrix; row:number; col:number; }

interface GS {
  board:     string[][];
  cur:       Piece|null;
  held:      string|null;
  holdUsed:  boolean;
  bag:       string[];
  queue:     string[];      // next 3
  score:     number;
  lines:     number;
  level:     number;
  phase:     "idle"|"playing"|"paused"|"over";
  dropAcc:   number;        // ms since last gravity drop
  lockAcc:   number|null;   // ms since piece hit bottom
  atBottom:  boolean;
  lockMoves: number;        // moves used during lock delay (reset grace)
  clearRows: number[];      // rows being animated
  clearAcc:  number;        // ms of animation elapsed
  hiScore:   number;
  particles: Particle[];
}

interface Particle { x:number; y:number; vx:number; vy:number; life:number; color:string; }

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function emptyBoard(): string[][] {
  return Array.from({length:ROWS},()=>new Array(COLS).fill(""));
}

function newBag(): string[] {
  const bag = [...TYPES];
  for (let i=bag.length-1;i>0;i--) {
    const j=Math.floor(Math.random()*(i+1));
    [bag[i],bag[j]]=[bag[j],bag[i]];
  }
  return bag;
}

function spawnPiece(type: string): Piece {
  const def = DEFS[type];
  return { type, matrix: def.matrix.map(r=>[...r]) as Matrix, row:-1, col:def.spawnCol };
}

function ghostRow(cur: Piece, board: string[][]): number {
  let r = cur.row;
  while (valid(cur.matrix, r+1, cur.col, board)) r++;
  return r;
}

function loadHi(): number {
  try { return parseInt(localStorage.getItem("tetris-hi")||"0",10)||0; } catch { return 0; }
}
function saveHi(n:number) { try { localStorage.setItem("tetris-hi",String(n)); } catch {} }

function spawnParticles(rowIdx: number, board: string[][], particles: Particle[]) {
  for (let c=0;c<COLS;c++) {
    const color = board[rowIdx][c] || "#ffffff";
    const px = BOARD_X + c*CELL + CELL/2;
    const py = BOARD_Y + rowIdx*CELL + CELL/2;
    for (let k=0;k<4;k++) {
      particles.push({
        x: px, y: py,
        vx: (Math.random()-0.5)*6,
        vy: (Math.random()-0.8)*7,
        life: 1.0,
        color,
      });
    }
  }
}

// ─── RENDERING ───────────────────────────────────────────────────────────────
function drawBlock(
  ctx: CanvasRenderingContext2D,
  px:number, py:number, size:number,
  color:string, hi:string, lo:string,
  alpha=1
) {
  ctx.globalAlpha = alpha;
  // Main fill
  ctx.fillStyle = color;
  ctx.fillRect(px+1, py+1, size-2, size-2);
  // Top/left highlight
  ctx.fillStyle = hi;
  ctx.fillRect(px+1, py+1, size-2, 4);
  ctx.fillRect(px+1, py+1, 4, size-2);
  // Bottom/right shadow
  ctx.fillStyle = lo;
  ctx.fillRect(px+size-5, py+1, 4, size-2);
  ctx.fillRect(px+1, py+size-5, size-2, 4);
  // Inner shine (small white dot top-left)
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(px+3, py+3, 4, 4);
  ctx.globalAlpha = 1;
}

function drawGhost(ctx: CanvasRenderingContext2D, cur: Piece, gr: number) {
  const def = DEFS[cur.type];
  const cs = cells(cur.matrix, gr, cur.col);
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = def.color;
  ctx.lineWidth = 1.5;
  for (const [r,c] of cs) {
    if (r<0) continue;
    const px = BOARD_X + c*CELL;
    const py = BOARD_Y + r*CELL;
    ctx.strokeRect(px+2, py+2, CELL-4, CELL-4);
  }
  ctx.globalAlpha = 1;
}

function drawPieceOnBoard(ctx: CanvasRenderingContext2D, cur: Piece, clearRows: number[], clearAlpha: number) {
  const def = DEFS[cur.type];
  const cs  = cells(cur.matrix, cur.row, cur.col);
  // Glow
  ctx.save();
  ctx.shadowColor  = def.color;
  ctx.shadowBlur   = 16;
  for (const [r,c] of cs) {
    if (r<0) continue;
    if (clearRows.includes(r)) continue;
    const px = BOARD_X + c*CELL;
    const py = BOARD_Y + r*CELL;
    drawBlock(ctx, px, py, CELL, def.color, def.hi, def.lo);
  }
  ctx.restore();
}

function drawMiniPiece(
  ctx: CanvasRenderingContext2D,
  type: string,
  cx:number, cy:number,
  cellSize=22
) {
  const def = DEFS[type];
  const m = def.matrix;
  // Find bounding box
  let minR=99,maxR=0,minC=99,maxC=0;
  for (let r=0;r<m.length;r++) for (let c=0;c<m[r].length;c++) if(m[r][c]){
    minR=Math.min(minR,r);maxR=Math.max(maxR,r);
    minC=Math.min(minC,c);maxC=Math.max(maxC,c);
  }
  const w=(maxC-minC+1)*cellSize;
  const h=(maxR-minR+1)*cellSize;
  const ox=cx-w/2;
  const oy=cy-h/2;
  for (let r=minR;r<=maxR;r++) for (let c=minC;c<=maxC;c++) if(m[r][c]){
    drawBlock(ctx,(ox+(c-minC)*cellSize)|0,(oy+(r-minR)*cellSize)|0,cellSize,def.color,def.hi,def.lo);
  }
}

function render(ctx: CanvasRenderingContext2D, gs: GS) {
  const { board, cur, held, holdUsed, queue, phase, clearRows, clearAcc, particles } = gs;

  // ── Background ──────────────────────────────────────────────────────────────
  ctx.fillStyle = "#08080f";
  ctx.fillRect(0, 0, CVS_W, CVS_H);

  // Subtle grid bg in board area
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 0.5;
  for (let c=0;c<=COLS;c++){
    ctx.beginPath();
    ctx.moveTo(BOARD_X+c*CELL, BOARD_Y);
    ctx.lineTo(BOARD_X+c*CELL, BOARD_Y+BOARD_H);
    ctx.stroke();
  }
  for (let r=0;r<=ROWS;r++){
    ctx.beginPath();
    ctx.moveTo(BOARD_X, BOARD_Y+r*CELL);
    ctx.lineTo(BOARD_X+BOARD_W, BOARD_Y+r*CELL);
    ctx.stroke();
  }

  // Board border glow
  ctx.save();
  ctx.shadowColor = "#4444ff";
  ctx.shadowBlur  = 20;
  ctx.strokeStyle = "rgba(100,100,255,0.4)";
  ctx.lineWidth   = 1.5;
  ctx.strokeRect(BOARD_X-0.5, BOARD_Y-0.5, BOARD_W+1, BOARD_H+1);
  ctx.restore();

  // ── Board cells ─────────────────────────────────────────────────────────────
  const clearFlash = clearRows.length > 0;
  const flashAlpha = clearFlash ? Math.min(1, (1 - clearAcc/CLEAR_ANIM)*2) : 0;

  for (let r=0;r<ROWS;r++) {
    const isClear = clearRows.includes(r);
    for (let c=0;c<COLS;c++) {
      const color = board[r][c];
      if (!color) continue;
      const px = BOARD_X + c*CELL;
      const py = BOARD_Y + r*CELL;
      if (isClear) {
        // Flash white
        ctx.globalAlpha = flashAlpha;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(px+1, py+1, CELL-2, CELL-2);
        ctx.globalAlpha = 1;
      } else {
        const def = DEFS[color] || { color:"#888", hi:"#bbb", lo:"#444" };
        drawBlock(ctx, px, py, CELL, def.color, def.hi, def.lo);
      }
    }
  }

  // ── Ghost piece ──────────────────────────────────────────────────────────────
  if (cur && phase==="playing" && clearRows.length===0) {
    const gr = ghostRow(cur, board);
    if (gr !== cur.row) drawGhost(ctx, cur, gr);
  }

  // ── Current piece ───────────────────────────────────────────────────────────
  if (cur && phase==="playing" && clearRows.length===0) {
    drawPieceOnBoard(ctx, cur, clearRows, flashAlpha);
  }

  // ── Particles ───────────────────────────────────────────────────────────────
  for (const p of particles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle   = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3*p.life+1, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── LEFT PANEL ───────────────────────────────────────────────────────────────
  const lx = 10;
  ctx.font = "bold 11px 'Segoe UI', sans-serif";
  ctx.letterSpacing = "1px";
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillText("HOLD", lx, 32);
  ctx.letterSpacing = "0px";

  // Hold box
  ctx.strokeStyle = holdUsed ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.3)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(lx, 38, 110, 80);
  if (held) {
    ctx.globalAlpha = holdUsed ? 0.35 : 1;
    drawMiniPiece(ctx, held, lx+55, 78, 20);
    ctx.globalAlpha = 1;
  }

  // Score/level/lines
  const statY = 138;
  const label = (text:string, y:number) => {
    ctx.font = "bold 10px 'Segoe UI', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.letterSpacing = "1px";
    ctx.fillText(text, lx, y);
    ctx.letterSpacing = "0px";
  };
  const value = (text:string, y:number, color="rgba(255,255,255,0.9)") => {
    ctx.font = "bold 22px 'Segoe UI', sans-serif";
    ctx.fillStyle = color;
    ctx.fillText(text, lx, y);
  };

  label("SCORE", statY);
  value(String(gs.score).padStart(6,"0"), statY+26, "#ffd700");
  label("BEST", statY+56);
  value(String(gs.hiScore).padStart(6,"0"), statY+78, "#aaa");
  label("LEVEL", statY+108);
  value(String(gs.level+1), statY+130, "#c084fc");
  label("LINES", statY+160);
  value(String(gs.lines), statY+182, "#00e5ff");

  // Controls hint
  const hint = (t:string, y:number) => {
    ctx.font = "10px 'Segoe UI', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillText(t, lx, y);
  };
  hint("← →   Move",       statY+218);
  hint("↑ / Z  Rotate",     statY+232);
  hint("↓      Soft drop",  statY+246);
  hint("Space  Hard drop",  statY+260);
  hint("C      Hold",       statY+274);
  hint("P      Pause",      statY+288);

  // ── RIGHT PANEL ──────────────────────────────────────────────────────────────
  const rx = BOARD_X + BOARD_W + 14;
  ctx.font = "bold 11px 'Segoe UI', sans-serif";
  ctx.letterSpacing = "1px";
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillText("NEXT", rx, 32);
  ctx.letterSpacing = "0px";
  for (let i=0;i<Math.min(3,queue.length);i++) {
    const ty = 48 + i*86;
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.strokeRect(rx, ty, PANEL_R-16, 80);
    drawMiniPiece(ctx, queue[i], rx+(PANEL_R-16)/2, ty+40, i===0?22:18);
  }

  // ── Overlay: pause / game over ───────────────────────────────────────────────
  if (phase==="paused") {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PAUSED", BOARD_X+BOARD_W/2, BOARD_Y+BOARD_H/2-14);
    ctx.font = "14px 'Segoe UI', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText("Press P to resume", BOARD_X+BOARD_W/2, BOARD_Y+BOARD_H/2+18);
    ctx.textAlign = "left";
  }
  if (phase==="over") {
    ctx.fillStyle = "rgba(0,0,0,0.78)";
    ctx.fillRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H);
    ctx.textAlign = "center";
    ctx.fillStyle = "#ff4757";
    ctx.font = "bold 32px 'Segoe UI', sans-serif";
    ctx.fillText("GAME OVER", BOARD_X+BOARD_W/2, BOARD_Y+BOARD_H/2-30);
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 18px 'Segoe UI', sans-serif";
    ctx.fillText(`Score: ${gs.score}`, BOARD_X+BOARD_W/2, BOARD_Y+BOARD_H/2+8);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "13px 'Segoe UI', sans-serif";
    ctx.fillText("Press Enter or Space to restart", BOARD_X+BOARD_W/2, BOARD_Y+BOARD_H/2+40);
    ctx.textAlign = "left";
  }
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────
type Screen = "start" | "playing";

export default function Tetris() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gsRef     = useRef<GS | null>(null);
  const animRef   = useRef<number>(0);
  const keysRef   = useRef<Set<string>>(new Set());
  const dasRef    = useRef<{ dir:number; delay:number; tick:number }>({ dir:0, delay:0, tick:0 });
  const prevTimeRef = useRef<number>(0);
  const [screen, setScreen] = useState<Screen>("start");

  // ── Init game state ──────────────────────────────────────────────────────────
  const initGame = useCallback((): GS => {
    const bag1 = newBag();
    const bag2 = newBag();
    const combined = [...bag1, ...bag2];
    const firstType = combined.shift()!;
    const queue = combined.splice(0,3);
    const hi = loadHi();
    return {
      board:    emptyBoard(),
      cur:      spawnPiece(firstType),
      held:     null,
      holdUsed: false,
      bag:      combined,
      queue,
      score: 0, lines: 0, level: 0,
      phase:     "playing",
      dropAcc:   0,
      lockAcc:   null,
      atBottom:  false,
      lockMoves: 0,
      clearRows: [],
      clearAcc:  0,
      hiScore:   hi,
      particles: [],
    };
  }, []);

  const nextFromBag = useCallback((gs: GS): string => {
    if (gs.bag.length < 4) gs.bag.push(...newBag());
    return gs.bag.shift()!;
  }, []);

  const advanceQueue = useCallback((gs: GS): string => {
    const next = gs.queue.shift()!;
    gs.queue.push(nextFromBag(gs));
    return next;
  }, [nextFromBag]);

  // ── Lock piece ───────────────────────────────────────────────────────────────
  const lockPiece = useCallback((gs: GS) => {
    if (!gs.cur) return;
    const cur = gs.cur;
    const cs  = cells(cur.matrix, cur.row, cur.col);

    // Check game over: any cell above visible board
    if (cs.some(([r]) => r < 0)) {
      gs.phase = "over";
      if (gs.score > gs.hiScore) { gs.hiScore = gs.score; saveHi(gs.score); }
      return;
    }

    // Place on board
    for (const [r,c] of cs) gs.board[r][c] = cur.type;

    // Find cleared lines
    const cleared: number[] = [];
    for (let r=0;r<ROWS;r++) {
      if (gs.board[r].every(c=>c)) cleared.push(r);
    }

    if (cleared.length > 0) {
      // Spawn particles
      for (const row of cleared) spawnParticles(row, gs.board, gs.particles);

      gs.clearRows = cleared;
      gs.clearAcc  = 0;
      // Don't spawn next piece yet — wait for animation
      gs.cur = null;
      // Score
      const pts = LINE_PTS[cleared.length] * (gs.level + 1);
      gs.score += pts;
      gs.lines += cleared.length;
      gs.level  = Math.floor(gs.lines / 10);
      if (gs.score > gs.hiScore) { gs.hiScore = gs.score; saveHi(gs.score); }
    } else {
      // Spawn next immediately
      const nextType = advanceQueue(gs);
      gs.cur      = spawnPiece(nextType);
      gs.holdUsed = false;
      gs.lockAcc  = null;
      gs.atBottom = false;
      gs.lockMoves = 0;
    }
  }, [advanceQueue]);

  // ── Rotate piece ──────────────────────────────────────────────────────────────
  const tryRotate = useCallback((gs: GS, dir: 1|-1) => {
    if (!gs.cur) return;
    let m = gs.cur.matrix;
    const times = dir === 1 ? 1 : 3;
    for (let i=0;i<times;i++) m = rotateCW(m);

    const kicks = gs.cur.type === "I" ? KICKS_I : KICKS_NORMAL;
    for (const [dr,dc] of kicks) {
      const nr = gs.cur.row + dr;
      const nc = gs.cur.col + dc;
      if (valid(m, nr, nc, gs.cur ? gs.board ?? [] : gs.board)) {
        if (valid(m, nr, nc, gs.board)) {
          gs.cur.matrix = m;
          gs.cur.row    = nr;
          gs.cur.col    = nc;
          // Reset lock if at bottom
          if (gs.atBottom) {
            gs.lockAcc  = 0;
            gs.lockMoves++;
          }
          return;
        }
      }
    }
  }, []);

  // Proper tryRotate (self-contained, using gs.board directly)
  const doRotate = (gs: GS, dir: 1|-1) => {
    if (!gs.cur) return;
    let m = gs.cur.matrix;
    const times = dir === 1 ? 1 : 3;
    for (let i=0;i<times;i++) m = rotateCW(m);
    const kicks = gs.cur.type === "I" ? KICKS_I : KICKS_NORMAL;
    for (const [dr,dc] of kicks) {
      if (valid(m, gs.cur.row+dr, gs.cur.col+dc, gs.board)) {
        gs.cur.matrix = m;
        gs.cur.row   += dr;
        gs.cur.col   += dc;
        if (gs.atBottom) { gs.lockAcc = 0; gs.lockMoves++; }
        return;
      }
    }
  };

  // ── Move piece ───────────────────────────────────────────────────────────────
  const doMove = (gs: GS, dc: number) => {
    if (!gs.cur) return;
    if (valid(gs.cur.matrix, gs.cur.row, gs.cur.col+dc, gs.board)) {
      gs.cur.col += dc;
      if (gs.atBottom) { gs.lockAcc = 0; gs.lockMoves++; }
    }
  };

  // ── Hard drop ────────────────────────────────────────────────────────────────
  const doHardDrop = (gs: GS) => {
    if (!gs.cur) return;
    let dropped = 0;
    while (valid(gs.cur.matrix, gs.cur.row+1, gs.cur.col, gs.board)) {
      gs.cur.row++;
      dropped++;
    }
    gs.score += dropped * 2;
    lockPiece(gs);
    gs.lockAcc = null;
    gs.dropAcc = 0;
  };

  // ── Hold ─────────────────────────────────────────────────────────────────────
  const doHold = (gs: GS) => {
    if (!gs.cur || gs.holdUsed) return;
    const curType = gs.cur.type;
    if (gs.held) {
      gs.cur  = spawnPiece(gs.held);
      gs.held = curType;
    } else {
      gs.held = curType;
      const next = advanceQueue(gs);
      gs.cur  = spawnPiece(next);
    }
    gs.holdUsed  = true;
    gs.atBottom  = false;
    gs.lockAcc   = null;
    gs.lockMoves = 0;
  };

  // ── Main game loop ───────────────────────────────────────────────────────────
  const startLoop = useCallback(() => {
    prevTimeRef.current = performance.now();

    const loop = (time: number) => {
      const dt = Math.min(time - prevTimeRef.current, 50); // cap at 50ms
      prevTimeRef.current = time;

      const gs = gsRef.current!;
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx || !gs) { animRef.current = requestAnimationFrame(loop); return; }

      if (gs.phase === "playing") {
        // ── Line clear animation ────────────────────────────────────────────────
        if (gs.clearRows.length > 0) {
          gs.clearAcc += dt;
          // Update particles during animation too
          for (const p of gs.particles) {
            p.x += p.vx; p.y += p.vy; p.vy += 0.35; p.life -= 0.04;
          }
          gs.particles = gs.particles.filter(p => p.life > 0);

          if (gs.clearAcc >= CLEAR_ANIM) {
            // Remove cleared rows
            const cleared = gs.clearRows;
            gs.board = gs.board.filter((_,i) => !cleared.includes(i));
            while (gs.board.length < ROWS) gs.board.unshift(new Array(COLS).fill(""));
            gs.clearRows = [];
            gs.clearAcc  = 0;
            // Spawn next piece
            const nextType = advanceQueue(gs);
            gs.cur      = spawnPiece(nextType);
            gs.holdUsed = false;
            gs.lockAcc  = null;
            gs.atBottom = false;
            gs.lockMoves = 0;
          }
          render(ctx, gs);
          animRef.current = requestAnimationFrame(loop);
          return;
        }

        // ── DAS input ───────────────────────────────────────────────────────────
        const das = dasRef.current;
        const keys = keysRef.current;
        const leftHeld  = keys.has("ArrowLeft")  || keys.has("a") || keys.has("A");
        const rightHeld = keys.has("ArrowRight") || keys.has("d") || keys.has("D");
        const curDir = rightHeld ? 1 : leftHeld ? -1 : 0;

        if (curDir !== 0) {
          if (das.dir !== curDir) {
            das.dir   = curDir;
            das.delay = 0;
            das.tick  = 0;
            doMove(gs, curDir);
          } else {
            das.delay += dt;
            if (das.delay >= DAS_DELAY) {
              das.tick += dt;
              while (das.tick >= DAS_TICK) {
                das.tick -= DAS_TICK;
                doMove(gs, curDir);
              }
            }
          }
        } else {
          das.dir = 0;
        }

        // Soft drop
        const softDrop = keys.has("ArrowDown") || keys.has("s") || keys.has("S");
        const speed = GRAVITY[Math.min(gs.level, GRAVITY.length-1)];
        const effectiveSpeed = softDrop ? Math.min(speed, 40) : speed;

        // ── Gravity ─────────────────────────────────────────────────────────────
        if (gs.cur) {
          gs.dropAcc += dt;
          if (softDrop) gs.score += Math.floor(dt / effectiveSpeed);

          let dropped = 0;
          while (gs.dropAcc >= effectiveSpeed) {
            gs.dropAcc -= effectiveSpeed;
            if (valid(gs.cur.matrix, gs.cur.row+1, gs.cur.col, gs.board)) {
              gs.cur.row++;
              dropped++;
              gs.atBottom = false;
            } else {
              gs.atBottom = true;
              break;
            }
          }

          // ── Lock delay ────────────────────────────────────────────────────────
          if (gs.atBottom) {
            gs.lockAcc = (gs.lockAcc ?? 0) + dt;
            const maxMoves = 15;
            if (gs.lockAcc >= LOCK_DELAY || gs.lockMoves >= maxMoves) {
              lockPiece(gs);
            }
          } else {
            gs.lockAcc = null;
          }
        }

        // Update particles
        for (const p of gs.particles) {
          p.x += p.vx; p.y += p.vy; p.vy += 0.35; p.life -= 0.04;
        }
        gs.particles = gs.particles.filter(p => p.life > 0);
      }

      render(ctx, gs);
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
  }, [lockPiece, advanceQueue]);

  // ── Keyboard handler ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== "playing") return;

    const onKeyDown = (e: KeyboardEvent) => {
      const gs = gsRef.current;
      if (!gs) return;

      // Restart on game over
      if (gs.phase === "over") {
        if (e.code === "Space" || e.code === "Enter") {
          gsRef.current = initGame();
          return;
        }
        return;
      }

      // Pause toggle
      if (e.key === "p" || e.key === "P") {
        gs.phase = gs.phase === "paused" ? "playing" : "paused";
        return;
      }
      if (gs.phase !== "playing") return;

      e.preventDefault();
      keysRef.current.add(e.key);

      switch (e.key) {
        case "ArrowUp": case "x": case "X": doRotate(gs, 1); break;
        case "z": case "Z":                 doRotate(gs, -1); break;
        case " ":
          if (!keysRef.current.has("__space_held")) {
            keysRef.current.add("__space_held");
            doHardDrop(gs);
          }
          break;
        case "c": case "C": case "Shift":   doHold(gs); break;
        case "ArrowLeft":
          dasRef.current = { dir:-1, delay:0, tick:0 };
          doMove(gs, -1);
          break;
        case "ArrowRight":
          dasRef.current = { dir:1, delay:0, tick:0 };
          doMove(gs, 1);
          break;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
      if (e.key === " ") keysRef.current.delete("__space_held");
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        dasRef.current.dir = 0;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup",   onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup",   onKeyUp);
    };
  }, [screen, initGame]);

  // ── Start game ───────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    gsRef.current = initGame();
    keysRef.current.clear();
    dasRef.current = { dir:0, delay:0, tick:0 };
    setScreen("playing");
  }, [initGame]);

  useEffect(() => {
    if (screen !== "playing") return;
    startLoop();
    return () => cancelAnimationFrame(animRef.current);
  }, [screen, startLoop]);

  // ── Canvas scale for small screens ───────────────────────────────────────────
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const update = () => {
      const avail = Math.min(window.innerWidth - 32, window.innerHeight - 60, CVS_W);
      setScale(Math.min(1, avail / CVS_W));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // ── START SCREEN ─────────────────────────────────────────────────────────────
  if (screen === "start") {
    const hi = loadHi();
    return (
      <div style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at 50% 0%, #0d0030 0%, #050012 60%, #000008 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontFamily: "'Segoe UI', sans-serif",
        padding: 20,
        userSelect: "none",
      }}>
        <Link href="/">
          <span style={{ position:"absolute", top:16, left:20, background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:8, padding:"6px 14px", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer" }}>← Menu</span>
        </Link>

        {/* Logo */}
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize:56, filter:"drop-shadow(0 0 24px #c084fc)" }}>🟦</span>
        </div>
        <h1 style={{
          fontSize: 52, fontWeight: 900, letterSpacing: -2,
          margin: "0 0 4px",
          background: "linear-gradient(135deg, #c084fc 0%, #818cf8 40%, #38bdf8 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>TETRIS</h1>
        <p style={{ color:"rgba(255,255,255,0.35)", fontSize:14, margin:"0 0 40px" }}>Classic Block Puzzle</p>

        {hi > 0 && (
          <div style={{
            marginBottom: 28, padding:"10px 24px",
            background:"rgba(255,215,0,0.08)", border:"1px solid rgba(255,215,0,0.25)",
            borderRadius:12, color:"#ffd700", fontSize:14, fontWeight:700,
          }}>
            Best Score: {String(hi).padStart(6,"0")}
          </div>
        )}

        <button
          onClick={startGame}
          style={{
            padding: "16px 56px",
            fontSize: 18, fontWeight: 800, letterSpacing: 1,
            background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
            border: "none", borderRadius: 16, color: "#fff",
            cursor: "pointer",
            boxShadow: "0 6px 32px rgba(124,58,237,0.55)",
            marginBottom: 32,
          }}
        >▶ PLAY</button>

        {/* Controls */}
        <div style={{
          padding:"16px 24px", background:"rgba(255,255,255,0.04)",
          border:"1px solid rgba(255,255,255,0.08)", borderRadius:14,
          display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px 28px", fontSize:13,
          color:"rgba(255,255,255,0.45)", maxWidth:320, width:"100%",
        }}>
          {[
            ["← →","Move"],["↑ / X","Rotate CW"],
            ["Z","Rotate CCW"],["↓","Soft Drop"],
            ["Space","Hard Drop"],["C / Shift","Hold"],
            ["P","Pause"],
          ].map(([k,v])=>(
            <div key={k} style={{ display:"flex", justifyContent:"space-between" }}>
              <span style={{ color:"rgba(255,255,255,0.7)", fontWeight:600 }}>{k}</span>
              <span>{v}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── GAME SCREEN ──────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 50% 0%, #0d0030 0%, #050012 60%, #000008 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 8,
    }}>
      <Link href="/">
        <span style={{ position:"absolute", top:12, left:16, background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, padding:"6px 14px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", zIndex:10 }}>← Menu</span>
      </Link>
      <canvas
        ref={canvasRef}
        width={CVS_W}
        height={CVS_H}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top center",
          imageRendering: "pixelated",
          display: "block",
        }}
      />
    </div>
  );
}
