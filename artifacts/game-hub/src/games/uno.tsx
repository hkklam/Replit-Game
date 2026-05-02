import { useState, useCallback } from "react";
import { GameShell } from "@/components/game-shell";

type Color = "red" | "green" | "blue" | "yellow" | "wild";
type CardType = "number" | "skip" | "reverse" | "draw2" | "wild" | "wild4";
type Card = { id: number; color: Color; type: CardType; value?: number };

let _id = 0;
function makeCard(color: Color, type: CardType, value?: number): Card { return { id: _id++, color, type, value }; }

function buildDeck(): Card[] {
  const colors: Color[] = ["red", "green", "blue", "yellow"];
  const deck: Card[] = [];
  colors.forEach(c => {
    deck.push(makeCard(c, "number", 0));
    for (let v = 1; v <= 9; v++) { deck.push(makeCard(c, "number", v)); deck.push(makeCard(c, "number", v)); }
    for (let i = 0; i < 2; i++) { deck.push(makeCard(c, "skip")); deck.push(makeCard(c, "reverse")); deck.push(makeCard(c, "draw2")); }
  });
  for (let i = 0; i < 4; i++) { deck.push(makeCard("wild", "wild")); deck.push(makeCard("wild", "wild4")); }
  return deck.sort(() => Math.random() - 0.5);
}

function canPlay(card: Card, top: Card, chosenColor: Color | null): boolean {
  const tc = chosenColor ?? top.color;
  if (card.color === "wild") return true;
  if (card.color === tc) return true;
  if (card.type === top.type && top.type === "number" && card.value === top.value) return true;
  if (card.type === top.type && top.type !== "number") return true;
  return false;
}

const COLOR_BG: Record<Color, string> = { red: "bg-red-500", green: "bg-green-500", blue: "bg-blue-500", yellow: "bg-yellow-400", wild: "bg-gradient-to-br from-red-500 via-blue-500 to-green-500" };
const COLOR_TEXT: Record<Color, string> = { red: "text-red-400", green: "text-green-400", blue: "text-blue-400", yellow: "text-yellow-400", wild: "text-purple-400" };

function CardView({ card, onClick, disabled, small }: { card: Card; onClick?: () => void; disabled?: boolean; small?: boolean }) {
  const label = card.type === "number" ? String(card.value) : card.type === "skip" ? "⊘" : card.type === "reverse" ? "⇄" : card.type === "draw2" ? "+2" : card.type === "wild4" ? "+4" : "★";
  const sz = small ? "w-8 h-12 text-xs" : "w-14 h-20 text-base";
  return (
    <div onClick={disabled ? undefined : onClick}
      className={`${sz} ${COLOR_BG[card.color]} rounded-lg flex items-center justify-center font-black text-white shadow-lg border-2 border-white/20 select-none ${disabled ? "opacity-50" : onClick ? "cursor-pointer hover:scale-110 hover:-translate-y-1 transition-transform" : ""}`}
    >{label}</div>
  );
}

function ColorPicker({ onPick }: { onPick: (c: Color) => void }) {
  const colors: Color[] = ["red", "green", "blue", "yellow"];
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4 items-center">
        <p className="font-bold text-lg">Choose a color</p>
        <div className="flex gap-3">{colors.map(c => <div key={c} onClick={() => onPick(c)} className={`w-16 h-16 ${COLOR_BG[c]} rounded-xl cursor-pointer hover:scale-110 transition-transform border-2 border-white/20`} />)}</div>
      </div>
    </div>
  );
}

