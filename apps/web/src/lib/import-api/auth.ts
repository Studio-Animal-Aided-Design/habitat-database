import { ImportApiError } from "./errors";
import { verifyScryptSecret } from "../security/scrypt";

type Attempt = { failures: number; resetAt: number };
const attempts = new Map<string, Attempt>();
const windowMs = 60_000;
const maximumFailures = 10;

export function resetImportAuthRateLimits(): void {
  attempts.clear();
}

function assertNotRateLimited(clientId: string, now = Date.now()): void {
  const attempt = attempts.get(clientId);
  if (!attempt || attempt.resetAt <= now) {
    attempts.delete(clientId);
    return;
  }
  if (attempt.failures >= maximumFailures) {
    throw new ImportApiError(429, "auth_rate_limited", "Zu viele fehlgeschlagene Anmeldeversuche. Bitte später erneut versuchen.");
  }
}

function recordFailure(clientId: string, now = Date.now()): void {
  const previous = attempts.get(clientId);
  if (!previous || previous.resetAt <= now) attempts.set(clientId, { failures: 1, resetAt: now + windowMs });
  else attempts.set(clientId, { ...previous, failures: previous.failures + 1 });
}

export async function authenticateImportRequest(request: Request, tokenHash: string): Promise<void> {
  const clientId = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
  assertNotRateLimited(clientId);

  const authorization = request.headers.get("authorization") || "";
  const match = /^Bearer ([^\s]+)$/i.exec(authorization);
  if (!match || !(await verifyScryptSecret(match[1], tokenHash))) {
    recordFailure(clientId);
    console.warn("Import API authentication failed", { clientId });
    throw new ImportApiError(401, "unauthorized", "Die Import-API-Anmeldung ist ungültig.");
  }
  attempts.delete(clientId);
}

export function requireIdempotencyKey(request: Request): string {
  const value = request.headers.get("idempotency-key")?.trim();
  if (!value || value.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(value)) {
    throw new ImportApiError(400, "invalid_idempotency_key", "Ein gültiger Idempotency-Key-Header ist erforderlich.");
  }
  return value;
}
