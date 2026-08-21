import type { Metadata } from "next";
import { ManagementEditor } from "@/components/management-editor";
import { catalogApi } from "@/lib/catalog/catalog-api";

export const metadata: Metadata = { title: "Artenportrait bearbeiten" };
type PageProps = { params: Promise<{ slug: string }> };

export default async function ManageSpeciesEditorPage({ params }: PageProps) {
  const slug = (await params).slug;
  const species = slug === "new" ? null : await catalogApi.getSpeciesBySlug(slug);
  return <ManagementEditor
    entityLabel="Artenportrait"
    title={species?.commonName ?? "Neue Art"}
    subtitle={species?.scientificName}
    backHref="/management/species"
    publicHref={species ? `/species/${species.slug}` : undefined}
    fields={[
      { label: "Deutscher Name", value: species?.commonName },
      { label: "Wissenschaftlicher Name", value: species?.scientificName },
      { label: "Alternativer Name", value: species?.alternativeName },
      { label: "Kurzbeschreibung", value: species?.teaser, multiline: true }
    ]}
  />;
}
