import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { useRelaySocket } from "../lib/relay-socket";
import { QRCode, buildInviteUrl, getUrlRoomCode } from "../components/QRCode";

// ─── CANVAS / LAYOUT ─────────────────────────────────────────────────────────
const COLS = 10, ROWS = 20;

interface LayoutVars {
  CW: number; CH: number;
  CELL: number; MINI: number; VIS: number;
  LP: number; BX: number; BY: number;
  BW: number; BH: number;
  OX0: number; OBW: number; OBH: number; OW: number;
}

// Mutable layout — recomputed each game-start based on player count
const L: LayoutVars = {
  CW: 790, CH: 460, CELL: 20, MINI: 12, VIS: 17,
  LP: 90, BX: 90, BY: 38, BW: 200, BH: 400,
  OX0: 318, OBW: 120, OBH: 204, OW: 154,
};

// Bigger cells for fewer opponents, fills the screen better
function computeLayout(numBots: number): { cw: number; ch: number } {
  L.CELL = numBots === 1 ? 28 : numBots === 2 ? 24 : 20;
  L.MINI = numBots === 1 ? 18 : numBots === 2 ? 15 : 12;
  L.VIS  = 17;
  L.LP   = 90; L.BX = L.LP; L.BY = 38;
  L.BW   = COLS * L.CELL;
  L.BH   = ROWS * L.CELL;
  L.CH   = L.BH + L.BY + 22;
  L.OX0  = L.BX + L.BW + 28;
  L.OBW  = COLS * L.MINI;
  L.OBH  = L.VIS * L.MINI;
  const slotW = L.OBW + 34;
  L.OW   = slotW;
  L.CW   = L.OX0 + numBots * slotW + 10;
  return { cw: L.CW, ch: L.CH };
}

// ─── TIMING ───────────────────────────────────────────────────────────────────
const LOCK_DELAY  = 500;
const DAS_DELAY   = 150;
const DAS_TICK    = 48;
const CLEAR_ANIM  = 220;
const GRAVITY = [800,720,630,550,470,380,300,215,130,100,80,80,80,70,70,60];
const LINE_PTS    = [0, 100, 300, 500, 800];
const GARBAGE_FOR = [0, 0, 1, 2, 4]; // lines cleared → garbage sent

// ─── AI CONFIG ───────────────────────────────────────────────────────────────
type AIDiff = "easy" | "normal" | "hard";
const AI_THINK_MS: Record<AIDiff, number> = { easy: 720, normal: 400, hard: 190 };
const AI_MOVE_MS:  Record<AIDiff, number> = { easy: 110, normal: 58,  hard: 28  };
const AI_MISTAKE:  Record<AIDiff, number> = { easy: 0.38, normal: 0.12, hard: 0.0 };

// ─── PIECE DATA ───────────────────────────────────────────────────────────────
type Matrix = (0|1)[][];
interface PieceDef { color:string; hi:string; lo:string; matrix:Matrix; spawnCol:number; }

const DEFS: Record<string,PieceDef> = {
  I:{color:"#00e5ff",hi:"#9ffcff",lo:"#006070",matrix:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],spawnCol:3},
  O:{color:"#ffe000",hi:"#fff9bb",lo:"#887700",matrix:[[1,1],[1,1]],spawnCol:4},
  T:{color:"#cc44ff",hi:"#ee9aff",lo:"#5a0099",matrix:[[0,1,0],[1,1,1],[0,0,0]],spawnCol:3},
  S:{color:"#33dd55",hi:"#88ff9a",lo:"#106620",matrix:[[0,1,1],[1,1,0],[0,0,0]],spawnCol:3},
  Z:{color:"#ff3344",hi:"#ff9988",lo:"#881020",matrix:[[1,1,0],[0,1,1],[0,0,0]],spawnCol:3},
  J:{color:"#3399ff",hi:"#88cdff",lo:"#103488",matrix:[[1,0,0],[1,1,1],[0,0,0]],spawnCol:3},
  L:{color:"#ff8833",hi:"#ffbb78",lo:"#883300",matrix:[[0,0,1],[1,1,1],[0,0,0]],spawnCol:3},
};
const TYPES = Object.keys(DEFS);

const KICKS_NORMAL: [number,number][] = [[0,0],[0,-1],[0,1],[0,-2],[0,2],[-1,0]];
const KICKS_I:      [number,number][] = [[0,0],[0,-2],[0,2],[0,-3],[0,3],[0,1],[-1,0]];

// Garbage cell identifier
const GKEY = "__garbage__";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Piece { type:string; matrix:Matrix; row:number; col:number; }
interface Particle { x:number;y:number;vx:number;vy:number;life:number;color:string; }

interface GS {
  board:      string[][];
  cur:        Piece|null;
  held:       string|null;
  holdUsed:   boolean;
  bag:        string[];
  queue:      string[];
  score:      number;
  lines:      number;
  level:      number;
  phase:      "playing"|"dead"|"clearing";
  dropAcc:    number;
  lockAcc:    number|null;
  atBottom:   boolean;
  lockMoves:  number;
  clearRows:  number[];
  clearAcc:   number;
  garbagePending: number;
  particles:  Particle[];
  name:       string;
  color:      string;
}

interface BotState {
  gs:           GS;
  diff:         AIDiff;
  thinkTimer:   number;
  moveTimer:    number;
  targetCol:    number;
  targetRot:    number;
  currentRot:   number;
  decided:      boolean;
}

// Online remote view (what we display for an online player)
interface RemoteView {
  board: string[][];
  score: number;
  lines: number;
  alive: boolean;
  name: string;
}

// ─── BOARD HELPERS ────────────────────────────────────────────────────────────
function rotateCW(m: Matrix): Matrix {
  const R = m.length, C = m[0].length;
  const out: Matrix = Array.from({length:C},()=>new Array(R).fill(0) as (0|1)[]);
  for (let r=0;r<R;r++) for (let c=0;c<C;c++) out[c][R-1-r]=m[r][c];
  return out;
}

function cells(m: Matrix, row:number, col:number): [number,number][] {
  const out:[number,number][] = [];
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

function ghostRow(cur: Piece, board: string[][]): number {
  let r = cur.row;
  while (valid(cur.matrix, r+1, cur.col, board)) r++;
  return r;
}

function emptyBoard(): string[][] {
  return Array.from({length:ROWS},()=>new Array(COLS).fill(""));
}

function newBag(): string[] {
  const b=[...TYPES];
  for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}
  return b;
}

function spawnPiece(type: string): Piece {
  const d=DEFS[type];
  return {type,matrix:d.matrix.map(r=>[...r]) as Matrix,row:-1,col:d.spawnCol};
}

function makeGS(name: string, color: string): GS {
  const bag1=newBag(),bag2=newBag();
  const combined=[...bag1,...bag2];
  const first=combined.shift()!;
  const queue=combined.splice(0,3);
  return {
    board:emptyBoard(),cur:spawnPiece(first),held:null,holdUsed:false,
    bag:combined,queue,score:0,lines:0,level:0,
    phase:"playing",dropAcc:0,lockAcc:null,atBottom:false,lockMoves:0,
    clearRows:[],clearAcc:0,garbagePending:0,particles:[],name,color,
  };
}

