import type { Metadata } from "next";
import { ManagementEntityList } from "@/components/management-entity-list";
import { catalogApi } from "@/lib/catalog/catalog-api";

export const metadata: Metadata = { title: "Arten verwalten" };

export default async function ManageSpeciesPage() {
  const species = await catalogApi.listSpecies();
  return <ManagementEntityList
    title="Artenportraits"
    eyebrow="Inhalte verwalten"
    description="Taxonomie, Portraitinhalte, Lebenszyklen und Beziehungen der Zielarten."
    basePath="/management/species"
    rows={species.map((item) => ({
      slug: item.slug,
      name: item.commonName,
      secondary: item.scientificName,
      type: item.className,
      status: item.status
    }))}
  />;
}
