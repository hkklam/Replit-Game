import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type Diff = "easy" | "medium" | "hard";
type Phase = "word_select" | "drawing" | "scoring" | "between" | "ended";
type Screen = "landing" | "lobby" | "game" | "results";

interface PicPlayer { idx: number; name: string; score: number; }
interface ChatMsg { playerIdx: number; name: string; text: string; }
interface WordOpts { easy: string; medium: string; hard: string; }
interface ScoringInfo { players: PicPlayer[]; diff: Diff; chatLog: ChatMsg[]; }
interface TurnEndInfo { word: string; diff: Diff; scoresDelta: { idx: number; delta: number }[]; scores: PicPlayer[]; }

// Canvas entries
interface StrokeEntry { id: string; color: string; size: number; tool: "pen"|"eraser"; pts: number[]; }
interface FillEntry { color: string; x: number; y: number; }
type SEntry = { type: "stroke"; data: StrokeEntry } | { type: "fill"; data: FillEntry };

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const CW = 800, CH = 560;
const COLORS = [
  "#000000","#3d3d3d","#787878","#ffffff",
  "#ff3b30","#8b0000","#ff9500","#ffcc02",
  "#34c759","#007700","#5ac8fa","#0057ff",
  "#af52de","#8b0084","#ff2d92","#a67c52",
];
const SIZES = [2, 4, 6, 10, 16, 24, 36];
const DIFF_PTS: Record<Diff, number> = { easy: 1, medium: 3, hard: 5 };
const DIFF_COLORS: Record<Diff, string> = { easy: "#34c759", medium: "#ff9500", hard: "#ff3b30" };
const DIFF_LABELS: Record<Diff, string> = { easy: "Easy (1 pt)", medium: "Medium (3 pts)", hard: "Hard (5 pts)" };

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
}

function drawStroke(ctx: CanvasRenderingContext2D, s: StrokeEntry) {
  if (s.pts.length < 2) return;
  ctx.save();
  ctx.beginPath();
  ctx.strokeStyle = s.tool === "eraser" ? "#ffffff" : s.color;
  ctx.lineWidth = s.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalCompositeOperation = s.tool === "eraser" ? "source-over" : "source-over";
  ctx.moveTo(s.pts[0], s.pts[1]);
  for (let i = 2; i < s.pts.length; i += 2) {
    const mx = (s.pts[i - 2] + s.pts[i]) / 2;
    const my = (s.pts[i - 1] + s.pts[i + 1]) / 2;
    ctx.quadraticCurveTo(s.pts[i - 2], s.pts[i - 1], mx, my);
  }
  ctx.lineTo(s.pts[s.pts.length - 2], s.pts[s.pts.length - 1]);
  ctx.stroke();
  ctx.restore();
}

function floodFill(ctx: CanvasRenderingContext2D, startX: number, startY: number, fillHex: string) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  const sx = Math.round(startX), sy = Math.round(startY);
  if (sx < 0 || sx >= w || sy < 0 || sy >= h) return;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const ti = (sy * w + sx) * 4;
  const tr = data[ti], tg = data[ti + 1], tb = data[ti + 2];
  const fc = hexToRgb(fillHex);
  if (!fc) return;
  if (tr === fc.r && tg === fc.g && tb === fc.b) return;
  const matches = (pi: number) =>
    Math.abs(data[pi] - tr) + Math.abs(data[pi + 1] - tg) + Math.abs(data[pi + 2] - tb) < 80;
  const stack = [sx + sy * w];
  const visited = new Uint8Array(w * h);
  visited[sx + sy * w] = 1;
  while (stack.length) {
    const pos = stack.pop()!;
    const x = pos % w, y = Math.floor(pos / w);
    const pi = pos * 4;
    data[pi] = fc.r; data[pi + 1] = fc.g; data[pi + 2] = fc.b; data[pi + 3] = 255;
    if (x > 0 && !visited[pos - 1]) { visited[pos - 1] = 1; if (matches((pos - 1) * 4)) stack.push(pos - 1); }
    if (x < w - 1 && !visited[pos + 1]) { visited[pos + 1] = 1; if (matches((pos + 1) * 4)) stack.push(pos + 1); }
    if (y > 0 && !visited[pos - w]) { visited[pos - w] = 1; if (matches((pos - w) * 4)) stack.push(pos - w); }
    if (y < h - 1 && !visited[pos + w]) { visited[pos + w] = 1; if (matches((pos + w) * 4)) stack.push(pos + w); }
  }
  ctx.putImageData(imageData, 0, 0);
}

