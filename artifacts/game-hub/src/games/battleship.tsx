import { useState, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

function Shell({ title, controls, children }: { title: string; controls?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-4 px-4 py-3 border-b border-cyan-500/30 bg-gradient-to-r from-cyan-950/60 to-transparent">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Hub</span>
        </Link>
        <span className="text-2xl select-none" style={{ filter: "drop-shadow(0 0 8px #22d3ee80)" }}>⚓</span>
        <h1 className="text-lg font-bold text-cyan-400">{title}</h1>
        {controls && <span className="text-xs text-muted-foreground ml-auto hidden sm:block">{controls}</span>}
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">{children}</div>
    </div>
  );
}

const SIZE = 10;
const SHIPS = [
  { name: "Carrier", len: 5 }, { name: "Battleship", len: 4 },
  { name: "Cruiser", len: 3 }, { name: "Submarine", len: 3 }, { name: "Destroyer", len: 2 },
];

type Cell = "empty" | "ship" | "hit" | "miss";
type Grid = Cell[][];
type Board = { grid: Grid; ships: { cells: [number, number][] }[] };

function emptyGrid(): Grid { return Array.from({ length: SIZE }, () => Array(SIZE).fill("empty")); }
function clone(g: Grid): Grid { return g.map(r => [...r]); }

function placeShipsRandom(): Board {
  const grid = emptyGrid();
  const ships: { cells: [number, number][] }[] = [];
  for (const ship of SHIPS) {
    let placed = false;
    while (!placed) {
      const horiz = Math.random() > 0.5;
      const r = Math.floor(Math.random() * (horiz ? SIZE : SIZE - ship.len + 1));
      const c = Math.floor(Math.random() * (horiz ? SIZE - ship.len + 1 : SIZE));
      const cells: [number, number][] = [];
      let ok = true;
      for (let i = 0; i < ship.len; i++) {
        const rr = r + (horiz ? 0 : i); const cc = c + (horiz ? i : 0);
        if (grid[rr][cc] !== "empty") { ok = false; break; }
        cells.push([rr, cc]);
      }
      if (ok) { cells.forEach(([rr, cc]) => { grid[rr][cc] = "ship"; }); ships.push({ cells }); placed = true; }
    }
  }
  return { grid, ships };
}

function isSunk(ship: { cells: [number, number][] }, grid: Grid) { return ship.cells.every(([r, c]) => grid[r][c] === "hit"); }

type Phase = "p1-place" | "p2-place" | "p1-attack" | "p2-attack" | "done";

export default function Battleship() {
  const [phase, setPhase] = useState<Phase>("p1-place");
  const [p1board, setP1Board] = useState<Board>({ grid: emptyGrid(), ships: [] });
  const [p2board, setP2Board] = useState<Board>({ grid: emptyGrid(), ships: [] });
  const [winner, setWinner] = useState<string | null>(null);
  const [msg, setMsg] = useState("Player 1: Place your ships by clicking 'Auto-Place Ships'");

  const autoPlace = useCallback((player: 1 | 2) => {
    const board = placeShipsRandom();
    if (player === 1) { setP1Board(board); }
    else { setP2Board(board); }
  }, []);

  const confirm = useCallback(() => {
    if (phase === "p1-place") {
      if (!p1board.ships.length) { setMsg("Player 1: please place ships first!"); return; }
      setPhase("p2-place"); setMsg("Player 2: Place your ships — Player 1 look away!");
    } else if (phase === "p2-place") {
      if (!p2board.ships.length) { setMsg("Player 2: please place ships first!"); return; }
      setPhase("p1-attack"); setMsg("Player 1: Click a cell to attack Player 2's grid");
    }
  }, [phase, p1board, p2board]);

  const attack = useCallback((row: number, col: number) => {
    if (phase !== "p1-attack" && phase !== "p2-attack") return;
    const attacking = phase === "p1-attack" ? 2 : 1;
    const defBoard = attacking === 2 ? p2board : p1board;
    const setDefBoard = attacking === 2 ? setP2Board : setP1Board;
    if (defBoard.grid[row][col] === "hit" || defBoard.grid[row][col] === "miss") return;
    const newGrid = clone(defBoard.grid);
    const isHit = newGrid[row][col] === "ship";
    newGrid[row][col] = isHit ? "hit" : "miss";
    const newShips = defBoard.ships.map(s => ({ ...s }));
    const newBoard: Board = { grid: newGrid, ships: newShips };
    setDefBoard(newBoard);
    // Check win
    const allSunk = newShips.every(s => s.cells.every(([r, c]) => newGrid[r][c] === "hit"));
    if (allSunk) {
      setWinner(`Player ${phase === "p1-attack" ? 1 : 2}`);
      setPhase("done"); return;
    }
    const nextPhase = phase === "p1-attack" ? "p2-attack" : "p1-attack";
    setPhase(nextPhase);
    setMsg(`Player ${nextPhase === "p1-attack" ? 1 : 2}: Your turn — click to attack!${isHit ? " 💥 Hit!" : " Miss!"}`);
  }, [phase, p1board, p2board]);

  const reset = () => { setPhase("p1-place"); setP1Board({ grid: emptyGrid(), ships: [] }); setP2Board({ grid: emptyGrid(), ships: [] }); setWinner(null); setMsg("Player 1: Place your ships by clicking 'Auto-Place Ships'"); };

  const renderGrid = (board: Board, isTarget: boolean) => {
    const visGrid = board.grid;
    return (
      <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}>
        {visGrid.map((row, r) => row.map((cell, c) => {
          let bg = "bg-slate-800 hover:bg-slate-700";
          if (isTarget) {
            if (cell === "hit") bg = "bg-red-500";
            else if (cell === "miss") bg = "bg-slate-600";
          } else {
            if (cell === "ship") bg = "bg-sky-700";
            else if (cell === "hit") bg = "bg-red-500";
            else if (cell === "miss") bg = "bg-slate-600";
          }
          return (
            <div key={`${r}-${c}`} onClick={() => isTarget && attack(r, c)}
              className={`w-7 h-7 rounded-sm ${bg} ${isTarget ? "cursor-pointer" : "cursor-default"} flex items-center justify-center text-xs`}
            >
              {cell === "hit" ? "💥" : cell === "miss" ? "○" : ""}
            </div>
          );
        }))}
      </div>
    );
  };

  return (
    <Shell title="Battleship" controls="Local 2-player hotseat">
      {winner ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-3xl font-black text-primary">🏆 {winner} Wins!</p>
          <button onClick={reset} className="px-8 py-2 bg-primary text-black font-bold rounded-xl">Play Again</button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 w-full max-w-3xl">
          <div className="text-center px-4 py-2 bg-card border border-border rounded-xl text-sm text-foreground">{msg}</div>
          {(phase === "p1-place" || phase === "p2-place") && (
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground">Ships will be placed randomly on a 10×10 grid</p>
              <div className="flex gap-3">
                <button onClick={() => autoPlace(phase === "p1-place" ? 1 : 2)} className="px-5 py-2 bg-secondary hover:bg-secondary/80 rounded-lg font-semibold">⚡ Auto-Place Ships</button>
                <button onClick={confirm} className="px-5 py-2 bg-primary text-black font-bold rounded-lg">Confirm →</button>
              </div>
              {phase === "p1-place" && p1board.ships.length > 0 && <div className="mt-2">{renderGrid(p1board, false)}</div>}
              {phase === "p2-place" && p2board.ships.length > 0 && <div className="mt-2">{renderGrid(p2board, false)}</div>}
            </div>
          )}
          {(phase === "p1-attack" || phase === "p2-attack") && (
            <div className="flex gap-8 flex-wrap justify-center">
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs font-semibold text-muted-foreground">YOUR GRID</p>
                {renderGrid(phase === "p1-attack" ? p1board : p2board, false)}
              </div>
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs font-semibold text-primary">ENEMY GRID — Click to attack</p>
                {renderGrid(phase === "p1-attack" ? p2board : p1board, true)}
              </div>
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}
