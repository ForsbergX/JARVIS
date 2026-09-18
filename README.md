# JARVIS

See [PROJECT_PLAN.md](./PROJECT_PLAN.md) for the full roadmap (v0.1 → v0.4)
and end goal.

## v0.1 — running it locally

Requirements: Node 20+, Docker (for Postgres), an Anthropic API key.

1. Start Postgres:
   ```
   docker compose up -d
   ```
2. Install dependencies (from repo root):
   ```
   npm install
   ```
3. Configure environment:
   ```
   cp apps/server/.env.example apps/server/.env
   cp apps/web/.env.local.example apps/web/.env.local
   ```
   Fill in `ANTHROPIC_API_KEY` in `apps/server/.env`. `GITHUB_TOKEN` and
   `N8N_WEBHOOK_URL` are optional — those tools report as "not configured"
   until set.
4. Run the backend:
   ```
   npm run dev --workspace=@jarvis/server
   ```
5. Run the web client (separate terminal):
   ```
   npm run dev:web
   ```
   Open http://localhost:3000.

Alternatively, chat with the core agent directly from the terminal, no web
client or WebSocket needed (still requires `ANTHROPIC_API_KEY`, reads from
`packages/core/.env`):
```
npm run chat
```

## Repo layout

```
apps/
  web/       Next.js frontend (chat UI)
  server/    Node backend — Fastify HTTP + WebSocket, wires the frontend to @jarvis/core
  desktop/   placeholder (Electron TBD)
  mobile/    placeholder (React Native TBD)
packages/
  core/      Agent (Claude tool-calling loop), tool registry, Postgres persistence
```
