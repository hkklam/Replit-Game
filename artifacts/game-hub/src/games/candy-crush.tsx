import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import {
  COLS, ROWS, GTYPES, LEVELS, GemType, SpecialType, Board,
  resetIds, mkCell, initBoard, getMatchGroups, findMatches,
  applyGravity, fillBoard, findHint,
} from "./candy-crush-board";

// ─── Layout ───────────────────────────────────────────────────────────────────
const CELL     = 60;
const PAD      = 6;
const CW       = COLS * CELL + PAD * 2;   // 492
const CH       = ROWS * CELL + PAD * 2;   // 492
const GRAVITY  = 2600;  // px/s²
const MAX_VY   = 980;
const HINT_DELAY = 5000;

// ─── Gem colours ──────────────────────────────────────────────────────────────
const GEM_L: Record<GemType, string> = {
  ruby:"#ff9090", sapphire:"#93c5fd", emerald:"#86efac",
  topaz:"#fde68a", amethyst:"#d8b4fe", diamond:"#f1f5f9",
};
const GEM_M: Record<GemType, string> = {
  ruby:"#ef4444", sapphire:"#3b82f6", emerald:"#22c55e",
  topaz:"#f59e0b", amethyst:"#a855f7", diamond:"#cbd5e1",
};
const GEM_D: Record<GemType, string> = {
  ruby:"#991b1b", sapphire:"#1e3a8a", emerald:"#14532d",
  topaz:"#78350f", amethyst:"#581c87", diamond:"#475569",
};
const GEM_CSS: Record<GemType, string> = {
  ruby:"#ef4444", sapphire:"#3b82f6", emerald:"#22c55e",
  topaz:"#f59e0b", amethyst:"#a855f7", diamond:"#e2e8f0",
};
const GEM_LABEL: Record<GemType, string> = {
  ruby:"Ruby", sapphire:"Sapphire", emerald:"Emerald",
  topaz:"Topaz", amethyst:"Amethyst", diamond:"Diamond",
};

// ─── Level backgrounds ────────────────────────────────────────────────────────
type Deco = "candy"|"citrus"|"garden"|"cave"|"stone"|"ice"|"lava"|"space"|"cosmos"|"none";
interface BgDef {
  top: string; bot: string;
  cellFill: string; cellLine: string;
  accent: string; deco: Deco;
}
const LEVEL_BGS: BgDef[] = [
  { top:"#f9a8d4", bot:"#be185d", cellFill:"rgba(255,255,255,0.18)", cellLine:"rgba(255,255,255,0.35)", accent:"#fbbf24", deco:"candy"  },
  { top:"#fed7aa", bot:"#c2410c", cellFill:"rgba(255,255,255,0.14)", cellLine:"rgba(255,255,255,0.28)", accent:"#facc15", deco:"citrus" },
  { top:"#c4b5fd", bot:"#5b21b6", cellFill:"rgba(255,255,255,0.12)", cellLine:"rgba(255,255,255,0.25)", accent:"#f0abfc", deco:"candy"  },
  { top:"#6ee7b7", bot:"#064e3b", cellFill:"rgba(0,0,0,0.15)",       cellLine:"rgba(255,255,255,0.18)", accent:"#a3e635", deco:"garden" },
  { top:"#312e81", bot:"#0d0a1e", cellFill:"rgba(255,255,255,0.06)", cellLine:"rgba(167,139,250,0.3)",  accent:"#818cf8", deco:"cave"   },
  { top:"#6b7280", bot:"#111827", cellFill:"rgba(0,0,0,0.22)",       cellLine:"rgba(255,255,255,0.12)", accent:"#9ca3af", deco:"stone"  },
  { top:"#e0f2fe", bot:"#0369a1", cellFill:"rgba(255,255,255,0.22)", cellLine:"rgba(255,255,255,0.45)", accent:"#bae6fd", deco:"ice"    },
  { top:"#3b0000", bot:"#7c2d12", cellFill:"rgba(0,0,0,0.22)",       cellLine:"rgba(239,68,68,0.3)",    accent:"#f97316", deco:"lava"   },
  { top:"#020617", bot:"#0f172a", cellFill:"rgba(255,255,255,0.04)", cellLine:"rgba(99,102,241,0.25)",  accent:"#6366f1", deco:"space"  },
  { top:"#1e0034", bot:"#0d001a", cellFill:"rgba(255,255,255,0.05)", cellLine:"rgba(192,132,252,0.25)", accent:"#c084fc", deco:"cosmos" },
];