function buildOffscreen(offscreen: HTMLCanvasElement, stable: SEntry[]) {
  const ctx = offscreen.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CW, CH);
  for (const entry of stable) {
    if (entry.type === "stroke") drawStroke(ctx, entry.data);
    else floodFill(ctx, entry.data.x, entry.data.y, entry.data.color);
  }
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function Pictionary() {
  // ── Socket ───────────────────────────────────────────────────────────────────
  const wsRef = useRef<WebSocket | null>(null);
  const [wsStatus, setWsStatus] = useState<"idle"|"connecting"|"open"|"error">("idle");
  const [errMsg, setErrMsg] = useState("");

  // ── Screen / Room ─────────────────────────────────────────────────────────
  const [screen, setScreen]     = useState<Screen>("landing");
  const [myName, setMyName]     = useState("");
  const [joinInput, setJoinInput] = useState("");
  const [myIdx, setMyIdx]       = useState(-1);
  const myIdxRef = useRef(-1);
  const [roomCode, setRoomCode] = useState("");
  const [isHost, setIsHost]     = useState(false);
  const [players, setPlayers]   = useState<PicPlayer[]>([]);
  const [settings, setSettings] = useState({ rounds: 3, timerSeconds: 60 });

  // ── Game ──────────────────────────────────────────────────────────────────
  const [phase, setPhase]           = useState<Phase>("word_select");
  const phaseRef = useRef<Phase>("word_select");
  const [drawerIdx, setDrawerIdx]   = useState(-1);
  const drawerIdxRef = useRef(-1);
  const [round, setRound]           = useState(1);
  const [totalRounds, setTotalRounds] = useState(3);
  const [timerEnd, setTimerEnd]     = useState(0);
  const [timerLeft, setTimerLeft]   = useState(60);
  const [wordOpts, setWordOpts]     = useState<WordOpts | null>(null);
  const [myDrawWord, setMyDrawWord] = useState("");
  const [myDrawDiff, setMyDrawDiff] = useState<Diff>("easy");
  const [wordHint, setWordHint]     = useState("");
  const [guessCount, setGuessCount] = useState(0);
  const [chat, setChat]             = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput]   = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [turnEndInfo, setTurnEndInfo] = useState<TurnEndInfo | null>(null);
  const [scoringInfo, setScoringInfo] = useState<ScoringInfo | null>(null);
  const [selWinners, setSelWinners]   = useState(new Set<number>());
  const [scoringDiff, setScoringDiff] = useState<Diff>("easy");
  const [finalPlayers, setFinalPlayers] = useState<PicPlayer[]>([]);

  // ── Canvas ────────────────────────────────────────────────────────────────
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const offRef     = useRef<HTMLCanvasElement | null>(null);
  const stableRef  = useRef<SEntry[]>([]);
  const inFlight   = useRef<Map<string, StrokeEntry>>(new Map());
  const liveRef    = useRef<StrokeEntry | null>(null);
  const dirtyRef   = useRef(true);
  const rafRef     = useRef(0);
  const drawingRef = useRef(false);
  const lastSendRef = useRef(0);
  const pendingPts = useRef<number[]>([]);
  const strokeId   = useRef(0);

  // ── Tools ─────────────────────────────────────────────────────────────────
  const [tool, setTool]     = useState<"pen"|"eraser"|"fill">("pen");
  const [color, setColor]   = useState("#000000");
  const [size, setSize]     = useState(6);
  const toolRef  = useRef<"pen"|"eraser"|"fill">("pen");
  const colorRef = useRef("#000000");
  const sizeRef  = useRef(6);

  useEffect(() => { toolRef.current  = tool;  }, [tool]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { sizeRef.current  = size;  }, [size]);

  const isDrawer = myIdx >= 0 && myIdx === drawerIdx;
  const isDrawerRef = useRef(false);
  useEffect(() => { isDrawerRef.current = isDrawer; }, [isDrawer]);

  // ─── WebSocket ─────────────────────────────────────────────────────────────
  const send = useCallback((msg: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(msg));
  }, []);

  const applyOp = useCallback((op: Record<string, unknown>) => {
    const t = op.t as string;
    if (t === "begin") {
      inFlight.current.set(String(op.id), {
        id: String(op.id), color: String(op.color), size: Number(op.size),
        tool: String(op.tool) as "pen"|"eraser", pts: [],
      });
    } else if (t === "pts") {
      const s = inFlight.current.get(String(op.id));
      if (s) { const pts = op.pts as number[]; s.pts.push(...pts); }
    } else if (t === "end") {
      const s = inFlight.current.get(String(op.id));
      if (s) { inFlight.current.delete(String(op.id)); stableRef.current.push({ type: "stroke", data: s }); dirtyRef.current = true; }
    } else if (t === "fill") {
      stableRef.current.push({ type: "fill", data: { color: String(op.color), x: Number(op.x), y: Number(op.y) } });
      dirtyRef.current = true;
    } else if (t === "clear") {
      stableRef.current = []; inFlight.current.clear(); liveRef.current = null; dirtyRef.current = true;
    } else if (t === "undo") {
      if (stableRef.current.length > 0) { stableRef.current.pop(); dirtyRef.current = true; }
    }
  }, []);

  const openWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    setWsStatus("connecting"); setErrMsg("");
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${window.location.host}/api/ws`);
    wsRef.current = ws;

    ws.onopen = () => setWsStatus("open");
    ws.onerror = () => { setWsStatus("error"); setErrMsg("Connection failed."); };

    ws.onmessage = (ev) => {
      let msg: Record<string, unknown> & { type: string };
      try { msg = JSON.parse(ev.data as string); } catch { return; }
      switch (msg.type) {
        case "pic_room_created":
          setRoomCode(String(msg.roomCode)); setMyIdx(0); myIdxRef.current = 0;
          setIsHost(true); setPlayers(msg.players as PicPlayer[]); setScreen("lobby"); break;
        case "pic_joined":
          setRoomCode(String(msg.roomCode)); setMyIdx(Number(msg.playerIdx)); myIdxRef.current = Number(msg.playerIdx);
          setIsHost(false); setPlayers(msg.players as PicPlayer[]); setScreen("lobby"); break;
        case "pic_lobby_update":
          setPlayers(msg.players as PicPlayer[]); break;
        case "pic_game_started":
          setDrawerIdx(Number(msg.drawerIdx)); drawerIdxRef.current = Number(msg.drawerIdx);
          setRound(1); setTotalRounds(Number(msg.totalRounds));
          setPlayers(msg.players as PicPlayer[]);
          setPhase("word_select"); phaseRef.current = "word_select";
          setTurnEndInfo(null); setScoringInfo(null); setChat([]); setGuessCount(0);
          stableRef.current = []; inFlight.current.clear(); liveRef.current = null; dirtyRef.current = true;
          setScreen("game"); break;
        case "pic_word_options":
          setWordOpts(msg.words as WordOpts); break;
        case "pic_drawing_started":
          setPhase("drawing"); phaseRef.current = "drawing";
          setTimerEnd(Number(msg.timerEnd));
          setWordHint(String(msg.wordHint)); setGuessCount(0); setChat([]);
          setTurnEndInfo(null); setScoringInfo(null);
          stableRef.current = []; inFlight.current.clear(); liveRef.current = null; dirtyRef.current = true;
          break;
        case "pic_drawing_started_self":
          setTimerEnd(Number(msg.timerEnd)); break;
        case "pic_draw":
          applyOp(msg.op as Record<string, unknown>); break;
        case "pic_chat":
          setChat(c => [...c, { playerIdx: Number(msg.playerIdx), name: String(msg.name), text: String(msg.text) }]); break;
        case "pic_guess_count":
          setGuessCount(Number(msg.count)); break;
        case "pic_time_up":
          setPhase("scoring"); phaseRef.current = "scoring"; break;
        case "pic_score_modal":
          setPhase("scoring"); phaseRef.current = "scoring";
          setScoringInfo({ players: msg.players as PicPlayer[], diff: msg.diff as Diff, chatLog: msg.chatLog as ChatMsg[] });
          setScoringDiff(msg.diff as Diff); setSelWinners(new Set()); break;
        case "pic_turn_end": {
          const info = msg as unknown as TurnEndInfo & { type: string };
          setTurnEndInfo({ word: String(info.word), diff: info.diff, scoresDelta: info.scoresDelta, scores: info.scores });
          setPlayers(info.scores);
          setPhase("between"); phaseRef.current = "between"; break;
        }
        case "pic_new_turn":
          setRound(Number(msg.round)); setDrawerIdx(Number(msg.drawerIdx)); drawerIdxRef.current = Number(msg.drawerIdx);
          setPlayers(msg.players as PicPlayer[]);
          setPhase("word_select"); phaseRef.current = "word_select";
          setWordOpts(null); setWordHint(""); setChat([]); setGuessCount(0); setTurnEndInfo(null); setScoringInfo(null);
          stableRef.current = []; inFlight.current.clear(); liveRef.current = null; dirtyRef.current = true;
          break;
        case "pic_game_over":
          setFinalPlayers(msg.players as PicPlayer[]); setPhase("ended"); phaseRef.current = "ended"; setScreen("results"); break;
        case "error":
          setErrMsg(String(msg.message ?? "Error")); break;
      }
    };
    ws.onclose = () => setWsStatus("idle");
  }, [applyOp]);

  // ─── Timer countdown ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!timerEnd) return;
    const iv = setInterval(() => {
      const left = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
      setTimerLeft(left);
    }, 250);
    return () => clearInterval(iv);
  }, [timerEnd]);

  // ─── Auto-scroll chat ──────────────────────────────────────────────────────
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  // ─── Offscreen canvas ─────────────────────────────────────────────────────
  useEffect(() => {
    const off = document.createElement("canvas");
    off.width = CW; off.height = CH;
    offRef.current = off;
    const ctx = off.getContext("2d")!;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, CW, CH);
  }, []);

  // ─── Render loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== "game") return;
    const render = () => {
      const canvas = canvasRef.current; const off = offRef.current;
      if (!canvas || !off) { rafRef.current = requestAnimationFrame(render); return; }
      const ctx = canvas.getContext("2d")!;
      if (dirtyRef.current) { buildOffscreen(off, stableRef.current); dirtyRef.current = false; }
      ctx.drawImage(off, 0, 0);
      for (const [, s] of inFlight.current) drawStroke(ctx, s);
      if (liveRef.current) drawStroke(ctx, liveRef.current);
      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [screen]);

  // ─── Canvas coordinate helper ─────────────────────────────────────────────
  const toXY = (clientX: number, clientY: number): [number, number] => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return [(clientX - rect.left) * (CW / rect.width), (clientY - rect.top) * (CH / rect.height)];
  };

  // ─── Canvas pointer events (drawer only) ──────────────────────────────────
  const onPointerDown = useCallback((clientX: number, clientY: number) => {
    if (!isDrawerRef.current || phaseRef.current !== "drawing") return;
    const [x, y] = toXY(clientX, clientY);
    if (toolRef.current === "fill") {
      const op = { t: "fill", color: colorRef.current, x, y };
      applyOp(op); send({ type: "pic_draw", op });
      return;
    }
    drawingRef.current = true;
    const id = String(Date.now()) + String(strokeId.current++);
    liveRef.current = { id, color: colorRef.current, size: sizeRef.current, tool: toolRef.current, pts: [x, y] };
    pendingPts.current = [x, y];
    const op = { t: "begin", id, color: colorRef.current, size: sizeRef.current, tool: toolRef.current };
    send({ type: "pic_draw", op });
  }, [applyOp, send]);

  const onPointerMove = useCallback((clientX: number, clientY: number) => {
    if (!drawingRef.current || !liveRef.current) return;
    const [x, y] = toXY(clientX, clientY);
    liveRef.current.pts.push(x, y);
    pendingPts.current.push(x, y);
    const now = Date.now();
    if (now - lastSendRef.current >= 30 && pendingPts.current.length > 0) {
      const op = { t: "pts", id: liveRef.current.id, pts: [...pendingPts.current] };
      send({ type: "pic_draw", op });
      pendingPts.current = [];
      lastSendRef.current = now;
    }
  }, [send]);

  const onPointerUp = useCallback(() => {
    if (!drawingRef.current || !liveRef.current) return;
    drawingRef.current = false;
    if (pendingPts.current.length > 0) {
      const op = { t: "pts", id: liveRef.current.id, pts: [...pendingPts.current] };
      send({ type: "pic_draw", op });
      pendingPts.current = [];
    }
    const endOp = { t: "end", id: liveRef.current.id };
    send({ type: "pic_draw", op: endOp });
    stableRef.current.push({ type: "stroke", data: { ...liveRef.current } });
    liveRef.current = null;
    dirtyRef.current = true;
  }, [send]);

  // Mouse events
  const onMouseDown  = (e: React.MouseEvent) => { e.preventDefault(); onPointerDown(e.clientX, e.clientY); };
  const onMouseMove  = (e: React.MouseEvent) => { onPointerMove(e.clientX, e.clientY); };
  const onMouseUp    = () => onPointerUp();
  const onMouseLeave = () => onPointerUp();

  // Touch events
  const onTouchStart = (e: React.TouchEvent) => { e.preventDefault(); const t = e.touches[0]; onPointerDown(t.clientX, t.clientY); };
  const onTouchMove  = (e: React.TouchEvent) => { e.preventDefault(); const t = e.touches[0]; onPointerMove(t.clientX, t.clientY); };
  const onTouchEnd   = (e: React.TouchEvent) => { e.preventDefault(); onPointerUp(); };

  // ─── Draw actions ─────────────────────────────────────────────────────────
  const doUndo = () => {
    if (!isDrawer || phaseRef.current !== "drawing") return;
    const op = { t: "undo" };
    applyOp(op); send({ type: "pic_draw", op });
  };
  const doClear = () => {
    if (!isDrawer || phaseRef.current !== "drawing") return;
    if (!window.confirm("Clear the canvas?")) return;
    const op = { t: "clear" };
    applyOp(op); send({ type: "pic_draw", op });
  };

  // ─── Game actions ─────────────────────────────────────────────────────────
  const selectWord = (diff: Diff) => {
    setMyDrawWord(wordOpts![diff]); setMyDrawDiff(diff); setWordOpts(null);
    send({ type: "pic_select_word", diff });
  };
  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    send({ type: "pic_chat", text });
    setChatInput("");
  };
  const endTurn = () => { if (window.confirm("End turn early?")) send({ type: "pic_end_turn" }); };
  const submitScore = () => {
    send({ type: "pic_score", winners: [...selWinners], diff: scoringDiff });
    setScoringInfo(null);
  };

  // ─── Timer display ────────────────────────────────────────────────────────
  const timerColor = timerLeft > 20 ? "#34c759" : timerLeft > 10 ? "#ff9500" : "#ff3b30";
  const timerPct = timerLeft / (settings.timerSeconds || 60) * 100;

  // ─── SCREENS ─────────────────────────────────────────────────────────────
  const panelStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: "radial-gradient(ellipse at 50% 0%, #1a0050 0%, #060010 60%, #000 100%)",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    color: "#fff", fontFamily: "'Segoe UI', sans-serif", padding: 24, userSelect: "none",
  };
  const Card = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 18, padding: 28, width: "100%", maxWidth: 420, ...style }}>{children}</div>
  );
  const PBtn = ({ children, onClick, color: c = "#6d28d9", disabled = false, small = false }: {
    children: React.ReactNode; onClick?: () => void; color?: string; disabled?: boolean; small?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled} style={{
      padding: small ? "8px 18px" : "12px 28px",
      fontSize: small ? 13 : 15, fontWeight: 800, letterSpacing: 0.5,
      border: "none", borderRadius: 12, color: "#fff", cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1, background: c, transition: "opacity .15s",
    }}>{children}</button>
  );

  // ─── LANDING ─────────────────────────────────────────────────────────────
  if (screen === "landing") return (
    <div style={panelStyle}>
      <Link href="/"><span style={{ position: "absolute", top: 16, left: 20, color: "rgba(255,255,255,0.3)", fontSize: 14, cursor: "pointer" }}>← Hub</span></Link>
      <div style={{ fontSize: 56, marginBottom: 8 }}>🎨</div>
      <h1 style={{ fontSize: 44, fontWeight: 900, margin: "0 0 4px", background: "linear-gradient(135deg,#c084fc,#818cf8,#38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>DrawIt</h1>
      <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: 36, fontSize: 13 }}>Draw · Guess · Score — up to 8 players</p>
      <Card>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: 1 }}>YOUR NAME</span>
          <input value={myName} onChange={e => setMyName(e.target.value.slice(0, 14))} maxLength={14} placeholder="Enter your name…"
            onKeyDown={e => { if (e.key === "Enter" && myName.trim()) { openWS(); } }}
            style={{ padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: 16, fontWeight: 700, outline: "none" }} />
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <PBtn color="#6d28d9" disabled={!myName.trim() || wsStatus === "connecting"} onClick={() => {
            if (!myName.trim()) return;
            openWS();
            setTimeout(() => wsRef.current?.readyState === WebSocket.OPEN && wsRef.current!.send(JSON.stringify({ type: "pic_create", name: myName.trim() })), 400);
          }}>🏠 Create Room</PBtn>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={joinInput} onChange={e => setJoinInput(e.target.value.toUpperCase().slice(0, 6))} maxLength={6} placeholder="ROOM CODE"
              style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: 16, fontWeight: 700, letterSpacing: 4, outline: "none", textTransform: "uppercase" }} />
            <PBtn color="#0369a1" small disabled={!myName.trim() || joinInput.length < 4} onClick={() => {
              if (!myName.trim() || joinInput.length < 4) return;
              openWS();
              setTimeout(() => wsRef.current?.readyState === WebSocket.OPEN && wsRef.current!.send(JSON.stringify({ type: "pic_join", name: myName.trim(), roomCode: joinInput })), 400);
            }}>Join</PBtn>
          </div>
        </div>
        {errMsg && <p style={{ color: "#ff3b30", fontSize: 13, marginTop: 10 }}>{errMsg}</p>}
      </Card>
    </div>
  );

  // ─── LOBBY ────────────────────────────────────────────────────────────────
  if (screen === "lobby") return (
    <div style={panelStyle}>
      <Link href="/"><span style={{ position: "absolute", top: 16, left: 20, color: "rgba(255,255,255,0.3)", fontSize: 14, cursor: "pointer" }}>← Hub</span></Link>
      <h2 style={{ fontSize: 28, fontWeight: 900, color: "#c084fc", marginBottom: 4 }}>🎨 DrawIt Lobby</h2>
      <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: 6, color: "#ffd700", marginBottom: 24 }}>{roomCode}</div>
      <Card style={{ maxWidth: 480 }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>PLAYERS ({players.length}/8)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {players.map((p, i) => (
              <div key={p.idx} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "rgba(255,255,255,0.05)", borderRadius: 10, border: p.idx === myIdx ? "1px solid rgba(192,132,252,0.4)" : "1px solid transparent" }}>
                <span style={{ fontSize: 18 }}>{["🎨","✏️","🖌️","🖍️","🎭","🎪","🎯","🎲"][i % 8]}</span>
                <span style={{ flex: 1, fontWeight: 700 }}>{p.name}</span>
                {i === 0 && <span style={{ fontSize: 11, color: "#ffd700", fontWeight: 700 }}>HOST</span>}
                {p.idx === myIdx && <span style={{ fontSize: 11, color: "#c084fc", fontWeight: 700 }}>YOU</span>}
              </div>
            ))}
          </div>
        </div>
        {isHost && (
          <div style={{ marginBottom: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>ROUNDS</div>
              <div style={{ display: "flex", gap: 6 }}>
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setSettings(s => ({ ...s, rounds: n }))}
                    style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: `1px solid ${settings.rounds === n ? "#c084fc" : "rgba(255,255,255,0.1)"}`, background: settings.rounds === n ? "rgba(192,132,252,0.2)" : "transparent", color: settings.rounds === n ? "#c084fc" : "rgba(255,255,255,0.5)", cursor: "pointer", fontWeight: 700, fontSize: 16 }}>{n}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>TIMER (seconds)</div>
              <div style={{ display: "flex", gap: 6 }}>
                {[30, 45, 60].map(n => (
                  <button key={n} onClick={() => setSettings(s => ({ ...s, timerSeconds: n }))}
                    style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: `1px solid ${settings.timerSeconds === n ? "#38bdf8" : "rgba(255,255,255,0.1)"}`, background: settings.timerSeconds === n ? "rgba(56,189,248,0.15)" : "transparent", color: settings.timerSeconds === n ? "#38bdf8" : "rgba(255,255,255,0.5)", cursor: "pointer", fontWeight: 700 }}>{n}s</button>
                ))}
              </div>
            </div>
          </div>
        )}
        {isHost
          ? <PBtn color="#6d28d9" disabled={players.length < 2} onClick={() => send({ type: "pic_start", rounds: settings.rounds, timerSeconds: settings.timerSeconds })}>
              {players.length < 2 ? "Waiting for players…" : "▶ Start Game"}
            </PBtn>
          : <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center" }}>Waiting for host to start…</p>
        }
      </Card>
    </div>
  );

  // ─── RESULTS ─────────────────────────────────────────────────────────────
  if (screen === "results") {
    const sorted = [...finalPlayers].sort((a, b) => b.score - a.score);
    return (
      <div style={panelStyle}>
        <Link href="/"><span style={{ position: "absolute", top: 16, left: 20, color: "rgba(255,255,255,0.3)", fontSize: 14, cursor: "pointer" }}>← Hub</span></Link>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🏆</div>
        <h2 style={{ fontSize: 32, fontWeight: 900, color: "#ffd700", marginBottom: 28 }}>Game Over!</h2>
        <Card style={{ maxWidth: 420 }}>
          {sorted.map((p, i) => (
            <div key={p.idx} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: i < sorted.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
              <span style={{ fontSize: 24, width: 36, textAlign: "center" }}>{["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣"][i]}</span>
              <span style={{ flex: 1, fontWeight: 800, fontSize: 17 }}>{p.name}{p.idx === myIdx ? " (You)" : ""}</span>
              <span style={{ fontWeight: 900, fontSize: 20, color: "#ffd700" }}>{p.score} pts</span>
            </div>
          ))}
          <PBtn color="#6d28d9" onClick={() => { wsRef.current?.close(); setScreen("landing"); setPlayers([]); setFinalPlayers([]); }}>
            Play Again
          </PBtn>
        </Card>
      </div>
    );
  }

  // ─── GAME ─────────────────────────────────────────────────────────────────
  const drawer = players.find(p => p.idx === drawerIdx);

  return (
    <div style={{ minHeight: "100vh", background: "#0c0c14", display: "flex", flexDirection: "column", fontFamily: "'Segoe UI', sans-serif", color: "#fff", overflow: "hidden" }}>
      <Link href="/"><span style={{ position: "absolute", top: 8, left: 12, color: "rgba(255,255,255,0.2)", fontSize: 12, cursor: "pointer", zIndex: 50 }}>← Hub</span></Link>

      {/* ── TOP BAR ─────────────────────────────────────────────────── */}
      <div style={{ background: "rgba(0,0,0,0.6)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "8px 16px", display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>Round {round}/{totalRounds}</span>
        <div style={{ flex: 1, textAlign: "center" }}>
          {phase === "drawing" && (
            isDrawer
              ? <span style={{ fontWeight: 900, fontSize: 18, color: DIFF_COLORS[myDrawDiff] }}>
                  {myDrawWord} <span style={{ fontSize: 12, opacity: 0.7 }}>({myDrawDiff}, {DIFF_PTS[myDrawDiff]}pt)</span>
                </span>
              : <span style={{ fontWeight: 900, fontSize: 18, letterSpacing: 5, color: "#c084fc" }}>{wordHint}</span>
          )}
          {phase === "word_select" && <span style={{ color: "rgba(255,255,255,0.5)" }}>{isDrawer ? "Choose a word to draw…" : `${drawer?.name ?? "?"} is choosing a word…`}</span>}
          {phase === "scoring" && <span style={{ color: "#ff9500" }}>{isDrawer ? "Review and confirm scores ↓" : `${drawer?.name ?? "?"} is confirming scores…`}</span>}
          {phase === "between" && turnEndInfo && <span style={{ color: "#ffd700", fontWeight: 800 }}>The word was: <em>{turnEndInfo.word}</em></span>}
        </div>
        {/* Timer */}
        {phase === "drawing" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 900, fontSize: 22, color: timerColor, minWidth: 38, textAlign: "right" }}>{timerLeft}</span>
            {isDrawer && <PBtn small color="#555" onClick={endTurn}>End Turn</PBtn>}
          </div>
        )}
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>{roomCode}</span>
      </div>

      {/* Timer bar */}
      {phase === "drawing" && (
        <div style={{ height: 4, background: "rgba(255,255,255,0.1)" }}>
          <div style={{ height: "100%", width: `${timerPct}%`, background: timerColor, transition: "width 0.25s linear, background 0.5s" }} />
        </div>
      )}

      {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Canvas area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 12, position: "relative" }}>
            <canvas
              ref={canvasRef}
              width={CW} height={CH}
              style={{ maxWidth: "100%", maxHeight: "100%", aspectRatio: `${CW}/${CH}`, border: "2px solid rgba(255,255,255,0.1)", borderRadius: 8, background: "#fff", cursor: isDrawer && phase === "drawing" ? (tool === "fill" ? "crosshair" : tool === "eraser" ? "cell" : "crosshair") : "default", touchAction: "none" }}
              onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseLeave}
              onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
            />

            {/* ── WORD SELECTION MODAL ─────────────────────────── */}
            {phase === "word_select" && isDrawer && wordOpts && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, borderRadius: 8 }}>
                <h3 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Choose a word to draw</h3>
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, margin: 0 }}>You earn the same points as the guesser who gets it right!</p>
                {(["easy","medium","hard"] as Diff[]).map(d => (
                  <button key={d} onClick={() => selectWord(d)} style={{
                    width: 280, padding: "16px 24px", borderRadius: 14, border: `2px solid ${DIFF_COLORS[d]}44`,
                    background: `${DIFF_COLORS[d]}18`, cursor: "pointer", textAlign: "center",
                    transition: "transform 0.1s, background 0.1s",
                  }}
                    onMouseEnter={e => { (e.target as HTMLElement).style.background = `${DIFF_COLORS[d]}35`; (e.target as HTMLElement).style.transform = "scale(1.03)"; }}
                    onMouseLeave={e => { (e.target as HTMLElement).style.background = `${DIFF_COLORS[d]}18`; (e.target as HTMLElement).style.transform = "scale(1)"; }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>{wordOpts[d]}</div>
                    <div style={{ fontSize: 13, color: DIFF_COLORS[d], fontWeight: 700, marginTop: 4 }}>{DIFF_LABELS[d]}</div>
                  </button>
                ))}
              </div>
            )}

            {/* ── SCORING MODAL (drawer) ───────────────────────── */}
            {phase === "scoring" && isDrawer && scoringInfo && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, borderRadius: 8, padding: 24, overflowY: "auto" }}>
                <h3 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>Confirm Scores</h3>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, margin: 0 }}>Your word was: <strong style={{ color: "#ffd700" }}>{myDrawWord}</strong></p>

                {/* Difficulty */}
                <div style={{ display: "flex", gap: 8 }}>
                  {(["easy","medium","hard"] as Diff[]).map(d => (
                    <button key={d} onClick={() => setScoringDiff(d)} style={{
                      padding: "7px 16px", borderRadius: 10, border: `1px solid ${scoringDiff === d ? DIFF_COLORS[d] : "rgba(255,255,255,0.12)"}`,
                      background: scoringDiff === d ? DIFF_COLORS[d] + "33" : "transparent",
                      color: scoringDiff === d ? DIFF_COLORS[d] : "rgba(255,255,255,0.5)",
                      cursor: "pointer", fontWeight: 700, fontSize: 13,
                    }}>{d} ({DIFF_PTS[d]}pt)</button>
                  ))}
                </div>

                {/* Chat log to help identify correct guessers */}
                {scoringInfo.chatLog.length > 0 && (
                  <div style={{ width: "100%", maxWidth: 380, maxHeight: 120, overflowY: "auto", background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "8px 12px" }}>
                    {scoringInfo.chatLog.map((m, i) => (
                      <div key={i} style={{ fontSize: 12, marginBottom: 3 }}>
                        <span style={{ fontWeight: 700, color: "#c084fc" }}>{m.name}: </span>
                        <span style={{ color: "rgba(255,255,255,0.75)" }}>{m.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Guesser checkboxes */}
                <div style={{ width: "100%", maxWidth: 380 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>WHO GUESSED CORRECTLY?</div>
                  {scoringInfo.players.map(p => (
                    <label key={p.idx} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: selWinners.has(p.idx) ? "rgba(52,199,89,0.15)" : "rgba(255,255,255,0.04)", marginBottom: 6, cursor: "pointer", border: `1px solid ${selWinners.has(p.idx) ? "#34c759" : "rgba(255,255,255,0.08)"}` }}>
                      <input type="checkbox" checked={selWinners.has(p.idx)} onChange={e => {
                        setSelWinners(prev => { const next = new Set(prev); e.target.checked ? next.add(p.idx) : next.delete(p.idx); return next; });
                      }} style={{ width: 18, height: 18, accentColor: "#34c759" }} />
                      <span style={{ fontWeight: 700 }}>{p.name}</span>
                      <span style={{ marginLeft: "auto", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{p.score} pts so far</span>
                    </label>
                  ))}
                </div>
                <PBtn color="#34c759" onClick={submitScore}>✓ Confirm Scores (+{DIFF_PTS[scoringDiff]}pt each)</PBtn>
              </div>
            )}

            {/* ── TURN END REVEAL ──────────────────────────────── */}
            {phase === "between" && turnEndInfo && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 42 }}>🎉</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>The word was</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: "#ffd700" }}>{turnEndInfo.word}</div>
                <div style={{ fontSize: 13, color: DIFF_COLORS[turnEndInfo.diff] }}>
                  {turnEndInfo.diff} · {DIFF_PTS[turnEndInfo.diff]} point{DIFF_PTS[turnEndInfo.diff] !== 1 ? "s" : ""}
                </div>
                {turnEndInfo.scoresDelta.length > 0 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                    {turnEndInfo.scoresDelta.map(d => {
                      const p = players.find(x => x.idx === d.idx);
                      return <div key={d.idx} style={{ padding: "4px 14px", background: "rgba(52,199,89,0.2)", borderRadius: 20, fontSize: 13, color: "#34c759", fontWeight: 700 }}>+{d.delta} {p?.name}</div>;
                    })}
                  </div>
                )}
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>Next turn starting…</div>
              </div>
            )}

            {/* ── WAITING (non-drawer during scoring) ─────────── */}
            {phase === "scoring" && !isDrawer && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 8 }}>
                <div style={{ fontSize: 32 }}>⏳</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{drawer?.name ?? "Drawer"} is confirming scores…</div>
              </div>
            )}
          </div>

          {/* ── DRAWING TOOLBAR ─────────────────────────────────────── */}
          {isDrawer && phase === "drawing" && (
            <div style={{ background: "#111118", borderTop: "1px solid rgba(255,255,255,0.08)", padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              {/* Tools */}
              <div style={{ display: "flex", gap: 6 }}>
                {(["pen","eraser","fill"] as const).map(t => (
                  <button key={t} onClick={() => setTool(t)} title={t} style={{ width: 36, height: 36, borderRadius: 8, border: `2px solid ${tool === t ? "#c084fc" : "rgba(255,255,255,0.15)"}`, background: tool === t ? "rgba(192,132,252,0.25)" : "rgba(255,255,255,0.05)", color: "#fff", cursor: "pointer", fontSize: 16 }}>
                    {t === "pen" ? "✏️" : t === "eraser" ? "⬜" : "🪣"}
                  </button>
                ))}
              </div>
              <div style={{ width: 1, height: 30, background: "rgba(255,255,255,0.12)" }} />
              {/* Colors */}
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 200 }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => { setColor(c); setTool("pen"); }} style={{ width: 22, height: 22, borderRadius: 4, background: c, border: color === c ? "2px solid #fff" : "1px solid rgba(255,255,255,0.2)", cursor: "pointer", padding: 0 }} />
                ))}
              </div>
              {/* Custom color */}
              <input type="color" value={color} onChange={e => { setColor(e.target.value); setTool("pen"); }}
                style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer", padding: 0, background: "transparent" }} title="Custom color" />
              <div style={{ width: 1, height: 30, background: "rgba(255,255,255,0.12)" }} />
              {/* Sizes */}
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {SIZES.map(s => (
                  <button key={s} onClick={() => setSize(s)} style={{ width: s < 10 ? 24 : 36, height: s < 10 ? 24 : 36, borderRadius: "50%", background: size === s ? "#c084fc" : "rgba(255,255,255,0.15)", border: size === s ? "2px solid #fff" : "1px solid rgba(255,255,255,0.2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: Math.min(s, 14), height: Math.min(s, 14), borderRadius: "50%", background: size === s ? "#fff" : "rgba(255,255,255,0.7)" }} />
                  </button>
                ))}
              </div>
              <div style={{ width: 1, height: 30, background: "rgba(255,255,255,0.12)" }} />
              {/* Undo / Clear */}
              <button onClick={doUndo} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>↩ Undo</button>
              <button onClick={doClear} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,69,0,0.4)", background: "rgba(255,69,0,0.1)", color: "#ff6347", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>🗑 Clear</button>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ─────────────────────────────────────────────── */}
        <div style={{ width: 240, borderLeft: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", background: "#0a0a12" }}>
          {/* Scores */}
          <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>SCORES</div>
            {[...players].sort((a, b) => b.score - a.score).map(p => (
              <div key={p.idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                {p.idx === drawerIdx && <span title="Drawing">🎨</span>}
                {p.idx !== drawerIdx && <span style={{ width: 18, display: "inline-block" }} />}
                <span style={{ flex: 1, fontSize: 13, fontWeight: p.idx === myIdx ? 800 : 500, color: p.idx === myIdx ? "#c084fc" : "rgba(255,255,255,0.8)" }}>{p.name}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#ffd700" }}>{p.score}</span>
              </div>
            ))}
          </div>

          {/* Chat / Drawer counter */}
          {isDrawer ? (
            <div style={{ flex: 1, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 700, letterSpacing: 1 }}>GUESSES</div>
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 48, fontWeight: 900, color: guessCount > 0 ? "#34c759" : "rgba(255,255,255,0.2)" }}>{guessCount}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>message{guessCount !== 1 ? "s" : ""} sent</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 6 }}>You can't see guesses<br />until scoring time</div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ flex: 1, padding: "8px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                {chat.map((m, i) => (
                  <div key={i} style={{ fontSize: 13, padding: "5px 8px", borderRadius: 8, background: "rgba(255,255,255,0.04)" }}>
                    <span style={{ fontWeight: 700, color: "#c084fc" }}>{m.name}: </span>
                    <span style={{ color: "rgba(255,255,255,0.75)" }}>{m.text}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={sendChat} style={{ padding: "8px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 6 }}>
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type your guess…" maxLength={100} disabled={phase !== "drawing"}
                  style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 13, outline: "none" }} />
                <button type="submit" disabled={!chatInput.trim() || phase !== "drawing"}
                  style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#6d28d9", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>➤</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
