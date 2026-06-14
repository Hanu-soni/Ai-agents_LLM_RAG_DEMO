import { prisma } from "@/lib/db/client";
import { updateDocumentStatus } from "@/lib/db/queries";
import { chunkText } from "./chunk";
import { embedTexts } from "./embed";

/**
 * Full ingestion pipeline: chunk → embed → persist to Postgres via pgvector.
 * Uses raw SQL for the vector insert because Prisma doesn't support the
 * Unsupported("vector") type in create/update calls.
 */
export async function ingestDocument(
  documentId: string,
  agentId: string,
  text: string
): Promise<void> {
  await updateDocumentStatus(documentId, "PROCESSING");

  try {
    const chunks = chunkText(text);
    const embeddings = await embedTexts(chunks.map((c) => c.content));

    // Insert all chunks with their embeddings in one transaction
    await prisma.$transaction(
      chunks.map((chunk, i) =>
        prisma.$executeRaw`
          INSERT INTO "Chunk" (id, "documentId", content, embedding, "index")
          VALUES (
            gen_random_uuid()::text,
            ${documentId},
            ${chunk.content},
            ${JSON.stringify(embeddings[i])}::vector,
            ${chunk.index}
          )
        `
      )
    );

    await updateDocumentStatus(documentId, "READY");
  } catch (error) {
    await updateDocumentStatus(documentId, "ERROR");
    throw error;
  }
}
