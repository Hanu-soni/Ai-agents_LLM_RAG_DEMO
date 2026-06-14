import { prisma } from "./client";
import type { Agent, Document, Message, Prisma } from "@prisma/client";

// ── Agents ────────────────────────────────────────────────────────────────────

export async function listAgents(): Promise<Agent[]> {
  return prisma.agent.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getAgent(id: string): Promise<Agent | null> {
  return prisma.agent.findUnique({ where: { id } });
}

export async function createAgent(
  data: Prisma.AgentCreateInput
): Promise<Agent> {
  return prisma.agent.create({ data });
}

export async function updateAgent(
  id: string,
  data: Prisma.AgentUpdateInput
): Promise<Agent> {
  return prisma.agent.update({ where: { id }, data });
}

export async function deleteAgent(id: string): Promise<void> {
  await prisma.agent.delete({ where: { id } });
}

// ── Documents ─────────────────────────────────────────────────────────────────

export async function listDocuments(agentId: string): Promise<Document[]> {
  return prisma.document.findMany({
    where: { agentId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createDocument(
  data: Prisma.DocumentCreateInput
): Promise<Document> {
  return prisma.document.create({ data });
}

export async function updateDocumentStatus(
  id: string,
  status: "PENDING" | "PROCESSING" | "READY" | "ERROR"
): Promise<void> {
  await prisma.document.update({ where: { id }, data: { status } });
}

// ── Messages ──────────────────────────────────────────────────────────────────

export async function listMessages(
  agentId: string,
  limit = 50
): Promise<Message[]> {
  return prisma.message.findMany({
    where: { agentId },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}

export async function saveMessage(
  agentId: string,
  role: string,
  content: string
): Promise<Message> {
  return prisma.message.create({ data: { agentId, role, content } });
}
