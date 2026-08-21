type Publishable = { slug: string; status: "draft" | "published" | "archived" };

export const featuredSlugs = {
  species: ["gimpel", "mauersegler", "zauneidechse"],
  plants: ["acer-campestre", "betula-pendula", "cornus-mas"],
  habitats: ["wild-hecken", "altgrasstreifen", "trockenmauer"]
} as const;

/**
 * Select preferred published records in editorial order, then fill open slots
 * by slug. This keeps the homepage stable while allowing incomplete imports.
 */
export function selectFeatured<T extends Publishable>(
  items: T[],
  preferred: readonly string[],
  limit = 3
): T[] {
  const published = items.filter((item) => item.status === "published");
  const bySlug = new Map(published.map((item) => [item.slug, item]));
  const selected = preferred.flatMap((slug) => {
    const item = bySlug.get(slug);
    return item ? [item] : [];
  });
  const selectedSlugs = new Set(selected.map((item) => item.slug));
  const fallback = published
    .filter((item) => !selectedSlugs.has(item.slug))
    .sort((left, right) => left.slug.localeCompare(right.slug, "de"));

  return [...selected, ...fallback].slice(0, limit);
}

export function uniquePublishedTypes(items: Array<Publishable & { type?: string; className?: string }>): string[] {
  return [...new Set(
    items
      .filter((item) => item.status === "published")
      .map((item) => item.type ?? item.className)
      .filter((value): value is string => Boolean(value?.trim()))
  )].sort((left, right) => left.localeCompare(right, "de"));
}
