import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { useTrOnline, type TrLobbyPlayer, type TrOpponentState } from "../lib/tr-online";

// ─── CANVAS / LAYOUT ─────────────────────────────────────────────────────────
const COLS = 10, ROWS = 20;

interface LayoutVars {
  CW: number; CH: number;
  CELL: number; MINI: number; VIS: number;
  LP: number; BX: number; BY: number;
  BW: number; BH: number;
  OX0: number; OBW: number; OBH: number; OW: number;
}

const L: LayoutVars = {
  CW: 790, CH: 460, CELL: 20, MINI: 12, VIS: 17,
  LP: 90, BX: 90, BY: 38, BW: 200, BH: 400,
  OX0: 318, OBW: 120, OBH: 204, OW: 154,
};

function computeLayout(numOpponents: number): { cw: number; ch: number } {
  L.CELL = numOpponents === 1 ? 28 : numOpponents === 2 ? 24 : numOpponents === 3 ? 20 : 16;
  L.MINI = numOpponents === 1 ? 18 : numOpponents === 2 ? 15 : numOpponents === 3 ? 12 : 10;
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
  L.CW   = L.OX0 + numOpponents * slotW + 10;
  return { cw: L.CW, ch: L.CH };
}

// ─── TIMING ───────────────────────────────────────────────────────────────────
const LOCK_DELAY  = 500;
const DAS_DELAY   = 150;
const DAS_TICK    = 48;
const CLEAR_ANIM  = 220;
const GRAVITY = [800,720,630,550,470,380,300,215,130,100,80,80,80,70,70,60];
const LINE_PTS    = [0, 100, 300, 500, 800];
const GARBAGE_FOR = [0, 0, 1, 2, 4];

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
  if(gs.cur){
    for(let i=0;i<count;i++){
      if(!valid(gs.cur.matrix,gs.cur.row-1,gs.cur.col,gs.board)) gs.cur.row--;
    }
  }
}

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
function draw3D(ctx: CanvasRenderingContext2D, px:number, py:number, size:number, color:string, hi:string, lo:string, alpha=1) {
  if(alpha<=0) return;
  ctx.globalAlpha=alpha;
  const t=Math.max(2,Math.round(size*0.21));
  ctx.fillStyle="rgba(0,0,0,0.32)";ctx.fillRect(px+2,py+2,size,size);
  const g=ctx.createLinearGradient(px,py,px+size,py+size);
  g.addColorStop(0,hi);g.addColorStop(0.55,color);g.addColorStop(1,lo);
  ctx.fillStyle=g;ctx.fillRect(px,py,size,size);
  ctx.fillStyle=hi;ctx.fillRect(px,py,size,t);ctx.fillRect(px,py,t,size);
  ctx.fillStyle=lo;ctx.fillRect(px,py+size-t,size,t);ctx.fillRect(px+size-t,py,t,size);
  const sg=ctx.createRadialGradient(px+t+1,py+t+1,0,px+size*0.5,py+size*0.5,size*0.72);
  sg.addColorStop(0,"rgba(255,255,255,0.52)");sg.addColorStop(0.45,"rgba(255,255,255,0.12)");sg.addColorStop(1,"rgba(255,255,255,0)");
  ctx.fillStyle=sg;ctx.fillRect(px+t,py+t,size-t*2,size-t*2);
  ctx.globalAlpha=1;
}

function drawGarbageBlock(ctx: CanvasRenderingContext2D, px:number, py:number, size:number) {
  draw3D(ctx,px,py,size,"#4a4a4a","#777","#222");
  ctx.save();ctx.globalAlpha=0.18;ctx.strokeStyle="#aaa";ctx.lineWidth=1;
  const step=5;ctx.beginPath();
  for(let i=0;i<size*2;i+=step){ctx.moveTo(px+Math.max(0,i-size),py+Math.min(i,size));ctx.lineTo(px+Math.min(i,size),py+Math.max(0,i-size));}
  ctx.stroke();ctx.restore();
}

function drawBlock(ctx: CanvasRenderingContext2D, px:number, py:number, size:number, type:string, alpha=1) {
  if(type===GKEY){drawGarbageBlock(ctx,px,py,size);return;}
  const d=DEFS[type];if(!d) return;
  draw3D(ctx,px,py,size,d.color,d.hi,d.lo,alpha);
}

