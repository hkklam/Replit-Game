import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

function Shell({ title, controls, children }: { title: string; controls?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-4 px-4 py-3 border-b border-orange-500/30 bg-gradient-to-r from-orange-950/60 to-transparent">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Hub</span>
        </Link>
        <span className="text-2xl select-none" style={{ filter: "drop-shadow(0 0 8px #fb923c80)" }}>🏰</span>
        <h1 className="text-lg font-bold text-orange-400">{title}</h1>
        {controls && <span className="text-xs text-muted-foreground ml-auto hidden sm:block">{controls}</span>}
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">{children}</div>
    </div>
  );
}

const CELL = 44; const COLS = 18; const ROWS = 12; const W = COLS * CELL; const H = ROWS * CELL;
const PATH: [number, number][] = [[0,2],[1,2],[2,2],[3,2],[4,2],[4,3],[4,4],[4,5],[3,5],[2,5],[1,5],[0,5],[0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,8],[6,7],[6,6],[6,5],[6,4],[6,3],[6,2],[7,2],[8,2],[9,2],[10,2],[11,2],[12,2],[12,3],[12,4],[12,5],[12,6],[12,7],[11,7],[10,7],[9,7],[8,7],[8,8],[8,9],[8,10],[9,10],[10,10],[11,10],[12,10],[13,10],[14,10],[15,10],[16,10],[17,10]];
const PATH_SET = new Set(PATH.map(([c, r]) => `${c},${r}`));

type Enemy = { pathIdx: number; x: number; y: number; hp: number; maxHp: number; speed: number; id: number };
type Tower = { col: number; row: number; range: number; dmg: number; cd: number; timer: number; owner: 1 | 2 };
type Projectile = { x: number; y: number; tx: number; ty: number; speed: number; dmg: number; eid: number };

let eid = 0;
function makeEnemy(wave: number): Enemy {
  const [sc, sr] = PATH[0];
  const hp = 50 + wave * 25;
  return { pathIdx: 0, x: sc * CELL + CELL / 2, y: sr * CELL + CELL / 2, hp, maxHp: hp, speed: 1.2 + wave * 0.1, id: eid++ };
}

