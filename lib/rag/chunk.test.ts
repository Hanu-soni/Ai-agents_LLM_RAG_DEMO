import { chunkText } from "./chunk.js";

// Minimal test harness — no Jest dependency needed for a portfolio project.
// Run with: npx ts-node lib/rag/chunk.test.ts

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

const SHORT = "Hello world. This is a test sentence.";
const LONG = Array.from({ length: 300 }, (_, i) => `Sentence ${i + 1} about topic ${i % 5}.`).join(" ");

// Short text → single chunk
const shortChunks = chunkText(SHORT, 800, 100);
assert(shortChunks.length === 1, "short text produces exactly one chunk");
assert(shortChunks[0].content === SHORT.trim(), "short chunk preserves content");
assert(shortChunks[0].index === 0, "first chunk has index 0");

// Long text → multiple chunks
const longChunks = chunkText(LONG, 800, 100);
assert(longChunks.length > 1, "long text is split into multiple chunks");
assert(longChunks.every((c) => c.content.length > 0), "all chunks have content");
assert(
  longChunks.every((c, i) => c.index === i),
  "chunk indices are sequential"
);

// Overlap: the second chunk should begin with content that also appears near
// the end of the first chunk (overlap window is ~400 chars).
if (longChunks.length >= 2) {
  // Take a 30-char sample from well inside the overlap region of chunk 0.
  const overlapSample = longChunks[0].content.slice(-350, -320);
  assert(
    longChunks[1].content.includes(overlapSample),
    "consecutive chunks share overlap text"
  );
}

console.log("\nAll chunking tests passed.");
