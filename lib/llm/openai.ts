import OpenAI from "openai";

export const CHAT_MODEL = "gpt-4o-mini";
export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

// Lazy singleton — only instantiated on first use so the build doesn't
// require OPENAI_API_KEY to be set at compile / static-render time.
let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set. Add it to .env.local.");
    }
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

// Convenience re-export for callers that want the named `openai` binding.
export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    return (getOpenAIClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
