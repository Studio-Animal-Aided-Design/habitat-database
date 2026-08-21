"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, BarChart3, Bird, Database, Leaf, Settings2 } from "lucide-react";

const items = [
  { href: "/management", label: "Übersicht", icon: BarChart3 },
  { href: "/management/species", label: "Arten", icon: Bird },
  { href: "/management/plants", label: "Pflanzen", icon: Leaf },
  { href: "/management/habitat-elements", label: "Habitatelemente", icon: Database },
  { href: "/management/settings", label: "Einstellungen", icon: Settings2 }
];

export function ManagementNav() {
  const pathname = usePathname();

  return (
    <>
      <nav aria-label="Verwaltungsnavigation">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/management" ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} className={active ? "active" : undefined} href={href} aria-current={active ? "page" : undefined}>
              <Icon /> {label}
            </Link>
          );
        })}
      </nav>
      <Link href="/"><ArrowLeft /> Öffentliche Website</Link>
    </>
  );
}
