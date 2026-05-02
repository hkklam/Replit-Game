import { useState, useCallback, useEffect, useRef } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useOnlineMultiplayer } from "../lib/multiplayer";
import { OnlineLobby } from "../components/OnlineLobby";

function Shell({ title, controls, children }: { title: string; controls?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-4 px-4 py-3 border-b border-violet-500/30 bg-gradient-to-r from-violet-950/60 to-transparent">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Hub</span>
        </Link>
        <span className="text-2xl select-none" style={{ filter: "drop-shadow(0 0 8px #a78bfa80)" }}>♟️</span>
        <h1 className="text-lg font-bold text-violet-400">{title}</h1>
        {controls && <span className="text-xs text-muted-foreground ml-auto hidden sm:block">{controls}</span>}
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">{children}</div>
    </div>
  );
}

// ─── types ────────────────────────────────────────────────────────────────────
type PType = "P" | "N" | "B" | "R" | "Q" | "K";
type Color = "w" | "b";
type Piece = { type: PType; color: Color };
type Square = Piece | null;
type Board = Square[][];
type Castling = { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean };
type Move = { from: [number, number]; to: [number, number]; promo?: PType; castle?: "K" | "Q"; ep?: boolean };
type AIDiff = "easy" | "medium" | "hard";
type Mode = "ai" | "local" | "online";
type Screen = "menu" | "setup" | "online-lobby" | "game";

// ─── constants ────────────────────────────────────────────────────────────────
const INIT_BOARD: Board = (() => {
  const b: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
  const order: PType[] = ["R", "N", "B", "Q", "K", "B", "N", "R"];
  order.forEach((t, c) => { b[0][c] = { type: t, color: "b" }; b[7][c] = { type: t, color: "w" }; });
  for (let c = 0; c < 8; c++) { b[1][c] = { type: "P", color: "b" }; b[6][c] = { type: "P", color: "w" }; }
  return b;
})();
const INIT_CASTLING: Castling = { wK: true, wQ: true, bK: true, bQ: true };

const PIECE_VALS: Record<PType, number> = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };
const SYMBOLS: Record<Color, Record<PType, string>> = {
  w: { K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙" },
  b: { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" },
};

const PST: Record<PType, number[][]> = {
  P: [[0,0,0,0,0,0,0,0],[50,50,50,50,50,50,50,50],[10,10,20,30,30,20,10,10],[5,5,10,25,25,10,5,5],[0,0,0,20,20,0,0,0],[5,-5,-10,0,0,-10,-5,5],[5,10,10,-20,-20,10,10,5],[0,0,0,0,0,0,0,0]],
  N: [[-50,-40,-30,-30,-30,-30,-40,-50],[-40,-20,0,0,0,0,-20,-40],[-30,0,10,15,15,10,0,-30],[-30,5,15,20,20,15,5,-30],[-30,0,15,20,20,15,0,-30],[-30,5,10,15,15,10,5,-30],[-40,-20,0,5,5,0,-20,-40],[-50,-40,-30,-30,-30,-30,-40,-50]],
  B: [[-20,-10,-10,-10,-10,-10,-10,-20],[-10,0,0,0,0,0,0,-10],[-10,0,5,10,10,5,0,-10],[-10,5,5,10,10,5,5,-10],[-10,0,10,10,10,10,0,-10],[-10,10,10,10,10,10,10,-10],[-10,5,0,0,0,0,5,-10],[-20,-10,-10,-10,-10,-10,-10,-20]],
  R: [[0,0,0,0,0,0,0,0],[5,10,10,10,10,10,10,5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[0,0,0,5,5,0,0,0]],
  Q: [[-20,-10,-10,-5,-5,-10,-10,-20],[-10,0,0,0,0,0,0,-10],[-10,0,5,5,5,5,0,-10],[-5,0,5,5,5,5,0,-5],[0,0,5,5,5,5,0,-5],[-10,5,5,5,5,5,0,-10],[-10,0,5,0,0,0,0,-10],[-20,-10,-10,-5,-5,-10,-10,-20]],
  K: [[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-20,-30,-30,-40,-40,-30,-30,-20],[-10,-20,-20,-20,-20,-20,-20,-10],[20,20,0,0,0,0,20,20],[20,30,10,0,0,10,30,20]],
};

const TIME_CONTROLS = [
  { label: "Bullet", icon: "⚡", secs: 60,  desc: "1 min" },
  { label: "Blitz",  icon: "🔥", secs: 300, desc: "5 min" },
  { label: "Rapid",  icon: "⏱",  secs: 600, desc: "10 min" },
  { label: "∞ Free", icon: "♾️",  secs: 0,   desc: "No clock" },
];

// ─── board helpers ────────────────────────────────────────────────────────────
function cloneBoard(b: Board): Board { return b.map(r => r.map(sq => sq ? { ...sq } : null)); }
function findKing(b: Board, color: Color): [number, number] {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (b[r][c]?.type === "K" && b[r][c]?.color === color) return [r, c];
  return [-1, -1];
}

// ─── fast check detection ─────────────────────────────────────────────────────
function isSquareAttacked(board: Board, r: number, c: number, byColor: Color): boolean {
  const opp = byColor;
  for (const [dr, dc] of [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]]) {
    const rr = r+dr, cc = c+dc;
    if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && board[rr][cc]?.type === "N" && board[rr][cc]?.color === opp) return true;
  }
  for (const [dr, dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
    for (let i = 1; i < 8; i++) {
      const rr = r+dr*i, cc = c+dc*i;
      if (rr < 0 || rr >= 8 || cc < 0 || cc >= 8) break;
      const p = board[rr][cc]; if (!p) continue;
      if (p.color === opp && (p.type === "B" || p.type === "Q")) return true;
      break;
    }
  }
  for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    for (let i = 1; i < 8; i++) {
      const rr = r+dr*i, cc = c+dc*i;
      if (rr < 0 || rr >= 8 || cc < 0 || cc >= 8) break;
      const p = board[rr][cc]; if (!p) continue;
      if (p.color === opp && (p.type === "R" || p.type === "Q")) return true;
      break;
    }
  }
  const pawnRow = byColor === "w" ? r + 1 : r - 1;
  if (pawnRow >= 0 && pawnRow < 8) for (const dc of [-1, 1]) {
    const cc = c + dc;
    if (cc >= 0 && cc < 8 && board[pawnRow][cc]?.type === "P" && board[pawnRow][cc]?.color === opp) return true;
  }
  for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
    const rr = r+dr, cc = c+dc;
    if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && board[rr][cc]?.type === "K" && board[rr][cc]?.color === opp) return true;
  }
  return false;
}

