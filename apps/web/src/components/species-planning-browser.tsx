"use client";

import Link from "next/link";
import { Bird, ChevronRight, RotateCcw, Search, Sprout } from "lucide-react";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { RelatedHabitat, RelatedPlant } from "@/lib/catalog/types";

const INITIAL_VISIBLE_ITEMS = 6;
const REVEAL_STEP = 12;

export type PlanningEntityType = "all" | "plant" | "habitat";
export type PlanningLifecycleStage = "all" | "adult" | "juvenil";
export type PlanningFunctionId = "food" | "shelter" | "nesting" | "sleeping" | "other";

export type PlanningItem = {
  id: string;
  entityType: Exclude<PlanningEntityType, "all">;
  slug: string;
  name: string;
  scientificName?: string;
  purpose: string;
  purposeElement?: string;
  lifecycleStage?: string;
  functionIds: PlanningFunctionId[];
};

export type PlanningGroup = {
  id: PlanningFunctionId;
  name: string;
  description: string;
  items: PlanningItem[];
};

const planningFunctions: Array<Omit<PlanningGroup, "items">> = [
  { id: "food", name: "Nahrung", description: "Futterquellen und nahrungsrelevante Strukturen" },
  { id: "shelter", name: "Schutz und Rückzug", description: "Deckung, Schutzgehölze und Rückzugsräume" },
  { id: "nesting", name: "Brut und Nisten", description: "Brutplätze, Nistgehölze und Aufzuchtstrukturen" },
  { id: "sleeping", name: "Schlafplatz", description: "Geschützte Ruhe- und Schlafplätze" },
  { id: "other", name: "Weitere Funktionen", description: "Noch nicht kanonisch zugeordnete Beziehungen" }
];

export function planningFunctionIds(purpose: string): PlanningFunctionId[] {
  const normalized = purpose.toLocaleLowerCase("de");
  const ids: PlanningFunctionId[] = [];
  if (/nahrung|futter/.test(normalized)) ids.push("food");
  if (/schutz|rückzug|deckung/.test(normalized)) ids.push("shelter");
  if (/brut|nist/.test(normalized)) ids.push("nesting");
  if (/schlaf/.test(normalized)) ids.push("sleeping");
  return ids.length ? ids : ["other"];
}

export function buildPlanningItems(plants: RelatedPlant[], habitats: RelatedHabitat[]): PlanningItem[] {
  return [
    ...plants.map((plant, index): PlanningItem => ({
      id: `plant-${index}-${plant.slug}-${plant.purpose}`,
      entityType: "plant",
      slug: plant.slug,
      name: plant.commonName,
      scientificName: plant.scientificName,
      purpose: plant.purpose,
      functionIds: planningFunctionIds(plant.purpose)
    })),
    ...habitats.map((habitat, index): PlanningItem => ({
      id: `habitat-${index}-${habitat.slug}-${habitat.purpose}-${habitat.lifecycleStage}`,
      entityType: "habitat",
      slug: habitat.slug,
      name: habitat.name,
      purpose: habitat.purpose,
      purposeElement: habitat.purposeElement,
      lifecycleStage: habitat.lifecycleStage,
      functionIds: planningFunctionIds(habitat.purpose)
    }))
  ];
}

export function filterPlanningItems(
  items: PlanningItem[],
  query: string,
  entityType: PlanningEntityType,
  lifecycleStage: PlanningLifecycleStage
) {
  const normalizedQuery = query.trim().toLocaleLowerCase("de");
  return items.filter((item) => {
    if (entityType !== "all" && item.entityType !== entityType) return false;
    if (lifecycleStage !== "all") {
      if (item.entityType !== "habitat") return false;
      const stages = item.lifecycleStage?.toLocaleLowerCase("de") ?? "";
      if (!stages.includes(lifecycleStage)) return false;
    }
    if (!normalizedQuery) return true;
    return [item.name, item.scientificName, item.purpose, item.purposeElement, item.lifecycleStage]
      .filter(Boolean)
      .some((value) => value?.toLocaleLowerCase("de").includes(normalizedQuery));
  });
}

export function groupPlanningItems(items: PlanningItem[]): PlanningGroup[] {
  return planningFunctions
    .map((group) => ({ ...group, items: items.filter((item) => item.functionIds.includes(group.id)) }))
    .filter((group) => group.items.length > 0);
}

function FilterButton({
  active,
  children,
  onClick
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}>
      {children}
    </button>
  );
}

