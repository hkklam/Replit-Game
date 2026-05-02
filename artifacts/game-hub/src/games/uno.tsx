import { useState, useCallback, useEffect, useRef } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useOnlineMultiplayer } from "../lib/multiplayer";
import { OnlineLobby } from "../components/OnlineLobby";

function Shell({ title, controls, children }: { title: string; controls?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-4 px-4 py-3 border-b border-red-500/30 bg-gradient-to-r from-red-950/60 to-transparent">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Hub</span>
        </Link>
        <span className="text-2xl select-none" style={{ filter: "drop-shadow(0 0 8px #f8717180)" }}>🃏</span>
        <h1 className="text-lg font-bold text-red-400">{title}</h1>
        {controls && <span className="text-xs text-muted-foreground ml-auto hidden sm:block">{controls}</span>}
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">{children}</div>
    </div>
  );
}

type Color = "red" | "green" | "blue" | "yellow" | "wild";
type CardType = "number" | "skip" | "reverse" | "draw2" | "wild" | "wild4";
type Card = { id: number; color: Color; type: CardType; value?: number };

let _id = 0;
function mk(color: Color, type: CardType, value?: number): Card { return { id: _id++, color, type, value }; }

function buildDeck(): Card[] {
  const colors: Color[] = ["red", "green", "blue", "yellow"];
  const deck: Card[] = [];
  colors.forEach(c => {
    deck.push(mk(c, "number", 0));
    for (let v = 1; v <= 9; v++) { deck.push(mk(c, "number", v)); deck.push(mk(c, "number", v)); }
    for (let i = 0; i < 2; i++) { deck.push(mk(c, "skip")); deck.push(mk(c, "reverse")); deck.push(mk(c, "draw2")); }
  });
  for (let i = 0; i < 4; i++) { deck.push(mk("wild", "wild")); deck.push(mk("wild", "wild4")); }
  return deck.sort(() => Math.random() - 0.5);
}

function canPlay(card: Card, top: Card, cc: Color | null): boolean {
  const tc = cc ?? top.color;
  if (card.color === "wild") return true;
  if (card.color === tc) return true;
  if (card.type === top.type && top.type === "number" && card.value === top.value) return true;
  if (card.type === top.type && top.type !== "number") return true;
  return false;
}

type UnoState = {
  deck: Card[]; hands: Card[][];  discard: Card[];
  turn: number; direction: 1 | -1;
  chosenColor: Color | null; winner: number | null;
  playerCount: number; isAI: boolean[]; names: string[];
};

function initGame(playerCount: number, isAI: boolean[], names: string[]): UnoState {
  const d = buildDeck();
  const hands: Card[][] = Array.from({ length: playerCount }, () => d.splice(0, 7));
  let top = d.splice(0, 1)[0];
  while (top.type !== "number") { d.push(top); d.sort(() => Math.random() - 0.5); top = d.splice(0, 1)[0]; }
  return { deck: d, hands, discard: [top], turn: 0, direction: 1, chosenColor: null, winner: null, playerCount, isAI, names };
}

function applyPlay(s: UnoState, card: Card, newColor: Color | null): UnoState {
  const pc = s.playerCount; const cur = s.turn; const dir = s.direction;
  const next1 = (cur + dir + pc) % pc;
  const next2 = (cur + 2 * dir + pc) % pc;
  const newHands = s.hands.map((h, i) => i === cur ? h.filter(c => c.id !== card.id) : [...h]);
  const newDiscard = [...s.discard, card];
  let newDeck = [...s.deck];
  let newDir = dir as 1 | -1;
  let nextTurn = next1;
  const chosenColor = card.color === "wild" ? newColor : null;

  const ensureDeck = (need: number) => {
    if (newDeck.length < need && newDiscard.length > 1) {
      newDeck = [...newDeck, ...newDiscard.slice(0, -1).sort(() => Math.random() - 0.5)];
    }
  };

  if (card.type === "reverse") {
    newDir = (dir === 1 ? -1 : 1) as 1 | -1;
    nextTurn = pc === 2 ? cur : (cur + newDir + pc) % pc;
  } else if (card.type === "skip") {
    nextTurn = next2;
  } else if (card.type === "draw2") {
    ensureDeck(2);
    newHands[next1] = [...newHands[next1], ...newDeck.splice(0, Math.min(2, newDeck.length))];
    nextTurn = next2;
  } else if (card.type === "wild4") {
    ensureDeck(4);
    newHands[next1] = [...newHands[next1], ...newDeck.splice(0, Math.min(4, newDeck.length))];
    nextTurn = next2;
  }

  const winner = newHands[cur].length === 0 ? cur : null;
  return { ...s, hands: newHands, discard: newDiscard, deck: newDeck, turn: nextTurn, direction: newDir, chosenColor, winner };
}

