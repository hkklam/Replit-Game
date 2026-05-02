import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-4 px-4 py-3 border-b border-orange-500/30 bg-gradient-to-r from-orange-950/60 to-transparent">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Hub</span>
        </Link>
        <span className="text-2xl select-none" style={{ filter: "drop-shadow(0 0 8px #fb923c80)" }}>🏰</span>
        <h1 className="text-lg font-bold text-orange-400">{title}</h1>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-3 gap-3">{children}</div>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CELL = 44, COLS = 18, ROWS = 12, W = COLS * CELL, H = ROWS * CELL;

// ─── Level paths (col, row) ───────────────────────────────────────────────────
const LEVEL_PATHS: [number,number][][] = [
  // Level 1 – Straightaway
  [[0,5],[1,5],[2,5],[3,5],[4,5],[5,5],[6,5],[7,5],[8,5],[9,5],[10,5],[10,4],[10,3],[10,2],[11,2],[12,2],[13,2],[14,2],[15,2],[16,2],[17,2]],
  // Level 2 – S-Curve
  [[0,2],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],[6,3],[6,4],[6,5],[6,6],[6,7],[6,8],[6,9],[7,9],[8,9],[9,9],[10,9],[11,9],[11,8],[11,7],[11,6],[11,5],[11,4],[12,4],[13,4],[14,4],[15,4],[16,4],[17,4]],
  // Level 3 – Triple Zigzag
  [[0,10],[1,10],[2,10],[3,10],[4,10],[4,9],[4,8],[4,7],[4,6],[4,5],[4,4],[4,3],[4,2],[4,1],[5,1],[6,1],[7,1],[8,1],[9,1],[9,2],[9,3],[9,4],[9,5],[9,6],[9,7],[9,8],[9,9],[9,10],[10,10],[11,10],[12,10],[13,10],[13,9],[13,8],[13,7],[13,6],[13,5],[13,4],[13,3],[13,2],[13,1],[14,1],[15,1],[16,1],[17,1]],
  // Level 4 – Snake
  [[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[7,1],[8,1],[9,1],[10,1],[11,1],[12,1],[13,1],[14,1],[15,1],[16,1],[17,1],[17,2],[17,3],[16,3],[15,3],[14,3],[13,3],[12,3],[11,3],[10,3],[9,3],[8,3],[7,3],[6,3],[5,3],[4,3],[3,3],[2,3],[1,3],[0,3],[0,4],[0,5],[1,5],[2,5],[3,5],[4,5],[5,5],[6,5],[7,5],[8,5],[9,5],[10,5],[11,5],[12,5],[13,5],[14,5],[15,5],[16,5],[17,5],[17,6],[17,7],[16,7],[15,7],[14,7],[13,7],[12,7],[11,7],[10,7],[9,7],[8,7],[7,7],[6,7],[5,7],[4,7],[3,7],[2,7],[1,7],[0,7],[0,8],[0,9],[1,9],[2,9],[3,9],[4,9],[5,9],[6,9],[7,9],[8,9],[9,9],[10,9],[11,9],[12,9],[13,9],[14,9],[15,9],[16,9],[17,9]],
  // Level 5 – Labyrinth
  [[0,3],[1,3],[2,3],[3,3],[4,3],[5,3],[5,4],[5,5],[5,6],[5,7],[5,8],[5,9],[5,10],[6,10],[7,10],[8,10],[9,10],[10,10],[11,10],[12,10],[12,9],[12,8],[12,7],[12,6],[12,5],[12,4],[12,3],[13,3],[14,3],[15,3],[16,3],[16,4],[16,5],[16,6],[16,7],[16,8],[15,8],[14,8],[13,8],[13,9],[13,10],[14,10],[15,10],[16,10],[17,10]],
];

