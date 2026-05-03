import { useState, useCallback, useRef, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useRelaySocket } from "../lib/relay-socket";
import { QRCode, buildInviteUrl, getUrlRoomCode } from "../components/QRCode";

function Shell({ title, controls, children }: { title: string; controls?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-4 px-4 py-3 border-b border-cyan-500/30 bg-gradient-to-r from-cyan-950/60 to-transparent">
        <Link href="/" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-sm transition-all">
          <ArrowLeft className="h-4 w-4" />
          <span>Menu</span>
        </Link>
        <span className="text-2xl select-none" style={{ filter: "drop-shadow(0 0 8px #22d3ee80)" }}>⚓</span>
        <h1 className="text-lg font-bold text-cyan-400">{title}</h1>
        {controls && <span className="text-xs text-muted-foreground ml-auto hidden sm:block">{controls}</span>}
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">{children}</div>
    </div>
  );
}

// ─── Types & constants ────────────────────────────────────────────────────────
const SIZE = 10;
const SHIPS = [
  { name: "Carrier", len: 5 }, { name: "Battleship", len: 4 },
  { name: "Cruiser", len: 3 }, { name: "Submarine", len: 3 }, { name: "Destroyer", len: 2 },
];
type Cell  = "empty" | "ship" | "hit" | "miss";
type Grid  = Cell[][];
type Board = { grid: Grid; ships: { name: string; cells: [number, number][] }[] };

function emptyGrid(): Grid { return Array.from({ length: SIZE }, () => Array(SIZE).fill("empty")); }
function cloneGrid(g: Grid): Grid { return g.map(r => [...r]); }

function placeShipsRandom(): Board {
  const grid = emptyGrid();
  const ships: { name: string; cells: [number, number][] }[] = [];
  for (const ship of SHIPS) {
    let placed = false;
    while (!placed) {
      const horiz = Math.random() > 0.5;
      const r = Math.floor(Math.random() * (horiz ? SIZE : SIZE - ship.len + 1));
      const c = Math.floor(Math.random() * (horiz ? SIZE - ship.len + 1 : SIZE));
      const cells: [number, number][] = [];
      let ok = true;
      for (let i = 0; i < ship.len; i++) {
        const rr = r + (horiz ? 0 : i), cc = c + (horiz ? i : 0);
        if (grid[rr][cc] !== "empty") { ok = false; break; }
        cells.push([rr, cc]);
      }
      if (ok) { cells.forEach(([rr, cc]) => { grid[rr][cc] = "ship"; }); ships.push({ name: ship.name, cells }); placed = true; }
    }
  }
  return { grid, ships };
}

function isSunk(ship: { cells: [number, number][] }, grid: Grid) {
  return ship.cells.every(([r, c]) => grid[r][c] === "hit");
}

// ─── Shared grid renderer ─────────────────────────────────────────────────────
function GridView({ board, isTarget, onAttack, disabled, label }: {
  board: Board; isTarget: boolean; disabled?: boolean; label: string;
  onAttack?: (r: number, c: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className={`text-xs font-bold tracking-widest uppercase ${isTarget ? "text-cyan-400" : "text-muted-foreground"}`}>{label}</p>
      <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}>
        {board.grid.map((row, r) => row.map((cell, c) => {
          let bg = "bg-slate-800";
          if (isTarget) {
            if (cell === "hit")  bg = "bg-red-500";
            else if (cell === "miss") bg = "bg-slate-600";
            else if (!disabled) bg = "bg-slate-800 hover:bg-cyan-900/60 cursor-pointer";
          } else {
            if (cell === "ship")  bg = "bg-sky-700";
            else if (cell === "hit")  bg = "bg-red-500";
            else if (cell === "miss") bg = "bg-slate-600";
          }
          return (
            <div
              key={`${r}-${c}`}
              onClick={() => !disabled && isTarget && cell !== "hit" && cell !== "miss" && onAttack?.(r, c)}
              className={`w-7 h-7 rounded-sm ${bg} flex items-center justify-center text-xs select-none transition-colors`}
            >
              {cell === "hit" ? "💥" : cell === "miss" ? "○" : ""}
            </div>
          );
        }))}
      </div>
    </div>
  );
}

