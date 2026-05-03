import { useState, useCallback, useEffect, useRef } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useRelaySocket } from "../lib/relay-socket";
import { QRCode, buildInviteUrl, getUrlRoomCode } from "../components/QRCode";

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-4 px-4 py-3 border-b border-violet-500/30 bg-gradient-to-r from-violet-950/60 to-transparent">
        <Link href="/" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-sm transition-all">
          <ArrowLeft className="h-4 w-4" />
          <span>Menu</span>
        </Link>
        <span className="text-2xl select-none" style={{ filter: "drop-shadow(0 0 8px #a78bfa80)" }}>♟️</span>
        <h1 className="text-lg font-bold text-violet-400">{title}</h1>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-3 gap-3">{children}</div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
type PType   = "P" | "N" | "B" | "R" | "Q" | "K";
type Color   = "w" | "b";
type Piece   = { type: PType; color: Color };
type Board   = (Piece | null)[][];
type Castling = { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean };
type Move    = { from: [number, number]; to: [number, number]; promo?: PType };
type AIDiff  = "easy" | "medium" | "hard";
type Mode    = "ai" | "local" | "online";

// ─── Canvas constants ─────────────────────────────────────────────────────────
const SQ     = 62;
const BORDER = 34;
const CW     = SQ * 8 + BORDER * 2;
const CH     = SQ * 8 + BORDER * 2;

const SYMBOLS: Record<Color, Record<PType, string>> = {
  w: { K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙" },
  b: { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" },
};

// ─── Board helpers ────────────────────────────────────────────────────────────
function cloneBoard(b: Board): Board { return b.map(r => r.map(sq => sq ? { ...sq } : null)); }
function inb(r: number, c: number) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
function findKing(b: Board, col: Color): [number, number] | null {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++)
    if (b[r][c]?.type === "K" && b[r][c]?.color === col) return [r, c];
  return null;
}

// ─── Move generation ──────────────────────────────────────────────────────────
function pseudoMoves(board: Board, r: number, c: number, castling: Castling, ep: [number, number] | null): Move[] {
  const sq = board[r][c]; if (!sq) return [];
  const { type, color } = sq;
  const moves: Move[] = [];
  const tryAdd = (tr: number, tc: number) => {
    if (inb(tr, tc) && board[tr][tc]?.color !== color) moves.push({ from: [r, c], to: [tr, tc] });
  };
  const slide = (dr: number, dc: number) => {
    for (let i = 1; i < 8; i++) {
      const rr = r + dr * i, cc = c + dc * i;
      if (!inb(rr, cc)) break;
      if (board[rr][cc]?.color === color) break;
      moves.push({ from: [r, c], to: [rr, cc] });
      if (board[rr][cc]) break;
    }
  };
  if (type === "P") {
    const dir = color === "w" ? -1 : 1, startRow = color === "w" ? 6 : 1, promoRow = color === "w" ? 0 : 7;
    const addPawn = (tr: number, tc: number) => {
      if (tr === promoRow) { for (const p of ["Q","R","B","N"] as PType[]) moves.push({ from:[r,c], to:[tr,tc], promo:p }); }
      else moves.push({ from:[r,c], to:[tr,tc] });
    };
    if (inb(r+dir,c) && !board[r+dir][c]) {
      addPawn(r+dir, c);
      if (r === startRow && !board[r+dir*2][c]) addPawn(r+dir*2, c);
    }
    for (const dc of [-1,1]) {
      if (!inb(r+dir, c+dc)) continue;
      if (board[r+dir][c+dc]?.color !== color && board[r+dir][c+dc]) addPawn(r+dir, c+dc);
      if (ep && ep[0] === r+dir && ep[1] === c+dc) moves.push({ from:[r,c], to:[r+dir,c+dc] });
    }
  }
  if (type === "N") { for (const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) tryAdd(r+dr,c+dc); }
  if (type === "B" || type === "Q") { slide(-1,-1); slide(-1,1); slide(1,-1); slide(1,1); }
  if (type === "R" || type === "Q") { slide(-1,0); slide(1,0); slide(0,-1); slide(0,1); }
  if (type === "K") {
    for (const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) tryAdd(r+dr,c+dc);
    if (color === "w") {
      if (castling.wK && !board[7][5] && !board[7][6]) moves.push({ from:[7,4], to:[7,6] });
      if (castling.wQ && !board[7][3] && !board[7][2] && !board[7][1]) moves.push({ from:[7,4], to:[7,2] });
    } else {
      if (castling.bK && !board[0][5] && !board[0][6]) moves.push({ from:[0,4], to:[0,6] });
      if (castling.bQ && !board[0][3] && !board[0][2] && !board[0][1]) moves.push({ from:[0,4], to:[0,2] });
    }
  }
  return moves;
}

function isAttacked(board: Board, r: number, c: number, by: Color): boolean {
  const pDir = by === "w" ? 1 : -1;
  for (const dc of [-1,1]) { const pr=r+pDir,pc=c+dc; if (inb(pr,pc)&&board[pr][pc]?.type==="P"&&board[pr][pc]?.color===by) return true; }
  for (const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) { const rr=r+dr,cc=c+dc; if(inb(rr,cc)&&board[rr][cc]?.type==="N"&&board[rr][cc]?.color===by) return true; }
  for (const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]) { for(let i=1;i<8;i++){const rr=r+dr*i,cc=c+dc*i;if(!inb(rr,cc))break;if(board[rr][cc]){if(board[rr][cc]!.color===by&&(board[rr][cc]!.type==="R"||board[rr][cc]!.type==="Q"))return true;break;}}}
  for (const [dr,dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]) { for(let i=1;i<8;i++){const rr=r+dr*i,cc=c+dc*i;if(!inb(rr,cc))break;if(board[rr][cc]){if(board[rr][cc]!.color===by&&(board[rr][cc]!.type==="B"||board[rr][cc]!.type==="Q"))return true;break;}}}
  for (const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) { const rr=r+dr,cc=c+dc; if(inb(rr,cc)&&board[rr][cc]?.type==="K"&&board[rr][cc]?.color===by) return true; }
  return false;
}

