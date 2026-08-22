import Image from "next/image";
import Link from "next/link";
import { EditorialActionLink, EditorialEyebrow } from "@/components/editorial-primitives";
import type { SpeciesSummary } from "@/lib/catalog/types";

export function SpeciesCard({
  species,
  priority = false,
  headingLevel = 3
}: {
  species: SpeciesSummary;
  priority?: boolean;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <article className="species-card">
      <Link href={`/species/${species.slug}`} className="species-image">
        <Image
          src={species.image.url}
          alt={species.image.alt}
          fill
          priority={priority}
          sizes="(max-width: 760px) 90vw, 31vw"
        />
        <span>{species.className}</span>
      </Link>
      <div className="species-card-content">
        <EditorialEyebrow>{species.familyName}</EditorialEyebrow>
        <Heading>
          <Link href={`/species/${species.slug}`}>{species.commonName}</Link>
        </Heading>
        <p className="scientific">{species.scientificName}</p>
        <p>{species.teaser}</p>
        <EditorialActionLink variant="text" href={`/species/${species.slug}`}>
          Artenportrait öffnen
        </EditorialActionLink>
      </div>
    </article>
  );
}
