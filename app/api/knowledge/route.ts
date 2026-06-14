import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { listDocuments, createDocument } from "@/lib/db/queries";
import { ingestDocument } from "@/lib/rag/ingest";

const GetSchema = z.object({
  agentId: z.string().min(1),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parsed = GetSchema.safeParse({ agentId: searchParams.get("agentId") });

  if (!parsed.success) {
    return NextResponse.json({ error: "agentId is required" }, { status: 400 });
  }

  const documents = await listDocuments(parsed.data.agentId);
  return NextResponse.json({ documents });
}

const PostSchema = z.object({
  agentId: z.string().min(1),
  filename: z.string().min(1),
  text: z.string().min(1, "Document text must not be empty"),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  const contentType = req.headers.get("content-type") ?? "";

  // Accept both multipart form (file upload) and plain JSON
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    const allowedTypes = ["text/plain", "text/markdown"];
    if (!allowedTypes.some((t) => file.type.startsWith(t) || file.name.endsWith(".md") || file.name.endsWith(".txt"))) {
      return NextResponse.json(
        { error: "Only .txt and .md files are supported" },
        { status: 415 }
      );
    }
    body = {
      agentId: formData.get("agentId"),
      filename: file.name,
      text: await file.text(),
    };
  } else {
    body = await req.json();
  }

  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { agentId, filename, text } = parsed.data;

  // Verify agent exists
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const document = await createDocument({
    filename,
    status: "PENDING",
    agent: { connect: { id: agentId } },
  });

  // Run ingestion in the background — respond immediately so uploads don't time out
  ingestDocument(document.id, agentId, text).catch(console.error);

  return NextResponse.json({ document }, { status: 201 });
}
