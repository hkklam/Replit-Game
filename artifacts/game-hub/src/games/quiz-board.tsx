import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'wouter';
import { useQbOnline } from '../lib/qb-online';
import type { QbOnlineGs } from '../lib/qb-online';

import { QUESTION_BANK, QEntry, QBank } from '../lib/qb-questions';


const ALL_CATEGORIES = Object.keys(QUESTION_BANK);
const BASE_PACK = ["Science & Nature", "World Geography", "World History", "Literature & Arts", "Sports & Games", "Technology & Inventions"];
const EXPANDED_PACK = ["Wordplay & Vocabulary", "Music & Instruments", "Food & Drink", "Math & Logic", "Famous People", "The Human Body"];
const VALUES = [100, 200, 300, 400, 500] as const;

// ─── ANSWER VALIDATION ────────────────────────────────────────────────────────
function normalizeAnswer(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function checkAnswer(input: string, entry: QEntry): boolean {
  const norm = normalizeAnswer(input);
  if (!norm) return false;
  if (normalizeAnswer(entry.a).includes(norm) || norm.includes(normalizeAnswer(entry.a))) return true;
  if (entry.alt) {
    for (const alt of entry.alt) {
      const na = normalizeAnswer(alt);
      if (na.includes(norm) || norm.includes(na)) return true;
    }
  }
  return false;
}

// ─── TYPES ────────────────────────────────────────────────────────────────────
type GameScreen = 'menu' | 'setup' | 'board' | 'clue' | 'result' | 'final';
type Pack = 'base' | 'expanded' | 'all';

interface Player { name: string; score: number; }
interface ClueState {
  category: string; value: number; entry: QEntry;
  answered: boolean; correct: boolean | null;
}

interface GameState {
  players: Player[];
  currentPlayer: number;
  board: Record<string, Record<number, QEntry>>;
  usedClues: Set<string>;
  activeClue: ClueState | null;
  timerSecs: number;
}

function buildBoard(categories: string[]): Record<string, Record<number, QEntry>> {
  const board: Record<string, Record<number, QEntry>> = {};
  for (const cat of categories) {
    board[cat] = {};
    for (const val of VALUES) {
      const pool = QUESTION_BANK[cat]?.[val] ?? [];
      if (pool.length > 0) {
        board[cat][val] = pool[Math.floor(Math.random() * pool.length)];
      }
    }
  }
  return board;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const CAT_COLORS: Record<string, string> = {
  "Science & Nature": "#1d4ed8",
  "World Geography": "#065f46",
  "World History": "#92400e",
  "Literature & Arts": "#7c2d8a",
  "Sports & Games": "#9d174d",
  "Technology & Inventions": "#1e40af",
  "Wordplay & Vocabulary": "#0369a1",
  "Music & Instruments": "#7c3aed",
  "Food & Drink": "#c2410c",
  "Math & Logic": "#0f766e",
  "Famous People": "#b45309",
  "The Human Body": "#be123c",
};

// ─── TIMER HOOK ───────────────────────────────────────────────────────────────
function useTimer(initial: number, active: boolean, onEnd: () => void, paused = false) {
  const [time, setTime] = useState(initial);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active || paused) { if (ref.current) clearInterval(ref.current); return; }
    if (!paused) setTime(t => t); // keep current time when resuming
    ref.current = setInterval(() => {
      setTime(t => { if (t <= 1) { clearInterval(ref.current!); onEnd(); return 0; } return t - 1; });
    }, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [active, paused]);

  useEffect(() => { if (active) setTime(initial); }, [active, initial]);

  return time;
}

// ─── SETUP SCREEN ─────────────────────────────────────────────────────────────
function SetupScreen({ onStart }: { onStart: (players: Player[], cats: string[], timer: number) => void }) {
  const [playerCount, setPlayerCount] = useState(2);
  const [names, setNames] = useState(['', '', '', '']);
  const [pack, setPack] = useState<Pack>('all');
  const [timerSecs, setTimerSecs] = useState(30);
  const [customCats, setCustomCats] = useState<string[]>([]);
  const [useCustom, setUseCustom] = useState(false);

  const availCats = pack === 'base' ? BASE_PACK : pack === 'expanded' ? EXPANDED_PACK : ALL_CATEGORIES;

  const toggleCat = (c: string) =>
    setCustomCats(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const handleStart = () => {
    let cats: string[];
    if (useCustom && customCats.length >= 6) {
      cats = shuffle(customCats).slice(0, 6);
    } else {
      cats = shuffle(availCats).slice(0, 6);
    }
    const players = names.slice(0, playerCount).map((n, i) => ({
      name: n.trim() || `Player ${i + 1}`, score: 0
    }));
    onStart(players, cats, timerSecs);
  };

  const PLAYER_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'];

  return (
    <div style={{ padding: '16px', maxWidth: 480, margin: '0 auto', fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Players</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[1, 2, 3, 4].map(n => (
          <button key={n} onClick={() => setPlayerCount(n)} style={{
            flex: 1, padding: '8px 0', borderRadius: 8, border: `2px solid ${playerCount === n ? '#fbbf24' : 'rgba(255,255,255,0.08)'}`,
            background: playerCount === n ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.04)',
            color: playerCount === n ? '#fbbf24' : '#555', fontWeight: 700, fontSize: 16, cursor: 'pointer',
          }}>{n}</button>
        ))}
      </div>
      {Array.from({ length: playerCount }, (_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: PLAYER_COLORS[i], flexShrink: 0 }} />
          <input value={names[i]} onChange={e => setNames(p => p.map((n, j) => j === i ? e.target.value : n))}
            placeholder={`Player ${i + 1}`}
            style={{ flex: 1, padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: `1.5px solid ${PLAYER_COLORS[i]}40`, borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600 }} />
        </div>
      ))}

      <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 2, margin: '14px 0 8px' }}>Question Pack</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {(['base', 'expanded', 'all'] as Pack[]).map(p => (
          <button key={p} onClick={() => { setPack(p); setUseCustom(false); }} style={{
            flex: 1, padding: '8px 0', borderRadius: 8, border: `2px solid ${pack === p && !useCustom ? '#fbbf24' : 'rgba(255,255,255,0.08)'}`,
            background: pack === p && !useCustom ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.04)',
            color: pack === p && !useCustom ? '#fbbf24' : '#555', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}>{p === 'base' ? 'Base (6)' : p === 'expanded' ? 'Expanded (6)' : 'All (12)'}</button>
        ))}
      </div>

      <button onClick={() => setUseCustom(u => !u)} style={{
        width: '100%', marginBottom: 8, padding: '7px', borderRadius: 8,
        border: `1.5px solid ${useCustom ? '#fbbf24' : 'rgba(255,255,255,0.1)'}`,
        background: useCustom ? 'rgba(251,191,36,0.1)' : 'transparent',
        color: useCustom ? '#fbbf24' : '#666', fontSize: 13, cursor: 'pointer',
      }}>🎯 Pick custom categories (choose exactly 6+)</button>

      {useCustom && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 12 }}>
          {ALL_CATEGORIES.map(c => (
            <button key={c} onClick={() => toggleCat(c)} style={{
              padding: '6px 8px', borderRadius: 7, fontSize: 11, fontWeight: 700, textAlign: 'left', cursor: 'pointer',
              border: `1.5px solid ${customCats.includes(c) ? (CAT_COLORS[c] || '#888') : 'rgba(255,255,255,0.07)'}`,
              background: customCats.includes(c) ? `${CAT_COLORS[c] || '#888'}22` : 'rgba(255,255,255,0.03)',
              color: customCats.includes(c) ? (CAT_COLORS[c] || '#aaa') : '#555',
            }}>{customCats.includes(c) ? '✓ ' : ''}{c}</button>
          ))}
        </div>
      )}

      <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Answer Timer</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {[15, 30, 45, 60].map(t => (
          <button key={t} onClick={() => setTimerSecs(t)} style={{
            flex: 1, padding: '8px 0', borderRadius: 8, border: `2px solid ${timerSecs === t ? '#fbbf24' : 'rgba(255,255,255,0.08)'}`,
            background: timerSecs === t ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.04)',
            color: timerSecs === t ? '#fbbf24' : '#555', fontWeight: 700, fontSize: 15, cursor: 'pointer',
          }}>{t}s</button>
        ))}
      </div>

      <button onClick={handleStart}
        disabled={useCustom && customCats.length < 6}
        style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
          background: (useCustom && customCats.length < 6) ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#b45309,#fbbf24)',
          color: '#fff', fontWeight: 800, fontSize: 17, cursor: useCustom && customCats.length < 6 ? 'not-allowed' : 'pointer',
          boxShadow: (useCustom && customCats.length < 6) ? 'none' : '0 4px 20px rgba(251,191,36,0.4)',
        }}>
        {useCustom && customCats.length < 6 ? `Select ${6 - customCats.length} more categories` : '🎯 Start Game!'}
      </button>
    </div>
  );
}

