import Image from "next/image";
import Link from "next/link";
import { Building2, Leaf } from "lucide-react";
import { EditorialActionLink, EditorialEyebrow } from "@/components/editorial-primitives";
import type { HabitatSummary, PlantSummary } from "@/lib/catalog/types";

type PlantCardProps = { kind: "plant"; item: PlantSummary; headingLevel?: 2 | 3 | 4 };
type HabitatCardProps = { kind: "habitat"; item: HabitatSummary; priority?: boolean; headingLevel?: 2 | 3 | 4 };

export function CatalogEntityCard(props: PlantCardProps | HabitatCardProps) {
  const isPlant = props.kind === "plant";
  const href = props.kind === "plant" ? `/plants/${props.item.slug}` : `/habitat-elements/${props.item.slug}`;
  const title = props.kind === "plant" ? props.item.commonName : props.item.name;
  const label = props.item.type;
  const Heading = props.headingLevel === 3 ? "h3" : props.headingLevel === 4 ? "h4" : "h2";

  return (
    <article className={`entity-card ${isPlant ? "plant-card" : "habitat-card"}`}>
      <Link className="entity-visual" href={href} aria-label={`${title} öffnen`}>
        {props.kind === "habitat" && props.item.image ? (
          <Image
            src={props.item.image.url}
            alt={props.item.image.alt}
            fill
            priority={props.priority}
            sizes="(max-width: 720px) 92vw, 31vw"
          />
        ) : (
          <div className={`botanical-mark ${isPlant ? "botanical-mark-plant" : "botanical-mark-habitat"}`} aria-hidden="true">
            {isPlant ? <Leaf /> : <Building2 />}
            <i />
            <i />
          </div>
        )}
        <span>{isPlant ? <Leaf size={14} /> : <Building2 size={14} />}{label}</span>
      </Link>
      <div className="entity-card-content">
        <EditorialEyebrow>{props.kind === "plant" ? props.item.floweringPeriod ?? "Pflanzenart" : props.item.location ?? "Planungsbaustein"}</EditorialEyebrow>
        <Heading><Link href={href}>{title}</Link></Heading>
        {props.kind === "plant" && <p className="scientific">{props.item.scientificName}</p>}
        <p>{props.item.teaser}</p>
        <EditorialActionLink variant="text" href={href}>Details öffnen</EditorialActionLink>
      </div>
    </article>
  );
}
