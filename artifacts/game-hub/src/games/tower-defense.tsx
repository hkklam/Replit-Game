import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-4 px-4 py-3 border-b border-orange-500/30 bg-gradient-to-r from-orange-950/60 to-transparent">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /><span className="text-sm">Hub</span>
        </Link>
        <span className="text-2xl select-none" style={{ filter:"drop-shadow(0 0 8px #fb923c80)" }}>🏰</span>
        <h1 className="text-lg font-bold text-orange-400">{title}</h1>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-3 gap-3">{children}</div>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CELL = 44, COLS = 18, ROWS = 12, W = COLS * CELL, H = ROWS * CELL;

// ─── Level paths ──────────────────────────────────────────────────────────────
const LEVEL_PATHS: [number,number][][] = [
  [[0,5],[1,5],[2,5],[3,5],[4,5],[5,5],[6,5],[7,5],[8,5],[9,5],[10,5],[10,4],[10,3],[10,2],[11,2],[12,2],[13,2],[14,2],[15,2],[16,2],[17,2]],
  [[0,2],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],[6,3],[6,4],[6,5],[6,6],[6,7],[6,8],[6,9],[7,9],[8,9],[9,9],[10,9],[11,9],[11,8],[11,7],[11,6],[11,5],[11,4],[12,4],[13,4],[14,4],[15,4],[16,4],[17,4]],
  [[0,10],[1,10],[2,10],[3,10],[4,10],[4,9],[4,8],[4,7],[4,6],[4,5],[4,4],[4,3],[4,2],[4,1],[5,1],[6,1],[7,1],[8,1],[9,1],[9,2],[9,3],[9,4],[9,5],[9,6],[9,7],[9,8],[9,9],[9,10],[10,10],[11,10],[12,10],[13,10],[13,9],[13,8],[13,7],[13,6],[13,5],[13,4],[13,3],[13,2],[13,1],[14,1],[15,1],[16,1],[17,1]],
  [[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[7,1],[8,1],[9,1],[10,1],[11,1],[12,1],[13,1],[14,1],[15,1],[16,1],[17,1],[17,2],[17,3],[16,3],[15,3],[14,3],[13,3],[12,3],[11,3],[10,3],[9,3],[8,3],[7,3],[6,3],[5,3],[4,3],[3,3],[2,3],[1,3],[0,3],[0,4],[0,5],[1,5],[2,5],[3,5],[4,5],[5,5],[6,5],[7,5],[8,5],[9,5],[10,5],[11,5],[12,5],[13,5],[14,5],[15,5],[16,5],[17,5],[17,6],[17,7],[16,7],[15,7],[14,7],[13,7],[12,7],[11,7],[10,7],[9,7],[8,7],[7,7],[6,7],[5,7],[4,7],[3,7],[2,7],[1,7],[0,7],[0,8],[0,9],[1,9],[2,9],[3,9],[4,9],[5,9],[6,9],[7,9],[8,9],[9,9],[10,9],[11,9],[12,9],[13,9],[14,9],[15,9],[16,9],[17,9]],
  [[0,3],[1,3],[2,3],[3,3],[4,3],[5,3],[5,4],[5,5],[5,6],[5,7],[5,8],[5,9],[5,10],[6,10],[7,10],[8,10],[9,10],[10,10],[11,10],[12,10],[12,9],[12,8],[12,7],[12,6],[12,5],[12,4],[12,3],[13,3],[14,3],[15,3],[16,3],[16,4],[16,5],[16,6],[16,7],[16,8],[15,8],[14,8],[13,8],[13,9],[13,10],[14,10],[15,10],[16,10],[17,10]],
];

