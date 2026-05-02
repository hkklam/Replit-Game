# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains **ZETA Meeting Notes** — a browser-based meeting recorder and transcription tool.

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
