# Agent Forge

An agentic AI platform where you build custom AI agents, give them tools and a private knowledge base (RAG), chat with them in real time, and expose them over a public REST API.

Built with **Next.js 14 App Router · TypeScript · OpenAI · pgvector · Prisma · Docker**.

---

## What it does

| Feature | Details |
|---|---|
| **Agent builder** | Create agents with a custom system prompt, model choice, and tool toggles |
| **RAG knowledge base** | Upload `.txt` / `.md` docs → chunked, embedded (OpenAI), stored in pgvector |
| **Tool-calling loop** | Agents autonomously call tools and loop until they have a final answer |
| **Streaming chat** | Real-time SSE chat with tool-call indicators |
| **Public API** | Invoke any agent via REST with a per-agent API key |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Next.js App                           │
│                                                              │
│  Pages (App Router)                                          │
│   ├─ /               landing page                            │
│   ├─ /agents         agent builder + list                    │
│   ├─ /agents/[id]/chat  streaming chat                       │
│   └─ /knowledge      upload & manage documents               │
│                                                              │
│  API (route handlers)                                        │
│   ├─ /api/agents        CRUD for agents                      │
│   ├─ /api/chat          agent run loop (SSE streaming)       │
│   ├─ /api/knowledge     ingest + list documents              │
│   └─ /api/v1/agents/:id/invoke  PUBLIC API (API-key auth)    │
│                                                              │
│  Core libs                                                   │
│   ├─ lib/agent/*     tool-calling loop + tool registry       │
│   ├─ lib/rag/*       chunk → embed → retrieve (pgvector)     │
│   ├─ lib/llm/*       OpenAI client wrappers                  │
│   └─ lib/db/*        Prisma client + typed queries           │
└───────────────────────────┬──────────────────────────────────┘
                            │
                   ┌────────▼────────┐
                   │  Postgres 16 +  │
                   │  pgvector ext.  │
                   └─────────────────┘
```

### Agent run loop

```
user message
    │
    ▼
build context (system prompt + RAG results + history)
    │
    ▼
call OpenAI with enabled tools
    │
    ├── tool_call? ──► execute tool ──► append result ──► loop (max 5×)
    │
    └── final answer ──► stream to client
```

### RAG pipeline

```
upload file
    │
    ▼
chunk text (~800 tokens, ~100 token overlap)
    │
    ▼
embed chunks (OpenAI text-embedding-3-small, 1536-dim, batched)
    │
    ▼
store in Postgres via pgvector (ivfflat cosine index)
    │
    ▼
query time: embed query → KNN search (<=> cosine distance) → top-k chunks
```

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 App Router, TypeScript strict |
| Styling | Tailwind CSS, custom UI components |
| LLM | OpenAI `gpt-4o-mini` (swap via `lib/llm/openai.ts`) |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dimensions) |
| Vector store | Postgres 16 + `pgvector` extension |
| ORM | Prisma 5 |
| Validation | Zod |
| Streaming | Server-Sent Events (SSE) |
| Auth | Per-agent hashed API keys |
| Infra | Docker Compose (Postgres), Dockerfile (app) |

---

## Local setup

### Prerequisites

- Node.js 20+
- Docker Desktop (for Postgres + pgvector)
- An OpenAI API key

### 1. Clone and install

```bash
git clone https://github.com/Hanu-soni/Ai-agents_LLM_RAG_DEMO.git
cd Ai-agents_LLM_RAG_DEMO
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local and set:
#   OPENAI_API_KEY=sk-...
#   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agentforge
```

### 3. Start the database

```bash
npm run db:up          # starts pgvector/pgvector:pg16 via Docker
npx prisma migrate deploy   # applies schema + vector index
```

### 4. Run the app

```bash
npm run dev
# → http://localhost:3000
```

### Useful scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript type check |
| `npm test` | Run chunking unit tests |
| `npm run db:up` | Start Postgres container |
| `npm run db:down` | Stop Postgres container |
| `npm run db:studio` | Open Prisma Studio (DB GUI) |
| `npm run eval:rag` | End-to-end RAG eval (requires DB + API key) |

---

## Database schema

```
Agent          — id, name, description, systemPrompt, model, toolsEnabled[]
Document       — id, agentId, filename, status (PENDING/PROCESSING/READY/ERROR)
Chunk          — id, documentId, content, embedding vector(1536), index
ApiKey         — id, agentId, hashedKey, label
Message        — id, agentId, role, content
```

The `Chunk.embedding` column uses pgvector's `vector(1536)` type with an `ivfflat` cosine index for fast approximate nearest-neighbour search.

---

## Public API

Invoke any agent programmatically with its API key:

```bash
curl -X POST https://your-domain.com/api/v1/agents/<AGENT_ID>/invoke \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"input": "Summarise the key points in my documents."}'
```

Response:

```json
{
  "output": "Based on your documents, the key points are...",
  "toolCalls": [
    { "tool": "knowledge_search", "input": "key points", "chunks": 3 }
  ]
}
```

Add `?stream=true` to receive a streaming SSE response instead.  
API keys are generated per-agent, shown once, and stored as a bcrypt hash.

---

## Project status

| Phase | Description | Status |
|---|---|---|
| 1 | Scaffold (Next.js, Tailwind, layout, nav) | ✅ Done |
| 2 | Database (Postgres + pgvector, Prisma schema) | ✅ Done |
| 3 | RAG pipeline (chunk, embed, ingest, retrieve) | ✅ Done |
| 4 | Agent core (tool registry, run loop) | 🔄 In progress |
| 5 | Agent builder UI (CRUD + form) | ⏳ Pending |
| 6 | Chat interface (SSE streaming) | ⏳ Pending |
| 7 | Public API + API key auth | ⏳ Pending |
| 8 | Docker, README, seed script | ⏳ Pending |

---

## Repo structure

```
app/
  (marketing)/page.tsx     landing page
  agents/page.tsx          agent list + builder
  agents/[id]/chat/        streaming chat UI
  knowledge/page.tsx       document upload
  api/                     route handlers
lib/
  agent/                   tool registry + run loop
  rag/                     chunk · embed · ingest · retrieve
  llm/                     OpenAI client
  db/                      Prisma client + queries
prisma/
  schema.prisma            data models
  migrations/              SQL migrations (incl. vector extension)
scripts/
  eval-rag.ts              end-to-end RAG evaluation
components/
  nav.tsx                  top navigation
  ui/                      Button · Card · Input
docker-compose.yml         Postgres + pgvector
```

---

## License

MIT
