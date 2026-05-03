import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useOnlineMultiplayer } from "../lib/multiplayer";
import { OnlineLobby } from "../components/OnlineLobby";
import { getUrlRoomCode } from "../components/QRCode";

function Shell({ title, controls, children }: { title: string; controls?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-4 px-4 py-3 border-b border-sky-500/30 bg-gradient-to-r from-sky-950/60 to-transparent">
        <Link href="/" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-sm transition-all">
          <ArrowLeft className="h-4 w-4" />
          <span>Menu</span>
        </Link>
        <span className="text-2xl select-none" style={{ filter: "drop-shadow(0 0 8px #38bdf880)" }}>🏓</span>
        <h1 className="text-lg font-bold text-sky-400">{title}</h1>
        {controls && <span className="text-xs text-muted-foreground ml-auto hidden sm:block">{controls}</span>}
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">{children}</div>
    </div>
  );
}

const W = 800; const H = 500; const PW = 12; const PH = 80; const BR = 8; const WIN = 7; const SPD0 = 5;
const PAD_SPD = 6;

export type Difficulty = "easy" | "medium" | "hard";

const AI_CFG: Record<Difficulty, { spd: number; err: number; interval: number; predict: boolean }> = {
  easy:   { spd: 2.0,  err: 75, interval: 28, predict: false },
  medium: { spd: 3.6,  err: 22, interval: 12, predict: true  },
  hard:   { spd: 5.6,  err: 5,  interval: 3,  predict: true  },
};

type PongState = {
  p1y: number; p2y: number;
  bx: number; by: number; bvx: number; bvy: number;
  s1: number; s2: number; over: boolean; winner: string;
  keys: Set<string>; remoteKeys: Set<string>;
  running: boolean; mode: "local" | "ai" | "online";
  aiTarget: number; aiTimer: number;
};

function initState(mode: "local" | "ai" | "online"): PongState {
  return {
    p1y: H / 2 - PH / 2, p2y: H / 2 - PH / 2,
    bx: W / 2, by: H / 2, bvx: SPD0, bvy: 3,
    s1: 0, s2: 0, over: false, winner: "",
    keys: new Set(), remoteKeys: new Set(),
    running: false, mode,
    aiTarget: H / 2 - PH / 2, aiTimer: 0,
  };
}

function resetBall(s: PongState, dir: number) {
  s.bx = W / 2; s.by = H / 2; s.bvx = SPD0 * dir; s.bvy = (Math.random() - 0.5) * 6;
}

function stepAI(s: PongState, diff: Difficulty) {
  const cfg = AI_CFG[diff];
  s.aiTimer--;
  if (s.aiTimer <= 0) {
    s.aiTimer = cfg.interval;
    let targetY: number;
    if (!cfg.predict || s.bvx <= 0) {
      targetY = s.by;
    } else {
      const distX = (W - 20 - PW - BR) - s.bx;
      const frames = distX / Math.max(s.bvx, 0.1);
      let pred = s.by + s.bvy * frames;
      const period = (H - BR * 2) * 2;
      pred = pred - BR;
      pred = ((pred % period) + period) % period;
      if (pred > H - BR * 2) pred = period - pred;
      targetY = pred + BR;
    }
    s.aiTarget = targetY - PH / 2 + (Math.random() - 0.5) * cfg.err * 2;
  }
  const center = s.p2y + PH / 2;
  if (center < s.aiTarget - 2) s.p2y = Math.min(H - PH, s.p2y + cfg.spd);
  else if (center > s.aiTarget + 2) s.p2y = Math.max(0, s.p2y - cfg.spd);
}

type PongPayload = { p1y: number; p2y: number; bx: number; by: number; bvx: number; bvy: number; s1: number; s2: number; over: boolean; winner: string };

const DIFF_LABELS: Record<Difficulty, { label: string; color: string; desc: string; icon: string }> = {
  easy:   { label: "Easy",   color: "text-green-400",  desc: "Slow reactions, forgiving",   icon: "🟢" },
  medium: { label: "Medium", color: "text-amber-400",  desc: "Decent tracking, some errors", icon: "🟡" },
  hard:   { label: "Hard",   color: "text-red-400",    desc: "Predicts ball, razor sharp",   icon: "🔴" },
};

