import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

function Shell({ title, controls, children }: { title: string; controls?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-4 px-4 py-3 border-b border-yellow-500/30 bg-gradient-to-r from-yellow-950/60 to-transparent">
        <Link href="/" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-sm transition-all">
          <ArrowLeft className="h-4 w-4" />
          <span>Menu</span>
        </Link>
        <span className="text-2xl select-none" style={{ filter: "drop-shadow(0 0 8px #facc1580)" }}>⌨️</span>
        <h1 className="text-lg font-bold text-yellow-400">{title}</h1>
        {controls && <span className="text-xs text-muted-foreground ml-auto hidden sm:block">{controls}</span>}
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">{children}</div>
    </div>
  );
}

const PASSAGES = [
  "the quick brown fox jumps over the lazy dog and then runs away into the forest",
  "practice makes perfect when it comes to typing fast and accurately every single day",
  "a journey of a thousand miles begins with a single step taken in the right direction",
  "to be or not to be that is the question whether tis nobler in the mind to suffer",
  "all that glitters is not gold often have you heard that told many a man his life has sold",
];

type PlayerState = { typed: string; wpm: number; done: boolean; startTime: number | null; errors: number };
const emptyP = (): PlayerState => ({ typed: "", wpm: 0, done: false, startTime: null, errors: 0 });

export default function TypingRacer() {
  const [passage, setPassage] = useState(PASSAGES[0]);
  const [p1, setP1] = useState<PlayerState>(emptyP());
  const [p2, setP2] = useState<PlayerState>(emptyP());
  const [winner, setWinner] = useState<string | null>(null);
  const [phase, setPhase] = useState<"lobby" | "playing" | "done">("lobby");
  const p1ref = useRef<HTMLTextAreaElement>(null);
  const p2ref = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const calcWpm = (typed: string, startTime: number) => {
    const mins = (Date.now() - startTime) / 60000;
    const words = typed.trim().split(/\s+/).length;
    return mins > 0 ? Math.round(words / mins) : 0;
  };

  const handleType = useCallback((player: 1 | 2, value: string, state: PlayerState, setState: (s: PlayerState) => void) => {
    if (state.done || phase !== "playing") return;
    const now = Date.now();
    const startTime = state.startTime ?? now;
    const correct = passage.startsWith(value);
    const errors = value.length > 0 && !correct ? state.errors + 1 : state.errors;
    const wpm = calcWpm(value, startTime);
    const done = value === passage;
    const next = { typed: value, wpm, done, startTime, errors };
    setState(next);
    if (done && !winner) {
      setWinner(player === 1 ? "Player 1 (Blue)" : "Player 2 (Red)");
      setPhase("done");
    }
  }, [passage, phase, winner]);

  useEffect(() => {
    if (phase === "playing") {
      timerRef.current = setInterval(() => {
        setP1(s => s.startTime && !s.done ? { ...s, wpm: calcWpm(s.typed, s.startTime) } : s);
        setP2(s => s.startTime && !s.done ? { ...s, wpm: calcWpm(s.typed, s.startTime) } : s);
      }, 500);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const start = () => {
    const idx = Math.floor(Math.random() * PASSAGES.length);
    setPassage(PASSAGES[idx]); setP1(emptyP()); setP2(emptyP()); setWinner(null); setPhase("playing");
    setTimeout(() => { p1ref.current?.focus(); }, 100);
  };

  const renderHighlight = (typed: string) => {
    return passage.split("").map((ch, i) => {
      let cls = "text-muted-foreground";
      if (i < typed.length) cls = typed[i] === ch ? "text-green-400" : "bg-red-500/30 text-red-300";
      else if (i === typed.length) cls = "text-white underline";
      return <span key={i} className={cls}>{ch}</span>;
    });
  };

  const pct = (typed: string) => Math.min(100, (typed.length / passage.length) * 100);

  return (
    <Shell title="Typing Racer" controls="Both players type the same passage — fastest wins!">
      {phase === "lobby" && (
        <div className="flex flex-col items-center gap-6 max-w-lg text-center">
          <p className="text-4xl">⌨️</p>
          <p className="text-muted-foreground">Two players, one keyboard. Each types the passage in their box — fastest correct finish wins!</p>
          <button onClick={start} className="px-8 py-3 bg-primary text-black font-bold rounded-xl text-lg">Start Race</button>
        </div>
      )}
      {(phase === "playing" || phase === "done") && (
        <div className="w-full max-w-5xl flex flex-col gap-6">
          {winner && (
            <div className="text-center py-3 bg-primary/20 border border-primary/40 rounded-xl">
              <span className="text-xl font-black text-primary">🏆 {winner} wins!</span>
            </div>
          )}
          <div className="font-mono text-base leading-relaxed bg-card border border-border rounded-xl p-4 select-none">
            {renderHighlight(p1.typed.length >= p2.typed.length ? p1.typed : p2.typed)}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* Player 1 */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-sm"><span className="text-sky-400 font-bold">Player 1 (Blue)</span><span className="text-muted-foreground font-mono">{p1.wpm} WPM</span></div>
              <div className="h-2 bg-secondary rounded-full"><div className="h-2 bg-sky-500 rounded-full transition-all" style={{ width: `${pct(p1.typed)}%` }} /></div>
              <textarea ref={p1ref} disabled={p1.done || phase === "done"} value={p1.typed}
                onChange={e => handleType(1, e.target.value, p1, setP1)}
                placeholder="Type here..." rows={3}
                className="font-mono text-sm p-3 bg-sky-950/40 border border-sky-800/50 rounded-lg resize-none focus:outline-none focus:border-sky-500 text-sky-100 placeholder:text-sky-900"
              />
              {p1.done && <span className="text-green-400 text-sm font-bold">✓ Finished! {p1.wpm} WPM</span>}
            </div>
            {/* Player 2 */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-sm"><span className="text-rose-400 font-bold">Player 2 (Red)</span><span className="text-muted-foreground font-mono">{p2.wpm} WPM</span></div>
              <div className="h-2 bg-secondary rounded-full"><div className="h-2 bg-rose-500 rounded-full transition-all" style={{ width: `${pct(p2.typed)}%` }} /></div>
              <textarea ref={p2ref} disabled={p2.done || phase === "done"} value={p2.typed}
                onChange={e => handleType(2, e.target.value, p2, setP2)}
                placeholder="Type here..." rows={3}
                className="font-mono text-sm p-3 bg-rose-950/40 border border-rose-800/50 rounded-lg resize-none focus:outline-none focus:border-rose-500 text-rose-100 placeholder:text-rose-900"
              />
              {p2.done && <span className="text-green-400 text-sm font-bold">✓ Finished! {p2.wpm} WPM</span>}
            </div>
          </div>
          {phase === "done" && <div className="text-center"><button onClick={start} className="px-8 py-2 bg-primary text-black font-bold rounded-xl">Race Again</button></div>}
        </div>
      )}
    </Shell>
  );
}
