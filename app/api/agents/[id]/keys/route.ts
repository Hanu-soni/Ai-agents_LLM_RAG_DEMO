import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAgent } from "@/lib/db/queries";
import { listApiKeys, createApiKey, deleteApiKey } from "@/lib/db/queries";
import { generateApiKey, hashApiKey } from "@/lib/auth/api-key";

type RouteParams = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const agent = await getAgent(params.id);
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const keys = await listApiKeys(params.id);
  return NextResponse.json({ keys });
}

const CreateKeySchema = z.object({
  label: z.string().min(1).max(60).default("default"),
});

export async function POST(req: NextRequest, { params }: RouteParams) {
  const agent = await getAgent(params.id);
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { data } = CreateKeySchema.safeParse(body);
  const label = data?.label ?? "default";

  const rawKey = generateApiKey();
  const hashed = hashApiKey(rawKey);
  const record = await createApiKey(params.id, hashed, label);

  // Return the raw key ONCE — we never store or expose it again.
  return NextResponse.json({ key: rawKey, id: record.id, label }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const keyId = searchParams.get("keyId");
  if (!keyId) {
    return NextResponse.json({ error: "keyId query param required" }, { status: 400 });
  }
  await deleteApiKey(keyId);
  return new NextResponse(null, { status: 204 });
}
