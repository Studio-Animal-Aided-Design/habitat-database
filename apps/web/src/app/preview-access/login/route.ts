import { NextRequest, NextResponse } from "next/server";
import {
  previewAccessCookieName,
  resolvePreviewAccessConfig,
  sanitizePreviewReturnTo
} from "@/lib/preview-access/config";
import { verifyPreviewPassword } from "@/lib/preview-access/password";
import { createPreviewSessionToken } from "@/lib/preview-access/session";

const FAILED_LOGIN_DELAY_MS = 350;

export async function POST(request: NextRequest) {
  const config = resolvePreviewAccessConfig();
  if (!config.enabled) {
    return NextResponse.redirect(new URL("/", request.url), 303);
  }

  const formData = await request.formData();
  const password = String(formData.get("password") ?? "").slice(0, 512);
  const returnTo = sanitizePreviewReturnTo(String(formData.get("returnTo") ?? "/"));

  if (!(await verifyPreviewPassword(password, config.passwordHash))) {
    await new Promise((resolve) => setTimeout(resolve, FAILED_LOGIN_DELAY_MS));
    const loginUrl = new URL("/preview-access", request.url);
    loginUrl.searchParams.set("error", "invalid");
    loginUrl.searchParams.set("returnTo", returnTo);
    return NextResponse.redirect(loginUrl, 303);
  }

  const expiresAt = Math.floor(Date.now() / 1_000) + config.sessionDurationSeconds;
  const token = await createPreviewSessionToken(config.sessionSecret, expiresAt);
  const response = NextResponse.redirect(new URL(returnTo, request.url), 303);
  response.cookies.set(previewAccessCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https",
    path: "/",
    maxAge: config.sessionDurationSeconds
  });
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}