const COMPLEX_LEVEL_PATHS: [number,number][][] = [
  [[0,2],[1,2],[2,2],[3,2],[3,3],[3,4],[3,5],[3,6],[3,7],[3,8],[3,9],[4,9],[5,9],[6,9],[6,8],[6,7],[6,6],[6,5],[6,4],[6,3],[6,2],[7,2],[8,2],[9,2],[9,3],[9,4],[9,5],[9,6],[9,7],[9,8],[9,9],[10,9],[11,9],[12,9],[12,8],[12,7],[12,6],[12,5],[12,4],[12,3],[12,2],[13,2],[14,2],[15,2],[15,3],[15,4],[15,5],[15,6],[15,7],[15,8],[15,9],[16,9],[17,9]],
  [[0,1],[1,1],[2,1],[2,2],[2,3],[2,4],[2,5],[2,6],[2,7],[2,8],[2,9],[2,10],[3,10],[4,10],[4,9],[4,8],[4,7],[4,6],[4,5],[4,4],[4,3],[4,2],[4,1],[5,1],[6,1],[6,2],[6,3],[6,4],[6,5],[6,6],[6,7],[6,8],[6,9],[6,10],[7,10],[8,10],[8,9],[8,8],[8,7],[8,6],[8,5],[8,4],[8,3],[8,2],[8,1],[9,1],[10,1],[10,2],[10,3],[10,4],[10,5],[10,6],[10,7],[10,8],[10,9],[10,10],[11,10],[12,10],[12,9],[12,8],[12,7],[12,6],[12,5],[12,4],[12,3],[12,2],[12,1],[13,1],[14,1],[14,2],[14,3],[14,4],[14,5],[14,6],[14,7],[14,8],[14,9],[14,10],[15,10],[16,10],[17,10]],
  [[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[7,1],[8,1],[9,1],[10,1],[11,1],[12,1],[13,1],[14,1],[15,1],[16,1],[16,2],[16,3],[16,4],[16,5],[15,5],[14,5],[13,5],[12,5],[11,5],[10,5],[9,5],[8,5],[7,5],[6,5],[5,5],[4,5],[3,5],[2,5],[1,5],[1,6],[1,7],[1,8],[1,9],[2,9],[3,9],[4,9],[5,9],[6,9],[7,9],[8,9],[9,9],[10,9],[11,9],[12,9],[13,9],[14,9],[15,9],[16,9],[17,9]],
  [[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[7,1],[8,1],[9,1],[10,1],[11,1],[12,1],[13,1],[14,1],[15,1],[16,1],[17,1],[17,2],[17,3],[16,3],[15,3],[14,3],[13,3],[12,3],[11,3],[10,3],[9,3],[8,3],[7,3],[6,3],[5,3],[4,3],[3,3],[2,3],[1,3],[0,3],[0,4],[0,5],[1,5],[2,5],[3,5],[4,5],[5,5],[6,5],[7,5],[8,5],[9,5],[10,5],[11,5],[12,5],[13,5],[14,5],[15,5],[16,5],[17,5],[17,6],[17,7],[16,7],[15,7],[14,7],[13,7],[12,7],[11,7],[10,7],[9,7],[8,7],[7,7],[6,7],[5,7],[4,7],[3,7],[2,7],[1,7],[0,7],[0,8],[0,9],[1,9],[2,9],[3,9],[4,9],[5,9],[6,9],[7,9],[8,9],[9,9],[10,9],[11,9],[12,9],[13,9],[14,9],[15,9],[16,9],[17,9]],
  [[0,1],[1,1],[2,1],[2,2],[2,3],[2,4],[2,5],[3,5],[4,5],[5,5],[6,5],[7,5],[8,5],[8,4],[8,3],[8,2],[8,1],[9,1],[10,1],[10,2],[10,3],[10,4],[10,5],[10,6],[10,7],[10,8],[10,9],[10,10],[9,10],[8,10],[7,10],[6,10],[5,10],[5,9],[5,8],[5,7],[5,6],[6,6],[7,6],[8,6],[9,6],[10,6],[11,6],[12,6],[13,6],[14,6],[14,7],[14,8],[14,9],[14,10],[15,10],[16,10],[17,10]],
];

const LEVEL_NAMES = ["The Plains","The Valley","Triple Pass","The Long March","The Labyrinth"];
const LEVEL_GOLD  = [120,150,190,230,280];
const LEVEL_START_GOLD = [120,150,190,230,280];

// ─── Enemy defs ───────────────────────────────────────────────────────────────
type EnemyType = "scout"|"goblin"|"orc"|"berserker"|"troll"|"knight"|"mage"|"healer"|"demon"|"boss";
const ENEMY_DEFS: Record<EnemyType,{
  hp:number; speed:number; color:string; glowColor:string; size:number; reward:number; name:string;
  shape:"circle"|"diamond"|"star"; armor?:number; heals?:boolean;
  badge:string;
}> = {
  scout:     { hp:22,   speed:3.8, color:"#fef08a", glowColor:"#fef9c3", size:6,  reward:5,  name:"Scout",    shape:"circle",  badge:"💨" },
  goblin:    { hp:40,   speed:2.5, color:"#4ade80", glowColor:"#86efac", size:8,  reward:8,  name:"Goblin",   shape:"circle",  badge:"👺" },
  orc:       { hp:130,  speed:1.8, color:"#fb923c", glowColor:"#fcd34d", size:11, reward:12, name:"Orc",      shape:"circle",  badge:"👹" },
  berserker: { hp:200,  speed:1.3, color:"#f97316", glowColor:"#fed7aa", size:11, reward:28, name:"Berserkr", shape:"star",    badge:"🔥" },
  troll:     { hp:380,  speed:1.1, color:"#94a3b8", glowColor:"#cbd5e1", size:14, reward:20, name:"Troll",    shape:"circle",  badge:"🪨" },
  knight:    { hp:750,  speed:0.85,color:"#e2e8f0", glowColor:"#f8fafc", size:15, reward:40, name:"Knight",   shape:"diamond", badge:"🛡️", armor:0.45 },
  mage:      { hp:90,   speed:2.2, color:"#a78bfa", glowColor:"#c4b5fd", size:9,  reward:15, name:"Mage",     shape:"diamond", badge:"🔮" },
  healer:    { hp:150,  speed:1.7, color:"#34d399", glowColor:"#6ee7b7", size:9,  reward:22, name:"Healer",   shape:"star",    badge:"💚", heals:true },
  demon:     { hp:550,  speed:1.5, color:"#ef4444", glowColor:"#fca5a5", size:13, reward:30, name:"Demon",    shape:"star",    badge:"😈" },
  boss:      { hp:2500, speed:0.85,color:"#fbbf24", glowColor:"#fde68a", size:20, reward:120,name:"Dragon",   shape:"star",    badge:"🐉" },
};

// ─── Tower defs ───────────────────────────────────────────────────────────────
type TowerType = "arrow"|"cannon"|"ice"|"lightning"|"sniper"|"mortar"|"poison";
const TOWER_DEFS: Record<TowerType,{
  cost:number; range:number; dmg:number; cd:number;
  splash?:number; slowDur?:number; chainCount?:number; poisonDmg?:number; poisonDur?:number;
  color:string; accent:string; name:string; key:string; desc:string;
}> = {
  arrow:     { cost:50,  range:100, dmg:28,  cd:20,  color:"#1d4ed8", accent:"#93c5fd", name:"Archer",  key:"1", desc:"Fast single target" },
  cannon:    { cost:100, range:80,  dmg:90,  cd:60,  splash:38,        color:"#c2410c", accent:"#fdba74", name:"Cannon",  key:"2", desc:"Splash damage" },
  ice:       { cost:75,  range:90,  dmg:12,  cd:30,  slowDur:80,       color:"#0e7490", accent:"#67e8f9", name:"Glacier", key:"3", desc:"Slows enemies" },
  lightning: { cost:125, range:110, dmg:65,  cd:40,  chainCount:2,     color:"#a16207", accent:"#fde047", name:"Tesla",   key:"4", desc:"Chains to 2 more" },
  sniper:    { cost:150, range:175, dmg:220, cd:110,                   color:"#6d28d9", accent:"#c4b5fd", name:"Sniper",  key:"5", desc:"Long range burst" },
  mortar:    { cost:120, range:88,  dmg:110, cd:75,  splash:55,        color:"#881337", accent:"#fda4af", name:"Mortar",  key:"6", desc:"Huge AoE blast" },
  poison:    { cost:90,  range:90,  dmg:8,   cd:30,  splash:42, poisonDmg:5, poisonDur:200, color:"#3f6212", accent:"#a3e635", name:"Toxin", key:"7", desc:"DoT splash" },
};

// ─── Wave compositions ────────────────────────────────────────────────────────
type SpawnEntry = { type:EnemyType; count:number; interval:number };
const LEVEL_WAVES: SpawnEntry[][][] = [
  // Level 1 – Scouts and Goblins
  [[{type:"scout",count:8,interval:50},{type:"goblin",count:6,interval:75}],
   [{type:"scout",count:5,interval:45},{type:"goblin",count:8,interval:70},{type:"orc",count:3,interval:90}]],
  // Level 2 – Orcs and Berserkers
  [[{type:"goblin",count:6,interval:70},{type:"orc",count:5,interval:80},{type:"berserker",count:3,interval:85}],
   [{type:"orc",count:8,interval:75},{type:"berserker",count:5,interval:80},{type:"scout",count:4,interval:50}]],
  // Level 3 – Trolls, Mages, Healers enter
  [[{type:"orc",count:5,interval:70},{type:"troll",count:3,interval:95},{type:"mage",count:4,interval:70},{type:"berserker",count:3,interval:75}],
   [{type:"troll",count:4,interval:90},{type:"mage",count:4,interval:65},{type:"healer",count:2,interval:120},{type:"berserker",count:3,interval:70}]],
  // Level 4 – Knights and Demons
  [[{type:"troll",count:4,interval:80},{type:"mage",count:4,interval:65},{type:"knight",count:2,interval:130},{type:"demon",count:2,interval:100},{type:"healer",count:2,interval:110}],
   [{type:"demon",count:5,interval:80},{type:"knight",count:3,interval:130},{type:"healer",count:2,interval:110},{type:"berserker",count:4,interval:70}]],
  // Level 5 – Boss waves
  [[{type:"demon",count:4,interval:75},{type:"knight",count:3,interval:130},{type:"boss",count:1,interval:200},{type:"healer",count:3,interval:110}],
   [{type:"demon",count:6,interval:70},{type:"boss",count:2,interval:180},{type:"knight",count:4,interval:130},{type:"berserker",count:3,interval:65}]],
];

// ─── Types ────────────────────────────────────────────────────────────────────
let eid = 0;
type Enemy = {
  id:number; type:EnemyType; pathIdx:number; x:number; y:number;
  hp:number; maxHp:number; baseSpeed:number;
  slowTimer:number; poisonTimer:number; poisonDmg:number;
  dx:number; dy:number;
};
type Tower = {
  col:number; row:number; type:TowerType; timer:number; angle:number;
};
type Proj = {
  x:number; y:number; tx:number; ty:number; speed:number; dmg:number; eid:number;
  type:TowerType; splash?:number; slowDur?:number; chainCount?:number;
  poisonDmg?:number; poisonDur?:number; chainHits?:number[]; angle:number;
};
type Splash = { x:number; y:number; r:number; maxR:number; alpha:number; color:string };
type GameState = "playing"|"between"|"win"|"lose";

function makeEnemy(type:EnemyType, path:[number,number][]): Enemy {
  const d = ENEMY_DEFS[type];
  const [sc,sr] = path[0];
  return { id:eid++, type, pathIdx:0, x:sc*CELL+CELL/2, y:sr*CELL+CELL/2,
    hp:d.hp, maxHp:d.hp, baseSpeed:d.speed, slowTimer:0, poisonTimer:0, poisonDmg:0, dx:1, dy:0 };
}

// ─── Color utils ──────────────────────────────────────────────────────────────
function lighten(hex:string, amt:number):string {
  const n=parseInt(hex.replace("#",""),16);
  return `rgb(${Math.min(255,(n>>16)+amt)},${Math.min(255,((n>>8)&0xff)+amt)},${Math.min(255,(n&0xff)+amt)})`;
}
function darken(hex:string, amt:number):string { return lighten(hex,-amt); }

function drawStar(ctx:CanvasRenderingContext2D,cx:number,cy:number,pts:number,outer:number,inner:number){
  ctx.beginPath();
  for(let i=0;i<pts*2;i++){
    const r=i%2===0?outer:inner, a=(i*Math.PI/pts)-Math.PI/2;
    i===0?ctx.moveTo(cx+r*Math.cos(a),cy+r*Math.sin(a)):ctx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a));
  }
  ctx.closePath();
}

