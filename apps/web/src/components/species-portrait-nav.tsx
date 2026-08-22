"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { ImageAsset } from "@/lib/catalog/types";

const portraitSections = [
  { id: "characteristics", label: "Kurzcharakteristik" },
  { id: "lifecycle", label: "Lebenszyklus" },
  { id: "planning", label: "Planungsbausteine" }
] as const;

export function selectActivePortraitSection(
  positions: Array<{ id: string; top: number }>,
  marker: number
) {
  let active = positions[0]?.id ?? portraitSections[0].id;
  for (const position of positions) {
    if (position.top > marker) break;
    active = position.id;
  }
  return active;
}

export function SpeciesPortraitNav({
  commonName,
  scientificName,
  image
}: {
  commonName: string;
  scientificName: string;
  image: ImageAsset;
}) {
  const sentinelRef = useRef<HTMLSpanElement>(null);
  const frameRef = useRef<number | null>(null);
  const [isStuck, setIsStuck] = useState(false);
  const [activeSection, setActiveSection] = useState<string>(portraitSections[0].id);

  useEffect(() => {
    const update = () => {
      frameRef.current = null;
      const sentinelTop = sentinelRef.current?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;
      setIsStuck(sentinelTop <= 12);

      const marker = Math.min(240, window.innerHeight * 0.32);
      const positions = portraitSections.flatMap(({ id }) => {
        const section = document.getElementById(id);
        return section ? [{ id, top: section.getBoundingClientRect().top }] : [];
      });
      setActiveSection(selectActivePortraitSection(positions, marker));
    };
    const scheduleUpdate = () => {
      if (frameRef.current === null) frameRef.current = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <>
      <span className="portrait-nav-sentinel" ref={sentinelRef} aria-hidden="true" />
      <nav className={`portrait-nav${isStuck ? " is-stuck" : ""}`} aria-label="Abschnitte des Artenportraits">
        <div className="portrait-nav-identity" aria-hidden={!isStuck}>
          <span className="portrait-nav-thumbnail">
            <Image src={image.url} alt="" width={42} height={42} sizes="42px" />
          </span>
          <span className="portrait-nav-names">
            <strong>{commonName}</strong>
            <i>{scientificName}</i>
          </span>
        </div>
        <div className="portrait-nav-links">
          {portraitSections.map((section) => (
            <a
              href={`#${section.id}`}
              aria-current={activeSection === section.id ? "location" : undefined}
              onClick={() => setActiveSection(section.id)}
              key={section.id}
            >
              {section.label}
            </a>
          ))}
        </div>
      </nav>
    </>
  );
}