function advanceQueue(gs: GS): string {
  if(gs.bag.length<4) gs.bag.push(...newBag());
  const next=gs.queue.shift()!;
  gs.queue.push(gs.bag.shift()!);
  return next;
}

function injectGarbage(gs: GS, count: number) {
  const hole=Math.floor(Math.random()*COLS);
  for(let i=0;i<count;i++){
    const row=new Array(COLS).fill(GKEY);
    row[hole]="";
    gs.board.shift();
    gs.board.push(row);
  }
  // Push current piece up to avoid instant death
  if(gs.cur){
    for(let i=0;i<count;i++){
      if(!valid(gs.cur.matrix,gs.cur.row-1,gs.cur.col,gs.board)) gs.cur.row--;
    }
  }
}

// ─── LOCK / LINE CLEAR ────────────────────────────────────────────────────────
// Returns number of lines cleared (for garbage calculation)
function lockPiece(gs: GS, getNext: ()=>string): number {
  if(!gs.cur) return 0;
  const cs=cells(gs.cur.matrix,gs.cur.row,gs.cur.col);
  if(cs.some(([r])=>r<0)){gs.phase="dead";return 0;}
  for(const [r,c] of cs) gs.board[r][c]=gs.cur.type;

  const cleared:number[]=[];
  for(let r=0;r<ROWS;r++) if(gs.board[r].every(c=>c)) cleared.push(r);

  if(cleared.length>0){
    for(const row of cleared) spawnParticles(row,gs.board,gs.particles);
    gs.clearRows=cleared;gs.clearAcc=0;gs.phase="clearing";
    const pts=LINE_PTS[cleared.length]*(gs.level+1);
    gs.score+=pts;gs.lines+=cleared.length;
    gs.level=Math.floor(gs.lines/10);
    gs.cur=null;
    return cleared.length;
  } else {
    gs.cur=spawnPiece(getNext());
    gs.holdUsed=false;gs.lockAcc=null;gs.atBottom=false;gs.lockMoves=0;
    if(gs.garbagePending>0){injectGarbage(gs,gs.garbagePending);gs.garbagePending=0;}
    return 0;
  }
}

function finishClear(gs: GS, getNext: ()=>string) {
  const cleared=gs.clearRows;
  gs.board=gs.board.filter((_,i)=>!cleared.includes(i));
  while(gs.board.length<ROWS) gs.board.unshift(new Array(COLS).fill(""));
  gs.clearRows=[];gs.clearAcc=0;gs.phase="playing";
  gs.cur=spawnPiece(getNext());
  gs.holdUsed=false;gs.lockAcc=null;gs.atBottom=false;gs.lockMoves=0;
  if(gs.garbagePending>0){injectGarbage(gs,gs.garbagePending);gs.garbagePending=0;}
}

function spawnParticles(rowIdx:number,board:string[][],particles:Particle[]){
  for(let c=0;c<COLS;c++){
    const color=DEFS[board[rowIdx][c]]?.color||"#aaa";
    const px=L.BX+c*L.CELL+L.CELL/2,py=L.BY+rowIdx*L.CELL+L.CELL/2;
    for(let k=0;k<5;k++) particles.push({x:px,y:py,vx:(Math.random()-.5)*7,vy:(Math.random()-.85)*8,life:1,color});
  }
}

// ─── AI ENGINE ────────────────────────────────────────────────────────────────
function evalBoard(board: string[][]): number {
  const h=new Array(COLS).fill(0);
  for(let c=0;c<COLS;c++) for(let r=0;r<ROWS;r++) if(board[r][c]){h[c]=ROWS-r;break;}
  let holes=0;
  for(let c=0;c<COLS;c++){let bl=false;for(let r=0;r<ROWS;r++){if(board[r][c])bl=true;else if(bl)holes++;}}
  let bump=0;
  for(let c=0;c<COLS-1;c++) bump+=Math.abs(h[c]-h[c+1]);
  const totH=h.reduce((a,b)=>a+b,0);
  let clears=0;
  for(let r=0;r<ROWS;r++) if(board[r].every(c=>c)) clears++;
  return -0.51*totH - 0.36*holes - 0.18*bump + 0.76*clears - 0.28*Math.max(...h);
}

function aiBestMove(gs: GS, diff: AIDiff): {rot:number;col:number} {
  if(!gs.cur) return {rot:0,col:0};
  if(Math.random()<AI_MISTAKE[diff]) return {rot:Math.floor(Math.random()*4),col:Math.floor(Math.random()*COLS)};
  const type=gs.cur.type;
  let best=-Infinity,bestMove={rot:0,col:0};
  for(let rot=0;rot<4;rot++){
    let m=DEFS[type].matrix.map(r=>[...r]) as Matrix;
    for(let i=0;i<rot;i++) m=rotateCW(m);
    for(let col=-2;col<COLS+2;col++){
      let row=-2;
      while(valid(m,row+1,col,gs.board)) row++;
      if(row<0) continue;
      const tb=gs.board.map(r=>[...r]);
      for(const [r,c] of cells(m,row,col)) if(r>=0&&r<ROWS&&c>=0&&c<COLS) tb[r][c]=type;
      const s=evalBoard(tb)+(diff==="normal"?(Math.random()-.5)*3:0);
      if(s>best){best=s;bestMove={rot,col};}
    }
  }
  return bestMove;
}

// ─── 3D BLOCK DRAWING ────────────────────────────────────────────────────────
function draw3D(
  ctx: CanvasRenderingContext2D,
  px:number, py:number, size:number,
  color:string, hi:string, lo:string,
  alpha=1,
) {
  if(alpha<=0) return;
  ctx.globalAlpha=alpha;
  const t=Math.max(2,Math.round(size*0.21));

  // Drop shadow
  ctx.fillStyle="rgba(0,0,0,0.32)";
  ctx.fillRect(px+2,py+2,size,size);

  // Main face: diagonal gradient hi→lo
  const g=ctx.createLinearGradient(px,py,px+size,py+size);
  g.addColorStop(0,hi); g.addColorStop(0.55,color); g.addColorStop(1,lo);
  ctx.fillStyle=g;
  ctx.fillRect(px,py,size,size);

  // Top bevel
  ctx.fillStyle=hi;
  ctx.fillRect(px,py,size,t);
  // Left bevel
  ctx.fillRect(px,py,t,size);
  // Bottom bevel
  ctx.fillStyle=lo;
  ctx.fillRect(px,py+size-t,size,t);
  // Right bevel
  ctx.fillRect(px+size-t,py,t,size);

  // Radial shine (top-left corner)
  const sg=ctx.createRadialGradient(px+t+1,py+t+1,0,px+size*0.5,py+size*0.5,size*0.72);
  sg.addColorStop(0,"rgba(255,255,255,0.52)");
  sg.addColorStop(0.45,"rgba(255,255,255,0.12)");
  sg.addColorStop(1,"rgba(255,255,255,0)");
  ctx.fillStyle=sg;
  ctx.fillRect(px+t,py+t,size-t*2,size-t*2);

  ctx.globalAlpha=1;
}

