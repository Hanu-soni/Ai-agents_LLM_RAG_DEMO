import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { saveMessage } from "@/lib/db/queries";
import { runAgent } from "@/lib/agent/loop";
import type { ChatMessage } from "@/lib/agent/types";

const ChatSchema = z.object({
  agentId: z.string().min(1),
  message: z.string().min(1),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .default([]),
});

// Helper: write a single SSE event as a Uint8Array
function sseEvent(data: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = ChatSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Validation failed", details: parsed.error.flatten() }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { agentId, message, history } = parsed.data;

  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) {
    return new Response(JSON.stringify({ error: "Agent not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Persist the user's message immediately
  await saveMessage(agentId, "user", message);

  const stream = new ReadableStream({
    async start(controller) {
      let finalContent = "";

      try {
        const generator = runAgent({
          agentId,
          systemPrompt: agent.systemPrompt,
          model: agent.model,
          toolsEnabled: agent.toolsEnabled,
          history: history as ChatMessage[],
          userMessage: message,
        });

        for await (const event of generator) {
          controller.enqueue(sseEvent(event));

          if (event.type === "done") {
            finalContent = event.content;
          }
        }

        // Persist the assistant's final response
        if (finalContent) {
          await saveMessage(agentId, "assistant", finalContent);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(sseEvent({ type: "error", message }));
      } finally {
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