// ─── Enemy defs ───────────────────────────────────────────────────────────────
type EnemyType = "goblin"|"orc"|"troll"|"mage"|"demon"|"boss";
const ENEMY_DEFS: Record<EnemyType,{hp:number;speed:number;color:string;glowColor:string;size:number;reward:number;name:string;shape:"circle"|"diamond"|"star"}> = {
  goblin: { hp:40,   speed:2.5, color:"#4ade80", glowColor:"#86efac", size:8,  reward:8,   name:"Goblin",  shape:"circle" },
  orc:    { hp:130,  speed:1.8, color:"#f59e0b", glowColor:"#fcd34d", size:11, reward:12,  name:"Orc",     shape:"circle" },
  troll:  { hp:380,  speed:1.1, color:"#94a3b8", glowColor:"#cbd5e1", size:14, reward:20,  name:"Troll",   shape:"circle" },
  mage:   { hp:90,   speed:2.2, color:"#a78bfa", glowColor:"#c4b5fd", size:9,  reward:15,  name:"Mage",    shape:"diamond" },
  demon:  { hp:550,  speed:1.5, color:"#ef4444", glowColor:"#fca5a5", size:13, reward:30,  name:"Demon",   shape:"star" },
  boss:   { hp:2200, speed:0.9, color:"#fbbf24", glowColor:"#fde68a", size:20, reward:100, name:"Dragon",  shape:"star" },
};

// ─── Tower defs ───────────────────────────────────────────────────────────────
type TowerType = "arrow"|"cannon"|"ice"|"lightning";
const TOWER_DEFS: Record<TowerType,{cost:number;range:number;dmg:number;cd:number;splash?:number;slowDur?:number;chainCount?:number;color:string;accent:string;name:string;key:string}> = {
  arrow:     { cost:50,  range:100, dmg:28,  cd:20, color:"#2563eb", accent:"#93c5fd", name:"Arrow",     key:"1" },
  cannon:    { cost:100, range:80,  dmg:90,  cd:60, splash:38,                          color:"#ea580c", accent:"#fdba74", name:"Cannon",    key:"2" },
  ice:       { cost:75,  range:90,  dmg:12,  cd:30, slowDur:80,                         color:"#0891b2", accent:"#67e8f9", name:"Ice",       key:"3" },
  lightning: { cost:125, range:110, dmg:65,  cd:40, chainCount:2,                       color:"#ca8a04", accent:"#fde047", name:"Lightning", key:"4" },
};

// ─── Level wave compositions ──────────────────────────────────────────────────
type SpawnEntry = { type:EnemyType; count:number; interval:number };
const LEVEL_WAVES: SpawnEntry[][][] = [
  // Level 1
  [[{type:"goblin",count:8,interval:80}],[{type:"goblin",count:5,interval:70},{type:"orc",count:3,interval:90}]],
  // Level 2
  [[{type:"goblin",count:5,interval:70},{type:"orc",count:5,interval:80}],[{type:"orc",count:4,interval:70},{type:"troll",count:3,interval:100},{type:"goblin",count:4,interval:60}]],
  // Level 3
  [[{type:"orc",count:5,interval:65},{type:"troll",count:4,interval:95},{type:"mage",count:3,interval:70}],[{type:"troll",count:3,interval:90},{type:"mage",count:4,interval:65},{type:"demon",count:2,interval:100}]],
  // Level 4
  [[{type:"troll",count:4,interval:80},{type:"mage",count:4,interval:65},{type:"demon",count:3,interval:95}],[{type:"demon",count:5,interval:80},{type:"mage",count:3,interval:60},{type:"troll",count:3,interval:100}]],
  // Level 5
  [[{type:"demon",count:3,interval:75},{type:"boss",count:1,interval:200},{type:"troll",count:3,interval:80}],[{type:"demon",count:3,interval:70},{type:"boss",count:2,interval:180},{type:"mage",count:3,interval:65}]],
];

const LEVEL_NAMES = ["The Plains","The Valley","Triple Pass","The Long March","The Labyrinth"];
const LEVEL_GOLD  = [100,130,160,200,250];
const LEVEL_START_GOLD = [100,130,170,220,280];

// ─── Types ────────────────────────────────────────────────────────────────────
let eid=0;
type Enemy = {
  id:number; type:EnemyType; pathIdx:number; x:number; y:number;
  hp:number; maxHp:number; speed:number; baseSpeed:number; slowTimer:number;
};
type Tower = {
  col:number; row:number; type:TowerType; timer:number;
};
type Proj = {
  x:number; y:number; tx:number; ty:number; speed:number; dmg:number; eid:number;
  type:TowerType; splash?:number; slowDur?:number; chainCount?:number;
  chainHits?:number[];
};
type Splash = { x:number; y:number; r:number; maxR:number; alpha:number; color:string };
type GameState = "playing"|"between"|"win"|"lose";

