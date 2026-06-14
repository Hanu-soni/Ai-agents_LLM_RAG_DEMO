import OpenAI from "openai";

// Single shared OpenAI client for the entire app.
// Reads OPENAI_API_KEY from the environment at startup.
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const CHAT_MODEL = "gpt-4o-mini";
export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;
