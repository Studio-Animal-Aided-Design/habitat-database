import type { HabitatDetail, PlantDetail, SpeciesDetail } from "./types";

export const mockSpecies: SpeciesDetail[] = [
  {
    slug: "gimpel",
    commonName: "Gimpel",
    alternativeName: "Dompfaff",
    scientificName: "Pyrrhula pyrrhula",
    className: "Vögel",
    familyName: "Finken",
    teaser:
      "Ein kompakter Fink, der dichte Gehölze, samenreiche Stauden und geschützte Brutplätze in enger Nachbarschaft braucht.",
    image: {
      url: "https://upload.wikimedia.org/wikipedia/commons/0/02/Pyrrhula_Pyrrhula_Kittila_20120305.JPG",
      alt: "Gimpel im Schnee",
      attribution: "Estormiz, CC0, via Wikimedia Commons",
      type: "portrait"
    },
    lifecycleImage: {
      url: "https://animal-aided-design.de/wp-content/uploads/2024/11/Gimpel-1.png",
      alt: "Lebenszyklus des Gimpels im Jahresverlauf",
      attribution: "Studio Animal-Aided Design",
      type: "lifecycle"
    },
    status: "published",
    taxonomy: {
      classCommon: "Vögel",
      classScientific: "Aves",
      orderCommon: "Sperlingsvögel",
      orderScientific: "Passeriformes",
      familyCommon: "Finken",
      familyScientific: "Fringillidae",
      genusScientific: "Pyrrhula"
    },
    attributes: [
      {
        category: "Kurzcharakteristik",
        label: "Aussehen",
        value:
          "Männchen tragen eine leuchtend rote Unterseite und schwarze Kopfplatte. Weibchen sind dezenter graubraun gefärbt.",
        sources: "Glutz von Blotzheim (1998); Schäffer (2012)"
      },
      {
        category: "Bedeutung für den Menschen",
        label: "Beobachtbarkeit",
        value:
          "Der ruhige Ruf und die markante Silhouette machen den Gimpel zu einer gut erkennbaren Zielart in strukturreichen Freiräumen."
      },
      {
        category: "Kritische Standortfaktoren",
        label: "Brut und Aufzucht",
        value:
          "Dichte, ausreichend hohe Hecken und Nadelgehölze bieten geschützte Neststandorte. Eine zu starke Auslichtung ist zu vermeiden.",
        sources: "Bauer, Bezzel & Fiedler (2012); Glutz von Blotzheim (1998)"
      }
    ],
    plants: [
      { slug: "acer-campestre", scientificName: "Acer campestre", commonName: "Feld-Ahorn", purpose: "Nahrung und Schutz" },
      { slug: "betula-pendula", scientificName: "Betula pendula", commonName: "Hänge-Birke", purpose: "Knospen und Samen" },
      { slug: "cornus-mas", scientificName: "Cornus mas", commonName: "Kornelkirsche", purpose: "Nahrung und Nistgehölz" }
    ],
    habitats: [
      {
        slug: "wild-hecken",
        name: "Wildhecken",
        purpose: "Brutplatz",
        purposeElement: "Dichte Zweige",
        lifecycleStage: "Adult"
      },
      {
        slug: "altgrasstreifen",
        name: "Altgrasstreifen",
        purpose: "Nahrung",
        purposeElement: "Samen und Insekten",
        lifecycleStage: "Adult, juvenil"
      }
    ]
  },
  {
    slug: "gruenspecht",
    commonName: "Grünspecht",
    scientificName: "Picus viridis",
    className: "Vögel",
    familyName: "Spechte",
    teaser:
      "Offene, ameisenreiche Flächen und alte Bäume bilden gemeinsam sein städtisches Lebensraumsystem.",
    image: {
      url: "https://upload.wikimedia.org/wikipedia/commons/c/c5/European_green_woodpecker_%28Picus_viridis%29_female_Barnes.jpg",
      alt: "Grünspecht an einem Baumstamm",
      attribution: "Charles J. Sharp, CC BY-SA 4.0, via Wikimedia Commons",
      type: "portrait"
    },
    lifecycleImage: {
      url: "https://animal-aided-design.de/wp-content/uploads/2024/11/Gruenspecht-1.png",
      alt: "Lebenszyklus des Grünspechts",
      attribution: "Studio Animal-Aided Design",
      type: "lifecycle"
    },
    status: "published",
    taxonomy: {
      classCommon: "Vögel",
      classScientific: "Aves",
      orderCommon: "Spechtvögel",
      orderScientific: "Piciformes",
      familyCommon: "Spechte",
      familyScientific: "Picidae",
      genusScientific: "Picus"
    },
    attributes: [],
    plants: [],
    habitats: []
  },
  {
    slug: "mauersegler",
    commonName: "Mauersegler",
    scientificName: "Apus apus",
    className: "Vögel",
    familyName: "Segler",
    teaser:
      "Gebäudebrüter und Langstreckenflieger: Nischen am Bauwerk und ein insektenreicher Luftraum müssen zusammen gedacht werden.",
    image: {
      url: "https://image.jimcdn.com/app/cms/image/transf/dimension=1070x1024:format=jpg/path/s74bb75b4aefea4ca/image/ie0b8b51f867b0273/version/1585740665/image.jpg",
      alt: "Mauersegler im Flug",
      attribution: "Mike Pennington, CC BY-SA 2.0, via Wikimedia Commons",
      type: "portrait"
    },
    lifecycleImage: {
      url: "https://animal-aided-design.de/wp-content/uploads/2024/11/Mauersegler-1.png",
      alt: "Lebenszyklus des Mauerseglers",
      attribution: "Studio Animal-Aided Design",
      type: "lifecycle"
    },
    status: "published",
    taxonomy: {
      classCommon: "Vögel",
      classScientific: "Aves",
      orderCommon: "Seglervögel",
      orderScientific: "Apodiformes",
      familyCommon: "Segler",
      familyScientific: "Apodidae",
      genusScientific: "Apus"
    },
    attributes: [],
    plants: [],
    habitats: []
  }
];