function drawGarbageBlock(ctx: CanvasRenderingContext2D, px:number, py:number, size:number) {
  draw3D(ctx,px,py,size,"#4a4a4a","#777","#222");
  // Diagonal hatch
  ctx.save();
  ctx.globalAlpha=0.18;
  ctx.strokeStyle="#aaa";ctx.lineWidth=1;
  const step=5;
  ctx.beginPath();
  for(let i=0;i<size*2;i+=step){
    ctx.moveTo(px+Math.max(0,i-size),py+Math.min(i,size));
    ctx.lineTo(px+Math.min(i,size),py+Math.max(0,i-size));
  }
  ctx.stroke();
  ctx.restore();
}

function drawBlock(ctx: CanvasRenderingContext2D, px:number, py:number, size:number, type:string, alpha=1) {
  if(type===GKEY){drawGarbageBlock(ctx,px,py,size);return;}
  const d=DEFS[type];
  if(!d) return;
  draw3D(ctx,px,py,size,d.color,d.hi,d.lo,alpha);
}

// ─── BOARD RENDERER (player's full board) ─────────────────────────────────────
function renderPlayerBoard(ctx: CanvasRenderingContext2D, gs: GS, isLocal: boolean) {
  const {board,cur,held,holdUsed,queue,phase,clearRows,clearAcc,particles,garbagePending,color} = gs;

  // ── Background ───────────────────────────────────────────────────────────────
  ctx.fillStyle="#08080f";
  ctx.fillRect(0,0,L.CW,L.CH);

  // Grid lines
  ctx.strokeStyle="rgba(255,255,255,0.035)";ctx.lineWidth=0.5;
  for(let c=0;c<=COLS;c++){ctx.beginPath();ctx.moveTo(L.BX+c*L.CELL,L.BY);ctx.lineTo(L.BX+c*L.CELL,L.BY+L.BH);ctx.stroke();}
  for(let r=0;r<=ROWS;r++){ctx.beginPath();ctx.moveTo(L.BX,L.BY+r*L.CELL);ctx.lineTo(L.BX+L.BW,L.BY+r*L.CELL);ctx.stroke();}

  // Board border glow (player color)
  ctx.save();
  ctx.shadowColor=color;ctx.shadowBlur=18;
  ctx.strokeStyle=color+"66";ctx.lineWidth=1.5;
  ctx.strokeRect(L.BX-0.5,L.BY-0.5,L.BW+1,L.BH+1);
  ctx.restore();

  // ── Board cells ──────────────────────────────────────────────────────────────
  const flashAlpha=clearRows.length>0?Math.max(0,1-clearAcc/CLEAR_ANIM):0;
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      const t=board[r][c];
      if(!t) continue;
      const px=L.BX+c*L.CELL,py=L.BY+r*L.CELL;
      if(clearRows.includes(r)){
        ctx.globalAlpha=flashAlpha;
        ctx.fillStyle="#fff";ctx.fillRect(px+1,py+1,L.CELL-2,L.CELL-2);
        ctx.globalAlpha=1;
      } else {
        drawBlock(ctx,px,py,L.CELL,t);
      }
    }
  }

  // ── Ghost piece ───────────────────────────────────────────────────────────────
  if(cur&&phase==="playing"&&clearRows.length===0){
    const gr=ghostRow(cur,board);
    if(gr!==cur.row){
      const d=DEFS[cur.type];
      ctx.globalAlpha=0.16;ctx.strokeStyle=d.color;ctx.lineWidth=1.5;
      for(const [r,c] of cells(cur.matrix,gr,cur.col)){
        if(r<0) continue;
        ctx.strokeRect(L.BX+c*L.CELL+2,L.BY+r*L.CELL+2,L.CELL-4,L.CELL-4);
      }
      ctx.globalAlpha=1;
    }
  }

  // ── Current piece ─────────────────────────────────────────────────────────────
  if(cur&&clearRows.length===0){
    const d=DEFS[cur.type];
    ctx.save();ctx.shadowColor=d.color;ctx.shadowBlur=14;
    for(const [r,c] of cells(cur.matrix,cur.row,cur.col)){
      if(r<0) continue;
      drawBlock(ctx,L.BX+c*L.CELL,L.BY+r*L.CELL,L.CELL,cur.type);
    }
    ctx.restore();
  }

  // ── Particles ────────────────────────────────────────────────────────────────
  for(const p of particles){
    ctx.globalAlpha=p.life;ctx.fillStyle=p.color;
    ctx.beginPath();ctx.arc(p.x,p.y,3*p.life+1,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;

  // ── Garbage indicator (right of board) ────────────────────────────────────────
  if(garbagePending>0){
    const gw=8,gx=L.BX+L.BW+6;
    const maxG=10,filled=Math.min(garbagePending,maxG);
    const gStep=(L.BH-4)/maxG;
    for(let i=0;i<filled;i++){
      const alpha=0.6+0.4*(i/maxG);
      ctx.fillStyle=`rgba(255,${80-i*6},0,${alpha})`;
      ctx.fillRect(gx,L.BY+L.BH-4-(i+1)*gStep,gw,gStep-1);
    }
    ctx.strokeStyle="rgba(255,80,0,0.6)";ctx.lineWidth=1;
    ctx.strokeRect(gx,L.BY,gw,L.BH);
  }

  // ── LEFT PANEL ────────────────────────────────────────────────────────────────
  const lx=6;
  const label=(t:string,y:number)=>{
    ctx.font="bold 9px 'Segoe UI',sans-serif";ctx.letterSpacing="1px";
    ctx.fillStyle="rgba(255,255,255,0.3)";ctx.fillText(t,lx,y);ctx.letterSpacing="0px";
  };
  const val=(t:string,y:number,col="rgba(255,255,255,0.88)")=>{
    ctx.font="bold 16px 'Segoe UI',sans-serif";ctx.fillStyle=col;ctx.fillText(t,lx,y);
  };

  label("HOLD",22);
  ctx.strokeStyle=holdUsed?"rgba(255,255,255,0.08)":"rgba(255,255,255,0.25)";
  ctx.lineWidth=1;ctx.strokeRect(lx,26,74,54);
  if(held){
    ctx.globalAlpha=holdUsed?0.35:1;
    drawMiniPiece(ctx,held,lx+37,53,14);
    ctx.globalAlpha=1;
  }

  label("SCORE",98);val(String(gs.score).padStart(7,"0"),116,"#ffd700");
  label("BEST",128);
  label("LEVEL",148);val(String(gs.level+1),166,color);
  label("LINES",178);val(String(gs.lines),196,"#00e5ff");

  label("NEXT",222);
  for(let i=0;i<Math.min(3,queue.length);i++){
    ctx.strokeStyle="rgba(255,255,255,0.12)";ctx.lineWidth=1;
    ctx.strokeRect(lx,228+i*66,74,60);
    drawMiniPiece(ctx,queue[i],lx+37,258+i*66,i===0?14:12);
  }

  // ── Dead overlay ──────────────────────────────────────────────────────────────
  if(phase==="dead"){
    ctx.fillStyle="rgba(0,0,0,0.75)";ctx.fillRect(L.BX,L.BY,L.BW,L.BH);
    ctx.textAlign="center";
    ctx.fillStyle="#ff4757";ctx.font="bold 26px 'Segoe UI',sans-serif";
    ctx.fillText("DEFEATED",L.BX+L.BW/2,L.BY+L.BH/2);
    ctx.textAlign="left";
  }
  void isLocal;
}

function drawMiniPiece(ctx: CanvasRenderingContext2D, type:string, cx:number, cy:number, sz:number) {
  const d=DEFS[type];if(!d) return;
  const m=d.matrix;
  let minR=99,maxR=0,minC=99,maxC=0;
  for(let r=0;r<m.length;r++) for(let c=0;c<m[r].length;c++) if(m[r][c]){
    minR=Math.min(minR,r);maxR=Math.max(maxR,r);minC=Math.min(minC,c);maxC=Math.max(maxC,c);
  }
  const w=(maxC-minC+1)*sz,h=(maxR-minR+1)*sz;
  const ox=cx-w/2,oy=cy-h/2;
  for(let r=minR;r<=maxR;r++) for(let c=minC;c<=maxC;c++) if(m[r][c])
    drawBlock(ctx,Math.floor(ox+(c-minC)*sz),Math.floor(oy+(r-minR)*sz),sz,type);
}

// ─── OPPONENT MINI BOARD ──────────────────────────────────────────────────────
function renderOpponent(
  ctx: CanvasRenderingContext2D,
  board: string[][], score:number, lines:number, alive:boolean,
  name:string, oColor:string, slotIdx:number, pending=0,
) {
  const ox=L.OX0+slotIdx*L.OW+(L.OW-L.OBW)/2;
  const oy=90;

  // Name
  ctx.font="bold 11px 'Segoe UI',sans-serif";
  ctx.textAlign="center";
  ctx.fillStyle=alive?oColor:"rgba(255,255,255,0.3)";
  ctx.fillText(name,ox+L.OBW/2,oy-6);

  // Board background
  ctx.fillStyle="rgba(255,255,255,0.04)";
  ctx.fillRect(ox,oy,L.OBW,L.OBH);

  // Glow border
  ctx.save();
  ctx.shadowColor=alive?oColor:"#333";ctx.shadowBlur=10;
  ctx.strokeStyle=(alive?oColor:"#333")+"55";ctx.lineWidth=1.2;
  ctx.strokeRect(ox-0.5,oy-0.5,L.OBW+1,L.OBH+1);
  ctx.restore();

  // Draw visible rows (bottom VIS rows of board)
  const rowOffset=ROWS-L.VIS;
  for(let r=0;r<L.VIS;r++){
    const br=r+rowOffset;
    for(let c=0;c<COLS;c++){
      const t=board[br]?.[c];
      if(!t) continue;
      drawBlock(ctx,ox+c*L.MINI,oy+r*L.MINI,L.MINI,t);
    }
  }

  // Pending garbage warning bar
  if(pending>0){
    const gw=5;
    for(let i=0;i<Math.min(pending,8);i++){
      ctx.fillStyle=`rgba(255,${90-i*10},0,0.8)`;
      ctx.fillRect(ox-gw-2,oy+L.OBH-(i+1)*(L.OBH/8),gw,L.OBH/8-1);
    }
  }

  // Stats
  ctx.font="10px 'Segoe UI',sans-serif";
  ctx.fillStyle="rgba(255,255,255,0.4)";
  ctx.fillText(`${score} pts · ${lines}L`,ox+L.OBW/2,oy+L.OBH+14);

  if(!alive){
    ctx.fillStyle="rgba(0,0,0,0.7)";ctx.fillRect(ox,oy,L.OBW,L.OBH);
    ctx.font="bold 13px 'Segoe UI',sans-serif";ctx.fillStyle="#ff4757";
    ctx.fillText("DEAD",ox+L.OBW/2,oy+L.OBH/2+5);
  }
  ctx.textAlign="left";
}

// ─── GAME STEP ────────────────────────────────────────────────────────────────
interface InputFlags {
  left:boolean;right:boolean;rotate:boolean;rotateCCW:boolean;
  softDrop:boolean;hardDrop:boolean;hold:boolean;
}

// Returns lines cleared count
function stepGS(gs: GS, dt: number, inp: InputFlags, getNext:()=>string): number {
  if(gs.phase==="dead") return 0;

  // Clearing animation
  if(gs.phase==="clearing"){
    gs.clearAcc+=dt;
    updateParticles(gs,dt);
    if(gs.clearAcc>=CLEAR_ANIM) finishClear(gs,getNext);
    return 0;
  }

  // Rotate
  if(inp.rotate)  doRotate(gs,1);
  if(inp.rotateCCW) doRotate(gs,-1);
  if(inp.hold)    doHold(gs,getNext);

  // Move (DAS is handled by caller — just accept left/right booleans)
  if(inp.left)  doMove(gs,-1);
  if(inp.right) doMove(gs,1);

  // Gravity
  if(gs.cur){
    const speed=GRAVITY[Math.min(gs.level,GRAVITY.length-1)];
    const effSpeed=inp.softDrop?Math.min(speed,50):speed;
    gs.dropAcc+=dt;
    while(gs.dropAcc>=effSpeed){
      gs.dropAcc-=effSpeed;
      if(valid(gs.cur.matrix,gs.cur.row+1,gs.cur.col,gs.board)){
        gs.cur.row++;gs.atBottom=false;
      } else {gs.atBottom=true;break;}
    }
    if(gs.atBottom){
      gs.lockAcc=(gs.lockAcc??0)+dt;
      if(gs.lockAcc>=LOCK_DELAY||gs.lockMoves>=15){
        if(inp.hardDrop) doHardDrop(gs,getNext);
        else return lockPiece(gs,getNext);
      }
    } else gs.lockAcc=null;
    if(inp.hardDrop){doHardDrop(gs,getNext);return 0;}
  }

  updateParticles(gs,dt);
  return 0;
}

function doRotate(gs:GS,dir:1|-1){
  if(!gs.cur) return;
  let m=gs.cur.matrix;
  const times=dir===1?1:3;
  for(let i=0;i<times;i++) m=rotateCW(m);
  const kicks=gs.cur.type==="I"?KICKS_I:KICKS_NORMAL;
  for(const [dr,dc] of kicks){
    if(valid(m,gs.cur.row+dr,gs.cur.col+dc,gs.board)){
      gs.cur.matrix=m;gs.cur.row+=dr;gs.cur.col+=dc;
      if(gs.atBottom){gs.lockAcc=0;gs.lockMoves++;}
      return;
    }
  }
}

function doMove(gs:GS,dc:number){
  if(!gs.cur) return;
  if(valid(gs.cur.matrix,gs.cur.row,gs.cur.col+dc,gs.board)){
    gs.cur.col+=dc;
    if(gs.atBottom){gs.lockAcc=0;gs.lockMoves++;}
  }
}

function doHardDrop(gs:GS,getNext:()=>string){
  if(!gs.cur) return;
  let dropped=0;
  while(valid(gs.cur.matrix,gs.cur.row+1,gs.cur.col,gs.board)){gs.cur.row++;dropped++;}
  gs.score+=dropped*2;
  lockPiece(gs,getNext);
  gs.lockAcc=null;gs.dropAcc=0;
}

function doHold(gs:GS,getNext:()=>string){
  if(!gs.cur||gs.holdUsed) return;
  const t=gs.cur.type;
  if(gs.held){gs.cur=spawnPiece(gs.held);gs.held=t;}
  else{gs.held=t;gs.cur=spawnPiece(getNext());}
  gs.holdUsed=true;gs.atBottom=false;gs.lockAcc=null;gs.lockMoves=0;
}

function updateParticles(gs:GS,dt:number){
  const f=dt/16;
  for(const p of gs.particles){p.x+=p.vx*f;p.y+=p.vy*f;p.vy+=0.4*f;p.life-=0.045*f;}
  gs.particles=gs.particles.filter(p=>p.life>0);
}

// ─── AI STEP ──────────────────────────────────────────────────────────────────
function stepBot(bot: BotState, dt:number, sendGarbage:(n:number)=>void) {
  const gs=bot.gs;
  if(gs.phase==="dead") return;
  if(gs.phase==="clearing"){
    gs.clearAcc+=dt;
    updateParticles(gs,dt);
    if(gs.clearAcc>=CLEAR_ANIM) finishClear(gs,()=>advanceQueue(gs));
    return;
  }
  if(!gs.cur) return;

  // Think phase
  bot.thinkTimer-=dt;
  if(bot.thinkTimer<=0&&!bot.decided){
    const mv=aiBestMove(gs,bot.diff);
    bot.targetRot=mv.rot;bot.targetCol=mv.col;
    bot.currentRot=0;bot.decided=true;
    bot.thinkTimer=AI_THINK_MS[bot.diff];
  }

  // Execute phase: rotate then move then drop
  bot.moveTimer-=dt;
  if(bot.moveTimer<=0&&bot.decided){
    bot.moveTimer=AI_MOVE_MS[bot.diff];
    // Rotate
    if(bot.currentRot<bot.targetRot){
      doRotate(gs,1);bot.currentRot++;
    } else {
      // Move toward target column
      if(gs.cur.col<bot.targetCol) doMove(gs,1);
      else if(gs.cur.col>bot.targetCol) doMove(gs,-1);
      else {
        // Hard drop
        doHardDrop(gs,()=>advanceQueue(gs));
        const cleared=gs.clearRows.length;
        if(cleared>0){
          const g=GARBAGE_FOR[Math.min(cleared,4)];
          if(g>0) sendGarbage(g);
        }
        bot.decided=false;bot.thinkTimer=AI_THINK_MS[bot.diff];
      }
    }
  }

  // Gravity still applies
  const speed=GRAVITY[Math.min(gs.level,GRAVITY.length-1)];
  gs.dropAcc+=dt;
  while(gs.dropAcc>=speed){
    gs.dropAcc-=speed;
    if(gs.cur&&valid(gs.cur.matrix,gs.cur.row+1,gs.cur.col,gs.board)) gs.cur.row++;
    else break;
  }

  updateParticles(gs,dt);
}

// ─── ONLINE MESSAGE TYPES ──────────────────────────────────────────────────────
interface OnlineMsg {
  kind: "state"|"garbage"|"ready";
  board?: string[][];score?:number;lines?:number;alive?:boolean;level?:number;
  ai0?: {board:string[][];score:number;lines:number;alive:boolean};
  ai1?: {board:string[][];score:number;lines:number;alive:boolean};
  count?: number;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
type Screen = "menu"|"setup"|"game"|"results";
type Mode = "solo"|"online";

const BOT_COLORS = ["#f472b6","#34d399","#fbbf24","#a78bfa"];
const BOT_NAMES  = ["ARIA","BLAZE","NOVA","ECHO"];

interface GameRef {
  player:   GS;
  bots:     BotState[];
  onlineOpponent?: RemoteView;  // for online mode
  keys:     Set<string>;
  dasDir:   number; dasDelay:number; dasTick:number;
  prevTime: number;
  broadcastTimer: number;
  guestGarbagePending: number; // garbage to add to online opponent next frame
}

function JoinInput({ initialCode, onJoin, disabled }: { initialCode: string; onJoin: (code: string) => void; disabled: boolean }) {
  const [code, setCode] = useState(initialCode);
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
        maxLength={4}
        placeholder="ROOM CODE"
        style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 16, fontWeight: 700, outline: "none", letterSpacing: 4, textTransform: "uppercase" }}
      />
      <button
        onClick={() => code.length === 4 && onJoin(code)}
        disabled={disabled || code.length !== 4}
        style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: disabled || code.length !== 4 ? "not-allowed" : "pointer", opacity: disabled || code.length !== 4 ? 0.4 : 1 }}
      >
        Join
      </button>
    </div>
  );
}

