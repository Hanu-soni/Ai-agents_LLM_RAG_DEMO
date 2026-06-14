import type { z } from "zod";

// A tool the agent can call. `parameters` is a Zod schema describing the input.
export interface Tool<TInput = unknown> {
  name: string;
  description: string;
  parameters: z.ZodType<TInput>;
  execute: (input: TInput, context: ToolContext) => Promise<string>;
}

export interface ToolContext {
  agentId: string;
}

// Events emitted by the async-generator run loop
export type AgentEvent =
  | { type: "token"; content: string }
  | { type: "tool_start"; tool: string; input: unknown }
  | { type: "tool_end"; tool: string; output: string }
  | { type: "done"; content: string }
  | { type: "error"; message: string };

export interface RunOptions {
  agentId: string;
  systemPrompt: string;
  model: string;
  toolsEnabled: string[];
  history: ChatMessage[];
  userMessage: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_call_id?: string;
  name?: string;
}
