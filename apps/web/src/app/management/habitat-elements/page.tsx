import type { Metadata } from "next";
import { ManagementEntityList } from "@/components/management-entity-list";
import { catalogApi } from "@/lib/catalog/catalog-api";

export const metadata: Metadata = { title: "Habitatelemente verwalten" };

export default async function ManageHabitatsPage() {
  const habitats = await catalogApi.listHabitats();
  return <ManagementEntityList
    title="Habitatelemente"
    eyebrow="Inhalte verwalten"
    description="Planungsbausteine, Maßnahmen, Pflege und Beziehungen zu Zielarten."
    basePath="/management/habitat-elements"
    rows={habitats.map((item) => ({
      slug: item.slug,
      name: item.name,
      secondary: item.location ?? item.size ?? "Standort nicht erfasst",
      type: item.type,
      status: item.status
    }))}
  />;
}
