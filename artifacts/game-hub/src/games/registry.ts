import type { ComponentType } from "react";
import Snake from "./snake";
import Pong from "./pong";
import TypingRacer from "./typing-racer";
import Uno from "./uno";
import Chess from "./chess";
import FlappyBird from "./flappy-bird";
import TowerDefense from "./tower-defense";
import BubbleShooter from "./bubble-shooter";
import Battleship from "./battleship";
import PacMan from "./pac-man";
import Minecraft from "./minecraft";
import Racing from "./racing";
import CandyCrush from "./candy-crush";
import MagicSort from "./magic-sort";
import Tetris from "./tetris";
import FlowFree from "./flow-free";
import TetrisRoyale from "./tetris-royale";
import Pictionary from "./pictionary";
import Mahjong from "./mahjong";
import SneezingKittens from "./sneezing-kittens";
import TrainYard from "./trainyard";
import SpinSolve from "./spin-solve";
import BrainRace from "./brain-race";
import QuizBoard from "./quiz-board";

export type Tier = "🟢" | "🟡" | "🔴";

export interface GameMeta {
  id: string;
  name: string;
  icon: string;
  tier: Tier;
  desc: string;
  color: string;
  gradient: string;
  borderColor: string;
  component: ComponentType;
}

/**
 * GAME REGISTRY
 * To add a new game:
 *   1. Create `src/games/my-game.tsx` with a default export component
 *   2. Import it above
 *   3. Add one entry below — routing and hub card appear automatically
 */