// ─── SCORE PANEL ──────────────────────────────────────────────────────────────
const PLAYER_COLORS_GAME = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'];

function ScorePanel({ players, current }: { players: Player[]; current: number }) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '6px 8px', background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,215,0,0.15)' }}>
      {players.map((p, i) => (
        <div key={i} style={{ flex: 1, padding: '4px 6px', borderRadius: 8,
          background: i === current ? `${PLAYER_COLORS_GAME[i]}22` : 'rgba(255,255,255,0.03)',
          border: `1.5px solid ${i === current ? PLAYER_COLORS_GAME[i] : 'rgba(255,255,255,0.06)'}`,
          textAlign: 'center', boxShadow: i === current ? `0 0 10px ${PLAYER_COLORS_GAME[i]}50` : 'none',
        }}>
          <div style={{ fontSize: 9, color: PLAYER_COLORS_GAME[i], fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: p.score >= 0 ? '#fbbf24' : '#ef4444' }}>${p.score.toLocaleString()}</div>
          {i === current && <div style={{ fontSize: 8, color: PLAYER_COLORS_GAME[i] }}>▶ PICKING</div>}
        </div>
      ))}
    </div>
  );
}

// ─── BOARD SCREEN ─────────────────────────────────────────────────────────────
function BoardScreen({ gs, onClueSelect }: { gs: GameState; onClueSelect: (cat: string, val: number) => void }) {
  const categories = Object.keys(gs.board);
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${categories.length}, 1fr)`, gap: 4 }}>
        {categories.map(cat => (
          <div key={cat} style={{
            padding: '6px 4px', borderRadius: 6, background: CAT_COLORS[cat] || '#1d4ed8',
            display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 56,
            border: '1px solid rgba(255,255,255,0.15)',
          }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', textAlign: 'center', lineHeight: 1.2, textTransform: 'uppercase', letterSpacing: 0.5 }}>{cat}</span>
          </div>
        ))}
        {VALUES.map(val => categories.map(cat => {
          const used = gs.usedClues.has(`${cat}:${val}`);
          return (
            <button key={`${cat}:${val}`} onClick={() => !used && onClueSelect(cat, val)}
              disabled={used}
              style={{
                padding: '8px 4px', borderRadius: 6, minHeight: 48, fontWeight: 800, fontSize: 16,
                border: `1px solid ${used ? 'rgba(255,255,255,0.04)' : `${CAT_COLORS[cat] || '#1d4ed8'}80`}`,
                background: used ? 'rgba(255,255,255,0.02)' : 'rgba(10,10,40,0.95)',
                color: used ? '#2a2a2a' : '#fbbf24',
                cursor: used ? 'default' : 'pointer',
                transition: 'all 0.15s',
                boxShadow: used ? 'none' : `inset 0 0 0 1px ${CAT_COLORS[cat] || '#1d4ed8'}40`,
              }}>
              {used ? '' : `$${val}`}
            </button>
          );
        }))}
      </div>
    </div>
  );
}

// ─── CLUE MODAL ───────────────────────────────────────────────────────────────
function ClueModal({ gs, clue, onSubmit, onTimeout, paused, onTogglePause }: {
  gs: GameState; clue: ClueState;
  onSubmit: (answer: string) => void;
  onTimeout: () => void;
  paused: boolean;
  onTogglePause: () => void;
}) {
  const [input, setInput] = useState('');
  const [locked, setLocked] = useState(false);
  const catColor = CAT_COLORS[clue.category] || '#1d4ed8';
  const pct = (useTimer(gs.timerSecs, !locked, onTimeout, paused) / gs.timerSecs) * 100;
  const timerColor = pct > 50 ? '#22c55e' : pct > 25 ? '#f59e0b' : '#ef4444';
  const currentPlayer = gs.players[gs.currentPlayer];

  const handleSubmit = () => {
    if (locked || !input.trim()) return;
    setLocked(true);
    onSubmit(input.trim());
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 12 }}>
      <div style={{ width: '100%', maxWidth: 520, background: '#0a0a20', borderRadius: 16, border: `2px solid ${catColor}`, overflow: 'hidden', boxShadow: `0 0 60px ${catColor}40` }}>
        {/* Timer */}
        <div style={{ height: 6, background: 'rgba(255,255,255,0.05)' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: timerColor, transition: 'width 0.2s linear, background 0.3s', borderRadius: 0 }} />
        </div>

        {/* Header */}
        <div style={{ padding: '12px 16px 10px', background: `${catColor}25`, borderBottom: `1px solid ${catColor}40`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: catColor, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>{clue.category}</div>
            <div style={{ fontSize: 10, color: '#555', marginTop: 1 }}>
              <span style={{ color: PLAYER_COLORS_GAME[gs.currentPlayer], fontWeight: 700 }}>{currentPlayer.name}</span>'s turn
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {!locked && (
              <button onClick={onTogglePause} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 7, padding: '4px 10px', color: '#aaa', fontSize: 14, cursor: 'pointer' }}>{paused ? '▶' : '⏸'}</button>
            )}
            <div style={{ fontSize: 28, fontWeight: 800, color: '#fbbf24' }}>${clue.value}</div>
          </div>
        </div>

        {/* Clue text */}
        <div style={{ padding: '20px 18px', textAlign: 'center', position: 'relative', minHeight: 80 }}>
          {paused ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 36 }}>⏸</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#aaa' }}>Paused</div>
              <button onClick={onTogglePause} style={{ padding: '10px 28px', borderRadius: 10, border: 'none', background: catColor, color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>▶ Resume</button>
            </div>
          ) : (
            <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', lineHeight: 1.6, margin: 0 }}>{clue.entry.q}</p>
          )}
        </div>

        {/* Answer input */}
        {!locked && !paused && (
          <div style={{ padding: '0 16px 16px', display: 'flex', gap: 8 }}>
            <input autoFocus value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Type your answer..."
              style={{ flex: 1, padding: '12px 14px', background: 'rgba(255,255,255,0.06)', border: `1.5px solid ${catColor}60`, borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 600 }} />
            <button onClick={handleSubmit} style={{
              padding: '12px 18px', borderRadius: 10, border: 'none', background: catColor,
              color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer',
            }}>✓</button>
          </div>
        )}
        {locked && (
          <div style={{ padding: '0 16px 16px', textAlign: 'center', color: '#888', fontSize: 13 }}>Checking answer…</div>
        )}
      </div>
    </div>
  );
}

// ─── RESULT MODAL ─────────────────────────────────────────────────────────────
function ResultModal({ clue, players, currentPlayer, earned, onNext }: {
  clue: ClueState; players: Player[]; currentPlayer: number; earned: number; onNext: () => void;
}) {
  const catColor = CAT_COLORS[clue.category] || '#1d4ed8';
  const p = players[currentPlayer];
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 12 }}>
      <div style={{ width: '100%', maxWidth: 440, background: '#0a0a20', borderRadius: 16, overflow: 'hidden', border: `2px solid ${clue.correct ? '#22c55e' : '#ef4444'}`, boxShadow: `0 0 40px ${clue.correct ? '#22c55e40' : '#ef444430'}` }}>
        <div style={{ padding: '18px 20px 14px', background: clue.correct ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', textAlign: 'center' }}>
          <div style={{ fontSize: 44 }}>{clue.correct ? '✅' : '❌'}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: clue.correct ? '#22c55e' : '#ef4444', marginTop: 4 }}>
            {clue.correct ? 'Correct!' : 'Wrong!'}
          </div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
            <span style={{ color: PLAYER_COLORS_GAME[currentPlayer], fontWeight: 700 }}>{p.name}</span>
            {' '}{clue.correct ? `+$${earned}` : `-$${clue.value}`}
          </div>
        </div>
        <div style={{ padding: '14px 20px' }}>
          <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>The correct answer:</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#fbbf24', padding: '10px 14px', background: 'rgba(251,191,36,0.1)', borderRadius: 10, border: '1px solid rgba(251,191,36,0.25)' }}>
            {clue.entry.a.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </div>
          <div style={{ fontSize: 12, color: '#444', marginTop: 4 }}>Clue: {clue.entry.q}</div>
        </div>
        <div style={{ padding: '0 16px 16px' }}>
          <button onClick={onNext} style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg,${catColor},${catColor}aa)`, color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── FINAL SCORES ─────────────────────────────────────────────────────────────
