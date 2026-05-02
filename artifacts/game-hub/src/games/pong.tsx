import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useOnlineMultiplayer } from "../lib/multiplayer";
import { OnlineLobby } from "../components/OnlineLobby";

function Shell({ title, controls, children }: { title: string; controls?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-4 px-4 py-3 border-b border-sky-500/30 bg-gradient-to-r from-sky-950/60 to-transparent">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Hub</span>
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

type PongState = {
  p1y: number; p2y: number;
  bx: number; by: number; bvx: number; bvy: number;
  s1: number; s2: number; over: boolean; winner: string;
  keys: Set<string>; remoteKeys: Set<string>;
  running: boolean; mode: "local" | "online";
};

function initState(mode: "local" | "online"): PongState {
  return { p1y: H / 2 - PH / 2, p2y: H / 2 - PH / 2, bx: W / 2, by: H / 2, bvx: SPD0, bvy: 3, s1: 0, s2: 0, over: false, winner: "", keys: new Set(), remoteKeys: new Set(), running: false, mode };
}

function resetBall(s: PongState, dir: number) {
  s.bx = W / 2; s.by = H / 2; s.bvx = SPD0 * dir; s.bvy = (Math.random() - 0.5) * 6;
}

type PongPayload = { p1y: number; p2y: number; bx: number; by: number; bvx: number; bvy: number; s1: number; s2: number; over: boolean; winner: string };

export default function Pong() {
  const cv = useRef<HTMLCanvasElement>(null);
  const g = useRef<PongState>(initState("local"));
  const [screen, setScreen] = useState<"local" | "online-lobby" | "game">("local");
  const [scores, setScores] = useState([0, 0]);
  const [over, setOver] = useState(false);
  const [winner, setWinner] = useState("");
  const [onlineRole, setOnlineRole] = useState<"host" | "guest" | null>(null);
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
      // Guest: apply received state from host
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
      // Host: apply guest's key events to remoteKeys (P2 paddle)
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
    ctx.fillStyle = "#f43f5e";
    ctx.fillRect(W - 20 - PW, s.p2y, PW, PH);
    ctx.fillStyle = "#f0f0f0";
    ctx.beginPath(); ctx.arc(s.bx, s.by, BR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "bold 48px monospace"; ctx.textAlign = "center";
    ctx.fillText(String(s.s1), W / 4, 60); ctx.fillText(String(s.s2), 3 * W / 4, 60);
  }, []);

  const loop = useCallback(() => {
    const s = g.current;
    if (!s.running || s.over) { draw(); return; }
    // Apply P1 keys (host or local)
    if (s.keys.has("w") || s.keys.has("ArrowUp") && s.mode === "local") s.p1y = Math.max(0, s.p1y - PAD_SPD);
    if (s.keys.has("s") || s.keys.has("ArrowDown") && s.mode === "local") s.p1y = Math.min(H - PH, s.p1y + PAD_SPD);
    if (s.mode === "local") {
      if (s.keys.has("ArrowUp")) s.p2y = Math.max(0, s.p2y - PAD_SPD);
      if (s.keys.has("ArrowDown")) s.p2y = Math.min(H - PH, s.p2y + PAD_SPD);
    } else {
      // Online: apply remote keys for P2
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
    if (s.bx < 0) {
      s.s2++; resetBall(s, 1); setScores([s.s1, s.s2]);
      if (s.s2 >= WIN) { s.over = true; s.winner = s.mode === "online" ? "P2 (Guest) Wins!" : "Player 2 Wins!"; setWinner(s.winner); setOver(true); }
    }
    if (s.bx > W) {
      s.s1++; resetBall(s, -1); setScores([s.s1, s.s2]);
      if (s.s1 >= WIN) { s.over = true; s.winner = s.mode === "online" ? "P1 (Host) Wins!" : "Player 1 Wins!"; setWinner(s.winner); setOver(true); }
    }
    if (s.mode === "online") {
      // Host: broadcast state
      const payload: PongPayload = { p1y: s.p1y, p2y: s.p2y, bx: s.bx, by: s.by, bvx: s.bvx, bvy: s.bvy, s1: s.s1, s2: s.s2, over: s.over, winner: s.winner };
      mp.sendGameState(payload);
    }
    draw(); raf.current = requestAnimationFrame(loop);
  }, [draw, mp.sendGameState]);

  const startLocal = useCallback(() => {
    g.current = initState("local");
    g.current.running = true;
    resetBall(g.current, Math.random() > 0.5 ? 1 : -1);
    setScores([0, 0]); setOver(false); setWinner(""); setScreen("game");
    cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(loop);
  }, [loop]);

  useEffect(() => {
    if (screen !== "game") { draw(); return; }
    const down = (e: KeyboardEvent) => {
      const s = g.current;
      s.keys.add(e.key);
      if (["ArrowUp", "ArrowDown", "w", "s"].includes(e.key)) e.preventDefault();
      if (s.mode === "local" && !s.running) startLocal();
      // Guest: relay key events to host
      if (s.mode === "online" && mp.role === "guest") {
        mp.sendInput({ key: e.key, down: true });
      }
    };
    const up = (e: KeyboardEvent) => {
      g.current.keys.delete(e.key);
      if (g.current.mode === "online" && mp.role === "guest") {
        mp.sendInput({ key: e.key, down: false });
      }
    };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); draw();
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); cancelAnimationFrame(raf.current); };
  }, [screen, draw, startLocal, mp.role, mp.sendInput]);

  if (screen === "local" || screen === "game") {
    const isOnlineGame = g.current.mode === "online";
    const role = mp.role;
    return (
      <Shell title="Pong" controls={isOnlineGame ? (role === "host" ? "🟢 You=P1 (W/S)  ·  🔴 P2=Guest (Arrows)" : "🔴 You=P2 (Arrows)  ·  🟢 P1=Host (W/S)") : "P1: W/S  ·  P2: ↑/↓"}>
        <div className="flex gap-8 font-mono text-sm items-center">
          <span className="text-sky-400">{isOnlineGame ? "🟢 Host" : "P1 (W/S)"}: {scores[0]}</span>
          <div className="flex flex-col items-center gap-1">
            <span className="text-muted-foreground text-xs">First to {WIN}</span>
            {!isOnlineGame && (
              <button onClick={() => { mp.disconnect(); setScreen("online-lobby"); }} className="text-xs text-sky-400 hover:text-sky-300 transition-colors">🌐 Play Online</button>
            )}
          </div>
          <span className="text-rose-400">{isOnlineGame ? "🔴 Guest" : "P2 (↑/↓)"}: {scores[1]}</span>
        </div>
        {isOnlineGame && (
          <div className={`text-xs px-3 py-1 rounded-full border ${role === "host" ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10" : "border-rose-500/50 text-rose-400 bg-rose-500/10"}`}>
            {role === "host" ? "🟢 You are HOST · use W/S" : "🔴 You are GUEST · use Arrow keys"}
          </div>
        )}
        <div className="relative">
          <canvas ref={cv} width={W} height={H} className="rounded-xl border border-slate-700 max-w-full" style={{ maxWidth: "min(800px, 95vw)" }} />
          {over && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-xl gap-4">
              <p className="text-3xl font-black text-primary">{winner}</p>
              <div className="flex gap-3">
                {!isOnlineGame && <button onClick={startLocal} className="px-8 py-2 bg-primary text-black font-bold rounded-lg">Play Again</button>}
                <button onClick={() => { mp.disconnect(); setOver(false); setScreen("local"); }} className="px-6 py-2 bg-secondary text-foreground font-bold rounded-lg">{isOnlineGame ? "Leave" : "Menu"}</button>
              </div>
            </div>
          )}
          {!g.current.running && !over && screen === "game" && !isOnlineGame && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-xl gap-4">
              <p className="text-xl font-bold text-white">Press any key to start</p>
              <p className="text-sm text-muted-foreground">P1: W/S  ·  P2: Arrow Keys</p>
            </div>
          )}
          {isOnlineGame && screen !== "game" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl">
              <p className="text-white text-lg font-bold">Waiting for game to start…</p>
            </div>
          )}
        </div>
        {!isOnlineGame && screen === "local" && (
          <button onClick={() => setScreen("online-lobby")} className="px-6 py-2 bg-sky-600/20 hover:bg-sky-600/40 border border-sky-500/40 text-sky-400 font-semibold rounded-xl transition-colors text-sm">
            🌐 Play Online vs Friend
          </button>
        )}
      </Shell>
    );
  }

  return (
    <Shell title="Pong — Online">
      <OnlineLobby
        status={mp.status}
        roomCode={mp.roomCode}
        role={mp.role}
        error={mp.error}
        onCreate={() => {
          g.current = initState("online");
          setOnlineRole("host");
          mp.createRoom("pong");
          setScreen("game");
        }}
        onJoin={(code) => {
          g.current = initState("online");
          setOnlineRole("guest");
          mp.joinRoom(code);
          setScreen("game");
        }}
        onDisconnect={() => { mp.disconnect(); setScreen("local"); }}
        onBack={() => { mp.disconnect(); setScreen("local"); }}
      />
    </Shell>
  );
}
