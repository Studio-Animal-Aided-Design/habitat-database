import { NextRequest, NextResponse } from "next/server";
import { previewAccessCookieName, resolvePreviewAccessConfig } from "@/lib/preview-access/config";
import { verifyPreviewSessionToken } from "@/lib/preview-access/session";

const PUBLIC_PREVIEW_PATHS = new Set(["/health", "/robots.txt"]);

export async function proxy(request: NextRequest) {
  const config = resolvePreviewAccessConfig();

  if (!config.enabled) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/preview-access") || PUBLIC_PREVIEW_PATHS.has(pathname)) {
    return noIndex(NextResponse.next());
  }

  const token = request.cookies.get(previewAccessCookieName)?.value;
  if (token && (await verifyPreviewSessionToken(token, config.sessionSecret))) {
    return noIndex(NextResponse.next());
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return noIndex(NextResponse.json({ error: "Preview access required" }, { status: 401 }));
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/preview-access";
  loginUrl.search = "";
  loginUrl.searchParams.set("returnTo", `${pathname}${search}`);
  return noIndex(NextResponse.redirect(loginUrl));
}

function noIndex(response: NextResponse) {
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.webp).*)"]
};