function FinalScores({ players, onMenu, onRematch }: { players: Player[]; onMenu: () => void; onRematch: () => void }) {
  const sorted = [...players].map((p, i) => ({ ...p, idx: i })).sort((a, b) => b.score - a.score);
  const medals = ['🥇', '🥈', '🥉', '4th'];
  return (
    <div style={{ padding: '20px 14px', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 52 }}>🏆</div>
        <h2 style={{ color: '#fbbf24', fontSize: 24, margin: '6px 0 4px' }}>Final Scores!</h2>
        <p style={{ color: '#666', fontSize: 13 }}>All 30 clues answered</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
        {sorted.map((p, rank) => (
          <div key={p.idx} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12,
            background: rank === 0 ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.04)',
            border: rank === 0 ? '1.5px solid rgba(251,191,36,0.4)' : '1.5px solid rgba(255,255,255,0.07)',
          }}>
            <span style={{ fontSize: 24, width: 32 }}>{medals[rank] || `${rank + 1}.`}</span>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: PLAYER_COLORS_GAME[p.idx] }} />
            <span style={{ flex: 1, fontWeight: 700, fontSize: 16 }}>{p.name}</span>
            <span style={{ fontWeight: 800, fontSize: 20, color: p.score >= 0 ? '#fbbf24' : '#ef4444' }}>${p.score.toLocaleString()}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onRematch} style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#92400e,#fbbf24)', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>🔁 Rematch</button>
        <button onClick={onMenu} style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.07)', color: '#aaa', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>🏠 Menu</button>
      </div>
    </div>
  );
}

