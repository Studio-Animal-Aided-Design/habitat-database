# Vollständige Datenabweichungen – 15. November 2026

Stand: tatsächlicher GUI-Import auf Port 3121, 30 CSV-Dateien. Relevante CSVs wurden gegen die im Import protokollierten SHA-256-Prüfsummen geprüft. Namen der Arten stammen aus der laufenden Datenbank. Es wurden keine fachlichen Werte geändert.

`∅` bedeutet leer. CSV-Zeilen bezeichnen die logischen Datensätze im Importbericht einschließlich Kopfzeile. Review-IDs dienen der gezielten Rückmeldung.

## Pflanzen: alle Ausgangswerte und Ergebnis

### P1: Fraxinus excelsior

Quelle: all_plants.csv, Zeilen 80 und 81.

| Attribut | Zeile 80 | Zeile 81 | Kanonisch |
|---|---|---|---|
| Wissenschaftlicher Name | Fraxinus excelsior | Fraxinus excelsior  ␠ | Fraxinus excelsior |
| Deutscher Name | Gemeine Esche | Gewöhnliche Esche | Gewöhnliche Esche |
| Quell-ID | 79 | 80 | Eigene UUID `f9832d03-6156-4d0d-83f4-929e48feb728`; beide Quell-IDs protokolliert |
| Typ | ∅ | Gehölz | Gehölz |
| Blütezeit | ∅ | Mai | Mai |
| Einheimisch | ∅ | ja | ja |
| Bedeutung für Fauna | ∅ | Pollenquelle für Honigbienen; Raupenfutterpflanze; Nist- und Schutzgehölz für Vögel; Früchte zum Teil Nahrung für Vögel;  ␠ | Pollenquelle für Honigbienen; Raupenfutterpflanze; Nist- und Schutzgehölz für Vögel; Früchte zum Teil Nahrung für Vögel; |

Auswahlregel: gleicher normalisierter wissenschaftlicher Name; vollständigere Zeile gewinnt, leere Felder werden ergänzt. Keine fachliche Validierung durch diese Auswahlregel.

### P2: Malus sp.

Quelle: all_plants.csv, Zeilen 120 und 121.

| Attribut | Zeile 120 | Zeile 121 | Kanonisch |
|---|---|---|---|
| Wissenschaftlicher Name | Malus sp. | Malus sp.  ␠ | Malus sp. |
| Deutscher Name | Apfel | Äpfel | Apfel |
| Quell-ID | 119 | 120 | Eigene UUID `57d405dc-299a-4d73-a3b2-4f471c73bdb7`; beide Quell-IDs protokolliert |
| Typ | Gehölz | ∅ | Gehölz |
| Blütezeit | ∅ | ∅ | ∅ |
| Einheimisch | ja | ∅ | ja |
| Bedeutung für Fauna | Pollen- und Nektarquelle für Honig- und Wildbienen, fruchtende Sorten Nahrungsquelle für Vögel und Kleinsäuger und Schmetterlinge | ∅ | Pollen- und Nektarquelle für Honig- und Wildbienen, fruchtende Sorten Nahrungsquelle für Vögel und Kleinsäuger und Schmetterlinge |

Auswahlregel: gleicher normalisierter wissenschaftlicher Name; vollständigere Zeile gewinnt, leere Felder werden ergänzt. Keine fachliche Validierung durch diese Auswahlregel.

### P3: Sorbus aria

Quelle: all_plants.csv, Zeilen 225 und 226.