// ─── BOARD RENDERER ──────────────────────────────────────────────────────────
function renderPlayerBoard(ctx: CanvasRenderingContext2D, gs: GS) {
  const {board,cur,held,holdUsed,queue,phase,clearRows,clearAcc,particles,garbagePending,color} = gs;

  ctx.fillStyle="#08080f";ctx.fillRect(0,0,L.CW,L.CH);

  ctx.strokeStyle="rgba(255,255,255,0.035)";ctx.lineWidth=0.5;
  for(let c=0;c<=COLS;c++){ctx.beginPath();ctx.moveTo(L.BX+c*L.CELL,L.BY);ctx.lineTo(L.BX+c*L.CELL,L.BY+L.BH);ctx.stroke();}
  for(let r=0;r<=ROWS;r++){ctx.beginPath();ctx.moveTo(L.BX,L.BY+r*L.CELL);ctx.lineTo(L.BX+L.BW,L.BY+r*L.CELL);ctx.stroke();}

  ctx.save();ctx.shadowColor=color;ctx.shadowBlur=18;
  ctx.strokeStyle=color+"66";ctx.lineWidth=1.5;
  ctx.strokeRect(L.BX-0.5,L.BY-0.5,L.BW+1,L.BH+1);
  ctx.restore();

  const flashAlpha=clearRows.length>0?Math.max(0,1-clearAcc/CLEAR_ANIM):0;
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      const t=board[r][c];if(!t) continue;
      const px=L.BX+c*L.CELL,py=L.BY+r*L.CELL;
      if(clearRows.includes(r)){ctx.globalAlpha=flashAlpha;ctx.fillStyle="#fff";ctx.fillRect(px+1,py+1,L.CELL-2,L.CELL-2);ctx.globalAlpha=1;}
      else{drawBlock(ctx,px,py,L.CELL,t);}
    }
  }

  if(cur&&phase==="playing"&&clearRows.length===0){
    const gr=ghostRow(cur,board);
    if(gr!==cur.row){
      const d=DEFS[cur.type];
      ctx.globalAlpha=0.16;ctx.strokeStyle=d.color;ctx.lineWidth=1.5;
      for(const [r,c] of cells(cur.matrix,gr,cur.col)){if(r<0) continue;ctx.strokeRect(L.BX+c*L.CELL+2,L.BY+r*L.CELL+2,L.CELL-4,L.CELL-4);}
      ctx.globalAlpha=1;
    }
  }

  if(cur&&clearRows.length===0){
    const d=DEFS[cur.type];ctx.save();ctx.shadowColor=d.color;ctx.shadowBlur=14;
    for(const [r,c] of cells(cur.matrix,cur.row,cur.col)){if(r<0) continue;drawBlock(ctx,L.BX+c*L.CELL,L.BY+r*L.CELL,L.CELL,cur.type);}
    ctx.restore();
  }

  for(const p of particles){ctx.globalAlpha=p.life;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,3*p.life+1,0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=1;

  if(garbagePending>0){
    const gw=8,gx=L.BX+L.BW+6;
    const maxG=10,filled=Math.min(garbagePending,maxG);
    const gStep=(L.BH-4)/maxG;
    for(let i=0;i<filled;i++){const alpha=0.6+0.4*(i/maxG);ctx.fillStyle=`rgba(255,${80-i*6},0,${alpha})`;ctx.fillRect(gx,L.BY+L.BH-4-(i+1)*gStep,gw,gStep-1);}
    ctx.strokeStyle="rgba(255,80,0,0.6)";ctx.lineWidth=1;ctx.strokeRect(gx,L.BY,gw,L.BH);
  }

  const lx=6;
  const label=(t:string,y:number)=>{ctx.font="bold 9px 'Segoe UI',sans-serif";ctx.letterSpacing="1px";ctx.fillStyle="rgba(255,255,255,0.3)";ctx.fillText(t,lx,y);ctx.letterSpacing="0px";};
  const val=(t:string,y:number,col="rgba(255,255,255,0.88)")=>{ctx.font="bold 16px 'Segoe UI',sans-serif";ctx.fillStyle=col;ctx.fillText(t,lx,y);};

  label("HOLD",22);
  ctx.strokeStyle=holdUsed?"rgba(255,255,255,0.08)":"rgba(255,255,255,0.25)";ctx.lineWidth=1;ctx.strokeRect(lx,26,74,54);
  if(held){ctx.globalAlpha=holdUsed?0.35:1;drawMiniPiece(ctx,held,lx+37,53,14);ctx.globalAlpha=1;}

  label("SCORE",98);val(String(gs.score).padStart(7,"0"),116,"#ffd700");
  label("LEVEL",148);val(String(gs.level+1),166,color);
  label("LINES",178);val(String(gs.lines),196,"#00e5ff");

  label("NEXT",222);
  for(let i=0;i<Math.min(3,queue.length);i++){
    ctx.strokeStyle="rgba(255,255,255,0.12)";ctx.lineWidth=1;ctx.strokeRect(lx,228+i*66,74,60);
    drawMiniPiece(ctx,queue[i],lx+37,258+i*66,i===0?14:12);
  }

  if(phase==="dead"){
    ctx.fillStyle="rgba(0,0,0,0.75)";ctx.fillRect(L.BX,L.BY,L.BW,L.BH);
    ctx.textAlign="center";ctx.fillStyle="#ff4757";ctx.font="bold 26px 'Segoe UI',sans-serif";
    ctx.fillText("DEFEATED",L.BX+L.BW/2,L.BY+L.BH/2);ctx.textAlign="left";
  }
}

function drawMiniPiece(ctx: CanvasRenderingContext2D, type:string, cx:number, cy:number, sz:number) {
  const d=DEFS[type];if(!d) return;
  const m=d.matrix;let minR=99,maxR=0,minC=99,maxC=0;
  for(let r=0;r<m.length;r++) for(let c=0;c<m[r].length;c++) if(m[r][c]){minR=Math.min(minR,r);maxR=Math.max(maxR,r);minC=Math.min(minC,c);maxC=Math.max(maxC,c);}
  const w=(maxC-minC+1)*sz,h=(maxR-minR+1)*sz;
  const ox=cx-w/2,oy=cy-h/2;
  for(let r=minR;r<=maxR;r++) for(let c=minC;c<=maxC;c++) if(m[r][c]) drawBlock(ctx,Math.floor(ox+(c-minC)*sz),Math.floor(oy+(r-minR)*sz),sz,type);
}

// ─── OPPONENT MINI BOARD ──────────────────────────────────────────────────────
function renderOpponent(ctx: CanvasRenderingContext2D, board: string[][], score:number, lines:number, alive:boolean, name:string, oColor:string, slotIdx:number, pending=0) {
  const ox=L.OX0+slotIdx*L.OW+(L.OW-L.OBW)/2;
  const oy=90;

  ctx.font="bold 11px 'Segoe UI',sans-serif";ctx.textAlign="center";
  ctx.fillStyle=alive?oColor:"rgba(255,255,255,0.3)";
  ctx.fillText(name,ox+L.OBW/2,oy-6);

  ctx.fillStyle="rgba(255,255,255,0.04)";ctx.fillRect(ox,oy,L.OBW,L.OBH);
  ctx.save();ctx.shadowColor=alive?oColor:"#333";ctx.shadowBlur=10;
  ctx.strokeStyle=(alive?oColor:"#333")+"55";ctx.lineWidth=1.2;
  ctx.strokeRect(ox-0.5,oy-0.5,L.OBW+1,L.OBH+1);
  ctx.restore();

  const rowOffset=ROWS-L.VIS;
  for(let r=0;r<L.VIS;r++){const br=r+rowOffset;for(let c=0;c<COLS;c++){const t=board[br]?.[c];if(!t) continue;drawBlock(ctx,ox+c*L.MINI,oy+r*L.MINI,L.MINI,t);}}

  if(pending>0){const gw=5;for(let i=0;i<Math.min(pending,8);i++){ctx.fillStyle=`rgba(255,${90-i*10},0,0.8)`;ctx.fillRect(ox-gw-2,oy+L.OBH-(i+1)*(L.OBH/8),gw,L.OBH/8-1);}}

  ctx.font="10px 'Segoe UI',sans-serif";ctx.fillStyle="rgba(255,255,255,0.4)";
  ctx.fillText(`${score} pts · ${lines}L`,ox+L.OBW/2,oy+L.OBH+14);
  if(!alive){ctx.fillStyle="rgba(0,0,0,0.7)";ctx.fillRect(ox,oy,L.OBW,L.OBH);ctx.font="bold 13px 'Segoe UI',sans-serif";ctx.fillStyle="#ff4757";ctx.fillText("DEAD",ox+L.OBW/2,oy+L.OBH/2+5);}
  ctx.textAlign="left";
}

