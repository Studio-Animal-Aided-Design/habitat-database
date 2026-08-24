import type { Metadata } from "next";
import { isPreviewEnvironment } from "@/lib/runtime-environment";
import "./globals.css";

const baseUrl = process.env.APP_BASE_URL ?? process.env.RENDER_EXTERNAL_URL ?? "https://habitat-database.example";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Animal-Aided Design Datenbank",
    template: "%s | Animal-Aided Design"
  },
  description:
    "Artenportraits, Pflanzen und Habitatelemente für eine tiergerechte Stadt- und Freiraumplanung.",
  openGraph: {
    type: "website",
    locale: "de_DE",
    siteName: "Animal-Aided Design Datenbank",
    title: "Planen für Artenvielfalt.",
    description: "Ökologisches Artenwissen wird zu konkretem Entwurfswissen.",
    images: [{ url: "/og.png", width: 1729, height: 910, alt: "Planen für Artenvielfalt – Studio Animal-Aided Design" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Planen für Artenvielfalt.",
    description: "Ökologisches Artenwissen wird zu konkretem Entwurfswissen.",
    images: ["/og.png"]
  },
  robots: isPreviewEnvironment ? { index: false, follow: false, noarchive: true } : undefined
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