| Attribut | Zeile 225 | Zeile 226 | Kanonisch |
|---|---|---|---|
| Wissenschaftlicher Name | Sorbus aria | Sorbus aria  ␠ | Sorbus aria |
| Deutscher Name | Echte Mehlbeere | Echte Mehrbeere | Echte Mehlbeere |
| Quell-ID | 224 | 225 | Eigene UUID `1b7e7315-6928-4122-ac9c-986e4622b6b1`; beide Quell-IDs protokolliert |
| Typ | Gehölz | ∅ | Gehölz |
| Blütezeit | Mai/Juni | ∅ | Mai/Juni |
| Einheimisch | ja | ∅ | ja |
| Bedeutung für Fauna | Pollen- und Nektarquelle für Honig- und Wildbienen und andere Insekten; Raupenfutterpflanze; Früchte Winternahrung für Vögel und Kleinsäuger | ∅ | Pollen- und Nektarquelle für Honig- und Wildbienen und andere Insekten; Raupenfutterpflanze; Früchte Winternahrung für Vögel und Kleinsäuger |

Auswahlregel: gleicher normalisierter wissenschaftlicher Name; vollständigere Zeile gewinnt, leere Felder werden ergänzt. Keine fachliche Validierung durch diese Auswahlregel.

## Doppelte Habitatbeziehungen

Alle fünf fachlichen Felder sind je Paar gleich; nur Quell-IDs unterscheiden sich. Je Paar bleibt eine Beziehung mit beiden Quellreferenzen.

| ID | CSV-Zeilen / Quell-IDs | Art | Habitat | Lebensphase | Zweck | Teil/Element |
|---|---|---|---|---|---|---|
| H1 | 38/52 · IDs 37/51 | Gartenrotschwanz (Phoenicurus phoenicurus) | Bäume | adult | Singwarte | Zweige |
| H2 | 88/95 · IDs 87/94 | Grauschnäpper (Muscicapa striata) | Dichte Sträucher | adult, juvenil | Schutzort | Blätter/Zweige |
| H3 | 104/111 · IDs 103/110 | Bärtige Sandbiene (Andrena barbilabris) | Extensive Dachbegrünung - PV-Dach | Larve | Nahrung | Pollen |
| H4 | 105/112 · IDs 104/111 | Bärtige Sandbiene (Andrena barbilabris) | Extensive Dachbegrünung - PV-Dach | adult | Nahrung | Nektar |
| H5 | 170/176 · IDs 169/175 | Grauschnäpper (Muscicapa striata) | Horizontales Totholz | adult | Jagdwarte | Totholz |
| H6 | 171/179 · IDs 170/178 | Gartenrotschwanz (Phoenicurus phoenicurus) | Horizontales Totholz | adult | Jagdwarte | Totholz |

## Alle 74 leeren Attributwerte

Alle aktuellen Werte sind `∅`. K = Kurzcharakteristik; B = Bedeutung für den Menschen; S = kritische Standortfaktoren nach Lebensphasen; W = weitere Informationen. Die Zeile bezieht sich auf `<wissenschaftlicher Artname>_attributes.csv`.