function makeEnemy(type:EnemyType, path:[number,number][]): Enemy {
  const d=ENEMY_DEFS[type];
  const [sc,sr]=path[0];
  return { id:eid++, type, pathIdx:0, x:sc*CELL+CELL/2, y:sr*CELL+CELL/2, hp:d.hp, maxHp:d.hp, speed:d.speed, baseSpeed:d.speed, slowTimer:0 };
}

// ─── Drawing helpers ──────────────────────────────────────────────────────────
function drawEnemy(ctx:CanvasRenderingContext2D, e:Enemy) {
  const d=ENEMY_DEFS[e.type];
  const {x,y}=e, sz=d.size;
  ctx.save();
  // Glow
  ctx.shadowColor=d.glowColor; ctx.shadowBlur=sz*0.8;
  if (d.shape==="diamond") {
    ctx.beginPath(); ctx.moveTo(x,y-sz*1.3); ctx.lineTo(x+sz*1.1,y); ctx.lineTo(x,y+sz*1.3); ctx.lineTo(x-sz*1.1,y); ctx.closePath();
    const g=ctx.createRadialGradient(x-sz*0.3,y-sz*0.3,0,x,y,sz*1.4);
    g.addColorStop(0,lighten(d.color,60)); g.addColorStop(0.5,d.color); g.addColorStop(1,darken(d.color,40));
    ctx.fillStyle=g; ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,0.3)"; ctx.lineWidth=1; ctx.stroke();
  } else if (d.shape==="star") {
    drawStar(ctx,x,y,5,sz*1.2,sz*0.55);
    const g=ctx.createRadialGradient(x-sz*0.3,y-sz*0.3,0,x,y,sz*1.3);
    g.addColorStop(0,lighten(d.color,50)); g.addColorStop(0.5,d.color); g.addColorStop(1,darken(d.color,35));
    ctx.fillStyle=g; ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,0.25)"; ctx.lineWidth=1; ctx.stroke();
  } else {
    const g=ctx.createRadialGradient(x-sz*0.35,y-sz*0.35,sz*0.05,x,y,sz*1.15);
    g.addColorStop(0,lighten(d.color,55)); g.addColorStop(0.45,d.color); g.addColorStop(1,darken(d.color,40));
    ctx.beginPath(); ctx.arc(x,y,sz,0,Math.PI*2);
    ctx.fillStyle=g; ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,0.22)"; ctx.lineWidth=1; ctx.stroke();
  }
  ctx.shadowBlur=0; ctx.restore();
  // Health bar
  const bw=sz*2.4, bh=3.5, bx=x-bw/2, by=y-sz-9;
  ctx.fillStyle="rgba(0,0,0,0.7)"; ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,2); ctx.fill();
  const hpPct=e.hp/e.maxHp;
  const hpCol=hpPct>0.6?"#22c55e":hpPct>0.3?"#f59e0b":"#ef4444";
  ctx.fillStyle=hpCol; ctx.beginPath(); ctx.roundRect(bx,by,bw*hpPct,bh,2); ctx.fill();
  // Slow indicator
  if (e.slowTimer>0) { ctx.fillStyle="rgba(103,232,249,0.35)"; ctx.beginPath(); ctx.arc(x,y,sz*1.3,0,Math.PI*2); ctx.fill(); }
}