// ─── AI helpers ───────────────────────────────────────────────────────────────
function aiPickTarget(playerGrid: Grid): [number, number] {
  // Hunt mode: collect cells adjacent to existing hits that haven't been attacked yet
  const adjacent: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (playerGrid[r][c] !== "hit") continue;
      for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE &&
            (playerGrid[nr][nc] === "empty" || playerGrid[nr][nc] === "ship"))
          adjacent.push([nr, nc]);
      }
    }
  }
  if (adjacent.length > 0) return adjacent[Math.floor(Math.random() * adjacent.length)];

  // Random mode: pick any untouched cell
  const untouched: [number, number][] = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (playerGrid[r][c] === "empty" || playerGrid[r][c] === "ship")
        untouched.push([r, c]);
  return untouched[Math.floor(Math.random() * untouched.length)];
}

// ─── AI GAME (vs Computer) ───────────────────────────────────────────────────
type AIPhase = "placement" | "battle" | "done";

function AIGame({ onMenu }: { onMenu: () => void }) {
  const [myBoard,   setMyBoard]   = useState<Board>({ grid: emptyGrid(), ships: [] });
  const [aiBoard,   setAiBoard]   = useState<Board>(placeShipsRandom);
  const [phase,     setPhase]     = useState<AIPhase>("placement");
  const [playerTurn, setPlayerTurn] = useState(true);
  const [winner,    setWinner]    = useState<"you"|"ai"|null>(null);
  const [msg,       setMsg]       = useState("Auto-place your ships, then click Start!");
  const [lastAiShot, setLastAiShot] = useState<string>("");

  // Refs for AI access inside setTimeout closures
  const myBoardRef = useRef(myBoard);
  myBoardRef.current = myBoard;

  const autoPlace = () => {
    const b = placeShipsRandom();
    setMyBoard(b);
  };

  const startBattle = () => {
    if (!myBoard.ships.length) { setMsg("Place your ships first!"); return; }
    setPhase("battle");
    setPlayerTurn(true);
    setMsg("Your turn — click the enemy grid to fire.");
  };

  const newGame = () => {
    setMyBoard({ grid: emptyGrid(), ships: [] });
    setAiBoard(placeShipsRandom());
    setPhase("placement");
    setPlayerTurn(true);
    setWinner(null);
    setMsg("Auto-place your ships, then click Start!");
    setLastAiShot("");
  };

  // Player fires at AI board
  const playerFire = useCallback((row: number, col: number) => {
    if (!playerTurn || phase !== "battle") return;
    if (aiBoard.grid[row][col] === "hit" || aiBoard.grid[row][col] === "miss") return;

    const newGrid = cloneGrid(aiBoard.grid);
    const isHit = newGrid[row][col] === "ship";
    newGrid[row][col] = isHit ? "hit" : "miss";
    const newAiBoard: Board = { grid: newGrid, ships: aiBoard.ships };
    setAiBoard(newAiBoard);

    if (newAiBoard.ships.every(s => isSunk(s, newGrid))) {
      setWinner("you"); setPhase("done"); return;
    }

    const sunkShip = isHit ? newAiBoard.ships.find(s => isSunk(s, newGrid)) : null;
    const shotLabel = isHit ? (sunkShip ? `💥 Hit & sunk ${sunkShip.name}!` : "💥 Hit!") : "Miss…";
    setMsg(`${shotLabel} AI is thinking…`);
    setPlayerTurn(false);

    // AI fires back after a short delay
    setTimeout(() => {
      const board = myBoardRef.current;
      const [ar, ac] = aiPickTarget(board.grid);
      const ng = cloneGrid(board.grid);
      const aiHit = ng[ar][ac] === "ship";
      ng[ar][ac] = aiHit ? "hit" : "miss";
      const updatedMyBoard: Board = { grid: ng, ships: board.ships };
      myBoardRef.current = updatedMyBoard;
      setMyBoard(updatedMyBoard);

      if (updatedMyBoard.ships.every(s => isSunk(s, ng))) {
        setWinner("ai"); setPhase("done"); return;
      }

      const sunk = aiHit ? updatedMyBoard.ships.find(s => isSunk(s, ng)) : null;
      const aiLabel = aiHit ? (sunk ? `AI sunk your ${sunk.name}!` : "AI hit your ship!") : "AI missed.";
      setLastAiShot(aiLabel);
      setPlayerTurn(true);
      setMsg("Your turn — click the enemy grid to fire.");
    }, 700);
  }, [playerTurn, phase, aiBoard]);

  if (winner) return (
    <div className="flex flex-col items-center gap-5">
      <p className="text-4xl font-black" style={{ color: winner === "you" ? "#22d3ee" : "#f87171" }}>
        {winner === "you" ? "🏆 You Win!" : "💀 AI Wins!"}
      </p>
      <div className="flex gap-3">
        <button onClick={newGame} className="px-6 py-2 bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 font-bold rounded-xl">Play Again</button>
        <button onClick={onMenu}  className="px-6 py-2 bg-secondary text-foreground font-bold rounded-xl">Menu</button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-3xl">
      <div className="text-center px-4 py-2 bg-card border border-border rounded-xl text-sm max-w-sm">{msg}</div>
      {lastAiShot && phase === "battle" && (
        <p className="text-xs text-red-400 -mt-2">{lastAiShot}</p>
      )}

      {phase === "placement" && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-3">
            <button onClick={autoPlace}
              className="px-5 py-2 bg-secondary hover:bg-secondary/80 rounded-lg font-semibold">⚡ Auto-Place</button>
            <button onClick={startBattle}
              className="px-5 py-2 bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 font-bold rounded-lg">Start Battle →</button>
          </div>
          {myBoard.ships.length > 0 && <GridView board={myBoard} isTarget={false} label="Your Fleet" />}
        </div>
      )}

      {phase === "battle" && (
        <div className="flex gap-6 flex-wrap justify-center">
          <GridView board={myBoard} isTarget={false} label="Your Grid" />
          <GridView
            board={aiBoard} isTarget label={playerTurn ? "AI Grid — Click to fire!" : "AI Grid (thinking…)"}
            onAttack={playerFire} disabled={!playerTurn}
          />
        </div>
      )}

      <button onClick={onMenu} className="text-sm text-muted-foreground hover:text-foreground">← Menu</button>
    </div>
  );
}