export default function TetrisRoyale() {
  const cvRef     = useRef<HTMLCanvasElement>(null);
  const gameRef   = useRef<GameRef|null>(null);
  const rafRef    = useRef(0);
  const hardRef   = useRef(false); // space held guard
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);

  const [screen,    setScreen]    = useState<Screen>(() => getUrlRoomCode() ? "setup" : "menu");
  const [mode,      setMode]      = useState<Mode>("solo");
  const [numBots,   setNumBots]   = useState(3);
  const [botDiff,   setBotDiff]   = useState<AIDiff>("normal");
  const [winner,    setWinner]    = useState("");
  const [playerName,setPlayerName]= useState("YOU");

  // Online state mirror (for re-render triggers)
  const [olStatus,  setOlStatus]  = useState("");
  const [roomCode,  setRoomCode]  = useState("");

  // ── Relay socket ─────────────────────────────────────────────────────────────
  const relay = useRelaySocket("tetris-royale", {
    onRoomCreated: (code) => { setRoomCode(code); setOlStatus("Waiting for opponent…"); },
    onRoomJoined:  (code) => { setRoomCode(code); setOlStatus("Connected! Starting…"); setTimeout(()=>startOnlineGame("guest"),400); },
    onOpponentJoined: () => { setOlStatus("Opponent joined! Starting…"); setTimeout(()=>startOnlineGame("host"),400); },
    onMessage: (raw) => {
      const msg=raw as OnlineMsg;
      const g=gameRef.current;if(!g) return;
      if(msg.kind==="ready") return;
      if(msg.kind==="garbage"&&typeof msg.count==="number"){
        g.player.garbagePending+=msg.count;
      }
      if(msg.kind==="state"){
        g.onlineOpponent={
          board: (msg.board??[]) as string[][],
          score: msg.score??0,
          lines: msg.lines??0,
          alive: msg.alive??true,
          name: "OPPONENT",
        };
        // If host sent AI states, update bot views
        if(msg.ai0&&g.bots[0]) {
          g.bots[0].gs.board=msg.ai0.board as string[][];
          g.bots[0].gs.score=msg.ai0.score;
          g.bots[0].gs.lines=msg.ai0.lines;
        }
        if(msg.ai1&&g.bots[1]) {
          g.bots[1].gs.board=msg.ai1.board as string[][];
          g.bots[1].gs.score=msg.ai1.score;
          g.bots[1].gs.lines=msg.ai1.lines;
        }
      }
    },
    onOpponentLeft: () => { setOlStatus("Opponent left."); setWinner("You (opponent disconnected)"); setScreen("results"); },
  });

  // ── Init helpers ─────────────────────────────────────────────────────────────
  const makeBot = useCallback((i:number, diff:AIDiff): BotState => ({
    gs: makeGS(BOT_NAMES[i], BOT_COLORS[i]),
    diff,
    thinkTimer: AI_THINK_MS[diff]*Math.random(),
    moveTimer: 0,
    targetCol: 4,
    targetRot: 0,
    currentRot: 0,
    decided: false,
  }), []);

  const startSoloGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const sz=computeLayout(numBots);
    setCanvasSize(sz);
    const bots:BotState[]=[];
    for(let i=0;i<numBots;i++) bots.push(makeBot(i,botDiff));
    gameRef.current={
      player: makeGS(playerName||"YOU","#ef4444"),
      bots,
      keys: new Set(),
      dasDir:0,dasDelay:0,dasTick:0,
      prevTime:0,
      broadcastTimer:0,
      guestGarbagePending:0,
    };
    setScreen("game");
  }, [numBots,botDiff,playerName,makeBot]);

  const startOnlineGame = useCallback((myRole:"host"|"guest") => {
    cancelAnimationFrame(rafRef.current);
    setCanvasSize(computeLayout(3));
    // Always 2 AI bots in online mode
    const bots:BotState[]=[makeBot(0,botDiff),makeBot(1,botDiff)];
    gameRef.current={
      player: makeGS(playerName||"YOU","#ef4444"),
      bots: myRole==="host"?bots:[], // host runs AI, guest just has display bots
      onlineOpponent:{board:emptyBoard(),score:0,lines:0,alive:true,name:"OPPONENT"},
      keys: new Set(),
      dasDir:0,dasDelay:0,dasTick:0,
      prevTime:0,
      broadcastTimer:0,
      guestGarbagePending:0,
    };
    // Guest gets display-only empty bots
    if(myRole==="guest"){
      gameRef.current!.bots=[makeBot(0,botDiff),makeBot(1,botDiff)];
      // Guest bots are display-only (overwritten by host state updates)
    }
    setScreen("game");
    relay.send({kind:"ready"} as unknown);
  }, [botDiff,playerName,makeBot,relay]);

  // ── Game loop ─────────────────────────────────────────────────────────────────
  const loop = useCallback((time:number) => {
    const g=gameRef.current;
    const canvas=cvRef.current;
    if(!g||!canvas){rafRef.current=requestAnimationFrame(loop);return;}
    if(pausedRef.current){rafRef.current=requestAnimationFrame(loop);return;}
    const ctx=canvas.getContext("2d")!;

    const dt=Math.min(time-g.prevTime,50);
    g.prevTime=time;

    const k=g.keys;
    const isOnline=mode==="online";
    const isHost=relay.role==="host";

    // ── DAS ─────────────────────────────────────────────────────────────────────
    const lHeld=k.has("ArrowLeft")||k.has("a");
    const rHeld=k.has("ArrowRight")||k.has("d");
    const curDir=rHeld?1:lHeld?-1:0;
    let moveLeft=false,moveRight=false;
    if(curDir!==0){
      if(g.dasDir!==curDir){g.dasDir=curDir;g.dasDelay=0;g.dasTick=0;if(curDir===-1)moveLeft=true;else moveRight=true;}
      else{
        g.dasDelay+=dt;
        if(g.dasDelay>=DAS_DELAY){
          g.dasTick+=dt;
          while(g.dasTick>=DAS_TICK){g.dasTick-=DAS_TICK;if(curDir===-1)moveLeft=true;else moveRight=true;}
        }
      }
    } else g.dasDir=0;

    const inp:InputFlags={
      left:moveLeft,right:moveRight,
      rotate:false,rotateCCW:false,
      softDrop:k.has("ArrowDown")||k.has("s"),
      hardDrop:false,hold:false,
    };

    // ── Player step ───────────────────────────────────────────────────────────
    if(g.player.phase!=="dead"){
      const cleared=stepGS(g.player,dt,inp,()=>advanceQueue(g.player));
      if(cleared>0){
        const garbage=GARBAGE_FOR[Math.min(cleared,4)];
        if(garbage>0){
          if(isOnline){
            // Online: always hit the real opponent so garbage never gets "lost" to a bot roll
            if(g.onlineOpponent?.alive) relay.send({kind:"garbage",count:garbage} as unknown);
            // Host also owns the bots — randomly ping one of the alive bots too
            if(isHost){
              const aliveBots=g.bots.filter(b=>b.gs.phase!=="dead");
              if(aliveBots.length>0) aliveBots[Math.floor(Math.random()*aliveBots.length)].gs.garbagePending+=garbage;
            }
          } else {
            // Offline: existing behaviour — pick one random alive bot target
            const targets:[string,()=>void][]=[];
            for(let i=0;i<g.bots.length;i++){
              if(g.bots[i].gs.phase!=="dead") targets.push([`bot${i}`,()=>{g.bots[i].gs.garbagePending+=garbage;}]);
            }
            if(targets.length>0){const pick=targets[Math.floor(Math.random()*targets.length)];pick[1]();}
          }
        }
      }
    }

    // ── Bot steps (host always runs bots; guest only in offline) ──────────────
    if(!isOnline||isHost){
      for(const bot of g.bots){
        if(bot.gs.phase==="dead") continue;
        stepBot(bot,dt,(n)=>{
          // Bot sends garbage to player and maybe other bots
          g.player.garbagePending+=n;
          if(isOnline) relay.send({kind:"garbage",count:n} as unknown);
        });
      }
    }

    // ── Online broadcast (host sends state every ~80ms) ──────────────────────
    if(isOnline){
      g.broadcastTimer+=dt;
      if(g.broadcastTimer>=80){
        g.broadcastTimer=0;
        const msg:OnlineMsg={
          kind:"state",
          board:g.player.board,score:g.player.score,lines:g.player.lines,
          alive:g.player.phase!=="dead",level:g.player.level,
        };
        if(isHost&&g.bots.length>=2){
          msg.ai0={board:g.bots[0].gs.board,score:g.bots[0].gs.score,lines:g.bots[0].gs.lines,alive:g.bots[0].gs.phase!=="dead"};
          msg.ai1={board:g.bots[1].gs.board,score:g.bots[1].gs.score,lines:g.bots[1].gs.lines,alive:g.bots[1].gs.phase!=="dead"};
        }
        relay.send(msg as unknown);
      }
    }

    // ── Check game over ────────────────────────────────────────────────────────
    const playerAlive=g.player.phase!=="dead";
    const botsAlive=g.bots.filter(b=>b.gs.phase!=="dead").length;
    const onlineAlive=isOnline?(g.onlineOpponent?.alive??true):0;
    const totalAlive=(playerAlive?1:0)+botsAlive+(isOnline?(onlineAlive?1:0):0);

    if(!playerAlive&&totalAlive===0) endGame(g,"DRAW");
    else if(!playerAlive&&totalAlive===1&&!isOnline){
      const survivor=g.bots.find(b=>b.gs.phase!=="dead");
      if(survivor) endGame(g,survivor.gs.name);
    } else if(playerAlive&&totalAlive===1) endGame(g,g.player.name);

    // ── Render ────────────────────────────────────────────────────────────────
    renderPlayerBoard(ctx,g.player,true);

    // Render opponents
    const opps:{board:string[][];score:number;lines:number;alive:boolean;name:string;color:string;pending:number}[]=[];
    for(const bot of g.bots){
      opps.push({board:bot.gs.board,score:bot.gs.score,lines:bot.gs.lines,alive:bot.gs.phase!=="dead",name:bot.gs.name,color:bot.gs.color,pending:bot.gs.garbagePending});
    }
    if(isOnline&&g.onlineOpponent){
      opps.unshift({board:g.onlineOpponent.board,score:g.onlineOpponent.score,lines:g.onlineOpponent.lines,alive:g.onlineOpponent.alive,name:"OPPONENT",color:"#22d3ee",pending:0});
    }
    const oppCount=isOnline?3:g.bots.length;
    while(opps.length<oppCount) opps.push({board:emptyBoard(),score:0,lines:0,alive:false,name:"—",color:"#444",pending:0});

    for(let i=0;i<oppCount;i++){
      const o=opps[i];
      renderOpponent(ctx,o.board,o.score,o.lines,o.alive,o.name,o.color,i,o.pending);
    }

    // Divider
    ctx.fillStyle="rgba(255,255,255,0.06)";ctx.fillRect(L.OX0-6,0,2,L.CH);

    // Top bar (game title + player label)
    ctx.fillStyle="rgba(0,0,0,0.55)";ctx.fillRect(0,0,L.CW,36);
    ctx.font="bold 13px 'Segoe UI',sans-serif";ctx.textAlign="left";
    ctx.fillStyle=g.player.color;ctx.fillText(`⬛ ${g.player.name}`,L.BX,22);
    ctx.font="bold 11px 'Segoe UI',sans-serif";
    ctx.fillStyle="rgba(255,255,255,0.28)";ctx.fillText("TETRIS ROYALE",L.CW/2-50,22);
    ctx.textAlign="right";
    ctx.fillStyle="rgba(255,255,255,0.18)";ctx.font="9px 'Segoe UI',sans-serif";
    ctx.fillText(isOnline?`Room ${roomCode}`:"vs AI",L.CW-8,22);
    ctx.textAlign="left";

    rafRef.current=requestAnimationFrame(loop);
  }, [mode,relay,roomCode]);

  function endGame(g:GameRef,win:string){
    cancelAnimationFrame(rafRef.current);
    setWinner(win);setScreen("results");
    if(relay.status==="connected") relay.disconnect();
    void g;
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────────
  useEffect(()=>{
    if(screen!=="game") return;
    const kd=(e:KeyboardEvent)=>{
      const g=gameRef.current;if(!g) return;
      if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();
      if(e.key==="p"||e.key==="P"){pausedRef.current=!pausedRef.current;setPaused(pausedRef.current);return;}
      g.keys.add(e.key);
      const gs=g.player;if(gs.phase!=="playing") return;
      switch(e.key){
        case "ArrowUp":case "x":case "X":doRotate(gs,1);break;
        case "z":case "Z":doRotate(gs,-1);break;
        case " ":
          if(!hardRef.current){hardRef.current=true;doHardDrop(gs,()=>advanceQueue(gs));}
          break;
        case "c":case "C":case "Shift":doHold(gs,()=>advanceQueue(gs));break;
        case "ArrowLeft":
          g.dasDir=-1;g.dasDelay=0;g.dasTick=0;doMove(gs,-1);break;
        case "ArrowRight":
          g.dasDir=1;g.dasDelay=0;g.dasTick=0;doMove(gs,1);break;
      }
    };
    const ku=(e:KeyboardEvent)=>{
      gameRef.current?.keys.delete(e.key);
      if(e.key===" ") hardRef.current=false;
      if(e.key==="ArrowLeft"||e.key==="ArrowRight") if(gameRef.current) gameRef.current.dasDir=0;
    };
    window.addEventListener("keydown",kd);
    window.addEventListener("keyup",ku);
    return()=>{window.removeEventListener("keydown",kd);window.removeEventListener("keyup",ku);};
  },[screen]);

  // ── Start loop when game starts ──────────────────────────────────────────────
  useEffect(()=>{
    if(screen!=="game") return;
    gameRef.current && (gameRef.current.prevTime=performance.now());
    rafRef.current=requestAnimationFrame(loop);
    return()=>cancelAnimationFrame(rafRef.current);
  },[screen,loop]);

  // ── Canvas size state (updated per game-start based on numBots) ──────────────
  const [canvasSize,setCanvasSize]=useState({cw:L.CW,ch:L.CH});

  // ── Responsive canvas scale ──────────────────────────────────────────────────
  const [scale,setScale]=useState(1);
  useEffect(()=>{
    const upd=()=>setScale(Math.min(1,(window.innerWidth-16)/canvasSize.cw,(window.innerHeight-80)/canvasSize.ch));
    upd();window.addEventListener("resize",upd);return()=>window.removeEventListener("resize",upd);
  },[canvasSize.cw,canvasSize.ch]);

  // ─── SCREENS ──────────────────────────────────────────────────────────────────
  const S: React.CSSProperties={minHeight:"100vh",background:"radial-gradient(ellipse at 50% 0%, #0d0030 0%, #050012 60%, #000008 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"#fff",fontFamily:"'Segoe UI',sans-serif",padding:24,userSelect:"none"};
  const Btn=(p:{children:React.ReactNode;onClick:()=>void;style?:React.CSSProperties;disabled?:boolean})=>(
    <button onClick={p.onClick} disabled={p.disabled} style={{padding:"12px 32px",fontSize:15,fontWeight:800,letterSpacing:1,border:"none",borderRadius:14,color:"#fff",cursor:p.disabled?"not-allowed":"pointer",opacity:p.disabled?0.5:1,...p.style}}>{p.children}</button>
  );

  if(screen==="menu") return (
    <div style={S}>
      <Link href="/"><span style={{position:"absolute",top:16,left:20,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,padding:"6px 14px",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>← Menu</span></Link>
      <div style={{fontSize:52,filter:"drop-shadow(0 0 24px #818cf8)",marginBottom:8}}>⬛</div>
      <h1 style={{fontSize:48,fontWeight:900,letterSpacing:-2,margin:"0 0 4px",background:"linear-gradient(135deg,#818cf8 0%,#c084fc 50%,#f472b6 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>TETRIS ROYALE</h1>
      <p style={{color:"rgba(255,255,255,0.35)",marginBottom:36,fontSize:13}}>Last stack standing wins · Eliminate opponents with garbage lines</p>
      <div style={{display:"flex",flexDirection:"column",gap:12,width:"100%",maxWidth:320}}>
        <Btn onClick={()=>{setMode("solo");setScreen("setup");}} style={{background:"linear-gradient(135deg,#6d28d9,#4f46e5)"}}>🤖 vs AI Bots</Btn>
        <Btn onClick={()=>{setMode("online");setScreen("setup");}} style={{background:"linear-gradient(135deg,#0369a1,#0891b2)"}}>🌐 Online 2P + AI</Btn>
      </div>
      <div style={{marginTop:32,display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 24px",fontSize:12,color:"rgba(255,255,255,0.35)",maxWidth:300}}>
        {[["← →","Move"],["↑ X","Rotate CW"],["Z","Rotate CCW"],["↓","Soft Drop"],["Space","Hard Drop"],["C / Shift","Hold"]].map(([k,v])=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"rgba(255,255,255,0.6)",fontWeight:600}}>{k}</span><span>{v}</span></div>
        ))}
      </div>
    </div>
  );

  if(screen==="setup") return (
    <div style={S}>
      <Link href="/"><span style={{position:"absolute",top:16,left:20,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,padding:"6px 14px",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>← Menu</span></Link>
      <h2 style={{fontSize:28,fontWeight:900,marginBottom:28,color:"#c084fc"}}>{mode==="solo"?"Setup vs AI":"Online Setup"}</h2>
      <div style={{display:"flex",flexDirection:"column",gap:18,width:"100%",maxWidth:340}}>
        <label style={{display:"flex",flexDirection:"column",gap:6}}>
          <span style={{fontSize:12,color:"rgba(255,255,255,0.4)",fontWeight:700,letterSpacing:1}}>YOUR NAME</span>
          <input value={playerName} onChange={e=>setPlayerName(e.target.value.slice(0,8).toUpperCase())} maxLength={8}
            style={{padding:"10px 14px",borderRadius:10,border:"1px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.06)",color:"#fff",fontSize:16,fontWeight:700,outline:"none"}} />
        </label>
        {mode==="solo"&&(
          <label style={{display:"flex",flexDirection:"column",gap:6}}>
            <span style={{fontSize:12,color:"rgba(255,255,255,0.4)",fontWeight:700,letterSpacing:1}}>AI OPPONENTS</span>
            <div style={{display:"flex",gap:8}}>
              {[1,2,3].map(n=>(
                <button key={n} onClick={()=>setNumBots(n)}
                  style={{flex:1,padding:"10px 0",borderRadius:10,border:`1px solid ${numBots===n?"#c084fc":"rgba(255,255,255,0.1)"}`,
                  background:numBots===n?"rgba(192,132,252,0.2)":"rgba(255,255,255,0.04)",color:numBots===n?"#c084fc":"rgba(255,255,255,0.5)",
                  cursor:"pointer",fontWeight:700,fontSize:16}}>{n}</button>
              ))}
            </div>
          </label>
        )}
        <label style={{display:"flex",flexDirection:"column",gap:6}}>
          <span style={{fontSize:12,color:"rgba(255,255,255,0.4)",fontWeight:700,letterSpacing:1}}>AI DIFFICULTY</span>
          <div style={{display:"flex",gap:8}}>
            {(["easy","normal","hard"] as AIDiff[]).map(d=>{
              const col=d==="easy"?"#34d399":d==="normal"?"#fbbf24":"#ef4444";
              return (<button key={d} onClick={()=>setBotDiff(d)}
                style={{flex:1,padding:"10px 0",borderRadius:10,border:`1px solid ${botDiff===d?col:"rgba(255,255,255,0.1)"}`,
                background:botDiff===d?col+"33":"rgba(255,255,255,0.04)",color:botDiff===d?col:"rgba(255,255,255,0.5)",
                cursor:"pointer",fontWeight:700,fontSize:13,textTransform:"capitalize"}}>{d}</button>);
            })}
          </div>
        </label>

        {mode==="solo"?(
          <Btn onClick={startSoloGame} style={{marginTop:8,background:"linear-gradient(135deg,#7c3aed,#4f46e5)",fontSize:17}}>▶ Start Game</Btn>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:8}}>
            <Btn onClick={()=>relay.createRoom()} style={{background:"linear-gradient(135deg,#0369a1,#0891b2)"}} disabled={relay.status==="connecting"||relay.status==="waiting"}>🏠 Create Room</Btn>
            <JoinInput initialCode={getUrlRoomCode()} onJoin={(code)=>relay.joinRoom(code)} disabled={relay.status==="connecting"} />
            {roomCode&&(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
                <div style={{textAlign:"center",padding:"10px 0",fontSize:22,fontWeight:900,letterSpacing:6,color:"#c084fc"}}>📋 {roomCode}</div>
                <div style={{padding:"8px",background:"#fff",borderRadius:12}}>
                  <QRCode value={buildInviteUrl(roomCode)} size={120} />
                </div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.3)"}}>Scan to join instantly</div>
              </div>
            )}
            {olStatus&&<div style={{textAlign:"center",color:"rgba(255,255,255,0.5)",fontSize:13}}>{olStatus}</div>}
          </div>
        )}
        <button onClick={()=>setScreen("menu")} style={{marginTop:4,background:"none",border:"none",color:"rgba(255,255,255,0.25)",cursor:"pointer",fontSize:13}}>← Back</button>
      </div>
    </div>
  );

  if(screen==="results") return (
    <div style={S}>
      <Link href="/"><span style={{position:"absolute",top:16,left:20,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,padding:"6px 14px",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>← Menu</span></Link>
      <div style={{fontSize:64,marginBottom:16}}>🏆</div>
      <h2 style={{fontSize:36,fontWeight:900,color:"#ffd700",marginBottom:8}}>{winner} Wins!</h2>
      <p style={{color:"rgba(255,255,255,0.4)",marginBottom:32,fontSize:14}}>
        {gameRef.current?`Your score: ${gameRef.current.player.score} · Lines: ${gameRef.current.player.lines}`:""}
      </p>
      <div style={{display:"flex",gap:12}}>
        <Btn onClick={()=>{if(mode==="solo")startSoloGame();else setScreen("setup");}} style={{background:"linear-gradient(135deg,#7c3aed,#4f46e5)"}}>Play Again</Btn>
        <Btn onClick={()=>setScreen("menu")} style={{background:"rgba(255,255,255,0.08)"}}>Menu</Btn>
      </div>
    </div>
  );

  // GAME screen
  return (
    <div style={{minHeight:"100vh",background:"#02020a",display:"flex",alignItems:"center",justifyContent:"center",padding:8,position:"relative"}}>
      <Link href="/"><span style={{position:"absolute",top:12,left:16,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,padding:"6px 14px",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",zIndex:10}}>← Menu</span></Link>
      <canvas ref={cvRef} width={canvasSize.cw} height={canvasSize.ch}
        style={{transform:`scale(${scale})`,transformOrigin:"top center",display:"block",imageRendering:"pixelated"}} />
      {paused && (
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.7)",gap:16,zIndex:20}}>
          <div style={{fontSize:64}}>⏸</div>
          <h2 style={{fontSize:40,fontWeight:900,color:"#fff",margin:0}}>PAUSED</h2>
          <p style={{color:"rgba(255,255,255,0.5)",fontSize:14,margin:0}}>Press P to resume</p>
          <button onClick={() => { pausedRef.current = false; setPaused(false); }} style={{padding:"12px 32px",background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:12,color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer"}}>▶ Resume</button>
        </div>
      )}
    </div>
  );
}
