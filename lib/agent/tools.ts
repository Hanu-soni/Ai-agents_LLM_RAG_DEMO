import { z } from "zod";
import type { Tool } from "./types";
import { retrieve } from "@/lib/rag/retrieve";

// ── Tool definitions ──────────────────────────────────────────────────────────

const knowledgeSearch: Tool<{ query: string; top_k?: number }> = {
  name: "knowledge_search",
  description:
    "Search the agent's private knowledge base using semantic similarity. " +
    "Use this whenever the user asks about topics that may be covered in uploaded documents.",
  parameters: z.object({
    query: z.string().describe("The search query"),
    top_k: z.number().int().min(1).max(10).optional().describe("Number of results (default 5)"),
  }),
  async execute({ query, top_k = 5 }, { agentId }) {
    const chunks = await retrieve(agentId, query, top_k);
    if (chunks.length === 0) return "No relevant documents found.";
    return chunks
      .map((c, i) => `[${i + 1}] (score: ${c.score.toFixed(3)})\n${c.content}`)
      .join("\n\n---\n\n");
  },
};

const calculator: Tool<{ expression: string }> = {
  name: "calculator",
  description:
    "Evaluate a safe arithmetic expression. Supports +, -, *, /, **, %, parentheses, " +
    "and Math functions (Math.sqrt, Math.abs, etc.).",
  parameters: z.object({
    expression: z.string().describe("A JavaScript-style arithmetic expression"),
  }),
  async execute({ expression }) {
    // Only allow numeric literals, operators, spaces, and Math.*
    // This prevents arbitrary code execution while still being useful.
    const safe = /^[\d\s\+\-\*\/\%\(\)\.\,Math\.a-z_]+$/.test(expression);
    if (!safe) return "Error: expression contains disallowed characters.";
    try {
      // eslint-disable-next-line no-new-func
      const result = new Function(`"use strict"; return (${expression})`)();
      if (typeof result !== "number" || !isFinite(result)) {
        return "Error: expression did not produce a valid number.";
      }
      return String(result);
    } catch {
      return "Error: could not evaluate expression.";
    }
  },
};

const currentTime: Tool<Record<string, never>> = {
  name: "current_time",
  description: "Return the current UTC date and time.",
  parameters: z.object({}),
  async execute() {
    return new Date().toUTCString();
  },
};

// ── Registry ──────────────────────────────────────────────────────────────────

// All built-in tools keyed by name for O(1) lookup.
export const TOOL_REGISTRY: Record<string, Tool> = {
  knowledge_search: knowledgeSearch as Tool,
  calculator: calculator as Tool,
  current_time: currentTime as Tool,
};

/**
 * Returns the subset of tools the agent has enabled, ready for the run loop.
 */
export function getEnabledTools(toolNames: string[]): Tool[] {
  return toolNames
    .filter((name) => name in TOOL_REGISTRY)
    .map((name) => TOOL_REGISTRY[name]);
}

/**
 * Serialize a Tool to the OpenAI function-calling schema format.
 */
export function toOpenAITool(tool: Tool): {
  type: "function";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function: { name: string; description: string; parameters: any };
} {
  // zodToJsonSchema produces a JSON Schema object from the Zod schema.
  // We do a lightweight inline conversion to avoid adding a heavy dependency.
  const schema = zodToJsonSchema(tool.parameters);
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: schema,
    },
  };
}

// Lightweight Zod → JSON Schema converter for the subset of types we use.
function zodToJsonSchema(schema: z.ZodTypeAny): unknown {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, z.ZodTypeAny>;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(value);
      if (!(value instanceof z.ZodOptional)) required.push(key);
    }

    return { type: "object", properties, required };
  }

  if (schema instanceof z.ZodOptional) {
    return zodToJsonSchema(schema.unwrap());
  }

  if (schema instanceof z.ZodString) {
    const base: Record<string, unknown> = { type: "string" };
    const desc = schema.description;
    if (desc) base.description = desc;
    return base;
  }

  if (schema instanceof z.ZodNumber) {
    const base: Record<string, unknown> = { type: "number" };
    const desc = schema.description;
    if (desc) base.description = desc;
    return base;
  }

  if (schema instanceof z.ZodBoolean) return { type: "boolean" };

  // Fallback for anything else
  return {};
}