// ─── Background ───────────────────────────────────────────────────────────────
function drawBackground(ctx:CanvasRenderingContext2D, pathSet:Set<string>) {
  ctx.fillStyle="#172917"; ctx.fillRect(0,0,W,H);
  for(let c=0;c<COLS;c++) for(let r=0;r<ROWS;r++){
    if(pathSet.has(`${c},${r}`)) continue;
    const x=c*CELL, y=r*CELL;
    ctx.fillStyle=(c+r)%2===0?"#1c3a1c":"#18301a";
    ctx.fillRect(x,y,CELL,CELL);
    const seed=c*37+r*53;
    if(seed%7===0){
      const gx=x+(seed*13)%28+8, gy=y+(seed*17)%28+8;
      ctx.strokeStyle="rgba(34,85,34,0.45)"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(gx,gy+5); ctx.lineTo(gx-3,gy-4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gx,gy+5); ctx.lineTo(gx,gy-6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gx,gy+5); ctx.lineTo(gx+3,gy-4); ctx.stroke();
    }
    if(seed%13===0){
      ctx.fillStyle="rgba(26,62,26,0.5)";
      ctx.beginPath(); ctx.arc(x+(seed*11)%30+7,y+(seed*19)%30+7,5,0,Math.PI*2); ctx.fill();
    }
  }
  ctx.strokeStyle="rgba(0,0,0,0.08)"; ctx.lineWidth=0.5;
  for(let c=0;c<=COLS;c++){ctx.beginPath();ctx.moveTo(c*CELL,0);ctx.lineTo(c*CELL,H);ctx.stroke();}
  for(let r=0;r<=ROWS;r++){ctx.beginPath();ctx.moveTo(0,r*CELL);ctx.lineTo(W,r*CELL);ctx.stroke();}
}

