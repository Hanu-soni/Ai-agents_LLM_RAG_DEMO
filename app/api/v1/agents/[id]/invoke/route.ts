import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { verifyApiKey, checkRateLimit, hashApiKey } from "@/lib/auth/api-key";
import { runAgent } from "@/lib/agent/loop";
import type { ChatMessage } from "@/lib/agent/types";

const InvokeSchema = z.object({
  input: z.string().min(1),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .default([]),
});

type RouteParams = { params: { id: string } };

function sseEvent(data: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or malformed Authorization header. Use: Bearer <api_key>" },
      { status: 401 }
    );
  }
  const rawKey = authHeader.slice(7).trim();

  const keyRecord = await verifyApiKey(rawKey, params.id);
  if (!keyRecord) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  // ── Rate limit ────────────────────────────────────────────────────────────
  const { allowed, remaining, resetAt } = checkRateLimit(hashApiKey(rawKey));
  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": "20",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
        },
      }
    );
  }

  // ── Validate body ─────────────────────────────────────────────────────────
  const body = await req.json().catch(() => null);
  const parsed = InvokeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { input, history } = parsed.data;

  const agent = await prisma.agent.findUnique({ where: { id: params.id } });
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const streamMode = req.nextUrl.searchParams.get("stream") === "true";
  const rateLimitHeaders = {
    "X-RateLimit-Limit": "20",
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
  };

  // ── Streaming mode ────────────────────────────────────────────────────────
  if (streamMode) {
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const gen = runAgent({
            agentId: agent.id,
            systemPrompt: agent.systemPrompt,
            model: agent.model,
            toolsEnabled: agent.toolsEnabled,
            history: history as ChatMessage[],
            userMessage: input,
          });
          for await (const event of gen) {
            controller.enqueue(sseEvent(event));
          }
        } catch (err) {
          controller.enqueue(
            sseEvent({ type: "error", message: err instanceof Error ? err.message : "Unknown error" })
          );
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
        ...rateLimitHeaders,
      },
    });
  }

  // ── Non-streaming (JSON) mode ─────────────────────────────────────────────
  let output = "";
  const toolCallLog: { tool: string; input: unknown; output: string }[] = [];
  let pendingTool: { tool: string; input: unknown } | null = null;

  try {
    const gen = runAgent({
      agentId: agent.id,
      systemPrompt: agent.systemPrompt,
      model: agent.model,
      toolsEnabled: agent.toolsEnabled,
      history: history as ChatMessage[],
      userMessage: input,
    });

    for await (const event of gen) {
      if (event.type === "done") output = event.content;
      if (event.type === "tool_start") pendingTool = { tool: event.tool, input: event.input };
      if (event.type === "tool_end" && pendingTool) {
        toolCallLog.push({ ...pendingTool, output: event.output });
        pendingTool = null;
      }
      if (event.type === "error") output = `Error: ${event.message}`;
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Agent error" },
      { status: 500, headers: rateLimitHeaders }
    );
  }

  return NextResponse.json(
    { output, toolCalls: toolCallLog },
    { headers: rateLimitHeaders }
  );
}
