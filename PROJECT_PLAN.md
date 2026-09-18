# JARVIS — roadmap

End goal: "JARVIS, ta hand om mitt företag." A main agent that plans, delegates
to subagents, remembers context long-term, calls real tools, and is reachable
from web, desktop, mobile, voice, and a 3D interface.

Dev workflow: architecture decisions get made with ChatGPT + the user (architect/CEO),
implementation happens with Claude / Claude Code, iteration happens in Cursor with
coding agents, then code is tested and merged into JARVIS Core.

## v0.1 — Foundation (current)
- Next.js + React + TypeScript (web client)
- Node backend
- LLM API (Claude, tool calling)
- PostgreSQL (chat history persistence)
- n8n (external workflow tool, called via webhook)
- WebSockets (realtime chat transport)
- Tool calling (Claude tool-use loop)
- GitHub (tool integration)

Scope for v0.1: a working end-to-end chat loop. User types in the Next.js
app → WebSocket → Node backend → Claude API with tool-calling → Postgres
persists the conversation → response streams back. GitHub and n8n exist as
callable tools, not yet used autonomously.

## v0.2 — Intelligence
- Memory (short-term + long-term, backed by Postgres/pgvector)
- Subagents (task-specific agents the main agent can delegate to)
- Planning (multi-step task decomposition)
- Long-running tasks (async jobs, progress tracking)
- Browser tools (the agent can browse the web)
- File tools (the agent can read/write files)

## v0.3 — Presence
- Voice (speech in/out)
- Wake word
- Desktop control (the agent can act on the user's machine)
- Proactive notifications (agent-initiated messages)

## v0.4 — Interface
- Three.js 3D interface
- Realtime visualization of agent state/activity

## Repo layout
```
apps/
  web/       Next.js frontend
  server/    Node backend (WebSocket + HTTP + tool orchestration)
  desktop/   placeholder (Electron TBD)
  mobile/    placeholder (React Native TBD)
packages/
  core/      Agent, tool registry, memory, subagents (shared logic)
```
