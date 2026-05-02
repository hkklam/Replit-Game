import { useState, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

function Shell({ title, controls, children }: { title: string; controls?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-4 px-4 py-3 border-b border-border">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Hub</span>
        </Link>
        <h1 className="text-lg font-bold text-primary">{title}</h1>
        {controls && <span className="text-xs text-muted-foreground ml-auto hidden sm:block">{controls}</span>}
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">{children}</div>
    </div>
  );
}

type Piece = { type: string; color: "w" | "b" };
type Square = Piece | null;
type Board = Square[][];

const INIT_BOARD: Board = (() => {
  const b: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
  const order = ["R","N","B","Q","K","B","N","R"];
  order.forEach((t, c) => { b[0][c] = { type: t, color: "b" }; b[7][c] = { type: t, color: "w" }; });
  for (let c = 0; c < 8; c++) { b[1][c] = { type: "P", color: "b" }; b[6][c] = { type: "P", color: "w" }; }
  return b;
})();

const SYMBOLS: Record<string, Record<string, string>> = {
  w: { K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙" },
  b: { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" },
};

function cloneBoard(b: Board): Board { return b.map(r => r.map(c => c ? { ...c } : null)); }

function getMoves(board: Board, r: number, c: number, color: "w" | "b"): [number, number][] {
  const piece = board[r][c]; if (!piece || piece.color !== color) return [];
  const moves: [number, number][] = [];
  const inb = (rr: number, cc: number) => rr >= 0 && rr < 8 && cc >= 0 && cc < 8;
  const add = (rr: number, cc: number) => { if (inb(rr, cc) && board[rr][cc]?.color !== color) moves.push([rr, cc]); };
  const slide = (dr: number, dc: number) => { for (let i = 1; i < 8; i++) { const rr = r + dr * i, cc = c + dc * i; if (!inb(rr, cc)) break; if (board[rr][cc]) { if (board[rr][cc]!.color !== color) moves.push([rr, cc]); break; } moves.push([rr, cc]); } };
  const { type } = piece;
  if (type === "P") {
    const dir = color === "w" ? -1 : 1;
    if (inb(r + dir, c) && !board[r + dir][c]) {
      moves.push([r + dir, c]);
      const startRow = color === "w" ? 6 : 1;
      if (r === startRow && !board[r + dir * 2][c]) moves.push([r + dir * 2, c]);
    }
    [c - 1, c + 1].forEach(cc => { if (inb(r + dir, cc) && board[r + dir][cc]?.color && board[r + dir][cc]!.color !== color) moves.push([r + dir, cc]); });
  } else if (type === "R") { [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc]) => slide(dr,dc)); }
  else if (type === "B") { [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc]) => slide(dr,dc)); }
  else if (type === "Q") { [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc]) => slide(dr,dc)); }
  else if (type === "N") { [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]].forEach(([dr,dc]) => add(r+dr,c+dc)); }
  else if (type === "K") { [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc]) => add(r+dr,c+dc)); }
  return moves;
}

export default function Chess() {
  const [board, setBoard] = useState<Board>(INIT_BOARD.map(r => r.map(c => c ? { ...c } : null)));
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [moves, setMoves] = useState<[number, number][]>([]);
  const [turn, setTurn] = useState<"w" | "b">("w");
  const [captured, setCaptured] = useState<{ w: Piece[]; b: Piece[] }>({ w: [], b: [] });
  const [status, setStatus] = useState("White's turn");

  const click = useCallback((r: number, c: number) => {
    if (selected) {
      const isMove = moves.some(([mr, mc]) => mr === r && mc === c);
      if (isMove) {
        const nb = cloneBoard(board);
        const newCap = { w: [...captured.w], b: [...captured.b] };
        if (nb[r][c]) newCap[turn === "w" ? "b" : "w"].push(nb[r][c]!);
        // Pawn promotion
        const moving = nb[selected[0]][selected[1]]!;
        nb[r][c] = moving; nb[selected[0]][selected[1]] = null;
        if (moving.type === "P" && (r === 0 || r === 7)) nb[r][c] = { type: "Q", color: moving.color };
        // Check for king capture
        const opp = turn === "w" ? "b" : "w";
        const kingGone = !nb.flat().some(p => p?.type === "K" && p.color === opp);
        setBoard(nb); setCaptured(newCap); setSelected(null); setMoves([]);
        if (kingGone) { setStatus(`${turn === "w" ? "White" : "Black"} wins! 🏆`); return; }
        setTurn(opp); setStatus(`${opp === "w" ? "White" : "Black"}'s turn`);
      } else if (board[r][c]?.color === turn) {
        const m = getMoves(board, r, c, turn);
        setSelected([r, c]); setMoves(m);
      } else { setSelected(null); setMoves([]); }
    } else {
      if (board[r][c]?.color === turn) { setSelected([r, c]); setMoves(getMoves(board, r, c, turn)); }
    }
  }, [board, selected, moves, turn, captured]);

  const reset = () => {
    setBoard(INIT_BOARD.map(r => r.map(c => c ? { ...c } : null)));
    setSelected(null); setMoves([]); setTurn("w"); setCaptured({ w: [], b: [] }); setStatus("White's turn");
  };

  const isSelected = (r: number, c: number) => selected?.[0] === r && selected?.[1] === c;
  const isMove = (r: number, c: number) => moves.some(([mr, mc]) => mr === r && mc === c);

  return (
    <Shell title="Chess" controls="Click piece, then click destination">
      <div className="flex gap-4 text-sm text-muted-foreground font-mono">
        <span>♟ Captured by White: {captured.w.map(p => SYMBOLS[p.color][p.type]).join("")}</span>
        <span>|</span>
        <span>♟ Captured by Black: {captured.b.map(p => SYMBOLS[p.color][p.type]).join("")}</span>
      </div>
      <div className={`text-sm font-semibold px-4 py-1 rounded-full ${turn === "w" ? "bg-white text-black" : "bg-slate-900 text-white border border-slate-600"}`}>{status}</div>
      <div className="border-2 border-slate-600 rounded-lg overflow-hidden">
        {board.map((row, r) => (
          <div key={r} className="flex">
            {row.map((sq, c) => {
              const light = (r + c) % 2 === 0;
              const sel = isSelected(r, c);
              const mv = isMove(r, c);
              let bg = light ? "bg-amber-100" : "bg-amber-800";
              if (sel) bg = "bg-yellow-400";
              else if (mv) bg = light ? "bg-green-300" : "bg-green-600";
              return (
                <div key={c} onClick={() => click(r, c)}
                  className={`w-12 h-12 flex items-center justify-center cursor-pointer select-none ${bg} hover:brightness-110 relative`}
                >
                  {mv && !sq && <div className="w-4 h-4 rounded-full bg-green-500/50" />}
                  {mv && sq && <div className="absolute inset-0 border-4 border-green-500/70 rounded-sm" />}
                  {sq && <span className={`text-3xl leading-none ${sq.color === "w" ? "drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]" : "drop-shadow-[0_1px_1px_rgba(255,255,255,0.3)]"}`}>{SYMBOLS[sq.color][sq.type]}</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {status.includes("wins") && <button onClick={reset} className="px-8 py-2 bg-primary text-black font-bold rounded-xl">New Game</button>}
    </Shell>
  );
}
