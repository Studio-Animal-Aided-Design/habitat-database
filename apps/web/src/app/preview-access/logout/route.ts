import { previewAccessCookieName, resolvePreviewAccessConfig } from "@/lib/preview-access/config";
import { sameOriginRedirect } from "@/lib/preview-access/redirect";

export async function POST() {
  const config = resolvePreviewAccessConfig();
  const response = sameOriginRedirect(config.enabled ? "/preview-access" : "/", 303);
  response.cookies.set(previewAccessCookieName, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