export function SpeciesPlanningBrowser({
  plants,
  habitats
}: {
  plants: RelatedPlant[];
  habitats: RelatedHabitat[];
}) {
  const allItems = useMemo(() => buildPlanningItems(plants, habitats), [plants, habitats]);
  const [query, setQuery] = useState("");
  const [entityType, setEntityType] = useState<PlanningEntityType>("all");
  const [lifecycleStage, setLifecycleStage] = useState<PlanningLifecycleStage>("all");
  const [visibleByGroup, setVisibleByGroup] = useState<Record<string, number>>({});
  const filteredItems = useMemo(
    () => filterPlanningItems(allItems, query, entityType, lifecycleStage),
    [allItems, query, entityType, lifecycleStage]
  );
  const groups = useMemo(() => groupPlanningItems(filteredItems), [filteredItems]);
  const filtersActive = Boolean(query || entityType !== "all" || lifecycleStage !== "all");

  if (!allItems.length) {
    return <p className="empty-note">Für dieses Artenportrait sind derzeit keine Planungsbausteine veröffentlicht.</p>;
  }

  const resetFilters = () => {
    setQuery("");
    setEntityType("all");
    setLifecycleStage("all");
  };

  return (
    <div className="planning-browser">
      <div className="planning-browser-toolbar">
        <label className="planning-search">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">Planungsbaustein suchen</span>
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setVisibleByGroup({});
            }}
            placeholder="Name oder Funktion suchen"
          />
        </label>

        <div className="planning-filter-group planning-filter-type" aria-label="Entitätstyp filtern">
          <FilterButton active={entityType === "all"} onClick={() => { setEntityType("all"); setVisibleByGroup({}); }}>Alle Typen</FilterButton>
          <FilterButton active={entityType === "plant"} onClick={() => { setEntityType("plant"); setVisibleByGroup({}); }}>Pflanzen</FilterButton>
          <FilterButton active={entityType === "habitat"} onClick={() => { setEntityType("habitat"); setVisibleByGroup({}); }}>Habitatelemente</FilterButton>
        </div>

        <div className="planning-filter-group planning-filter-stage" aria-label="Lebensphase filtern">
          <FilterButton active={lifecycleStage === "all"} onClick={() => { setLifecycleStage("all"); setVisibleByGroup({}); }}>Alle Phasen</FilterButton>
          <FilterButton active={lifecycleStage === "adult"} onClick={() => { setLifecycleStage("adult"); setVisibleByGroup({}); }}>adult</FilterButton>
          <FilterButton active={lifecycleStage === "juvenil"} onClick={() => { setLifecycleStage("juvenil"); setVisibleByGroup({}); }}>juvenil</FilterButton>
        </div>

        <div className="planning-result-summary" aria-live="polite">
          <strong>{filteredItems.length}</strong> {filteredItems.length === 1 ? "Beziehung" : "Beziehungen"}
          {filtersActive && (
            <button type="button" onClick={resetFilters}>
              <RotateCcw size={14} aria-hidden="true" /> Filter zurücksetzen
            </button>
          )}
        </div>
      </div>

      {groups.length ? (
        <div className="planning-function-groups">
          {groups.map((group, groupIndex) => {
            const visibleCount = visibleByGroup[group.id] ?? INITIAL_VISIBLE_ITEMS;
            const remaining = Math.max(0, group.items.length - visibleCount);
            return (
              <details className="planning-function-group" open={groupIndex === 0} key={group.id}>
                <summary>
                  <ChevronRight aria-hidden="true" />
                  <span>
                    <strong>{group.name}</strong>
                    <small>{group.description}</small>
                  </span>
                  <em>{group.items.length} {group.items.length === 1 ? "Beziehung" : "Beziehungen"}</em>
                </summary>
                <div className="planning-function-content">
                  <div className="planning-relation-grid">
                    {group.items.map((item, index) => (
                      <Link
                        className="planning-relation"
                        href={item.entityType === "plant" ? `/plants/${item.slug}` : `/habitat-elements/${item.slug}`}
                        hidden={index >= visibleCount}
                        key={`${group.id}-${item.id}`}
                      >
                        {item.entityType === "plant" ? <Sprout aria-hidden="true" /> : <Bird aria-hidden="true" />}
                        <span>
                          <strong>{item.name}</strong>
                          <i>{item.scientificName || item.lifecycleStage || "Habitatelement"}</i>
                        </span>
                        <small>
                          {item.purposeElement && <em>{item.purposeElement}</em>}
                          {item.purpose}
                        </small>
                      </Link>
                    ))}
                  </div>
                  {remaining > 0 && (
                    <button
                      className="planning-reveal"
                      type="button"
                      onClick={() => setVisibleByGroup((current) => ({
                        ...current,
                        [group.id]: visibleCount + REVEAL_STEP
                      }))}
                    >
                      Weitere {remaining} anzeigen
                    </button>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      ) : (
        <div className="planning-empty" aria-live="polite">
          <p>Für diese Filterkombination wurden keine Planungsbausteine gefunden.</p>
          <button type="button" onClick={resetFilters}>Alle Filter zurücksetzen</button>
        </div>
      )}
    </div>
  );
}
