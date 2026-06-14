import { openai, EMBEDDING_MODEL } from "@/lib/llm/openai";

const BATCH_SIZE = 100; // OpenAI allows up to 2048 inputs per request

/**
 * Embeds an array of texts in batches.
 * Returns a float array per text in the same order.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });

    // OpenAI returns embeddings in the same order as the input
    const batchEmbeddings = response.data
      .sort((a, b) => a.index - b.index)
      .map((item) => item.embedding);

    embeddings.push(...batchEmbeddings);
  }

  return embeddings;
}

export async function embedText(text: string): Promise<number[]> {
  const results = await embedTexts([text]);
  return results[0];
}