function applyDraw(s: UnoState, playerIdx: number): UnoState {
  let newDeck = [...s.deck];
  if (newDeck.length === 0 && s.discard.length > 1) {
    newDeck = s.discard.slice(0, -1).sort(() => Math.random() - 0.5);
  }
  if (newDeck.length === 0) return s;
  const drawn = newDeck.splice(0, 1);
  const newHands = s.hands.map((h, i) => i === playerIdx ? [...h, ...drawn] : h);
  const nextTurn = (playerIdx + s.direction + s.playerCount) % s.playerCount;
  return { ...s, deck: newDeck, hands: newHands, turn: nextTurn };
}

function pickAICard(hand: Card[], top: Card, cc: Color | null): Card | null {
  const playable = hand.filter(c => canPlay(c, top, cc));
  if (!playable.length) return null;
  const pri = (c: Card) => c.type === "wild4" ? 5 : c.type === "draw2" ? 4 : c.type === "wild" ? 3 : c.type === "skip" ? 2 : c.type === "reverse" ? 2 : 1;
  return [...playable].sort((a, b) => pri(b) - pri(a))[0];
}

function pickAIColor(hand: Card[]): Color {
  const counts: Record<string, number> = { red: 0, green: 0, blue: 0, yellow: 0 };
  hand.forEach(c => { if (c.color in counts) counts[c.color]++; });
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return (best?.[0] ?? "red") as Color;
}

const CB: Record<Color, string> = { red: "bg-red-500", green: "bg-green-500", blue: "bg-blue-500", yellow: "bg-yellow-400", wild: "bg-gradient-to-br from-red-500 via-blue-500 to-green-500" };
const CT: Record<Color, string> = { red: "text-red-400", green: "text-green-400", blue: "text-blue-400", yellow: "text-yellow-400", wild: "text-purple-400" };

function CardView({ card, onClick, disabled, small }: { card: Card; onClick?: () => void; disabled?: boolean; small?: boolean }) {
  const label = card.type === "number" ? String(card.value) : card.type === "skip" ? "⊘" : card.type === "reverse" ? "⇄" : card.type === "draw2" ? "+2" : card.type === "wild4" ? "+4" : "★";
  const sz = small ? "w-8 h-12 text-xs" : "w-14 h-20 text-base";
  const playable = !disabled && !!onClick;
  return (
    <div onClick={disabled ? undefined : onClick}
      className={`${sz} ${CB[card.color]} rounded-lg flex items-center justify-center font-black text-white shadow-lg border-2 select-none transition-transform
        ${disabled ? "opacity-40 cursor-not-allowed" : playable ? "cursor-pointer hover:scale-110 hover:-translate-y-2 border-white/40" : "border-white/20"}`}>
      {label}
    </div>
  );
}

