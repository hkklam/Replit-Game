# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains two products:
1. **ZETA Meeting Notes** — a browser-based meeting recorder and transcription tool.
2. **Game Hub** — a browser-based collection of 12 MVP games.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: Replit OpenAI Integration (Whisper for transcription)

## Artifacts

### `artifacts/game-hub` — React+Vite Game Hub (port 23091, path `/game-hub`)
24 browser games, all pure React/Canvas:
- 🟢 Simple: Snake, Pong, Typing Racer, Uno, Chess, Tetris, BrainRace
- 🟡 Medium: Flappy Bird, Tower Defense, Bubble Shooter, Battleship, Pac-Man, Magic Sort, Flow Free, Sneezing Kittens, TrainYard, Spin & Solve
- 🔴 Hard: Minecraft Voxel, Racing Game, Candy Crush 3D, Tetris Royale, DrawIt (Pictionary), Mahjong, BrainRace, **Quiz Board Arena** (Jeopardy-style)

**Quiz Board Arena** (`quiz-board.tsx`):
- Jeopardy-style trivia, 1–4 players hot-seat (same device)
- 12 categories: Science & Nature, World Geography, World History, Literature & Arts, Sports & Games, Technology & Inventions (base pack) + Wordplay & Vocabulary, Music & Instruments, Food & Drink, Math & Logic, Famous People, The Human Body (expanded pack)
- 1800+ clues; 6 random categories per game; 5 value tiers ($100–$500) per category
- Correct = +value, wrong = -value; configurable timer (15/30/45/60s); fuzzy answer matching
- Pack selector (Base/Expanded/All) + custom category picker in setup
All games are in `artifacts/game-hub/src/games/`. Routing via `wouter`.

**Mobile / Touch Support** (all 24 games playable on touch screens):
- Snake: swipe-to-turn on canvas + on-screen D-pad (`sm:hidden`)
- Pong: canvas drag-to-move + ▲▼ buttons (`sm:hidden`)
- Tetris: canvas swipe gesture + 6-button fixed-bottom toolbar (`sm:hidden`)
- Tetris Royale: same swipe + fixed-bottom toolbar (`sm:hidden`)
- Flappy Bird: P1 fullscreen tap; P2 tap button (`sm:hidden`, 2P mode)
- Minecraft: canvas touch-drag camera look + D-pad + fly buttons (shown only when `isMobile && locked`)
- Pac-Man, Racing, Flow Free, Battleship, Tower Defense, Bubble Shooter, Pictionary: already touch-ready
- All remaining games (Chess, Candy Crush, Uno, Mahjong, etc.): click/button-based — works natively on mobile

**Online multiplayer** (via WebSocket relay in `artifacts/api-server`):
- **Mahjong** — up to 3 human players + 1 AI bot, server-authoritative (`mahjong-rooms.ts`, `mahjong-logic.ts`); lobby with room code; per-player hidden hand view; server-run AI turns; claim window with 7s auto-skip
- **UNO** — up to 8 players, full server-authoritative game logic (`uno-rooms.ts`, `uno-logic.ts`)
- **Chess** — 2-player relay; host=White, guest=Black; board flips for Black; move sync over relay
- **Battleship** — 2-player relay; simultaneous ship placement; fire/result protocol keeps ships private

Shared relay hook: `artifacts/game-hub/src/lib/relay-socket.ts`  
WebSocket server: `artifacts/api-server/src/ws.ts` (path `/api/ws`)

### `artifacts/zeta-meetings` — React+Vite frontend (port 24296, path `/`)
Pages: Record (`/`), History (`/meetings`), Meeting Detail (`/meetings/:id`)

### `artifacts/api-server` — Express API server (port 8080, path `/api`)
Routes defined in `artifacts/api-server/src/routes/meetings.ts`.
Endpoints: list, get, upload+transcribe, download transcript, delete, stats.

## Key Libraries

- `lib/db` — Drizzle ORM schema + migrations. Table: `meetings`.
- `lib/api-spec` — OpenAPI spec (`openapi.yaml`). Source of truth for all endpoints.
- `lib/api-zod` — Generated Zod schemas from OpenAPI spec.
- `lib/api-client-react` — Generated React Query hooks from OpenAPI spec.
- `lib/integrations-openai-ai-server` — Replit OpenAI AI Integration client for server use.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## How It Works

1. User enters a meeting name and clicks **Start** in the browser
2. Browser captures microphone audio via `MediaRecorder`
3. On **Stop**, the WebM audio blob is uploaded to `POST /api/meetings/upload`
4. The API server sends the audio to OpenAI Whisper via Replit AI Integration
5. A timestamped markdown transcript is generated and saved to `transcripts/`
6. Meeting metadata (name, duration, cost, transcript path) saved to PostgreSQL
7. User can view/download the markdown transcript or delete the meeting

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (auto-provisioned)
- `SESSION_SECRET` — Session secret
- `AI_INTEGRATIONS_OPENAI_BASE_URL` — Replit OpenAI proxy base URL
- `AI_INTEGRATIONS_OPENAI_API_KEY` — Replit OpenAI proxy API key

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
