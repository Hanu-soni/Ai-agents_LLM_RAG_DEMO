import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAgent, updateAgent, deleteAgent } from "@/lib/db/queries";
import { TOOL_REGISTRY } from "@/lib/agent/tools";

const VALID_MODELS = ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"] as const;
const VALID_TOOLS = Object.keys(TOOL_REGISTRY);

const PatchAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  systemPrompt: z.string().min(1).max(4000).optional(),
  model: z.enum(VALID_MODELS).optional(),
  toolsEnabled: z
    .array(z.string())
    .refine((tools) => tools.every((t) => VALID_TOOLS.includes(t)), {
      message: `Tools must be one of: ${VALID_TOOLS.join(", ")}`,
    })
    .optional(),
});

type RouteParams = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const agent = await getAgent(params.id);
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ agent });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const existing = await getAgent(params.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PatchAgentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const agent = await updateAgent(params.id, parsed.data);
  return NextResponse.json({ agent });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const existing = await getAgent(params.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deleteAgent(params.id);
  return new NextResponse(null, { status: 204 });
}
