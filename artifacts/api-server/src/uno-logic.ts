export type LColor = "red" | "green" | "blue" | "yellow";
export type DColor = "pink" | "orange" | "teal" | "purple";
export type Color = LColor | DColor | "wild";
export type CardType =
  | "number" | "skip" | "reverse" | "draw2" | "wild" | "wild4"
  | "flip" | "draw5" | "skipAll" | "wildColor" | "wildAll";
export type Variant = "classic" | "flip" | "progressive" | "seveno";
export type Card = { id: number; color: Color; type: CardType; value?: number; dark?: boolean };

export type UnoState = {
  deck: Card[];
  hands: Card[][];
  discard: Card[];
  turn: number;
  direction: 1 | -1;
  chosenColor: Color | null;
  winner: number | null;
  playerCount: number;
  names: string[];
  variant: Variant;
  isFlipped: boolean;
  stackedDraw: number;
  sevenSwap: boolean;
};

export type PlayerView = {
  myHand: Card[];
  handSizes: number[];
  names: string[];
  turn: number;
  direction: 1 | -1;
  chosenColor: Color | null;
  topCard: Card;
  winner: number | null;
  deckSize: number;
  stackedDraw: number;
  isFlipped: boolean;
  myIdx: number;
  variant: Variant;
  sevenSwap: boolean;
  winnerName: string | null;
};

let _id = 10000;
const mk = (color: Color, type: CardType, value?: number, dark = false): Card =>
  ({ id: _id++, color, type, value, dark });

const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5);

export function buildDeck(variant: Variant): Card[] {
  const lc: LColor[] = ["red", "green", "blue", "yellow"];
  const dc: DColor[] = ["pink", "orange", "teal", "purple"];
  const cards: Card[] = [];

  lc.forEach(c => {
    cards.push(mk(c, "number", 0));
    for (let v = 1; v <= 9; v++) { cards.push(mk(c, "number", v)); cards.push(mk(c, "number", v)); }
    [1, 2].forEach(() => { cards.push(mk(c, "skip")); cards.push(mk(c, "reverse")); cards.push(mk(c, "draw2")); });
    if (variant === "flip") [1, 2].forEach(() => cards.push(mk(c, "flip")));
  });
  for (let i = 0; i < 4; i++) { cards.push(mk("wild", "wild")); cards.push(mk("wild", "wild4")); }

  if (variant !== "flip") return shuffle(cards);

  const dark: Card[] = [];
  dc.forEach(c => {
    dark.push(mk(c, "number", 1, true));
    for (let v = 2; v <= 9; v++) { dark.push(mk(c, "number", v, true)); dark.push(mk(c, "number", v, true)); }
    [1, 2].forEach(() => {
      dark.push(mk(c, "skip", undefined, true));
      dark.push(mk(c, "reverse", undefined, true));
      dark.push(mk(c, "draw5", undefined, true));
    });
    dark.push(mk(c, "skipAll", undefined, true));
    dark.push(mk(c, "flip", undefined, true));
  });
  dark.push(mk("wild", "wildColor", undefined, true));
  dark.push(mk("wild", "wildColor", undefined, true));
  dark.push(mk("wild", "wildAll", undefined, true));
  dark.push(mk("wild", "wildAll", undefined, true));
  return shuffle([...cards, ...dark]);
}

function firstCard(deck: Card[]): { top: Card; remaining: Card[] } {
  const d = [...deck];
  let i = d.findIndex(c => c.type === "number" && !c.dark);
  if (i < 0) i = d.findIndex(c => !c.dark);
  const top = d.splice(i, 1)[0];
  return { top, remaining: d };
}

export function initGame(names: string[], variant: Variant): UnoState {
  const pc = names.length;
  const fullDeck = buildDeck(variant);
  const hands: Card[][] = Array.from({ length: pc }, () => fullDeck.splice(0, 7));
  const { top, remaining } = firstCard(fullDeck);
  return {
    deck: remaining, hands, discard: [top], turn: 0, direction: 1,
    chosenColor: null, winner: null, playerCount: pc, names,
    variant, isFlipped: false, stackedDraw: 0, sevenSwap: false,
  };
}

export function canPlay(card: Card, top: Card, cc: Color | null, variant: Variant, stacked: number): boolean {
  if (card.color === "wild") return true;
  const tc = cc ?? top.color;
  if (variant === "progressive" && stacked > 0) {
    if (top.type === "draw2") return card.type === "draw2";
    if (top.type === "wild4") return card.type === "wild4";
  }
  if (card.color === tc) return true;
  if (card.type === top.type) {
    if (top.type === "number") return card.value === top.value;
    return true;
  }
  return false;
}

