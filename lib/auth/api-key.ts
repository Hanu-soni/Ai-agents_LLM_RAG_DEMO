import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db/client";

/** Generates a new API key with an `af_` prefix. Returned once; never stored raw. */
export function generateApiKey(): string {
  return "af_" + randomBytes(32).toString("hex");
}

/** One-way hash of a raw key for safe DB storage. */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Looks up a hashed key in the DB and returns the matching ApiKey row,
 * or null if the key is invalid or doesn't belong to the given agent.
 */
export async function verifyApiKey(rawKey: string, agentId: string) {
  const hashed = hashApiKey(rawKey);
  return prisma.apiKey.findFirst({
    where: { hashedKey: hashed, agentId },
  });
}

// ── In-memory rate limiter (per hashed key, 20 req / 60 s) ───────────────────
// Fine for a demo; replace with Redis in production.

const RATE_LIMIT = 20;
const WINDOW_MS = 60_000;
const _store = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(hashedKey: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const entry = _store.get(hashedKey);

  if (!entry || now >= entry.resetAt) {
    const resetAt = now + WINDOW_MS;
    _store.set(hashedKey, { count: 1, resetAt });
    return { allowed: true, remaining: RATE_LIMIT - 1, resetAt };
  }

  if (entry.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT - entry.count, resetAt: entry.resetAt };
}
