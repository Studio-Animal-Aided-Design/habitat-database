"use client";

import { useEffect } from "react";
import { ChevronRight, Quote } from "lucide-react";
import type { SpeciesAttribute } from "@/lib/catalog/types";
import { EditorialSourceNote } from "./editorial-primitives";

type AttributeSubgroup = {
  id: string;
  name: string;
  attributes: SpeciesAttribute[];
};

export type AttributeCategory = {
  id: string;
  name: string;
  count: number;
  subgroups: AttributeSubgroup[];
};

function anchorSlug(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("de")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function groupSpeciesAttributes(attributes: SpeciesAttribute[]): AttributeCategory[] {
  const categories = new Map<string, { attributes: SpeciesAttribute[]; subgroups: Map<string, SpeciesAttribute[]> }>();

  for (const attribute of attributes) {
    const category = categories.get(attribute.category) ?? {
      attributes: [] as SpeciesAttribute[],
      subgroups: new Map<string, SpeciesAttribute[]>()
    };
    category.attributes.push(attribute);
    const subgroupName = attribute.subcategory || attribute.category;
    const subgroup = category.subgroups.get(subgroupName) ?? ([] as SpeciesAttribute[]);
    subgroup.push(attribute);
    category.subgroups.set(subgroupName, subgroup);
    categories.set(attribute.category, category);
  }

  return [...categories].map(([name, category]) => {
    const categoryId = `merkmale-${anchorSlug(name)}`;
    return {
      id: categoryId,
      name,
      count: category.attributes.length,
      subgroups: [...category.subgroups].map(([subgroupName, subgroupAttributes]) => ({
        id: `${categoryId}-${anchorSlug(subgroupName)}`,
        name: subgroupName,
        attributes: subgroupAttributes
      }))
    };
  });
}

export function SpeciesAttributeBrowser({ attributes }: { attributes: SpeciesAttribute[] }) {
  const categories = groupSpeciesAttributes(attributes);

  useEffect(() => {
    const links = [...document.querySelectorAll<HTMLAnchorElement>("[data-attribute-index-link]")];
    const sections = [...document.querySelectorAll<HTMLElement>("[data-attribute-category]")];
    if (!links.length || !sections.length || !("IntersectionObserver" in window)) return;

    const setCurrent = (id: string) => {
      links.forEach((link) => link.setAttribute("aria-current", link.hash === `#${id}` ? "location" : "false"));
    };
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0];
        if (visible?.target.id) setCurrent(visible.target.id);
      },
      { rootMargin: "-18% 0px -68% 0px", threshold: 0 }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  if (!categories.length) {
    return <p className="empty-note">Für dieses Artenportrait sind derzeit keine Merkmale veröffentlicht.</p>;
  }

  return (
    <div className="attribute-browser">
      <nav className="attribute-index" aria-label="Themenfilter für die Artenmerkmale">
        <p>Direkt zu</p>
        <ol>
          {categories.map((category, index) => (
            <li key={category.id}>
              <a
                href={`#${category.id}`}
                data-attribute-index-link
                aria-current={index === 0 ? "location" : "false"}
              >
                <span>{category.name}</span>
                <small>{category.count}</small>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="attribute-categories">
        {categories.map((category, categoryIndex) => (
          <section
            className="attribute-category"
            id={category.id}
            data-attribute-category
            aria-labelledby={`${category.id}-title`}
            key={category.id}
          >
            <header>
              <p>Merkmalsbereich</p>
              <h3 id={`${category.id}-title`}>{category.name}</h3>
              <span>{category.count} {category.count === 1 ? "Merkmal" : "Merkmale"}</span>
            </header>
            <div className="attribute-groups">
              {category.subgroups.map((subgroup, subgroupIndex) => (
                <details
                  className="attribute-group"
                  id={subgroup.id}
                  open={categoryIndex === 0 && subgroupIndex === 0}
                  key={subgroup.id}
                >
                  <summary>
                    <ChevronRight aria-hidden="true" />
                    <span>{subgroup.name}</span>
                    <small>{subgroup.attributes.length} {subgroup.attributes.length === 1 ? "Eintrag" : "Einträge"}</small>
                  </summary>
                  <div className="attribute-group-content">
                    {subgroup.attributes.map((attribute) => (
                      <article className="attribute-item" key={`${attribute.category}-${attribute.subcategory}-${attribute.label}`}>
                        <h4>{attribute.label}</h4>
                        <blockquote><Quote size={18} aria-hidden="true" /><span>{attribute.value}</span></blockquote>
                        {attribute.sources && <EditorialSourceNote sources={attribute.sources} compact />}
                      </article>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