function ColorPicker({ onPick }: { onPick: (c: Color) => void }) {
  const colors: Color[] = ["red", "green", "blue", "yellow"];
  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4 items-center shadow-2xl">
        <p className="font-bold text-lg">Choose a color</p>
        <div className="flex gap-3">
          {colors.map(c => (
            <div key={c} onClick={() => onPick(c)} className={`w-16 h-16 ${CB[c]} rounded-xl cursor-pointer hover:scale-110 transition-transform border-2 border-white/20 flex items-center justify-center`} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Uno() {
  const [screen, setScreen] = useState<"menu" | "ai-setup" | "online-lobby" | "game">("menu");
  const [mode, setMode] = useState<"ai" | "online">("ai");
  const [aiCount, setAiCount] = useState(1);
  const [gs, setGs] = useState<UnoState | null>(null);
  const [picking, setPicking] = useState(false);
  const [pendingWild, setPendingWild] = useState<Card | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const gsRef = useRef<UnoState | null>(null);
  gsRef.current = gs;

  const mp = useOnlineMultiplayer({
    onGuestJoined: useCallback(() => {
      const newGs = initGame(2, [false, false], ["Host", "Guest"]);
      setGs(newGs); setMode("online"); setScreen("game");
    }, []),
    onGameState: useCallback((data: unknown) => {
      setGs(data as UnoState); setScreen("game");
    }, []),
    onInput: useCallback((data: unknown) => {
      const inp = data as { action: string; cardId?: number; color?: Color };
      const s = gsRef.current;
      if (!s || s.turn !== 1 || s.winner !== null) return;
      if (inp.action === "play" && inp.cardId != null) {
        const card = s.hands[1].find(c => c.id === inp.cardId);
        if (!card || !canPlay(card, s.discard[s.discard.length - 1], s.chosenColor)) return;
        const newGs = applyPlay(s, card, inp.color ?? null);
        setGs(newGs);
      } else if (inp.action === "draw") {
        setGs(applyDraw(s, 1));
      }
    }, []),
    onOpponentLeft: useCallback(() => { setMsg("Opponent disconnected"); }, []),
  });

  const mpRef = useRef(mp);
  mpRef.current = mp;

  useEffect(() => {
    if (!gs || mode !== "online" || mpRef.current.role !== "host" || mpRef.current.status !== "connected") return;
    mpRef.current.sendGameState(gs);
  }, [gs, mode]);

  useEffect(() => {
    if (!gs || gs.winner !== null || mode !== "ai" || !gs.isAI[gs.turn]) return;
    setAiThinking(true);
    const id = setTimeout(() => {
      const s = gsRef.current;
      if (!s || !s.isAI[s.turn] || s.winner !== null) { setAiThinking(false); return; }
      const top = s.discard[s.discard.length - 1];
      const card = pickAICard(s.hands[s.turn], top, s.chosenColor);
      if (card) {
        const color = card.color === "wild" ? pickAIColor(s.hands[s.turn]) : null;
        setGs(applyPlay(s, card, color));
      } else {
        setGs(applyDraw(s, s.turn));
      }
      setAiThinking(false);
    }, 750);
    return () => { clearTimeout(id); setAiThinking(false); };
  }, [gs?.turn, gs?.winner, mode]);

  const myIdx = mode === "online" && mp.role === "guest" ? 1 : 0;

  const showMsg = useCallback((m: string) => { setMsg(m); setTimeout(() => setMsg(null), 1800); }, []);

  const playCard = useCallback((card: Card) => {
    const s = gsRef.current;
    if (!s || s.winner !== null || picking || s.turn !== myIdx) return;
    if (s.isAI[s.turn]) return;
    const top = s.discard[s.discard.length - 1];
    if (!canPlay(card, top, s.chosenColor)) { showMsg("Can't play that card!"); return; }
    if (card.color === "wild") { setPendingWild(card); setPicking(true); return; }
    if (mode === "online" && mp.role === "guest") {
      mp.sendInput({ action: "play", cardId: card.id });
    } else {
      setGs(applyPlay(s, card, null));
    }
  }, [picking, myIdx, mode, mp.role, mp.sendInput, showMsg]);

  const pickColor = useCallback((color: Color) => {
    const s = gsRef.current;
    if (!pendingWild || !s) return;
    if (mode === "online" && mp.role === "guest") {
      mp.sendInput({ action: "play", cardId: pendingWild.id, color });
    } else {
      setGs(applyPlay(s, pendingWild, color));
    }
    setPendingWild(null); setPicking(false);
  }, [pendingWild, mode, mp.role, mp.sendInput]);

  const drawCard = useCallback(() => {
    const s = gsRef.current;
    if (!s || s.winner !== null || s.turn !== myIdx || s.isAI[s.turn]) return;
    if (mode === "online" && mp.role === "guest") {
      mp.sendInput({ action: "draw" });
    } else {
      setGs(applyDraw(s, myIdx));
    }
  }, [myIdx, mode, mp.role, mp.sendInput]);

  const startAI = useCallback(() => {
    const names = ["You", ...Array.from({ length: aiCount }, (_, i) => `AI ${i + 1}`)];
    const isAI = [false, ...Array(aiCount).fill(true)];
    setGs(initGame(aiCount + 1, isAI, names));
    setMode("ai"); setScreen("game"); setMsg(null); setPicking(false); setPendingWild(null);
  }, [aiCount]);

  if (screen === "menu") return (
    <Shell title="UNO">
      <div className="flex flex-col items-center gap-8 text-center max-w-sm">
        <div className="text-6xl select-none">🃏</div>
        <h2 className="text-2xl font-black text-red-400">Select Mode</h2>
        <div className="flex flex-col gap-3 w-full">
          <button onClick={() => setScreen("ai-setup")} className="w-full py-4 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-300 font-black rounded-2xl transition-colors">
            🤖 vs AI
            <div className="text-xs font-normal text-muted-foreground mt-1">Play against 1–3 computer opponents</div>
          </button>
          <button onClick={() => { setMode("online"); setScreen("online-lobby"); }} className="w-full py-4 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/50 text-sky-400 font-black rounded-2xl transition-colors">
            🌐 Online
            <div className="text-xs font-normal text-muted-foreground mt-1">Play vs a friend over the internet</div>
          </button>
        </div>
      </div>
    </Shell>
  );

  if (screen === "ai-setup") return (
    <Shell title="UNO — vs AI">
      <div className="flex flex-col items-center gap-6 max-w-sm w-full">
        <div className="text-5xl">🤖</div>
        <h2 className="text-xl font-black text-purple-400">How many opponents?</h2>
        <div className="flex gap-3 w-full">
          {[1, 2, 3].map(n => (
            <button key={n} onClick={() => setAiCount(n)} className={`flex-1 py-4 rounded-2xl border font-black transition-colors
              ${aiCount === n ? "bg-purple-500/30 border-purple-400 text-purple-300" : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"}`}>
              {n}<div className="text-xs font-normal mt-1">{n === 1 ? "1v1" : n === 2 ? "3-player" : "4-player"}</div>
            </button>
          ))}
        </div>
        <div className="text-sm text-muted-foreground text-center">
          You vs {aiCount === 1 ? "1 AI opponent" : `${aiCount} AI opponents`} · Match colors or values · First to empty hand wins
        </div>
        <button onClick={startAI} className="w-full py-3 bg-purple-500 hover:bg-purple-400 text-white font-black rounded-xl transition-colors text-lg">
          Deal Cards 🃏
        </button>
        <button onClick={() => setScreen("menu")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</button>
      </div>
    </Shell>
  );

  if (screen === "online-lobby") return (
    <Shell title="UNO — Online">
      <OnlineLobby
        status={mp.status} roomCode={mp.roomCode} role={mp.role} error={mp.error}
        onCreate={() => mp.createRoom("uno")}
        onJoin={(code) => { setMode("online"); mp.joinRoom(code); setScreen("game"); }}
        onDisconnect={() => mp.disconnect()}
        onBack={() => { mp.disconnect(); setScreen("menu"); }}
      />
    </Shell>
  );

  if (!gs) return (
    <Shell title="UNO">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin text-4xl">🃏</div>
        <p className="text-muted-foreground">{mode === "online" ? "Waiting for host to start…" : "Loading…"}</p>
        <button onClick={() => { mp.disconnect(); setScreen("menu"); }} className="text-sm text-muted-foreground hover:text-foreground">← Back to menu</button>
      </div>
    </Shell>
  );

  const top = gs.discard[gs.discard.length - 1];
  const topColor = gs.chosenColor ?? top?.color;
  const myHand = gs.hands[myIdx] ?? [];
  const isMyTurn = gs.turn === myIdx && !gs.isAI[myIdx];
  const opponents = gs.names.slice(1).map((name, i) => ({ name, hand: gs.hands[i + 1], idx: i + 1, isAI: gs.isAI[i + 1] }));

  return (
    <Shell title={mode === "online" ? "UNO — Online" : `UNO — vs ${aiCount === 1 ? "AI" : aiCount + " AI"}`}
      controls={mode === "online" ? (mp.role === "host" ? "🟢 Host" : "🔵 Guest") : `${aiCount + 1}-player game`}>
      {picking && <ColorPicker onPick={pickColor} />}

      {gs.winner !== null ? (
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="text-5xl">🎉</div>
          <p className="text-3xl font-black text-primary">{gs.names[gs.winner]} Wins!</p>
          <div className="flex gap-3">
            {mode === "ai" && <button onClick={startAI} className="px-8 py-2 bg-primary text-black font-bold rounded-xl">Play Again</button>}
            <button onClick={() => { mp.disconnect(); setGs(null); setScreen("menu"); }} className="px-6 py-2 bg-secondary text-foreground font-bold rounded-xl">Menu</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 w-full max-w-2xl">
          <div className="flex flex-wrap gap-3 justify-center w-full">
            {opponents.map(op => (
              <div key={op.idx} className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl border transition-colors
                ${gs.turn === op.idx ? "bg-primary/15 border-primary/50" : "bg-card border-border"}`}>
                <div className="flex items-center gap-2 text-xs font-semibold">
                  {op.isAI ? "🤖" : "🌐"} {op.name}
                  {gs.turn === op.idx && (aiThinking ? <span className="animate-pulse">🤔</span> : <span className="text-primary">▶</span>)}
                  {op.hand.length === 1 && <span className="text-yellow-400 font-black">UNO!</span>}
                </div>
                <div className="flex gap-0.5 flex-wrap justify-center max-w-[220px]">
                  {op.hand.map((_, j) => <div key={j} className="w-7 h-10 bg-slate-700 rounded border border-slate-600" />)}
                </div>
                <span className="text-xs text-muted-foreground">{op.hand.length} cards</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-8 my-1">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">DECK ({gs.deck.length})</p>
              <div onClick={isMyTurn ? drawCard : undefined} className={`w-14 h-20 bg-slate-700 rounded-lg flex items-center justify-center text-2xl border-2 border-slate-500 ${isMyTurn ? "cursor-pointer hover:bg-slate-600" : "opacity-50"}`}>🂠</div>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">TOP CARD</p>
              {top && (
                <>
                  <div className={`w-14 h-20 ${CB[topColor ?? top.color]} rounded-lg flex items-center justify-center font-black text-white text-xl border-4 border-white/30`}>
                    {top.type === "number" ? top.value : top.type === "skip" ? "⊘" : top.type === "reverse" ? "⇄" : top.type === "draw2" ? "+2" : top.type === "wild4" ? "+4" : "★"}
                  </div>
                  {gs.chosenColor && top.color === "wild" && (
                    <div className={`text-xs font-bold mt-1 ${CT[gs.chosenColor]}`}>▲ {gs.chosenColor}</div>
                  )}
                </>
              )}
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className={`text-xs font-black px-3 py-1 rounded-full ${isMyTurn ? "bg-green-600/30 border border-green-500/60 text-green-400" : "bg-slate-700 text-muted-foreground"}`}>
                {isMyTurn ? "Your Turn" : `${gs.names[gs.turn]}'s Turn`}
              </div>
              {gs.playerCount > 2 && <div className="text-xs text-muted-foreground">{gs.direction === 1 ? "→" : "←"} direction</div>}
              {msg && <div className="text-red-400 text-xs font-semibold animate-pulse">{msg}</div>}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 w-full">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>YOUR HAND ({myHand.length} cards)</span>
              {myHand.length === 1 && <span className="text-yellow-400 font-black animate-bounce">🎉 UNO!</span>}
            </div>
            <div className="flex flex-wrap gap-1.5 justify-center p-3 bg-card border border-border rounded-xl w-full overflow-y-auto" style={{ maxHeight: "220px" }}>
              {myHand.map(card => (
                <CardView key={card.id} card={card}
                  onClick={isMyTurn ? () => playCard(card) : undefined}
                  disabled={!isMyTurn || !canPlay(card, top, gs.chosenColor)} />
              ))}
              {myHand.length === 0 && <p className="text-muted-foreground text-sm italic">No cards!</p>}
            </div>
            {isMyTurn && (
              <button onClick={drawCard} className="px-5 py-1.5 text-sm bg-secondary hover:bg-secondary/80 border border-border rounded-lg font-semibold">
                Draw Card
              </button>
            )}
            {!isMyTurn && gs.winner === null && mode === "online" && (
              <p className="text-xs text-muted-foreground">Waiting for {gs.names[gs.turn]}…</p>
            )}
          </div>
        </div>
      )}
    </Shell>
  );
}