function isInCheck(b: Board, col: Color): boolean {
  const kp = findKing(b, col); if (!kp) return false;
  return isAttacked(b, kp[0], kp[1], col === "w" ? "b" : "w");
}

function applyMove(board: Board, move: Move, castling: Castling, ep: [number,number]|null) {
  const nb = cloneBoard(board); const nc = {...castling};
  const [fr,fc]=move.from, [tr,tc]=move.to; const p=nb[fr][fc]!;
  let newEp: [number,number]|null = null;
  if (p.type==="P"&&ep&&tr===ep[0]&&tc===ep[1]) nb[fr][tc]=null;
  if (p.type==="P"&&Math.abs(tr-fr)===2) newEp=[(fr+tr)>>1,fc];
  if (p.type==="K"&&Math.abs(tc-fc)===2) {
    if(tc===6){nb[fr][5]=nb[fr][7];nb[fr][7]=null;}
    else{nb[fr][3]=nb[fr][0];nb[fr][0]=null;}
  }
  nb[tr][tc]=move.promo?{type:move.promo,color:p.color}:{...p};
  nb[fr][fc]=null;
  if(p.type==="K"){if(p.color==="w"){nc.wK=false;nc.wQ=false;}else{nc.bK=false;nc.bQ=false;}}
  if(fr===7&&fc===7)nc.wK=false; if(fr===7&&fc===0)nc.wQ=false;
  if(fr===0&&fc===7)nc.bK=false; if(fr===0&&fc===0)nc.bQ=false;
  return {board:nb,castling:nc,ep:newEp};
}

function legalMoves(board: Board, color: Color, castling: Castling, ep: [number,number]|null): Move[] {
  const moves: Move[] = [];
  for (let r=0;r<8;r++) for(let c=0;c<8;c++) {
    if(board[r][c]?.color!==color)continue;
    for(const m of pseudoMoves(board,r,c,castling,ep)){
      const{board:nb}=applyMove(board,m,castling,ep);
      if(!isInCheck(nb,color))moves.push(m);
    }
  }
  return moves;
}

// ─── AI ───────────────────────────────────────────────────────────────────────
const PIECE_VAL: Record<PType,number>={P:100,N:320,B:330,R:500,Q:900,K:20000};
function evalBoard(board: Board, col: Color): number {
  let s=0;
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){const p=board[r][c];if(!p)continue;s+=p.color===col?PIECE_VAL[p.type]:-PIECE_VAL[p.type];}
  return s;
}
function minimax(b:Board,col:Color,cast:Castling,ep:[number,number]|null,depth:number,alpha:number,beta:number,max:boolean,aiCol:Color):number{
  if(depth===0)return evalBoard(b,aiCol);
  const mvs=legalMoves(b,col,cast,ep);
  if(!mvs.length)return isInCheck(b,col)?(max?-9999:9999):0;
  const opp=col==="w"?"b":"w";
  if(max){let best=-Infinity;for(const m of mvs){const{board:nb,castling:nc,ep:ne}=applyMove(b,m,cast,ep);const v=minimax(nb,opp,nc,ne,depth-1,alpha,beta,false,aiCol);best=Math.max(best,v);alpha=Math.max(alpha,v);if(beta<=alpha)break;}return best;}
  else{let best=Infinity;for(const m of mvs){const{board:nb,castling:nc,ep:ne}=applyMove(b,m,cast,ep);const v=minimax(nb,opp,nc,ne,depth-1,alpha,beta,true,aiCol);best=Math.min(best,v);beta=Math.min(beta,v);if(beta<=alpha)break;}return best;}
}
function getBestMove(board:Board,color:Color,castling:Castling,ep:[number,number]|null,depth:number):Move|null{
  const mvs=legalMoves(board,color,castling,ep);
  if(!mvs.length)return null;
  if(depth===0)return mvs[Math.floor(Math.random()*mvs.length)];
  let best:Move|null=null,bestV=-Infinity;
  const opp=color==="w"?"b":"w";
  for(const m of mvs){const{board:nb,castling:nc,ep:ne}=applyMove(board,m,castling,ep);const v=minimax(nb,opp,nc,ne,depth-1,-Infinity,Infinity,false,color);if(v>bestV){bestV=v;best=m;}}
  return best;
}

// ─── Initial board ────────────────────────────────────────────────────────────
function makeInitBoard(): Board {
  const b: Board = Array.from({length:8},()=>Array(8).fill(null));
  const order: PType[]=["R","N","B","Q","K","B","N","R"];
  order.forEach((t,c)=>{b[0][c]={type:t,color:"b"};b[7][c]={type:t,color:"w"};});
  for(let c=0;c<8;c++){b[1][c]={type:"P",color:"b"};b[6][c]={type:"P",color:"w"};}
  return b;
}

