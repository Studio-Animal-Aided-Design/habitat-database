import Image from "next/image";
import Link from "next/link";
import { Building2, Leaf } from "lucide-react";
import { EditorialActionLink, EditorialEyebrow } from "@/components/editorial-primitives";
import type { HabitatSummary, PlantSummary } from "@/lib/catalog/types";

type PlantCardProps = { kind: "plant"; item: PlantSummary };
type HabitatCardProps = { kind: "habitat"; item: HabitatSummary; priority?: boolean };

export function CatalogEntityCard(props: PlantCardProps | HabitatCardProps) {
  const isPlant = props.kind === "plant";
  const href = props.kind === "plant" ? `/plants/${props.item.slug}` : `/habitat-elements/${props.item.slug}`;
  const title = props.kind === "plant" ? props.item.commonName : props.item.name;
  const label = props.item.type;

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
          <div className="botanical-mark" aria-hidden="true">
            <Leaf />
            <i />
            <i />
          </div>
        )}
        <span>{isPlant ? <Leaf size={14} /> : <Building2 size={14} />}{label}</span>
      </Link>
      <div className="entity-card-content">
        <EditorialEyebrow>{props.kind === "plant" ? props.item.floweringPeriod ?? "Pflanzenart" : props.item.location ?? "Planungsbaustein"}</EditorialEyebrow>
        <h2><Link href={href}>{title}</Link></h2>
        {props.kind === "plant" && <p className="scientific">{props.item.scientificName}</p>}
        <p>{props.item.teaser}</p>
        <EditorialActionLink variant="text" href={href}>Details öffnen</EditorialActionLink>
      </div>
    </article>
  );
}
