# Agent Forge — Build Plan

> An agentic AI platform where users build custom AI agents, give them tools and a
> private knowledge base (RAG), chat with them, and expose them over a public API.
> Built on **Next.js (App Router) + TypeScript**, with an optional **Python/LangChain**
> RAG microservice. Designed to be executed task-by-task with **Claude Code in VS Code**.

This single project ships **two portfolio-ready pieces**:

1. **Agent Forge (Next.js)** — agent builder UI, tool-calling agent loop, chat, public API.
2. **RAG Knowledge Service** — document ingestion, chunking, embeddings, pgvector semantic search
   (runs as a module inside Next.js *and* optionally as a standalone Python/FastAPI service).

Both map directly to real production patterns: agent orchestration, retrieval-augmented
generation, vector search, queue-driven jobs, and API exposure.

---

## 0. How to use this plan with Claude Code

1. Create an **empty GitHub repo** named `agent-forge` and clone it locally.
2. Copy this file into the repo root as `PLAN.md`, and copy the "Project context" block
   below into a file named `CLAUDE.md` (Claude Code reads it automatically for context).
3. Open the folder in VS Code, launch Claude Code, and work **one task at a time**:
   paste the task's *Claude Code prompt*, review the diff, run the *acceptance check*,
   then commit before moving on.
4. Commit after every task with a clear message — a clean commit history is itself a
   signal to recruiters. Use Conventional Commits (`feat:`, `chore:`, `docs:`).

### Project context (put this in `CLAUDE.md`)

```
# Agent Forge — context for Claude Code

Stack: Next.js 14 (App Router, TypeScript, RSC), Tailwind CSS, Postgres + pgvector,
Prisma ORM, OpenAI API (chat + embeddings, native tool-calling), Zod, Docker.

Conventions:
- TypeScript strict mode. No `any` unless justified with a comment.
- App Router route handlers under app/api/**. Server actions where appropriate.
- All LLM calls go through lib/llm/*. All DB access through lib/db/* (Prisma).
- Validate every API input with Zod. Return typed JSON. Handle errors explicitly.
- Keep secrets in .env.local; never commit them. Provide .env.example.
- Write a short comment above non-obvious functions explaining WHY, not what.
- Prefer small, composable modules. One responsibility per file.

Definition of done for any task:
- Type-checks (`npm run typecheck`) and lints clean.
- Builds (`npm run build`) without errors.
- New behavior has at least one test or a documented manual check.
```

---