function isInCheck(board: Board, color: Color): boolean {
  const [kr, kc] = findKing(board, color);
  if (kr < 0) return true;
  return isSquareAttacked(board, kr, kc, color === "w" ? "b" : "w");
}

// ─── move generation ──────────────────────────────────────────────────────────
function pseudoMoves(board: Board, r: number, c: number, castling: Castling, ep: [number, number] | null): Move[] {
  const p = board[r][c]; if (!p) return [];
  const { type, color } = p;
  const opp: Color = color === "w" ? "b" : "w";
  const moves: Move[] = [];
  const inb = (rr: number, cc: number) => rr >= 0 && rr < 8 && cc >= 0 && cc < 8;
  const tryAdd = (tr: number, tc: number) => { if (inb(tr, tc) && board[tr][tc]?.color !== color) moves.push({ from: [r, c], to: [tr, tc] }); };
  const slide = (dr: number, dc: number) => {
    for (let i = 1; i < 8; i++) {
      const rr = r+dr*i, cc = c+dc*i;
      if (!inb(rr, cc)) break;
      if (board[rr][cc]?.color === color) break;
      moves.push({ from: [r, c], to: [rr, cc] });
      if (board[rr][cc]) break;
    }
  };

  if (type === "P") {
    const dir = color === "w" ? -1 : 1;
    const startRow = color === "w" ? 6 : 1;
    const promoRow = color === "w" ? 0 : 7;
    if (inb(r+dir, c) && !board[r+dir][c]) {
      if (r+dir === promoRow) { (["Q","R","B","N"] as PType[]).forEach(pr => moves.push({ from:[r,c], to:[r+dir,c], promo:pr })); }
      else {
        moves.push({ from:[r,c], to:[r+dir,c] });
        if (r === startRow && !board[r+dir*2][c]) moves.push({ from:[r,c], to:[r+dir*2,c] });
      }
    }
    for (const dc of [-1, 1]) {
      if (!inb(r+dir, c+dc)) continue;
      if (board[r+dir][c+dc]?.color === opp) {
        if (r+dir === promoRow) (["Q","R","B","N"] as PType[]).forEach(pr => moves.push({ from:[r,c], to:[r+dir,c+dc], promo:pr }));
        else moves.push({ from:[r,c], to:[r+dir,c+dc] });
      }
      if (ep && ep[0] === r+dir && ep[1] === c+dc) moves.push({ from:[r,c], to:[r+dir,c+dc], ep:true });
    }
  } else if (type === "N") {
    [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]].forEach(([dr,dc]) => tryAdd(r+dr, c+dc));
  } else if (type === "B") {
    [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc]) => slide(dr, dc));
  } else if (type === "R") {
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc]) => slide(dr, dc));
  } else if (type === "Q") {
    [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc]) => slide(dr, dc));
  } else if (type === "K") {
    [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc]) => tryAdd(r+dr, c+dc));
    if (color === "w" && r === 7 && c === 4) {
      if (castling.wK && !board[7][5] && !board[7][6] && board[7][7]?.type === "R" && board[7][7]?.color === "w") moves.push({ from:[7,4], to:[7,6], castle:"K" });
      if (castling.wQ && !board[7][3] && !board[7][2] && !board[7][1] && board[7][0]?.type === "R" && board[7][0]?.color === "w") moves.push({ from:[7,4], to:[7,2], castle:"Q" });
    }
    if (color === "b" && r === 0 && c === 4) {
      if (castling.bK && !board[0][5] && !board[0][6] && board[0][7]?.type === "R" && board[0][7]?.color === "b") moves.push({ from:[0,4], to:[0,6], castle:"K" });
      if (castling.bQ && !board[0][3] && !board[0][2] && !board[0][1] && board[0][0]?.type === "R" && board[0][0]?.color === "b") moves.push({ from:[0,4], to:[0,2], castle:"Q" });
    }
  }
  return moves;
}

