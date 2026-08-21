import Image from "next/image";
import Link from "next/link";
import { EditorialActionLink, EditorialEyebrow } from "@/components/editorial-primitives";
import type { SpeciesSummary } from "@/lib/catalog/types";

export function SpeciesCard({ species, priority = false }: { species: SpeciesSummary; priority?: boolean }) {
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
        <h3>
          <Link href={`/species/${species.slug}`}>{species.commonName}</Link>
        </h3>
        <p className="scientific">{species.scientificName}</p>
        <p>{species.teaser}</p>
        <EditorialActionLink variant="text" href={`/species/${species.slug}`}>
          Artenportrait öffnen
        </EditorialActionLink>
      </div>
    </article>
  );
}