## 1. Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Next.js App                           │
│                                                              │
│  UI (App Router, RSC + client components)                    │
│   ├─ /agents            agent builder + list                 │
│   ├─ /agents/[id]/chat  chat with an agent                   │
│   └─ /knowledge         upload & manage documents (RAG)      │
│                                                              │
│  API (route handlers under app/api)                          │
│   ├─ /api/agents        CRUD for agents                      │
│   ├─ /api/chat          agent run loop (SSE streaming)       │
│   ├─ /api/knowledge     ingest + list documents              │
│   └─ /api/v1/agents/:id/invoke   PUBLIC API (API-key auth)   │
│                                                              │
│  Core libs                                                   │
│   ├─ lib/agent/*        tool-calling loop + tool registry    │
│   ├─ lib/rag/*          chunk, embed, retrieve (pgvector)    │
│   ├─ lib/llm/*          OpenAI client wrappers               │
│   └─ lib/db/*           Prisma client + queries              │
└───────────────┬──────────────────────────────────────────────┘
                │
        ┌───────▼────────┐        ┌──────────────────────────────┐
        │ Postgres +     │        │ (Optional) Python RAG service │
        │ pgvector       │◄───────│ FastAPI + LangChain + pgvector│
        └────────────────┘        └──────────────────────────────┘
```

**Agent run loop (core idea):** user message → build context (system prompt + RAG
results + history) → call LLM with available tools → if the model requests a tool,
execute it and loop → otherwise stream the final answer.

---

## 2. Tech stack

| Layer            | Choice                                                            |
|------------------|-------------------------------------------------------------------|
| Framework        | Next.js 14 App Router, TypeScript (strict)                        |
| Styling          | Tailwind CSS, a few shadcn/ui components                          |
| LLM              | OpenAI (`gpt-4o-mini` for dev), native tool/function calling      |
| Embeddings       | OpenAI `text-embedding-3-small`                                   |
| Vector store     | Postgres + `pgvector` extension                                  |
| ORM              | Prisma                                                            |
| Validation       | Zod                                                              |
| Streaming        | Server-Sent Events (SSE) for chat                                |
| Auth (API)       | API keys (hashed) for the public endpoint                        |
| Infra            | Docker Compose (Postgres), Dockerfile for the app                |
| Optional service | Python 3.11, FastAPI, LangChain                                  |

> Swap notes: OpenAI can be replaced with Gemini or a local model by editing only
> `lib/llm/*`. Postgres+pgvector can be replaced with Supabase (you've used it) by
> pointing `DATABASE_URL` at a Supabase instance — pgvector is supported there.

---

## 3. Target repo structure

```
agent-forge/
├─ app/
│  ├─ (marketing)/page.tsx
│  ├─ agents/page.tsx
│  ├─ agents/[id]/chat/page.tsx
│  ├─ knowledge/page.tsx
│  └─ api/
│     ├─ agents/route.ts
│     ├─ agents/[id]/route.ts
│     ├─ chat/route.ts
│     ├─ knowledge/route.ts
│     └─ v1/agents/[id]/invoke/route.ts
├─ lib/
│  ├─ agent/{loop.ts,tools.ts,types.ts}
│  ├─ rag/{chunk.ts,embed.ts,ingest.ts,retrieve.ts}
│  ├─ llm/{openai.ts,stream.ts}
│  └─ db/{client.ts,queries.ts}
├─ prisma/schema.prisma
├─ components/ui/*
├─ docker-compose.yml
├─ Dockerfile
├─ .env.example
├─ CLAUDE.md
└─ README.md
```

---

## 4. Prerequisites

- Node.js 20+, npm
- Docker Desktop (for local Postgres + pgvector)
- An OpenAI API key in `.env.local` as `OPENAI_API_KEY`
- `DATABASE_URL` pointing at the local Postgres (see Phase 2)

---

# PHASES

Each task below is sized to be one Claude Code turn. Do them in order.

## Phase 1 — Scaffold

**Task 1.1 — Initialize the Next.js app**
- *Claude Code prompt:* "Scaffold a Next.js 14 App Router app in the current directory
  with TypeScript (strict), Tailwind CSS, ESLint, and the `app/` directory. Add npm
  scripts: `dev`, `build`, `start`, `lint`, `typecheck` (tsc --noEmit). Create a clean
  landing page at `app/(marketing)/page.tsx` describing Agent Forge. Add `.env.example`
  with `OPENAI_API_KEY` and `DATABASE_URL` placeholders."
- *Acceptance:* `npm run dev` serves the landing page; `npm run typecheck` passes.
- *Commit:* `chore: scaffold next.js app with tailwind and tooling`

**Task 1.2 — Base layout & nav**
- *Claude Code prompt:* "Add a shared layout with a top nav linking to Agents, Knowledge,
  and the public API docs. Use Tailwind. Add a couple of shadcn/ui components (button,
  card, input). Keep it clean and minimal — neutral palette, good spacing."
- *Acceptance:* Nav renders on every page; build passes.
- *Commit:* `feat: base layout and navigation`

## Phase 2 — Database + pgvector

**Task 2.1 — Postgres + pgvector via Docker**
- *Claude Code prompt:* "Create `docker-compose.yml` running `pgvector/pgvector:pg16`
  with a named volume, exposing 5432. Add a `db:up`/`db:down` npm script. Document the
  connection string in `.env.example`."
- *Acceptance:* `npm run db:up` starts Postgres; `psql` can connect.
- *Commit:* `chore: local postgres with pgvector via docker compose`

**Task 2.2 — Prisma schema**
- *Claude Code prompt:* "Add Prisma. Define models: `Agent` (id, name, description,
  systemPrompt, model, toolsEnabled string[], createdAt), `Document` (id, agentId,
  filename, status, createdAt), `Chunk` (id, documentId, content, embedding
  Unsupported(\"vector(1536)\"), index int), `ApiKey` (id, agentId, hashedKey, label,
  createdAt), `Message` (id, agentId, role, content, createdAt). Generate the client,
  write the migration, and add a raw SQL migration that enables the `vector` extension
  and creates an ivfflat index on Chunk.embedding."
- *Acceptance:* `npx prisma migrate dev` succeeds; vector column + index exist.
- *Commit:* `feat: prisma schema with pgvector embedding column`

## Phase 3 — RAG ingestion pipeline (Work #2 begins here)

**Task 3.1 — Chunking + embeddings**
- *Claude Code prompt:* "In `lib/rag/`, implement `chunk.ts` (split text into ~800-token
  chunks with ~100 overlap, return {content, index}) and `embed.ts` (call OpenAI
  `text-embedding-3-small` in batches, return number[][]). Add `lib/llm/openai.ts` with a
  shared client. Unit-test chunking with a sample string."
- *Acceptance:* `npm test` passes for chunking; embed returns 1536-dim vectors.
- *Commit:* `feat: rag chunking and embedding utilities`

**Task 3.2 — Ingest endpoint**
- *Claude Code prompt:* "Implement `lib/rag/ingest.ts`: given an agentId and raw text,
  chunk → embed → store chunks + embeddings via Prisma (use raw SQL for the vector insert).
  Add `app/api/knowledge/route.ts` (POST) that accepts a `.txt`/`.md` upload, validates
  with Zod, runs ingestion, and updates Document.status. GET lists documents for an agent."
- *Acceptance:* Uploading a text file creates Document + Chunk rows with embeddings.
- *Commit:* `feat: document ingestion endpoint`

**Task 3.3 — Retrieval**
- *Claude Code prompt:* "Implement `lib/rag/retrieve.ts`: embed a query, run a pgvector
  cosine-distance KNN search (raw SQL, `ORDER BY embedding <=> $1 LIMIT k`) scoped to an
  agent's documents, return top-k chunks with scores. Add a tiny eval script under
  `scripts/` that ingests a sample doc and prints retrieval results for a sample query."
- *Acceptance:* Retrieval returns relevant chunks; the eval script runs end-to-end.
- *Commit:* `feat: pgvector semantic retrieval`

## Phase 4 — Agent core

**Task 4.1 — Tool registry**
- *Claude Code prompt:* "In `lib/agent/tools.ts`, define a typed Tool interface
  ({name, description, parameters: ZodSchema, execute}). Implement three tools:
  `knowledge_search` (wraps lib/rag/retrieve), `calculator` (safe arithmetic), and
  `current_time`. Export an OpenAI-tool-schema serializer."
- *Acceptance:* Tools serialize to valid OpenAI function schemas; each executes.
- *Commit:* `feat: agent tool registry with three built-in tools`

**Task 4.2 — Agent run loop**
- *Claude Code prompt:* "In `lib/agent/loop.ts`, implement the run loop: build messages
  from system prompt + history + user input; call OpenAI with the agent's enabled tools;
  if the response contains tool calls, execute them, append results, and loop (cap at 5
  iterations); otherwise return the final message. Make it async-generator based so it can
  stream tokens and tool-call events."
- *Acceptance:* A scripted run with a knowledge question triggers `knowledge_search` then
  answers using retrieved context.
- *Commit:* `feat: tool-calling agent run loop`

## Phase 5 — Agent builder UI

**Task 5.1 — Agent CRUD API**
- *Claude Code prompt:* "Add `app/api/agents/route.ts` (GET list, POST create) and
  `app/api/agents/[id]/route.ts` (GET, PATCH, DELETE). Validate with Zod. Fields: name,
  description, systemPrompt, model, toolsEnabled."
- *Acceptance:* Can create/list/update/delete agents via curl.
- *Commit:* `feat: agent crud api`

**Task 5.2 — Builder UI**
- *Claude Code prompt:* "Build `/agents` (list + 'New agent') and a create/edit form with
  fields for name, description, system prompt (textarea), model select, and tool toggles.
  Use server actions or fetch to the CRUD API. Clean Tailwind layout."
- *Acceptance:* Creating an agent in the UI persists it and shows in the list.
- *Commit:* `feat: agent builder ui`

## Phase 6 — Chat interface

**Task 6.1 — Streaming chat endpoint**
- *Claude Code prompt:* "Add `app/api/chat/route.ts` (POST) that takes {agentId, message,
  history}, runs `lib/agent/loop.ts`, and streams the response over SSE, emitting events
  for tokens and tool-calls. Persist messages."
- *Acceptance:* curl with `Accept: text/event-stream` streams tokens.
- *Commit:* `feat: streaming chat endpoint (sse)`

**Task 6.2 — Chat UI**
- *Claude Code prompt:* "Build `/agents/[id]/chat`: a chat window that streams responses,
  shows a subtle indicator when a tool is being called (e.g. 'searching knowledge…'), and
  renders markdown. Keep history in component state."
- *Acceptance:* Live chat works; tool-call indicator appears for knowledge questions.
- *Commit:* `feat: streaming chat ui with tool indicators`

## Phase 7 — Public API exposure

**Task 7.1 — API keys**
- *Claude Code prompt:* "Add API-key issuance: a 'Generate API key' action on the agent
  page that creates a key (return once, store only a hash). Add `lib/auth/apiKey.ts` to
  verify `Authorization: Bearer` against hashed keys."
- *Acceptance:* A generated key verifies; a wrong key is rejected.
- *Commit:* `feat: per-agent api keys (hashed)`

**Task 7.2 — Public invoke endpoint**
- *Claude Code prompt:* "Add `app/api/v1/agents/[id]/invoke/route.ts` (POST, API-key
  auth) that runs the agent on {input, history?} and returns JSON (non-streaming) plus an
  SSE mode via `?stream=true`. Add basic per-key rate limiting (in-memory is fine for the
  demo). Document the endpoint in the README with a curl example."
- *Acceptance:* `curl -H "Authorization: Bearer <key>"` returns an agent response.
- *Commit:* `feat: public agent invoke api with rate limiting`

## Phase 8 — Polish, Docker, deploy

**Task 8.1 — Dockerize**
- *Claude Code prompt:* "Add a multi-stage `Dockerfile` for the Next.js app and wire the
  app into docker-compose alongside Postgres. Ensure `npm run build` works in-container."
- *Acceptance:* `docker compose up` serves the app talking to Postgres.
- *Commit:* `chore: dockerfile and compose for full stack`

**Task 8.2 — README + screenshots + seed**
- *Claude Code prompt:* "Write a strong README: what it is, architecture diagram (ASCII or
  image), feature list, local setup, env vars, the public API with a curl example, and a
  'how it works' section on the agent loop and RAG. Add a `scripts/seed.ts` that creates a
  demo agent with a sample knowledge base so reviewers can try it in one command."
- *Acceptance:* A new user can clone, `npm run seed`, and chat within minutes.
- *Commit:* `docs: comprehensive readme and seed script`

## Phase 9 (Optional) — Python/LangChain RAG microservice (mirrors your prod architecture)

> Do this if you want the repo to demonstrate the **Node gateway + Python LLM service**
> split that's on your resume. It makes the RAG service independently runnable.

**Task 9.1 — FastAPI service**
- *Claude Code prompt:* "In `services/rag-py/`, create a FastAPI app with LangChain that
  exposes POST `/ingest` and POST `/search` over the same Postgres+pgvector DB. Use
  LangChain's text splitter and OpenAI embeddings. Add a Dockerfile and add the service to
  docker-compose."
- *Acceptance:* The Python service ingests and searches against the same vectors.
- *Commit:* `feat: optional python/langchain rag microservice`

**Task 9.2 — Toggle Next.js to call the Python service**
- *Claude Code prompt:* "Add an env flag `RAG_BACKEND=ts|py`. When `py`, `lib/rag/retrieve`
  and ingest proxy to the FastAPI service instead of running in-process. Document both modes."
- *Acceptance:* Switching the flag routes retrieval through Python; results match.
- *Commit:* `feat: pluggable rag backend (ts or python)`

---

## Stretch goals (pick 1–2 for extra signal)

- **BullMQ + Redis** ingestion queue (matches your resume): move document processing to a
  worker so large uploads don't block requests.
- **Observability:** add basic OpenTelemetry traces around LLM + retrieval calls.
- **Evals:** a small RAG eval harness (precision@k on a labeled question set).
- **Multi-tenant:** scope agents/keys to a user; add simple auth.
- **Web-search tool:** add a real search tool to the agent (e.g. Tavily/SerpAPI).

---

## Suggested first session with Claude Code

1. Phase 1 (1.1, 1.2) — scaffold and layout.
2. Phase 2 (2.1, 2.2) — database up, schema migrated.
3. Phase 3 (3.1–3.3) — RAG pipeline working end-to-end (this alone is demo-able).
4. Commit, push, and pin the repo. Then continue with Phases 4–8.

By end of Phase 6 you have a working agentic chat demo; by Phase 8 it's deployable and
README-backed; Phase 9 adds the Python microservice as a second showcase.

---

## What to put on your resume / profile once built

- **Agent Forge** — *Next.js, TypeScript, OpenAI, pgvector, Prisma, Docker* — "Agentic AI
  platform where users build custom tool-using agents over a private RAG knowledge base and
  invoke them via a public API." (Live/Repo: add link once deployed.)
- This backs your existing "AI Agent service" and "RAG pipeline" resume bullets with real,
  inspectable code — swap it in for one of the duplicated Key Projects.