// ─── ONLINE CLUE MODAL ────────────────────────────────────────────────────────
function OnlineClueModal({ gs, mySeat, onSubmit, onTimeout }: {
  gs: QbOnlineGs;
  mySeat: number;
  onSubmit: (answer: string) => void;
  onTimeout: () => void;
}) {
  const [input, setInput] = useState('');
  const [locked, setLocked] = useState(false);
  const clue = gs.activeClue!;
  const isMyTurn = mySeat === gs.currentPlayer;
  const catColor = CAT_COLORS[clue.cat] || '#1d4ed8';
  const currentPlayer = gs.players[gs.currentPlayer];
  const handleTimerEnd = isMyTurn && !locked ? onTimeout : () => {};
  const pct = (useTimer(gs.timerSecs, !locked, handleTimerEnd) / gs.timerSecs) * 100;
  const timerColor = pct > 50 ? '#22c55e' : pct > 25 ? '#f59e0b' : '#ef4444';

  const handleSubmit = () => {
    if (locked || !input.trim()) return;
    setLocked(true);
    onSubmit(input.trim());
  };

  useEffect(() => { setInput(''); setLocked(false); }, [clue.cat, clue.val]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 12 }}>
      <div style={{ width: '100%', maxWidth: 520, background: '#0a0a20', borderRadius: 16, border: `2px solid ${catColor}`, overflow: 'hidden', boxShadow: `0 0 60px ${catColor}40` }}>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.05)' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: timerColor, transition: 'width 1s linear, background 0.3s' }} />
        </div>
        <div style={{ padding: '12px 16px 10px', background: `${catColor}25`, borderBottom: `1px solid ${catColor}40`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: catColor, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>{clue.cat}</div>
            <div style={{ fontSize: 10, color: '#555', marginTop: 1 }}>
              <span style={{ color: PLAYER_COLORS_GAME[gs.currentPlayer], fontWeight: 700 }}>{currentPlayer.name}</span>'s turn
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fbbf24' }}>${clue.val}</div>
        </div>
        <div style={{ padding: '20px 18px', textAlign: 'center' }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', lineHeight: 1.6, margin: 0 }}>{clue.q}</p>
        </div>
        {isMyTurn && !locked && (
          <div style={{ padding: '0 16px 16px', display: 'flex', gap: 8 }}>
            <input autoFocus value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Type your answer..."
              style={{ flex: 1, padding: '12px 14px', background: 'rgba(255,255,255,0.06)', border: `1.5px solid ${catColor}60`, borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 600 }} />
            <button onClick={handleSubmit} style={{ padding: '12px 18px', borderRadius: 10, border: 'none', background: catColor, color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>✓</button>
          </div>
        )}
        {isMyTurn && locked && (
          <div style={{ padding: '0 16px 16px', textAlign: 'center', color: '#888', fontSize: 13 }}>Submitting…</div>
        )}
        {!isMyTurn && (
          <div style={{ padding: '0 16px 16px', textAlign: 'center' }}>
            <div style={{ padding: '10px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, color: '#666', fontSize: 13 }}>
              Waiting for <span style={{ color: PLAYER_COLORS_GAME[gs.currentPlayer], fontWeight: 700 }}>{currentPlayer.name}</span> to answer…
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ONLINE RESULT MODAL ──────────────────────────────────────────────────────
function OnlineResultModal({ gs, mySeat, onNext }: {
  gs: QbOnlineGs;
  mySeat: number;
  onNext: () => void;
}) {
  const result = gs.lastResult!;
  const catColor = CAT_COLORS[result.cat] || '#1d4ed8';
  const answeringPlayer = gs.players.find((_, i) => {
    if (result.correct) return i === gs.currentPlayer;
    const prevPlayer = (gs.currentPlayer + gs.players.length - 1) % gs.players.length;
    return i === prevPlayer;
  });
  const answeringIdx = result.correct
    ? gs.currentPlayer
    : (gs.currentPlayer + gs.players.length - 1) % gs.players.length;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 12 }}>
      <div style={{ width: '100%', maxWidth: 440, background: '#0a0a20', borderRadius: 16, overflow: 'hidden', border: `2px solid ${result.correct ? '#22c55e' : '#ef4444'}`, boxShadow: `0 0 40px ${result.correct ? '#22c55e40' : '#ef444430'}` }}>
        <div style={{ padding: '18px 20px 14px', background: result.correct ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', textAlign: 'center' }}>
          <div style={{ fontSize: 44 }}>{result.correct ? '✅' : '❌'}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: result.correct ? '#22c55e' : '#ef4444', marginTop: 4 }}>
            {result.correct ? 'Correct!' : 'Wrong!'}
          </div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
            <span style={{ color: PLAYER_COLORS_GAME[answeringIdx], fontWeight: 700 }}>{answeringPlayer?.name}</span>
            {' '}{result.correct ? `+$${result.earned}` : `-$${result.val}`}
          </div>
          {result.answer && (
            <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>Answered: <em>"{result.answer}"</em></div>
          )}
        </div>
        <div style={{ padding: '14px 20px' }}>
          <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>The correct answer:</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#fbbf24', padding: '10px 14px', background: 'rgba(251,191,36,0.1)', borderRadius: 10, border: '1px solid rgba(251,191,36,0.25)' }}>
            {result.correctAnswer.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </div>
          <div style={{ fontSize: 12, color: '#444', marginTop: 4 }}>Clue: {result.clueQ}</div>
        </div>
        <div style={{ padding: '0 16px 16px' }}>
          <button onClick={onNext} style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg,${catColor},${catColor}aa)`, color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ONLINE BOARD SCREEN ──────────────────────────────────────────────────────
function OnlineBoardScreen({ gs, mySeat, onClueSelect }: {
  gs: QbOnlineGs;
  mySeat: number;
  onClueSelect: (cat: string, val: number) => void;
}) {
  const usedSet = new Set(gs.usedClues);
  const isMyTurn = mySeat === gs.currentPlayer;
  const categories = gs.categories;
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
      {!isMyTurn && (
        <div style={{ textAlign: 'center', padding: '6px', marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: PLAYER_COLORS_GAME[gs.currentPlayer], fontWeight: 700 }}>
            {gs.players[gs.currentPlayer]?.name} is picking…
          </span>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${categories.length}, 1fr)`, gap: 4 }}>
        {categories.map(cat => (
          <div key={cat} style={{
            padding: '6px 4px', borderRadius: 6, background: CAT_COLORS[cat] || '#1d4ed8',
            display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 56,
            border: '1px solid rgba(255,255,255,0.15)',
          }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', textAlign: 'center', lineHeight: 1.2, textTransform: 'uppercase', letterSpacing: 0.5 }}>{cat}</span>
          </div>
        ))}
        {[100, 200, 300, 400, 500].map(val => categories.map(cat => {
          const used = usedSet.has(`${cat}:${val}`);
          const canClick = isMyTurn && !used;
          return (
            <button key={`${cat}:${val}`} onClick={() => canClick && onClueSelect(cat, val)}
              disabled={!canClick}
              style={{
                padding: '8px 4px', borderRadius: 6, minHeight: 48, fontWeight: 800, fontSize: 16,
                border: `1px solid ${used ? 'rgba(255,255,255,0.04)' : `${CAT_COLORS[cat] || '#1d4ed8'}80`}`,
                background: used ? 'rgba(255,255,255,0.02)' : (!isMyTurn ? 'rgba(10,10,40,0.6)' : 'rgba(10,10,40,0.95)'),
                color: used ? '#2a2a2a' : (!isMyTurn ? '#444' : '#fbbf24'),
                cursor: canClick ? 'pointer' : 'default',
                boxShadow: used ? 'none' : `inset 0 0 0 1px ${CAT_COLORS[cat] || '#1d4ed8'}40`,
              }}>
              {used ? '' : `$${val}`}
            </button>
          );
        }))}
      </div>
    </div>
  );
}

// ─── ONLINE SCORE PANEL ───────────────────────────────────────────────────────
function OnlineScorePanel({ gs, mySeat }: { gs: QbOnlineGs; mySeat: number }) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '6px 8px', background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,215,0,0.15)' }}>
      {gs.players.map((p, i) => (
        <div key={i} style={{ flex: 1, padding: '4px 6px', borderRadius: 8,
          background: i === gs.currentPlayer ? `${PLAYER_COLORS_GAME[i]}22` : 'rgba(255,255,255,0.03)',
          border: `1.5px solid ${i === gs.currentPlayer ? PLAYER_COLORS_GAME[i] : 'rgba(255,255,255,0.06)'}`,
          textAlign: 'center', boxShadow: i === gs.currentPlayer ? `0 0 10px ${PLAYER_COLORS_GAME[i]}50` : 'none',
          position: 'relative',
        }}>
          {i === mySeat && <div style={{ position: 'absolute', top: 2, right: 4, fontSize: 7, color: '#fbbf24', fontWeight: 800 }}>YOU</div>}
          <div style={{ fontSize: 9, color: PLAYER_COLORS_GAME[i], fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: p.score >= 0 ? '#fbbf24' : '#ef4444' }}>${p.score.toLocaleString()}</div>
          {i === gs.currentPlayer && <div style={{ fontSize: 8, color: PLAYER_COLORS_GAME[i] }}>▶ PICKING</div>}
        </div>
      ))}
    </div>
  );
}

// ─── ONLINE FINAL SCORES ─────────────────────────────────────────────────────
function OnlineFinalScores({ gs, onBack }: { gs: QbOnlineGs; onBack: () => void }) {
  const sorted = [...gs.players].map((p, i) => ({ ...p, idx: i })).sort((a, b) => b.score - a.score);
  const medals = ['🥇', '🥈', '🥉', '4th'];
  return (
    <div style={{ padding: '20px 14px', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 52 }}>🏆</div>
        <h2 style={{ color: '#fbbf24', fontSize: 24, margin: '6px 0 4px' }}>Final Scores!</h2>
        <p style={{ color: '#666', fontSize: 13 }}>Online match complete</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
        {sorted.map((p, rank) => (
          <div key={p.idx} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12,
            background: rank === 0 ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.04)',
            border: rank === 0 ? '1.5px solid rgba(251,191,36,0.4)' : '1.5px solid rgba(255,255,255,0.07)',
          }}>
            <span style={{ fontSize: 24, width: 32 }}>{medals[rank] || `${rank + 1}.`}</span>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: PLAYER_COLORS_GAME[p.idx] }} />
            <span style={{ flex: 1, fontWeight: 700, fontSize: 16 }}>{p.name}</span>
            <span style={{ fontWeight: 800, fontSize: 20, color: p.score >= 0 ? '#fbbf24' : '#ef4444' }}>${p.score.toLocaleString()}</span>
          </div>
        ))}
      </div>
      <button onClick={onBack} style={{ width: '100%', padding: '13px 0', borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.07)', color: '#aaa', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>🏠 Back to Menu</button>
    </div>
  );
}