// ─── ONLINE LOBBY ─────────────────────────────────────────────────────────────
function OnlineLobby({ status, roomCode, error, onHost, onJoin, onBack, initialCode = "" }: {
  status: string; roomCode: string; error: string; initialCode?: string;
  onHost: () => void; onJoin: (code: string) => void; onBack: () => void;
}) {
  const [code, setCode] = useState(initialCode);
  const [view, setView] = useState<"pick"|"host"|"join">(() => initialCode.length >= 4 ? "join" : "pick");

  if (view === "pick") return (
    <div className="flex flex-col items-center gap-4 w-full max-w-xs">
      <p className="text-cyan-300 font-black text-lg">Online Battleship</p>
      <button onClick={() => { setView("host"); onHost(); }}
        className="w-full py-3 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 font-bold rounded-2xl transition-colors">
        🏠 Host a Game
        <span className="text-xs font-normal block text-muted-foreground mt-0.5">Create a room · share the code</span>
      </button>
      <button onClick={() => setView("join")}
        className="w-full py-3 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/50 text-sky-300 font-bold rounded-2xl transition-colors">
        🔗 Join a Game
        <span className="text-xs font-normal block text-muted-foreground mt-0.5">Enter the host's 4-letter code</span>
      </button>
      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
    </div>
  );

  if (view === "host") return (
    <div className="flex flex-col items-center gap-4 w-full max-w-xs text-center">
      <p className="text-cyan-300 font-black text-lg">Hosting a Game</p>
      {status === "connecting" && <p className="text-muted-foreground text-sm animate-pulse">Connecting…</p>}
      {status === "waiting" && (
        <>
          <p className="text-muted-foreground text-sm">Share this code with your opponent:</p>
          <div className="text-5xl font-black text-cyan-300 tracking-widest font-mono bg-cyan-500/10 border border-cyan-500/30 rounded-2xl px-6 py-4">{roomCode}</div>
          <p className="text-xs text-muted-foreground">or scan to join instantly:</p>
          <div className="p-2 bg-white rounded-xl">
            <QRCode value={buildInviteUrl(roomCode)} size={130} />
          </div>
          <p className="text-muted-foreground text-xs animate-pulse">Waiting for opponent…</p>
        </>
      )}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button onClick={() => { setView("pick"); onBack(); }} className="text-sm text-muted-foreground hover:text-foreground">← Cancel</button>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-xs text-center">
      <p className="text-sky-300 font-black text-lg">Join a Game</p>
      <p className="text-muted-foreground text-sm">Enter the 4-letter room code:</p>
      <input
        value={code} onChange={e => setCode(e.target.value.toUpperCase().slice(0, 4))}
        placeholder="ABCD"
        className="text-center text-3xl font-black font-mono tracking-widest bg-background border border-border rounded-xl px-4 py-3 w-40 focus:outline-none focus:border-sky-500 text-foreground"
      />
      <button
        onClick={() => code.length === 4 && onJoin(code)}
        disabled={code.length !== 4 || status === "connecting"}
        className="w-full py-3 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/50 text-sky-300 font-bold rounded-2xl transition-colors disabled:opacity-40"
      >
        {status === "connecting" ? "Connecting…" : "Join →"}
      </button>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button onClick={() => { setView("pick"); onBack(); }} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
    </div>
  );
}