export const GAMES: GameMeta[] = [
  {
    id: "snake",
    name: "Snake",
    icon: "🐍",
    tier: "🟢",
    desc: "Eat food, grow longer, don't crash.",
    color: "#34d399",
    gradient: "from-emerald-950/80 via-emerald-900/30 to-transparent",
    borderColor: "#34d39930",
    component: Snake,
  },
  {
    id: "pong",
    name: "Pong",
    icon: "🏓",
    tier: "🟢",
    desc: "Classic paddle battle. First to 7 wins.",
    color: "#38bdf8",
    gradient: "from-sky-950/80 via-sky-900/30 to-transparent",
    borderColor: "#38bdf830",
    component: Pong,
  },
  {
    id: "typing-racer",
    name: "Typing Racer",
    icon: "⌨️",
    tier: "🟢",
    desc: "Race to type the passage fastest.",
    color: "#facc15",
    gradient: "from-yellow-950/80 via-yellow-900/30 to-transparent",
    borderColor: "#facc1530",
    component: TypingRacer,
  },
  {
    id: "uno",
    name: "Uno",
    icon: "🃏",
    tier: "🟢",
    desc: "Match colors and numbers. First to empty hand wins.",
    color: "#f87171",
    gradient: "from-red-950/80 via-red-900/30 to-transparent",
    borderColor: "#f8717130",
    component: Uno,
  },
  {
    id: "chess",
    name: "Chess",
    icon: "♟️",
    tier: "🟢",
    desc: "Classic chess. Local 2-player.",
    color: "#a78bfa",
    gradient: "from-violet-950/80 via-violet-900/30 to-transparent",
    borderColor: "#a78bfa30",
    component: Chess,
  },
  {
    id: "flappy-bird",
    name: "Flappy Bird",
    icon: "🐦",
    tier: "🟡",
    desc: "Tap to flap. Don't hit the pipes!",
    color: "#a3e635",
    gradient: "from-lime-950/80 via-lime-900/30 to-transparent",
    borderColor: "#a3e63530",
    component: FlappyBird,
  },
  {
    id: "tower-defense",
    name: "Tower Defense",
    icon: "🏰",
    tier: "🟡",
    desc: "Place towers, stop the waves.",
    color: "#fb923c",
    gradient: "from-orange-950/80 via-orange-900/30 to-transparent",
    borderColor: "#fb923c30",
    component: TowerDefense,
  },
  {
    id: "bubble-shooter",
    name: "Bubble Shooter",
    icon: "🫧",
    tier: "🟡",
    desc: "Match 3+ same-color bubbles.",
    color: "#f472b6",
    gradient: "from-pink-950/80 via-pink-900/30 to-transparent",
    borderColor: "#f472b630",
    component: BubbleShooter,
  },
  {
    id: "battleship",
    name: "Battleship",
    icon: "⚓",
    tier: "🟡",
    desc: "Sink the enemy fleet first.",
    color: "#22d3ee",
    gradient: "from-cyan-950/80 via-cyan-900/30 to-transparent",
    borderColor: "#22d3ee30",
    component: Battleship,
  },
  {
    id: "pac-man",
    name: "Pac-Man",
    icon: "👾",
    tier: "🟡",
    desc: "Eat all dots, avoid the ghosts.",
    color: "#fbbf24",
    gradient: "from-amber-950/80 via-amber-900/30 to-transparent",
    borderColor: "#fbbf2430",
    component: PacMan,
  },
  {
    id: "minecraft",
    name: "Minecraft Voxel",
    icon: "⛏️",
    tier: "🔴",
    desc: "Build your world block by block.",
    color: "#4ade80",
    gradient: "from-green-950/80 via-green-900/30 to-transparent",
    borderColor: "#4ade8030",
    component: Minecraft,
  },
  {
    id: "racing",
    name: "Racing Game",
    icon: "🏎️",
    tier: "🔴",
    desc: "Pseudo-3D cockpit racing. 5 real circuits · split-screen 2P · 3 laps.",
    color: "#818cf8",
    gradient: "from-indigo-950/80 via-indigo-900/30 to-transparent",
    borderColor: "#818cf830",
    component: Racing,
  },
  {
    id: "candy-crush",
    name: "Candy Crush 3D",
    icon: "💎",
    tier: "🔴",
    desc: "Match 3D gems. Special combos, cascades, 10 levels.",
    color: "#a855f7",
    gradient: "from-purple-950/80 via-purple-900/30 to-transparent",
    borderColor: "#a855f730",
    component: CandyCrush,
  },
  {
    id: "magic-sort",
    name: "Magic Sort",
    icon: "🧪",
    tier: "🟡",
    desc: "Pour potions between flasks until each holds one color. 30 levels.",
    color: "#c084fc",
    gradient: "from-purple-950/80 via-violet-900/30 to-transparent",
    borderColor: "#c084fc30",
    component: MagicSort,
  },
  {
    id: "tetris",
    name: "Tetris",
    icon: "🟦",
    tier: "🟢",
    desc: "Classic block puzzle. Stack, clear lines, chase the high score.",
    color: "#818cf8",
    gradient: "from-indigo-950/80 via-indigo-900/30 to-transparent",
    borderColor: "#818cf830",
    component: Tetris,
  },
  {
    id: "flow-free",
    name: "Flow Free",
    icon: "🔵",
    tier: "🟡",
    desc: "Connect matching dots with pipes. Cover every cell to solve.",
    color: "#2176AE",
    gradient: "from-blue-950/80 via-blue-900/30 to-transparent",
    borderColor: "#2176AE30",
    component: FlowFree,
  },
  {
    id: "tetris-royale",
    name: "Tetris Royale",
    icon: "👑",
    tier: "🔴",
    desc: "1–4 players online or vs AI. Clear lines, send junk. Last board standing wins.",
    color: "#c084fc",
    gradient: "from-purple-950/80 via-fuchsia-900/30 to-transparent",
    borderColor: "#c084fc30",
    component: TetrisRoyale,
  },
  {
    id: "pictionary",
    name: "DrawIt",
    icon: "🎨",
    tier: "🔴",
    desc: "Online Pictionary for 2–8 players. Draw words, guess fast, score by difficulty. Easy/Medium/Hard.",
    color: "#f472b6",
    gradient: "from-pink-950/80 via-rose-900/30 to-transparent",
    borderColor: "#f472b630",
    component: Pictionary,
  },
  {
    id: "mahjong",
    name: "Mahjong",
    icon: "🀄",
    tier: "🔴",
    desc: "Hong Kong style 4-player mahjong. 1 human vs 3 AI. Pung, Chow, Tsumo — full HK rules.",
    color: "#dc2626",
    gradient: "from-red-950/80 via-red-900/30 to-transparent",
    borderColor: "#dc262630",
    component: Mahjong,
  },
  {
    id: "sneezing-kittens",
    name: "Sneezing Kittens",
    icon: "🤧",
    tier: "🟡",
    desc: "Avoid the Sneezing Kitten! Play action cards, Nope your opponents, and be the last cat standing.",
    color: "#db2777",
    gradient: "from-pink-950/80 via-pink-900/30 to-transparent",
    borderColor: "#db277730",
    component: SneezingKittens,
  },
  {
    id: "trainyard",
    name: "TrainYard",
    icon: "🚂",
    tier: "🟡",
    desc: "Mexican Train Dominoes! Build your private train from the hub and race to empty your hand across 13 rounds.",
    color: "#d97706",
    gradient: "from-yellow-950/80 via-yellow-900/30 to-transparent",
    borderColor: "#d9770630",
    component: TrainYard,
  },
  {
    id: "spin-solve",
    name: "Spin & Solve Arena",
    icon: "🎡",
    tier: "🟡",
    desc: "Wheel of Fortune style! Spin the prize wheel, guess letters, buy vowels, and solve the puzzle before the AI does.",
    color: "#f0c040",
    gradient: "from-yellow-950/80 via-amber-900/30 to-transparent",
    borderColor: "#f0c04030",
    component: SpinSolve,
  },
  {
    id: "brain-race",
    name: "BrainRace",
    icon: "🧠",
    tier: "🟢",
    desc: "Academic trivia for Grades 5–8. Solo practice or local multiplayer (2–4 players). Science, History, Geography & Math.",
    color: "#3b82f6",
    gradient: "from-blue-950/80 via-blue-900/30 to-transparent",
    borderColor: "#3b82f630",
    component: BrainRace,
  },
  {
    id: "quiz-board",
    name: "Quiz Board Arena",
    icon: "🎯",
    tier: "🔴",
    desc: "Jeopardy-style trivia for 1–4 players. 12 categories · 1800+ clues · Base & Expanded packs. Hot-seat multiplayer.",
    color: "#fbbf24",
    gradient: "from-amber-950/80 via-yellow-900/30 to-transparent",
    borderColor: "#fbbf2430",
    component: QuizBoard,
  },
];

export const GAME_BY_ID = Object.fromEntries(GAMES.map(g => [g.id, g]));