export default function Uno() {
  const [deck, setDeck] = useState<Card[]>([]);
  const [hands, setHands] = useState<Card[][]>([[], []]);
  const [discard, setDiscard] = useState<Card[]>([]);
  const [turn, setTurn] = useState(0);
  const [chosenColor, setChosenColor] = useState<Color | null>(null);
  const [picking, setPicking] = useState(false);
  const [pending, setPending] = useState<Card | null>(null);
  const [winner, setWinner] = useState<number | null>(null);
  const [started, setStarted] = useState(false);
  const [unoWarning, setUnoWarning] = useState<string | null>(null);

  const start = useCallback(() => {
    const d = buildDeck();
    const h = [d.splice(0, 7), d.splice(0, 7)];
    let top = d.splice(0, 1)[0];
    while (top.type !== "number") { d.push(top); d.sort(() => Math.random() - 0.5); top = d.splice(0, 1)[0]; }
    setDeck(d); setHands(h); setDiscard([top]); setTurn(0); setChosenColor(null); setWinner(null); setStarted(true); setUnoWarning(null);
  }, []);

  const playCard = useCallback((card: Card) => {
    if (!started || winner !== null || picking) return;
    const top = discard[discard.length - 1];
    if (!canPlay(card, top, chosenColor)) { setUnoWarning("Can't play that card!"); setTimeout(() => setUnoWarning(null), 1500); return; }
    if (card.color === "wild") { setPending(card); setPicking(true); return; }
    applyPlay(card, null);
  }, [started, winner, picking, discard, chosenColor, turn, hands, deck]);

  const applyPlay = useCallback((card: Card, newColor: Color | null) => {
    const newHands = hands.map(h => h.filter(c => c.id !== card.id));
    const newDiscard = [...discard, card];
    let newDeck = [...deck];
    let nextTurn = 1 - turn;
    setChosenColor(newColor);
    if (card.type === "skip") nextTurn = turn;
    if (card.type === "draw2") {
      const drawn = newDeck.splice(0, 2);
      if (newDeck.length < 2) { newDeck = [...newDiscard.slice(0, -1)].sort(() => Math.random() - 0.5); }
      newHands[1 - turn] = [...newHands[1 - turn], ...drawn];
      nextTurn = turn;
    }
    if (card.type === "wild4") {
      const drawn = newDeck.splice(0, 4);
      newHands[1 - turn] = [...newHands[1 - turn], ...drawn];
      nextTurn = turn;
    }
    setHands(newHands); setDiscard(newDiscard); setDeck(newDeck); setTurn(nextTurn); setPending(null); setPicking(false);
    if (newHands[turn].length === 0) setWinner(turn);
  }, [hands, discard, deck, turn]);

  const pickColor = useCallback((c: Color) => { if (pending) applyPlay(pending, c); }, [pending, applyPlay]);

  const draw = useCallback(() => {
    if (!started || winner !== null) return;
    let newDeck = [...deck];
    if (newDeck.length === 0) { newDeck = [...discard.slice(0, -1)].sort(() => Math.random() - 0.5); setDiscard([discard[discard.length - 1]]); }
    const drawn = newDeck.splice(0, 1);
    const newHands = hands.map((h, i) => i === turn ? [...h, ...drawn] : h);
    setDeck(newDeck); setHands(newHands); setTurn(1 - turn);
  }, [started, winner, deck, discard, hands, turn]);

  const top = discard[discard.length - 1];
  const topColor = chosenColor ?? top?.color;
  const currentHand = hands[turn] ?? [];
  const otherCount = hands[1 - turn]?.length ?? 0;

  return (
    <GameShell title="Uno" controls="Local 2-player hotseat">
      {picking && <ColorPicker onPick={pickColor} />}
      {!started ? (
        <div className="flex flex-col items-center gap-6">
          <p className="text-5xl">🃏</p>
          <p className="text-muted-foreground text-center max-w-sm">Match colors or numbers. First to empty their hand wins! Wild cards let you choose the color.</p>
          <button onClick={start} className="px-8 py-3 bg-primary text-black font-bold rounded-xl text-lg">Deal Cards</button>
        </div>
      ) : winner !== null ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-3xl font-black text-primary">🎉 Player {winner + 1} Wins!</p>
          <button onClick={start} className="px-8 py-2 bg-primary text-black font-bold rounded-xl">Play Again</button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 w-full max-w-2xl">
          <div className="flex gap-6 items-center">
            <div className="text-center"><p className="text-xs text-muted-foreground mb-1">OPPONENT</p><div className="flex gap-1 flex-wrap justify-center">{Array(otherCount).fill(0).map((_, i) => <div key={i} className="w-8 h-12 bg-slate-700 rounded border border-slate-600" />)}</div><p className="text-xs text-muted-foreground mt-1">{otherCount} cards</p></div>
          </div>
          <div className="flex items-center gap-8 my-2">
            <div className="text-center"><p className="text-xs text-muted-foreground mb-1">DECK ({deck.length})</p><div onClick={draw} className="w-14 h-20 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 border-2 border-slate-500 flex items-center justify-center text-2xl select-none">🂠</div></div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">TOP CARD</p>
              {top && <div className={`w-14 h-20 ${COLOR_BG[topColor ?? top.color]} rounded-lg flex items-center justify-center font-black text-white text-xl border-4 border-white/30`}>{top.type === "number" ? top.value : top.type === "skip" ? "⊘" : top.type === "reverse" ? "⇄" : top.type === "draw2" ? "+2" : top.type === "wild4" ? "+4" : "★"}</div>}
            </div>
          </div>
          <div className={`text-sm font-bold px-3 py-1 rounded-full ${turn === 0 ? "bg-sky-600 text-white" : "bg-rose-600 text-white"}`}>Player {turn + 1}'s Turn</div>
          {unoWarning && <div className="text-red-400 text-sm font-semibold animate-pulse">{unoWarning}</div>}
          <div className="flex flex-col items-center gap-2 w-full">
            <p className="text-xs text-muted-foreground">YOUR HAND (Player {turn + 1})</p>
            <div className="flex flex-wrap gap-1.5 justify-center max-w-full p-3 bg-card border border-border rounded-xl">
              {currentHand.map(card => <CardView key={card.id} card={card} onClick={() => playCard(card)} disabled={!canPlay(card, top, chosenColor)} />)}
            </div>
          </div>
          <button onClick={draw} className="px-4 py-1.5 text-sm bg-secondary hover:bg-secondary/80 rounded-lg">Draw Card</button>
        </div>
      )}
    </GameShell>
  );
}
