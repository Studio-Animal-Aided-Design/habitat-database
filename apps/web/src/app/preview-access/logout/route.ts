import { NextRequest, NextResponse } from "next/server";
import { previewAccessCookieName, resolvePreviewAccessConfig } from "@/lib/preview-access/config";

export async function POST(request: NextRequest) {
  const config = resolvePreviewAccessConfig();
  const response = NextResponse.redirect(new URL(config.enabled ? "/preview-access" : "/", request.url), 303);
  response.cookies.set(previewAccessCookieName, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