// ─── GAME STEP ────────────────────────────────────────────────────────────────
interface InputFlags { left:boolean;right:boolean;rotate:boolean;rotateCCW:boolean;softDrop:boolean;hardDrop:boolean;hold:boolean; }

function stepGS(gs: GS, dt: number, inp: InputFlags, getNext:()=>string): number {
  if(gs.phase==="dead") return 0;
  if(gs.phase==="clearing"){gs.clearAcc+=dt;updateParticles(gs,dt);if(gs.clearAcc>=CLEAR_ANIM) finishClear(gs,getNext);return 0;}
  if(inp.rotate) doRotate(gs,1);if(inp.rotateCCW) doRotate(gs,-1);if(inp.hold) doHold(gs,getNext);
  if(inp.left) doMove(gs,-1);if(inp.right) doMove(gs,1);
  if(gs.cur){
    const speed=GRAVITY[Math.min(gs.level,GRAVITY.length-1)];
    const effSpeed=inp.softDrop?Math.min(speed,50):speed;
    gs.dropAcc+=dt;
    while(gs.dropAcc>=effSpeed){gs.dropAcc-=effSpeed;if(valid(gs.cur.matrix,gs.cur.row+1,gs.cur.col,gs.board)){gs.cur.row++;gs.atBottom=false;}else{gs.atBottom=true;break;}}
    if(gs.atBottom){gs.lockAcc=(gs.lockAcc??0)+dt;if(gs.lockAcc>=LOCK_DELAY||gs.lockMoves>=15){if(inp.hardDrop) doHardDrop(gs,getNext);else return lockPiece(gs,getNext);}}
    else gs.lockAcc=null;
    if(inp.hardDrop){doHardDrop(gs,getNext);return 0;}
  }
  updateParticles(gs,dt);return 0;
}

function doRotate(gs:GS,dir:1|-1){if(!gs.cur) return;let m=gs.cur.matrix;const times=dir===1?1:3;for(let i=0;i<times;i++) m=rotateCW(m);const kicks=gs.cur.type==="I"?KICKS_I:KICKS_NORMAL;for(const [dr,dc] of kicks){if(valid(m,gs.cur.row+dr,gs.cur.col+dc,gs.board)){gs.cur.matrix=m;gs.cur.row+=dr;gs.cur.col+=dc;if(gs.atBottom){gs.lockAcc=0;gs.lockMoves++;}return;}}}
function doMove(gs:GS,dc:number){if(!gs.cur) return;if(valid(gs.cur.matrix,gs.cur.row,gs.cur.col+dc,gs.board)){gs.cur.col+=dc;if(gs.atBottom){gs.lockAcc=0;gs.lockMoves++;}}}
function doHardDrop(gs:GS,getNext:()=>string){if(!gs.cur) return;let dropped=0;while(valid(gs.cur.matrix,gs.cur.row+1,gs.cur.col,gs.board)){gs.cur.row++;dropped++;}gs.score+=dropped*2;lockPiece(gs,getNext);gs.lockAcc=null;gs.dropAcc=0;}
function doHold(gs:GS,getNext:()=>string){if(!gs.cur||gs.holdUsed) return;const t=gs.cur.type;if(gs.held){gs.cur=spawnPiece(gs.held);gs.held=t;}else{gs.held=t;gs.cur=spawnPiece(getNext());}gs.holdUsed=true;gs.atBottom=false;gs.lockAcc=null;gs.lockMoves=0;}
function updateParticles(gs:GS,dt:number){const f=dt/16;for(const p of gs.particles){p.x+=p.vx*f;p.y+=p.vy*f;p.vy+=0.4*f;p.life-=0.045*f;}gs.particles=gs.particles.filter(p=>p.life>0);}