export default function Pong() {
  const cv = useRef<HTMLCanvasElement>(null);
  const g = useRef<PongState>(initState("local"));
  const [screen, setScreen] = useState<"menu" | "ai-diff" | "online-lobby" | "game">(() => getUrlRoomCode() ? "online-lobby" : "menu");
  const [scores, setScores] = useState([0, 0]);
  const [over, setOver] = useState(false);
  const [winner, setWinner] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const raf = useRef(0);

  const mp = useOnlineMultiplayer({
    onGuestJoined: useCallback(() => {
      const s = g.current;
      s.running = true; s.over = false; s.winner = "";
      resetBall(s, Math.random() > 0.5 ? 1 : -1);
      setScores([0, 0]); setOver(false); setWinner("");
      setScreen("game");
    }, []),
    onGameState: useCallback((data: unknown) => {
      const st = data as PongPayload;
      const s = g.current;
      s.p1y = st.p1y; s.p2y = st.p2y;
      s.bx = st.bx; s.by = st.by; s.bvx = st.bvx; s.bvy = st.bvy;
      s.s1 = st.s1; s.s2 = st.s2; s.over = st.over; s.winner = st.winner;
      setScores([st.s1, st.s2]);
      if (st.over) { setWinner(st.winner); setOver(true); }
      draw();
    }, []),
    onInput: useCallback((data: unknown) => {
      const inp = data as { key: string; down: boolean };
      if (!inp) return;
      if (inp.down) g.current.remoteKeys.add(inp.key);
      else g.current.remoteKeys.delete(inp.key);
    }, []),
    onOpponentLeft: useCallback(() => {
      setOver(true); setWinner("Opponent left");
    }, []),
  });

  const draw = useCallback(() => {
    const c = cv.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const s = g.current;
    ctx.fillStyle = "#0d1117"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.setLineDash([10, 10]);
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#10b981";
    ctx.fillRect(20, s.p1y, PW, PH);
    ctx.fillStyle = s.mode === "ai" ? "#a855f7" : "#f43f5e";
    ctx.fillRect(W - 20 - PW, s.p2y, PW, PH);
    if (s.mode === "ai") {
      ctx.fillStyle = "rgba(168,85,247,0.15)";
      ctx.fillRect(W - 20 - PW - 3, s.p2y - 3, PW + 6, PH + 6);
    }
    ctx.fillStyle = "#f0f0f0";
    ctx.beginPath(); ctx.arc(s.bx, s.by, BR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "bold 48px monospace"; ctx.textAlign = "center";
    ctx.fillText(String(s.s1), W / 4, 60); ctx.fillText(String(s.s2), 3 * W / 4, 60);
  }, []);

  const diffRef = useRef<Difficulty>("medium");
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);

  const loop = useCallback(() => {
    const s = g.current;
    if (!s.running || s.over) { draw(); return; }
    if (pausedRef.current) { draw(); raf.current = requestAnimationFrame(loop); return; }
    if (s.keys.has("w")) s.p1y = Math.max(0, s.p1y - PAD_SPD);
    if (s.keys.has("s")) s.p1y = Math.min(H - PH, s.p1y + PAD_SPD);
    if (s.mode === "local") {
      if (s.keys.has("ArrowUp")) s.p2y = Math.max(0, s.p2y - PAD_SPD);
      if (s.keys.has("ArrowDown")) s.p2y = Math.min(H - PH, s.p2y + PAD_SPD);
    } else if (s.mode === "ai") {
      stepAI(s, diffRef.current);
    } else {
      if (s.remoteKeys.has("ArrowUp") || s.remoteKeys.has("w")) s.p2y = Math.max(0, s.p2y - PAD_SPD);
      if (s.remoteKeys.has("ArrowDown") || s.remoteKeys.has("s")) s.p2y = Math.min(H - PH, s.p2y + PAD_SPD);
    }
    s.bx += s.bvx; s.by += s.bvy;
    if (s.by - BR <= 0) { s.by = BR; s.bvy = Math.abs(s.bvy); }
    if (s.by + BR >= H) { s.by = H - BR; s.bvy = -Math.abs(s.bvy); }
    if (s.bx - BR <= 20 + PW && s.bx - BR >= 18 && s.by >= s.p1y - BR && s.by <= s.p1y + PH + BR) {
      s.bvx = Math.abs(s.bvx) * 1.05; s.bvy += ((s.by - (s.p1y + PH / 2)) / PH) * 5; s.bx = 20 + PW + BR;
    }
    if (s.bx + BR >= W - 20 - PW && s.bx + BR <= W - 18 && s.by >= s.p2y - BR && s.by <= s.p2y + PH + BR) {
      s.bvx = -Math.abs(s.bvx) * 1.05; s.bvy += ((s.by - (s.p2y + PH / 2)) / PH) * 5; s.bx = W - 20 - PW - BR;
    }
    const spd = Math.sqrt(s.bvx ** 2 + s.bvy ** 2);
    if (spd > 18) { s.bvx *= 18 / spd; s.bvy *= 18 / spd; }
    const aiLabel = s.mode === "ai" ? `AI (${diffRef.current})` : "Player 2";
    if (s.bx < 0) {
      s.s2++; resetBall(s, 1); setScores([s.s1, s.s2]);
      if (s.s2 >= WIN) { s.over = true; s.winner = `${aiLabel} Wins!`; setWinner(s.winner); setOver(true); }
    }
    if (s.bx > W) {
      s.s1++; resetBall(s, -1); setScores([s.s1, s.s2]);
      if (s.s1 >= WIN) { s.over = true; s.winner = s.mode === "online" ? "P1 (Host) Wins!" : "Player 1 Wins!"; setWinner(s.winner); setOver(true); }
    }
    if (s.mode === "online") {
      const payload: PongPayload = { p1y: s.p1y, p2y: s.p2y, bx: s.bx, by: s.by, bvx: s.bvx, bvy: s.bvy, s1: s.s1, s2: s.s2, over: s.over, winner: s.winner };
      mp.sendGameState(payload);
    }
    draw(); raf.current = requestAnimationFrame(loop);
  }, [draw, mp.sendGameState]);

  const startGame = useCallback((m: "local" | "ai" | "online", diff?: Difficulty) => {
    if (diff) { setDifficulty(diff); diffRef.current = diff; }
    g.current = initState(m);
    g.current.running = true;
    resetBall(g.current, Math.random() > 0.5 ? 1 : -1);
    setScores([0, 0]); setOver(false); setWinner(""); setScreen("game");
    cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(loop);
  }, [loop]);

  useEffect(() => {
    if (screen !== "game") { draw(); return; }
    const down = (e: KeyboardEvent) => {
      const s = g.current;
      if (e.key === 'p' || e.key === 'P') { pausedRef.current = !pausedRef.current; setPaused(pausedRef.current); return; }
      s.keys.add(e.key);
      if (["ArrowUp", "ArrowDown", "w", "s"].includes(e.key)) e.preventDefault();
      if (s.mode === "online" && mp.role === "guest") mp.sendInput({ key: e.key, down: true });
    };
    const up = (e: KeyboardEvent) => {
      g.current.keys.delete(e.key);
      if (g.current.mode === "online" && mp.role === "guest") mp.sendInput({ key: e.key, down: false });
    };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); draw();
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); cancelAnimationFrame(raf.current); };
  }, [screen, draw, mp.role, mp.sendInput]);

  if (screen === "menu") return (
    <Shell title="Pong">
      <div className="flex flex-col items-center gap-8 text-center max-w-sm">
        <div className="text-6xl select-none">🏓</div>
        <h2 className="text-2xl font-black text-sky-400">Select Mode</h2>
        <div className="flex flex-col gap-3 w-full">
          <button onClick={() => setScreen("ai-diff")} className="w-full py-4 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-300 font-black rounded-2xl transition-colors">
            🤖 vs Computer
            <div className="text-xs font-normal text-muted-foreground mt-1">Choose difficulty</div>
          </button>
          <div className="flex gap-3">
            <button onClick={() => startGame("local")} className="flex-1 py-4 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/50 text-sky-400 font-black rounded-2xl transition-colors text-sm">
              👥 Local 2P<div className="text-xs font-normal text-muted-foreground">P1: W/S · P2: Arrows</div>
            </button>
            <button onClick={() => setScreen("online-lobby")} className="flex-1 py-4 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/50 text-indigo-300 font-black rounded-2xl transition-colors text-sm">
              🌐 Online<div className="text-xs font-normal text-muted-foreground">vs friend</div>
            </button>
          </div>
        </div>
      </div>
    </Shell>
  );

  if (screen === "ai-diff") return (
    <Shell title="Pong — vs Computer">
      <div className="flex flex-col items-center gap-6 max-w-sm w-full">
        <div className="text-5xl">🤖</div>
        <h2 className="text-xl font-black text-purple-400">Choose Difficulty</h2>
        <div className="flex flex-col gap-3 w-full">
          {(["easy", "medium", "hard"] as Difficulty[]).map(d => {
            const cfg = DIFF_LABELS[d];
            return (
              <button key={d} onClick={() => startGame("ai", d)} className={`w-full py-4 px-5 rounded-2xl border transition-colors font-black flex items-center gap-4 text-left
                ${d === "easy" ? "bg-green-500/15 hover:bg-green-500/25 border-green-500/40" : d === "medium" ? "bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40" : "bg-red-500/15 hover:bg-red-500/25 border-red-500/40"}`}>
                <span className="text-2xl">{cfg.icon}</span>
                <div>
                  <div className={`font-black ${cfg.color}`}>{cfg.label}</div>
                  <div className="text-xs text-muted-foreground font-normal">{cfg.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
        <button onClick={() => setScreen("menu")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</button>
      </div>
    </Shell>
  );

  if (screen === "online-lobby") return (
    <Shell title="Pong — Online">
      <OnlineLobby
        status={mp.status} roomCode={mp.roomCode} role={mp.role} error={mp.error}
        initialCode={getUrlRoomCode()}
        onCreate={() => { g.current = initState("online"); mp.createRoom("pong"); setScreen("game"); }}
        onJoin={(code) => { g.current = initState("online"); mp.joinRoom(code); setScreen("game"); }}
        onDisconnect={() => { mp.disconnect(); setScreen("menu"); }}
        onBack={() => { mp.disconnect(); setScreen("menu"); }}
      />
    </Shell>
  );

  const isAI = g.current.mode === "ai";
  const isOnline = g.current.mode === "online";
  const role = mp.role;
  const p2Label = isAI ? `🤖 AI (${difficulty})` : isOnline ? (role === "host" ? "🔴 Guest" : "🔴 Host") : "P2 (↑/↓)";
  const p1Label = isOnline ? "🟢 Host" : "P1 (W/S)";

  return (
    <Shell title="Pong" controls={isAI ? `W/S  ·  vs ${DIFF_LABELS[difficulty].icon} ${DIFF_LABELS[difficulty].label} AI` : isOnline ? (role === "host" ? "🟢 HOST · W/S" : "🔴 GUEST · Arrows") : "P1: W/S  ·  P2: ↑/↓"}>
      <div className="flex gap-8 font-mono text-sm items-center">
        <span className="text-sky-400">{p1Label}: {scores[0]}</span>
        <span className="text-muted-foreground text-xs">First to {WIN}</span>
        <span className={isAI ? "text-purple-400" : "text-rose-400"}>{p2Label}: {scores[1]}</span>
      </div>
      {isAI && (
        <div className="flex items-center gap-2 text-xs">
          {(["easy", "medium", "hard"] as Difficulty[]).map(d => (
            <span key={d} className={`px-2 py-0.5 rounded-full ${d === difficulty ? (d === "easy" ? "bg-green-500/20 text-green-400 border border-green-500/50" : d === "medium" ? "bg-amber-500/20 text-amber-400 border border-amber-500/50" : "bg-red-500/20 text-red-400 border border-red-500/50") : "text-muted-foreground"}`}>
              {DIFF_LABELS[d].icon} {DIFF_LABELS[d].label}
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <canvas ref={cv} width={W} height={H} className="rounded-xl border border-slate-700 max-w-full" style={{ maxWidth: "min(800px, 95vw)" }} />
        {over && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-xl gap-4">
            <p className="text-3xl font-black text-primary">{winner}</p>
            <div className="flex gap-3">
              <button onClick={() => startGame(g.current.mode, isAI ? difficulty : undefined)} className="px-8 py-2 bg-primary text-black font-bold rounded-lg">
                {isAI ? "Try Again" : "Play Again"}
              </button>
              <button onClick={() => { mp.disconnect(); setOver(false); setScreen("menu"); }} className="px-6 py-2 bg-secondary text-foreground font-bold rounded-lg">Menu</button>
            </div>
          </div>
        )}
        {!g.current.running && !over && !isOnline && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-xl gap-3">
            <p className="text-xl font-bold text-white">Starting…</p>
          </div>
        )}
        {paused && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-xl gap-4 z-10">
            <div className="text-6xl">⏸</div>
            <h2 className="text-4xl font-black text-white">PAUSED</h2>
            <p className="text-sm text-white/50">Press P to resume</p>
            <button onClick={() => { pausedRef.current = false; setPaused(false); }} className="px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-bold transition-colors">▶ Resume</button>
          </div>
        )}
      </div>
    </Shell>
  );
}
