import type { MetadataRoute } from "next";
import { isPreviewEnvironment } from "@/lib/runtime-environment";

export default function robots(): MetadataRoute.Robots {
  if (isPreviewEnvironment) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  const baseUrl = process.env.APP_BASE_URL ?? "https://habitat-database.example";
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: "/management/" }
    ],
    sitemap: `${baseUrl}/sitemap.xml`
  };
}
