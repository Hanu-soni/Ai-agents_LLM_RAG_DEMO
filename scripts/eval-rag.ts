/**
 * Quick end-to-end RAG eval script.
 * Usage:  npx ts-node -r tsconfig-paths/register scripts/eval-rag.ts
 *
 * Requires: DB running, OPENAI_API_KEY set in .env.local
 */
import "dotenv/config";
import { prisma } from "../lib/db/client";
import { ingestDocument } from "../lib/rag/ingest";
import { retrieve } from "../lib/rag/retrieve";

const SAMPLE_DOC = `
Agent Forge is an agentic AI platform built with Next.js 14 App Router and TypeScript.
It allows users to build custom AI agents that have access to a private knowledge base
via Retrieval-Augmented Generation (RAG).

Key features:
- Custom system prompts per agent
- Tool-calling loop with built-in tools: knowledge_search, calculator, current_time
- Document ingestion: upload .txt or .md files that are chunked and embedded via OpenAI
- Vector search: pgvector cosine-distance KNN search over agent-scoped chunks
- Public REST API with per-agent API keys

The architecture uses Postgres with the pgvector extension for storing 1536-dimensional
embeddings produced by OpenAI text-embedding-3-small.
`;

const QUERIES = [
  "What embedding model does Agent Forge use?",
  "How does the knowledge search work?",
  "What tools does an agent have access to?",
];

async function main() {
  console.log("=== Agent Forge RAG Eval ===\n");

  // 1. Create a temporary agent
  const agent = await prisma.agent.create({
    data: {
      name: "eval-agent",
      description: "Temporary agent for RAG eval",
      systemPrompt: "You are a helpful assistant.",
      toolsEnabled: ["knowledge_search"],
    },
  });
  console.log(`Created agent: ${agent.id}`);

  // 2. Create a document record
  const doc = await prisma.document.create({
    data: {
      agentId: agent.id,
      filename: "sample.txt",
      status: "PENDING",
    },
  });
  console.log(`Created document: ${doc.id}`);

  // 3. Ingest (chunk + embed + store)
  console.log("\nIngesting document...");
  await ingestDocument(doc.id, agent.id, SAMPLE_DOC.trim());
  console.log("Ingestion complete.\n");

  // 4. Retrieve for each query
  for (const query of QUERIES) {
    console.log(`Query: "${query}"`);
    const chunks = await retrieve(agent.id, query, 2);
    chunks.forEach((c, i) => {
      console.log(`  [${i + 1}] score=${c.score.toFixed(4)}  "${c.content.slice(0, 120)}..."`);
    });
    console.log();
  }

  // 5. Cleanup
  await prisma.agent.delete({ where: { id: agent.id } });
  console.log("Cleanup done. Eval complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