function applyMove(board: Board, move: Move, castling: Castling, ep: [number, number] | null): { board: Board; castling: Castling; ep: [number, number] | null } {
  const nb = cloneBoard(board);
  const [fr, fc] = move.from; const [tr, tc] = move.to;
  const p = nb[fr][fc]!;
  const nc = { ...castling };
  if (p.type === "K") { if (p.color === "w") { nc.wK = false; nc.wQ = false; } else { nc.bK = false; nc.bQ = false; } }
  if (fr === 7 && fc === 7) nc.wK = false; if (fr === 7 && fc === 0) nc.wQ = false;
  if (fr === 0 && fc === 7) nc.bK = false; if (fr === 0 && fc === 0) nc.bQ = false;
  if (tr === 7 && tc === 7) nc.wK = false; if (tr === 7 && tc === 0) nc.wQ = false;
  if (tr === 0 && tc === 7) nc.bK = false; if (tr === 0 && tc === 0) nc.bQ = false;
  if (move.ep && ep) nb[fr][ep[1]] = null;
  if (move.castle) { if (move.castle === "K") { nb[fr][5] = nb[fr][7]; nb[fr][7] = null; } else { nb[fr][3] = nb[fr][0]; nb[fr][0] = null; } }
  nb[tr][tc] = move.promo ? { type: move.promo, color: p.color } : { ...p };
  nb[fr][fc] = null;
  let nep: [number, number] | null = null;
  if (p.type === "P" && Math.abs(tr - fr) === 2) nep = [(fr + tr) / 2, fc];
  return { board: nb, castling: nc, ep: nep };
}

function legalMoves(board: Board, color: Color, castling: Castling, ep: [number, number] | null): Move[] {
  const moves: Move[] = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (board[r][c]?.color !== color) continue;
    for (const m of pseudoMoves(board, r, c, castling, ep)) {
      if (m.castle) {
        const passC = m.castle === "K" ? 5 : 3;
        if (isSquareAttacked(board, r, 4, color === "w" ? "b" : "w")) continue;
        if (isSquareAttacked(board, r, passC, color === "w" ? "b" : "w")) continue;
      }
      const { board: nb } = applyMove(board, m, castling, ep);
      if (!isInCheck(nb, color)) moves.push(m);
    }
  }
  return moves;
}

// ─── AI ───────────────────────────────────────────────────────────────────────
function evalBoard(board: Board): number {
  let s = 0;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = board[r][c]; if (!p) continue;
    const pr = p.color === "w" ? r : 7 - r;
    s += p.color === "w" ? PIECE_VALS[p.type] + PST[p.type][pr][c] : -(PIECE_VALS[p.type] + PST[p.type][pr][c]);
  }
  return s;
}