// ─── Path drawing ─────────────────────────────────────────────────────────────
function drawPath(ctx:CanvasRenderingContext2D, path:[number,number][], frame:number) {
  const pathSet=new Set(path.map(([c,r])=>`${c},${r}`));
  for(let i=0;i<path.length;i++){
    const [c,r]=path[i]; const x=c*CELL, y=r*CELL;
    const g=ctx.createLinearGradient(x,y,x+CELL,y+CELL);
    g.addColorStop(0,"#9a7040"); g.addColorStop(0.5,"#7a5530"); g.addColorStop(1,"#6b4828");
    ctx.fillStyle=g; ctx.fillRect(x,y,CELL,CELL);
    // Cobblestone grout
    ctx.strokeStyle="rgba(40,20,5,0.45)"; ctx.lineWidth=0.8;
    ctx.strokeRect(x+3,y+3,CELL-6,CELL-6);
    // Edge shadows
    const nb=(dr:number,dc:number)=>!pathSet.has(`${c+dc},${r+dr}`);
    if(nb(-1,0)){ctx.fillStyle="rgba(0,0,0,0.22)";ctx.fillRect(x,y,CELL,3);}
    if(nb(1,0)) {ctx.fillStyle="rgba(0,0,0,0.22)";ctx.fillRect(x,y+CELL-3,CELL,3);}
    if(nb(0,-1)){ctx.fillStyle="rgba(0,0,0,0.22)";ctx.fillRect(x,y,3,CELL);}
    if(nb(0,1)) {ctx.fillStyle="rgba(0,0,0,0.22)";ctx.fillRect(x+CELL-3,y,3,CELL);}
  }
  // Directional chevrons
  for(let i=3;i<path.length-2;i+=6){
    const [c,r]=path[i]; const [nc,nr]=path[i+1];
    const ang=Math.atan2(nr-r,nc-c);
    const cx2=c*CELL+CELL/2, cy2=r*CELL+CELL/2;
    ctx.save(); ctx.translate(cx2,cy2); ctx.rotate(ang);
    ctx.fillStyle="rgba(255,200,100,0.22)";
    ctx.beginPath(); ctx.moveTo(11,0); ctx.lineTo(-7,-5); ctx.lineTo(-7,5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // Start glow
  const [sc,sr]=path[0]; const pulse=0.7+0.3*Math.sin(frame*0.09);
  ctx.save(); ctx.shadowColor="#22c55e"; ctx.shadowBlur=14*pulse;
  ctx.fillStyle=`rgba(34,197,94,${0.4*pulse})`;
  ctx.fillRect(sc*CELL,sr*CELL,CELL,CELL);
  ctx.fillStyle="#22c55e"; ctx.font="bold 8px sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.shadowBlur=0; ctx.fillText("IN",sc*CELL+CELL/2,sr*CELL+CELL/2); ctx.restore();
  // End glow
  const [ec,er]=path[path.length-1]; const pulse2=0.7+0.3*Math.sin(frame*0.09+Math.PI);
  ctx.save(); ctx.shadowColor="#ef4444"; ctx.shadowBlur=14*pulse2;
  ctx.fillStyle=`rgba(239,68,68,${0.4*pulse2})`;
  ctx.fillRect(ec*CELL,er*CELL,CELL,CELL);
  ctx.fillStyle="#ef4444"; ctx.font="bold 8px sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.shadowBlur=0; ctx.fillText("OUT",ec*CELL+CELL/2,er*CELL+CELL/2); ctx.restore();
}

// ─── Tower drawing ────────────────────────────────────────────────────────────
function drawTower(ctx:CanvasRenderingContext2D, t:Tower, hov:boolean, frame:number) {
  const d=TOWER_DEFS[t.type];
  const tx=t.col*CELL+CELL/2, ty=t.row*CELL+CELL/2;
  ctx.save();
  // Faint range ring always visible
  ctx.strokeStyle=d.accent+"22"; ctx.lineWidth=1; ctx.setLineDash([3,4]);
  ctx.beginPath(); ctx.arc(tx,ty,d.range,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
  if(hov){ ctx.shadowColor=d.accent; ctx.shadowBlur=22; }
  // Base platform
  ctx.fillStyle=darken(d.color,35);
  ctx.beginPath(); ctx.roundRect(t.col*CELL+4,t.row*CELL+4,CELL-8,CELL-8,6); ctx.fill();
  ctx.strokeStyle=darken(d.color,15)+"80"; ctx.lineWidth=1;
  ctx.beginPath(); ctx.roundRect(t.col*CELL+4,t.row*CELL+4,CELL-8,CELL-8,6); ctx.stroke();

  if(t.type==="arrow"){
    // Castle tower body
    ctx.fillStyle=lighten(d.color,22);
    ctx.fillRect(tx-10,ty-7,20,16);
    // Merlons
    ctx.fillStyle=lighten(d.color,38);
    for(let i=0;i<4;i++) ctx.fillRect(tx-10+i*5.5,ty-13,4,6);
    // Side walls
    ctx.fillStyle=d.color; ctx.fillRect(tx-13,ty-7,3,16); ctx.fillRect(tx+10,ty-7,3,16);
    // Arrow slit
    ctx.fillStyle="rgba(0,0,0,0.7)"; ctx.fillRect(tx-1.5,ty-5,3,10);
    // Subtle flag
    ctx.fillStyle="#ef4444"; ctx.fillRect(tx-10,ty-13,1,6);
    ctx.fillStyle="#ef4444bb";
    ctx.beginPath(); ctx.moveTo(tx-9,ty-13); ctx.lineTo(tx-5,ty-10); ctx.lineTo(tx-9,ty-7); ctx.closePath(); ctx.fill();

  } else if(t.type==="cannon"){
    // Round stone tower
    const bg=ctx.createRadialGradient(tx-5,ty-5,1,tx,ty,14);
    bg.addColorStop(0,lighten(d.color,35)); bg.addColorStop(1,d.color);
    ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(tx,ty,13,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=darken(d.color,20)+"80"; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(tx,ty,13,0,Math.PI*2); ctx.stroke();
    // Rotating barrel
    ctx.save(); ctx.translate(tx,ty); ctx.rotate(t.angle);
    ctx.fillStyle=darken(d.color,18);
    ctx.beginPath(); ctx.roundRect(3,-3.5,16,7,3); ctx.fill();
    ctx.fillStyle=darken(d.color,30);
    ctx.beginPath(); ctx.arc(18,0,4,0,Math.PI*2); ctx.fill();
    ctx.restore();
    ctx.fillStyle=darken(d.color,40); ctx.beginPath(); ctx.arc(tx,ty,5,0,Math.PI*2); ctx.fill();

  } else if(t.type==="ice"){
    // Hexagonal crystal
    const hexR=13;
    ctx.beginPath();
    for(let i=0;i<6;i++){const a=i*Math.PI/3-Math.PI/6; i===0?ctx.moveTo(tx+hexR*Math.cos(a),ty+hexR*Math.sin(a)):ctx.lineTo(tx+hexR*Math.cos(a),ty+hexR*Math.sin(a));}
    ctx.closePath();
    const ig=ctx.createRadialGradient(tx-4,ty-4,1,tx,ty,hexR);
    ig.addColorStop(0,"#e0f7ff"); ig.addColorStop(0.5,d.color); ig.addColorStop(1,darken(d.color,20));
    ctx.fillStyle=ig; ctx.fill(); ctx.strokeStyle="#ffffff40"; ctx.lineWidth=1.5; ctx.stroke();
    // Crystal spokes
    ctx.strokeStyle="rgba(255,255,255,0.28)"; ctx.lineWidth=1;
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3+frame*0.01;
      ctx.beginPath(); ctx.moveTo(tx,ty); ctx.lineTo(tx+8*Math.cos(a),ty+8*Math.sin(a)); ctx.stroke();
    }
    ctx.fillStyle="#e0f7ff"; ctx.beginPath(); ctx.arc(tx,ty,4,0,Math.PI*2); ctx.fill();

  } else if(t.type==="lightning"){
    // Diamond body
    ctx.beginPath(); ctx.moveTo(tx,ty-16); ctx.lineTo(tx+14,ty); ctx.lineTo(tx,ty+16); ctx.lineTo(tx-14,ty); ctx.closePath();
    const lg=ctx.createRadialGradient(tx-3,ty-3,1,tx,ty,17);
    lg.addColorStop(0,lighten(d.color,45)); lg.addColorStop(1,darken(d.color,15));
    ctx.fillStyle=lg; ctx.fill(); ctx.strokeStyle=d.accent+"50"; ctx.lineWidth=1.5; ctx.stroke();
    // Bolt symbol
    ctx.fillStyle=d.accent;
    ctx.beginPath(); ctx.moveTo(tx+3,ty-8); ctx.lineTo(tx-3,ty+1); ctx.lineTo(tx+2,ty+1); ctx.lineTo(tx-3,ty+9); ctx.lineTo(tx+7,ty-2); ctx.lineTo(tx+1.5,ty-2); ctx.closePath(); ctx.fill();
    // Crackle sparks
    if(Math.sin(frame*0.4)>0.2){
      ctx.strokeStyle=d.accent+"80"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(tx+10,ty-5); ctx.lineTo(tx+14,ty-2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx-10,ty+5); ctx.lineTo(tx-14,ty+2); ctx.stroke();
    }

  } else if(t.type==="sniper"){
    // Tall narrow tower
    ctx.fillStyle=lighten(d.color,18);
    ctx.beginPath(); ctx.roundRect(tx-8,ty-17,16,22,3); ctx.fill();
    ctx.fillStyle=lighten(d.color,32);
    ctx.beginPath(); ctx.roundRect(tx-5.5,ty-17,11,12,2); ctx.fill();
    // Scope at top
    ctx.strokeStyle=d.accent; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.arc(tx,ty-18,6,0,Math.PI*2); ctx.stroke();
    ctx.strokeStyle=d.accent+"aa"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(tx-6,ty-18); ctx.lineTo(tx+6,ty-18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx,ty-24); ctx.lineTo(tx,ty-12); ctx.stroke();
    ctx.fillStyle=d.accent+"40"; ctx.beginPath(); ctx.arc(tx,ty-18,2,0,Math.PI*2); ctx.fill();
    // Base
    ctx.fillStyle=darken(d.color,10);
    ctx.beginPath(); ctx.roundRect(tx-10,ty+3,20,7,3); ctx.fill();

  } else if(t.type==="mortar"){
    // Squat dome
    const mg=ctx.createRadialGradient(tx-4,ty-4,1,tx,ty,15);
    mg.addColorStop(0,lighten(d.color,28)); mg.addColorStop(1,darken(d.color,10));
    ctx.fillStyle=mg;
    ctx.beginPath(); ctx.ellipse(tx,ty+6,14,8,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(tx,ty,12,Math.PI,0); ctx.fill();
    // Mortar tube
    ctx.fillStyle=darken(d.color,30);
    ctx.beginPath(); ctx.roundRect(tx-4,ty-15,8,11,2); ctx.fill();
    // Animated fuse spark
    const sp=Math.sin(frame*0.35)*2.5;
    ctx.fillStyle="#fbbf24"; ctx.beginPath(); ctx.arc(tx,ty-15+sp,2.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#ef4444"; ctx.beginPath(); ctx.arc(tx,ty-16.5+sp,1.5,0,Math.PI*2); ctx.fill();

  } else if(t.type==="poison"){
    // Flask/vial
    const pg=ctx.createRadialGradient(tx-3,ty+3,1,tx,ty+3,13);
    pg.addColorStop(0,lighten(d.color,40)); pg.addColorStop(0.6,d.color); pg.addColorStop(1,darken(d.color,18));
    ctx.fillStyle=pg; ctx.beginPath(); ctx.arc(tx,ty+5,12,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="#ffffff18"; ctx.lineWidth=1.5; ctx.stroke();
    ctx.fillStyle=darken(d.color,10);
    ctx.beginPath(); ctx.roundRect(tx-4,ty-9,8,11,2); ctx.fill();
    ctx.fillStyle=darken(d.color,25);
    ctx.beginPath(); ctx.roundRect(tx-5.5,ty-11,11,4,1); ctx.fill();
    // Animated bubbles
    const b1=Math.sin(frame*0.15)*3, b2=Math.sin(frame*0.13+1)*3;
    ctx.fillStyle=d.accent+"55";
    ctx.beginPath(); ctx.arc(tx-4,ty+7-b1,2.5,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(tx+3,ty+4-b2,2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(tx,ty+10-b1*0.5,1.5,0,Math.PI*2); ctx.fill();
  }

  if(hov){
    ctx.strokeStyle=d.accent+"75"; ctx.lineWidth=1.5; ctx.setLineDash([5,4]);
    ctx.beginPath(); ctx.arc(tx,ty,d.range,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
    ctx.shadowBlur=0;
    // Cost tooltip
    ctx.fillStyle="rgba(0,0,0,0.7)"; ctx.beginPath(); ctx.roundRect(tx-22,ty+18,44,13,3); ctx.fill();
    ctx.fillStyle=d.accent; ctx.font="bold 9px sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(`[${d.key}] ${d.name}`,tx,ty+24);
  }
  ctx.shadowBlur=0; ctx.restore();
}

// ─── Enemy drawing ────────────────────────────────────────────────────────────
function drawEnemy(ctx:CanvasRenderingContext2D, e:Enemy, frame:number) {
  const d=ENEMY_DEFS[e.type]; const {x,y}=e; const sz=d.size;
  const spd=e.slowTimer>0?e.baseSpeed*0.42:(e.type==="berserker"&&e.hp<e.maxHp*0.5?e.baseSpeed*2.2:e.baseSpeed);
  ctx.save();
  ctx.shadowColor=d.glowColor; ctx.shadowBlur=sz*1.1;

  if(e.type==="scout"){
    // Fast little circle with speed streaks
    ctx.fillStyle=d.color;
    const sg=ctx.createRadialGradient(x-sz*0.3,y-sz*0.3,0,x,y,sz);
    sg.addColorStop(0,"#fffde7"); sg.addColorStop(0.6,d.color); sg.addColorStop(1,darken(d.color,30));
    ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(x,y,sz,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,0.3)"; ctx.lineWidth=0.8; ctx.stroke();
    // Speed trails
    ctx.strokeStyle=d.glowColor+"55"; ctx.lineWidth=1.2;
    for(let i=1;i<=3;i++){
      const len=(4+i*3)*spd*0.5;
      ctx.beginPath(); ctx.moveTo(x-e.dx*sz,y-e.dy*sz); ctx.lineTo(x-e.dx*(sz+len)-e.dx*i*2,y-e.dy*(sz+len)-e.dy*i*2); ctx.stroke();
    }

  } else if(e.type==="berserker"){
    const enraged=e.hp<e.maxHp*0.5;
    ctx.shadowColor=enraged?"#ef4444":d.glowColor; ctx.shadowBlur=enraged?sz*2.5:sz*1.2;
    drawStar(ctx,x,y,6,sz*1.3,sz*0.55);
    const bg=ctx.createRadialGradient(x,y,0,x,y,sz*1.4);
    if(enraged){bg.addColorStop(0,"#fef2f2");bg.addColorStop(0.5,"#ef4444");bg.addColorStop(1,"#7f1d1d");}
    else{bg.addColorStop(0,"#ffedd5");bg.addColorStop(0.5,d.color);bg.addColorStop(1,darken(d.color,30));}
    ctx.fillStyle=bg; ctx.fill();
    if(enraged){ctx.strokeStyle="#fca5a5"; ctx.lineWidth=1.5; ctx.stroke();}
    // Rage flame wisps when enraged
    if(enraged&&Math.sin(frame*0.3)>0){
      ctx.fillStyle="rgba(251,146,60,0.5)";
      ctx.beginPath(); ctx.arc(x+sz*1.2,y-sz*0.5,sz*0.4,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x-sz*1.1,y-sz*0.4,sz*0.3,0,Math.PI*2); ctx.fill();
    }

  } else if(e.type==="knight"){
    drawStar(ctx,x,y,4,sz*1.35,sz*0.7); // Square diamond
    const kg=ctx.createLinearGradient(x-sz,y-sz,x+sz,y+sz);
    kg.addColorStop(0,"#ffffff"); kg.addColorStop(0.3,d.color); kg.addColorStop(0.7,"#94a3b8"); kg.addColorStop(1,"#334155");
    ctx.fillStyle=kg; ctx.fill();
    // Armor highlight lines
    ctx.strokeStyle="rgba(255,255,255,0.5)"; ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.moveTo(x-sz*0.7,y-sz*0.2); ctx.lineTo(x,y-sz*1.0); ctx.lineTo(x+sz*0.7,y-sz*0.2); ctx.stroke();
    ctx.strokeStyle="rgba(255,255,255,0.2)"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(x-sz*0.4,y+sz*0.4); ctx.lineTo(x,y+sz*1.0); ctx.lineTo(x+sz*0.4,y+sz*0.4); ctx.stroke();
    // Shield gleam
    if(Math.sin(frame*0.08)>0.4){ctx.fillStyle="rgba(255,255,255,0.15)"; ctx.beginPath(); ctx.ellipse(x-sz*0.3,y-sz*0.4,sz*0.3,sz*0.6,0.3,0,Math.PI*2); ctx.fill();}

  } else if(e.type==="healer"){
    drawStar(ctx,x,y,5,sz*1.3,sz*0.55);
    const hg=ctx.createRadialGradient(x,y,0,x,y,sz*1.4);
    hg.addColorStop(0,"#a7f3d0"); hg.addColorStop(0.5,d.color); hg.addColorStop(1,darken(d.color,25));
    ctx.fillStyle=hg; ctx.fill(); ctx.strokeStyle="#ffffff30"; ctx.lineWidth=1; ctx.stroke();
    // Heal pulse ring
    const hp2=0.5+0.5*Math.sin(frame*0.12);
    ctx.strokeStyle=`rgba(52,211,153,${hp2*0.55})`; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(x,y,sz*2.0*hp2+sz,0,Math.PI*2); ctx.stroke();
    // Cross
    ctx.fillStyle="rgba(255,255,255,0.75)"; ctx.shadowBlur=0;
    ctx.fillRect(x-1.8,y-sz*0.65,3.6,sz*1.3);
    ctx.fillRect(x-sz*0.65,y-1.8,sz*1.3,3.6);

  } else if(d.shape==="diamond"){
    ctx.beginPath(); ctx.moveTo(x,y-sz*1.3); ctx.lineTo(x+sz*1.1,y); ctx.lineTo(x,y+sz*1.3); ctx.lineTo(x-sz*1.1,y); ctx.closePath();
    const dg=ctx.createRadialGradient(x-sz*0.3,y-sz*0.3,0,x,y,sz*1.4);
    dg.addColorStop(0,lighten(d.color,60)); dg.addColorStop(0.5,d.color); dg.addColorStop(1,darken(d.color,40));
    ctx.fillStyle=dg; ctx.fill(); ctx.strokeStyle="rgba(255,255,255,0.3)"; ctx.lineWidth=1; ctx.stroke();
  } else if(d.shape==="star"){
    drawStar(ctx,x,y,5,sz*1.2,sz*0.55);
    const sg=ctx.createRadialGradient(x-sz*0.3,y-sz*0.3,0,x,y,sz*1.3);
    sg.addColorStop(0,lighten(d.color,50)); sg.addColorStop(0.5,d.color); sg.addColorStop(1,darken(d.color,35));
    ctx.fillStyle=sg; ctx.fill(); ctx.strokeStyle="rgba(255,255,255,0.25)"; ctx.lineWidth=1; ctx.stroke();
  } else {
    // circle
    const cg=ctx.createRadialGradient(x-sz*0.35,y-sz*0.35,sz*0.05,x,y,sz*1.15);
    cg.addColorStop(0,lighten(d.color,55)); cg.addColorStop(0.45,d.color); cg.addColorStop(1,darken(d.color,40));
    ctx.beginPath(); ctx.arc(x,y,sz,0,Math.PI*2); ctx.fillStyle=cg; ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,0.22)"; ctx.lineWidth=1; ctx.stroke();
    // Boss crown
    if(e.type==="boss"){
      ctx.fillStyle="#fbbf24"; ctx.shadowBlur=sz;
      for(let i=0;i<3;i++){const ca=(i-1)*0.5; ctx.beginPath(); ctx.arc(x+Math.cos(ca-Math.PI/2)*sz,y+Math.sin(ca-Math.PI/2)*sz,3,0,Math.PI*2); ctx.fill();}
    }
  }

  ctx.shadowBlur=0;
  // Status auras
  if(e.slowTimer>0){
    ctx.fillStyle="rgba(103,232,249,0.2)"; ctx.beginPath(); ctx.arc(x,y,sz*1.45,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="rgba(103,232,249,0.45)"; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(x,y,sz*1.45,0,Math.PI*2); ctx.stroke();
  }
  if(e.poisonTimer>0){
    ctx.fillStyle="rgba(132,204,22,0.18)"; ctx.beginPath(); ctx.arc(x,y,sz*1.5,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="rgba(163,230,53,0.5)"; ctx.lineWidth=1; ctx.setLineDash([2,3]);
    ctx.beginPath(); ctx.arc(x,y,sz*1.5,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.restore();

  // Health bar
  const bw=sz*2.7, bh=4, bx=x-bw/2, by=y-sz-12;
  ctx.fillStyle="rgba(0,0,0,0.75)"; ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,2); ctx.fill();
  const pct=e.hp/e.maxHp;
  ctx.fillStyle=pct>0.6?"#22c55e":pct>0.3?"#f59e0b":"#ef4444";
  ctx.beginPath(); ctx.roundRect(bx,by,bw*pct,bh,2); ctx.fill();
  // Armor bar (silver bar below HP for armored enemies)
  if(d.armor){
    ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.beginPath(); ctx.roundRect(bx,by+5,bw,2,1); ctx.fill();
    ctx.fillStyle="#94a3b8"; ctx.beginPath(); ctx.roundRect(bx,by+5,bw*d.armor,2,1); ctx.fill();
  }
}

// ─── Projectile drawing ───────────────────────────────────────────────────────
function drawProjectile(ctx:CanvasRenderingContext2D, p:Proj) {
  const td=TOWER_DEFS[p.type];
  ctx.save(); ctx.shadowColor=td.accent; ctx.shadowBlur=12;
  if(p.type==="arrow"){
    ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.angle);
    ctx.fillStyle=td.accent;
    ctx.fillRect(-8,-1.5,12,3);
    ctx.beginPath(); ctx.moveTo(4,0); ctx.lineTo(-2,-3.5); ctx.lineTo(-2,3.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle="#8B4513"; ctx.fillRect(-8,-0.8,7,1.6);
    ctx.restore();
  } else if(p.type==="sniper"){
    ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.angle);
    ctx.fillStyle=td.accent;
    ctx.beginPath(); ctx.ellipse(0,0,9,2.5,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#ffffff80"; ctx.beginPath(); ctx.ellipse(-3,-0.8,3,1,0,0,Math.PI*2); ctx.fill();
    ctx.restore();
  } else if(p.type==="cannon"||p.type==="mortar"){
    const sz=p.type==="mortar"?7:5.5;
    const bg=ctx.createRadialGradient(p.x-sz*0.4,p.y-sz*0.4,1,p.x,p.y,sz);
    bg.addColorStop(0,"#777"); bg.addColorStop(1,"#111");
    ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(p.x,p.y,sz,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="#ffffff20"; ctx.lineWidth=1; ctx.stroke();
  } else if(p.type==="ice"){
    ctx.fillStyle="#e0f7ff"; ctx.beginPath(); ctx.arc(p.x,p.y,4,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="#67e8f9"; ctx.lineWidth=1;
    for(let i=0;i<4;i++){const a=i*Math.PI/4; ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x+Math.cos(a)*6,p.y+Math.sin(a)*6); ctx.stroke();}
  } else if(p.type==="lightning"){
    ctx.fillStyle=td.accent; ctx.beginPath(); ctx.arc(p.x,p.y,3.5,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=td.accent+"99"; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(p.x-3,p.y-5); ctx.lineTo(p.x+1,p.y); ctx.lineTo(p.x-2,p.y); ctx.lineTo(p.x+3,p.y+5); ctx.stroke();
  } else if(p.type==="poison"){
    const pg=ctx.createRadialGradient(p.x-2,p.y-2,0,p.x,p.y,5.5);
    pg.addColorStop(0,"#a3e635"); pg.addColorStop(1,"#3f6212");
    ctx.fillStyle=pg; ctx.beginPath(); ctx.arc(p.x,p.y,5,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="#84cc16"; ctx.lineWidth=1; ctx.stroke();
  } else {
    ctx.fillStyle=td.accent; ctx.beginPath(); ctx.arc(p.x,p.y,4,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

// ─── HUD ─────────────────────────────────────────────────────────────────────
function drawHUD(ctx:CanvasRenderingContext2D, s:{gold:number;lives:number;score:number;level:number;wave:number;selTower:TowerType}) {
  const td=TOWER_DEFS[s.selTower];
  // HUD bar
  const hg=ctx.createLinearGradient(0,0,0,34);
  hg.addColorStop(0,"rgba(5,5,20,0.9)"); hg.addColorStop(1,"rgba(5,5,20,0.7)");
  ctx.fillStyle=hg; ctx.fillRect(0,0,W,34);
  ctx.strokeStyle="rgba(255,150,50,0.25)"; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(0,34); ctx.lineTo(W,34); ctx.stroke();
  // Left: resources
  ctx.font="bold 12px sans-serif"; ctx.textBaseline="middle";
  ctx.fillStyle="#fbbf24"; ctx.textAlign="left"; ctx.fillText(`💰 ${s.gold}`,8,17);
  ctx.fillStyle="#ef4444"; ctx.fillText(`❤️ ${s.lives}`,90,17);
  ctx.fillStyle="#22c55e"; ctx.fillText(`⭐ ${s.score}`,168,17);
  // Center: level info
  ctx.fillStyle="#e2e8f0"; ctx.textAlign="center";
  ctx.fillText(`Level ${s.level+1} · ${LEVEL_NAMES[s.level]}  ·  Wave ${s.wave+1}/${LEVEL_WAVES[s.level]?.length}`,W/2,17);
  // Right: selected tower
  ctx.fillStyle=td.accent; ctx.textAlign="right";
  ctx.fillText(`[${td.key}] ${td.name}  $${td.cost}`,W-8,17);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TowerDefense() {
  const cv=useRef<HTMLCanvasElement>(null);
  const raf=useRef(0);
  const g=useRef({
    level:0,wave:0,wavePhase:"idle" as "idle"|"spawning"|"waitclear",
    spawnQueue:[] as {type:EnemyType}[],spawnTimer:0,betweenTimer:0,
    enemies:[] as Enemy[],towers:[] as Tower[],projectiles:[] as Proj[],splashes:[] as Splash[],
    gold:120,lives:20,score:0,frame:0,
    state:"playing" as GameState,
    path:LEVEL_PATHS[0],pathSet:new Set(LEVEL_PATHS[0].map(([c,r])=>`${c},${r}`)),
    hovCol:-1,hovRow:-1,selTower:"arrow" as TowerType,
    diffPaths:LEVEL_PATHS as [number,number][][],
  });

  const [screen,setScreen]=useState<"menu"|"game">("menu");
  const [difficulty,setDifficulty]=useState<"simple"|"complex">("simple");
  const [gold,setGold]=useState(120);
  const [lives,setLives]=useState(20);
  const [score,setScore]=useState(0);
  const [levelNum,setLevelNum]=useState(1);
  const [waveNum,setWaveNum]=useState(1);
  const [state,setState]=useState<GameState>("playing");
  const [selTower,setSelTowerUI]=useState<TowerType>("arrow");
  const [betweenMsg,setBetweenMsg]=useState("");

  const setSelTower=useCallback((t:TowerType)=>{ g.current.selTower=t; setSelTowerUI(t); },[]);

  const draw=useCallback(()=>{
    const c=cv.current; if(!c)return;
    const ctx=c.getContext("2d")!; const s=g.current;
    drawBackground(ctx,s.pathSet);
    drawPath(ctx,s.path,s.frame);
    // Hover highlight
    if(s.hovCol>=0&&s.hovRow>=0&&!s.pathSet.has(`${s.hovCol},${s.hovRow}`)&&!s.towers.some(t=>t.col===s.hovCol&&t.row===s.hovRow)){
      const td=TOWER_DEFS[s.selTower];
      ctx.fillStyle=s.gold>=td.cost?"rgba(100,220,100,0.22)":"rgba(220,50,50,0.18)";
      ctx.fillRect(s.hovCol*CELL,s.hovRow*CELL,CELL,CELL);
    }
    s.towers.forEach(t=>drawTower(ctx,t,t.col===s.hovCol&&t.row===s.hovRow,s.frame));
    // Splashes
    s.splashes.forEach(sp=>{
      ctx.save(); ctx.globalAlpha=sp.alpha;
      ctx.strokeStyle=sp.color; ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(sp.x,sp.y,sp.r,0,Math.PI*2); ctx.stroke();
      ctx.globalAlpha=sp.alpha*0.4;
      ctx.fillStyle=sp.color+"40"; ctx.fill();
      ctx.restore();
    });
    // Projectiles
    s.projectiles.forEach(p=>drawProjectile(ctx,p));
    // Lightning bolts (draw jagged line for in-flight lightning)
    s.projectiles.filter(p=>p.type==="lightning").forEach(p=>{
      ctx.save(); ctx.strokeStyle=TOWER_DEFS.lightning.accent+"90"; ctx.lineWidth=2;
      ctx.shadowColor=TOWER_DEFS.lightning.accent; ctx.shadowBlur=6;
      ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.tx,p.ty); ctx.stroke();
      ctx.restore();
    });
    // Enemies
    [...s.enemies].sort((a,b)=>b.pathIdx-a.pathIdx).forEach(e=>drawEnemy(ctx,e,s.frame));
    drawHUD(ctx,{gold:s.gold,lives:s.lives,score:s.score,level:s.level,wave:s.wave,selTower:s.selTower});
  },[]);

  const spawnNextWave=useCallback(()=>{
    const s=g.current;
    const waveDef=LEVEL_WAVES[s.level][s.wave];
    const flat:{type:EnemyType}[]=[];
    waveDef.forEach(({type,count})=>{for(let i=0;i<count;i++)flat.push({type});});
    s.spawnQueue=flat; s.spawnTimer=0; s.wavePhase="spawning";
  },[]);

  const loop=useCallback(()=>{
    const s=g.current;
    if(s.state==="win"||s.state==="lose"){draw();return;}
    s.frame++;

    if(s.wavePhase==="idle") spawnNextWave();

    // Spawn
    if(s.wavePhase==="spawning"){
      if(s.spawnQueue.length>0&&s.spawnTimer<=0){
        const {type}=s.spawnQueue.shift()!;
        s.enemies.push(makeEnemy(type,s.path));
        s.spawnTimer=ENEMY_DEFS[type].size>14?110:ENEMY_DEFS[type].speed>2.5?45:65;
      }
      if(s.spawnTimer>0)s.spawnTimer--;
      if(s.spawnQueue.length===0)s.wavePhase="waitclear";
    }

    // Move enemies
    s.enemies.forEach(e=>{
      if(e.pathIdx>=s.path.length-1)return;
      // Berserker rage speed
      const enraged=e.type==="berserker"&&e.hp<e.maxHp*0.5;
      const spd=e.slowTimer>0?e.baseSpeed*0.42:enraged?e.baseSpeed*2.2:e.baseSpeed;
      if(e.slowTimer>0)e.slowTimer--;
      // Poison DoT
      if(e.poisonTimer>0){ e.hp-=e.poisonDmg; e.poisonTimer--; }
      const [nc,nr]=s.path[e.pathIdx+1];
      const tx2=nc*CELL+CELL/2, ty2=nr*CELL+CELL/2;
      const dx=tx2-e.x, dy=ty2-e.y, dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<spd){e.pathIdx++;e.x=tx2;e.y=ty2;}
      else{const nx2=dx/dist*spd, ny2=dy/dist*spd; e.x+=nx2; e.y+=ny2; e.dx=dx/dist; e.dy=dy/dist;}
    });

    // Healer heal logic – every 90 frames, each healer heals nearby enemies
    if(s.frame%90===0){
      s.enemies.forEach(h=>{
        if(h.type!=="healer")return;
        s.enemies.forEach(e=>{
          if(e.id===h.id)return;
          const dx=e.x-h.x, dy=e.y-h.y;
          if(dx*dx+dy*dy<90*90){ e.hp=Math.min(e.maxHp,e.hp+22); }
        });
      });
    }

    // Leaked enemies
    const leaked=s.enemies.filter(e=>e.pathIdx>=s.path.length-1);
    if(leaked.length){
      s.lives-=leaked.length; setLives(s.lives);
      s.enemies=s.enemies.filter(e=>e.pathIdx<s.path.length-1);
      if(s.lives<=0){s.state="lose";setState("lose");draw();return;}
    }

    // Tower shooting
    s.towers.forEach(t=>{
      if(t.timer>0){t.timer--;return;}
      const td=TOWER_DEFS[t.type];
      const tx3=t.col*CELL+CELL/2, ty3=t.row*CELL+CELL/2;
      // Find furthest enemy in range (progress-first)
      const inRange=s.enemies.filter(e=>{const dx=e.x-tx3,dy=e.y-ty3;return dx*dx+dy*dy<=td.range*td.range;});
      if(!inRange.length)return;
      const target=inRange.reduce((best,e)=>e.pathIdx>best.pathIdx?e:best);
      // Update barrel angle for cannon
      if(t.type==="cannon"||t.type==="mortar"){t.angle=Math.atan2(target.y-ty3,target.x-tx3);}
      const angle=Math.atan2(target.y-ty3,target.x-tx3);
      s.projectiles.push({
        x:tx3,y:ty3,tx:target.x,ty:target.y,speed:t.type==="sniper"?12:8,
        dmg:td.dmg,eid:target.id,type:t.type,
        splash:td.splash,slowDur:td.slowDur,chainCount:td.chainCount,
        poisonDmg:td.poisonDmg,poisonDur:td.poisonDur,
        chainHits:[],angle,
      });
      t.timer=td.cd;
    });

    // Move projectiles
    s.projectiles=s.projectiles.filter(p=>{
      const dx=p.tx-p.x,dy=p.ty-p.y,dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<p.speed+1){
        const applyDamage=(e:Enemy,dmg:number)=>{
          const armor=ENEMY_DEFS[e.type].armor??0;
          e.hp-=dmg*(1-armor);
        };
        if(p.splash){
          s.enemies.forEach(e=>{
            const ex=e.x-p.tx,ey=e.y-p.ty;
            if(ex*ex+ey*ey<=p.splash!*p.splash!){
              applyDamage(e,p.dmg);
              if(p.poisonDmg&&p.poisonDur){e.poisonTimer=p.poisonDur;e.poisonDmg=p.poisonDmg;}
            }
          });
          const splashColor=p.type==="poison"?TOWER_DEFS.poison.accent:p.type==="mortar"?TOWER_DEFS.mortar.accent:TOWER_DEFS.cannon.accent;
          s.splashes.push({x:p.tx,y:p.ty,r:4,maxR:p.splash,alpha:0.85,color:splashColor});
        } else {
          const e=s.enemies.find(e=>e.id===p.eid);
          if(e){
            applyDamage(e,p.dmg);
            if(p.slowDur&&p.slowDur>0)e.slowTimer=p.slowDur;
            if(p.chainCount&&p.chainCount>0){
              const nearby=s.enemies.filter(en=>en.id!==e.id&&!(p.chainHits||[]).includes(en.id));
              for(let i=0;i<Math.min(p.chainCount,nearby.length);i++){
                const chainDmg=p.dmg*0.65;
                const armor=ENEMY_DEFS[nearby[i].type].armor??0;
                nearby[i].hp-=chainDmg*(1-armor);
                s.projectiles.push({x:e.x,y:e.y,tx:nearby[i].x,ty:nearby[i].y,speed:11,dmg:0,eid:nearby[i].id,type:"lightning",chainHits:[e.id,...(p.chainHits||[])],angle:Math.atan2(nearby[i].y-e.y,nearby[i].x-e.x)});
              }
            }
          }
        }
        // Remove dead
        const dead=s.enemies.filter(e=>e.hp<=0);
        dead.forEach(e=>{s.gold+=ENEMY_DEFS[e.type].reward;s.score+=ENEMY_DEFS[e.type].reward*5;});
        if(dead.length){setGold(s.gold);setScore(s.score);}
        s.enemies=s.enemies.filter(e=>e.hp>0);
        return false;
      }
      p.x+=dx/dist*p.speed; p.y+=dy/dist*p.speed;
      return true;
    });

    // Animate splashes
    s.splashes=s.splashes.filter(sp=>{sp.r+=3.5;sp.alpha-=0.065;return sp.alpha>0&&sp.r<sp.maxR*1.6;});

    // Wave/level clear
    if(s.wavePhase==="waitclear"&&s.enemies.length===0){
      const totalWaves=LEVEL_WAVES[s.level].length;
      if(s.wave<totalWaves-1){
        s.wave++;s.gold+=50;setGold(s.gold);setWaveNum(s.wave+1);s.wavePhase="idle";
      } else if(s.level>=4){
        s.state="win";setState("win");
      } else {
        s.state="between";setState("between");
        const bonus=LEVEL_GOLD[s.level];
        s.gold+=bonus;setGold(s.gold);
        s.lives=Math.min(20,s.lives+5);setLives(s.lives);
        setBetweenMsg(`Level ${s.level+1} Complete! +${bonus} gold, +5 lives`);
        s.betweenTimer=260;
      }
    }

    if(s.state==="between"){s.betweenTimer--;if(s.betweenTimer<=0)advanceLevel();}
    draw(); raf.current=requestAnimationFrame(loop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[draw,spawnNextWave]);

  const advanceLevel=useCallback(()=>{
    const s=g.current;
    s.level++;s.wave=0;s.wavePhase="idle";
    s.path=s.diffPaths[s.level];s.pathSet=new Set(s.diffPaths[s.level].map(([c,r])=>`${c},${r}`));
    s.enemies=[];s.projectiles=[];s.splashes=[];s.towers=[];
    s.gold=LEVEL_START_GOLD[s.level];setGold(s.gold);
    s.state="playing";setState("playing");setLevelNum(s.level+1);setWaveNum(1);
  },[]);

  const placeTower=useCallback((col:number,row:number)=>{
    const s=g.current;
    if(s.pathSet.has(`${col},${row}`))return;
    if(s.towers.some(t=>t.col===col&&t.row===row))return;
    const td=TOWER_DEFS[s.selTower]; if(s.gold<td.cost)return;
    s.towers.push({col,row,type:s.selTower,timer:0,angle:0});
    s.gold-=td.cost;setGold(s.gold);
  },[]);

  useEffect(()=>{
    if(screen!=="game")return;
    const c=cv.current;
    const onMove=(e:MouseEvent)=>{
      const rect=c?.getBoundingClientRect();if(!rect)return;
      const scX=W/rect.width,scY=H/rect.height;
      g.current.hovCol=Math.floor((e.clientX-rect.left)*scX/CELL);
      g.current.hovRow=Math.floor((e.clientY-rect.top)*scY/CELL);
    };
    const onClick=(e:MouseEvent)=>{
      const rect=c?.getBoundingClientRect();if(!rect)return;
      const scX=W/rect.width,scY=H/rect.height;
      placeTower(Math.floor((e.clientX-rect.left)*scX/CELL),Math.floor((e.clientY-rect.top)*scY/CELL));
    };
    const onKey=(e:KeyboardEvent)=>{
      const map:Record<string,TowerType>={1:"arrow",2:"cannon",3:"ice",4:"lightning",5:"sniper",6:"mortar",7:"poison"};
      if(map[e.key]){setSelTower(map[e.key]);e.preventDefault();}
    };
    c?.addEventListener("mousemove",onMove); c?.addEventListener("click",onClick);
    window.addEventListener("keydown",onKey);
    raf.current=requestAnimationFrame(loop);
    return()=>{c?.removeEventListener("mousemove",onMove);c?.removeEventListener("click",onClick);window.removeEventListener("keydown",onKey);cancelAnimationFrame(raf.current);};
  },[loop,placeTower,setSelTower,screen]);

  const startGame=useCallback((diff:"simple"|"complex")=>{
    const paths=diff==="complex"?COMPLEX_LEVEL_PATHS:LEVEL_PATHS;
    const s=g.current;
    s.level=0;s.wave=0;s.wavePhase="idle";s.diffPaths=paths;
    s.path=paths[0];s.pathSet=new Set(paths[0].map(([c,r])=>`${c},${r}`));
    s.enemies=[];s.towers=[];s.projectiles=[];s.splashes=[];
    s.gold=120;s.lives=20;s.score=0;s.frame=0;
    s.spawnQueue=[];s.spawnTimer=0;s.state="playing";
    setGold(120);setLives(20);setScore(0);setLevelNum(1);setWaveNum(1);setState("playing");
    setDifficulty(diff);setScreen("game");
  },[]);

  const reset=useCallback((diff?:"simple"|"complex")=>{
    cancelAnimationFrame(raf.current);
    if(!diff){setScreen("menu");return;}
    const paths=diff==="complex"?COMPLEX_LEVEL_PATHS:LEVEL_PATHS;
    const s=g.current;
    s.level=0;s.wave=0;s.wavePhase="idle";s.diffPaths=paths;
    s.path=paths[0];s.pathSet=new Set(paths[0].map(([c,r])=>`${c},${r}`));
    s.enemies=[];s.towers=[];s.projectiles=[];s.splashes=[];
    s.gold=120;s.lives=20;s.score=0;s.frame=0;
    s.spawnQueue=[];s.spawnTimer=0;s.state="playing";
    setGold(120);setLives(20);setScore(0);setLevelNum(1);setWaveNum(1);setState("playing");
    raf.current=requestAnimationFrame(loop);
  },[loop]);

  // ── Menu ─────────────────────────────────────────────────────────────────────
  if(screen==="menu") return (
    <Shell title="Tower Defense">
      <div className="flex flex-col items-center gap-6 text-center max-w-sm w-full">
        <div className="text-6xl select-none">🏰</div>
        <div>
          <h2 className="text-2xl font-black text-orange-400 mb-1">Select Difficulty</h2>
          <p className="text-sm text-muted-foreground">Shapes the enemy path complexity across all 5 levels.</p>
        </div>
        <div className="flex flex-col gap-3 w-full">
          <button onClick={()=>startGame("simple")} className="w-full py-5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-300 font-black rounded-2xl transition-colors touch-manipulation">
            🛡️ Simple
            <div className="text-xs font-normal text-muted-foreground mt-1">Gentle curves · Easy-to-follow paths</div>
            <div className="flex flex-wrap gap-1 justify-center mt-2">
              {["Straightaway","S-Curve","Triple Zigzag","Snake","Labyrinth"].map((n,i)=>(
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400">{n}</span>
              ))}
            </div>
          </button>
          <button onClick={()=>startGame("complex")} className="w-full py-5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 font-black rounded-2xl transition-colors touch-manipulation">
            ⚔️ Complex
            <div className="text-xs font-normal text-muted-foreground mt-1">Many tight turns · Enemies travel far</div>
            <div className="flex flex-wrap gap-1 justify-center mt-2">
              {["5 Zigzags","7 Zigzags","3 Sweeps","Full Grid","Twisted Maze"].map((n,i)=>(
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400">{n}</span>
              ))}
            </div>
          </button>
        </div>
        {/* New enemy/tower preview */}
        <div className="w-full text-left">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">New this version</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700">
              <p className="font-bold text-orange-300 mb-1">🗡️ 7 Towers</p>
              {["Archer","Cannon","Glacier","Tesla","Sniper","Mortar","Toxin"].map((t,i)=>(
                <span key={t} className="inline-block mr-1 text-muted-foreground">[{i+1}]{t}</span>
              ))}
            </div>
            <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700">
              <p className="font-bold text-red-300 mb-1">👾 10 Enemies</p>
              {(Object.values(ENEMY_DEFS) as typeof ENEMY_DEFS[EnemyType][]).map(d=>(
                <span key={d.name} className="inline-block mr-1" style={{color:d.color}}>{d.badge}</span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs mt-2">
            <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700 text-muted-foreground">
              🛡️ <span className="text-slate-300">Knights</span> have 45% armor — some attacks bounce off
            </div>
            <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700 text-muted-foreground">
              💚 <span className="text-green-400">Healers</span> restore 22 HP to nearby allies every 1.5s
            </div>
            <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700 text-muted-foreground">
              🔥 <span className="text-orange-400">Berserkers</span> double speed below 50% HP
            </div>
            <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700 text-muted-foreground">
              ☠️ <span className="text-lime-400">Toxin</span> leaves poison DoT on hit enemies
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );

  // ── Game ──────────────────────────────────────────────────────────────────────
  return (
    <Shell title={`Tower Defense · ${difficulty==="complex"?"⚔️ Complex":"🛡️ Simple"}`}>
      {/* Tower selector */}
      <div className="flex gap-1.5 flex-wrap justify-center">
        {(Object.entries(TOWER_DEFS) as [TowerType,typeof TOWER_DEFS.arrow][]).map(([type,td])=>(
          <button key={type} onClick={()=>setSelTower(type)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${selTower===type?"border-white scale-105 shadow-lg":"border-border opacity-70 hover:opacity-100"}`}
            style={{background:td.color+(selTower===type?"55":"22"),color:td.accent,borderColor:selTower===type?td.accent:undefined}}>
            <span className="opacity-60">[{td.key}]</span> {td.name}
            <span className="text-yellow-400 ml-1">${td.cost}</span>
            <div className="text-[10px] text-muted-foreground font-normal">{td.desc}</div>
          </button>
        ))}
      </div>
      <div className="relative">
        <canvas ref={cv} width={W} height={H} className="rounded-xl border border-slate-700/60 cursor-crosshair" style={{maxWidth:"95vw",boxShadow:"0 0 40px rgba(0,0,0,0.6)"}} />
        {state==="between"&&(
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-xl gap-3">
            <p className="text-3xl font-black text-yellow-400">🏆 {betweenMsg}</p>
            <p className="text-white/70 text-sm">Next: Level {levelNum+1} — {LEVEL_NAMES[levelNum]}</p>
            <button onClick={advanceLevel} className="px-8 py-3 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-xl transition-colors">Start Level {levelNum+1} →</button>
          </div>
        )}
        {(state==="win"||state==="lose")&&(
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 rounded-xl gap-4">
            <p className="text-4xl font-black" style={{color:state==="win"?"#fbbf24":"#ef4444"}}>
              {state==="win"?"🏆 Victory!":"💀 The Realm Falls!"}
            </p>
            {state==="win"&&<p className="text-lg text-yellow-300">All 5 Levels Cleared!</p>}
            <p className="font-mono text-muted-foreground">Score: {score} · Level {levelNum}</p>
            <div className="flex gap-3 flex-wrap justify-center">
              <button onClick={()=>reset(difficulty)} className="px-6 py-3 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-xl transition-colors">Play Again</button>
              <button onClick={()=>reset()} className="px-6 py-3 bg-secondary text-foreground font-bold rounded-xl transition-colors">Change Difficulty</button>
            </div>
          </div>
        )}
      </div>
      {/* Stats bar */}
      <div className="flex gap-5 text-xs font-mono items-center flex-wrap justify-center">
        <span className="text-yellow-400">💰 {gold}</span>
        <span className="text-red-400">❤️ {lives}</span>
        <span className="text-orange-400">📍 Lv {levelNum}/5: {LEVEL_NAMES[levelNum-1]}</span>
        <span className="text-blue-400">🌊 Wave {waveNum}/{LEVEL_WAVES[levelNum-1]?.length}</span>
        <span className="text-green-400">⭐ {score}</span>
      </div>
      {/* Enemy reference */}
      <div className="flex gap-2 flex-wrap justify-center">
        {(Object.entries(ENEMY_DEFS) as [EnemyType,typeof ENEMY_DEFS.goblin][]).map(([type,d])=>(
          <span key={type} className="text-[10px] px-2 py-0.5 rounded-full border border-border flex items-center gap-1"
            style={{color:d.color,borderColor:d.color+"40"}}>
            {d.badge} {d.name}
            {d.armor&&<span className="text-slate-400">🛡️{Math.round(d.armor*100)}%</span>}
            {d.heals&&<span className="text-green-400">💚</span>}
          </span>
        ))}
      </div>
    </Shell>
  );
}
