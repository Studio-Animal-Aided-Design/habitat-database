import { resolveAppEnvironment } from "../runtime-environment";

export const previewAccessCookieName = "aad_preview_access";

type RuntimeEnvironment = Record<string, string | undefined>;

type DisabledPreviewAccess = { enabled: false };
export type EnabledPreviewAccess = {
  enabled: true;
  passwordHash: string;
  sessionSecret: string;
  sessionDurationSeconds: number;
};
export type PreviewAccessConfig = DisabledPreviewAccess | EnabledPreviewAccess;

const minimumSessionSecretLength = 32;
const defaultSessionDurationSeconds = 60 * 60 * 24 * 7;
const maximumSessionDurationSeconds = 60 * 60 * 24 * 30;

export function resolvePreviewAccessConfig(environment: RuntimeEnvironment = process.env): PreviewAccessConfig {
  const mode = environment.PREVIEW_ACCESS_MODE?.trim() || "off";
  if (mode === "off") return { enabled: false };
  if (mode !== "shared-password") {
    throw new Error("PREVIEW_ACCESS_MODE must be off or shared-password.");
  }
  if (resolveAppEnvironment(environment) !== "preview") {
    throw new Error("Shared preview access is restricted to APP_ENV=preview.");
  }

  const passwordHash = environment.PREVIEW_ACCESS_PASSWORD_HASH?.trim();
  if (!passwordHash?.startsWith("scrypt$")) {
    throw new Error("PREVIEW_ACCESS_PASSWORD_HASH must contain a generated scrypt hash.");
  }

  const sessionSecret = environment.PREVIEW_ACCESS_SESSION_SECRET?.trim();
  if (!sessionSecret || sessionSecret.length < minimumSessionSecretLength) {
    throw new Error(`PREVIEW_ACCESS_SESSION_SECRET must be at least ${minimumSessionSecretLength} characters.`);
  }

  const configuredDuration = Number(environment.PREVIEW_ACCESS_SESSION_DURATION_SECONDS || defaultSessionDurationSeconds);
  if (!Number.isInteger(configuredDuration) || configuredDuration < 300 || configuredDuration > maximumSessionDurationSeconds) {
    throw new Error("PREVIEW_ACCESS_SESSION_DURATION_SECONDS must be an integer between 300 and 2592000.");
  }

  return {
    enabled: true,
    passwordHash,
    sessionSecret,
    sessionDurationSeconds: configuredDuration
  };
}

export function sanitizePreviewReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.length > 2_048) return "/";
  return value.startsWith("/preview-access") ? "/" : value;
}
