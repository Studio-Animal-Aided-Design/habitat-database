import type { Metadata } from "next";
import { BrandMark } from "@/components/brand-mark";
import { ManagementNav } from "@/components/management-nav";

export const metadata: Metadata = {
  title: { default: "Verwaltung", template: "%s | AAD Verwaltung" },
  robots: { index: false, follow: false }
};

export default function ManagementLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="management">
      <aside className="management-sidebar">
        <div className="management-brand"><BrandMark /><strong>Verwaltung</strong></div>
        <ManagementNav />
      </aside>
      <section className="management-content">{children}</section>
    </main>
  );
}
