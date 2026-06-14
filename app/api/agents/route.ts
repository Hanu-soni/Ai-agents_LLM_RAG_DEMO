import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listAgents, createAgent } from "@/lib/db/queries";
import { TOOL_REGISTRY } from "@/lib/agent/tools";

const VALID_MODELS = ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"] as const;
const VALID_TOOLS = Object.keys(TOOL_REGISTRY);

const CreateAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().default(""),
  systemPrompt: z.string().min(1).max(4000),
  model: z.enum(VALID_MODELS).default("gpt-4o-mini"),
  toolsEnabled: z
    .array(z.string())
    .refine((tools) => tools.every((t) => VALID_TOOLS.includes(t)), {
      message: `Tools must be one of: ${VALID_TOOLS.join(", ")}`,
    })
    .default([]),
});

export async function GET() {
  const agents = await listAgents();
  return NextResponse.json({ agents });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateAgentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const agent = await createAgent(parsed.data);
  return NextResponse.json({ agent }, { status: 201 });
}