// ─── Draw helpers ─────────────────────────────────────────────────────────────
function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function gemPath(ctx: CanvasRenderingContext2D, t: GemType, r: number) {
  ctx.beginPath();
  switch (t) {
    case "ruby":     // diamond
      ctx.moveTo(0,-r); ctx.lineTo(r*0.88,0); ctx.lineTo(0,r); ctx.lineTo(-r*0.88,0); ctx.closePath(); break;
    case "sapphire": { // rounded square
      const s=r*0.78, cr=s*0.3;
      ctx.moveTo(-s+cr,-s); ctx.lineTo(s-cr,-s); ctx.quadraticCurveTo(s,-s,s,-s+cr);
      ctx.lineTo(s,s-cr);   ctx.quadraticCurveTo(s,s,s-cr,s);
      ctx.lineTo(-s+cr,s);  ctx.quadraticCurveTo(-s,s,-s,s-cr);
      ctx.lineTo(-s,-s+cr); ctx.quadraticCurveTo(-s,-s,-s+cr,-s); ctx.closePath(); break; }
    case "emerald":  // triangle
      ctx.moveTo(0,-r); ctx.lineTo(r*0.9,r*0.6); ctx.lineTo(-r*0.9,r*0.6); ctx.closePath(); break;
    case "topaz":    // circle
      ctx.arc(0,0,r,0,Math.PI*2); break;
    case "amethyst": // hexagon
      for(let i=0;i<6;i++){const a=i*Math.PI/3-Math.PI/6; (i?ctx.lineTo:ctx.moveTo).call(ctx,Math.cos(a)*r,Math.sin(a)*r);} ctx.closePath(); break;
    case "diamond":  // 4-point star
      for(let i=0;i<8;i++){const a=i*Math.PI/4-Math.PI/2,rad=i%2?r*0.35:r; (i?ctx.lineTo:ctx.moveTo).call(ctx,Math.cos(a)*rad,Math.sin(a)*rad);} ctx.closePath(); break;
  }
}

function drawGem(
  ctx: CanvasRenderingContext2D,
  type: GemType, special: SpecialType|null,
  cx: number, cy: number, size: number,
  alpha: number, scale: number, selected: boolean, frame: number
) {
  if (alpha < 0.02 || scale < 0.02) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  const r = size * 0.48;

  if (selected) { ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 22 * (0.7 + 0.3*Math.sin(frame*0.15)); }
  else if (special === "colorbomb") { ctx.shadowColor = `hsl(${frame*3%360},100%,65%)`; ctx.shadowBlur = 18; }

  // Body gradient
  const g = ctx.createRadialGradient(-r*.3,-r*.35,r*.04, r*.1,r*.1,r*1.08);
  g.addColorStop(0, GEM_L[type]); g.addColorStop(0.55, GEM_M[type]); g.addColorStop(1, GEM_D[type]);
  gemPath(ctx, type, r);
  ctx.fillStyle = g; ctx.fill();

  // Outline
  ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 1.2;
  gemPath(ctx, type, r); ctx.stroke();

  // Shine highlight
  ctx.save();
  gemPath(ctx, type, r); ctx.clip();
  const sh = ctx.createRadialGradient(-r*.42,-r*.46,0, -r*.18,-r*.22,r*.72);
  sh.addColorStop(0,"rgba(255,255,255,0.78)"); sh.addColorStop(.45,"rgba(255,255,255,0.18)"); sh.addColorStop(1,"rgba(255,255,255,0)");
  ctx.fillStyle = sh; ctx.fillRect(-r,-r,r*2,r*2);
  ctx.restore();

  // Striped
  if (special === "striped_h" || special === "striped_v") {
    ctx.save(); gemPath(ctx, type, r); ctx.clip();
    ctx.strokeStyle = "rgba(255,255,255,0.65)"; ctx.lineWidth = 3;
    if (special === "striped_h") { for(let y=-r;y<=r;y+=7){ctx.beginPath();ctx.moveTo(-r,y);ctx.lineTo(r,y);ctx.stroke();} }
    else { for(let x=-r;x<=r;x+=7){ctx.beginPath();ctx.moveTo(x,-r);ctx.lineTo(x,r);ctx.stroke();} }
    ctx.restore();
    ctx.strokeStyle = `rgba(255,255,255,${.5+.5*Math.sin(frame*.2)})`; ctx.lineWidth = 2.5;
    gemPath(ctx, type, r); ctx.stroke();
  }

  // Color bomb rainbow border
  if (special === "colorbomb") {
    const h = frame*3%360;
    const rg = ctx.createLinearGradient(-r,-r,r,r);
    rg.addColorStop(0,`hsl(${h},100%,65%)`); rg.addColorStop(.33,`hsl(${(h+120)%360},100%,65%)`);
    rg.addColorStop(.67,`hsl(${(h+240)%360},100%,65%)`); rg.addColorStop(1,`hsl(${h},100%,65%)`);
    ctx.strokeStyle = rg; ctx.lineWidth = 3.5;
    gemPath(ctx, type, r*1.06); ctx.stroke();
  }
  ctx.restore();
}

