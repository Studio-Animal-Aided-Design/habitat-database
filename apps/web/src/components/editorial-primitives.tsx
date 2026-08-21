import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

function classes(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function EditorialEyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={classes("editorial-eyebrow", className)}>{children}</p>;
}

export function EditorialActionLink({
  href,
  children,
  variant = "outline",
  className
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "outline" | "text";
  className?: string;
}) {
  return (
    <Link className={classes("editorial-action", `editorial-action-${variant}`, className)} href={href}>
      <span>{children}</span>
      <ArrowRight aria-hidden="true" size={17} />
    </Link>
  );
}

export function EditorialSectionHeading({
  eyebrow,
  title,
  titleId,
  lede,
  action,
  className
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  titleId?: string;
  lede?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={classes("editorial-section-heading", className)}>
      <div>
        <EditorialEyebrow>{eyebrow}</EditorialEyebrow>
        <h2 id={titleId}>{title}</h2>
        {lede && <p className="editorial-lede">{lede}</p>}
      </div>
      {action && <div className="editorial-section-action">{action}</div>}
    </header>
  );
}

export function EditorialEmptyState({
  title,
  children,
  action,
  className
}: {
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={classes("editorial-empty-state", className)} aria-live="polite">
      <EditorialEyebrow>Keine Treffer</EditorialEyebrow>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action && <div className="editorial-empty-action">{action}</div>}
    </section>
  );
}

export function EditorialSourceNote({ sources, compact = false }: { sources: ReactNode; compact?: boolean }) {
  return (
    <aside className={classes("editorial-source-note", compact ? "editorial-source-note-compact" : undefined)} aria-label="Quellen">
      <EditorialEyebrow>Quellen</EditorialEyebrow>
      <p>{sources}</p>
    </aside>
  );
}

export function EditorialFactList({
  items,
  className
}: {
  items: Array<{ label: ReactNode; value: ReactNode }>;
  className?: string;
}) {
  return (
    <dl className={classes("editorial-fact-list", className)}>
      {items.map((item) => (
        <div key={String(item.label)}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