// ─── ONLINE GAME ─────────────────────────────────────────────────────────────
type OnlinePhase = "placement" | "waiting-ready" | "battle" | "done";

function OnlineGame({ isHost, relaySend, onMenu, onMessage }: {
  isHost: boolean;
  relaySend: (d: unknown) => void;
  onMenu: () => void;
  onMessage: (handler: (d: unknown) => void) => void;
}) {
  const [myBoard,    setMyBoard]    = useState<Board>({ grid: emptyGrid(), ships: [] });
  const [enemyGrid,  setEnemyGrid]  = useState<Grid>(emptyGrid());
  const [phase,      setPhase]      = useState<OnlinePhase>("placement");
  const [myTurn,     setMyTurn]     = useState(false);
  const [waitResult, setWaitResult] = useState(false);
  const [winner,     setWinner]     = useState<"me"|"opponent"|null>(null);
  const [statusMsg,  setStatusMsg]  = useState("Auto-place your ships, then click Ready.");
  const [lastLabel,  setLastLabel]  = useState("");

  // Keep refs to see latest state inside callbacks
  const myBoardRef       = useRef<Board>({ grid: emptyGrid(), ships: [] });
  const phaseRef         = useRef<OnlinePhase>("placement");
  const opponentReadyRef = useRef(false);
  phaseRef.current       = phase;

  const startBattle = useCallback(() => {
    const goFirst = isHost;
    setMyTurn(goFirst);
    setPhase("battle");
    setStatusMsg(goFirst
      ? "Battle! Your turn — click the enemy grid to fire."
      : "Battle! Waiting for opponent's first shot…");
  }, [isHost]);

  const handleMessage = useCallback((data: unknown) => {
    const msg = data as { type: string; row?: number; col?: number; hit?: boolean; sunk?: boolean; won?: boolean };

    // ── Opponent is ready ─────────────────────────────────────────────────
    if (msg.type === "ready") {
      opponentReadyRef.current = true;
      // Only start if we've already confirmed our own readiness
      if (phaseRef.current === "waiting-ready") {
        startBattle();
      }
      // If we're still in placement, opponent's flag is stored; startBattle fires when we click Ready
    }

    // ── Opponent fired at us ──────────────────────────────────────────────
    if (msg.type === "fire" && msg.row !== undefined && msg.col !== undefined) {
      const board   = myBoardRef.current;
      const newGrid = cloneGrid(board.grid);
      const isHit   = newGrid[msg.row][msg.col] === "ship";
      newGrid[msg.row][msg.col] = isHit ? "hit" : "miss";
      const updatedBoard = { grid: newGrid, ships: board.ships };
      myBoardRef.current = updatedBoard;
      setMyBoard(updatedBoard);

      const allSunk = updatedBoard.ships.every(s => isSunk(s, newGrid));
      relaySend({ type: "fire_result", row: msg.row, col: msg.col, hit: isHit, sunk: allSunk && isHit, won: allSunk });

      if (allSunk) { setWinner("opponent"); setPhase("done"); return; }

      setMyTurn(true);
      setStatusMsg(isHit ? "💥 They hit you! Fire back." : "They missed! Your turn — click to fire.");
    }

    // ── Result of our shot ────────────────────────────────────────────────
    if (msg.type === "fire_result" && msg.row !== undefined && msg.col !== undefined) {
      setEnemyGrid(prev => {
        const g = cloneGrid(prev);
        g[msg.row!][msg.col!] = msg.hit ? "hit" : "miss";
        return g;
      });
      setWaitResult(false);

      if (msg.won) { setWinner("me"); setPhase("done"); return; }

      const label = msg.hit ? (msg.sunk ? "💥 Hit & sunk!" : "💥 Hit!") : "Miss…";
      setLastLabel(label);
      setMyTurn(false);
      setStatusMsg(`${label} Opponent's turn.`);
    }
  }, [isHost, relaySend]);

  // Register handler with parent every render
  useEffect(() => { onMessage(handleMessage); }, [handleMessage, onMessage]);

  const autoPlace = () => {
    const b = placeShipsRandom();
    myBoardRef.current = b;
    setMyBoard(b);
  };

  const confirmReady = () => {
    if (!myBoardRef.current.ships.length) { setStatusMsg("Place your ships first!"); return; }
    relaySend({ type: "ready" });
    if (opponentReadyRef.current) {
      // Opponent already signalled — start battle immediately
      startBattle();
    } else {
      setPhase("waiting-ready");
      setStatusMsg("Waiting for your opponent to be ready…");
    }
  };

  const fire = (row: number, col: number) => {
    if (!myTurn || waitResult || phase !== "battle") return;
    if (enemyGrid[row][col] === "hit" || enemyGrid[row][col] === "miss") return;
    setWaitResult(true);
    relaySend({ type: "fire", row, col });
    setStatusMsg("Fired! Waiting for result…");
  };

  const enemyBoardDisplay: Board = { grid: enemyGrid, ships: [] };
  const canFire = myTurn && !waitResult && phase === "battle";

  if (winner) return (
    <div className="flex flex-col items-center gap-5">
      <p className="text-4xl font-black" style={{ color: winner === "me" ? "#22d3ee" : "#f87171" }}>
        {winner === "me" ? "🏆 You Win!" : "💀 You Lose!"}
      </p>
      <button onClick={onMenu} className="px-8 py-2 bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 font-bold rounded-xl">Menu</button>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-3xl">
      <div className="text-center px-4 py-2 bg-card border border-border rounded-xl text-sm max-w-sm">{statusMsg}</div>
      {lastLabel && phase === "battle" && <p className="text-xs text-cyan-400 -mt-2">{lastLabel}</p>}

      {phase === "placement" && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-3">
            <button onClick={autoPlace}
              className="px-5 py-2 bg-secondary hover:bg-secondary/80 rounded-lg font-semibold">⚡ Auto-Place</button>
            <button onClick={confirmReady}
              className="px-5 py-2 bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 font-bold rounded-lg">✓ Ready</button>
          </div>
          {myBoard.ships.length > 0 && <GridView board={myBoard} isTarget={false} label="Your Fleet" />}
        </div>
      )}

      {phase === "waiting-ready" && myBoard.ships.length > 0 && (
        <GridView board={myBoard} isTarget={false} label="Your Fleet (locked in)" />
      )}

      {phase === "battle" && (
        <div className="flex gap-6 flex-wrap justify-center">
          <GridView board={myBoard} isTarget={false} label="Your Grid" />
          <GridView
            board={enemyBoardDisplay} isTarget label={canFire ? "Enemy Grid — Click to fire!" : "Enemy Grid"}
            onAttack={fire} disabled={!canFire}
          />
        </div>
      )}

      <button onClick={onMenu} className="text-sm text-muted-foreground hover:text-foreground">← Menu</button>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
type Screen = "menu" | "ai" | "online-lobby" | "online-game";

export default function Battleship() {
  const [screen,      setScreen]      = useState<Screen>(() => getUrlRoomCode() ? "online-lobby" : "menu");
  const [onlineError, setOnlineError] = useState("");
  const [isHost,      setIsHost]      = useState(false);
  const [gameKey,     setGameKey]     = useState(0);

  // Stable ref so the relay callback can always reach the latest OnlineGame handler
  const onlineMsgHandlerRef = useRef<((d: unknown) => void) | null>(null);

  const { status: relayStatus, roomCode: onlineCode, role: relayRole,
          createRoom, joinRoom, send: relaySend, disconnect: relayDisconnect } =
    useRelaySocket("battleship", {
      onRoomCreated:    () => { /* relayStatus → "waiting" is visible via state */ },
      onRoomJoined:     () => { setIsHost(false);  setGameKey(k => k + 1); setScreen("online-game"); },
      onOpponentJoined: () => { setIsHost(true);   setGameKey(k => k + 1); setScreen("online-game"); },
      onMessage:        (data) => { onlineMsgHandlerRef.current?.(data); },
      onOpponentLeft:   () => { setOnlineError("Opponent disconnected."); relayDisconnect(); setScreen("menu"); },
      onError:          (msg)  => setOnlineError(msg),
    });

  // Called by OnlineGame to register its handler
  const registerHandler = useCallback((handler: (d: unknown) => void) => {
    onlineMsgHandlerRef.current = handler;
  }, []);

  const goMenu = useCallback(() => { relayDisconnect(); setScreen("menu"); }, [relayDisconnect]);

  if (screen === "menu") return (
    <Shell title="Battleship">
      <div className="flex flex-col items-center gap-6 max-w-xs w-full text-center py-4">
        <div className="text-7xl select-none" style={{ filter: "drop-shadow(0 6px 18px #22d3ee60)" }}>⚓</div>
        <h2 className="text-2xl font-black text-cyan-300">Battleship</h2>
        <div className="w-full flex flex-col gap-3">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">2 Players</p>
          <button onClick={() => setScreen("ai")}
            className="py-3 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 font-bold rounded-2xl transition-colors">
            🤖 vs Computer
            <span className="text-xs font-normal text-muted-foreground block mt-0.5">Play against the AI</span>
          </button>
          <button onClick={() => { setOnlineError(""); setScreen("online-lobby"); }}
            className="py-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 font-bold rounded-2xl transition-colors">
            🌐 Online Multiplayer
            <span className="text-xs font-normal text-muted-foreground block mt-0.5">Play against a friend online</span>
          </button>
        </div>
        {onlineError && <p className="text-red-400 text-sm">{onlineError}</p>}
      </div>
    </Shell>
  );

  if (screen === "ai") return (
    <Shell title="Battleship" controls="vs Computer">
      <AIGame onMenu={() => setScreen("menu")} />
    </Shell>
  );

  if (screen === "online-lobby") return (
    <Shell title="Battleship · Online">
      <OnlineLobby
        status={relayStatus}
        roomCode={onlineCode}
        error={onlineError}
        initialCode={getUrlRoomCode()}
        onHost={() => { setOnlineError(""); createRoom(); }}
        onJoin={(code) => { setOnlineError(""); joinRoom(code); }}
        onBack={() => { relayDisconnect(); setScreen("menu"); }}
      />
    </Shell>
  );

  // online-game
  return (
    <Shell title="Battleship · Online"
      controls={`You are ${relayRole === "host" ? "Player 1 (fires first)" : "Player 2"}`}>
      <OnlineGame
        key={gameKey}
        isHost={isHost}
        relaySend={relaySend}
        onMenu={goMenu}
        onMessage={registerHandler}
      />
    </Shell>
  );
}