// ─── Background & grid drawing ────────────────────────────────────────────────
type StarPt = { x:number; y:number; r:number; ph:number };
type Stripe = { ox:number; color:string };

function drawBg(ctx: CanvasRenderingContext2D, bg: BgDef, W: number, H: number,
  stars: StarPt[], stripes: Stripe[], frame: number) {
  const grd = ctx.createLinearGradient(0,0,0,H);
  grd.addColorStop(0, bg.top); grd.addColorStop(1, bg.bot);
  ctx.fillStyle = grd; ctx.fillRect(0,0,W,H);

  switch (bg.deco) {
    case "candy": case "citrus": {
      ctx.save(); ctx.globalAlpha = 0.11;
      stripes.forEach(s => {
        ctx.strokeStyle = s.color; ctx.lineWidth = 16;
        ctx.beginPath();
        const offX = (frame * 0.15 + s.ox) % (H * 2) - H;
        ctx.moveTo(offX - H, 0); ctx.lineTo(offX + H, H); ctx.stroke();
      });
      ctx.restore(); break;
    }
    case "cave": case "space": case "cosmos": {
      stars.forEach(s => {
        const a = .35 + .65 * Math.abs(Math.sin(s.ph + frame * .025));
        ctx.save(); ctx.globalAlpha = a;
        ctx.fillStyle = bg.deco === "cosmos" ? "#e9d5ff" : "#ffffff";
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      }); break;
    }
    case "garden": {
      stars.forEach((s, i) => {
        ctx.save(); ctx.globalAlpha = .06 + .04*Math.sin(s.ph + frame*.012 + i);
        ctx.fillStyle = "#4ade80";
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r*3, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      }); break;
    }
    case "ice": {
      stars.forEach(s => {
        ctx.save(); ctx.globalAlpha = .08 + .12*Math.abs(Math.sin(s.ph + frame*.015));
        ctx.strokeStyle = "#bae6fd"; ctx.lineWidth = 1;
        for(let i=0;i<6;i++){
          const a = i*Math.PI/3;
          ctx.beginPath(); ctx.moveTo(s.x,s.y); ctx.lineTo(s.x+Math.cos(a)*s.r*5,s.y+Math.sin(a)*s.r*5); ctx.stroke();
        }
        ctx.restore();
      }); break;
    }
    case "stone": {
      ctx.save(); ctx.globalAlpha = .06;
      ctx.strokeStyle = "#6b7280"; ctx.lineWidth = 1;
      for(let y=0;y<H;y+=18){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y+10);ctx.stroke();}
      ctx.restore(); break;
    }
    case "lava": {
      // Dark cracks
      ctx.save(); ctx.globalAlpha = .07;
      ctx.strokeStyle = "#f97316"; ctx.lineWidth = 1;
      stars.forEach(s=>{ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.x+s.r*6,s.y-s.r*3);ctx.stroke();});
      ctx.restore();
      // Bottom glow
      const lg = ctx.createLinearGradient(0,H*.65,0,H);
      lg.addColorStop(0,"rgba(249,115,22,0)"); lg.addColorStop(.6,"rgba(239,68,68,0.18)"); lg.addColorStop(1,"rgba(239,68,68,0.38)");
      ctx.fillStyle = lg; ctx.fillRect(0,H*.65,W,H*.35);
      // Pulsing glow blobs
      stars.slice(0,8).forEach((s,i)=>{
        const pulse = .2+.2*Math.sin(s.ph+frame*.04+i);
        ctx.save(); ctx.globalAlpha = pulse;
        const rg=ctx.createRadialGradient(s.x,H-.5,0,s.x,H-.5,s.r*8);
        rg.addColorStop(0,"#f97316"); rg.addColorStop(1,"rgba(239,68,68,0)");
        ctx.fillStyle=rg; ctx.beginPath(); ctx.arc(s.x,H,s.r*8,0,Math.PI*2); ctx.fill();
        ctx.restore();
      }); break;
    }
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, bg: BgDef) {
  const cr = CELL * .12;
  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) {
    const x = PAD + c*CELL + 2, y = PAD + r*CELL + 2;
    rrect(ctx, x, y, CELL-4, CELL-4, cr);
    ctx.fillStyle = bg.cellFill; ctx.fill();
    ctx.strokeStyle = bg.cellLine; ctx.lineWidth = 1; ctx.stroke();
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = "idle"|"selected"|"swapping"|"snapback"|"removing"|"falling"|"win"|"lose";
interface HUD { score:number; moves:number; target:number; lvIdx:number; cascade:number; phase:Phase; }
interface GA {
  id:number; type:GemType; special:SpecialType|null;
  col:number; row:number;
  x:number; y:number; tx:number; ty:number;
  vy:number; falling:boolean;
  scale:number; ts:number;
  alpha:number; ta:number;
  removing:boolean; hint:boolean; hintPh:number;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function CandyCrush() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [started, setStarted] = useState(false);
  const [hud, setHud] = useState<HUD>({ score:0, moves:20, target:400, lvIdx:0, cascade:0, phase:"idle" });
  const [overlay, setOverlay] = useState<"none"|"win"|"lose">("none");
  const restartRef = useRef<(next:boolean)=>void>(()=>{});

  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    resetIds();
    const board: Board = initBoard();
    const anims = new Map<number, GA>();
    let phase: Phase = "idle";
    let phaseUntil = 0, phaseOnEnd: (()=>void)|null = null;
    let selected: {r:number;c:number}|null = null;
    let score=0, cascade=0, lvIdx=0, moves=LEVELS[0].moves;
    let lastInput = performance.now(), hintCells: [[number,number],[number,number]]|null = null;
    let frame = 0;

    // Pre-generate per-level decoration data (reused across frames)
    const rng = ()=>Math.random();
    const stars: StarPt[] = Array.from({length:70},()=>({ x:rng()*CW, y:rng()*CH, r:.5+rng()*1.8, ph:rng()*Math.PI*2 }));
    const STRIPE_COLORS = ["#ff6b9d","#fbbf24","#60a5fa","#a78bfa","#34d399","#f87171"];
    const stripes: Stripe[] = Array.from({length:12},(_, i)=>({ ox:i*60, color:STRIPE_COLORS[i%STRIPE_COLORS.length] }));

    const gcx = (c:number) => PAD + c*CELL + CELL/2;
    const gcy = (r:number) => PAD + r*CELL + CELL/2;
    const upHud = () => setHud({ score, moves, target:LEVELS[lvIdx].target, lvIdx, cascade, phase });

    function spawnGA(cell:{id:number;type:GemType;special:SpecialType|null}, col:number, row:number, startY?:number): GA {
      const tx=gcx(col), ty=gcy(row);
      const sy = startY ?? ty;
      return { id:cell.id, type:cell.type, special:cell.special, col, row,
        x:gcx(col), y:sy, tx, ty, vy:0, falling:sy!==ty,
        scale:1, ts:1, alpha:1, ta:1, removing:false, hint:false, hintPh:rng()*Math.PI*2 };
    }

    function buildAnims() {
      anims.clear();
      for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
        const cell=board[r][c]; if(!cell) continue;
        anims.set(cell.id, spawnGA(cell,c,r));
      }
    }
    buildAnims();

    function setPhase(p:Phase, ms:number, onEnd?:()=>void) {
      phase=p; phaseUntil=performance.now()+ms; phaseOnEnd=onEnd??null;
    }
    function checkWinLose() {
      if(score>=LEVELS[lvIdx].target){phase="win";setOverlay("win");upHud();return;}
      if(moves<=0){phase="lose";setOverlay("lose");upHud();}
    }
    function expandSpecials(s:Set<string>){
      const ex=new Set<string>();
      s.forEach(k=>{const[r,c]=k.split(",").map(Number);const cell=board[r][c];if(!cell)return;
        if(cell.special==="striped_h") for(let i=0;i<COLS;i++)ex.add(`${r},${i}`);
        else if(cell.special==="striped_v") for(let i=0;i<ROWS;i++)ex.add(`${i},${c}`);
      });
      ex.forEach(k=>s.add(k));
    }

    function doRemoval(toRemove:Set<string>, pts:number) {
      expandSpecials(toRemove);
      score+=Math.round(pts*Math.pow(1.5,cascade));
      const ids:number[]=[];
      toRemove.forEach(k=>{
        const[r,c]=k.split(",").map(Number); const cell=board[r][c]; if(!cell)return;
        board[r][c]=null;
        const a=anims.get(cell.id); if(!a)return;
        a.ts=0; a.ta=0; a.removing=true; ids.push(cell.id);
      });
      setPhase("removing", 360, ()=>{
        ids.forEach(id=>anims.delete(id));
        // Gravity — existing gems drop down
        const falls=applyGravity(board);
        falls.forEach(({id,tr,col})=>{
          const a=anims.get(id); if(!a)return;
          a.tx=gcx(col); a.ty=gcy(tr); a.col=col; a.row=tr; a.vy=0; a.falling=true;
        });
        // New gems spawn from above
        const spawns=fillBoard(board);
        spawns.forEach(({cell,col,row,queuePos})=>{
          const startY = PAD - queuePos*CELL - CELL/2;
          anims.set(cell.id, spawnGA(cell, col, row, startY));
        });
        setPhase("falling", 620, ()=>{
          // Snap any still-falling gems
          anims.forEach(a=>{a.x=a.tx; a.y=a.ty; a.vy=0; a.falling=false;});
          const next=findMatches(board);
          if(next.size>0){cascade++;doRemoval(next,next.size*30);}
          else{cascade=0;phase="idle";hintCells=null;lastInput=performance.now();checkWinLose();upHud();}
        });
        upHud();
      });
    }

    function attemptSwap(r1:number,c1:number,r2:number,c2:number){
      selected=null;
      const cell1=board[r1][c1]!, cell2=board[r2][c2]!;
      const a1=anims.get(cell1.id)!, a2=anims.get(cell2.id)!;
      const [x1,y1]=[gcx(c1),gcy(r1)], [x2,y2]=[gcx(c2),gcy(r2)];
      // Animate: lift slightly and slide to each other's position
      const isH=r1===r2;
      a1.tx=x2; a1.ty=y2-(isH?8:0); a1.falling=false;
      a2.tx=x1; a2.ty=y1-(isH?8:0); a2.falling=false;
      setPhase("swapping", 230, ()=>{
        a1.ty=y2; a2.ty=y1;
        const isCB1=cell1.special==="colorbomb", isCB2=cell2.special==="colorbomb";
        if(isCB1||isCB2){
          const tgt=isCB1?cell2.type:cell1.type;
          const rem=new Set<string>();
          for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++)
            if(board[r][c]?.type===tgt||board[r][c]?.special==="colorbomb") rem.add(`${r},${c}`);
          board[r1][c1]=cell2; board[r2][c2]=cell1; a1.col=c2; a1.row=r2; a2.col=c1; a2.row=r1;
          moves--; cascade=0; doRemoval(rem,rem.size*80); return;
        }
        board[r1][c1]=cell2; board[r2][c2]=cell1; a1.col=c2; a1.row=r2; a2.col=c1; a2.row=r1;
        const groups=getMatchGroups(board);
        const matchSet=new Set<string>();
        groups.forEach(g=>g.cells.forEach(([r,c])=>matchSet.add(`${r},${c}`)));
        if(matchSet.size===0){
          board[r1][c1]=cell1; board[r2][c2]=cell2; a1.col=c1; a1.row=r1; a2.col=c2; a2.row=r2;
          a1.tx=x1; a1.ty=y1; a2.tx=x2; a2.ty=y2;
          setPhase("snapback", 240, ()=>{phase="idle";upHud();}); return;
        }
        // Specials for match-4/5
        groups.forEach(g=>{
          if(g.cells.length<4)return;
          const sp:SpecialType=g.cells.length>=5?"colorbomb":(g.dir==="h"?"striped_h":"striped_v");
          const moved=g.cells.find(([gr,gc])=>(gr===r2&&gc===c2)||(gr===r1&&gc===c1))??g.cells[Math.floor(g.cells.length/2)];
          matchSet.delete(`${moved[0]},${moved[1]}`);
          const old=board[moved[0]][moved[1]]!; const newCell=mkCell(g.type,sp);
          board[moved[0]][moved[1]]=newCell;
          const aOld=anims.get(old.id)!; anims.delete(old.id);
          anims.set(newCell.id,{...aOld,id:newCell.id,special:sp,ts:1.3});
          setTimeout(()=>{const aa=anims.get(newCell.id);if(aa)aa.ts=1;},200);
        });
        moves--; cascade=0; doRemoval(matchSet,matchSet.size*30);
      });
    }

    // ── Click ──────────────────────────────────────────────────────────────────
    const onClick=(e:MouseEvent)=>{
      if(phase!=="idle"&&phase!=="selected")return;
      lastInput=performance.now(); hintCells=null; anims.forEach(a=>{a.hint=false;});
      const rect=canvas.getBoundingClientRect();
      const px=(e.clientX-rect.left)*(CW/rect.width);
      const py=(e.clientY-rect.top)*(CH/rect.height);
      const hitC=Math.floor((px-PAD)/CELL), hitR=Math.floor((py-PAD)/CELL);
      if(hitC<0||hitC>=COLS||hitR<0||hitR>=ROWS){selected=null;phase="idle";upHud();return;}
      if(phase==="idle"){
        selected={r:hitR,c:hitC}; phase="selected";
        const a=anims.get(board[hitR][hitC]?.id??-1); if(a)a.ts=1.1;
        upHud();
      } else if(phase==="selected"&&selected){
        if(selected.r===hitR&&selected.c===hitC){
          const a=anims.get(board[hitR][hitC]?.id??-1); if(a)a.ts=1;
          selected=null;phase="idle";upHud();return;
        }
        const prevA=anims.get(board[selected.r][selected.c]?.id??-1); if(prevA)prevA.ts=1;
        const dr=Math.abs(hitR-selected.r),dc=Math.abs(hitC-selected.c);
        if((dr===1&&dc===0)||(dr===0&&dc===1)){
          attemptSwap(selected.r,selected.c,hitR,hitC);
        } else {
          selected={r:hitR,c:hitC};
          const a=anims.get(board[hitR][hitC]?.id??-1); if(a)a.ts=1.1;
        }
      }
    };
    canvas.addEventListener("click",onClick);

    restartRef.current=(next:boolean)=>{
      if(next&&lvIdx<LEVELS.length-1)lvIdx++;
      resetIds(); const nb=initBoard();
      for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) board[r][c]=nb[r][c];
      score=0;moves=LEVELS[lvIdx].moves;cascade=0;
      phase="idle";phaseUntil=0;phaseOnEnd=null;selected=null;hintCells=null;
      lastInput=performance.now(); buildAnims(); setOverlay("none"); upHud();
    };

    // ── Loop ──────────────────────────────────────────────────────────────────
    let lastT=performance.now(), rafId=0;
    const animate=()=>{
      rafId=requestAnimationFrame(animate);
      const now=performance.now(); const dt=Math.min((now-lastT)/1000,.05); lastT=now; frame++;

      if(phaseOnEnd&&phaseUntil>0&&now>=phaseUntil){const fn=phaseOnEnd;phaseOnEnd=null;phaseUntil=0;fn();}
      if(phase==="idle"&&now-lastInput>HINT_DELAY&&!hintCells){
        hintCells=findHint(board);
        if(hintCells)hintCells.forEach(([r,c])=>{const a=anims.get(board[r][c]?.id??-1);if(a)a.hint=true;});
      }

      anims.forEach(a=>{
        if(a.hint){a.hintPh+=dt*4;a.ty=gcy(a.row)-5*Math.abs(Math.sin(a.hintPh));}
        if(a.falling){
          a.vy=Math.min(a.vy+GRAVITY*dt,MAX_VY); a.y+=a.vy*dt;
          if(a.y>=a.ty){a.y=a.ty;a.vy=0;a.falling=false;a.scale=0.86;a.ts=1;}
          a.x+=(a.tx-a.x)*22*dt;
        } else {
          a.x+=(a.tx-a.x)*18*dt; a.y+=(a.ty-a.y)*18*dt;
        }
        a.scale+=(a.ts-a.scale)*20*dt;
        a.alpha+=(a.ta-a.alpha)*12*dt;
      });

      // Draw
      const bg=LEVEL_BGS[Math.min(lvIdx,LEVEL_BGS.length-1)];
      drawBg(ctx,bg,CW,CH,stars,stripes,frame);
      drawGrid(ctx,bg);

      // Selection highlight
      if(selected&&(phase==="selected"||phase==="swapping")){
        const sx=PAD+selected.c*CELL+2, sy=PAD+selected.r*CELL+2;
        const pulse=.2+.08*Math.sin(frame*.18);
        ctx.save();
        ctx.fillStyle=`rgba(251,191,36,${pulse})`; ctx.strokeStyle=`rgba(251,191,36,${.7+.3*Math.sin(frame*.18)})`;
        ctx.lineWidth=2.5; rrect(ctx,sx,sy,CELL-4,CELL-4,CELL*.12); ctx.fill(); ctx.stroke();
        ctx.restore();
      }

      // Gems (falling ones drawn on top)
      const sorted=[...anims.values()].sort((a,b)=>a.falling===b.falling?0:a.falling?1:-1);
      sorted.forEach(a=>{
        const isSel=!!selected&&board[selected.r]?.[selected.c]?.id===a.id;
        drawGem(ctx,a.type,a.special,a.x,a.y,CELL,a.alpha,a.scale,isSel,frame);
      });
    };
    animate();

    return ()=>{cancelAnimationFrame(rafId);canvas.removeEventListener("click",onClick);};
  }, [started]);

  const lv=LEVELS[hud.lvIdx];
  const pct=Math.min(100,Math.round((hud.score/lv.target)*100));
  const lowMoves=hud.moves<=5&&hud.moves>0;
  const bg=LEVEL_BGS[Math.min(hud.lvIdx,LEVEL_BGS.length-1)];

  // ── Splash ────────────────────────────────────────────────────────────────
  if(!started) return (
    <div className="min-h-screen flex flex-col" style={{background:`linear-gradient(160deg,${LEVEL_BGS[0].top},${LEVEL_BGS[0].bot})`}}>
      <header className="flex items-center gap-4 px-4 py-3 border-b border-white/20">
        <Link href="/" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4"/><span className="text-sm">Hub</span>
        </Link>
        <span className="text-2xl">💎</span>
        <h1 className="text-lg font-bold text-white">Gem Crush</h1>
      </header>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-sm w-full rounded-2xl overflow-hidden" style={{background:"rgba(0,0,0,0.35)",backdropFilter:"blur(12px)",border:"1px solid rgba(255,255,255,0.2)"}}>
          <div className="p-8 text-center" style={{background:"rgba(0,0,0,0.2)"}}>
            <div className="text-6xl mb-3">💎</div>
            <h2 className="text-3xl font-black text-white mb-1">Gem Crush</h2>
            <p className="text-white/60 text-sm">Match jewels · Cascade combos · 10 unique worlds</p>
            <div className="flex justify-center gap-3 mt-5">
              {GTYPES.map((t,i)=>(
                <div key={t} className="w-8 h-8 rounded-full shadow-lg"
                  style={{background:GEM_CSS[t],boxShadow:`0 0 14px ${GEM_CSS[t]}aa`,animation:`bounce 0.8s ease-in-out ${i*.1}s infinite alternate`}}/>
              ))}
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              {[["10","Levels"],["6","Gems"],["2D","Flat"]].map(([v,l])=>(
                <div key={l} className="rounded-xl p-3" style={{background:"rgba(255,255,255,0.1)"}}>
                  <div className="text-2xl font-black text-white">{v}</div>
                  <div className="text-xs text-white/50 mt-0.5">{l}</div>
                </div>
              ))}
            </div>
            <div className="space-y-2 text-sm">
              {[["✦","Click a gem, then click adjacent to swap","text-yellow-300"],
                ["✦","Match 4 → Striped gem (clears row or column)","text-pink-300"],
                ["✦","Match 5 → Color Bomb (clears all of one color)","text-purple-300"],
                ["✦","Cascades multiply score by ×1.5 per chain","text-green-300"]].map(([ic,txt,clr])=>(
                <div key={txt} className="flex items-start gap-2 text-white/60">
                  <span className={clr}>{ic}</span><span>{txt}</span>
                </div>
              ))}
            </div>
            <button onClick={()=>setStarted(true)} className="w-full py-3 rounded-xl font-black text-lg text-white transition-all hover:scale-105 active:scale-95"
              style={{background:"linear-gradient(135deg,#ec4899,#f97316)",boxShadow:"0 0 30px rgba(249,115,22,0.45)"}}>
              ▶ Play Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Game ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{background:`linear-gradient(160deg,${bg.top} 0%,${bg.bot} 100%)`}}>
      <header className="flex items-center gap-3 px-4 py-2.5 border-b" style={{borderColor:"rgba(255,255,255,0.15)",background:"rgba(0,0,0,0.25)",backdropFilter:"blur(8px)"}}>
        <Link href="/" className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4"/><span className="text-xs">Hub</span>
        </Link>
        <span className="text-xl">💎</span>
        <span className="text-sm font-black text-white">Gem Crush</span>
        <span className="text-xs text-white/40 ml-1">· {lv.name}</span>
        <span className="ml-auto text-xs" style={{color:bg.accent}}>Level {hud.lvIdx+1}</span>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-3">
        {/* HUD */}
        <div className="w-full flex items-center gap-4 px-4 py-2.5 rounded-2xl" style={{maxWidth:CW,background:"rgba(0,0,0,0.3)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,0.12)"}}>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between text-xs mb-1" style={{color:"rgba(255,255,255,0.5)"}}>
              <span className="font-black text-white text-xl leading-none">{hud.score.toLocaleString()}</span>
              <span>Target {lv.target.toLocaleString()}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{background:"rgba(0,0,0,0.3)"}}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{width:`${pct}%`,background:`linear-gradient(90deg,${bg.accent},${bg.top})`}}/>
            </div>
          </div>
          {hud.cascade>0&&(
            <div className="px-2 py-1 rounded-lg text-xs font-black animate-pulse whitespace-nowrap"
              style={{background:"rgba(251,191,36,0.2)",border:"1px solid rgba(251,191,36,0.5)",color:"#fbbf24"}}>
              ×{(1.5**hud.cascade).toFixed(1)}
            </div>
          )}
          <div className={`text-center min-w-[48px] ${lowMoves?"animate-pulse":""}`}>
            <div className="text-3xl font-black leading-none" style={{color:lowMoves?"#ef4444":"white"}}>{hud.moves}</div>
            <div className="text-[10px] uppercase tracking-wide" style={{color:"rgba(255,255,255,0.4)"}}>moves</div>
          </div>
        </div>

        {/* Canvas */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl"
          style={{border:"2px solid rgba(255,255,255,0.15)",boxShadow:`0 0 48px ${bg.accent}55`}}>
          <canvas ref={canvasRef} width={CW} height={CH}
            className="block cursor-pointer select-none"
            style={{maxWidth:"min(95vw, 492px)",height:"auto"}}/>

          {overlay==="win"&&(
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl" style={{background:"rgba(0,0,0,0.8)"}}>
              <div className="text-6xl">🏆</div>
              <p className="text-3xl font-black text-yellow-300">Level Complete!</p>
              <p className="text-sm" style={{color:"rgba(255,255,255,0.6)"}}>Score: {hud.score.toLocaleString()}</p>
              <div className="flex gap-3">
                {hud.lvIdx<LEVELS.length-1&&(
                  <button onClick={()=>restartRef.current(true)} className="px-6 py-2 rounded-xl font-bold text-white transition-colors"
                    style={{background:bg.accent==="#818cf8"?"#6366f1":"#ec4899"}}>Next Level →</button>
                )}
                <button onClick={()=>restartRef.current(false)} className="px-6 py-2 rounded-xl font-bold transition-colors"
                  style={{background:"rgba(255,255,255,0.1)",color:"white",border:"1px solid rgba(255,255,255,0.2)"}}>Replay</button>
              </div>
            </div>
          )}
          {overlay==="lose"&&(
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl" style={{background:"rgba(0,0,0,0.8)"}}>
              <div className="text-6xl">💔</div>
              <p className="text-3xl font-black text-red-400">Out of Moves!</p>
              <p className="text-sm" style={{color:"rgba(255,255,255,0.5)"}}>{hud.score.toLocaleString()} / {lv.target.toLocaleString()} pts</p>
              <button onClick={()=>restartRef.current(false)} className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors">Try Again</button>
            </div>
          )}
        </div>

        {/* Legend + level strip */}
        <div className="flex flex-wrap justify-center gap-1.5">
          {GTYPES.map(t=>(
            <div key={t} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
              style={{background:"rgba(0,0,0,0.3)",border:"1px solid rgba(255,255,255,0.1)"}}>
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{background:GEM_CSS[t]}}/>
              <span style={{color:"rgba(255,255,255,0.55)"}}>{GEM_LABEL[t]}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-1">
          {LEVELS.map((l,i)=>(
            <div key={l.id} title={l.name}
              className="h-1.5 rounded-full transition-all"
              style={{width:i===hud.lvIdx?24:16,background:i<hud.lvIdx?bg.accent:i===hud.lvIdx?"white":"rgba(255,255,255,0.15)"}}/>
          ))}
        </div>
      </div>
    </div>
  );
}