// ─── 3-D piece drawing ────────────────────────────────────────────────────────
function drawPiece3D(ctx: CanvasRenderingContext2D, piece: Piece, cx: number, cy: number) {
  const isW = piece.color === "w";
  const sq  = SQ; // 62

  // Bottom of the piece sits here (slightly below centre so the piece looks "on" the square)
  const bot = cy + sq * 0.34;

  // ── Palette ────────────────────────────────────────────────────────────────
  const [c0, c1, c2, c3] = isW
    ? ["#fffff4","#e8d090","#b07830","#6a3e10"]
    : ["#a0a0a0","#383838","#161616","#040404"];
  const topFace  = isW ? "#fffff0" : "#5a5a5a";
  const outline  = isW ? "rgba(160,100,30,0.45)" : "rgba(140,140,140,0.2)";
  const hiStroke = isW ? "rgba(255,255,255,0.68)" : "rgba(200,200,200,0.2)";

  // ── Gradient helpers ───────────────────────────────────────────────────────
  // Horizontal (lit-from-left) gradient between two absolute x coords
  const hg = (x0: number, x1: number): CanvasGradient => {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, c0); g.addColorStop(0.25, c1); g.addColorStop(0.65, c2); g.addColorStop(1, c3);
    return g;
  };
  // Radial gradient for a sphere at absolute (x,y) with radius r
  const rg = (x: number, y: number, r: number): CanvasGradient => {
    const g = ctx.createRadialGradient(x-r*0.3, y-r*0.32, r*0.04, x+r*0.08, y+r*0.08, r);
    g.addColorStop(0, c0); g.addColorStop(0.28, c1); g.addColorStop(0.65, c2); g.addColorStop(1, c3);
    return g;
  };

  // ── Ground shadow ──────────────────────────────────────────────────────────
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.27)";
  ctx.beginPath();
  ctx.ellipse(cx+2.5, bot+sq*0.08, sq*0.31, sq*0.055, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  // ── Cylinder (x, topY → botY, half-width rw) ──────────────────────────────
  const cyl = (x: number, topY: number, btmY: number, rw: number) => {
    if (topY >= btmY || rw <= 0) return;
    const rh = rw * 0.22; // perspective flattening
    ctx.save();
    // Side body
    ctx.beginPath();
    ctx.moveTo(x-rw, topY); ctx.lineTo(x+rw, topY); ctx.lineTo(x+rw, btmY);
    ctx.arc(x, btmY, rw, 0, Math.PI);
    ctx.lineTo(x-rw, topY);
    ctx.fillStyle = hg(x-rw, x+rw); ctx.fill();
    ctx.strokeStyle = outline; ctx.lineWidth = 0.7; ctx.stroke();
    // Top face ellipse
    ctx.beginPath(); ctx.ellipse(x, topY, rw, rh, 0, 0, Math.PI*2);
    ctx.fillStyle = topFace; ctx.fill();
    ctx.strokeStyle = outline; ctx.lineWidth = 0.5; ctx.stroke();
    // Left-side specular highlight
    ctx.strokeStyle = hiStroke; ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x-rw+rw*0.08, topY+(btmY-topY)*0.1);
    ctx.bezierCurveTo(x-rw*0.88, topY+(btmY-topY)*0.35, x-rw*0.88, topY+(btmY-topY)*0.68, x-rw*0.78, btmY-(btmY-topY)*0.08);
    ctx.stroke();
    ctx.restore();
  };

  // ── Sphere at absolute (x,y) ───────────────────────────────────────────────
  const sph = (x: number, y: number, r: number) => {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2);
    ctx.fillStyle = rg(x, y, r); ctx.fill();
    ctx.strokeStyle = outline; ctx.lineWidth = 0.7; ctx.stroke();
    ctx.strokeStyle = hiStroke; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x-r*0.22, y-r*0.24, r*0.6, Math.PI*1.08, Math.PI*1.82);
    ctx.stroke();
    ctx.restore();
  };

  const baseTopY = bot - sq*0.10;
  const baseRw   = sq * 0.27;

  // ── Pieces ─────────────────────────────────────────────────────────────────
  switch (piece.type) {

    // ── Pawn ─────────────────────────────────────────────────────────────────
    case "P": {
      const shaftTopY  = bot - sq*0.42;
      const collarBotY = shaftTopY + sq*0.07;
      const collarTopY = shaftTopY - sq*0.02;
      const headCY     = bot - sq*0.57;
      const headR      = sq * 0.13;
      cyl(cx, baseTopY, bot, baseRw);
      cyl(cx, shaftTopY, baseTopY, sq*0.085);
      cyl(cx, collarTopY, collarBotY, sq*0.13);
      sph(cx, headCY, headR);
      break;
    }

    // ── Rook ─────────────────────────────────────────────────────────────────
    case "R": {
      const shaftTopY = bot - sq*0.48;
      const platTopY  = shaftTopY - sq*0.10;
      const merlonH   = sq * 0.13;
      cyl(cx, baseTopY, bot, baseRw);
      cyl(cx, shaftTopY, baseTopY, sq*0.14);
      cyl(cx, platTopY, shaftTopY, sq*0.21);
      // 3 merlons (battlements)
      const mRw = sq * 0.055;
      [-sq*0.11, 0, sq*0.11].forEach(ox => cyl(cx+ox, platTopY-merlonH, platTopY, mRw));
      break;
    }

    // ── Knight (horse head profile) ───────────────────────────────────────────
    case "N": {
      const neckTopY = bot - sq*0.38;
      const hH       = sq * 0.42; // head height from neck top
      cyl(cx, baseTopY, bot, baseRw);
      cyl(cx, neckTopY, baseTopY, sq*0.11);
      // Horse head – drawn in local coords after translate(cx, neckTopY)
      ctx.save();
      ctx.translate(cx, neckTopY);
      // Path (facing right)
      const hp = new Path2D();
      hp.moveTo(-sq*0.06, 0);
      hp.bezierCurveTo(-sq*0.07,-hH*0.22, sq*0.14,-hH*0.28, sq*0.16,-hH*0.55);
      hp.bezierCurveTo(sq*0.18, -hH*0.75, sq*0.13,-hH*0.86, sq*0.08,-hH*0.91);
      hp.bezierCurveTo(sq*0.04, -hH*0.95,-sq*0.02,-hH*0.90,-sq*0.04,-hH*0.84);
      hp.bezierCurveTo(-sq*0.09,-hH*0.77,-sq*0.10,-hH*0.66,-sq*0.08,-hH*0.54);
      hp.bezierCurveTo(-sq*0.06,-hH*0.43,-sq*0.13,-hH*0.32,-sq*0.14,-hH*0.17);
      hp.bezierCurveTo(-sq*0.14,-hH*0.07,-sq*0.10, 0, -sq*0.06, 0);
      hp.closePath();
      // Gradient in local (translated) space
      const ng = ctx.createLinearGradient(-sq*0.14, 0, sq*0.18, 0);
      ng.addColorStop(0,c0); ng.addColorStop(0.25,c1); ng.addColorStop(0.65,c2); ng.addColorStop(1,c3);
      ctx.fillStyle = ng; ctx.fill(hp);
      ctx.strokeStyle = outline; ctx.lineWidth = 0.8; ctx.stroke(hp);
      // Left specular
      ctx.strokeStyle = hiStroke; ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-sq*0.05,-hH*0.12);
      ctx.bezierCurveTo(-sq*0.07,-hH*0.30, sq*0.10,-hH*0.34, sq*0.13,-hH*0.58);
      ctx.stroke();
      // Mane
      ctx.strokeStyle = isW ? "rgba(180,120,40,0.65)" : "rgba(40,40,40,0.88)";
      ctx.lineWidth = 3.2; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-sq*0.03,-hH*0.06);
      ctx.bezierCurveTo(sq*0.02,-hH*0.22, sq*0.13,-hH*0.26, sq*0.10,-hH*0.54);
      ctx.stroke();
      // Eye
      ctx.fillStyle = isW ? "#3a2010" : "#f0c040";
      ctx.beginPath(); ctx.arc(sq*0.07,-hH*0.67, sq*0.028, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.beginPath(); ctx.arc(sq*0.062,-hH*0.678, sq*0.01, 0, Math.PI*2); ctx.fill();
      // Nostril
      ctx.fillStyle = isW ? "rgba(80,40,10,0.55)" : "rgba(0,0,0,0.7)";
      ctx.beginPath(); ctx.ellipse(sq*0.1,-hH*0.88, sq*0.022, sq*0.016, 0.2, 0, Math.PI*2); ctx.fill();
      ctx.restore();
      break;
    }

    // ── Bishop (mitre hat) ────────────────────────────────────────────────────
    case "B": {
      const collarTopY = bot - sq*0.42;
      const shaftTopY  = bot - sq*0.52;
      const mitreBotY  = shaftTopY;
      const mitreH     = sq * 0.24;
      const finialR    = sq * 0.058;
      cyl(cx, baseTopY, bot, baseRw);
      cyl(cx, shaftTopY, baseTopY, sq*0.085);
      cyl(cx, collarTopY, collarTopY+sq*0.06, sq*0.15);
      // Mitre body (bishop's tall pointed hat)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx-sq*0.13, mitreBotY);
      ctx.bezierCurveTo(cx-sq*0.08, mitreBotY-mitreH*0.32, cx-sq*0.03, mitreBotY-mitreH*0.62, cx, mitreBotY-mitreH);
      ctx.bezierCurveTo(cx+sq*0.03, mitreBotY-mitreH*0.62, cx+sq*0.08, mitreBotY-mitreH*0.32, cx+sq*0.13, mitreBotY);
      ctx.closePath();
      ctx.fillStyle = hg(cx-sq*0.13, cx+sq*0.13); ctx.fill();
      ctx.strokeStyle = outline; ctx.lineWidth = 0.7; ctx.stroke();
      // Left specular
      ctx.strokeStyle = hiStroke; ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(cx-sq*0.1, mitreBotY-mitreH*0.06);
      ctx.bezierCurveTo(cx-sq*0.07, mitreBotY-mitreH*0.36, cx-sq*0.02, mitreBotY-mitreH*0.60, cx, mitreBotY-mitreH);
      ctx.stroke();
      // Mitre horizontal band
      ctx.strokeStyle = isW ? "rgba(140,90,25,0.5)" : "rgba(100,100,100,0.38)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(cx-sq*0.10, mitreBotY-mitreH*0.40);
      ctx.lineTo(cx+sq*0.10, mitreBotY-mitreH*0.40);
      ctx.stroke();
      ctx.restore();
      // Ball finial at the very tip
      sph(cx, mitreBotY-mitreH-finialR*0.4, finialR);
      break;
    }

    // ── Queen (orb crown with 5 points) ──────────────────────────────────────
    case "Q": {
      const shaftTopY  = bot - sq*0.46;
      const crownTopY  = shaftTopY - sq*0.14;
      const orbR       = sq * 0.092;
      cyl(cx, baseTopY, bot, baseRw);
      cyl(cx, shaftTopY, baseTopY, sq*0.10);
      cyl(cx, crownTopY, shaftTopY, sq*0.18); // crown band
      // 5 crown ball points arranged in an arc
      const qPts: [number, number][] = [
        [-sq*0.16, sq*0.055],
        [-sq*0.09, sq*0.10],
        [0,        sq*0.13],
        [sq*0.09,  sq*0.10],
        [sq*0.16,  sq*0.055],
      ];
      qPts.forEach(([ox, oy]) => sph(cx+ox, crownTopY-oy, sq*0.048));
      // Centre orb (slightly larger, crowning the crown)
      sph(cx, crownTopY-sq*0.15, orbR);
      break;
    }

    // ── King (cross crown) ────────────────────────────────────────────────────
    case "K": {
      const shaftTopY = bot - sq*0.44;
      const crownTopY = shaftTopY - sq*0.12;
      cyl(cx, baseTopY, bot, baseRw);
      cyl(cx, shaftTopY, baseTopY, sq*0.10);
      cyl(cx, crownTopY, shaftTopY, sq*0.18);
      // 3 crown ball points (left, centre-front, right)
      [[-sq*0.15, sq*0.065], [0, sq*0.095], [sq*0.15, sq*0.065]].forEach(([ox, oy]) => {
        sph(cx+ox as number, crownTopY-(oy as number), sq*0.046);
      });
      // Cross rising from centre
      const crossBotY = crownTopY - sq*0.04;
      const crossH    = sq * 0.24;
      const stemW     = sq * 0.052;
      const armW      = sq * 0.14;
      const armH      = sq * 0.05;
      const armY      = crossBotY - crossH * 0.62;
      ctx.save();
      // Vertical stem
      ctx.fillStyle = hg(cx-stemW/2, cx+stemW/2);
      ctx.fillRect(cx-stemW/2, crossBotY-crossH, stemW, crossH);
      ctx.strokeStyle = outline; ctx.lineWidth = 0.7;
      ctx.strokeRect(cx-stemW/2, crossBotY-crossH, stemW, crossH);
      // Stem top face
      ctx.beginPath(); ctx.ellipse(cx, crossBotY-crossH, stemW/2, stemW*0.18, 0, 0, Math.PI*2);
      ctx.fillStyle = topFace; ctx.fill();
      // Horizontal arm
      ctx.fillStyle = hg(cx-armW/2, cx+armW/2);
      ctx.fillRect(cx-armW/2, armY-armH/2, armW, armH);
      ctx.strokeStyle = outline; ctx.lineWidth = 0.7;
      ctx.strokeRect(cx-armW/2, armY-armH/2, armW, armH);
      // Arm top face
      ctx.beginPath(); ctx.ellipse(cx, armY-armH/2, armW/2, armH*0.2, 0, 0, Math.PI*2);
      ctx.fillStyle = topFace; ctx.fill();
      ctx.restore();
      break;
    }
  }
}

