import { NextResponse } from "next/server";

type RedirectStatus = 301 | 302 | 303 | 307 | 308;

export function sameOriginRedirect(location: string, status: RedirectStatus = 307): NextResponse {
  if (!location.startsWith("/") || location.startsWith("//")) {
    throw new Error("Preview redirects must use a same-origin path.");
  }

  return new NextResponse(null, {
    status,
    headers: { Location: location }
  });
}