| ID | Art | Bereich/Kontext | Feld | CSV-Zeile |
|---|---|---|---|---|
| A01 | Bärtige Sandbiene | K · Lebenszyklus | Jungtiere | 12 |
| A02 | Bärtige Sandbiene | K · Einfluss des Klimawandels | Einfluss des Klimawandels | 22 |
| A03 | Bärtige Sandbiene | B · Wahrnehmung | Erhöhung des Naturerlebens | 24 |
| A04 | Bärtige Sandbiene | B · Nutzen und Konflikte | Nutzen | 25 |
| A05 | Bärtige Sandbiene | S · Balz und Paarung | Balz | 27 |
| A06 | Bärtige Sandbiene | S · Balz und Paarung | Paarung | 28 |
| A07 | Bärtige Sandbiene | S · Jungtiere | Habitatanforderungen | 31 |
| A08 | Bärtige Sandbiene | S · Jungtiere | Nahrung | 32 |
| A09 | Bärtige Sandbiene | S · Jungtiere | Fressfeinde/Gefährdungen | 33 |
| A10 | Bärtige Sandbiene | W · Verbreitung, Habitat und Raumansprüche | Habitat, Habitatbesonderheiten | 39 |
| A11 | Bärtige Sandbiene | W · Lebenszyklus | Jungtiere | 43 |
| A12 | Bärtige Sandbiene | W · Lebenszyklus | Adulte | 44 |
| A13 | Bärtige Sandbiene | W · Lebenszyklus | Überwinterung | 45 |
| A14 | Bärtige Sandbiene | W · Wechselwirkung mit dem Menschen | Wahrnehmung, Konflikte, frühere Beziehung | 48 |
| A15 | Spalten-Wollbiene | K · Lebenszyklus | Jungtiere | 13 |
| A16 | Spalten-Wollbiene | K · Lebenszyklus | Adulte | 14 |
| A17 | Spalten-Wollbiene | B · Nutzen und Konflikte | Nutzen | 26 |
| A18 | Spalten-Wollbiene | S · Balz und Paarung | Paarung | 29 |
| A19 | Spalten-Wollbiene | S · Jungtiere | Habitatanforderungen | 32 |
| A20 | Spalten-Wollbiene | S · Jungtiere | Nahrung | 33 |
| A21 | Spalten-Wollbiene | S · Jungtiere | Fressfeinde/Gefährdungen | 34 |
| A22 | Spalten-Wollbiene | S · Adulte | Habitatanforderungen | 35 |
| A23 | Spalten-Wollbiene | S · Adulte | Fressfeinde/Gefährdungen | 37 |
| A24 | Spalten-Wollbiene | W · Aussehen und Körperbau | Aussehen und Körperbau | 39 |
| A25 | Spalten-Wollbiene | W · Verbreitung, Habitat und Raumansprüche | Habitat, Habitatbesonderheiten | 40 |
| A26 | Spalten-Wollbiene | W · Lebenszyklus | Jungtiere | 44 |
| A27 | Spalten-Wollbiene | W · Lebenszyklus | Adulte | 45 |
| A28 | Spalten-Wollbiene | W · Lebenszyklus | Überwinterung | 46 |
| A29 | Spalten-Wollbiene | W · Gefährdung | Gefährdung | 47 |
| A30 | Spalten-Wollbiene | W · Wechselwirkung mit dem Menschen | Wahrnehmung, Konflikte, frühere Beziehung | 49 |
| A31 | Frühlings-Pelzbiene | K · Lebenszyklus | Jungtiere | 13 |
| A32 | Frühlings-Pelzbiene | K · Lebenszyklus | Überwinterung | 15 |
| A33 | Frühlings-Pelzbiene | K · Einfluss des Klimawandels | Einfluss des Klimawandels | 23 |
| A34 | Frühlings-Pelzbiene | S · Balz und Paarung | Paarung | 29 |
| A35 | Frühlings-Pelzbiene | S · Jungtiere | Habitatanforderungen | 32 |
| A36 | Frühlings-Pelzbiene | S · Jungtiere | Nahrung | 33 |
| A37 | Frühlings-Pelzbiene | S · Jungtiere | Fressfeinde/Gefährdungen | 34 |
| A38 | Frühlings-Pelzbiene | S · Adulte | Fressfeinde/Gefährdungen | 37 |
| A39 | Frühlings-Pelzbiene | W · Lebenszyklus | Jungtiere | 44 |
| A40 | Frühlings-Pelzbiene | W · Lebenszyklus | Überwinterung | 46 |
| A41 | Zauneidechse | S · Balz und Paarung | Paarung | 29 |
| A42 | Schwalbenschwanz | K · Einfluss des Klimawandels | Einfluss des Klimawandels | 23 |
| A43 | Schwalbenschwanz | W · Verbreitung, Habitat und Raumansprüche | Habitat, Habitatbesonderheiten | 40 |
| A44 | Haussperling | K · Einfluss des Klimawandels | Einfluss des Klimawandels | 23 |
| A45 | Haussperling | S · Balz und Paarung | Paarung | 29 |
| A46 | Haussperling | S · Jungtiere | Habitatanforderungen | 32 |
| A47 | Haussperling | W · Schutzmaßnahmen | Schutzmaßnahmen | 48 |
| A48 | Gartenrotschwanz | K · Gefährdung und rechtlicher Status | Gefährdung | 19 |
| A49 | Gartenrotschwanz | S · Balz und Paarung | Paarung | 29 |
| A50 | Gartenrotschwanz | S · Jungtiere | Nahrung | 33 |
| A51 | Gartenrotschwanz | W · Lebenszyklus | Jungtiere | 44 |
| A52 | Grünspecht | S · Jungtiere | Habitatanforderungen | 32 |
| A53 | Grünspecht | S · Jungtiere | Nahrung | 33 |
| A54 | Grünspecht | S · Jungtiere | Fressfeinde/Gefährdungen | 34 |
| A55 | Grünspecht | S · Adulte | Habitatanforderungen | 35 |
| A56 | Grünspecht | S · Adulte | Fressfeinde/Gefährdungen | 37 |
| A57 | Zwergfledermaus | S · Brut und Aufzucht | Brut | 30 |
| A58 | Idas-Bläuling | K · Einfluss des Klimawandels | Einfluss des Klimawandels | 23 |
| A59 | Idas-Bläuling | B · Wahrnehmung | Erhöhung des Naturerlebens | 25 |
| A60 | Idas-Bläuling | S · Balz und Paarung | Paarung | 29 |
| A61 | Idas-Bläuling | S · Brut und Aufzucht | Aufzucht | 31 |
| A62 | Idas-Bläuling | S · Adulte | Fressfeinde/Gefährdungen | 37 |
| A63 | Idas-Bläuling | W · Verbreitung, Habitat und Raumansprüche | Habitat, Habitatbesonderheiten | 40 |
| A64 | Idas-Bläuling | W · Lebenszyklus | Überwinterung | 46 |
| A65 | Idas-Bläuling | W · Gefährdung | Gefährdung | 47 |
| A66 | Idas-Bläuling | W · Schutzmaßnahmen | Schutzmaßnahmen | 48 |
| A67 | Idas-Bläuling | W · Wechselwirkung mit dem Menschen | Wahrnehmung, Konflikte, frühere Beziehung | 49 |
| A68 | Gimpel | W · Gefährdung | Gefährdung | 47 |
| A69 | Zweifarbfledermaus | B · Wahrnehmung | Erhöhung des Naturerlebens | 25 |
| A70 | Zweifarbfledermaus | S · Brut und Aufzucht | Brut | 30 |
| A71 | Zweifarbfledermaus | S · Jungtiere | Habitatanforderungen | 32 |
| A72 | Zweifarbfledermaus | S · Adulte | Habitatanforderungen | 35 |
| A73 | Zweifarbfledermaus | S · Adulte | Fressfeinde/Gefährdungen | 37 |
| A74 | Zweifarbfledermaus | W · Wechselwirkung mit dem Menschen | Wahrnehmung, Konflikte, frühere Beziehung | 49 |

