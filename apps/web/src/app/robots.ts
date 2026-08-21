import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: "/management/" }
    ],
    sitemap: "https://habitat-database.example/sitemap.xml"
  };
}