function minimax(board: Board, castling: Castling, ep: [number, number] | null, depth: number, alpha: number, beta: number, maximizing: boolean): number {
  if (depth === 0) return evalBoard(board);
  const color: Color = maximizing ? "w" : "b";
  const moves = legalMoves(board, color, castling, ep);
  if (!moves.length) return isInCheck(board, color) ? (maximizing ? -99999 : 99999) : 0;
  let best = maximizing ? -Infinity : Infinity;
  for (const m of moves) {
    const { board: nb, castling: nc, ep: nep } = applyMove(board, m, castling, ep);
    const val = minimax(nb, nc, nep, depth - 1, alpha, beta, !maximizing);
    if (maximizing) { best = Math.max(best, val); alpha = Math.max(alpha, val); }
    else { best = Math.min(best, val); beta = Math.min(beta, val); }
    if (beta <= alpha) break;
  }
  return best;
}

function getBestMove(board: Board, castling: Castling, ep: [number, number] | null, depth: number, color: Color): Move | null {
  const moves = legalMoves(board, color, castling, ep);
  if (!moves.length) return null;
  if (depth === 0) return moves[Math.floor(Math.random() * moves.length)];
  const shuffled = [...moves].sort(() => Math.random() - 0.5);
  let best: Move | null = null;
  let bestVal = color === "b" ? Infinity : -Infinity;
  for (const m of shuffled) {
    const { board: nb, castling: nc, ep: nep } = applyMove(board, m, castling, ep);
    const val = minimax(nb, nc, nep, depth - 1, -Infinity, Infinity, color === "b");
    if ((color === "b" && val < bestVal) || (color === "w" && val > bestVal)) { bestVal = val; best = m; }
  }
  return best;
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmtTime(s: number): string { const m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2, "0")}`; }

// ─── component ────────────────────────────────────────────────────────────────
export default function Chess() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [mode, setMode] = useState<Mode>("ai");
  const [aiDiff, setAiDiff] = useState<AIDiff>("medium");
  const [timeSecs, setTimeSecs] = useState(300);

  const [board, setBoard] = useState<Board>(cloneBoard(INIT_BOARD));
  const [turn, setTurn] = useState<Color>("w");
  const [castling, setCastling] = useState<Castling>(INIT_CASTLING);
  const [ep, setEp] = useState<[number, number] | null>(null);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [legalMs, setLegalMs] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [inCheck, setInCheck] = useState(false);
  const [status, setStatus] = useState("⬜ White's turn");
  const [gameOver, setGameOver] = useState(false);
  const [captured, setCaptured] = useState<{ w: Piece[]; b: Piece[] }>({ w: [], b: [] });
  const [promoTarget, setPromoTarget] = useState<[number, number] | null>(null);
  const [wTime, setWTime] = useState(300);
  const [bTime, setBTime] = useState(300);

  // Refs for AI / online callbacks (avoid stale closures)
  const boardRef = useRef(board); boardRef.current = board;
  const turnRef = useRef(turn); turnRef.current = turn;
  const castlingRef = useRef(castling); castlingRef.current = castling;
  const epRef = useRef(ep); epRef.current = ep;
  const capturedRef = useRef(captured); capturedRef.current = captured;
  const gameOverRef = useRef(gameOver); gameOverRef.current = gameOver;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── online multiplayer ───────────────────────────────────────────────────
  const performMoveRef = useRef<((b: Board, t: Color, c: Castling, e: [number,number]|null, cap: {w:Piece[];b:Piece[]}, m: Move) => void) | null>(null);

  const mp = useOnlineMultiplayer({
    onGuestJoined: useCallback(() => setScreen("game"), []),
    onInput: useCallback((data: unknown) => {
      const inp = data as { from: [number,number]; to: [number,number]; promo?: PType };
      if (!inp?.from || !inp?.to) return;
      const move: Move = { from: inp.from, to: inp.to, promo: inp.promo };
      performMoveRef.current?.(boardRef.current, turnRef.current, castlingRef.current, epRef.current, capturedRef.current, move);
    }, []),
    onGameState: useCallback((data: unknown) => {
      const s = data as { board: Board; castling: Castling };
      if (s?.board) { setBoard(s.board); setCastling(s.castling ?? INIT_CASTLING); }
    }, []),
    onOpponentLeft: useCallback(() => { setStatus("Opponent disconnected"); setGameOver(true); }, []),
  });

  // ─── core move function ───────────────────────────────────────────────────
  const performMove = useCallback((b: Board, t: Color, c: Castling, e: [number,number]|null, cap: {w:Piece[];b:Piece[]}, move: Move) => {
    const { board: nb, castling: nc, ep: nep } = applyMove(b, move, c, e);
    const opp: Color = t === "w" ? "b" : "w";
    const nc2 = { w: [...cap.w], b: [...cap.b] };
    const capPiece = b[move.to[0]][move.to[1]];
    if (capPiece) nc2[t === "w" ? "b" : "w"].push(capPiece);
    if (move.ep && e) { const epc = b[move.from[0]][e[1]]; if (epc) nc2[t === "w" ? "b" : "w"].push(epc); }
    const oppMs = legalMoves(nb, opp, nc, nep);
    const oppCheck = isInCheck(nb, opp);
    let st = ""; let over = false;
    if (!oppMs.length) { over = true; st = oppCheck ? `${t === "w" ? "White" : "Black"} wins by checkmate! 🏆` : "Stalemate — Draw! 🤝"; }
    else if (oppCheck) st = "Check! ♟";
    else st = `${opp === "w" ? "⬜ White" : "⬛ Black"}'s turn`;
    setBoard(nb); setCastling(nc); setEp(nep); setTurn(opp);
    setCaptured(nc2); setLastMove(move); setSelected(null); setLegalMs([]);
    setInCheck(oppCheck); setStatus(st); setGameOver(over); setPromoTarget(null);
  }, []);
  performMoveRef.current = performMove;

  // ─── timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (screen !== "game" || gameOver || timeSecs === 0) return;
    timerRef.current = setInterval(() => {
      if (gameOverRef.current) { clearInterval(timerRef.current!); return; }
      if (turnRef.current === "w") {
        setWTime(t => {
          if (t <= 1) { setStatus("⬛ Black wins on time! ⏰"); setGameOver(true); gameOverRef.current = true; return 0; }
          return t - 1;
        });
      } else {
        setBTime(t => {
          if (t <= 1) { setStatus("⬜ White wins on time! ⏰"); setGameOver(true); gameOverRef.current = true; return 0; }
          return t - 1;
        });
      }
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [turn, screen, gameOver, timeSecs]);

  // ─── AI ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "ai" || turn !== "b" || gameOver || screen !== "game") return;
    const depth = aiDiff === "easy" ? 0 : aiDiff === "medium" ? 2 : 3;
    const delay = aiDiff === "easy" ? 300 : aiDiff === "medium" ? 500 : 800;
    const t = setTimeout(() => {
      if (gameOverRef.current || turnRef.current !== "b") return;
      const m = getBestMove(boardRef.current, castlingRef.current, epRef.current, depth, "b");
      if (m) performMoveRef.current?.(boardRef.current, turnRef.current, castlingRef.current, epRef.current, capturedRef.current, m);
    }, delay);
    return () => clearTimeout(t);
  }, [turn, gameOver, mode, aiDiff, screen]);

  // ─── start game ───────────────────────────────────────────────────────────
  const startGame = useCallback((m: Mode, diff?: AIDiff) => {
    const b = cloneBoard(INIT_BOARD);
    setBoard(b); setCastling(INIT_CASTLING); setEp(null); setTurn("w");
    setSelected(null); setLegalMs([]); setLastMove(null); setInCheck(false);
    setStatus("⬜ White's turn"); setGameOver(false); setCaptured({ w: [], b: [] });
    setPromoTarget(null); setWTime(timeSecs); setBTime(timeSecs);
    if (diff) setAiDiff(diff);
    if (m) setMode(m);
    setScreen("game");
    if (m === "online" && mp.role === "host") {
      setTimeout(() => mp.sendGameState({ board: b, castling: INIT_CASTLING }), 400);
    }
  }, [timeSecs, mp]);

  // ─── click handler ────────────────────────────────────────────────────────
  const handleClick = useCallback((r: number, c: number) => {
    if (gameOver) return;
    if (mode === "ai" && turn === "b") return;
    if (mode === "online") {
      const myColor = mp.role === "host" ? "w" : "b";
      if (turn !== myColor) return;
    }
    if (selected) {
      const match = legalMs.find(m => m.to[0] === r && m.to[1] === c);
      if (match) {
        const promoOptions = legalMs.filter(m => m.to[0] === r && m.to[1] === c && m.promo);
        if (promoOptions.length > 1) { setPromoTarget([r, c]); return; }
        performMove(board, turn, castling, ep, captured, match);
        if (mode === "online") mp.sendInput({ from: match.from, to: match.to, promo: match.promo });
      } else if (board[r][c]?.color === turn) {
        const ms = legalMoves(board, turn, castling, ep).filter(m => m.from[0] === r && m.from[1] === c);
        setSelected([r, c]); setLegalMs(ms);
      } else { setSelected(null); setLegalMs([]); }
    } else {
      if (board[r][c]?.color === turn) {
        const ms = legalMoves(board, turn, castling, ep).filter(m => m.from[0] === r && m.from[1] === c);
        setSelected([r, c]); setLegalMs(ms);
      }
    }
  }, [board, turn, castling, ep, captured, selected, legalMs, gameOver, mode, mp, performMove]);

  const handlePromo = useCallback((promo: PType) => {
    if (!promoTarget) return;
    const match = legalMs.find(m => m.to[0] === promoTarget[0] && m.to[1] === promoTarget[1] && m.promo === promo);
    if (!match) return;
    performMove(board, turn, castling, ep, captured, match);
    if (mode === "online") mp.sendInput({ from: match.from, to: match.to, promo });
  }, [promoTarget, legalMs, board, turn, castling, ep, captured, mode, mp, performMove]);

  // ─── screens ──────────────────────────────────────────────────────────────
  if (screen === "menu") return (
    <Shell title="Chess">
      <div className="flex flex-col items-center gap-8 text-center max-w-sm w-full">
        <div className="text-6xl select-none">♟️</div>
        <h2 className="text-2xl font-black text-violet-400">Chess</h2>
        <div className="flex flex-col gap-3 w-full">
          <button onClick={() => { setMode("ai"); setScreen("setup"); }}
            className="w-full py-4 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-300 font-black rounded-2xl transition-colors touch-manipulation">
            🤖 vs Computer
            <div className="text-xs font-normal text-muted-foreground mt-1">Choose difficulty & time control</div>
          </button>
          <button onClick={() => { setMode("local"); setScreen("setup"); }}
            className="w-full py-4 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/50 text-sky-400 font-black rounded-2xl transition-colors touch-manipulation">
            👥 Local 2 Players
            <div className="text-xs font-normal text-muted-foreground mt-1">Same device · Pass & play</div>
          </button>
          <button onClick={() => { setMode("online"); setScreen("online-lobby"); }}
            className="w-full py-4 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/50 text-indigo-300 font-black rounded-2xl transition-colors touch-manipulation">
            🌐 Online vs Friend
            <div className="text-xs font-normal text-muted-foreground mt-1">Share a room code</div>
          </button>
        </div>
      </div>
    </Shell>
  );

  if (screen === "online-lobby") return (
    <Shell title="Chess — Online">
      <OnlineLobby
        status={mp.status} roomCode={mp.roomCode} role={mp.role} error={mp.error}
        onCreate={() => { mp.createRoom("chess"); startGame("online"); }}
        onJoin={code => { mp.joinRoom(code); startGame("online"); }}
        onDisconnect={() => { mp.disconnect(); setScreen("menu"); }}
        onBack={() => { mp.disconnect(); setScreen("menu"); }}
      />
    </Shell>
  );

  if (screen === "setup") return (
    <Shell title={mode === "ai" ? "Chess — vs Computer" : "Chess — Local 2P"}>
      <div className="flex flex-col items-center gap-5 max-w-sm w-full">
        {mode === "ai" && (
          <>
            <h2 className="text-xl font-black text-purple-400">🤖 AI Difficulty</h2>
            <div className="flex flex-col gap-2 w-full">
              {([["easy","🟢","Random moves — great for beginners"],["medium","🟡","Thinks 2 moves ahead"],["hard","🔴","Thinks 3+ moves ahead with evaluation"]] as [AIDiff,string,string][]).map(([d,icon,desc]) => (
                <button key={d} onClick={() => setAiDiff(d)}
                  className={`w-full py-3 px-4 rounded-xl border font-bold text-left flex items-center gap-3 transition-colors touch-manipulation ${
                    aiDiff === d
                      ? d === "easy" ? "bg-green-500/25 border-green-400 text-green-300"
                      : d === "medium" ? "bg-amber-500/25 border-amber-400 text-amber-300"
                      : "bg-red-500/25 border-red-400 text-red-300"
                      : "bg-secondary border-border text-muted-foreground hover:border-foreground"
                  }`}>
                  <span className="text-xl">{icon}</span>
                  <div><div className="font-black capitalize">{d}</div><div className="text-xs font-normal opacity-80">{desc}</div></div>
                  {aiDiff === d && <span className="ml-auto text-xs">✓</span>}
                </button>
              ))}
            </div>
          </>
        )}
        <h2 className="text-xl font-black text-violet-400 mt-1">⏱ Time Control</h2>
        <div className="grid grid-cols-2 gap-2 w-full">
          {TIME_CONTROLS.map(tc => (
            <button key={tc.label} onClick={() => setTimeSecs(tc.secs)}
              className={`py-3 px-4 rounded-xl border font-bold flex items-center gap-2 transition-colors touch-manipulation ${
                timeSecs === tc.secs ? "bg-violet-500/25 border-violet-400 text-violet-300" : "bg-secondary border-border text-muted-foreground hover:border-foreground"
              }`}>
              <span>{tc.icon}</span>
              <div className="text-left"><div className="text-sm font-black">{tc.label}</div><div className="text-xs font-normal opacity-80">{tc.desc}</div></div>
              {timeSecs === tc.secs && <span className="ml-auto text-xs">✓</span>}
            </button>
          ))}
        </div>
        <button onClick={() => startGame(mode)}
          className="w-full py-4 bg-violet-600 hover:bg-violet-500 text-white font-black rounded-2xl transition-colors text-lg touch-manipulation mt-2">
          ♟ Start Game
        </button>
        <button onClick={() => setScreen("menu")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</button>
      </div>
    </Shell>
  );

  // ─── game screen ──────────────────────────────────────────────────────────
  const flipped = mode === "online" && mp.role === "guest";
  const myColor: Color | null = mode === "online" ? (mp.role === "host" ? "w" : "b") : null;
  const isMyTurn = myColor === null || turn === myColor;
  const aiThinking = mode === "ai" && turn === "b" && !gameOver;

  const files = flipped ? ["h","g","f","e","d","c","b","a"] : ["a","b","c","d","e","f","g","h"];

  const wCap = captured.w.map(p => SYMBOLS[p.color][p.type]).join("");
  const bCap = captured.b.map(p => SYMBOLS[p.color][p.type]).join("");
  const wMat = captured.w.reduce((s, p) => s + PIECE_VALS[p.type], 0);
  const bMat = captured.b.reduce((s, p) => s + PIECE_VALS[p.type], 0);

  const PlayerBar = ({ color, name }: { color: Color; name: string }) => {
    const active = turn === color && !gameOver;
    const time = color === "w" ? wTime : bTime;
    const low = time <= 10 && timeSecs > 0;
    const capStr = color === "w" ? bCap : wCap;
    const advantage = color === "w" ? bMat - wMat : wMat - bMat;
    return (
      <div className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl border transition-colors ${active ? "bg-violet-500/15 border-violet-500/50" : "bg-secondary/50 border-border"}`}>
        <div className="w-7 h-7 rounded-full border-2 flex-shrink-0" style={{ background: color === "w" ? "#f0d9b5" : "#1a1a1a", borderColor: color === "w" ? "#b58863" : "#555" }} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold leading-tight">{name}{active && !gameOver && <span className="ml-1 text-xs text-violet-400 animate-pulse">●</span>}</div>
          <div className="text-xs text-muted-foreground leading-tight">{capStr || "—"}{advantage > 0 ? ` +${advantage}` : ""}</div>
        </div>
        {timeSecs > 0 && (
          <div className={`font-mono font-black text-base tabular-nums px-2 py-1 rounded-lg ${low && active ? "bg-red-500/20 text-red-400 animate-pulse" : active ? "bg-secondary text-foreground" : "text-muted-foreground"}`}>
            {fmtTime(time)}
          </div>
        )}
      </div>
    );
  };

  const topColor: Color = flipped ? "w" : "b";
  const botColor: Color = flipped ? "b" : "w";
  const getName = (color: Color) => {
    if (mode === "ai" && color === "b") return `🤖 AI (${aiDiff})`;
    if (mode === "online") return color === "w" ? "⬜ White (Host)" : "⬛ Black (Guest)";
    return color === "w" ? "⬜ White" : "⬛ Black";
  };

  return (
    <Shell title="Chess" controls={mode === "ai" ? `You vs 🤖 ${aiDiff}` : mode === "online" ? (mp.role === "host" ? "🟢 You are White" : "🔵 You are Black") : "Local 2P"}>
      <div className="flex flex-col items-center gap-2 w-full max-w-[500px]">
        <PlayerBar color={topColor} name={getName(topColor)} />

        {/* Board */}
        <div className="relative w-full" style={{ maxWidth: "min(480px, 95vw)" }}>
          <div className="grid grid-cols-8 rounded-md overflow-hidden shadow-2xl" style={{ border: "6px solid #6b4c11", boxShadow: "0 8px 40px rgba(0,0,0,0.7)" }}>
            {Array.from({ length: 8 }, (_, ri) => {
              const r = flipped ? ri : 7 - ri;
              const rankLabel = flipped ? ri + 1 : 8 - ri;
              return Array.from({ length: 8 }, (_, ci) => {
                const c = flipped ? 7 - ci : ci;
                const sq = board[r][c];
                const isLight = (r + c) % 2 === 0;
                const isSel = selected?.[0] === r && selected?.[1] === c;
                const isLastFrom = lastMove?.from[0] === r && lastMove?.from[1] === c;
                const isLastTo = lastMove?.to[0] === r && lastMove?.to[1] === c;
                const isLegal = legalMs.some(m => m.to[0] === r && m.to[1] === c);
                const isKingInCheck = inCheck && sq?.type === "K" && sq?.color === turn;
                let bg = isLight ? "#f0d9b5" : "#b58863";
                if (isSel) bg = "#f6f669";
                else if (isLastFrom || isLastTo) bg = isLight ? "#cdd16a" : "#aaa23a";
                if (isKingInCheck) bg = "#e74c3c";
                return (
                  <div key={`${r}-${c}`} onClick={() => handleClick(r, c)}
                    className="relative flex items-center justify-center cursor-pointer select-none aspect-square"
                    style={{ background: bg, transition: "background 0.1s" }}>
                    {ci === 0 && <span className="absolute top-0.5 left-0.5 leading-none font-bold" style={{ fontSize: 9, color: isLight ? "#b58863" : "#f0d9b5" }}>{rankLabel}</span>}
                    {ri === 7 && <span className="absolute bottom-0.5 right-1 leading-none font-bold" style={{ fontSize: 9, color: isLight ? "#b58863" : "#f0d9b5" }}>{files[ci]}</span>}
                    {isLegal && !sq && <div className="rounded-full" style={{ width: "32%", height: "32%", background: "rgba(0,0,0,0.22)" }} />}
                    {isLegal && sq && <div className="absolute inset-0" style={{ border: "4px solid rgba(0,0,0,0.28)", borderRadius: 2 }} />}
                    {sq && (
                      <span style={{
                        fontSize: "clamp(22px, 5vw, 38px)", lineHeight: 1,
                        color: sq.color === "w" ? "#fff" : "#111",
                        textShadow: sq.color === "w"
                          ? "0 1px 3px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,1)"
                          : "0 1px 2px rgba(255,255,255,0.25)",
                        filter: isSel ? "drop-shadow(0 0 5px rgba(246,246,105,1))" : "none",
                        userSelect: "none",
                      }}>
                        {SYMBOLS[sq.color][sq.type]}
                      </span>
                    )}
                  </div>
                );
              });
            })}
          </div>

          {/* Promotion picker */}
          {promoTarget && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/75 rounded-md" style={{ zIndex: 10 }}>
              <div className="bg-slate-800 rounded-2xl p-4 border border-violet-500/60 shadow-2xl">
                <p className="text-center text-sm font-bold text-violet-300 mb-3">Promote pawn to:</p>
                <div className="flex gap-2">
                  {(["Q","R","B","N"] as PType[]).map(pt => (
                    <button key={pt} onClick={() => handlePromo(pt)}
                      className="flex items-center justify-center bg-secondary hover:bg-violet-600/40 rounded-xl border border-border hover:border-violet-400 transition-colors touch-manipulation"
                      style={{ width: 56, height: 56 }}>
                      <span style={{ fontSize: 36, color: turn === "w" ? "#fff" : "#111", textShadow: turn === "w" ? "0 1px 3px rgba(0,0,0,0.9)" : "none" }}>{SYMBOLS[turn][pt]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Game over overlay */}
          {gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-md gap-4" style={{ zIndex: 10 }}>
              <p className="text-xl font-black text-primary text-center px-4 leading-tight">{status}</p>
              <div className="flex gap-3 flex-wrap justify-center">
                <button onClick={() => startGame(mode)} className="px-8 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl touch-manipulation">Play Again</button>
                <button onClick={() => { mp.disconnect(); setScreen("menu"); }} className="px-6 py-3 bg-secondary text-foreground font-bold rounded-xl touch-manipulation">Menu</button>
              </div>
            </div>
          )}
        </div>

        <PlayerBar color={botColor} name={getName(botColor)} />

        <div className={`text-xs text-center px-3 py-1.5 rounded-full transition-colors ${gameOver ? "bg-secondary text-muted-foreground" : isMyTurn && !aiThinking ? "bg-violet-500/20 text-violet-300" : "bg-secondary text-muted-foreground"}`}>
          {gameOver ? status : aiThinking ? "🤖 AI is thinking…" : isMyTurn ? "Your turn — click a piece" : `Waiting for ${turn === "w" ? "White" : "Black"}…`}
        </div>

        {!gameOver && (
          <button onClick={() => startGame(mode)} className="text-xs text-muted-foreground hover:text-red-400 transition-colors">↺ Restart</button>
        )}
      </div>
    </Shell>
  );
}