## Alle 28 unvollständigen Medienangaben

Je Bild sind `image_alt` und `attribution` leer. Die Bild-URL ist jeweils vorhanden. Porträt und Lebenszyklus sind getrennte Datensätze; alle 28 Bilder sind unten enthalten. Quellzeile in `species-images.csv`.

| Art | Porträt | Lebenszyklus | Fehlende Felder je Bild |
|---|---|---|---|
| Haussperling (Passer domesticus) | M01, Z.2: [Bild](https://upload.wikimedia.org/wikipedia/commons/d/d9/House_sparrowII.jpg) | M15, Z.16: [Bild](https://animal-aided-design.de/wp-content/uploads/2024/11/Haussperling-1.png) | Alt-Text ∅; Attribution ∅ |
| Idas-Bläuling (Plebejus idas) | M02, Z.3: [Bild](https://upload.wikimedia.org/wikipedia/commons/b/b0/Idas-Bl%C3%A4uling_Plebeius_idas_M%C3%A4nnchen-M%C3%BCnchen-Garten-010.jpg) | M16, Z.17: [Bild](https://animal-aided-design.de/wp-content/uploads/2024/11/Idas_Blaeuling-1.png) | Alt-Text ∅; Attribution ∅ |
| Mauersegler (Apus apus) | M03, Z.4: [Bild](https://image.jimcdn.com/app/cms/image/transf/dimension=1070x1024:format=jpg/path/s74bb75b4aefea4ca/image/ie0b8b51f867b0273/version/1585740665/image.jpg) | M17, Z.18: [Bild](https://animal-aided-design.de/wp-content/uploads/2024/11/Mauersegler-1.png) | Alt-Text ∅; Attribution ∅ |
| Schwalbenschwanz (Papilio machaon) | M04, Z.5: [Bild](https://upload.wikimedia.org/wikipedia/commons/d/d5/Schwalbenschwanz_Papilio_Machaon_%28217453115%29.jpeg) | M18, Z.19: [Bild](https://animal-aided-design.de/wp-content/uploads/2024/11/Schwalbenschwanz-1.png) | Alt-Text ∅; Attribution ∅ |
| Spalten-Wollbiene (Anthidium oblongatum) | M05, Z.6: [Bild](https://upload.wikimedia.org/wikipedia/commons/a/a6/Anthidium_oblongatum%2C_Gynandromorph%2C_Side%2C_PA%2C_Adams_County_2014-11-24-15.42.27_ZS_PMax_%2815685252898%29.jpg) | M19, Z.20: [Bild](https://animal-aided-design.de/wp-content/uploads/2024/11/Spaltenwollbiene-1.png) | Alt-Text ∅; Attribution ∅ |
| Zauneidechse (Lacerta agilis) | M06, Z.7: [Bild](https://upload.wikimedia.org/wikipedia/commons/3/32/M_Zauneidechse1_Edit1.jpg) | M20, Z.21: [Bild](https://animal-aided-design.de/wp-content/uploads/2024/11/Zauneidechse-1.png) | Alt-Text ∅; Attribution ∅ |
| Zweifarbfledermaus (Vespertilio murinus) | M07, Z.8: [Bild](https://upload.wikimedia.org/wikipedia/commons/2/22/Vespertilio_murinus_2.jpg) | M21, Z.22: [Bild](https://animal-aided-design.de/wp-content/uploads/2024/11/Zweifarbfledermaus-1.png) | Alt-Text ∅; Attribution ∅ |
| Zwergfledermaus (Pipistrellus pipistrellus) | M08, Z.9: [Bild](https://upload.wikimedia.org/wikipedia/commons/d/dc/Pipistrellus_pipistrellus01.jpg) | M22, Z.23: [Bild](https://animal-aided-design.de/wp-content/uploads/2024/11/Zwergfledermaus-1.png) | Alt-Text ∅; Attribution ∅ |
| Grauschnäpper (Muscicapa striata) | M09, Z.10: [Bild](https://upload.wikimedia.org/wikipedia/commons/8/8c/Muscicapa_striata_%D0%BC%D1%83%D1%85%D0%BE%D0%BB%D0%BE%D0%B2%D0%BA%D0%B0_%D1%81%D1%96%D1%80%D0%B0.jpg) | M23, Z.24: [Bild](https://animal-aided-design.de/wp-content/uploads/2024/11/Grauschnaepper-1.png) | Alt-Text ∅; Attribution ∅ |
| Bärtige Sandbiene (Andrena barbilabris) | M10, Z.11: [Bild](https://upload.wikimedia.org/wikipedia/commons/8/82/Andrena_%28Leucandrena%29_barbilabris_%28male%29_-_Flickr_-_S._Rae.jpg) | M24, Z.25: [Bild](https://animal-aided-design.de/wp-content/uploads/2024/11/Baertige-Sandbiene-1.png) | Alt-Text ∅; Attribution ∅ |
| Frühlings-Pelzbiene (Anthophora plumipes) | M11, Z.12: [Bild](https://upload.wikimedia.org/wikipedia/commons/e/e3/Anthophora_plumipes_male.jpg) | M25, Z.26: [Bild](https://animal-aided-design.de/wp-content/uploads/2024/11/Fruehlingspelzbiene-1.png) | Alt-Text ∅; Attribution ∅ |
| Gartenrotschwanz (Phoenicurus phoenicurus) | M12, Z.13: [Bild](https://upload.wikimedia.org/wikipedia/commons/c/cd/Phoenicurus_phoenicurus_08%28js%29%2C_Lodz_%28Poland%29.jpg) | M26, Z.27: [Bild](https://animal-aided-design.de/wp-content/uploads/2024/11/Gartenrotschwanz-1.png) | Alt-Text ∅; Attribution ∅ |
| Gimpel (Pyrrhula pyrrhula) | M13, Z.14: [Bild](https://upload.wikimedia.org/wikipedia/commons/0/02/Pyrrhula_Pyrrhula_Kittila_20120305.JPG) | M27, Z.28: [Bild](https://animal-aided-design.de/wp-content/uploads/2024/11/Gimpel-1.png) | Alt-Text ∅; Attribution ∅ |
| Grünspecht (Picus viridis) | M14, Z.15: [Bild](https://upload.wikimedia.org/wikipedia/commons/c/c5/European_green_woodpecker_%28Picus_viridis%29_female_Barnes.jpg) | M28, Z.29: [Bild](https://animal-aided-design.de/wp-content/uploads/2024/11/Gruenspecht-1.png) | Alt-Text ∅; Attribution ∅ |

## Fehlende Bild-URL

| ID | Habitat | Quellzeile | URL | Alt-Text | Attribution | Typ |
|---|---|---|---|---|---|---|
| U1 | Magerrasen mit Ameisenvorkommen | habitat_element_images.csv:6, ID 5 | ∅ | Magerrasen mit Ameisenvorkommen | Studio Animal-Aided Design | portrait |

## Zusätzlich vollständig fehlende Attributzeile

Diese Lücke ist nicht in den 74 vorhandenen, aber leeren Werten enthalten und wurde nicht als eine der 118 Importdiagnosen gemeldet. Die Definitionsliste umfasst 49 Felder; für 14 Arten sind 685 statt 686 Wertereihen vorhanden. Ob das Feld fachlich benötigt wird, bleibt zu entscheiden.

| ID | Art | Bereich/Kontext | Feld | Zustand |
|---|---|---|---|---|
| A75 | Bärtige Sandbiene (Andrena barbilabris) | K · Verbreitungskarte | Verbreitung | Ganze Zeile fehlt in Andrena barbilabris_attributes.csv; Slug kurzcharakteristik_verbreitungskarte_verbreitung |

## Bildabrufe während der Designprüfung

Vorhandene Wikimedia-URLs lieferten am 15.11.2026 bei mehreren Bildabrufen HTTP 429. Dies ist eine Laufzeit-/Verfügbarkeitsbeobachtung, keine fehlende CSV-URL. Die Aufnahmen und Prüflisten unter Design #152 dokumentieren die betroffenen Ansichten. Vor Medienfreigabe Verfügbarkeit, Quelle, Urheber und Lizenz prüfen; es wurde kein Ersatzbild gewählt.

## Entscheidungen

P1–P3: Zusammenführung und gewählte Namen bestätigen/korrigieren. H1–H6: fachliche Dubletten bestätigen. A01–A75: Wert bzw. fehlende Zeile nachliefern oder unbekannt/nicht anwendbar ausdrücklich festhalten. M01–M28: Alt-Text sowie Urheber-/Quellen-/Lizenzangaben nachliefern oder zulässige Auslassung bestätigen. U1: Bild-URL nachliefern oder Darstellung ohne Bild bestätigen. Noch keine Freigabe erteilt.
