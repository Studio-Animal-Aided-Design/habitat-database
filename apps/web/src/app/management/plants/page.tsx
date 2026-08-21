import type { Metadata } from "next";
import { ManagementEntityList } from "@/components/management-entity-list";
import { catalogApi } from "@/lib/catalog/catalog-api";

export const metadata: Metadata = { title: "Pflanzen verwalten" };

export default async function ManagePlantsPage() {
  const plants = await catalogApi.listPlants();
  return <ManagementEntityList
    title="Pflanzen"
    eyebrow="Inhalte verwalten"
    description="Pflanzendaten, ökologische Bedeutung und Beziehungen zu Zielarten."
    basePath="/management/plants"
    rows={plants.map((item) => ({
      slug: item.slug,
      name: item.commonName,
      secondary: item.scientificName,
      type: item.type,
      status: item.status
    }))}
  />;
}