export const mockPlants: PlantDetail[] = [
  {
    slug: "acer-campestre",
    scientificName: "Acer campestre",
    commonName: "Feld-Ahorn",
    alternativeName: "Maßholder",
    type: "Gehölz",
    floweringPeriod: "Mai–Juni",
    native: true,
    ecologicalValue: "Pollen- und Nektarquelle; Knospen und Samen dienen heimischen Tieren als Nahrung.",
    teaser: "Ein robuster heimischer Kleinbaum für strukturreiche Säume, Hecken und klimaangepasste Freiräume.",
    status: "published",
    siteConditions: ["sonnig bis halbschattig", "trocken bis frisch", "stadtklimaverträglich"],
    planningNotes:
      "Als frei wachsender Kleinbaum, mehrstämmiges Gehölz oder Bestandteil einer Wildhecke einsetzbar. Blüten, Früchte und dichte Verzweigung verbinden Nahrungs- und Schutzfunktionen.",
    sources: ["Pflanzenliste Studio Animal-Aided Design", "FloraWeb"],
    relatedSpecies: [
      { slug: "gimpel", commonName: "Gimpel", scientificName: "Pyrrhula pyrrhula", purpose: "Nahrung und Schutz" },
      { slug: "gruenspecht", commonName: "Grünspecht", scientificName: "Picus viridis", purpose: "Struktur und Nahrung" }
    ]
  },
  {
    slug: "betula-pendula",
    scientificName: "Betula pendula",
    commonName: "Hänge-Birke",
    type: "Gehölz",
    floweringPeriod: "April–Mai",
    native: true,
    ecologicalValue: "Kätzchen, Samen und eine große Zahl pflanzenfressender Insekten schaffen ein breites Nahrungsangebot.",
    teaser: "Ein lichtes Pioniergehölz, das schnell räumliche Struktur und vielfältige Nahrungsangebote entwickelt.",
    status: "published",
    siteConditions: ["sonnig", "trocken bis frisch", "durchlässige Böden"],
    planningNotes:
      "In lockeren Gruppen oder als Solitär einsetzen. Frühe Sukzessionsqualitäten können gezielt mit offenen Bodenstellen und extensiver Wiese kombiniert werden.",
    sources: ["Pflanzenliste Studio Animal-Aided Design"],
    relatedSpecies: [
      { slug: "gimpel", commonName: "Gimpel", scientificName: "Pyrrhula pyrrhula", purpose: "Knospen und Samen" }
    ]
  },
  {
    slug: "cornus-mas",
    scientificName: "Cornus mas",
    commonName: "Kornelkirsche",
    type: "Gehölz",
    floweringPeriod: "Februar–April",
    native: true,
    ecologicalValue: "Sehr frühe Pollen- und Nektarquelle; die Früchte werden von Vögeln und Kleinsäugern genutzt.",
    teaser: "Früh blühendes, schnittverträgliches Gehölz für Nahrungsangebote und geschützte Heckenstrukturen.",
    status: "published",
    siteConditions: ["sonnig bis halbschattig", "warm", "kalkverträglich"],
    planningNotes:
      "Als Solitär oder in Wildhecken verwenden. Für eine hohe ökologische Wirkung möglichst frei wachsen lassen und Fruchtansatz erhalten.",
    sources: ["Pflanzenliste Studio Animal-Aided Design"],
    relatedSpecies: [
      { slug: "gimpel", commonName: "Gimpel", scientificName: "Pyrrhula pyrrhula", purpose: "Nahrung und Nistgehölz" }
    ]
  },
  {
    slug: "alliaria-petiolata",
    scientificName: "Alliaria petiolata",
    commonName: "Knoblauchsrauke",
    type: "Staude",
    floweringPeriod: "April–Juni",
    native: true,
    ecologicalValue: "Nektarpflanze und wichtige Raupenfutterpflanze für mehrere heimische Schmetterlinge.",
    teaser: "Eine zweijährige Saumart für lichte Gehölzränder und halbschattige, nährstoffreiche Standorte.",
    status: "published",
    siteConditions: ["halbschattig", "frisch", "nährstoffreich"],
    planningNotes:
      "In Krautsäumen und unter lockeren Gehölzen durch Selbstaussaat etablieren lassen. Abschnittsweise Pflege erhält kontinuierliche Bestände.",
    sources: ["Pflanzenliste Studio Animal-Aided Design"],
    relatedSpecies: []
  },
  {
    slug: "artemisia-vulgaris",
    scientificName: "Artemisia vulgaris",
    commonName: "Gewöhnlicher Beifuß",
    type: "Staude",
    floweringPeriod: "Juli–September",
    native: true,
    ecologicalValue: "Samenstände bleiben im Winter als Nahrung und Deckung für Vögel und Insekten wirksam.",
    teaser: "Eine ausdauernde Ruderal- und Saumpflanze für trockene, sonnige und wenig intensiv gepflegte Flächen.",
    status: "published",
    siteConditions: ["sonnig", "trocken bis frisch", "nährstoffreich"],
    planningNotes:
      "Mit Altgrasstreifen oder Ruderalflächen kombinieren und über Winter stehen lassen. Rückschnitt erst gestaffelt im Frühjahr.",
    sources: ["Pflanzenliste Studio Animal-Aided Design"],
    relatedSpecies: [
      { slug: "gimpel", commonName: "Gimpel", scientificName: "Pyrrhula pyrrhula", purpose: "Samen" }
    ]
  },
  {
    slug: "achillea-millefolium",
    scientificName: "Achillea millefolium",
    commonName: "Gewöhnliche Schafgarbe",
    type: "Staude",
    floweringPeriod: "Juni–Oktober",
    native: true,
    ecologicalValue: "Lange Blütezeit mit gut zugänglichem Pollen und Nektar für zahlreiche Insektengruppen.",
    teaser: "Eine belastbare heimische Blütenstaude für Wiesen, Säume und trockene Pflanzungen.",
    status: "draft",
    siteConditions: ["sonnig", "trocken bis frisch", "durchlässig"],
    planningNotes:
      "In artenreichen Mischungen verwenden. Ein abschnittsweiser Schnitt verlängert das Blütenangebot und erhält Rückzugsräume.",
    sources: ["Mock-Datensatz – fachliche Prüfung ausstehend"],
    relatedSpecies: []
  }
];

