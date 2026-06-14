import type OpenAI from "openai";
import { openai } from "@/lib/llm/openai";
import { getEnabledTools, toOpenAITool } from "./tools";
import type { AgentEvent, ChatMessage, RunOptions, ToolContext } from "./types";

const MAX_ITERATIONS = 5;

/**
 * Core agent run loop — async generator that yields AgentEvent objects.
 *
 * Flow per iteration:
 *   1. Call OpenAI with the current message list + enabled tools.
 *   2. Stream tokens → emit { type: "token" } events.
 *   3. If the model requests tool calls, execute each tool, append the
 *      results, and loop again.
 *   4. If no tool calls, emit { type: "done" } and return.
 *
 * Callers (SSE route, script) consume this generator and forward events.
 */
export async function* runAgent(
  options: RunOptions
): AsyncGenerator<AgentEvent> {
  const { agentId, systemPrompt, model, toolsEnabled, history, userMessage } =
    options;

  const tools = getEnabledTools(toolsEnabled);
  const toolContext: ToolContext = { agentId };

  // Build the full message list: system + history + new user turn
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.map(toOpenAIParam),
    { role: "user", content: userMessage },
  ];

  const openAITools =
    tools.length > 0 ? tools.map(toOpenAITool) : undefined;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    let fullContent = "";
    const toolCallAccumulator: Map<
      number,
      { id: string; name: string; argumentsRaw: string }
    > = new Map();

    // Stream the completion
    const stream = await openai.chat.completions.create({
      model,
      messages,
      tools: openAITools,
      tool_choice: openAITools ? "auto" : undefined,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      // Accumulate text tokens
      if (delta.content) {
        fullContent += delta.content;
        yield { type: "token", content: delta.content };
      }

      // Accumulate tool call deltas (streamed in pieces)
      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const existing = toolCallAccumulator.get(tc.index) ?? {
            id: "",
            name: "",
            argumentsRaw: "",
          };
          if (tc.id) existing.id = tc.id;
          if (tc.function?.name) existing.name += tc.function.name;
          if (tc.function?.arguments) existing.argumentsRaw += tc.function.arguments;
          toolCallAccumulator.set(tc.index, existing);
        }
      }
    }

    // No tool calls → we have the final answer
    if (toolCallAccumulator.size === 0) {
      yield { type: "done", content: fullContent };
      return;
    }

    // Append the assistant turn (with tool_calls) to the message list
    const assistantToolCalls = Array.from(toolCallAccumulator.values()).map((tc) => ({
      id: tc.id,
      type: "function" as const,
      function: { name: tc.name, arguments: tc.argumentsRaw },
    }));

    messages.push({
      role: "assistant",
      content: fullContent || null,
      tool_calls: assistantToolCalls,
    });

    // Execute each requested tool and append its result
    for (const tc of Array.from(toolCallAccumulator.values())) {
      const tool = tools.find((t) => t.name === tc.name);

      let parsedInput: unknown = {};
      try {
        parsedInput = JSON.parse(tc.argumentsRaw);
      } catch {
        // leave as empty object if JSON is malformed
      }

      yield { type: "tool_start", tool: tc.name, input: parsedInput };

      let toolOutput: string;
      if (!tool) {
        toolOutput = `Error: unknown tool "${tc.name}"`;
      } else {
        try {
          const validated = tool.parameters.parse(parsedInput);
          toolOutput = await tool.execute(validated, toolContext);
        } catch (err) {
          toolOutput = `Error: ${err instanceof Error ? err.message : String(err)}`;
        }
      }

      yield { type: "tool_end", tool: tc.name, output: toolOutput };

      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: toolOutput,
      });
    }
    // Loop → call the model again with tool results appended
  }

  // Exceeded MAX_ITERATIONS without a final answer
  yield {
    type: "error",
    message: `Agent exceeded ${MAX_ITERATIONS} iterations without a final answer.`,
  };
}

// Convert our ChatMessage type to the shape OpenAI expects
function toOpenAIParam(
  msg: ChatMessage
): OpenAI.Chat.ChatCompletionMessageParam {
  if (msg.role === "tool") {
    return {
      role: "tool",
      tool_call_id: msg.tool_call_id ?? "",
      content: msg.content,
    };
  }
  return { role: msg.role as "user" | "assistant" | "system", content: msg.content };
}