// ─── AI STEP ──────────────────────────────────────────────────────────────────
function stepBot(bot: BotState, dt:number, sendGarbage:(n:number)=>void) {
  const gs=bot.gs;
  if(gs.phase==="dead") return;
  if(gs.phase==="clearing"){gs.clearAcc+=dt;updateParticles(gs,dt);if(gs.clearAcc>=CLEAR_ANIM) finishClear(gs,()=>advanceQueue(gs));return;}
  if(!gs.cur) return;
  bot.thinkTimer-=dt;
  if(bot.thinkTimer<=0&&!bot.decided){const mv=aiBestMove(gs,bot.diff);bot.targetRot=mv.rot;bot.targetCol=mv.col;bot.currentRot=0;bot.decided=true;bot.thinkTimer=AI_THINK_MS[bot.diff];}
  bot.moveTimer-=dt;
  if(bot.moveTimer<=0&&bot.decided){
    bot.moveTimer=AI_MOVE_MS[bot.diff];
    if(bot.currentRot<bot.targetRot){doRotate(gs,1);bot.currentRot++;}
    else{
      if(gs.cur.col<bot.targetCol) doMove(gs,1);
      else if(gs.cur.col>bot.targetCol) doMove(gs,-1);
      else{
        doHardDrop(gs,()=>advanceQueue(gs));
        const cleared=gs.clearRows.length;if(cleared>0){const g=GARBAGE_FOR[Math.min(cleared,4)];if(g>0) sendGarbage(g);}
        bot.decided=false;bot.thinkTimer=AI_THINK_MS[bot.diff];
      }
    }
  }
  const speed=GRAVITY[Math.min(gs.level,GRAVITY.length-1)];
  gs.dropAcc+=dt;while(gs.dropAcc>=speed){gs.dropAcc-=speed;if(gs.cur&&valid(gs.cur.matrix,gs.cur.row+1,gs.cur.col,gs.board)) gs.cur.row++;else break;}
  updateParticles(gs,dt);
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const BOT_COLORS = ["#f472b6","#34d399","#fbbf24","#a78bfa"];
const BOT_NAMES  = ["ARIA","BLAZE","NOVA","ECHO"];

// ─── GAME REF ──────────────────────────────────────────────────────────────────
interface GameRef {
  player:   GS;
  bots:     BotState[];
  keys:     Set<string>;
  dasDir:   number; dasDelay:number; dasTick:number;
  prevTime: number;
  broadcastTimer: number;
  // online opponents snapshot (polled from hook)
  onlineOpponents: Map<number, TrOpponentState>;
}

// ─── ONLINE LOBBY ─────────────────────────────────────────────────────────────
function TrLobby({ players, roomCode, isHost, mySeat, status, error, onStart, onBack }: {
  players: TrLobbyPlayer[]; roomCode: string; isHost: boolean; mySeat: number;
  status: string; error: string; onStart: () => void; onBack: () => void;
}) {
  const copyCode = () => navigator.clipboard?.writeText(roomCode);
  return (
    <div style={{ minHeight:"100vh",background:"radial-gradient(ellipse at 50% 0%,#0d0030 0%,#050012 60%,#000008 100%)",color:"#fff",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Segoe UI',sans-serif",padding:24 }}>
      <div style={{ background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,padding:32,maxWidth:480,width:"100%" }}>
        <div style={{ textAlign:"center",marginBottom:24 }}>
          <div style={{ fontSize:40 }}>⬛</div>
          <h2 style={{ color:"#c084fc",margin:"8px 0 4px",fontSize:22 }}>Tetris Royale</h2>
          <div style={{ fontSize:13,color:"rgba(255,255,255,0.4)" }}>Online Multiplayer · Up to 4 players</div>
        </div>
        <div style={{ background:"rgba(0,0,0,0.3)",border:"1px solid rgba(192,132,252,0.3)",borderRadius:12,padding:16,textAlign:"center",marginBottom:20 }}>
          <div style={{ fontSize:12,color:"rgba(255,255,255,0.4)",marginBottom:6,letterSpacing:2 }}>ROOM CODE</div>
          <div style={{ fontSize:36,fontWeight:900,color:"#c084fc",letterSpacing:8,fontFamily:"monospace" }}>{roomCode}</div>
          <button onClick={copyCode} style={{ marginTop:8,padding:"6px 16px",background:"rgba(192,132,252,0.15)",border:"1px solid rgba(192,132,252,0.3)",borderRadius:8,color:"#d8b4fe",cursor:"pointer",fontSize:12 }}>Copy Code</button>
        </div>
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12,color:"rgba(255,255,255,0.4)",marginBottom:8,letterSpacing:1 }}>PLAYERS ({players.length}/4)</div>
          {players.map(p => (
            <div key={p.seat} style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:p.seat===mySeat?"rgba(192,132,252,0.1)":"rgba(255,255,255,0.03)",border:p.seat===mySeat?"1px solid rgba(192,132,252,0.3)":"1px solid rgba(255,255,255,0.06)",borderRadius:8,marginBottom:6 }}>
              <div style={{ width:12,height:12,borderRadius:"50%",background:p.color,flexShrink:0 }} />
              <span style={{ fontWeight:600,color:p.seat===mySeat?"#d8b4fe":"#e2e8f0" }}>{p.name}</span>
              {p.seat===mySeat&&<span style={{ fontSize:11,color:"rgba(255,255,255,0.3)",marginLeft:"auto" }}>You</span>}
              {p.seat===0&&p.seat!==mySeat&&<span style={{ fontSize:11,color:"rgba(255,255,255,0.3)",marginLeft:"auto" }}>Host</span>}
            </div>
          ))}
          {players.length<4&&Array.from({length:4-players.length}).map((_,i)=>(
            <div key={i} style={{ padding:"8px 12px",background:"rgba(255,255,255,0.02)",border:"1px dashed rgba(255,255,255,0.08)",borderRadius:8,marginBottom:6,color:"rgba(255,255,255,0.2)",fontSize:13 }}>Waiting for player...</div>
          ))}
        </div>
        {error&&<div style={{ color:"#f87171",fontSize:13,textAlign:"center",marginBottom:12,background:"rgba(220,38,38,0.1)",border:"1px solid rgba(220,38,38,0.3)",borderRadius:8,padding:"8px 12px" }}>{error}</div>}
        {isHost&&(
          <button onClick={onStart} disabled={players.length<2||status==="connecting"}
            style={{ width:"100%",padding:"14px 0",background:players.length>=2?"linear-gradient(135deg,#7c3aed,#4f46e5)":"rgba(255,255,255,0.06)",border:"none",borderRadius:12,color:"#fff",fontWeight:800,fontSize:16,cursor:players.length>=2?"pointer":"not-allowed",boxShadow:players.length>=2?"0 4px 16px rgba(124,58,237,0.4)":"none",marginBottom:10 }}>
            ▶ Start Game {players.length<2?"(need 2+ players)":""}
          </button>
        )}
        {!isHost&&<div style={{ textAlign:"center",color:"rgba(255,255,255,0.4)",fontSize:14,marginBottom:10,padding:12,background:"rgba(255,255,255,0.03)",borderRadius:10 }}>⏳ Waiting for host to start...</div>}
        <button onClick={onBack} style={{ width:"100%",padding:"10px 0",background:"transparent",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,color:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:13 }}>← Leave Room</button>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
type Screen = "menu"|"setup_ai"|"setup_online"|"lobby"|"game"|"results";

interface BotConfig { diff: AIDiff; }

export default function TetrisRoyale() {
  const cvRef     = useRef<HTMLCanvasElement>(null);
  const gameRef   = useRef<GameRef|null>(null);
  const rafRef    = useRef(0);
  const hardRef   = useRef(false);
  const pausedRef = useRef(false);
  const touchSwipe = useRef<{x:number;y:number}|null>(null);
  const [paused, setPaused] = useState(false);

  const [screen,     setScreen]    = useState<Screen>("menu");
  const [numBots,    setNumBots]   = useState(3);
  const [botConfigs, setBotConfigs]= useState<BotConfig[]>([{diff:"normal"},{diff:"normal"},{diff:"normal"}]);
  const [winner,     setWinner]    = useState("");
  const [playerName, setPlayerName]= useState(() => localStorage.getItem("tr_name") || "YOU");
  const [codeInput,  setCodeInput] = useState("");

  const [canvasSize, setCanvasSz]  = useState({cw:L.CW,ch:L.CH});
  const [scale,      setScale]     = useState(1);

  const setCanvasSize = useCallback((sz:{cw:number;ch:number}) => {
    setCanvasSz(sz);
  }, []);

  const online = useTrOnline();

  // Sync lobby → lobby screen
  useEffect(() => {
    if (online.status === "lobby" && screen !== "lobby") setScreen("lobby");
    if (online.status === "playing" && screen !== "game") {
      // start game as online player
      cancelAnimationFrame(rafRef.current);
      const oppCount = Math.max(1, online.players.length - 1);
      const sz = computeLayout(oppCount);
      setCanvasSize(sz);
      const myColor = online.myColor;
      gameRef.current = {
        player: makeGS(playerName || "YOU", myColor),
        bots: [],
        keys: new Set(),
        dasDir:0, dasDelay:0, dasTick:0,
        prevTime: 0, broadcastTimer: 0,
        onlineOpponents: new Map(),
      };
      setScreen("game");
    }
  }, [online.status, online.players.length, online.myColor, playerName, setCanvasSize, screen]);

  // Responsive scale
  useEffect(() => {
    const upd = () => setScale(Math.min(1,(window.innerWidth-16)/canvasSize.cw,(window.innerHeight-80)/canvasSize.ch));
    upd(); window.addEventListener("resize",upd); return()=>window.removeEventListener("resize",upd);
  }, [canvasSize.cw, canvasSize.ch]);

  const saveName = (n: string) => { setPlayerName(n); localStorage.setItem("tr_name", n); };

  const makeBot = useCallback((i:number, diff:AIDiff): BotState => ({
    gs: makeGS(BOT_NAMES[i]!, BOT_COLORS[i]!),
    diff,
    thinkTimer: AI_THINK_MS[diff]*Math.random(),
    moveTimer: 0,
    targetCol: 4, targetRot: 0, currentRot: 0, decided: false,
  }), []);

  const startAIGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const count = numBots;
    const sz = computeLayout(count);
    setCanvasSize(sz);
    const bots: BotState[] = [];
    for (let i = 0; i < count; i++) bots.push(makeBot(i, botConfigs[i]?.diff ?? "normal"));
    gameRef.current = {
      player: makeGS(playerName || "YOU", "#ef4444"),
      bots,
      keys: new Set(),
      dasDir:0, dasDelay:0, dasTick:0,
      prevTime:0, broadcastTimer:0,
      onlineOpponents: new Map(),
    };
    setScreen("game");
  }, [numBots, botConfigs, playerName, makeBot, setCanvasSize]);

  const isOnline = screen === "game" && online.status === "playing";

  // ── Game loop ─────────────────────────────────────────────────────────────
  const loop = useCallback((time: number) => {
    const g = gameRef.current;
    const canvas = cvRef.current;
    if (!g || !canvas) { rafRef.current = requestAnimationFrame(loop); return; }
    if (pausedRef.current) { rafRef.current = requestAnimationFrame(loop); return; }
    const ctx = canvas.getContext("2d")!;

    const dt = Math.min(time - g.prevTime, 50);
    g.prevTime = time;
    const k = g.keys;
    const online_ = isOnline;

    // DAS
    const lHeld=k.has("ArrowLeft")||k.has("a"), rHeld=k.has("ArrowRight")||k.has("d");
    const curDir=rHeld?1:lHeld?-1:0;
    let moveLeft=false,moveRight=false;
    if(curDir!==0){
      if(g.dasDir!==curDir){g.dasDir=curDir;g.dasDelay=0;g.dasTick=0;if(curDir===-1)moveLeft=true;else moveRight=true;}
      else{g.dasDelay+=dt;if(g.dasDelay>=DAS_DELAY){g.dasTick+=dt;while(g.dasTick>=DAS_TICK){g.dasTick-=DAS_TICK;if(curDir===-1)moveLeft=true;else moveRight=true;}}}
    } else g.dasDir=0;

    const inp: InputFlags = { left:moveLeft,right:moveRight,rotate:false,rotateCCW:false,softDrop:k.has("ArrowDown")||k.has("s"),hardDrop:false,hold:false };

    // Player step
    if (g.player.phase !== "dead") {
      const cleared = stepGS(g.player, dt, inp, () => advanceQueue(g.player));
      if (cleared > 0) {
        const garbage = GARBAGE_FOR[Math.min(cleared, 4)];
        if (garbage > 0) {
          if (online_) {
            online.sendGarbage(garbage);
          } else {
            const targets = g.bots.filter(b => b.gs.phase !== "dead");
            if (targets.length > 0) targets[Math.floor(Math.random()*targets.length)].gs.garbagePending += garbage;
          }
        }
      }

      // Drain incoming garbage (online)
      if (online_ && online.garbageQueueRef.current > 0) {
        injectGarbage(g.player, online.garbageQueueRef.current);
        online.garbageQueueRef.current = 0;
      }
    }

    // Bot steps (AI mode only)
    if (!online_) {
      for (const bot of g.bots) {
        if (bot.gs.phase === "dead") continue;
        stepBot(bot, dt, (n) => {
          g.player.garbagePending += n;
          const aliveBots = g.bots.filter(b => b !== bot && b.gs.phase !== "dead");
          if (aliveBots.length > 0) aliveBots[Math.floor(Math.random()*aliveBots.length)].gs.garbagePending += n;
        });
      }
    }

    // Broadcast state (online)
    if (online_) {
      g.broadcastTimer += dt;
      if (g.broadcastTimer >= 80) {
        g.broadcastTimer = 0;
        online.sendState(g.player.board, g.player.score, g.player.lines, g.player.phase !== "dead");
      }
      // Snapshot opponents from hook ref
      g.onlineOpponents = new Map(online.opponentsRef.current);
    }

    // Check game over
    const playerAlive = g.player.phase !== "dead";
    if (online_) {
      const w = online.winnerRef.current;
      if (w !== null) {
        cancelAnimationFrame(rafRef.current);
        const myName = playerName || "YOU";
        setWinner(w.seat === online.mySeat ? myName : w.name);
        setScreen("results");
        return;
      }
    } else {
      const botsAlive = g.bots.filter(b => b.gs.phase !== "dead").length;
      const total = (playerAlive?1:0) + botsAlive;
      if (!playerAlive && botsAlive === 0) { cancelAnimationFrame(rafRef.current); setWinner("DRAW"); setScreen("results"); return; }
      if (!playerAlive && botsAlive === 1) { const s = g.bots.find(b=>b.gs.phase!=="dead"); cancelAnimationFrame(rafRef.current); setWinner(s!.gs.name); setScreen("results"); return; }
      if (playerAlive && total === 1) { cancelAnimationFrame(rafRef.current); setWinner(g.player.name); setScreen("results"); return; }
    }

    // Render
    renderPlayerBoard(ctx, g.player);

    // Collect opponents
    type OppSlot = {board:string[][];score:number;lines:number;alive:boolean;name:string;color:string;pending:number};
    const opps: OppSlot[] = [];
    if (online_) {
      for (const [, opp] of g.onlineOpponents) {
        const pl = online.players.find(p => p.seat === opp.seat);
        opps.push({ board: opp.board, score: opp.score, lines: opp.lines, alive: opp.alive, name: pl?.name ?? `P${opp.seat+1}`, color: pl?.color ?? "#a78bfa", pending: 0 });
      }
    } else {
      for (const bot of g.bots) {
        opps.push({ board: bot.gs.board, score: bot.gs.score, lines: bot.gs.lines, alive: bot.gs.phase !== "dead", name: bot.gs.name, color: bot.gs.color, pending: bot.gs.garbagePending });
      }
    }
    const oppCount = online_ ? Math.max(1, online.players.length - 1) : g.bots.length;
    while (opps.length < oppCount) opps.push({ board: emptyBoard(), score:0, lines:0, alive:false, name:"—", color:"#444", pending:0 });
    for (let i = 0; i < oppCount; i++) { const o = opps[i]; renderOpponent(ctx, o.board, o.score, o.lines, o.alive, o.name, o.color, i, o.pending); }

    ctx.fillStyle="rgba(255,255,255,0.06)";ctx.fillRect(L.OX0-6,0,2,L.CH);
    ctx.fillStyle="rgba(0,0,0,0.55)";ctx.fillRect(0,0,L.CW,36);
    ctx.font="bold 13px 'Segoe UI',sans-serif";ctx.textAlign="left";
    ctx.fillStyle=g.player.color;ctx.fillText(`⬛ ${g.player.name}`,L.BX,22);
    ctx.font="bold 11px 'Segoe UI',sans-serif";
    ctx.fillStyle="rgba(255,255,255,0.28)";ctx.fillText("TETRIS ROYALE",L.CW/2-50,22);
    ctx.textAlign="right";
    ctx.fillStyle="rgba(255,255,255,0.18)";ctx.font="9px 'Segoe UI',sans-serif";
    ctx.fillText(online_ ? `Room ${online.roomCode}` : "vs AI", L.CW-8, 22);
    ctx.textAlign="left";

    rafRef.current = requestAnimationFrame(loop);
  }, [isOnline, online, playerName]);

  // Keyboard
  useEffect(() => {
    if (screen !== "game") return;
    const kd = (e: KeyboardEvent) => {
      const g = gameRef.current; if (!g) return;
      if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();
      if(e.key==="p"||e.key==="P"){pausedRef.current=!pausedRef.current;setPaused(pausedRef.current);return;}
      g.keys.add(e.key);
      const gs = g.player; if(gs.phase!=="playing") return;
      switch(e.key){
        case "ArrowUp":case "x":case "X":doRotate(gs,1);break;
        case "z":case "Z":doRotate(gs,-1);break;
        case " ":if(!hardRef.current){hardRef.current=true;doHardDrop(gs,()=>advanceQueue(gs));}break;
        case "c":case "C":case "Shift":doHold(gs,()=>advanceQueue(gs));break;
        case "ArrowLeft":g.dasDir=-1;g.dasDelay=0;g.dasTick=0;doMove(gs,-1);break;
        case "ArrowRight":g.dasDir=1;g.dasDelay=0;g.dasTick=0;doMove(gs,1);break;
      }
    };
    const ku = (e: KeyboardEvent) => {
      gameRef.current?.keys.delete(e.key);
      if(e.key===" ") hardRef.current=false;
      if(e.key==="ArrowLeft"||e.key==="ArrowRight") if(gameRef.current) gameRef.current.dasDir=0;
    };
    window.addEventListener("keydown",kd); window.addEventListener("keyup",ku);
    return()=>{window.removeEventListener("keydown",kd);window.removeEventListener("keyup",ku);};
  }, [screen]);

  useEffect(() => {
    if (screen !== "game") return;
    gameRef.current && (gameRef.current.prevTime = performance.now());
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [screen, loop]);

  // ── Style helpers ─────────────────────────────────────────────────────────
  const S: React.CSSProperties = { minHeight:"100vh",background:"radial-gradient(ellipse at 50% 0%,#0d0030 0%,#050012 60%,#000008 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"#fff",fontFamily:"'Segoe UI',sans-serif",padding:24,userSelect:"none" };
  const Btn = (p:{children:React.ReactNode;onClick:()=>void;style?:React.CSSProperties;disabled?:boolean}) => (
    <button onClick={p.onClick} disabled={p.disabled} style={{padding:"12px 32px",fontSize:15,fontWeight:800,letterSpacing:1,border:"none",borderRadius:14,color:"#fff",cursor:p.disabled?"not-allowed":"pointer",opacity:p.disabled?0.5:1,...p.style}}>{p.children}</button>
  );

  // ── SCREENS ───────────────────────────────────────────────────────────────
  if (screen === "menu") return (
    <div style={S}>
      <Link href="/"><span style={{position:"absolute",top:16,left:20,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,padding:"6px 14px",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>← Menu</span></Link>
      <div style={{fontSize:52,filter:"drop-shadow(0 0 24px #818cf8)",marginBottom:8}}>⬛</div>
      <h1 style={{fontSize:48,fontWeight:900,letterSpacing:-2,margin:"0 0 4px",background:"linear-gradient(135deg,#818cf8 0%,#c084fc 50%,#f472b6 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>TETRIS ROYALE</h1>
      <p style={{color:"rgba(255,255,255,0.35)",marginBottom:36,fontSize:13}}>Last stack standing wins · Eliminate opponents with garbage lines</p>
      <div style={{display:"flex",flexDirection:"column",gap:12,width:"100%",maxWidth:340}}>
        <Btn onClick={()=>setScreen("setup_ai")} style={{background:"linear-gradient(135deg,#6d28d9,#4f46e5)"}}>🤖 vs AI Bots (1–4)</Btn>
        <Btn onClick={()=>setScreen("setup_online")} style={{background:"linear-gradient(135deg,#0369a1,#0891b2)"}}>🌐 Online Multiplayer (2–4P)</Btn>
      </div>
      <div style={{marginTop:32,display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 24px",fontSize:12,color:"rgba(255,255,255,0.35)",maxWidth:300}}>
        {[["← →","Move"],["↑ X","Rotate CW"],["Z","Rotate CCW"],["↓","Soft Drop"],["Space","Hard Drop"],["C / Shift","Hold"],["P","Pause"]].map(([k,v])=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"rgba(255,255,255,0.6)",fontWeight:600}}>{k}</span><span>{v}</span></div>
        ))}
      </div>
    </div>
  );

  if (screen === "setup_ai") {
    const colors = ["#f472b6","#34d399","#fbbf24","#a78bfa"];
    const effBotConfigs = Array.from({length:numBots},(_,i)=>botConfigs[i]??{diff:"normal" as AIDiff});
    return (
      <div style={S}>
        <Link href="/"><span style={{position:"absolute",top:16,left:20,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,padding:"6px 14px",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>← Menu</span></Link>
        <h2 style={{fontSize:28,fontWeight:900,marginBottom:28,color:"#c084fc"}}>Setup vs AI</h2>
        <div style={{display:"flex",flexDirection:"column",gap:18,width:"100%",maxWidth:380}}>
          <label style={{display:"flex",flexDirection:"column",gap:6}}>
            <span style={{fontSize:12,color:"rgba(255,255,255,0.4)",fontWeight:700,letterSpacing:1}}>YOUR NAME</span>
            <input value={playerName} onChange={e=>saveName(e.target.value.slice(0,8).toUpperCase())} maxLength={8}
              style={{padding:"10px 14px",borderRadius:10,border:"1px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.06)",color:"#fff",fontSize:16,fontWeight:700,outline:"none"}} />
          </label>
          <div>
            <span style={{fontSize:12,color:"rgba(255,255,255,0.4)",fontWeight:700,letterSpacing:1}}>AI OPPONENTS</span>
            <div style={{display:"flex",gap:8,marginTop:6}}>
              {[1,2,3,4].map(n=>(
                <button key={n} onClick={()=>setNumBots(n)}
                  style={{flex:1,padding:"10px 0",borderRadius:10,border:`1px solid ${numBots===n?"#c084fc":"rgba(255,255,255,0.1)"}`,background:numBots===n?"rgba(192,132,252,0.2)":"rgba(255,255,255,0.04)",color:numBots===n?"#c084fc":"rgba(255,255,255,0.5)",cursor:"pointer",fontWeight:700,fontSize:16}}>{n}</button>
              ))}
            </div>
          </div>
          <div>
            <span style={{fontSize:12,color:"rgba(255,255,255,0.4)",fontWeight:700,letterSpacing:1}}>BOT DIFFICULTY</span>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:8}}>
              {effBotConfigs.map((bc,i)=>{
                const diffColor = bc.diff==="easy"?"#34d399":bc.diff==="normal"?"#fbbf24":"#ef4444";
                return (
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"rgba(255,255,255,0.04)",borderRadius:10,border:`1px solid ${colors[i]}44`}}>
                    <div style={{width:10,height:10,borderRadius:"50%",background:colors[i],flexShrink:0}} />
                    <span style={{fontSize:13,color:colors[i],fontWeight:700,minWidth:50}}>{BOT_NAMES[i]}</span>
                    <div style={{display:"flex",gap:6,flex:1,justifyContent:"flex-end"}}>
                      {(["easy","normal","hard"] as AIDiff[]).map(d=>(
                        <button key={d} onClick={()=>setBotConfigs(prev=>{const next=[...prev];while(next.length<=i) next.push({diff:"normal"});next[i]={diff:d};return next;})}
                          style={{padding:"5px 10px",borderRadius:8,border:`1px solid ${bc.diff===d?diffColor:"rgba(255,255,255,0.1)"}`,background:bc.diff===d?diffColor+"33":"transparent",color:bc.diff===d?diffColor:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:11,fontWeight:700,textTransform:"capitalize"}}>{d}</button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <Btn onClick={startAIGame} style={{marginTop:8,background:"linear-gradient(135deg,#7c3aed,#4f46e5)",fontSize:17}}>▶ Start Game</Btn>
          <button onClick={()=>setScreen("menu")} style={{background:"none",border:"none",color:"rgba(255,255,255,0.25)",cursor:"pointer",fontSize:13}}>← Back</button>
        </div>
      </div>
    );
  }

  if (screen === "setup_online") return (
    <div style={S}>
      <Link href="/"><span style={{position:"absolute",top:16,left:20,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,padding:"6px 14px",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>← Menu</span></Link>
      <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,padding:32,maxWidth:420,width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:40}}>⬛</div>
          <h2 style={{color:"#c084fc",margin:"8px 0 4px"}}>Online Multiplayer</h2>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.4)"}}>2–4 players · Last stack standing</div>
        </div>
        <div style={{marginBottom:16}}>
          <label style={{fontSize:12,color:"rgba(255,255,255,0.5)",letterSpacing:1}}>YOUR NAME</label>
          <input value={playerName} onChange={e=>saveName(e.target.value.slice(0,8).toUpperCase())} maxLength={8}
            style={{display:"block",width:"100%",marginTop:6,padding:"10px 14px",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:10,color:"#fff",fontSize:15,outline:"none",boxSizing:"border-box"}} />
        </div>
        <button onClick={()=>online.create(playerName||"YOU")} disabled={online.status==="connecting"}
          style={{width:"100%",padding:"14px 0",background:"linear-gradient(135deg,#7c3aed,#4f46e5)",border:"none",borderRadius:12,color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer",boxShadow:"0 4px 16px rgba(124,58,237,0.4)",marginBottom:12}}>
          Create Room ⬛
        </button>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <div style={{flex:1,height:1,background:"rgba(255,255,255,0.08)"}} /><span style={{fontSize:12,color:"rgba(255,255,255,0.3)"}}>or join</span><div style={{flex:1,height:1,background:"rgba(255,255,255,0.08)"}} />
        </div>
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          <input value={codeInput} onChange={e=>setCodeInput(e.target.value.toUpperCase())} maxLength={4} placeholder="ROOM CODE"
            style={{flex:1,padding:"10px 14px",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:10,color:"#fff",fontSize:18,fontFamily:"monospace",letterSpacing:4,textAlign:"center",outline:"none"}} />
          <button onClick={()=>online.join(codeInput,playerName||"YOU")} disabled={codeInput.length<4||online.status==="connecting"}
            style={{padding:"10px 20px",background:codeInput.length>=4?"linear-gradient(135deg,#0369a1,#0891b2)":"rgba(255,255,255,0.06)",border:"none",borderRadius:10,color:"#fff",fontWeight:700,cursor:codeInput.length>=4?"pointer":"not-allowed",fontSize:14}}>
            Join
          </button>
        </div>
        {online.error&&<div style={{color:"#f87171",fontSize:13,background:"rgba(220,38,38,0.1)",border:"1px solid rgba(220,38,38,0.3)",borderRadius:8,padding:"8px 12px",marginBottom:12}}>{online.error}</div>}
        {online.status==="connecting"&&<div style={{textAlign:"center",color:"#888",fontSize:13,marginBottom:12}}>Connecting...</div>}
        <button onClick={()=>setScreen("menu")} style={{width:"100%",padding:"10px 0",background:"transparent",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,color:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:13}}>← Back</button>
      </div>
    </div>
  );

  if (screen === "lobby") return (
    <TrLobby players={online.players} roomCode={online.roomCode} isHost={online.isHost} mySeat={online.mySeat}
      status={online.status} error={online.error}
      onStart={() => online.start()}
      onBack={() => { online.disconnect(); setScreen("menu"); }} />
  );

  if (screen === "results") return (
    <div style={S}>
      <Link href="/"><span style={{position:"absolute",top:16,left:20,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,padding:"6px 14px",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>← Menu</span></Link>
      <div style={{fontSize:64,marginBottom:16}}>🏆</div>
      <h2 style={{fontSize:36,fontWeight:900,color:"#ffd700",marginBottom:8}}>{winner} Wins!</h2>
      <p style={{color:"rgba(255,255,255,0.4)",marginBottom:32,fontSize:14}}>
        {gameRef.current?`Your score: ${gameRef.current.player.score} · Lines: ${gameRef.current.player.lines}`:""}
      </p>
      <div style={{display:"flex",gap:12}}>
        <Btn onClick={()=>{if(!isOnline)startAIGame();else{online.disconnect();setScreen("menu");}}} style={{background:"linear-gradient(135deg,#7c3aed,#4f46e5)"}}>Play Again</Btn>
        <Btn onClick={()=>{online.disconnect();setScreen("menu");}} style={{background:"rgba(255,255,255,0.08)"}}>Menu</Btn>
      </div>
    </div>
  );

  // GAME screen
  const trPlayer = gameRef.current?.player;
  const trCanTap = trPlayer && trPlayer.phase === "playing";

  return (
    <div style={{minHeight:"100vh",background:"#02020a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:8,position:"relative"}}>
      <Link href="/"><span style={{position:"absolute",top:12,left:16,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,padding:"6px 14px",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",zIndex:10}}>← Menu</span></Link>
      <canvas ref={cvRef} width={canvasSize.cw} height={canvasSize.ch}
        style={{transform:`scale(${scale})`,transformOrigin:"top center",display:"block",imageRendering:"pixelated",touchAction:"none"}}
        onTouchStart={e=>{const t=e.changedTouches[0];touchSwipe.current={x:t.clientX,y:t.clientY};}}
        onTouchEnd={e=>{
          if(!touchSwipe.current) return;
          const t=e.changedTouches[0];const dx=t.clientX-touchSwipe.current.x;const dy=t.clientY-touchSwipe.current.y;
          touchSwipe.current=null;
          const g=gameRef.current;if(!g||g.player.phase!=="playing") return;
          if(Math.abs(dx)<15&&Math.abs(dy)<15){doHardDrop(g.player,()=>advanceQueue(g.player));return;}
          if(Math.abs(dy)>Math.abs(dx)){if(dy>0) g.keys.add("ArrowDown");else doRotate(g.player,1);}
          else{doMove(g.player,dx>0?1:-1);}
        }}
        onTouchMove={e=>e.preventDefault()}
      />
      {paused&&(
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.7)",gap:16,zIndex:20}}>
          <div style={{fontSize:64}}>⏸</div>
          <h2 style={{fontSize:40,fontWeight:900,color:"#fff",margin:0}}>PAUSED</h2>
          <p style={{color:"rgba(255,255,255,0.5)",fontSize:14,margin:0}}>Press P to resume</p>
          <button onClick={()=>{pausedRef.current=false;setPaused(false);}} style={{padding:"12px 32px",background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:12,color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer"}}>▶ Resume</button>
        </div>
      )}
      <div className="sm:hidden" style={{position:"fixed",bottom:0,left:0,right:0,padding:"8px 6px 12px",background:"rgba(2,2,10,0.94)",borderTop:"1px solid rgba(255,255,255,0.1)",display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap",zIndex:50}}>
        {([
          {label:"⏮ Hold",fn:()=>{const g=gameRef.current;if(g&&g.player.phase==="playing") doHold(g.player,()=>advanceQueue(g.player));}},
          {label:"◀",fn:()=>{const g=gameRef.current;if(g&&g.player.phase==="playing") doMove(g.player,-1);}},
          {label:"↻ CW",fn:()=>{const g=gameRef.current;if(g&&g.player.phase==="playing") doRotate(g.player,1);}},
          {label:"↺ CCW",fn:()=>{const g=gameRef.current;if(g&&g.player.phase==="playing") doRotate(g.player,-1);}},
          {label:"▶",fn:()=>{const g=gameRef.current;if(g&&g.player.phase==="playing") doMove(g.player,1);}},
          {label:"⬇ Drop",fn:()=>{const g=gameRef.current;if(g&&g.player.phase==="playing") doHardDrop(g.player,()=>advanceQueue(g.player));}},
        ] as {label:string;fn:()=>void}[]).map(({label,fn})=>(
          <button key={label} onPointerDown={e=>{e.preventDefault();fn();}}
            style={{padding:"10px 14px",borderRadius:10,border:"1px solid rgba(255,255,255,0.15)",background:trCanTap?"rgba(192,132,252,0.3)":"rgba(255,255,255,0.06)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",touchAction:"manipulation",userSelect:"none"}}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
