import type { Metadata } from "next";
import { ManagementEditor } from "@/components/management-editor";
import { catalogApi } from "@/lib/catalog/catalog-api";

export const metadata: Metadata = { title: "Pflanze bearbeiten" };
type PageProps = { params: Promise<{ slug: string }> };

export default async function ManagePlantEditorPage({ params }: PageProps) {
  const slug = (await params).slug;
  const plant = slug === "new" ? null : await catalogApi.getPlantBySlug(slug);
  return <ManagementEditor
    entityLabel="Pflanze"
    title={plant?.commonName ?? "Neue Pflanze"}
    subtitle={plant?.scientificName}
    backHref="/management/plants"
    publicHref={plant?.status === "published" ? `/plants/${plant.slug}` : undefined}
    fields={[
      { label: "Deutscher Name", value: plant?.commonName },
      { label: "Wissenschaftlicher Name", value: plant?.scientificName },
      { label: "Pflanzentyp", value: plant?.type },
      { label: "Blütezeit", value: plant?.floweringPeriod },
      { label: "Ökologische Bedeutung", value: plant?.ecologicalValue, multiline: true },
      { label: "Planungshinweise", value: plant?.planningNotes, multiline: true }
    ]}
  />;
}
