import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

function Shell({ title, controls, children }: { title: string; controls?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-4 px-4 py-3 border-b border-lime-500/30 bg-gradient-to-r from-lime-950/60 to-transparent">
        <Link href="/" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-sm transition-all">
          <ArrowLeft className="h-4 w-4" />
          <span>Menu</span>
        </Link>
        <span className="text-2xl select-none" style={{ filter: "drop-shadow(0 0 8px #a3e63580)" }}>🐦</span>
        <h1 className="text-lg font-bold text-lime-400">{title}</h1>
        {controls && <span className="text-xs text-muted-foreground ml-auto hidden sm:block">{controls}</span>}
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">{children}</div>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────
const W = 480; const H = 600; const BIRD_R = 16; const PIPE_W = 58;
const JUMP = -5.875;
const B1X = 98; const B2X = 128;
const COIN_R = 8;

// ─── Themes ───────────────────────────────────────────────────────────────────
type Theme = "sky" | "city" | "underwater" | "cave" | "volcano" | "space";

const THEMES: Record<Theme, { name:string; icon:string; spd:number; gap:number; interval:number; groundH:number; gravity:number; desc:string; diff:string; birdColors:[string,string] }> = {
  sky:       { name:"Sunny Day",  icon:"☀️",  spd:2.5, gap:158, interval:95, groundH:58, gravity:0.50, desc:"Classic pipes, open skies",    diff:"Easy",   birdColors:["#facc15","#67e8f9"] },
  city:      { name:"Night City", icon:"🌃",  spd:3.0, gap:148, interval:90, groundH:52, gravity:0.40, desc:"Skyscrapers after dark",        diff:"Medium", birdColors:["#22d3ee","#f472b6"] },
  underwater:{ name:"Deep Sea",   icon:"🌊",  spd:2.8, gap:152, interval:92, groundH:55, gravity:0.45, desc:"Coral reefs, rising bubbles",   diff:"Medium", birdColors:["#06b6d4","#34d399"] },
  cave:      { name:"Dark Cave",  icon:"🕳️",  spd:3.0, gap:140, interval:88, groundH:50, gravity:0.35, desc:"Stalactite tunnels, cave gems",  diff:"Hard",   birdColors:["#f97316","#a78bfa"] },
  volcano:   { name:"Volcano",    icon:"🌋",  spd:3.2, gap:138, interval:87, groundH:55, gravity:0.48, desc:"Lava columns and ember storms",  diff:"Hard",   birdColors:["#f97316","#fbbf24"] },
  space:     { name:"Deep Space", icon:"🚀",  spd:3.3, gap:152, interval:92, groundH:0,  gravity:0.25, desc:"Asteroid fields, zero-G drift",  diff:"Expert", birdColors:["#c4b5fd","#6ee7b7"] },
};

const DIFF_COLORS: Record<string,string> = { Easy:"text-green-400", Medium:"text-amber-400", Hard:"text-red-400", Expert:"text-purple-400" };

// ─── Hash noise for deterministic decoration ──────────────────────────────────
function ha(n: number): number { const s=Math.sin(n*93.22+17.5)*43758.545; return s-Math.floor(s); }

// ─── Types ────────────────────────────────────────────────────────────────────
type Bird = { y:number; vy:number; alive:boolean; score:number; rot:number };
type Pipe = {
  x:number; top:number; baseTop:number;
  scored1:boolean; scored2:boolean; seed:number;
  moving:boolean; phase:number; amplitude:number; oscSpeed:number;
  coin:boolean; coinCollected1:boolean; coinCollected2:boolean;
};
type GameState = {
  theme:Theme; mode:"1p"|"2p";
  b1:Bird; b2:Bird;
  pipes:Pipe[]; pipeCount:number;
  frame:number; bgOffset:number;
  state:"idle"|"playing"|"dead";
  spd:number; gap:number; interval:number; groundH:number; gravity:number;
  level:number; levelMsgTimer:number;
};

function makeBird(yOff=0): Bird { return {y:H/2+yOff, vy:0, alive:true, score:0, rot:0}; }

function initState(theme:Theme, mode:"1p"|"2p"): GameState {
  const c=THEMES[theme];
  return { theme, mode, b1:makeBird(0), b2:makeBird(30), pipes:[], pipeCount:0, frame:0, bgOffset:0,
    state:"idle", spd:c.spd, gap:c.gap, interval:c.interval, groundH:c.groundH, gravity:c.gravity,
    level:0, levelMsgTimer:0 };
}

// ─── Bird drawing ─────────────────────────────────────────────────────────────
function drawBird(ctx: CanvasRenderingContext2D, x:number, bird:Bird, theme:Theme, player:1|2) {
  if (!bird.alive && theme !== "sky") return;
  ctx.save(); ctx.translate(x, bird.y); ctx.rotate(bird.rot);
  ctx.globalAlpha = bird.alive ? 1 : 0.28;
  const col = THEMES[theme].birdColors[player-1];

  if (theme === "space") {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(0,0,BIRD_R,BIRD_R-3,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = "#1d4ed8";
    ctx.beginPath(); ctx.arc(3,-3,7.5,-Math.PI*0.65,Math.PI*0.35); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(3,-3,7.5,-Math.PI*0.65,Math.PI*0.35); ctx.stroke();
    ctx.fillStyle = "rgba(147,197,253,0.35)";
    ctx.beginPath(); ctx.arc(4,-4,4,-Math.PI*0.6,Math.PI*0.1); ctx.closePath(); ctx.fill();
  } else if (theme === "underwater") {
    // Submarine fish
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(0,0,BIRD_R,BIRD_R-4,0,0,Math.PI*2); ctx.fill();
    // Tail fin
    ctx.beginPath(); ctx.moveTo(-BIRD_R+2,0); ctx.lineTo(-BIRD_R-10,-8); ctx.lineTo(-BIRD_R-10,8); ctx.closePath(); ctx.fill();
    // Dorsal fin
    ctx.beginPath(); ctx.moveTo(-4,-BIRD_R+5); ctx.lineTo(6,-BIRD_R+5); ctx.lineTo(1,-BIRD_R-7); ctx.closePath(); ctx.fill();
    // Pectoral fin
    ctx.fillStyle = THEMES[theme].birdColors[player===1?1:0];
    ctx.beginPath(); ctx.ellipse(2,BIRD_R-5,7,4,0.5,0,Math.PI*2); ctx.fill();
    // Eye
    ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(6,-3,5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#1e293b"; ctx.beginPath(); ctx.arc(7,-3,2.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(8,-4,1.2,0,Math.PI*2); ctx.fill();
    // Bubble trail
    ctx.globalAlpha=0.45;
    [[-18,2],[-24,-3],[-29,5]].forEach(([bx,by])=>{
      ctx.fillStyle="#bae6fd"; ctx.beginPath(); ctx.arc(bx,by,2.5,0,Math.PI*2); ctx.fill();
    });
  } else if (theme === "volcano") {
    // Flame trail behind the bird
    const fg=ctx.createRadialGradient(-BIRD_R-4,0,0,-BIRD_R-4,0,20);
    fg.addColorStop(0,"rgba(251,191,36,0.9)"); fg.addColorStop(0.5,"rgba(249,115,22,0.6)"); fg.addColorStop(1,"rgba(239,68,68,0)");
    ctx.fillStyle=fg; ctx.beginPath(); ctx.ellipse(-BIRD_R-4,0,20,10,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=col;
    ctx.beginPath(); ctx.ellipse(0,0,BIRD_R,BIRD_R-3,0,0,Math.PI*2); ctx.fill();
    // Wing-like fiery protrusion
    ctx.fillStyle="#fbbf24";
    ctx.beginPath(); ctx.ellipse(BIRD_R-4,3,8,4,0.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(4,-5,6,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#1e293b"; ctx.beginPath(); ctx.arc(6,-5,3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(7,-6,1.3,0,Math.PI*2); ctx.fill();
  } else {
    ctx.fillStyle=col;
    ctx.beginPath(); ctx.ellipse(0,0,BIRD_R,BIRD_R-3,0,0,Math.PI*2); ctx.fill();
    if (theme==="cave") {
      ctx.fillStyle="rgba(251,146,60,0.4)";
      ctx.beginPath(); ctx.arc(0,0,BIRD_R+3,0,Math.PI*2); ctx.fill();
    }
    ctx.fillStyle=theme==="cave"?"#78350f":"#fb923c";
    ctx.beginPath(); ctx.ellipse(BIRD_R-4,2,7,4,0.4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(4,-5,6,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#1e293b"; ctx.beginPath(); ctx.arc(6,-5,3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(7,-6,1.3,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha=1; ctx.restore();
}

// ─── Background ───────────────────────────────────────────────────────────────
function drawBackground(ctx:CanvasRenderingContext2D, theme:Theme, bgOff:number, groundH:number) {
  if (theme==="sky") {
    const sk=ctx.createLinearGradient(0,0,0,H);
    sk.addColorStop(0,"#0ea5e9"); sk.addColorStop(0.6,"#38bdf8"); sk.addColorStop(1,"#bae6fd");
    ctx.fillStyle=sk; ctx.fillRect(0,0,W,H);
    for (let i=0;i<7;i++) {
      const cx=((ha(i)*1500-bgOff*0.32)%1500+1500)%1500; if(cx>W+100)continue;
      const cy=25+ha(i*7+1)*140; const r=20+ha(i*13+2)*20;
      ctx.fillStyle="rgba(255,255,255,0.88)";
      ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx-r*0.62,cy+r*0.28,r*0.68,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx+r*0.62,cy+r*0.28,r*0.72,0,Math.PI*2); ctx.fill();
    }
    ctx.fillStyle="#92400e"; ctx.fillRect(0,H-groundH,W,groundH);
    ctx.fillStyle="#4d7c0f"; ctx.fillRect(0,H-groundH-2,W,14);
    for (let i=0;i<9;i++) { const gx=((i*54-bgOff*0.95)%486+486)%486; ctx.fillStyle="#65a30d"; ctx.fillRect(gx,H-groundH-3,7,5); }

  } else if (theme==="city") {
    const sk=ctx.createLinearGradient(0,0,0,H);
    sk.addColorStop(0,"#0f172a"); sk.addColorStop(1,"#1e1b4b");
    ctx.fillStyle=sk; ctx.fillRect(0,0,W,H);
    for (let i=0;i<45;i++) { const sx=((ha(i)*1200-bgOff*0.13)%1200+1200)%1200; if(sx>W)continue; ctx.fillStyle=`rgba(255,255,255,${0.2+ha(i*13)*0.65})`; ctx.beginPath(); ctx.arc(sx,ha(i*7)*(H-groundH-40),ha(i*17)*1.6+0.4,0,Math.PI*2); ctx.fill(); }
    for (let i=0;i<10;i++) { const bx=((ha(i*3)*1400-bgOff*0.2)%1400+1400)%1400-40; if(bx>W+80)continue; const bh=50+ha(i*7)*130; const bw=35+ha(i*11)*45; ctx.fillStyle="#1e293b"; ctx.fillRect(bx,H-groundH-bh,bw,bh); for(let r=0;r<8;r++)for(let c=0;c<3;c++){if(ha(i*100+r*10+c)>0.45){ctx.fillStyle="rgba(251,191,36,0.4)"; ctx.fillRect(bx+5+c*11,H-groundH-bh+6+r*14,7,5);}} }
    for (let i=0;i<7;i++) { const bx=((ha(i*5+50)*1000-bgOff*0.5)%1000+1000)%1000-60; if(bx>W+100)continue; const bh=100+ha(i*9+50)*150; const bw=50+ha(i*15+50)*50; ctx.fillStyle="#0f172a"; ctx.fillRect(bx,H-groundH-bh,bw,bh); for(let r=0;r<12;r++)for(let c=0;c<3;c++){if(ha(i*300+r*10+c)>0.37){ctx.fillStyle=`rgba(250,204,21,${0.5+ha(i*400+r*10+c)*0.5})`; ctx.fillRect(bx+7+c*14,H-groundH-bh+8+r*13,9,7);}} }
    ctx.fillStyle="#1e293b"; ctx.fillRect(0,H-groundH,W,groundH);
    ctx.fillStyle="#334155"; ctx.fillRect(0,H-groundH-2,W,3);
    for(let i=0;i<7;i++){const lx=((i*70-bgOff*0.85)%490+490)%490; ctx.fillStyle="#d97706"; ctx.fillRect(lx,H-groundH/2-2,38,4);}

  } else if (theme==="underwater") {
    const sk=ctx.createLinearGradient(0,0,0,H);
    sk.addColorStop(0,"#0c4a6e"); sk.addColorStop(0.55,"#075985"); sk.addColorStop(1,"#0e7490");
    ctx.fillStyle=sk; ctx.fillRect(0,0,W,H);
    // God rays
    for (let i=0;i<7;i++) {
      const rx=((ha(i*3)*700-bgOff*0.06)%700+700)%700; if(rx>W+70)continue;
      ctx.save(); ctx.globalAlpha=0.055;
      const rg=ctx.createLinearGradient(rx,0,rx+35,H-groundH);
      rg.addColorStop(0,"#bae6fd"); rg.addColorStop(1,"rgba(186,230,253,0)");
      ctx.fillStyle=rg;
      ctx.beginPath(); ctx.moveTo(rx-12,0); ctx.lineTo(rx+32,0); ctx.lineTo(rx+85,H); ctx.lineTo(rx-45,H); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // Rising bubbles
    for (let i=0;i<24;i++) {
      const bx=((ha(i*7)*510)%510+510)%510;
      const rawY=(bgOff*(0.42+ha(i*11)*0.48)+ha(i*3)*H)%H;
      const by=H-groundH-10-rawY; if(by<0)continue;
      const br=1.5+ha(i*13)*4;
      ctx.save(); ctx.globalAlpha=0.22+ha(i*17)*0.32;
      ctx.strokeStyle="#7dd3fc"; ctx.lineWidth=1.2;
      ctx.beginPath(); ctx.arc(bx,by,br,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle="rgba(255,255,255,0.5)";
      ctx.beginPath(); ctx.arc(bx-br*0.3,by-br*0.3,br*0.28,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
    // Background fish
    for (let i=0;i<6;i++) {
      const fx=((ha(i*5)*1100-bgOff*(0.45+ha(i*9)*0.7))%1100+1100)%1100; if(fx>W+35)continue;
      const fy=55+ha(i*11)*(H-groundH-110);
      ctx.save(); ctx.globalAlpha=0.17+ha(i*7)*0.14;
      ctx.fillStyle=`hsl(${185+ha(i*13)*45},70%,60%)`;
      ctx.beginPath(); ctx.ellipse(fx,fy,13,6,0,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(fx+13,fy); ctx.lineTo(fx+22,fy-7); ctx.lineTo(fx+22,fy+7); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // Sandy floor + seaweed
    ctx.fillStyle="#92400e"; ctx.fillRect(0,H-groundH,W,groundH);
    ctx.fillStyle="#b45309"; ctx.fillRect(0,H-groundH,W,8);
    for (let i=0;i<12;i++) {
      const wx=((ha(i*17)*540-bgOff*0.9)%540+540)%540; if(wx>W+10)continue;
      const wh=22+ha(i*23)*30;
      ctx.strokeStyle=`hsl(${135+ha(i*29)*30},70%,35%)`; ctx.lineWidth=3.5; ctx.lineCap="round";
      ctx.beginPath();
      for(let j=0;j<=6;j++){const py=H-groundH-j*(wh/6); const px=wx+Math.sin(bgOff*0.024+j*1.1+i*2.4)*9; j===0?ctx.moveTo(px,py):ctx.lineTo(px,py);}
      ctx.stroke();
    }

  } else if (theme==="cave") {
    const sk=ctx.createLinearGradient(0,0,0,H);
    sk.addColorStop(0,"#0c0a09"); sk.addColorStop(1,"#1c1917");
    ctx.fillStyle=sk; ctx.fillRect(0,0,W,H);
    for(let i=0;i<10;i++){const gx=((ha(i*3)*1300-bgOff*0.38)%1300+1300)%1300; if(gx>W+20)continue; const gy=H-groundH-12-ha(i*11)*100; const gr=ctx.createRadialGradient(gx,gy,0,gx,gy,15); gr.addColorStop(0,`hsla(${150+ha(i*7)*80},85%,55%,0.8)`); gr.addColorStop(1,"transparent"); ctx.fillStyle=gr; ctx.beginPath(); ctx.arc(gx,gy,15,0,Math.PI*2); ctx.fill();}
    for(let i=0;i<7;i++){const gx2=((ha(i*5+50)*1300-bgOff*0.28)%1300+1300)%1300; if(gx2>W+20)continue; const gy2=ha(i*9+50)*70; const gr2=ctx.createRadialGradient(gx2,gy2,0,gx2,gy2,12); gr2.addColorStop(0,`hsla(${200+ha(i*13)*60},80%,58%,0.65)`); gr2.addColorStop(1,"transparent"); ctx.fillStyle=gr2; ctx.beginPath(); ctx.arc(gx2,gy2,12,0,Math.PI*2); ctx.fill();}
    ctx.fillStyle="#292524"; ctx.fillRect(0,H-groundH,W,groundH);
    ctx.fillStyle="#44403c"; ctx.fillRect(0,H-groundH-2,W,5);
    for(let i=0;i<9;i++){const rx=((ha(i*17)*520-bgOff*0.9)%520+520)%520; ctx.fillStyle="#3c3532"; ctx.beginPath(); ctx.arc(rx,H-groundH,7+ha(i*23)*13,Math.PI,Math.PI*2); ctx.fill();}

  } else if (theme==="volcano") {
    const sk=ctx.createLinearGradient(0,0,0,H);
    sk.addColorStop(0,"#1c0a00"); sk.addColorStop(0.45,"#7c2d12"); sk.addColorStop(1,"#9a3412");
    ctx.fillStyle=sk; ctx.fillRect(0,0,W,H);
    // Smoke wisps
    for(let i=0;i<8;i++){const sx=((ha(i*3)*600-bgOff*0.08)%600+600)%600; if(sx>W+50)continue; const sr=28+ha(i*7)*35; ctx.save(); ctx.globalAlpha=0.06+ha(i*11)*0.06; ctx.fillStyle="#78716c"; ctx.beginPath(); ctx.arc(sx,ha(i*5)*85,sr,0,Math.PI*2); ctx.fill(); ctx.restore();}
    // Floating embers
    for(let i=0;i<32;i++){
      const ex=((ha(i*7)*550)%550+550)%550;
      const rawY=(bgOff*(0.55+ha(i*11)*0.75)+ha(i*3)*H)%H;
      const ey=H-groundH-15-rawY; if(ey<0)continue;
      const er=0.8+ha(i*13)*2.8;
      ctx.save(); ctx.globalAlpha=0.35+ha(i*17)*0.65;
      const ec=ha(i*23)>0.5?"#f97316":"#fbbf24";
      ctx.shadowColor=ec; ctx.shadowBlur=5;
      ctx.fillStyle=ec; ctx.beginPath(); ctx.arc(ex,ey,er,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
    // Lava glow at bottom
    const lg=ctx.createLinearGradient(0,H*0.58,0,H);
    lg.addColorStop(0,"rgba(249,115,22,0)"); lg.addColorStop(0.65,"rgba(239,68,68,0.22)"); lg.addColorStop(1,"rgba(239,68,68,0.52)");
    ctx.fillStyle=lg; ctx.fillRect(0,H*0.58,W,H*0.42);
    // Rocky ground
    ctx.fillStyle="#292524"; ctx.fillRect(0,H-groundH,W,groundH);
    ctx.fillStyle="#1c1917"; ctx.fillRect(0,H-groundH,W,5);
    // Lava cracks in ground
    for(let i=0;i<7;i++){const lx=((ha(i*19)*545-bgOff*0.92)%545+545)%545; if(lx>W+25)continue; const pulse=0.6+0.4*Math.sin(bgOff*0.04+i*1.3); ctx.save(); ctx.globalAlpha=pulse; const lgr=ctx.createRadialGradient(lx,H-groundH+4,0,lx,H-groundH+4,20); lgr.addColorStop(0,"#f97316"); lgr.addColorStop(0.5,"#dc2626"); lgr.addColorStop(1,"transparent"); ctx.fillStyle=lgr; ctx.beginPath(); ctx.ellipse(lx,H-groundH+4,20,9,0,0,Math.PI*2); ctx.fill(); ctx.restore();}

  } else {
    ctx.fillStyle="#020617"; ctx.fillRect(0,0,W,H);
    for(let i=0;i<3;i++){const nx=((ha(i)*1500-bgOff*0.07)%1500+1500)%1500; if(nx>W+150)continue; const ny=60+ha(i*5)*(H-120); const nr=70+ha(i*7)*90; const gr=ctx.createRadialGradient(nx,ny,0,nx,ny,nr); gr.addColorStop(0,`hsla(${250+ha(i*11)*100},72%,45%,0.15)`); gr.addColorStop(1,"transparent"); ctx.fillStyle=gr; ctx.beginPath(); ctx.arc(nx,ny,nr,0,Math.PI*2); ctx.fill();}
    for(let i=0;i<80;i++){const sx=((ha(i)*2400-bgOff*0.11)%2400+2400)%2400; if(sx>W)continue; ctx.fillStyle=`rgba(255,255,255,${0.25+ha(i*17)*0.75})`; ctx.beginPath(); ctx.arc(sx,ha(i*7)*H,0.4+ha(i*13)*1.8,0,Math.PI*2); ctx.fill();}
    const px=((ha(99)*900-bgOff*0.05)%900+900)%900;
    if(px<W+90){const gr2=ctx.createRadialGradient(px-14,72,5,px,85,55); gr2.addColorStop(0,"rgba(167,139,250,0.3)"); gr2.addColorStop(1,"rgba(88,28,135,0.07)"); ctx.fillStyle=gr2; ctx.beginPath(); ctx.arc(px,85,55,0,Math.PI*2); ctx.fill(); ctx.strokeStyle="rgba(139,92,246,0.18)"; ctx.lineWidth=6; ctx.beginPath(); ctx.ellipse(px,85,85,20,-0.22,0,Math.PI*2); ctx.stroke();}
  }
}

// ─── Obstacle drawing ─────────────────────────────────────────────────────────
function drawObstacle(ctx:CanvasRenderingContext2D, theme:Theme, pipe:Pipe, gap:number, groundH:number) {
  const { x, top, seed } = pipe;

  if (theme==="sky") {
    ctx.fillStyle="#14532d"; ctx.fillRect(x,0,PIPE_W,top); ctx.fillRect(x,top+gap,PIPE_W,H);
    ctx.fillStyle="#16a34a"; ctx.fillRect(x+3,0,PIPE_W-6,top); ctx.fillRect(x+3,top+gap,PIPE_W-6,H);
    ctx.fillStyle="#166534"; ctx.fillRect(x-5,top-22,PIPE_W+10,22); ctx.fillRect(x-5,top+gap,PIPE_W+10,22);
    ctx.fillStyle="#22c55e"; ctx.fillRect(x+4,0,5,top-22); ctx.fillRect(x+4,top+gap+22,5,H);

  } else if (theme==="city") {
    ctx.fillStyle="#334155"; ctx.fillRect(x-3,0,PIPE_W+6,top); ctx.fillRect(x-3,top+gap,PIPE_W+6,H);
    ctx.fillStyle="#1e293b"; ctx.fillRect(x-3,0,8,top); ctx.fillRect(x-3,top+gap,8,H);
    for(let r=0;r<22;r++)for(let c=0;c<3;c++){const wy=6+r*18; if(wy>top-14)break; ctx.fillStyle=ha(seed*1000+r*10+c)>0.42?"rgba(251,191,36,0.85)":"rgba(15,23,42,0.6)"; ctx.fillRect(x+5+c*16,wy,11,8);}
    ctx.fillStyle="#64748b"; ctx.fillRect(x+PIPE_W/2-2,top-20,4,20); ctx.fillRect(x+PIPE_W/2-7,top-21,14,5);
    ctx.fillStyle=`rgba(239,68,68,${Math.abs(Math.sin(Date.now()/600+seed))})`; ctx.beginPath(); ctx.arc(x+PIPE_W/2,top-25,3.5,0,Math.PI*2); ctx.fill();
    for(let r=0;r<22;r++)for(let c=0;c<3;c++){const wy=top+gap+22+r*18; if(wy>H-groundH-8)break; ctx.fillStyle=ha(seed*2000+r*10+c)>0.42?"rgba(251,191,36,0.85)":"rgba(15,23,42,0.6)"; ctx.fillRect(x+5+c*16,wy,11,8);}
    ctx.fillStyle=`rgba(59,130,246,${0.5+Math.abs(Math.sin(Date.now()/800+seed+1))*0.5})`; ctx.beginPath(); ctx.arc(x+PIPE_W/2,top+gap+10,3.5,0,Math.PI*2); ctx.fill();

  } else if (theme==="underwater") {
    // Coral columns
    const drawCoral = (y0:number, blockH:number, isTop:boolean) => {
      if (blockH<=0) return;
      const cg=ctx.createLinearGradient(x,0,x+PIPE_W,0);
      cg.addColorStop(0,"#be185d"); cg.addColorStop(0.5,"#e11d48"); cg.addColorStop(1,"#9f1239");
      ctx.fillStyle=cg; ctx.fillRect(x-3,y0,PIPE_W+6,blockH);
      ctx.fillStyle="#9f1239";
      for(let i=0;i<5;i++){const bx=x+5+ha(seed*100+i)*(PIPE_W-10); const by=y0+12+ha(seed*200+i)*Math.max(blockH-25,4); const br=4+ha(seed*300+i)*7; ctx.beginPath(); ctx.arc(bx,by,br,0,Math.PI*2); ctx.fill();}
      // Rim
      const rimY=isTop?y0+blockH:y0;
      ctx.fillStyle="#f43f5e"; ctx.fillRect(x-8,rimY-(isTop?20:0),PIPE_W+16,20);
      ctx.fillStyle="#fb7185"; ctx.fillRect(x-8,rimY-(isTop?20:17),PIPE_W+16,3);
      // Tentacles
      for(let i=0;i<7;i++){
        const tx=x-3+i*(PIPE_W+6)/6.5;
        const baseY=isTop?rimY-20:rimY+20;
        const tipY=baseY+(isTop?-1:1)*(10+ha(seed*400+i)*14);
        ctx.strokeStyle="#fda4af"; ctx.lineWidth=3; ctx.lineCap="round";
        ctx.beginPath(); ctx.moveTo(tx,isTop?rimY-20:rimY); ctx.quadraticCurveTo(tx+ha(seed*500+i)*14-7,baseY,tx,tipY); ctx.stroke();
      }
    };
    drawCoral(0,top,true);
    drawCoral(top+gap,H-(top+gap),false);

  } else if (theme==="cave") {
    ctx.fillStyle="#57534e"; ctx.fillRect(x-5,0,PIPE_W+10,top-22);
    ctx.fillStyle="#44403c"; ctx.fillRect(x-5,0,9,top-22);
    ctx.fillStyle="#78716c"; ctx.fillRect(x,0,6,top-22);
    ctx.fillStyle="#57534e"; ctx.beginPath(); ctx.moveTo(x-5,top-22); ctx.lineTo(x+PIPE_W/2+4,top+10); ctx.lineTo(x+PIPE_W+5,top-22); ctx.closePath(); ctx.fill();
    ctx.fillStyle="rgba(96,165,250,0.6)"; ctx.beginPath(); ctx.ellipse(x+PIPE_W/2+4,top+13,3,4,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#57534e"; ctx.fillRect(x-5,top+gap+22,PIPE_W+10,H);
    ctx.fillStyle="#44403c"; ctx.fillRect(x-5,top+gap+22,9,H);
    ctx.fillStyle="#78716c"; ctx.fillRect(x,top+gap+22,6,H);
    ctx.fillStyle="#57534e"; ctx.beginPath(); ctx.moveTo(x-5,top+gap+22); ctx.lineTo(x+PIPE_W/2+4,top+gap-10); ctx.lineTo(x+PIPE_W+5,top+gap+22); ctx.closePath(); ctx.fill();
    ctx.fillStyle="#44403c";
    for(let i=0;i<4;i++){const cx=x+5+ha(seed*100+i)*(PIPE_W-10); const cy=ha(seed*200+i)*(top-40); ctx.fillRect(cx,cy,4+ha(seed*300+i)*6,3);}

  } else if (theme==="volcano") {
    // Lava rock columns
    const drawLavaRock = (y0:number, blockH:number, isTop:boolean) => {
      if (blockH<=0) return;
      ctx.fillStyle="#1c1917"; ctx.fillRect(x-5,y0,PIPE_W+10,blockH);
      ctx.fillStyle="#292524"; ctx.fillRect(x,y0,PIPE_W,blockH);
      // Glowing cracks
      const glowA=0.65+0.35*Math.sin(Date.now()/420+seed);
      ctx.strokeStyle=`rgba(249,115,22,${glowA})`; ctx.lineWidth=2; ctx.lineCap="round";
      for(let i=0;i<4;i++){const cx1=x+8+ha(seed*100+i)*(PIPE_W-16); const cy1=y0+ha(seed*200+i)*blockH*0.35; const cy2=cy1+blockH*(0.2+ha(seed*300+i)*0.4); ctx.beginPath(); ctx.moveTo(cx1,cy1); ctx.lineTo(cx1+ha(seed*400+i)*18-9,(cy1+cy2)/2); ctx.lineTo(cx1+ha(seed*500+i)*18-9,cy2); ctx.stroke();}
      // Rim
      ctx.fillStyle="#44403c"; ctx.fillRect(x-8,isTop?top-22:top+gap,PIPE_W+16,22);
      ctx.fillStyle=`rgba(239,68,68,${0.7+0.3*Math.sin(Date.now()/380+seed)})`;
      ctx.fillRect(x-8,isTop?top-4:top+gap+18,PIPE_W+16,4);
      // Lava drips from top pipe opening
      if (isTop && top>20) {
        for(let i=0;i<4;i++){const dx=x+8+ha(seed*600+i)*(PIPE_W-16); const dLen=8+ha(seed*700+i)*16+Math.sin(Date.now()/320+seed+i)*5; ctx.fillStyle="#f97316"; ctx.fillRect(dx-2,top-4,4,dLen); const dr=4+ha(seed*800+i)*3; ctx.beginPath(); ctx.arc(dx,top-4+dLen+dr,dr,0,Math.PI*2); ctx.fill();}
      }
    };
    drawLavaRock(0,top,true);
    drawLavaRock(top+gap,H-(top+gap),false);

  } else {
    // space - asteroid masses
    const drawAsteroidMass = (y0:number, blockH:number, isTop:boolean) => {
      if (blockH<=0) return;
      ctx.fillStyle="#57534e"; ctx.fillRect(x-5,y0,PIPE_W+10,blockH);
      ctx.fillStyle="#44403c"; ctx.fillRect(x-5,y0,9,blockH);
      ctx.fillStyle="#78716c"; ctx.fillRect(x+PIPE_W-8,y0,5,blockH);
      ctx.fillStyle="#57534e"; ctx.beginPath();
      if(isTop){ctx.moveTo(x-5,y0+blockH);for(let i=0;i<=9;i++)ctx.lineTo(x-5+i*(PIPE_W+10)/9,y0+blockH-ha(seed*100+i)*24+5);ctx.lineTo(x+PIPE_W+5,y0);ctx.lineTo(x-5,y0);}
      else{ctx.moveTo(x-5,y0);for(let i=0;i<=9;i++)ctx.lineTo(x-5+i*(PIPE_W+10)/9,y0+ha(seed*200+i)*24-5);ctx.lineTo(x+PIPE_W+5,H);ctx.lineTo(x-5,H);}
      ctx.closePath(); ctx.fill();
      ctx.fillStyle="#44403c";
      for(let i=0;i<4;i++){const cx=x+4+ha(seed*300+i)*(PIPE_W-8); const cy=isTop?y0+8+ha(seed*400+i)*Math.max(blockH-40,5):y0+28+ha(seed*500+i)*Math.max(blockH-50,5); const cr=5+ha(seed*600+i)*9; ctx.beginPath(); ctx.arc(cx,cy,cr,0,Math.PI*2); ctx.fill(); ctx.fillStyle="#6b6560"; ctx.beginPath(); ctx.arc(cx-2,cy-2,cr*0.52,0,Math.PI*2); ctx.fill(); ctx.fillStyle="#44403c";}
    };
    if(top>0) drawAsteroidMass(0,top,true);
    drawAsteroidMass(top+gap,H-(top+gap),false);
  }

  // Moving pipe indicator (pulsing edge glow)
  if (pipe.moving) {
    ctx.save();
    const glow=0.4+0.6*Math.abs(Math.sin(pipe.phase*2));
    ctx.strokeStyle=`rgba(251,191,36,${glow})`; ctx.lineWidth=2.5;
    if(top>0){ctx.strokeRect(x-6,0,PIPE_W+12,top);}
    ctx.strokeRect(x-6,top+gap,PIPE_W+12,H-(top+gap));
    ctx.restore();
  }
}

// ─── Coin drawing ─────────────────────────────────────────────────────────────
function drawCoin(ctx:CanvasRenderingContext2D, x:number, y:number, frame:number) {
  ctx.save();
  const pulse=0.92+0.08*Math.sin(frame*0.18);
  ctx.shadowColor="#fbbf24"; ctx.shadowBlur=12;
  const grad=ctx.createRadialGradient(-COIN_R*0.32,-COIN_R*0.32,0,0,0,COIN_R);
  grad.addColorStop(0,"#fef9c3"); grad.addColorStop(0.55,"#f59e0b"); grad.addColorStop(1,"#b45309");
  ctx.fillStyle=grad;
  ctx.beginPath(); ctx.arc(x,y,COIN_R*pulse,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle="rgba(255,255,255,0.45)"; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.arc(x,y,COIN_R*pulse,0,Math.PI*2); ctx.stroke();
  ctx.fillStyle="rgba(255,255,255,0.8)";
  ctx.font=`bold ${Math.round(COIN_R*1.15)}px sans-serif`;
  ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillText("★",x,y+1);
  ctx.restore();
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function FlappyBird() {
  const cv = useRef<HTMLCanvasElement>(null);
  const g  = useRef<GameState>(initState("sky","1p"));
  const [screen, setScreen]       = useState<"menu"|"map"|"game">("menu");
  const [gameState, setGameState] = useState<"idle"|"playing"|"dead">("idle");
  const [p1Score, setP1Score]     = useState(0);
  const [p2Score, setP2Score]     = useState(0);
  const [p1Coins, setP1Coins]     = useState(0);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [best, setBest]           = useState(()=>+localStorage.getItem("fb-best")!||0);
  const [gameMode, setGameMode]   = useState<"1p"|"2p">("1p");
  const [theme, setTheme]         = useState<Theme>("sky");
  const pendingMode = useRef<"1p"|"2p">("1p");
  const raf = useRef(0);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);

  const draw = useCallback(() => {
    const c=cv.current; if(!c) return;
    const ctx=c.getContext("2d")!;
    const s=g.current;
    drawBackground(ctx, s.theme, s.bgOffset, s.groundH);

    // Obstacles + coins
    s.pipes.forEach(p=>{
      drawObstacle(ctx, s.theme, p, s.gap, s.groundH);
      if(p.coin){
        const show1=!p.coinCollected1;
        const show2=s.mode==="2p"&&!p.coinCollected2;
        if(show1||show2) drawCoin(ctx, p.x+PIPE_W/2, p.top+s.gap/2, s.frame);
      }
    });

    drawBird(ctx,B1X,s.b1,s.theme,1);
    if(s.mode==="2p") drawBird(ctx,B2X,s.b2,s.theme,2);

    // Score display
    const bc=THEMES[s.theme].birdColors;
    ctx.shadowColor="rgba(0,0,0,0.65)"; ctx.shadowBlur=6;
    if(s.mode==="1p"){
      ctx.fillStyle="#fff"; ctx.font="bold 30px monospace"; ctx.textAlign="center";
      ctx.fillText(String(s.b1.score),W/2,58);
      // Level badge
      if(s.level>0){ctx.font="bold 13px monospace"; ctx.fillStyle="#fbbf24"; ctx.fillText(`Lv.${s.level}`,W/2,78);}
    } else {
      ctx.font="bold 26px monospace"; ctx.textAlign="center";
      ctx.fillStyle=bc[0]; ctx.fillText(String(s.b1.score),W/2-52,55);
      ctx.fillStyle="rgba(255,255,255,0.6)"; ctx.font="13px monospace"; ctx.fillText("vs",W/2,48);
      ctx.fillStyle=bc[1]; ctx.font="bold 26px monospace"; ctx.fillText(String(s.b2.score),W/2+52,55);
    }
    ctx.shadowBlur=0;

    // Level-up message overlay
    if(s.levelMsgTimer>0){
      const t=s.levelMsgTimer/150;
      const a=t<0.13?t/0.13:t>0.82?(1-t)/0.18:1;
      ctx.save(); ctx.globalAlpha=a*0.96;
      ctx.shadowColor="#fbbf24"; ctx.shadowBlur=28;
      ctx.fillStyle="#fef9c3"; ctx.font="bold 34px monospace"; ctx.textAlign="center";
      ctx.fillText(`⭐ Level ${s.level}!`,W/2,H/2-18);
      ctx.shadowBlur=0;
      ctx.fillStyle="rgba(255,255,255,0.75)"; ctx.font="15px monospace";
      ctx.fillText("Speed ↑  Gap ↓",W/2,H/2+14);
      if(s.level===1) ctx.fillText("Moving pipes unlocked!",W/2,H/2+36);
      else if(s.level===2) ctx.fillText("More movers incoming…",W/2,H/2+36);
      else if(s.level>=3) ctx.fillText("Maximum chaos!",W/2,H/2+36);
      ctx.restore();
    }
  }, []);

  const loop = useCallback(() => {
    const s=g.current;
    if(s.state!=="playing"){ draw(); return; }
    if(pausedRef.current){ draw(); raf.current=requestAnimationFrame(loop); return; }
    s.frame++; s.bgOffset+=s.spd;

    // ── Difficulty ramp (every 5 pipe-points) ──────────────────────────────
    const baseC=THEMES[s.theme];
    const pipePts=s.b1.score; // pipes cleared (coins add separately)
    const newLevel=Math.min(5, Math.floor(pipePts/5));
    if(newLevel>s.level){ s.level=newLevel; s.levelMsgTimer=150; setCurrentLevel(newLevel); }
    if(s.levelMsgTimer>0) s.levelMsgTimer--;
    s.spd  = Math.min(baseC.spd+newLevel*0.18, baseC.spd+1.2);
    s.gap  = Math.max(112, baseC.gap-newLevel*6);

    // ── Bird physics ───────────────────────────────────────────────────────
    const upd=(b:Bird)=>{ if(!b.alive)return; b.vy+=s.gravity; b.y+=b.vy; b.rot=Math.max(-0.55,Math.min(1.35,b.vy*0.068)); };
    upd(s.b1); if(s.mode==="2p") upd(s.b2);

    // ── Spawn pipes ────────────────────────────────────────────────────────
    if(s.frame%s.interval===0){
      const tMin=60, tMax=H-s.gap-s.groundH-60;
      const baseTop=tMin+Math.random()*(tMax-tMin);
      const movingChance=Math.min(0.72, newLevel*0.22);
      const isMoving=movingChance>0&&Math.random()<movingChance;
      const amplitude=22+Math.random()*24;
      const oscSpeed=0.017+Math.random()*0.022;
      const hasCoin=Math.random()<0.62;
      s.pipes.push({ x:W+10, top:baseTop, baseTop, scored1:false, scored2:false, seed:s.pipeCount++, moving:isMoving, phase:Math.random()*Math.PI*2, amplitude, oscSpeed, coin:hasCoin, coinCollected1:false, coinCollected2:false });
    }

    // ── Move pipes + oscillation ───────────────────────────────────────────
    const maxTop=H-s.gap-s.groundH-62;
    s.pipes.forEach(p=>{
      p.x-=s.spd;
      if(p.moving){ p.phase+=p.oscSpeed; p.top=Math.max(62,Math.min(maxTop,p.baseTop+Math.sin(p.phase)*p.amplitude)); }
    });
    s.pipes=s.pipes.filter(p=>p.x>-PIPE_W-20);

    // ── Scoring (pipes) ────────────────────────────────────────────────────
    s.pipes.forEach(p=>{
      if(!p.scored1&&s.b1.alive&&p.x+s.spd>=B1X-BIRD_R&&p.x<B1X-BIRD_R){ s.b1.score++; p.scored1=true; setP1Score(s.b1.score); }
      if(!p.scored2&&s.mode==="2p"&&s.b2.alive&&p.x+s.spd>=B2X-BIRD_R&&p.x<B2X-BIRD_R){ s.b2.score++; p.scored2=true; setP2Score(s.b2.score); }
    });

    // ── Coin collection ────────────────────────────────────────────────────
    s.pipes.forEach(p=>{
      if(!p.coin) return;
      const coinX=p.x+PIPE_W/2, coinY=p.top+s.gap/2;
      const d1=Math.hypot(B1X-coinX,s.b1.y-coinY);
      if(!p.coinCollected1&&s.b1.alive&&d1<COIN_R+BIRD_R+4){ p.coinCollected1=true; s.b1.score++; setP1Score(s.b1.score); setP1Coins(c=>c+1); }
      if(s.mode==="2p"){const d2=Math.hypot(B2X-coinX,s.b2.y-coinY); if(!p.coinCollected2&&s.b2.alive&&d2<COIN_R+BIRD_R+4){ p.coinCollected2=true; s.b2.score++; setP2Score(s.b2.score); }}
    });

    // ── Collision ──────────────────────────────────────────────────────────
    const hits=(b:Bird,bx:number)=>!b.alive?false:b.y-BIRD_R<=0||b.y+BIRD_R>=H-s.groundH||s.pipes.some(p=>bx+BIRD_R>p.x&&bx-BIRD_R<p.x+PIPE_W&&(b.y-BIRD_R<p.top||b.y+BIRD_R>p.top+s.gap));
    if(hits(s.b1,B1X)) s.b1.alive=false;
    if(s.mode==="2p"&&hits(s.b2,B2X)) s.b2.alive=false;

    const allDead=!s.b1.alive&&(s.mode==="1p"||!s.b2.alive);
    if(allDead){
      s.state="dead"; setGameState("dead");
      const nb=Math.max(s.b1.score,+localStorage.getItem("fb-best")!||0);
      localStorage.setItem("fb-best",String(nb)); setBest(nb);
      draw(); return;
    }
    draw(); raf.current=requestAnimationFrame(loop);
  }, [draw]);

  const flap = useCallback((player:1|2)=>{
    const s=g.current;
    if(s.state==="idle"){ s.state="playing"; setGameState("playing"); raf.current=requestAnimationFrame(loop); }
    if(s.state==="dead") return;
    if(player===1&&s.b1.alive) s.b1.vy=JUMP;
    if(player===2&&s.b2.alive) s.b2.vy=JUMP;
  }, [loop]);

  const reset = useCallback((m:"1p"|"2p", t:Theme)=>{
    g.current=initState(t,m);
    setGameMode(m); setTheme(t); setP1Score(0); setP2Score(0);
    setP1Coins(0); setCurrentLevel(0); setGameState("idle");
    cancelAnimationFrame(raf.current); draw();
  }, [draw]);

  useEffect(()=>{
    if(screen!=="game") return;
    const onKey=(e:KeyboardEvent)=>{
      if(e.code==="KeyP"){ pausedRef.current=!pausedRef.current; setPaused(pausedRef.current); return; }
      if(e.code==="Space"||e.code==="KeyZ"||e.code==="ArrowUp"){ e.preventDefault(); flap(1); }
      if(e.code==="Enter"||e.code==="ShiftRight"){ e.preventDefault(); flap(2); }
    };
    window.addEventListener("keydown",onKey); draw();
    return ()=>{ window.removeEventListener("keydown",onKey); cancelAnimationFrame(raf.current); };
  },[screen,flap,draw]);

  // ── Screens ───────────────────────────────────────────────────────────────
  if (screen==="menu") return (
    <Shell title="Flappy Bird">
      <div className="flex flex-col items-center gap-8 text-center max-w-sm">
        <div className="text-6xl select-none">🐦</div>
        <h2 className="text-2xl font-black text-lime-400">Select Mode</h2>
        <div className="flex gap-4 w-full">
          <button onClick={()=>{ pendingMode.current="1p"; setScreen("map"); }} className="flex-1 py-4 bg-lime-500/20 hover:bg-lime-500/30 border border-lime-500/50 text-lime-400 font-black rounded-2xl transition-colors">
            👤<br/><span className="text-sm">1 Player</span><br/><span className="text-xs font-normal text-muted-foreground">Space / Tap</span>
          </button>
          <button onClick={()=>{ pendingMode.current="2p"; setScreen("map"); }} className="flex-1 py-4 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-400 font-black rounded-2xl transition-colors">
            👥<br/><span className="text-sm">2 Players</span><br/><span className="text-xs font-normal text-muted-foreground">P1: Space · P2: Enter</span>
          </button>
        </div>
        <div className="text-xs text-muted-foreground space-y-1 text-left w-full">
          <p className="text-lime-400 font-bold mb-2">How levels work</p>
          <p>⭐ Every 5 points → Level Up! Speed ↑ Gap ↓</p>
          <p>🔄 Level 1+ → Moving pipes appear</p>
          <p>⭐ Collect star coins in gaps for bonus points</p>
        </div>
      </div>
    </Shell>
  );

  if (screen==="map") return (
    <Shell title="Choose Map">
      <div className="flex flex-col items-center gap-4 max-w-md w-full">
        <h2 className="text-xl font-black text-lime-400">Choose Your World</h2>
        <div className="grid grid-cols-3 gap-2 w-full">
          {(Object.keys(THEMES) as Theme[]).map(t=>{
            const cfg=THEMES[t];
            return (
              <button key={t} onClick={()=>{ reset(pendingMode.current,t); setScreen("game"); }}
                className="flex flex-col items-center gap-1.5 p-3 bg-secondary/40 hover:bg-secondary border border-border hover:border-primary/60 rounded-xl transition-all group">
                <span className="text-3xl group-hover:scale-110 transition-transform">{cfg.icon}</span>
                <span className="font-black text-xs text-foreground leading-tight text-center">{cfg.name}</span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight hidden sm:block">{cfg.desc}</span>
                <span className={`text-[10px] font-bold ${DIFF_COLORS[cfg.diff]}`}>{cfg.diff}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground text-center">All worlds feature difficulty progression + moving pipes + star coins</p>
        <button onClick={()=>setScreen("menu")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</button>
      </div>
    </Shell>
  );

  const tc=THEMES[theme];
  const bc=tc.birdColors;
  const w2=gameMode==="2p"?(p1Score>p2Score?"🐦 P1 Wins!":p2Score>p1Score?"🐦 P2 Wins!":"🤝 Tie!"):null;

  return (
    <Shell title={`Flappy Bird — ${tc.name}`} controls={gameMode==="2p"?"P1: Space/Z  ·  P2: Enter":"Space / Tap to flap"}>
      {gameMode==="2p"&&(
        <div className="flex gap-8 font-mono text-sm">
          <span style={{color:bc[0]}}>● P1: {p1Score}</span>
          <span style={{color:bc[1]}}>● P2: {p2Score}</span>
        </div>
      )}
      {gameMode==="1p"&&(
        <div className="flex gap-6 font-mono text-sm items-center flex-wrap justify-center">
          <span className="text-lime-400">Score: {p1Score}</span>
          <span className="text-muted-foreground">Best: {best}</span>
          {p1Coins>0&&<span className="text-amber-400">★ ×{p1Coins}</span>}
          {currentLevel>0&&<span className="text-yellow-300 font-bold">Lv.{currentLevel}</span>}
          <span className={`text-xs ${DIFF_COLORS[tc.diff]}`}>{tc.icon} {tc.diff}</span>
        </div>
      )}
      <div className="relative cursor-pointer" onClick={()=>flap(1)} onTouchStart={e=>{e.preventDefault();flap(1);}}>
        <canvas ref={cv} width={W} height={H} className="rounded-xl border border-slate-700" style={{maxHeight:"75vh"}}/>
        {gameState==="idle"&&(
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 rounded-xl gap-3">
            <span className="text-5xl">{tc.icon}</span>
            <p className="text-xl font-black text-white">{tc.name}</p>
            <p className="text-sm text-yellow-300 font-bold">Collect ★ coins in the gaps!</p>
            <p className="text-sm text-white/70">{gameMode==="2p"?"P1: Space · P2: Enter to start":"Tap or press Space to start"}</p>
          </div>
        )}
        {gameState==="dead"&&(
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/72 rounded-xl gap-4">
            <p className="text-2xl font-black text-white">{w2??"Game Over!"}</p>
            {gameMode==="2p"
              ?<p className="font-mono text-sm text-muted-foreground">P1: {p1Score} · P2: {p2Score}</p>
              :<div className="text-center space-y-1">
                <p className="font-mono" style={{color:bc[0]}}>Score: {p1Score}  ·  Best: {best}</p>
                {p1Coins>0&&<p className="text-amber-400 text-sm">★ {p1Coins} star coins collected</p>}
                {currentLevel>0&&<p className="text-yellow-300 text-sm font-bold">Reached Level {currentLevel}</p>}
              </div>
            }
            <div className="flex gap-2">
              <button onClick={()=>reset(gameMode,theme)} className="px-5 py-2 bg-lime-500 hover:bg-lime-400 text-black font-bold rounded-xl">Again</button>
              <button onClick={()=>setScreen("map")} className="px-5 py-2 bg-secondary text-foreground font-bold rounded-xl">Maps</button>
              <button onClick={()=>setScreen("menu")} className="px-5 py-2 bg-secondary text-foreground font-bold rounded-xl">Menu</button>
            </div>
          </div>
        )}
        {paused && gameState==="playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-xl gap-4 z-10" onClick={e=>e.stopPropagation()}>
            <div className="text-6xl">⏸</div>
            <h2 className="text-4xl font-black text-white">PAUSED</h2>
            <p className="text-sm text-white/50">Press P to resume</p>
            <button onClick={() => { pausedRef.current = false; setPaused(false); }} className="px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-bold transition-colors">▶ Resume</button>
          </div>
        )}
      </div>

      {/* P2 tap button for 2P mode on mobile */}
      {gameMode === "2p" && gameState !== "dead" && (
        <button
          className="sm:hidden w-full py-4 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-black rounded-2xl text-lg active:bg-cyan-500/40 touch-manipulation select-none"
          onPointerDown={e => { e.preventDefault(); flap(2); }}
        >
          🐦 P2 — Tap to Flap
        </button>
      )}
    </Shell>
  );
}
