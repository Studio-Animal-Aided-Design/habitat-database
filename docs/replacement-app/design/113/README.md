# Corporate Identity × Editorial: lokaler Designentwurf

Stand: **13. November 2026**, Europe/Berlin. Umsetzung zu [#113](https://github.com/Studio-Animal-Aided-Design/habitat-database/issues/113).

Dies ist ein überprüfbarer lokaler Entwurf. Er ersetzt weder die Kundenfreigabe noch die Abnahme auf dem PostgreSQL-basierten IONOS-Release-Candidate.

- [Vergleichsgalerie öffnen](index.html): neun Vorher-/Nachher-Paare, Quellen und zusätzliche Prüfansichten.
- [Aufnahmeprotokoll](screenshots/capture-log.json): tatsächliche Breiten, Seitenhöhen, Schriftstatus und Bildladezustand.
- [Quellen- und Screenshot-Prüfsummen](manifest.json): unveränderter Ausgangsstand und identische Beispieldaten.
- Lokale App: `http://127.0.0.1:3114/`; lokale Galerie: `http://127.0.0.1:3115/`.

## Quellen und ihre Aussagekraft

### Gelieferte Corporate Identity

Der Nutzer hat den Ordner `Re_ Beauftragung M1` mit einem einseitigen Mini Corporate Design Manual, Stand Juni 2018, sowie den Unterordnern `Office` und `Web` bereitgestellt. Das Handbuch ist als [gerenderte Referenz](screenshots/reference/ci-manual.png) dokumentiert. Die Dateien wurden ausschließlich als Designreferenz behandelt.

Das Handbuch definiert:

- Grün: RGB 0 / 204 / 153, Web **#00CC99**, Pantone 3395 U.
- Schwarz: RGB 0 / 0 / 0, Web **#000000**.
- Grau: ein CMYK-Druckwert, ohne verbindlichen RGB-/Webwert.
- Bevorzugt das farbige Logo auf Weiß verwenden.
- Die graue Variante ist für Schwarzweißdruck vorgesehen.
- Schwarz ist für farbige Hintergründe, Weiß für dunkle Hintergründe vorgesehen.
- Bildmarke und Wort-Bild-Marke stehen jeweils in mehreren Formaten bereit.

**Keine verbindlichen Schriftfamilien, Schriftgrößen, Schutzraummaße, Raster, Abstände oder Radien sind darin angegeben.** Die entsprechenden Entscheidungen dieses Entwurfs sind deshalb gestalterische Ableitungen, keine erfundenen CI-Vorschriften.

Die originale RGB-Wort-Bild-Marke aus `Office` ist 1740 × 836 px groß; das weiße PNG aus `Web` ist 1740 × 856 px groß. Beide werden unverändert mit ihrem jeweiligen Seitenverhältnis verwendet. Das gelieferte farbige Web-PNG hat nur 200 × 96 px; für die weiße Kopfzeile wird deshalb die hochauflösende RGB-Datei bevorzugt. Keine Umfärbung, kein CSS-Invertieren, kein Nachzeichnen des Logos.

### Öffentliche Kundenwebsite

Besichtigt am 13.11.2026:

- [Startseite](https://animal-aided-design.de/), als vollständige Desktopaufnahme sowie als Desktop- und Mobil-Ausschnitt.
- [Methode](https://animal-aided-design.de/methode/), als Desktop- und Mobil-Ausschnitt.

Beobachtet wurden weißer Grund, schwarze Texte, grüne Trennlinien und Navigationsakzente, eine großzügig freigestellte farbige Wort-Bild-Marke sowie kräftige Serifentitel und kursive Hervorhebungen. Die Methodenseite nutzt lange, sachliche Texte und Abbildungen mit Quellenangaben. Das passt zur fachlichen Ausrichtung unserer Datenbank.

Die ausgelesenen CSS-Schriftfamilien sind **Lato** für Fließtext und **Eidetic Neo Black** für die Hauptnavigation. Das [Typografieprotokoll](screenshots/reference/customer-typography.json) enthält die beobachteten Werte. Die Herkunft einer Website-Schrift belegt keine Nutzungsrechte für eine zweite Website. Eidetic-Neo-Dateien oder eine Lizenz wurden im gelieferten Ordner nicht gefunden und nicht von der Website übernommen.

## Bewertung des bisherigen Designs

Der unveränderte Ausgangsstand ist Commit `45014714ef6b18babb05247ba3434a56f2955fa3` auf `main`. Die ursprünglichen lokalen Arbeitskopien wurden nicht für diese Umsetzung verändert; der Entwurf liegt in einer separaten Arbeitskopie auf `feat/113-studio-corporate-identity`.

Stärken, die erhalten bleiben:

- große Serifentitel, kursive wissenschaftliche Namen und eine klare redaktionelle Hierarchie;
- bildstarke Artenporträts und lesbare Kapitel statt einer Verwaltungsoberfläche;
- Lebenszyklusdarstellung, Quellen, Beziehungen und filterbare Planungsbausteine;
- gestaffelte Inhalte, responsive Umbrüche, native Aufklappbereiche und reduzierte Bewegung;
- die bestehenden Tier-, Blatt- und Habitatillustrationen als inhaltliche Bildwelt.

Abweichungen zur Kundenmarke:

- cremefarbener Grund, Waldgrün, Terrakotta und Gelbgrün bildeten eine eigenständige Farbwelt;
- das bisherige graue Logo war für den Webeinsatz nicht die im Handbuch bevorzugte Variante;
- sehr runde Karten, Schaltflächen und eine schwebende Kopfzeile wirkten weicher als die sachliche Studio-Website;
- Arial statt der auf der Kundenwebsite verwendeten Lato-Schrift;
- ein Verwaltungslink in der öffentlichen Hauptnavigation vermischte die beiden Produktflächen.

## Designentscheidungen und Umsetzung

| Bereich | Neuer Entwurf | Begründung |
| --- | --- | --- |
| Farbe | Weiß, fast schwarzes UI `#101412`, originales CI-Grün `#00CC99`, abgeleitetes dunkles Grün `#00694F` | Kundenmarke sichtbar machen; dunkles Grün für lesbare kleine Akzentschrift |
| Flächen | Weiß, dezente neutrale und grün getönte Flächen | Inhalt, Fotografie und Logo bleiben im Vordergrund |
| Überschriften | Georgia mit kräftigeren Haupttiteln, gezielter Kursivschrift und grüner Unterstreichung | Bestehenden Editorial-Stil mit der kräftigen Serifentypografie der Kundenwebsite verbinden |
| Text und Bedienung | Lokal gehostete Lato, 400 und 700, Latin und Latin Extended | Anschluss an die Kundenwebsite, inklusive Umlauten; keine externen Schriftanfragen im Browser |
| Logo | Original in Farbe auf weißer Kopfzeile; originales Weiß im dunklen Footer und in der Verwaltung | Varianten korrekt nach Hintergrund einsetzen |
| Raster | Inhaltsbreite maximal 1440 px; Außenränder 32 px, mobil 20 px | Großzügige, nachvollziehbare Ausrichtung |
| Abstand | 4-px-Grundskala, Abschnittsabstand 64–104 px, innere Gutters 24–72 px | Gemeinsamer Rhythmus statt einzelner Seitenlösungen |
| Form | Karten und große Flächen 8 px, zentrale Controls 6 px; Tags bleiben rund | Präzisere architektonische Anmutung; Tags behalten ihre eigene Bedeutung |
| Kopfzeile | 174 px breites Logo, mobil 132 px; feine grüne Linie, Serifennavigation | Klarer Studio-Absender bei kontrolliertem Platzbedarf |
| Hero | Bestehende freigestellte Illustrationen, weiße Flächen, skalierbare grüne Kreislinien | Redaktionelle Bildsprache erhalten, die frühere creme-/waldgrüne Rasterkulisse ablösen |
| Fußzeile | Dunkle Fläche, originale weiße Wort-Bild-Marke und grüne Trennlinie | Markenabschluss mit belastbarem Kontrast |
| Öffentliche Navigation | Arten, Pflanzen, Habitatelemente und externer Link zum Studio | Öffentlichen Lesezugang und Verwaltung getrennt halten |
| Lebenszyklus | Jahreszeiten- und Phasenfarben bleiben als semantische Datenfarben bestehen | Unterschiedliche fachliche Kategorien dürfen nicht durch ein einziges Markengrün ununterscheidbar werden |

Die Farb- und Schriftrollen liegen zentral in `src/app/globals.css`; Kopfzeile, Footer und Logovarianten sind gemeinsame Komponenten. Die gemeinsame Footer-Gestaltung ist jetzt auf `.public-footer` begrenzt, damit sie nicht in Quellen-Footer der Lebenszyklusdarstellung einwirkt. Vorschau-Login und Verwaltung verwenden ebenfalls die passenden Originalvarianten. Eine exakte Allowlist lässt die Logos und vier Schriftdateien vor dem Vorschau-Login laden; Inhaltsseiten und beliebige andere Dateien bleiben geschützt.

### Kontrastentscheidungen

Berechnet aus den verwendeten sRGB-Werten, gerundet:

| Kombination | Verhältnis | Verwendung |
| --- | ---: | --- |
| CI-Grün auf Weiß | 2,08 : 1 | Dekorative Linien und Flächen, keine kleine Textschrift |
| Dunkelgrün `#00694F` auf Weiß | 6,70 : 1 | Textakzente und Fokus |
| Fast Schwarz `#101412` auf CI-Grün | 8,93 : 1 | Beschriftete grüne Flächen |
| Sekundärtext `#505853` auf Weiß | 7,34 : 1 | Fließtext und ergänzende Informationen |

Dies sind geprüfte Farbpaarungen, keine pauschale WCAG-Zertifizierung der ganzen Anwendung.

## Screenshot-Protokoll

Die neun Vergleichspaare enthalten jeweils Startseite, Artenkatalog und Gimpel-Porträt bei:

- Desktop: 1440 × 1000 px;
- Tablet: 834 × 1112 px;
- Mobil: 390 × 844 px.

Die Vollseitenaufnahmen wurden erst nach sichtbarer Hauptüberschrift, geladenen Schriften und einem vollständigen Scroll-Durchgang erstellt. Das Aufnahmeprotokoll bestätigt für alle Vergleichsaufnahmen: Dokumentbreite entspricht der Viewportbreite, keine fehlenden Bilder, Seitenanfang bei 0. Vollseitenbilder können durch die reservierte Scrollbar 15 px schmaler sein als die angeforderte Browserbreite. Die Vollseitenaufnahme kann dadurch auch einen leicht abweichenden Textumbruch und eine andere Bitmap-Höhe erhalten; die tatsächlichen Bitmap-Maße stehen im Manifest. Die zusätzliche Startseitenaufnahme zeigt jeweils den ersten Viewport.

Zusätzliche Aufnahmen zeigen das geöffnete mobile Menü, einen mobilen Such-Leerzustand, Tastaturfokus in der Suche sowie die Pflanzen- und Habitatdetailseite. Die Quellenbilder halten Handbuch und Kundenwebsite getrennt vom Vorher-/Nachher-Vergleich fest. Kleine Bewegungsunterschiede zwischen Heroaufnahmen sind durch die vorhandene Animation möglich; die unveränderten Illustrationen bleiben erhalten.

**Datengrundlage:** Beide Seiten des Vergleichs nutzen ausdrücklich denselben Mock-Adapter. Dessen sichtbare Gesamtsummen und Beispieltexte sind kein Nachweis für die kanonischen PostgreSQL-Inhalte. Die Prüfsumme von `mock-data.ts` steht im Manifest. Die Kundenfreigabe erfolgt später zusätzlich mit dem freigegebenen Datenstand.

## Prüfung und verbleibende Freigabepunkte

Lokal geprüft: Lint, TypeScript, 71 Tests in 21 Dateien einschließlich zusätzlicher Vorschau-Gate-Regressionen, optimierter Next.js-Build, alle neun responsiven Referenzansichten, vollständig geladene Bilder, mobile Menübedienung, Such-Leerzustand, Tastaturfokus sowie Pflanzen-/Habitatdetailseiten. Die neuen Gate-Tests erhalten die bestehenden Prüfungen für Import-Endpunkte und unauthentifizierte Schreibzugriffe.

Noch offen, ohne implizite Freigabe:

1. Benannte freigabeberechtigte Person des Kunden und ausdrückliche Designentscheidung.
2. Entscheidung, ob Georgia als Editorial-Schrift bestehen bleibt oder eine separat lizenzierte Eidetic-Neo-Webschrift eingesetzt werden soll.
3. Eine gebündelte Kundenrückmeldung und anschließende Korrekturrunde.
4. Prüfung auf dem PostgreSQL-basierten IONOS-Release-Candidate mit freigegebenen Originaldaten, langen und spärlich befüllten Datensätzen.
5. Vollständige manuelle M1-UAT inklusive 200-%-Zoom, reduzierter Bewegung und vereinbarter Browser-/Assistenztechnik-Prüfungen. Lokale Stichproben sind keine ausgeführte Kunden-UAT.
6. Die vorhandene Social-Preview-Grafik `public/og.png` gehört noch zum früheren Illustrationsstand; ihre endgültige CI-Anpassung bleibt Teil der Freigaberunde.

Die Fälle [UAT-M1-018](../../acceptance/m1/UAT-M1-018.md) und [UAT-M1-023](../../acceptance/m1/UAT-M1-023.md) unterscheiden Testbeschreibung, lokale Evidenz und Kundenabnahme. #113 bleibt bis zur Kundenfreigabe offen.

## Lokal erneut starten

Aus dem Repository:

```sh
cd apps/web
CATALOG_DATA_SOURCE=mock npm run dev -- --hostname 127.0.0.1 --port 3114
```

Für die Galerie in einem zweiten Terminal, vom Repository aus:

```sh
python3 -m http.server 3115 --bind 127.0.0.1 --directory docs/replacement-app/design/113
```

Die Galerie lässt sich alternativ direkt als lokale HTML-Datei öffnen. Beide Server sind nur an die lokale Loopback-Adresse gebunden. Die ursprünglichen Arbeitskopien und ihre bestehenden Änderungen bleiben erhalten.

## Rechte und Assets

Die Kundenlogos wurden für diese Kundenanwendung geliefert; ihre Übernahme begründet keine allgemeine Weiterverwendungslizenz. Das Handbuch nennt Studio Sophie Jahnke als Designurheberin. Lato wird unverändert unter SIL OFL 1.1 mit der mitgelieferten Lizenzdatei ausgeliefert. Bestehende EU-/Projektlogos und Bildquellen bleiben unverändert. Siehe auch `apps/web/public/brand/README.md` und `apps/web/public/fonts/lato/OFL.txt`.
