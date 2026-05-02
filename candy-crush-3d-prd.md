# PRD: Candy Crush 3D — Match-3 Puzzle Game

**Version:** 1.0  
**Date:** May 2, 2026  
**Target:** Game Hub (`artifacts/game-hub`) — new game entry

---

## 1. Overview

A browser-based match-3 puzzle game inspired by Candy Crush, built with **Three.js** for 3D gem rendering and **GSAP / custom easing** for fluid animations. The game runs entirely in-browser with no server dependency, fitting the existing Game Hub architecture.

The experience should feel premium: gems are shiny 3D objects with reflections, matches explode with particle effects, the board tilts slightly in 3D perspective, and every swap/fall/cascade is animated smoothly.

---

## 2. Goals

| Goal | Success Metric |
|---|---|
| Fun and polished feel | Animations run at 60fps; no jank during cascades |
| Readable 3D visuals | Gems are clearly distinct by shape AND color |
| Progressive challenge | 20 levels with increasing difficulty |
| Completable MVP | Playable start-to-finish within Game Hub |

---

## 3. Visual Design

### 3.1 Camera & Board
- Board is an **8×8 grid** rendered in a mild 3D perspective (camera tilted ~25° from top-down, isometric-ish)
- Slight board tilt/rotation on load as an intro flourish
- Background: dark space/nebula feel with a soft gradient (complements existing Game Hub dark theme)
- Board frame: glowing beveled border, neon-lit edges

### 3.2 Gem Types (6 types)
Each gem is a distinct **3D shape** so color-blind players can also distinguish them:

| Gem | Shape | Primary Color | Glow |
|---|---|---|---|
| Ruby | Octahedron | `#ef4444` red | Crimson |
| Sapphire | Cube (beveled) | `#3b82f6` blue | Sky |
| Emerald | Prism (triangular) | `#22c55e` green | Lime |
| Topaz | Sphere | `#f59e0b` amber | Gold |
| Amethyst | Dodecahedron | `#a855f7` purple | Violet |
| Diamond | Icosahedron | `#e2e8f0` white | White |

Each gem has:
- `MeshPhysicalMaterial` with `roughness: 0.05`, `metalness: 0.1`, `transmission: 0.6` (glass-like)
- Point light glow at gem center
- Idle animation: slow continuous rotation (each gem type rotates on a unique axis)
- Cast shadows onto the board

### 3.3 Special Gems (created by special matches)
| Trigger | Special Gem | Effect |
|---|---|---|
| Match-4 in a row | **Striped Gem** | Clears entire row or column |
| Match-4 in an L/T shape | **Wrapped Gem** | 3×3 area explosion |
| Match-5 | **Color Bomb** | Clears all gems of one color |

Special gems have a distinct particle aura (looping shader effect).

---

## 4. Gameplay

### 4.1 Core Loop
1. Player sees an 8×8 board of gems
2. Player swaps two adjacent gems (horizontal or vertical) by clicking/dragging
3. If the swap creates a match of 3+ in a row/column, the match is removed
4. Board falls to fill gaps; new gems fall in from the top
5. Cascades continue automatically until no more matches exist
6. Player earns points and advances toward level goal

### 4.2 Match Rules
- Match-3: baseline — gems cleared, 30 pts each
- Match-4: special gem created + 60 pts each
- Match-5: color bomb created + 100 pts each
- L/T shapes (5 gems): wrapped gem + 80 pts each
- Cascades multiply: each successive cascade adds a 1.5× score multiplier

### 4.3 Invalid Swaps
- If a swap creates no match, gems animate back to their original positions (elastic snap-back)
- No life lost for invalid swaps (in base game)

### 4.4 Win / Lose Conditions
- **Win:** Reach the target score before moves run out
- **Lose:** Moves reach 0 without hitting target score
- Each level specifies: target score, move limit, special obstacles (see §5)

### 4.5 Move Hint System
- After 5 seconds of inactivity, one valid swap is highlighted with a pulsing glow
- Hint can be dismissed; reappears after another 5s of inactivity

---

## 5. Level Progression (20 Levels)

### Level Groups

| Levels | Theme | New Mechanic |
|---|---|---|
| 1–4 | Tutorial | Basic match-3, no obstacles |
| 5–8 | Stone Age | **Locked tiles** — cannot be swapped until matched adjacent |
| 9–12 | Ice Age | **Ice tiles** — gems frozen in place; match adjacent to thaw |
| 13–16 | Lava | **Lava spread** — each turn lava expands; clear it by matching on top |
| 17–20 | Cosmos | **Black holes** — periodically absorb nearby gems; must be closed by matching 4+ on them |

### Difficulty Curve
- Move limits start at 40 (level 1) and reduce to 20 (level 20)
- Target scores scale quadratically
- Board obstacle density increases per group

---

## 6. Animations (Critical to Feel)