function drawBoard(
  ctx: CanvasRenderingContext2D,
  board: Board,
  selected: [number,number]|null,
  legalMs: Move[],
  lastMove: Move|null,
  checkSq: [number,number]|null,
  flipped = false,
) {
  // ── Outer wooden frame ──
  const fg = ctx.createLinearGradient(0,0,CW,CH);
  fg.addColorStop(0,"#a07035"); fg.addColorStop(0.45,"#7a4e18"); fg.addColorStop(0.7,"#6b4311"); fg.addColorStop(1,"#4e2e0a");
  ctx.fillStyle = fg; ctx.fillRect(0,0,CW,CH);
  ctx.fillStyle = "rgba(255,200,100,0.22)"; ctx.fillRect(0,0,CW,5); ctx.fillRect(0,0,5,CH);
  ctx.fillStyle = "rgba(0,0,0,0.38)"; ctx.fillRect(0,CH-5,CW,5); ctx.fillRect(CW-5,0,5,CH);
  ctx.strokeStyle = "rgba(255,190,60,0.45)"; ctx.lineWidth = 1.5;
  ctx.strokeRect(BORDER-5,BORDER-5,SQ*8+10,SQ*8+10);
  ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 1;
  ctx.strokeRect(BORDER-7,BORDER-7,SQ*8+14,SQ*8+14);

  // ── Squares ──
  // ri/ci = canvas row/col; boardR/boardC = logical board position
  for (let ri=0;ri<8;ri++) for (let ci=0;ci<8;ci++) {
    const boardR = flipped ? 7-ri : ri;
    const boardC = flipped ? 7-ci : ci;
    const x=BORDER+ci*SQ, y=BORDER+ri*SQ;
    const isLight = (boardR+boardC)%2===0;
    let baseLight = isLight ? "#f0d9b5" : "#b58863";

    if (lastMove && ((lastMove.from[0]===boardR&&lastMove.from[1]===boardC)||(lastMove.to[0]===boardR&&lastMove.to[1]===boardC)))
      baseLight = isLight ? "#cdd16f" : "#a9a030";
    if (selected && selected[0]===boardR && selected[1]===boardC)
      baseLight = isLight ? "#f8f870" : "#d0d020";

    ctx.fillStyle = baseLight; ctx.fillRect(x,y,SQ,SQ);

    if (checkSq && checkSq[0]===boardR && checkSq[1]===boardC) {
      const g=ctx.createRadialGradient(x+SQ/2,y+SQ/2,2,x+SQ/2,y+SQ/2,SQ/2);
      g.addColorStop(0,"rgba(230,0,0,0.92)"); g.addColorStop(0.55,"rgba(200,0,0,0.45)"); g.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=g; ctx.fillRect(x,y,SQ,SQ);
    }

    const isLegal = legalMs.some(m=>m.to[0]===boardR&&m.to[1]===boardC);
    if (isLegal) {
      const hasCapture = !!board[boardR][boardC];
      if (hasCapture) {
        ctx.strokeStyle="rgba(0,0,0,0.52)"; ctx.lineWidth=4.5;
        ctx.beginPath(); ctx.arc(x+SQ/2,y+SQ/2,SQ/2-3,0,Math.PI*2); ctx.stroke();
      } else {
        ctx.fillStyle="rgba(0,0,0,0.21)";
        ctx.beginPath(); ctx.arc(x+SQ/2,y+SQ/2,SQ*0.175,0,Math.PI*2); ctx.fill();
      }
    }
  }

  // ── Coordinates ──
  ctx.font = `bold 11px Georgia, serif`;
  for (let i=0;i<8;i++) {
    const rank = flipped ? i+1 : 8-i;
    const file = flipped ? "hgfedcba"[i] : "abcdefgh"[i];
    const col = i%2===0 ? "#c8a248" : "#d4b460";
    ctx.fillStyle=col; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(String(rank), BORDER/2, BORDER+i*SQ+SQ/2);
    ctx.fillText(String(rank), CW-BORDER/2, BORDER+i*SQ+SQ/2);
    ctx.fillText(file, BORDER+i*SQ+SQ/2, BORDER/2);
    ctx.fillText(file, BORDER+i*SQ+SQ/2, CH-BORDER/2);
  }

  // ── Pieces ──
  for (let ri=0;ri<8;ri++) for(let ci=0;ci<8;ci++) {
    const boardR = flipped ? 7-ri : ri;
    const boardC = flipped ? 7-ci : ci;
    const p=board[boardR][boardC]; if(!p)continue;
    drawPiece3D(ctx,p,BORDER+ci*SQ+SQ/2,BORDER+ri*SQ+SQ/2);
  }
}

