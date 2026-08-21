import type { Metadata } from "next";
import { ManagementEditor } from "@/components/management-editor";
import { catalogApi } from "@/lib/catalog/catalog-api";

export const metadata: Metadata = { title: "Habitatelement bearbeiten" };
type PageProps = { params: Promise<{ slug: string }> };

export default async function ManageHabitatEditorPage({ params }: PageProps) {
  const slug = (await params).slug;
  const habitat = slug === "new" ? null : await catalogApi.getHabitatBySlug(slug);
  return <ManagementEditor
    entityLabel="Habitatelement"
    title={habitat?.name ?? "Neues Habitatelement"}
    subtitle={habitat?.type}
    backHref="/management/habitat-elements"
    publicHref={habitat?.status === "published" ? `/habitat-elements/${habitat.slug}` : undefined}
    fields={[
      { label: "Element", value: habitat?.name },
      { label: "Elementtyp", value: habitat?.type },
      { label: "Größe", value: habitat?.size },
      { label: "Standort", value: habitat?.location },
      { label: "Maßnahme", value: habitat?.measureDescription, multiline: true },
      { label: "Pflege", value: habitat?.maintenance, multiline: true }
    ]}
  />;
}
