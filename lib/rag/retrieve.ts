import { prisma } from "@/lib/db/client";
import { embedText } from "./embed";

export interface RetrievedChunk {
  id: string;
  documentId: string;
  content: string;
  index: number;
  score: number; // cosine distance (lower = more similar)
}

/**
 * Embed the query then run a pgvector KNN search scoped to an agent's documents.
 * Uses cosine distance (<=>), so lower scores mean higher relevance.
 */
export async function retrieve(
  agentId: string,
  query: string,
  topK = 5
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await embedText(query);
  const vectorLiteral = `[${queryEmbedding.join(",")}]`;

  const rows = await prisma.$queryRaw<RetrievedChunk[]>`
    SELECT
      c.id,
      c."documentId",
      c.content,
      c."index",
      (c.embedding <=> ${vectorLiteral}::vector)::float8 AS score
    FROM "Chunk" c
    JOIN "Document" d ON d.id = c."documentId"
    WHERE d."agentId" = ${agentId}
      AND d.status = 'READY'
      AND c.embedding IS NOT NULL
    ORDER BY c.embedding <=> ${vectorLiteral}::vector
    LIMIT ${topK}
  `;

  return rows;
}
