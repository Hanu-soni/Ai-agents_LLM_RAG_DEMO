export interface TextChunk {
  content: string;
  index: number;
}

// Rough token estimate: GPT tokenizers average ~4 chars per token.
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Splits text into overlapping chunks sized around targetTokens.
 * Works at sentence boundaries when possible to preserve coherence.
 */
export function chunkText(
  text: string,
  targetTokens = 800,
  overlapTokens = 100
): TextChunk[] {
  const targetChars = targetTokens * 4;
  const overlapChars = overlapTokens * 4;

  // Split on sentence boundaries (period/newline followed by whitespace or end)
  const sentences = text.split(/(?<=[.!?\n])\s+/);
  const chunks: TextChunk[] = [];

  let current = "";
  let index = 0;

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence;

    if (estimateTokens(candidate) > targetTokens && current.length > 0) {
      chunks.push({ content: current.trim(), index });
      index++;
      // Start the next chunk with overlap from the end of the previous one
      const overlapStart = Math.max(0, current.length - overlapChars);
      current = current.slice(overlapStart) + " " + sentence;
    } else {
      current = candidate;
    }
  }

  if (current.trim().length > 0) {
    chunks.push({ content: current.trim(), index });
  }

  return chunks;
}
