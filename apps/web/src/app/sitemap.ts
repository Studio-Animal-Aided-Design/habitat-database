import type { MetadataRoute } from "next";
import { catalogApi } from "@/lib/catalog/catalog-api";

const baseUrl = "https://habitat-database.example";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [species, plants, habitats] = await Promise.all([
    catalogApi.listSpecies(),
    catalogApi.listPlants(),
    catalogApi.listHabitats()
  ]);

  const staticRoutes = ["", "/species", "/plants", "/habitat-elements", "/imprint", "/privacy"];
  return [
    ...staticRoutes.map((route) => ({ url: `${baseUrl}${route}`, changeFrequency: "weekly" as const })),
    ...species.filter((item) => item.status === "published").map((item) => ({ url: `${baseUrl}/species/${item.slug}`, changeFrequency: "monthly" as const })),
    ...plants.filter((item) => item.status === "published").map((item) => ({ url: `${baseUrl}/plants/${item.slug}`, changeFrequency: "monthly" as const })),
    ...habitats.filter((item) => item.status === "published").map((item) => ({ url: `${baseUrl}/habitat-elements/${item.slug}`, changeFrequency: "monthly" as const }))
  ];
}