export default function TowerDefense() {
  const cv = useRef<HTMLCanvasElement>(null);
  const g = useRef({ enemies: [] as Enemy[], towers: [] as Tower[], projectiles: [] as Projectile[], wave: 1, gold: 100, lives: 20, score: 0, frame: 0, spawnQ: 0, spawnTimer: 0, state: "playing" as "playing" | "win" | "lose", hovCol: -1, hovRow: -1, lastPlacer: 1 as 1 | 2 });
  const [gold, setGold] = useState(100);
  const [lives, setLives] = useState(20);
  const [wave, setWave] = useState(1);
  const [score, setScore] = useState(0);
  const [state, setState] = useState<"playing" | "win" | "lose">("playing");
  const [p1Towers, setP1Towers] = useState(0);
  const [p2Towers, setP2Towers] = useState(0);
  const raf = useRef(0);

  const draw = useCallback(() => {
    const c = cv.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#1a2e1a"; ctx.fillRect(0, 0, W, H);
    for (let col = 0; col < COLS; col++) for (let row = 0; row < ROWS; row++) {
      const isPath = PATH_SET.has(`${col},${row}`);
      const isHov = col === g.current.hovCol && row === g.current.hovRow;
      const hasTower = g.current.towers.some(t => t.col === col && t.row === row);
      ctx.fillStyle = isPath ? "#8B6914" : isHov && !isPath && !hasTower ? "rgba(100,200,100,0.3)" : "rgba(0,0,0,0)";
      if (isPath || isHov) ctx.fillRect(col * CELL, row * CELL, CELL, CELL);
    }
    ctx.strokeStyle = "#a0722a"; ctx.lineWidth = 2;
    PATH.forEach(([col, row]) => ctx.strokeRect(col * CELL + 1, row * CELL + 1, CELL - 2, CELL - 2));
    const [sc, sr] = PATH[0]; ctx.fillStyle = "#22c55e"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center"; ctx.fillText("START", sc * CELL + CELL / 2, sr * CELL + CELL / 2 + 4);
    const [ec, er] = PATH[PATH.length - 1]; ctx.fillStyle = "#ef4444"; ctx.fillText("END", ec * CELL + CELL / 2, er * CELL + CELL / 2 + 4);
    g.current.towers.forEach(t => {
      const tx = t.col * CELL + CELL / 2, ty = t.row * CELL + CELL / 2;
      ctx.fillStyle = t.owner === 1 ? "#1d4ed8" : "#7c3aed";
      ctx.fillRect(t.col * CELL + 6, t.row * CELL + 6, CELL - 12, CELL - 12);
      ctx.fillStyle = t.owner === 1 ? "#60a5fa" : "#c084fc";
      ctx.beginPath(); ctx.arc(tx, ty, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = t.owner === 1 ? "rgba(96,165,250,0.15)" : "rgba(192,132,252,0.15)";
      ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(tx, ty, t.range, 0, Math.PI * 2); ctx.stroke();
    });
    g.current.enemies.forEach(e => {
      ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(e.x, e.y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#fca5a5"; ctx.lineWidth = 1.5; ctx.stroke();
      const bw = 24, bh = 4, bx2 = e.x - bw / 2, by2 = e.y - 18;
      ctx.fillStyle = "#1f2937"; ctx.fillRect(bx2, by2, bw, bh);
      ctx.fillStyle = "#22c55e"; ctx.fillRect(bx2, by2, bw * (e.hp / e.maxHp), bh);
    });
    g.current.projectiles.forEach(p => { ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(0, 0, W, 28);
    ctx.fillStyle = "#e2e8f0"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`💰 ${g.current.gold}  ❤️ ${g.current.lives}  🌊 ${g.current.wave}  ⭐ ${g.current.score}  [Click to place tower — 25 gold]`, 8, 18);
  }, []);

  const loop = useCallback(() => {
    const s = g.current;
    if (s.state !== "playing") { draw(); return; }
    s.frame++;
    if (s.spawnQ > 0 && s.spawnTimer <= 0) { s.enemies.push(makeEnemy(s.wave)); s.spawnQ--; s.spawnTimer = 60; }
    if (s.spawnTimer > 0) s.spawnTimer--;
    s.enemies.forEach(e => {
      if (e.pathIdx >= PATH.length - 1) return;
      const [nc, nr] = PATH[e.pathIdx + 1];
      const tx2 = nc * CELL + CELL / 2, ty2 = nr * CELL + CELL / 2;
      const dx = tx2 - e.x, dy = ty2 - e.y, dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < e.speed) { e.pathIdx++; e.x = tx2; e.y = ty2; } else { e.x += (dx / dist) * e.speed; e.y += (dy / dist) * e.speed; }
    });
    const leaked = s.enemies.filter(e => e.pathIdx >= PATH.length - 1);
    if (leaked.length) { s.lives -= leaked.length; setLives(s.lives); s.enemies = s.enemies.filter(e => e.pathIdx < PATH.length - 1); if (s.lives <= 0) { s.state = "lose"; setState("lose"); return; } }
    s.towers.forEach(t => {
      if (t.timer > 0) { t.timer--; return; }
      const target = s.enemies.find(e => (e.x - (t.col * CELL + CELL / 2)) ** 2 + (e.y - (t.row * CELL + CELL / 2)) ** 2 <= t.range ** 2);
      if (target) { s.projectiles.push({ x: t.col * CELL + CELL / 2, y: t.row * CELL + CELL / 2, tx: target.x, ty: target.y, speed: 6, dmg: t.dmg, eid: target.id }); t.timer = t.cd; }
    });
    s.projectiles = s.projectiles.filter(p => { p.x += (p.tx - p.x) / Math.max(1, Math.sqrt((p.tx - p.x) ** 2 + (p.ty - p.y) ** 2)) * p.speed; p.y += (p.ty - p.y) / Math.max(1, Math.sqrt((p.tx - p.x) ** 2 + (p.ty - p.y) ** 2)) * p.speed; const hit = Math.abs(p.x - p.tx) < p.speed && Math.abs(p.y - p.ty) < p.speed; if (hit) { const e = s.enemies.find(e => e.id === p.eid); if (e) { e.hp -= p.dmg; if (e.hp <= 0) { s.enemies = s.enemies.filter(en => en.id !== e.id); s.gold += 10; s.score += 50; setGold(s.gold); setScore(s.score); } } } return !hit; });
    if (s.spawnQ === 0 && s.enemies.length === 0) { s.wave++; setWave(s.wave); if (s.wave > 10) { s.state = "win"; setState("win"); return; } s.gold += 50; setGold(s.gold); s.spawnQ = s.wave * 5; }
    draw(); raf.current = requestAnimationFrame(loop);
  }, [draw]);

  const placeTower = useCallback((col: number, row: number, owner: 1 | 2) => {
    const s = g.current;
    if (PATH_SET.has(`${col},${row}`)) return;
    if (s.towers.some(t => t.col === col && t.row === row)) return;
    if (s.gold < 25) return;
    s.towers.push({ col, row, range: 80, dmg: 20, cd: 45, timer: 0, owner });
    s.gold -= 25; setGold(s.gold);
    if (owner === 1) setP1Towers(prev => prev + 1); else setP2Towers(prev => prev + 1);
  }, []);

  useEffect(() => {
    const s = g.current; s.spawnQ = s.wave * 5;
    const c = cv.current;
    const onMove = (e: MouseEvent) => { const rect = c?.getBoundingClientRect(); if (!rect) return; g.current.hovCol = Math.floor((e.clientX - rect.left) / CELL); g.current.hovRow = Math.floor((e.clientY - rect.top) / CELL); };
    const onClick = (e: MouseEvent) => { const rect = c?.getBoundingClientRect(); if (!rect) return; const col = Math.floor((e.clientX - rect.left) / CELL), row = Math.floor((e.clientY - rect.top) / CELL); placeTower(col, row, 1); };
    const onKey = (e: KeyboardEvent) => {
      // P2 uses keyboard: IJKL to move cursor, P to place
      const hov = g.current; const step = 1;
      if (e.key === "i") hov.hovRow = Math.max(0, hov.hovRow - step);
      if (e.key === "k") hov.hovRow = Math.min(ROWS - 1, hov.hovRow + step);
      if (e.key === "j") hov.hovCol = Math.max(0, hov.hovCol - step);
      if (e.key === "l") hov.hovCol = Math.min(COLS - 1, hov.hovCol + step);
      if (e.key === "p") { placeTower(hov.hovCol, hov.hovRow, 2); }
      if (["i","j","k","l","p"].includes(e.key)) e.preventDefault();
    };
    c?.addEventListener("mousemove", onMove); c?.addEventListener("click", onClick);
    window.addEventListener("keydown", onKey);
    raf.current = requestAnimationFrame(loop);
    return () => { c?.removeEventListener("mousemove", onMove); c?.removeEventListener("click", onClick); window.removeEventListener("keydown", onKey); cancelAnimationFrame(raf.current); };
  }, [loop, placeTower]);

  const reset = () => { g.current = { enemies: [], towers: [], projectiles: [], wave: 1, gold: 100, lives: 20, score: 0, frame: 0, spawnQ: 5, spawnTimer: 0, state: "playing", hovCol: -1, hovRow: -1, lastPlacer: 1 }; setGold(100); setLives(20); setWave(1); setScore(0); setP1Towers(0); setP2Towers(0); setState("playing"); cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(loop); };

  return (
    <Shell title="Tower Defense" controls="Co-op · P1: Click to place · P2: IJKL move, P to place">
      <div className="flex gap-6 text-xs font-mono">
        <span className="text-blue-400">🔵 P1 towers: {p1Towers}</span>
        <span className="text-violet-400">🟣 P2 towers: {p2Towers}</span>
      </div>
      <div className="relative">
        <canvas ref={cv} width={W} height={H} className="rounded-xl border border-slate-700 cursor-pointer" style={{ maxWidth: "95vw" }} />
        {(state === "win" || state === "lose") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-xl gap-4">
            <p className="text-2xl font-black text-primary">{state === "win" ? "🏆 Co-op Victory! Wave 10 Cleared!" : "💀 Enemies Broke Through!"}</p>
            <p className="font-mono text-muted-foreground">Score: {score} · P1: {p1Towers} towers · P2: {p2Towers} towers</p>
            <button onClick={reset} className="px-8 py-2 bg-primary text-black font-bold rounded-xl">Play Again</button>
          </div>
        )}
      </div>
    </Shell>
  );
}