All animations use spring/ease curves — no linear tweens.

| Event | Animation | Duration |
|---|---|---|
| Gem swap (valid) | Both gems arc slightly upward in 3D as they cross paths | 300ms |
| Gem swap (invalid) | Elastic snap-back with slight stretch | 250ms |
| Match removal | Gems implode with particle burst, screen flash tint | 400ms |
| Cascade fall | Gems bounce slightly on landing (squash/stretch) | 200ms per row |
| New gems entering | Fall from above with spin + decelerate | 350ms |
| Special gem activation | Expanding ring of light + shockwave | 600ms |
| Color bomb | Spiraling beam visits each matching gem | 800ms |
| Level complete | Board rises, gems scatter, confetti particles | 1200ms |
| Level fail | Board shakes + dims, gems droop | 800ms |

Animations are **queued** — cascades play sequentially so the player can follow each step. Each stage waits for the previous to finish before resolving matches.

---

## 7. Scoring & HUD

### HUD Elements (overlay on top of the 3D canvas)
- **Score** — current score with animated counter (rolls up digit by digit)
- **Target** — goal score for this level, shown as a progress bar
- **Moves remaining** — large, prominent; pulses red when ≤ 5
- **Level name** — themed name per level
- **Multiplier badge** — appears during cascades (`×2`, `×3`, etc.)

### Score Popups
- Points float up from the match location in 3D space (billboard text)
- Color-coded by match size (white = 3, gold = 4, rainbow = 5)

---

## 8. Audio (Optional / Enhancement)

- Gem swap: soft chime
- Match: satisfying pop/sparkle
- Cascade: escalating pitch per cascade step
- Special gem: distinct deep resonant tone
- Level complete: triumphant jingle
- Level fail: soft womp

Audio can be implemented with the Web Audio API (no external library needed). All sounds are synthetic (oscillator-based) to avoid asset dependencies.

---

## 9. Technical Architecture

### Stack
- **Three.js** (already in workspace for Minecraft) — 3D rendering
- **React** — component shell, HUD, menus (matches existing game pattern)
- **Canvas** via Three.js renderer — full-screen within game container
- No additional npm packages required beyond existing Three.js

### File Structure
```
artifacts/game-hub/src/games/
  candy-crush.tsx       ← main component (game loop, React shell)
  candy-crush-board.ts  ← board state, match logic, cascade engine
  candy-crush-scene.ts  ← Three.js scene setup, gem meshes, animation queue
  candy-crush-levels.ts ← level definitions (20 levels)
```

### Render Loop
```
requestAnimationFrame loop:
  1. Process input queue (swaps)
  2. Tick animation queue (GSAP-style spring interpolation)
  3. Update gem mesh positions/rotations/scales
  4. Three.js renderer.render(scene, camera)
  5. React HUD reads from stable ref (no re-render per frame)
```

### Board State (pure data, no Three.js)
```typescript
type Cell = {
  gemType: GemType | null;
  special: SpecialType | null;
  obstacle: ObstacleType | null;
  frozen: boolean;
  locked: boolean;
};
type Board = Cell[][];  // 8×8
```

Match detection runs on plain data; Three.js only reads from it to render. This keeps logic testable and decoupled from rendering.

### Animation Queue
A priority queue of `AnimationTask` objects drives all visuals:
```typescript
type AnimTask = {
  type: "swap" | "remove" | "fall" | "spawn" | "special";
  targets: number[];   // gem ids
  duration: number;
  easing: EasingFn;
  onComplete?: () => void;
};
```
Tasks run in dependency order (swap → remove → fall → spawn) ensuring correct visual sequencing.

---

## 10. Interaction

### Desktop
- **Click** gem → click adjacent gem → swap
- **Click + drag** in direction → swap in drag direction

### Mobile
- **Tap** gem → tap adjacent gem → swap
- **Swipe** on gem → swap in swipe direction

### Feedback
- Hovered gem: slight upward lift + brighter glow
- Selected gem: ring of particles orbiting gem + scale up 10%
- Adjacent valid swaps subtly glow when a gem is selected

---

## 11. Out of Scope (v1)

- Multiplayer / leaderboards
- In-app purchases or boosters
- Social sharing
- Server-side level storage
- More than 20 levels

---

## 12. Definition of Done

- [ ] All 20 levels are playable with correct win/lose detection
- [ ] All 6 gem types render as distinct 3D shapes with correct materials
- [ ] Swap, fall, and cascade animations run at 60fps on a mid-range laptop
- [ ] Special gems (striped, wrapped, color bomb) trigger correct effects
- [ ] Hint system fires after 5s inactivity
- [ ] HUD shows score, target, moves remaining correctly
- [ ] Game registers in `registry.ts` and appears in Game Hub home screen
- [ ] No TypeScript errors (`pnpm run typecheck`)