// ─── Online Lobby ─────────────────────────────────────────────────────────────
function OnlineLobby({
  status, roomCode, error,
  onHost, onJoin, onBack, initialCode = "",
}: {
  status: string; roomCode: string; error: string; initialCode?: string;
  onHost: () => void;
  onJoin: (code: string) => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState(initialCode);
  const [view, setView] = useState<"pick"|"host"|"join">(() => initialCode.length >= 4 ? "join" : "pick");

  if (view === "pick") return (
    <div className="flex flex-col items-center gap-4 w-full max-w-xs">
      <p className="text-violet-300 font-black text-lg">Online Chess</p>
      <button onClick={() => { setView("host"); onHost(); }}
        className="w-full py-3 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/50 text-violet-300 font-bold rounded-2xl transition-colors">
        🏠 Host a Game <span className="text-xs font-normal block text-muted-foreground mt-0.5">Play as White · share a 4-letter code</span>
      </button>
      <button onClick={() => setView("join")}
        className="w-full py-3 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/50 text-indigo-300 font-bold rounded-2xl transition-colors">
        🔗 Join a Game <span className="text-xs font-normal block text-muted-foreground mt-0.5">Play as Black · enter the host's code</span>
      </button>
      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</button>
    </div>
  );

  if (view === "host") return (
    <div className="flex flex-col items-center gap-4 w-full max-w-xs text-center">
      <p className="text-violet-300 font-black text-lg">Hosting a Game</p>
      {status === "connecting" && <p className="text-muted-foreground text-sm">Connecting…</p>}
      {status === "waiting" && (
        <>
          <p className="text-muted-foreground text-sm">Share this code with your opponent:</p>
          <div className="text-5xl font-black text-violet-300 tracking-widest font-mono bg-violet-500/10 border border-violet-500/30 rounded-2xl px-6 py-4">{roomCode}</div>
          <p className="text-xs text-muted-foreground">or scan to join instantly:</p>
          <div className="p-2 bg-white rounded-xl">
            <QRCode value={buildInviteUrl(roomCode)} size={130} />
          </div>
          <p className="text-muted-foreground text-xs animate-pulse">Waiting for opponent to join…</p>
        </>
      )}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button onClick={() => { setView("pick"); onBack(); }} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Cancel</button>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-xs text-center">
      <p className="text-indigo-300 font-black text-lg">Join a Game</p>
      <p className="text-muted-foreground text-sm">Enter the 4-letter room code:</p>
      <input
        value={code} onChange={e => setCode(e.target.value.toUpperCase().slice(0,4))}
        placeholder="ABCD"
        className="text-center text-3xl font-black font-mono tracking-widest bg-background border border-border rounded-xl px-4 py-3 w-40 focus:outline-none focus:border-indigo-500 text-foreground"
      />
      <button
        onClick={() => code.length === 4 && onJoin(code)}
        disabled={code.length !== 4 || status === "connecting"}
        className="w-full py-3 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/50 text-indigo-300 font-bold rounded-2xl transition-colors disabled:opacity-40"
      >
        {status === "connecting" ? "Connecting…" : "Join →"}
      </button>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button onClick={() => { setView("pick"); onBack(); }} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</button>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Chess() {
  const cv = useRef<HTMLCanvasElement>(null);

  const boardRef    = useRef<Board>(makeInitBoard());
  const castlingRef = useRef<Castling>({wK:true,wQ:true,bK:true,bQ:true});
  const epRef       = useRef<[number,number]|null>(null);
  const turnRef     = useRef<Color>("w");
  const selectedRef = useRef<[number,number]|null>(null);
  const legalMsRef  = useRef<Move[]>([]);
  const lastMoveRef = useRef<Move|null>(null);
  const promoRef    = useRef<{from:[number,number];to:[number,number]}|null>(null);
  const gameOverRef = useRef(false);
  const aiThinking  = useRef(false);
  // Online-specific refs
  const myColorRef  = useRef<Color>("w");   // which color this client controls
  const flippedRef  = useRef(false);        // true when playing as Black

  const [mode,         setMode]         = useState<Mode>("ai");
  const [aiDiff,       setAiDiff]       = useState<AIDiff>("medium");
  const [screen,       setScreen]       = useState<"menu"|"online-lobby"|"game">(() => getUrlRoomCode() ? "online-lobby" : "menu");
  const [status,       setStatus]       = useState("White's turn");
  const [promoVisible, setPromoVisible] = useState(false);
  const [result,       setResult]       = useState<string|null>(null);
  const [onlineError,  setOnlineError]  = useState("");
  const [,             forceUpdate]     = useState(0);

  // ─── Relay socket ────────────────────────────────────────────────────────────
  const { status: relayStatus, roomCode: onlineCode, role: relayRole,
          createRoom, joinRoom, send: relaySend, disconnect: relayDisconnect } =
    useRelaySocket("chess", {
      onRoomCreated: () => { /* status updates handled by relayStatus */ },
      onRoomJoined:  () => startOnlineGame("guest"),
      onOpponentJoined: () => startOnlineGame("host"),
      onMessage: (data) => {
        const msg = data as { type?: string; from?: [number,number]; to?: [number,number]; promo?: PType };
        if (msg?.type === "move" && msg.from && msg.to) {
          applyRemoteMove({ from: msg.from, to: msg.to, promo: msg.promo });
        }
      },
      onOpponentLeft: () => {
        gameOverRef.current = true;
        setResult("Opponent disconnected 😔");
      },
      onError: (msg) => setOnlineError(msg),
    });

  // ─── Drawing ─────────────────────────────────────────────────────────────────
  const redraw = useCallback(() => {
    const c = cv.current; if(!c)return;
    const ctx = c.getContext("2d")!;
    const checkSq = isInCheck(boardRef.current, turnRef.current) ? findKing(boardRef.current, turnRef.current) : null;
    drawBoard(ctx, boardRef.current, selectedRef.current, legalMsRef.current, lastMoveRef.current, checkSq, flippedRef.current);
  }, []);

  // ─── Game logic ──────────────────────────────────────────────────────────────
  const checkGameOver = useCallback(() => {
    const col = turnRef.current;
    const mvs = legalMoves(boardRef.current, col, castlingRef.current, epRef.current);
    if (mvs.length===0) {
      gameOverRef.current = true;
      if (isInCheck(boardRef.current, col)) {
        setResult(`${col==="w"?"Black":"White"} wins by checkmate! 🏆`);
      } else {
        setResult("Draw by stalemate 🤝");
      }
      return true;
    }
    const inChk = isInCheck(boardRef.current, col);
    setStatus(`${col==="w"?"White":"Black"}'s turn${inChk?" — CHECK!":""}`);
    return false;
  }, []);

  const performMove = useCallback((move: Move) => {
    const {board:nb,castling:nc,ep:ne}=applyMove(boardRef.current,move,castlingRef.current,epRef.current);
    boardRef.current=nb; castlingRef.current=nc; epRef.current=ne;
    lastMoveRef.current=move; selectedRef.current=null; legalMsRef.current=[];
    turnRef.current=turnRef.current==="w"?"b":"w";
    redraw(); checkGameOver();
  }, [redraw, checkGameOver]);

  // Apply a move received from the network (no sending back)
  const applyRemoteMove = useCallback((move: Move) => {
    performMove(move);
  }, [performMove]);

  const triggerAI = useCallback((diff: AIDiff) => {
    if (aiThinking.current||gameOverRef.current) return;
    aiThinking.current=true; setStatus("AI thinking…");
    const depth = diff==="easy"?0:diff==="medium"?2:3;
    setTimeout(()=>{
      const m=getBestMove(boardRef.current,"b",castlingRef.current,epRef.current,depth);
      aiThinking.current=false;
      if(m)performMove(m); else checkGameOver();
    }, depth===0?180:320);
  }, [performMove, checkGameOver]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameOverRef.current||promoRef.current) return;
    const currentMode = mode, currentDiff = aiDiff;

    // Online: block when not your turn or not connected
    if (currentMode==="online") {
      if (relayStatus !== "connected") return;
      if (turnRef.current !== myColorRef.current) return;
    }
    if (currentMode==="ai"&&turnRef.current==="b") return;

    const rect = cv.current!.getBoundingClientRect();
    const px=(e.clientX-rect.left)*(CW/rect.width);
    const py=(e.clientY-rect.top)*(CH/rect.height);
    const ci=Math.floor((px-BORDER)/SQ), ri=Math.floor((py-BORDER)/SQ);
    if(ci<0||ci>=8||ri<0||ri>=8)return;
    // Flip canvas coords → board coords
    const boardR = flippedRef.current ? 7-ri : ri;
    const boardC = flippedRef.current ? 7-ci : ci;

    const sel=selectedRef.current;
    if (sel) {
      const matches=legalMsRef.current.filter(m=>m.to[0]===boardR&&m.to[1]===boardC);
      if (matches.length>0) {
        if (matches[0].promo) {
          promoRef.current={from:matches[0].from,to:matches[0].to};
          setPromoVisible(true); redraw(); return;
        }
        if (currentMode==="online") {
          relaySend({ type:"move", from:matches[0].from, to:matches[0].to });
        }
        performMove(matches[0]);
        if(currentMode==="ai"&&turnRef.current==="b"&&!gameOverRef.current) triggerAI(currentDiff);
        return;
      }
      selectedRef.current=null; legalMsRef.current=[];
    }
    const piece=boardRef.current[boardR][boardC];
    if (piece&&piece.color===turnRef.current) {
      const mvs=legalMoves(boardRef.current,turnRef.current,castlingRef.current,epRef.current)
        .filter(m=>m.from[0]===boardR&&m.from[1]===boardC);
      selectedRef.current=[boardR,boardC]; legalMsRef.current=mvs;
    }
    redraw();
  }, [mode, aiDiff, relayStatus, redraw, performMove, triggerAI, relaySend]);

  const handlePromo = useCallback((p: PType) => {
    const pr=promoRef.current; if(!pr)return;
    const {from,to}=pr;
    const m=legalMsRef.current.find(m=>m.from[0]===from[0]&&m.from[1]===from[1]&&m.to[0]===to[0]&&m.to[1]===to[1]&&m.promo===p);
    promoRef.current=null; setPromoVisible(false);
    if(!m)return;
    const currentMode=mode, currentDiff=aiDiff;
    if (currentMode==="online") {
      relaySend({ type:"move", from:m.from, to:m.to, promo:m.promo });
    }
    performMove(m);
    if(currentMode==="ai"&&turnRef.current==="b"&&!gameOverRef.current) triggerAI(currentDiff);
  }, [mode, aiDiff, performMove, triggerAI, relaySend]);

  const startGame = useCallback((m: Mode, diff: AIDiff="medium") => {
    boardRef.current=makeInitBoard();
    castlingRef.current={wK:true,wQ:true,bK:true,bQ:true};
    epRef.current=null; turnRef.current="w"; selectedRef.current=null;
    legalMsRef.current=[]; lastMoveRef.current=null; promoRef.current=null;
    gameOverRef.current=false; aiThinking.current=false;
    flippedRef.current=false; myColorRef.current="w";
    setMode(m); setAiDiff(diff); setScreen("game");
    setStatus("White's turn"); setResult(null); setPromoVisible(false);
    forceUpdate(n=>n+1);
  }, []);

  const startOnlineGame = useCallback((role: "host"|"guest") => {
    boardRef.current=makeInitBoard();
    castlingRef.current={wK:true,wQ:true,bK:true,bQ:true};
    epRef.current=null; turnRef.current="w"; selectedRef.current=null;
    legalMsRef.current=[]; lastMoveRef.current=null; promoRef.current=null;
    gameOverRef.current=false; aiThinking.current=false;
    myColorRef.current = role === "host" ? "w" : "b";
    flippedRef.current = role === "guest";
    setMode("online"); setScreen("game");
    setStatus("White's turn"); setResult(null); setPromoVisible(false);
    forceUpdate(n=>n+1);
  }, []);

  useEffect(()=>{
    if(screen==="game") { setTimeout(()=>redraw(),10); }
  }, [screen, redraw]);

  // ─── Screens ──────────────────────────────────────────────────────────────────
  if (screen==="menu") return (
    <Shell title="Chess">
      <div className="flex flex-col items-center gap-6 max-w-xs w-full text-center py-4">
        <div className="text-7xl select-none" style={{filter:"drop-shadow(0 6px 18px #a78bfa60)"}}>♟️</div>
        <h2 className="text-2xl font-black text-violet-300">Chess</h2>
        <div className="w-full flex flex-col gap-3">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">2 Players</p>
          <button onClick={()=>startGame("local")}
            className="py-3 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/50 text-violet-300 font-bold rounded-2xl transition-colors">
            👥 Local vs Local
          </button>
          <button onClick={()=>{ setOnlineError(""); setScreen("online-lobby"); }}
            className="py-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 font-bold rounded-2xl transition-colors">
            🌐 Online Multiplayer
          </button>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mt-2">vs Computer</p>
          <div className="flex gap-2">
            {(["easy","medium","hard"] as AIDiff[]).map(d=>(
              <button key={d} onClick={()=>startGame("ai",d)}
                className="flex-1 py-3 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/50 text-indigo-300 font-bold rounded-xl capitalize transition-colors">
                🤖 {d}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );

  if (screen==="online-lobby") return (
    <Shell title="Chess · Online">
      <OnlineLobby
        status={relayStatus}
        roomCode={onlineCode}
        error={onlineError}
        initialCode={getUrlRoomCode()}
        onHost={() => { setOnlineError(""); createRoom(); }}
        onJoin={(code) => { setOnlineError(""); joinRoom(code); }}
        onBack={() => { relayDisconnect(); setScreen("menu"); }}
      />
    </Shell>
  );

  const myColor = myColorRef.current;
  const isOnlineMyTurn = mode === "online" && turnRef.current === myColor && relayStatus === "connected";

  return (
    <Shell title="Chess">
      <p className="text-sm font-mono font-bold" style={{color: result ? "#f59e0b" : "#a5b4fc"}}>
        {result ?? status}
      </p>
      {mode === "online" && !result && (
        <p className="text-xs text-muted-foreground -mt-1">
          You are <span className="font-bold" style={{color: myColor==="w"?"#f5eccc":"#aaa"}}>{myColor==="w"?"White ♔":"Black ♚"}</span>
          {isOnlineMyTurn ? " — Your turn" : " — Opponent's turn"}
        </p>
      )}
      <div className="relative">
        <canvas ref={cv} width={CW} height={CH}
          onClick={handleCanvasClick}
          className="cursor-pointer block rounded-sm select-none"
          style={{
            maxWidth:"min(95vw,calc(95vh - 180px))", height:"auto",
            boxShadow:"0 24px 80px rgba(0,0,0,0.7),0 8px 24px rgba(0,0,0,0.5),inset 0 0 0 1px rgba(255,200,80,0.08)"
          }}
        />
        {promoVisible && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-sm">
            <div className="bg-stone-900 border border-violet-700 rounded-2xl p-5 flex flex-col items-center gap-3 shadow-2xl">
              <p className="text-violet-300 font-black text-sm tracking-widest uppercase">Promote Pawn</p>
              <div className="flex gap-2">
                {(["Q","R","B","N"] as PType[]).map(p=>(
                  <button key={p} onClick={()=>handlePromo(p)}
                    className="w-14 h-14 bg-violet-800/50 hover:bg-violet-600/70 border border-violet-500 rounded-xl text-2xl transition-colors">
                    {SYMBOLS[turnRef.current==="w"?"w":"b"][p]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {mode==="online" && relayStatus==="disconnected" && !result && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-sm">
            <p className="text-white font-bold text-lg">Opponent disconnected</p>
          </div>
        )}
      </div>
      <div className="flex gap-3">
        {mode !== "online" && (
          <button onClick={()=>startGame(mode,aiDiff)}
            className="px-5 py-2 bg-secondary hover:bg-secondary/70 text-foreground rounded-xl font-bold text-sm transition-colors">
            New Game
          </button>
        )}
        <button onClick={()=>{ relayDisconnect(); setScreen("menu"); }}
          className="px-5 py-2 bg-secondary hover:bg-secondary/70 text-foreground rounded-xl font-bold text-sm transition-colors">
          Menu
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        {mode==="ai"?`🤖 vs AI (${aiDiff})`:mode==="local"?"👥 Local 2P":"🌐 Online · Click piece then destination"}
      </p>
    </Shell>
  );
}
