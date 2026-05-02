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

export type Tier = "🟢" | "🟡" | "🔴";

export interface GameMeta {
  id: string;
  name: string;
  tier: Tier;
  desc: string;
  gradient: string;
  borderHover: string;
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
    tier: "🟢",
    desc: "Eat food, grow longer, don't crash.",
    gradient: "from-emerald-900/40 to-emerald-800/20",
    borderHover: "hover:border-emerald-500/50",
    component: Snake,
  },
  {
    id: "pong",
    name: "Pong",
    tier: "🟢",
    desc: "Classic paddle battle. First to 7 wins.",
    gradient: "from-sky-900/40 to-sky-800/20",
    borderHover: "hover:border-sky-500/50",
    component: Pong,
  },
  {
    id: "typing-racer",
    name: "Typing Racer",
    tier: "🟢",
    desc: "Race to type the passage fastest.",
    gradient: "from-yellow-900/40 to-yellow-800/20",
    borderHover: "hover:border-yellow-500/50",
    component: TypingRacer,
  },
  {
    id: "uno",
    name: "Uno",
    tier: "🟢",
    desc: "Match colors and numbers. First to empty hand wins.",
    gradient: "from-red-900/40 to-red-800/20",
    borderHover: "hover:border-red-500/50",
    component: Uno,
  },
  {
    id: "chess",
    name: "Chess",
    tier: "🟢",
    desc: "Classic chess. Local 2-player.",
    gradient: "from-violet-900/40 to-violet-800/20",
    borderHover: "hover:border-violet-500/50",
    component: Chess,
  },
  {
    id: "flappy-bird",
    name: "Flappy Bird",
    tier: "🟡",
    desc: "Tap to flap. Don't hit the pipes!",
    gradient: "from-lime-900/40 to-lime-800/20",
    borderHover: "hover:border-lime-500/50",
    component: FlappyBird,
  },
  {
    id: "tower-defense",
    name: "Tower Defense",
    tier: "🟡",
    desc: "Place towers, stop the waves.",
    gradient: "from-orange-900/40 to-orange-800/20",
    borderHover: "hover:border-orange-500/50",
    component: TowerDefense,
  },
  {
    id: "bubble-shooter",
    name: "Bubble Shooter",
    tier: "🟡",
    desc: "Match 3+ same-color bubbles.",
    gradient: "from-pink-900/40 to-pink-800/20",
    borderHover: "hover:border-pink-500/50",
    component: BubbleShooter,
  },
  {
    id: "battleship",
    name: "Battleship",
    tier: "🟡",
    desc: "Sink the enemy fleet first.",
    gradient: "from-cyan-900/40 to-cyan-800/20",
    borderHover: "hover:border-cyan-500/50",
    component: Battleship,
  },
  {
    id: "pac-man",
    name: "Pac-Man",
    tier: "🟡",
    desc: "Eat all dots, avoid the ghosts.",
    gradient: "from-amber-900/40 to-amber-800/20",
    borderHover: "hover:border-amber-500/50",
    component: PacMan,
  },
  {
    id: "minecraft",
    name: "Minecraft Voxel",
    tier: "🔴",
    desc: "Build your world block by block.",
    gradient: "from-green-900/40 to-green-800/20",
    borderHover: "hover:border-green-500/50",
    component: Minecraft,
  },
  {
    id: "racing",
    name: "Racing Game",
    tier: "🔴",
    desc: "Top-down racing. Best lap time wins.",
    gradient: "from-indigo-900/40 to-indigo-800/20",
    borderHover: "hover:border-indigo-500/50",
    component: Racing,
  },
];

export const GAME_BY_ID = Object.fromEntries(GAMES.map(g => [g.id, g]));
