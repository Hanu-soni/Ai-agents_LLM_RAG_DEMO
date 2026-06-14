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