export const mockHabitats: HabitatDetail[] = [
  {
    slug: "wild-hecken",
    name: "(Wild-)Hecken",
    type: "Vegetation",
    size: "2–3 m hoch; mindestens 1,5–3 m breit",
    teaser: "Dichte, lineare Gehölzstrukturen verbinden Schutz, Brutplätze, Nahrung und räumliche Vernetzung.",
    image: {
      url: "https://animal-aided-design.de/wp-content/uploads/2024/11/Dichte-Straeucher.png",
      alt: "Illustration einer dichten Wildhecke",
      attribution: "Studio Animal-Aided Design",
      type: "portrait"
    },
    status: "published",
    measureDescription:
      "Vorwiegend heimische Sträucher werden in einer dichten, linearen Anordnung gepflanzt. Wildarten sind Zuchtsorten vorzuziehen; Blüten, Beeren und Samen bilden wichtige Nahrungsquellen.",
    maintenance:
      "Abschnittsweise Verjüngung während der Wintermonate in mehrjährigen Abständen. Immer ausreichend alte und dichte Abschnitte als Rückzugs- und Brutraum erhalten.",
    combinedWith: [
      { slug: "krautsaum", name: "Krautsaum" },
      { slug: "altgrasstreifen", name: "Altgrasstreifen" }
    ],
    relatedSpecies: [
      { slug: "gimpel", commonName: "Gimpel", scientificName: "Pyrrhula pyrrhula", purpose: "Brutplatz", lifecycleStage: "adult" }
    ]
  },
  {
    slug: "altgrasstreifen",
    name: "Altgrasstreifen",
    type: "Vegetation",
    size: "mindestens 50 cm breit",
    teaser: "Ungemähte Streifen bieten Samen, Überwinterungsorte und sichere Rückzugswege durch intensiv genutzte Flächen.",
    image: {
      url: "https://animal-aided-design.de/wp-content/uploads/2024/11/Altgrasstreifen.png",
      alt: "Illustration eines Altgrasstreifens",
      attribution: "Studio Animal-Aided Design",
      type: "portrait"
    },
    status: "published",
    measureDescription:
      "Altgras bleibt entlang von Gräben, Zäunen, Wegrändern, Böschungen oder Gehölzen stehen. Es dient als Vernetzungsstruktur, Flucht- und Rückzugsraum sowie Nahrungsquelle.",
    maintenance:
      "Alle zwei bis vier Jahre abschnittsweise mit tierschonenden Geräten mähen. Mahdgut nach einer kurzen Trocknungsphase entfernen.",
    combinedWith: [
      { slug: "blumenwiese", name: "Blumenwiese" },
      { slug: "wild-hecken", name: "(Wild-)Hecken" }
    ],
    relatedSpecies: [
      { slug: "gimpel", commonName: "Gimpel", scientificName: "Pyrrhula pyrrhula", purpose: "Nahrung", lifecycleStage: "adult, juvenil" }
    ]
  },
  {
    slug: "blumenwiese",
    name: "Blumenwiese",
    type: "Vegetation",
    teaser: "Artenreiche, regional angesäte Wiesen verbinden ein langes Blütenangebot mit Nahrung und Rückzugsräumen.",
    image: {
      url: "https://animal-aided-design.de/wp-content/uploads/2024/11/Blumenwiese.png",
      alt: "Illustration einer Blumenwiese",
      attribution: "Studio Animal-Aided Design",
      type: "portrait"
    },
    status: "published",
    measureDescription:
      "Standortangepasste regionale Samenmischungen werden auf vorbereiteten, möglichst mageren Boden angesät. Entwicklung und Artenreichtum hängen stark vom Mährhythmus ab.",
    maintenance:
      "Ein- bis zweimal jährlich abschnittsweise mähen. Mahdgut trocknen lassen und anschließend entfernen; Restflächen als Altgras stehen lassen.",
    combinedWith: [{ slug: "altgrasstreifen", name: "Altgrasstreifen" }],
    relatedSpecies: [
      { slug: "gruenspecht", commonName: "Grünspecht", scientificName: "Picus viridis", purpose: "Nahrungsraum", lifecycleStage: "adult" }
    ]
  },
  {
    slug: "ruderalflaeche",
    name: "Ruderalfläche",
    type: "Vegetation",
    size: "mindestens 4 m²",
    location: "trocken, sonnig",
    teaser: "Offene, nährstoffarme und dynamische Flächen schaffen seltene Mikrohabitate für Wildbienen und Reptilien.",
    image: {
      url: "https://animal-aided-design.de/wp-content/uploads/2024/11/Ruderalflaeche.png",
      alt: "Illustration einer Ruderalfläche",
      attribution: "Studio Animal-Aided Design",
      type: "portrait"
    },
    status: "published",
    measureDescription:
      "Ein hoher Sand- oder Splittanteil und eine geringe Bodenbedeckung sichern offene Stellen. Steine oder Totholz können die Ränder gegen schnelles Zuwachsen schützen.",
    maintenance:
      "Nicht regelmäßig mähen. Starkwüchsige Pflanzen und invasive Neophyten gezielt entfernen; offene Bereiche bei Bedarf mit mineralischem Material erneuern.",
    combinedWith: [],
    relatedSpecies: []
  },
  {
    slug: "flache-wasserstelle",
    name: "Flache Wasserstelle",
    type: "Ausstattungselement",
    size: "mindestens 30 cm Durchmesser; 2–5 cm tief",
    teaser: "Eine gut einsehbare, flache und sicher zugängliche Wasserstelle unterstützt Tiere besonders in heißen Sommerperioden.",
    image: {
      url: "https://animal-aided-design.de/wp-content/uploads/2024/11/Flache-Trinkstelle.png",
      alt: "Illustration einer flachen Wasserstelle",
      attribution: "Studio Animal-Aided Design",
      type: "portrait"
    },
    status: "published",
    measureDescription:
      "Mindestens eine Uferseite läuft flach aus, damit Tiere selbstständig aussteigen können. Der Standort bleibt gut einsehbar und frei von nahe gelegenen Verstecken für Beutegreifer.",
    maintenance:
      "Künstliche Tränken regelmäßig reinigen und mit frischem Trinkwasser befüllen. Bei Hitze sind tägliche Kontrollen sinnvoll; keine chemischen Reinigungsmittel verwenden.",
    combinedWith: [],
    relatedSpecies: []
  },
  {
    slug: "trockenmauer",
    name: "Trockenmauer",
    type: "Ausstattungselement",
    location: "sonnig, trocken",
    teaser: "Unverfugte Natursteinmauern bilden warme Spalten, Rückzugsräume und strukturreiche Übergänge.",
    image: {
      url: "https://animal-aided-design.de/wp-content/uploads/2024/11/Trockenmauer.png",
      alt: "Illustration einer Trockenmauer",
      attribution: "Studio Animal-Aided Design",
      type: "portrait"
    },
    status: "draft",
    measureDescription:
      "Natursteine werden ohne Mörtel mit unterschiedlich großen Fugen geschichtet. Ein durchlässiger Aufbau und sonnenexponierte Teilflächen schaffen verschiedene Mikroklimata.",
    maintenance:
      "Fugen und besonnte Bereiche vor vollständigem Zuwachsen schützen. Standsicherheit kontrollieren und Sanierungen außerhalb sensibler Aktivitätszeiten durchführen.",
    combinedWith: [{ slug: "ruderalflaeche", name: "Ruderalfläche" }],
    relatedSpecies: []
  }
];