// ─── ONLINE LOBBY SETUP (Host picks settings) ─────────────────────────────────
function OnlineLobbySetup({ onStart, isHost }: {
  onStart: (cats: string[], board: Record<string, Record<number, { q: string; a: string; alt?: string[] }>>, timerSecs: number) => void;
  isHost: boolean;
}) {
  const [pack, setPack] = useState<Pack>('all');
  const [useCustom, setUseCustom] = useState(false);
  const [customCats, setCustomCats] = useState<string[]>([]);
  const [timerSecs, setTimerSecs] = useState(30);

  const availCats = pack === 'base' ? BASE_PACK : pack === 'expanded' ? EXPANDED_PACK : ALL_CATEGORIES;
  const toggleCat = (c: string) => setCustomCats(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const handleStart = () => {
    let cats: string[];
    if (useCustom && customCats.length >= 6) {
      cats = shuffle(customCats).slice(0, 6);
    } else {
      cats = shuffle(availCats).slice(0, 6);
    }
    const board = buildBoard(cats);
    onStart(cats, board, timerSecs);
  };

  if (!isHost) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: '#555', fontSize: 14 }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
        Waiting for the host to configure and start the game…
      </div>
    );
  }

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div style={{ fontSize: 11, color: '#fbbf2480', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Question Pack</div>
      <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
        {(['base', 'expanded', 'all'] as Pack[]).map(p => (
          <button key={p} onClick={() => { setPack(p); setUseCustom(false); }} style={{
            flex: 1, padding: '7px 0', borderRadius: 8, border: `2px solid ${pack === p && !useCustom ? '#fbbf24' : 'rgba(255,255,255,0.08)'}`,
            background: pack === p && !useCustom ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.04)',
            color: pack === p && !useCustom ? '#fbbf24' : '#555', fontWeight: 700, fontSize: 12, cursor: 'pointer',
          }}>{p === 'base' ? 'Base' : p === 'expanded' ? 'Expanded' : 'All'}</button>
        ))}
      </div>

      <button onClick={() => setUseCustom(u => !u)} style={{
        width: '100%', marginBottom: 6, padding: '6px', borderRadius: 8,
        border: `1.5px solid ${useCustom ? '#fbbf24' : 'rgba(255,255,255,0.1)'}`,
        background: useCustom ? 'rgba(251,191,36,0.1)' : 'transparent',
        color: useCustom ? '#fbbf24' : '#555', fontSize: 12, cursor: 'pointer',
      }}>🎯 Custom categories {useCustom ? `(${customCats.length}/6+)` : ''}</button>

      {useCustom && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 8 }}>
          {ALL_CATEGORIES.map(c => (
            <button key={c} onClick={() => toggleCat(c)} style={{
              padding: '5px 6px', borderRadius: 6, fontSize: 10, fontWeight: 700, textAlign: 'left', cursor: 'pointer',
              border: `1.5px solid ${customCats.includes(c) ? (CAT_COLORS[c] || '#888') : 'rgba(255,255,255,0.07)'}`,
              background: customCats.includes(c) ? `${CAT_COLORS[c] || '#888'}22` : 'rgba(255,255,255,0.03)',
              color: customCats.includes(c) ? (CAT_COLORS[c] || '#aaa') : '#444',
            }}>{customCats.includes(c) ? '✓ ' : ''}{c}</button>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, color: '#fbbf2480', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Answer Timer</div>
      <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
        {[15, 30, 45, 60].map(t => (
          <button key={t} onClick={() => setTimerSecs(t)} style={{
            flex: 1, padding: '7px 0', borderRadius: 8, border: `2px solid ${timerSecs === t ? '#fbbf24' : 'rgba(255,255,255,0.08)'}`,
            background: timerSecs === t ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.04)',
            color: timerSecs === t ? '#fbbf24' : '#555', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>{t}s</button>
        ))}
      </div>

      <button onClick={handleStart}
        disabled={useCustom && customCats.length < 6}
        style={{ width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
          background: (useCustom && customCats.length < 6) ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#b45309,#fbbf24)',
          color: '#fff', fontWeight: 800, fontSize: 15, cursor: useCustom && customCats.length < 6 ? 'not-allowed' : 'pointer',
          boxShadow: (useCustom && customCats.length < 6) ? 'none' : '0 4px 16px rgba(251,191,36,0.35)',
        }}>
        {useCustom && customCats.length < 6 ? `Select ${6 - customCats.length} more categories` : '🚀 Start Game!'}
      </button>
    </div>
  );
}

// ─── ONLINE GAME CONTAINER ────────────────────────────────────────────────────
function QbOnlineGame({ onBack }: { onBack: () => void }) {
  const [state, actions] = useQbOnline();
  const [nameInput, setNameInput] = useState('');
  const [codeInput, setCodeInput] = useState('');

  const { status, error, roomCode, mySeat, lobbyPlayers, gs } = state;

  const handleCreate = () => {
    const n = nameInput.trim() || 'Host';
    actions.createRoom(n);
  };

  const handleJoin = () => {
    const n = nameInput.trim() || 'Player';
    const c = codeInput.trim().toUpperCase();
    if (!c) return;
    actions.joinRoom(c, n);
  };

  const handleStartGame = (cats: string[], board: Record<string, Record<number, { q: string; a: string; alt?: string[] }>>, timerSecs: number) => {
    actions.startGame(cats, board, timerSecs);
  };

  const handleBack = () => {
    actions.reset();
    onBack();
  };

  if (status === 'error') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: 24, gap: 16 }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <div style={{ color: '#ef4444', fontWeight: 700, fontSize: 16, textAlign: 'center' }}>{error}</div>
        <button onClick={handleBack} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.1)', color: '#aaa', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>← Back</button>
      </div>
    );
  }

  if (status === 'idle' || status === 'connecting') {
    return (
      <div style={{ padding: '16px', maxWidth: 380, margin: '0 auto' }}>
        <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>Your Name</div>
        <input value={nameInput} onChange={e => setNameInput(e.target.value)}
          placeholder="Enter your name…"
          maxLength={16}
          style={{ width: '100%', padding: '10px 12px', marginBottom: 20, background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,215,0,0.2)', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, boxSizing: 'border-box' }} />

        <button onClick={handleCreate} disabled={status === 'connecting'} style={{
            width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg,#92400e,#fbbf24)', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(251,191,36,0.35)', marginBottom: 12,
          }}>
            {status === 'connecting' ? 'Connecting…' : '🎮 Create Room'}
          </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ color: '#444', fontSize: 12 }}>or join</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input value={codeInput} onChange={e => setCodeInput(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            placeholder="Room code"
            maxLength={4}
            style={{ flex: 1, padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 15, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 3, textAlign: 'center' }} />
          <button onClick={handleJoin} disabled={!codeInput.trim() || status === 'connecting'} style={{
            padding: '10px 18px', borderRadius: 8, border: 'none',
            background: codeInput.trim() ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.04)',
            color: codeInput.trim() ? '#fbbf24' : '#444', fontWeight: 700, fontSize: 14, cursor: codeInput.trim() ? 'pointer' : 'default',
          }}>Join →</button>
        </div>

        {error && <div style={{ marginTop: 10, color: '#ef4444', fontSize: 13, textAlign: 'center' }}>{error}</div>}
      </div>
    );
  }

  if (status === 'lobby') {
    return (
      <div style={{ maxWidth: 440, margin: '0 auto', padding: '16px' }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>Room Code</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#fbbf24', letterSpacing: 6 }}>{roomCode}</div>
          <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>Share this code with friends</div>
        </div>

        <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Players ({lobbyPlayers.length}/4)</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {lobbyPlayers.map(p => (
            <div key={p.seat} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: `1px solid ${p.seat === mySeat ? p.color + '60' : 'rgba(255,255,255,0.06)'}` }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.color }} />
              <span style={{ fontWeight: 700, fontSize: 14, color: '#ddd' }}>{p.name}</span>
              {p.seat === 0 && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#fbbf24', fontWeight: 700 }}>HOST</span>}
              {p.seat === mySeat && p.seat !== 0 && <span style={{ marginLeft: 'auto', fontSize: 10, color: p.color, fontWeight: 700 }}>YOU</span>}
            </div>
          ))}
          {lobbyPlayers.length < 4 && (
            <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px dashed rgba(255,255,255,0.08)', color: '#333', fontSize: 13, textAlign: 'center' }}>
              Waiting for players… ({4 - lobbyPlayers.length} spot{4 - lobbyPlayers.length !== 1 ? 's' : ''} left)
            </div>
          )}
        </div>

        {lobbyPlayers.length < 2 && mySeat === 0 && (
          <div style={{ textAlign: 'center', color: '#555', fontSize: 12, marginBottom: 12 }}>Need at least 2 players to start</div>
        )}

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 14 }}>
          <OnlineLobbySetup isHost={mySeat === 0} onStart={handleStartGame} />
        </div>

        {error && <div style={{ marginTop: 8, color: '#ef4444', fontSize: 13, textAlign: 'center' }}>{error}</div>}
      </div>
    );
  }

  if (status === 'playing' && gs) {
    const totalClues = gs.categories.length * 5;
    const usedCount = gs.usedClues.length;

    if (gs.phase === 'final') {
      return <OnlineFinalScores gs={gs} onBack={handleBack} />;
    }

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <OnlineScorePanel gs={gs} mySeat={mySeat} />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <OnlineBoardScreen
            gs={gs}
            mySeat={mySeat}
            onClueSelect={(cat, val) => actions.sendAction('pick_clue', { cat, val })}
          />
        </div>
        {gs.phase === 'answering' && gs.activeClue && (
          <OnlineClueModal
            gs={gs}
            mySeat={mySeat}
            onSubmit={(answer) => actions.sendAction('submit_answer', { answer })}
            onTimeout={() => actions.sendAction('timeout')}
          />
        )}
        {gs.phase === 'result' && gs.lastResult && (
          <OnlineResultModal
            gs={gs}
            mySeat={mySeat}
            onNext={() => actions.sendAction('next')}
          />
        )}
      </div>
    );
  }

  return null;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function QuizBoard() {
  const [onlineMode, setOnlineMode] = useState(false);
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [gs, setGs] = useState<GameState | null>(null);
  const [lastClue, setLastClue] = useState<ClueState | null>(null);
  const [lastEarned, setLastEarned] = useState(0);

  const totalClues = gs ? Object.keys(gs.board).length * VALUES.length : 30;

  const handleStart = useCallback((players: Player[], cats: string[], timer: number) => {
    setGs({
      players, currentPlayer: 0,
      board: buildBoard(cats),
      usedClues: new Set(),
      activeClue: null,
      timerSecs: timer,
    });
    setScreen('board');
  }, []);

  const handleClueSelect = useCallback((cat: string, val: number) => {
    setGs(prev => {
      if (!prev) return prev;
      const entry = prev.board[cat]?.[val];
      if (!entry) return prev;
      const clue: ClueState = { category: cat, value: val, entry, answered: false, correct: null };
      return { ...prev, activeClue: clue };
    });
    setScreen('clue');
  }, []);

  const handleSubmit = useCallback((answer: string) => {
    if (!gs?.activeClue) return;
    const correct = checkAnswer(answer, gs.activeClue.entry);
    const val = gs.activeClue.value;
    const delta = correct ? val : -val;
    const newPlayers = gs.players.map((p, i) =>
      i === gs.currentPlayer ? { ...p, score: p.score + delta } : p
    );
    const key = `${gs.activeClue.category}:${val}`;
    const newUsed = new Set(gs.usedClues);
    newUsed.add(key);
    const nextPlayer = correct ? gs.currentPlayer : (gs.currentPlayer + 1) % gs.players.length;
    const updatedClue: ClueState = { ...gs.activeClue, answered: true, correct };
    setLastClue(updatedClue);
    setLastEarned(correct ? val : val);
    setGs({ ...gs, players: newPlayers, usedClues: newUsed, activeClue: updatedClue, currentPlayer: nextPlayer });
    setScreen('result');
  }, [gs]);

  const handleTimeout = useCallback(() => {
    if (!gs?.activeClue) return;
    const key = `${gs.activeClue.category}:${gs.activeClue.value}`;
    const newUsed = new Set(gs.usedClues);
    newUsed.add(key);
    const nextPlayer = (gs.currentPlayer + 1) % gs.players.length;
    const updatedClue: ClueState = { ...gs.activeClue, answered: true, correct: false };
    setLastClue(updatedClue);
    setLastEarned(0);
    setGs({ ...gs, usedClues: newUsed, activeClue: updatedClue, currentPlayer: nextPlayer });
    setScreen('result');
  }, [gs]);

  const handleNext = useCallback(() => {
    if (!gs) return;
    const allUsed = gs.usedClues.size >= totalClues;
    setScreen(allUsed ? 'final' : 'board');
  }, [gs, totalClues]);

  const [paused, setPaused] = useState(false);
  const handleMenu = useCallback(() => { setGs(null); setPaused(false); setScreen('menu'); }, []);
  const handleRematch = useCallback(() => setScreen('setup'), []);
  const togglePause = useCallback(() => setPaused(p => !p), []);

  const progress = gs ? `${gs.usedClues.size}/${totalClues}` : '';

  if (onlineMode) {
    return (
      <div style={{ minHeight: '100vh', maxHeight: '100vh', overflow: 'hidden', background: 'linear-gradient(180deg,#020209,#06060f)', color: '#fff', display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI', sans-serif" }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '7px 12px', background: 'rgba(0,0,0,0.7)', borderBottom: '1px solid rgba(251,191,36,0.2)', flexShrink: 0 }}>
          <button onClick={() => setOnlineMode(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '4px 10px', color: '#aaa', fontSize: 12, cursor: 'pointer', marginRight: 8 }}>← Back</button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#fbbf24', letterSpacing: 1 }}>🌐 Quiz Board Online</span>
          </div>
          <div style={{ width: 52 }} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <QbOnlineGame onBack={() => setOnlineMode(false)} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', maxHeight: '100vh', overflow: 'hidden', background: 'linear-gradient(180deg,#020209,#06060f)', color: '#fff', display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI', sans-serif" }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '7px 12px', background: 'rgba(0,0,0,0.7)', borderBottom: '1px solid rgba(251,191,36,0.2)', flexShrink: 0 }}>
        {screen !== 'menu' && screen !== 'setup' && (
          <button onClick={handleMenu} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '4px 10px', color: '#aaa', fontSize: 12, cursor: 'pointer', marginRight: 8 }}>✕</button>
        )}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#fbbf24', letterSpacing: 1 }}>🎯 Quiz Board Arena</span>
          {progress && <span style={{ marginLeft: 8, fontSize: 11, color: '#555' }}>{progress} clues</span>}
        </div>
        <div style={{ width: 52 }} />
      </div>

      {/* Score bar (during game) */}
      {gs && (screen === 'board' || screen === 'clue' || screen === 'result') && (
        <ScorePanel players={gs.players} current={gs.currentPlayer} />
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {screen === 'menu' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: 24, position: 'relative' }}>
            <Link href="/"><span style={{ position: 'absolute', top: 14, left: 14, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 12px', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>← Menu</span></Link>
            <div style={{ fontSize: 72, marginBottom: 8 }}>🎯</div>
            <h1 style={{ color: '#fbbf24', fontSize: 30, margin: '0 0 6px', letterSpacing: 1 }}>Quiz Board Arena</h1>
            <p style={{ color: '#666', fontSize: 14, textAlign: 'center', marginBottom: 32, maxWidth: 340 }}>Jeopardy-style trivia for 1–4 players. 12 categories · 1800+ questions · Base & Expanded packs.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}>
              <button onClick={() => setScreen('setup')} style={{ padding: '18px 0', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#92400e,#fbbf24)', color: '#fff', fontWeight: 800, fontSize: 18, cursor: 'pointer', boxShadow: '0 4px 24px rgba(251,191,36,0.4)' }}>
                🎮 New Game
              </button>
              <button onClick={() => setOnlineMode(true)} style={{ padding: '14px 0', borderRadius: 14, border: '1.5px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.07)', color: '#fbbf24', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>
                🌐 Online Multiplayer
              </button>
            </div>
            <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, maxWidth: 360 }}>
              {ALL_CATEGORIES.map(c => (
                <div key={c} style={{ padding: '5px 10px', borderRadius: 6, background: `${CAT_COLORS[c] || '#888'}22`, border: `1px solid ${CAT_COLORS[c] || '#888'}40`, fontSize: 11, color: CAT_COLORS[c] || '#888', fontWeight: 700, textAlign: 'center' }}>{c}</div>
              ))}
            </div>
          </div>
        )}

        {screen === 'setup' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={() => setScreen('menu')} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '4px 10px', color: '#aaa', fontSize: 12, cursor: 'pointer' }}>← Back</button>
              <div style={{ flex: 1, textAlign: 'center', fontWeight: 800, color: '#fbbf24' }}>Game Setup</div>
            </div>
            <SetupScreen onStart={handleStart} />
          </>
        )}

        {screen === 'board' && gs && <BoardScreen gs={gs} onClueSelect={handleClueSelect} />}

        {screen === 'final' && gs && (
          <FinalScores players={gs.players} onMenu={handleMenu} onRematch={handleRematch} />
        )}
      </div>

      {/* Clue modal */}
      {screen === 'clue' && gs?.activeClue && (
        <ClueModal gs={gs} clue={gs.activeClue} onSubmit={handleSubmit} onTimeout={handleTimeout} paused={paused} onTogglePause={togglePause} />
      )}

      {/* Result modal */}
      {screen === 'result' && lastClue && gs && (
        <ResultModal clue={lastClue} players={gs.players} currentPlayer={(gs.currentPlayer + gs.players.length - (lastClue.correct ? 0 : 1)) % gs.players.length} earned={lastEarned} onNext={handleNext} />
      )}
    </div>
  );
}