export function applyPlay(s: UnoState, card: Card, newColor: Color | null, swapTarget?: number): UnoState {
  const pc = s.playerCount; const cur = s.turn; const dir = s.direction;
  const next1 = (cur + dir + pc) % pc;
  const next2 = (cur + 2 * dir + pc) % pc;
  const newHands = s.hands.map((h, i) => i === cur ? h.filter(c => c.id !== card.id) : [...h]);
  const newDiscard = [...s.discard, card];
  let newDeck = [...s.deck];
  let newDir = dir as 1 | -1;
  let nextTurn = next1;
  let chosenColor = card.color === "wild" ? newColor : null;
  let stackedDraw = s.stackedDraw;
  let sevenSwap = false;
  let isFlipped = s.isFlipped;

  const ensureDeck = (n: number) => {
    if (newDeck.length < n && newDiscard.length > 1)
      newDeck = [...newDeck, ...shuffle(newDiscard.slice(0, -1))];
  };
  const drawN = (pidx: number, n: number) => {
    ensureDeck(n);
    newHands[pidx] = [...newHands[pidx], ...newDeck.splice(0, Math.min(n, newDeck.length))];
  };

  if (card.type === "reverse") {
    newDir = (dir === 1 ? -1 : 1) as 1 | -1;
    nextTurn = pc === 2 ? cur : (cur + newDir + pc) % pc;
  } else if (card.type === "skip") {
    nextTurn = next2;
  } else if (card.type === "skipAll") {
    nextTurn = cur;
  } else if (card.type === "draw2") {
    if (s.variant === "progressive") { stackedDraw += 2; nextTurn = next1; }
    else { drawN(next1, 2); nextTurn = next2; }
  } else if (card.type === "draw5") {
    drawN(next1, 5); nextTurn = next2;
  } else if (card.type === "wild4") {
    if (s.variant === "progressive") { stackedDraw += 4; nextTurn = next2; }
    else { drawN(next1, 4); nextTurn = next2; }
  } else if (card.type === "wildColor") {
    const targetColor = newColor!;
    const drawn: Card[] = [];
    ensureDeck(10);
    while (newDeck.length > 0) {
      const c = newDeck.splice(0, 1)[0];
      drawn.push(c);
      if (c.color === targetColor) break;
    }
    newHands[next1] = [...newHands[next1], ...drawn];
    nextTurn = next2; chosenColor = targetColor as Color;
  } else if (card.type === "wildAll") {
    const targetColor = newColor!;
    for (let i = 0; i < pc; i++) {
      if (i === cur) continue;
      ensureDeck(5);
      const drawn: Card[] = [];
      while (newDeck.length > 0) {
        const c = newDeck.splice(0, 1)[0];
        drawn.push(c);
        if (c.color === targetColor) break;
      }
      newHands[i] = [...newHands[i], ...drawn];
    }
    nextTurn = next1;
  } else if (card.type === "flip") {
    isFlipped = !isFlipped;
  }

  if (s.variant === "seveno") {
    if (card.type === "number" && card.value === 7) {
      sevenSwap = true; nextTurn = cur;
    } else if (card.type === "number" && card.value === 0) {
      if (dir === 1) {
        const first = newHands[0];
        for (let i = 0; i < pc - 1; i++) newHands[i] = newHands[i + 1];
        newHands[pc - 1] = first;
      } else {
        const last = newHands[pc - 1];
        for (let i = pc - 1; i > 0; i--) newHands[i] = newHands[i - 1];
        newHands[0] = last;
      }
    }
  }

  if (swapTarget !== undefined && swapTarget !== cur) {
    const tmp = newHands[cur];
    newHands[cur] = newHands[swapTarget];
    newHands[swapTarget] = tmp;
  }

  const winner = newHands[cur].length === 0 ? cur : null;
  return {
    ...s, hands: newHands, discard: newDiscard, deck: newDeck,
    turn: nextTurn, direction: newDir, chosenColor, winner, stackedDraw, sevenSwap, isFlipped,
  };
}

export function applyForcedDraw(s: UnoState): UnoState {
  let newDeck = [...s.deck];
  if (newDeck.length < 1 && s.discard.length > 1)
    newDeck = [...newDeck, ...shuffle(s.discard.slice(0, -1))];
  const n = s.stackedDraw > 0 ? s.stackedDraw : 1;
  const newHands = s.hands.map((h, i) =>
    i === s.turn ? [...h, ...newDeck.splice(0, Math.min(n, newDeck.length))] : h
  );
  const nextTurn = (s.turn + s.direction + s.playerCount) % s.playerCount;
  return { ...s, deck: newDeck, hands: newHands, turn: nextTurn, stackedDraw: 0 };
}

export function buildPlayerView(state: UnoState, playerIdx: number): PlayerView {
  return {
    myHand: state.hands[playerIdx],
    handSizes: state.hands.map(h => h.length),
    names: state.names,
    turn: state.turn,
    direction: state.direction,
    chosenColor: state.chosenColor,
    topCard: state.discard[state.discard.length - 1],
    winner: state.winner,
    deckSize: state.deck.length,
    stackedDraw: state.stackedDraw,
    isFlipped: state.isFlipped,
    myIdx: playerIdx,
    variant: state.variant,
    sevenSwap: state.sevenSwap,
    winnerName: state.winner !== null ? state.names[state.winner] : null,
  };
}