function drawTower(ctx:CanvasRenderingContext2D, t:Tower, hov:boolean) {
  const d=TOWER_DEFS[t.type];
  const tx=t.col*CELL+CELL/2, ty=t.row*CELL+CELL/2;
  const sz=CELL*0.42;
  ctx.save();
  if (hov) { ctx.shadowColor=d.accent; ctx.shadowBlur=16; }
  // Base platform
  ctx.fillStyle=darken(d.color,30);
  ctx.beginPath(); ctx.roundRect(t.col*CELL+5,t.row*CELL+5,CELL-10,CELL-10,5); ctx.fill();
  // Tower body
  const bg=ctx.createRadialGradient(tx-sz*0.2,ty-sz*0.2,0,tx,ty,sz*1.1);
  bg.addColorStop(0,lighten(d.color,30)); bg.addColorStop(0.6,d.color); bg.addColorStop(1,darken(d.color,20));
  ctx.fillStyle=bg;
  if (t.type==="arrow") {
    ctx.beginPath(); ctx.roundRect(tx-sz*0.7,ty-sz*0.7,sz*1.4,sz*1.4,4); ctx.fill();
    // Arrow symbol
    ctx.fillStyle=d.accent; ctx.font=`bold ${Math.round(sz*1.1)}px sans-serif`; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText("▲",tx,ty-1);
  } else if (t.type==="cannon") {
    ctx.beginPath(); ctx.arc(tx,ty,sz*0.85,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=darken(d.color,30); ctx.beginPath(); ctx.arc(tx,ty,sz*0.4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=d.accent; ctx.font=`${Math.round(sz*0.95)}px sans-serif`; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("💣",tx,ty+1);
  } else if (t.type==="ice") {
    ctx.beginPath(); ctx.roundRect(tx-sz*0.75,ty-sz*0.75,sz*1.5,sz*1.5,6); ctx.fill();
    ctx.fillStyle=d.accent; ctx.font=`bold ${Math.round(sz*1.1)}px sans-serif`; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("❄",tx,ty+1);
  } else {
    ctx.beginPath(); ctx.arc(tx,ty,sz*0.85,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=d.accent; ctx.font=`bold ${Math.round(sz*1.1)}px sans-serif`; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("⚡",tx,ty+1);
  }
  // Range ring on hover
  if (hov) {
    ctx.strokeStyle=d.accent+"60"; ctx.lineWidth=1.5; ctx.setLineDash([4,4]);
    ctx.beginPath(); ctx.arc(tx,ty,d.range,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.shadowBlur=0; ctx.restore();
}

function drawStar(ctx:CanvasRenderingContext2D,cx:number,cy:number,points:number,outerR:number,innerR:number){
  ctx.beginPath();
  for(let i=0;i<points*2;i++){
    const r=i%2===0?outerR:innerR, a=(i*Math.PI/points)-Math.PI/2;
    i===0?ctx.moveTo(cx+r*Math.cos(a),cy+r*Math.sin(a)):ctx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a));
  }
  ctx.closePath();
}

function lighten(hex:string,amt:number):string{
  const n=parseInt(hex.replace("#",""),16);
  const r=Math.min(255,(n>>16)+amt),g=Math.min(255,((n>>8)&0xff)+amt),b=Math.min(255,(n&0xff)+amt);
  return `rgb(${r},${g},${b})`;
}
function darken(hex:string,amt:number):string{ return lighten(hex,-amt); }

// ─── Component ────────────────────────────────────────────────────────────────
export default function TowerDefense() {
  const cv = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  const g = useRef({
    level:0, wave:0, wavePhase:"idle" as "idle"|"spawning"|"waitclear",
    spawnQueue:[] as {type:EnemyType}[], spawnTimer:0, betweenTimer:0,
    enemies:[] as Enemy[], towers:[] as Tower[], projectiles:[] as Proj[], splashes:[] as Splash[],
    gold:100, lives:20, score:0, frame:0,
    state:"playing" as GameState,
    path:LEVEL_PATHS[0], pathSet:new Set(LEVEL_PATHS[0].map(([c,r])=>`${c},${r}`)),
    hovCol:-1, hovRow:-1, selTower:"arrow" as TowerType,
  });

  const [gold,setGold]=useState(100);
  const [lives,setLives]=useState(20);
  const [score,setScore]=useState(0);
  const [levelNum,setLevelNum]=useState(1);
  const [waveNum,setWaveNum]=useState(1);
  const [state,setState]=useState<GameState>("playing");
  const [selTower,setSelTowerUI]=useState<TowerType>("arrow");
  const [betweenMsg,setBetweenMsg]=useState("");

  const setSelTower = useCallback((t:TowerType)=>{
    g.current.selTower=t; setSelTowerUI(t);
  },[]);

  const draw = useCallback(()=>{
    const c=cv.current; if(!c)return;
    const ctx=c.getContext("2d")!;
    const s=g.current;

    // Background – nice grass
    ctx.fillStyle="#1e3a1e"; ctx.fillRect(0,0,W,H);
    // Grass texture dots
    for(let col=0;col<COLS;col++) for(let row=0;row<ROWS;row++){
      if(s.pathSet.has(`${col},${row}`))continue;
      ctx.fillStyle=(col+row)%2===0?"#1e3a1e":"#1a331a";
      ctx.fillRect(col*CELL,row*CELL,CELL,CELL);
    }
    // Grid lines
    ctx.strokeStyle="rgba(0,0,0,0.12)"; ctx.lineWidth=0.5;
    for(let col=0;col<=COLS;col++){ctx.beginPath();ctx.moveTo(col*CELL,0);ctx.lineTo(col*CELL,H);ctx.stroke();}
    for(let row=0;row<=ROWS;row++){ctx.beginPath();ctx.moveTo(0,row*CELL);ctx.lineTo(W,row*CELL);ctx.stroke();}

    // Path
    const path=s.path;
    for(let i=0;i<path.length;i++){
      const [col,row]=path[i];
      const nx=col*CELL, ny=row*CELL;
      // Path base
      const pathGrad=ctx.createLinearGradient(nx,ny,nx+CELL,ny+CELL);
      pathGrad.addColorStop(0,"#9a7040"); pathGrad.addColorStop(1,"#7a5830");
      ctx.fillStyle=pathGrad; ctx.fillRect(nx,ny,CELL,CELL);
      // Cobblestone texture
      ctx.strokeStyle="rgba(60,40,20,0.4)"; ctx.lineWidth=0.5;
      ctx.strokeRect(nx+3,ny+3,CELL-6,CELL-6);
    }
    // START/END markers
    const [sc,sr]=path[0]; const [ec,er]=path[path.length-1];
    ctx.fillStyle="#22c55e"; ctx.font="bold 9px sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText("START",sc*CELL+CELL/2,sr*CELL+CELL/2);
    ctx.fillStyle="#ef4444"; ctx.fillText("END",ec*CELL+CELL/2,er*CELL+CELL/2);

    // Hover cell
    if(s.hovCol>=0&&s.hovRow>=0&&!s.pathSet.has(`${s.hovCol},${s.hovRow}`)&&!s.towers.some(t=>t.col===s.hovCol&&t.row===s.hovRow)){
      const td=TOWER_DEFS[s.selTower];
      ctx.fillStyle=s.gold>=td.cost?"rgba(100,200,100,0.25)":"rgba(200,50,50,0.2)";
      ctx.fillRect(s.hovCol*CELL,s.hovRow*CELL,CELL,CELL);
    }

    // Towers
    s.towers.forEach(t=>drawTower(ctx,t,t.col===s.hovCol&&t.row===s.hovRow));

    // Splashes
    s.splashes.forEach(sp=>{
      ctx.globalAlpha=sp.alpha;
      ctx.strokeStyle=sp.color; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.arc(sp.x,sp.y,sp.r,0,Math.PI*2); ctx.stroke();
      ctx.globalAlpha=1;
    });

    // Projectiles
    s.projectiles.forEach(p=>{
      const td=TOWER_DEFS[p.type];
      ctx.save(); ctx.shadowColor=td.accent; ctx.shadowBlur=8;
      ctx.fillStyle=td.accent;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.type==="cannon"?5:p.type==="lightning"?3:3,0,Math.PI*2); ctx.fill();
      ctx.restore();
    });

    // Enemies (sorted front-to-back so leaders render on top)
    [...s.enemies].sort((a,b)=>b.pathIdx-a.pathIdx).forEach(e=>drawEnemy(ctx,e));

    // HUD
    ctx.fillStyle="rgba(0,0,0,0.65)"; ctx.fillRect(0,0,W,30);
    ctx.fillStyle="#e2e8f0"; ctx.font="bold 11px sans-serif"; ctx.textAlign="left"; ctx.textBaseline="middle";
    ctx.fillText(`💰 ${s.gold}  ❤️ ${s.lives}  ⭐ ${s.score}`,8,15);
    ctx.textAlign="center";
    ctx.fillText(`Level ${s.level+1}: ${LEVEL_NAMES[s.level]}  |  Wave ${s.wave+1}/${LEVEL_WAVES[s.level]?.length}`,W/2,15);
    ctx.textAlign="right";
    const td=TOWER_DEFS[s.selTower]; ctx.fillText(`[${td.key}] ${td.name} $${td.cost}`,W-8,15);
  },[]);

  const spawnNextWave = useCallback(()=>{
    const s=g.current;
    const waveDef=LEVEL_WAVES[s.level][s.wave];
    const queue:{type:EnemyType}[]=[];
    waveDef.forEach(({type,count,interval})=>{
      for(let i=0;i<count;i++) queue.push({type});
      if(queue.length>0) queue[queue.length-1] = {...queue[queue.length-1]}; // copy
    });
    // Flatten with intervals
    const flat:{type:EnemyType}[]=[];
    waveDef.forEach(({type,count})=>{ for(let i=0;i<count;i++) flat.push({type}); });
    s.spawnQueue=flat; s.spawnTimer=0; s.wavePhase="spawning";
  },[]);

  const loop = useCallback(()=>{
    const s=g.current;
    if(s.state!=="playing"){draw();return;}
    s.frame++;

    // Between-waves spawn management
    if(s.wavePhase==="idle"){
      spawnNextWave();
    }

    // Spawn enemies
    if(s.wavePhase==="spawning"){
      if(s.spawnQueue.length>0&&s.spawnTimer<=0){
        const {type}=s.spawnQueue.shift()!;
        s.enemies.push(makeEnemy(type,s.path));
        s.spawnTimer=ENEMY_DEFS[type].size>14?100:ENEMY_DEFS[type].speed>2?55:70;
      }
      if(s.spawnTimer>0)s.spawnTimer--;
      if(s.spawnQueue.length===0)s.wavePhase="waitclear";
    }

    // Move enemies
    s.enemies.forEach(e=>{
      if(e.pathIdx>=s.path.length-1)return;
      const spd=e.slowTimer>0?e.baseSpeed*0.42:e.baseSpeed;
      if(e.slowTimer>0)e.slowTimer--;
      const [nc,nr]=s.path[e.pathIdx+1];
      const tx=nc*CELL+CELL/2, ty=nr*CELL+CELL/2;
      const dx=tx-e.x, dy=ty-e.y, dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<spd){e.pathIdx++;e.x=tx;e.y=ty;}
      else{e.x+=dx/dist*spd;e.y+=dy/dist*spd;}
    });

    // Remove leaked enemies
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
      const tx=t.col*CELL+CELL/2, ty=t.row*CELL+CELL/2;
      const target=s.enemies.find(e=>{const dx=e.x-tx,dy=e.y-ty;return dx*dx+dy*dy<=td.range*td.range;});
      if(!target)return;
      s.projectiles.push({
        x:tx,y:ty,tx:target.x,ty:target.y,speed:7,dmg:td.dmg,eid:target.id,type:t.type,
        splash:td.splash,slowDur:td.slowDur,chainCount:td.chainCount,chainHits:[],
      });
      t.timer=td.cd;
    });

    // Move projectiles
    s.projectiles=s.projectiles.filter(p=>{
      const dx=p.tx-p.x, dy=p.ty-p.y, dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<p.speed+1){
        // Hit!
        if(p.splash){
          s.enemies.forEach(e=>{
            const ex=e.x-p.tx, ey=e.y-p.ty;
            if(ex*ex+ey*ey<=p.splash!*p.splash!){ e.hp-=p.dmg; }
          });
          s.splashes.push({x:p.tx,y:p.ty,r:4,maxR:p.splash,alpha:0.8,color:TOWER_DEFS.cannon.accent});
        } else {
          const e=s.enemies.find(e=>e.id===p.eid);
          if(e){
            e.hp-=p.dmg;
            if(p.slowDur&&p.slowDur>0)e.slowTimer=p.slowDur;
            // Lightning chain
            if(p.chainCount&&p.chainCount>0){
              const nearby=s.enemies.filter(en=>en.id!==e.id&&!(p.chainHits||[]).includes(en.id));
              for(let i=0;i<Math.min(p.chainCount,nearby.length);i++){
                nearby[i].hp-=p.dmg*0.6;
                s.projectiles.push({x:e.x,y:e.y,tx:nearby[i].x,ty:nearby[i].y,speed:10,dmg:0,eid:nearby[i].id,type:"lightning",chainHits:[e.id,...(p.chainHits||[])]});
              }
            }
          }
        }
        // Remove dead enemies
        const dead=s.enemies.filter(e=>e.hp<=0);
        dead.forEach(e=>{
          s.gold+=ENEMY_DEFS[e.type].reward;
          s.score+=ENEMY_DEFS[e.type].reward*5;
        });
        if(dead.length){setGold(s.gold);setScore(s.score);}
        s.enemies=s.enemies.filter(e=>e.hp>0);
        return false;
      }
      p.x+=dx/dist*p.speed; p.y+=dy/dist*p.speed;
      return true;
    });

    // Animate splashes
    s.splashes=s.splashes.filter(sp=>{
      sp.r+=3; sp.alpha-=0.07;
      return sp.alpha>0&&sp.r<sp.maxR*1.5;
    });

    // Check wave/level clear
    if(s.wavePhase==="waitclear"&&s.enemies.length===0){
      const totalWaves=LEVEL_WAVES[s.level].length;
      if(s.wave<totalWaves-1){
        s.wave++;
        s.gold+=40; setGold(s.gold);
        setWaveNum(s.wave+1);
        s.wavePhase="idle";
      } else {
        // Level complete
        if(s.level>=4){
          s.state="win"; setState("win");
        } else {
          s.state="between"; setState("between");
          const bonus=LEVEL_GOLD[s.level];
          s.gold+=bonus; setGold(s.gold);
          s.lives=Math.min(20,s.lives+5); setLives(s.lives);
          setBetweenMsg(`Level ${s.level+1} Complete! +${bonus} gold, +5 lives`);
          s.betweenTimer=240;
        }
      }
    }

    // Between-level timer
    if(s.state==="between"){
      s.betweenTimer--;
      if(s.betweenTimer<=0) advanceLevel();
    }

    draw(); raf.current=requestAnimationFrame(loop);
  },[draw, spawnNextWave]);

  const advanceLevel = useCallback(()=>{
    const s=g.current;
    s.level++; s.wave=0; s.wavePhase="idle";
    s.path=LEVEL_PATHS[s.level];
    s.pathSet=new Set(LEVEL_PATHS[s.level].map(([c,r])=>`${c},${r}`));
    s.enemies=[]; s.projectiles=[]; s.splashes=[]; s.towers=[];
    s.gold=LEVEL_START_GOLD[s.level]; setGold(s.gold);
    s.state="playing"; setState("playing");
    setLevelNum(s.level+1); setWaveNum(1);
  },[]);

  const placeTower = useCallback((col:number,row:number)=>{
    const s=g.current;
    if(s.pathSet.has(`${col},${row}`))return;
    if(s.towers.some(t=>t.col===col&&t.row===row))return;
    const td=TOWER_DEFS[s.selTower];
    if(s.gold<td.cost)return;
    s.towers.push({col,row,type:s.selTower,timer:0});
    s.gold-=td.cost; setGold(s.gold);
  },[]);

  useEffect(()=>{
    const c=cv.current;
    const onMove=(e:MouseEvent)=>{
      const rect=c?.getBoundingClientRect(); if(!rect)return;
      const scX=W/rect.width,scY=H/rect.height;
      g.current.hovCol=Math.floor((e.clientX-rect.left)*scX/CELL);
      g.current.hovRow=Math.floor((e.clientY-rect.top)*scY/CELL);
    };
    const onClick=(e:MouseEvent)=>{
      const rect=c?.getBoundingClientRect(); if(!rect)return;
      const scX=W/rect.width,scY=H/rect.height;
      const col=Math.floor((e.clientX-rect.left)*scX/CELL);
      const row=Math.floor((e.clientY-rect.top)*scY/CELL);
      placeTower(col,row);
    };
    const onKey=(e:KeyboardEvent)=>{
      const map:Record<string,TowerType>={1:"arrow",2:"cannon",3:"ice",4:"lightning"};
      if(map[e.key]){setSelTower(map[e.key]);e.preventDefault();}
    };
    c?.addEventListener("mousemove",onMove);
    c?.addEventListener("click",onClick);
    window.addEventListener("keydown",onKey);
    raf.current=requestAnimationFrame(loop);
    return()=>{c?.removeEventListener("mousemove",onMove);c?.removeEventListener("click",onClick);window.removeEventListener("keydown",onKey);cancelAnimationFrame(raf.current);};
  },[loop,placeTower,setSelTower]);

  const reset=useCallback(()=>{
    const s=g.current;
    s.level=0;s.wave=0;s.wavePhase="idle";
    s.path=LEVEL_PATHS[0];s.pathSet=new Set(LEVEL_PATHS[0].map(([c,r])=>`${c},${r}`));
    s.enemies=[];s.towers=[];s.projectiles=[];s.splashes=[];
    s.gold=100;s.lives=20;s.score=0;s.frame=0;
    s.spawnQueue=[];s.spawnTimer=0;s.state="playing";
    setGold(100);setLives(20);setScore(0);setLevelNum(1);setWaveNum(1);setState("playing");
    cancelAnimationFrame(raf.current);
    raf.current=requestAnimationFrame(loop);
  },[loop]);

  return (
    <Shell title="Tower Defense">
      {/* Tower selector */}
      <div className="flex gap-2 flex-wrap justify-center">
        {(Object.entries(TOWER_DEFS) as [TowerType,typeof TOWER_DEFS.arrow][]).map(([type,td])=>(
          <button key={type} onClick={()=>setSelTower(type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${selTower===type?"border-white scale-105":"border-border opacity-70 hover:opacity-100"}`}
            style={{background:td.color+"33",color:td.accent,borderColor:selTower===type?td.accent:undefined}}>
            [{td.key}] {td.name} <span className="text-yellow-400">${td.cost}</span>
            <span className="text-muted-foreground ml-1">R:{td.range} D:{td.dmg}</span>
          </button>
        ))}
      </div>
      <div className="relative">
        <canvas ref={cv} width={W} height={H} className="rounded-xl border border-slate-700 cursor-pointer" style={{maxWidth:"95vw"}} />
        {/* Between level overlay */}
        {state==="between"&&(
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 rounded-xl gap-3">
            <p className="text-3xl font-black text-yellow-400">🏆 {betweenMsg}</p>
            <p className="text-white/70 text-sm">Next: Level {levelNum+1} — {LEVEL_NAMES[levelNum]}</p>
            <button onClick={advanceLevel} className="px-8 py-3 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-xl">Start Level {levelNum+1} →</button>
          </div>
        )}
        {/* Win/Lose overlay */}
        {(state==="win"||state==="lose")&&(
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-xl gap-4">
            <p className="text-3xl font-black" style={{color:state==="win"?"#fbbf24":"#ef4444"}}>
              {state==="win"?"🏆 Victory! All 5 Levels Cleared!":"💀 The Realm Has Fallen!"}
            </p>
            <p className="font-mono text-muted-foreground">Score: {score} · Level {levelNum}</p>
            <button onClick={reset} className="px-8 py-3 bg-primary text-black font-black rounded-xl">Play Again</button>
          </div>
        )}
      </div>
      <div className="flex gap-6 text-xs font-mono">
        <span className="text-yellow-400">💰 {gold}</span>
        <span className="text-red-400">❤️ {lives}</span>
        <span className="text-orange-400">📍 Level {levelNum}/5: {LEVEL_NAMES[levelNum-1]}</span>
        <span className="text-blue-400">🌊 Wave {waveNum}/{LEVEL_WAVES[levelNum-1]?.length}</span>
        <span className="text-green-400">⭐ {score}</span>
      </div>
      {/* Enemy legend */}
      <div className="flex gap-3 flex-wrap justify-center">
        {(Object.entries(ENEMY_DEFS) as [EnemyType,typeof ENEMY_DEFS.goblin][]).map(([type,d])=>(
          <span key={type} className="text-xs px-2 py-0.5 rounded-full border border-border"
            style={{color:d.color,borderColor:d.color+"50"}}>
            {d.name} HP:{d.hp} 💰{d.reward}
          </span>
        ))}
      </div>
    </Shell>
  );
}
