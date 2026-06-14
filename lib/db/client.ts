import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient instance in dev to avoid exhausting DB connections
// on hot-reloads (Next.js module cache is cleared each reload in dev).
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
