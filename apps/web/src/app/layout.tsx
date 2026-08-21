import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://habitat-database.example"),
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
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
