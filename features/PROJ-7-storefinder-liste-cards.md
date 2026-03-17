# PROJ-7: Storefinder Widget - Stützpunkt-Liste & Cards

## Status: ✅ Deployed

## Abhängigkeiten
- Benötigt: PROJ-2 (Stützpunkt-Verwaltung) - für Stützpunkt-Daten
- Benötigt: PROJ-3 (Service-Typen) - für Service-Icons auf Cards
- Benötigt: PROJ-5 (Kartenansicht) - Klick auf Card highlightet Pin auf Karte
- Benötigt: PROJ-6 (Suche & Filter) - Liste zeigt gefilterte Ergebnisse
- Benötigt: PROJ-8 (Mehrsprachigkeit) - für i18n der UI-Texte

## Beschreibung
Listenansicht der Stützpunkte als Cards neben/unter der Karte. Jede Card zeigt Stützpunkt-Details mit Service-Icons an.

## User Stories
- Als Website-Besucher möchte ich eine übersichtliche Liste aller Stützpunkte als Cards sehen
- Als Website-Besucher möchte ich auf jeder Card die angebotenen Services als Icons sehen
- Als Website-Besucher möchte ich die Adresse und Kontaktdaten direkt auf der Card sehen
- Als Website-Besucher möchte ich das Stützpunkt-Bild auf der Card sehen
- Als Website-Besucher möchte ich auf eine Card klicken, um den zugehörigen Pin auf der Karte zu sehen
- Als Website-Besucher möchte ich bei vielen Ergebnissen durch die Liste scrollen/paginieren können

## Card-Layout
```
┌─────────────────────────────────┐
│ [Bild des Stützpunkts]          │
├─────────────────────────────────┤
│ Stützpunkt Name                 │
│ Straße Hausnummer               │
│ PLZ Ort                         │
│                                 │
│ 📞 +41 XX XXX XX XX             │
│ ✉️  email@example.com            │
│ 🌐 www.example.com              │
│                                 │
│ [🔧] [⚙️] [🚐] [💧]  ← Service Icons │
│                                 │
│ 🕐 Tagsüber: 07:00-17:00       │
│    ODER: 24h Service            │
│                                 │
│ ⚠️ Temporär geschlossen (Badge) │
└─────────────────────────────────┘
```

## Acceptance Criteria
- [ ] Card zeigt: Bild, Name, Adresse (Straße + Nr, PLZ + Ort), Telefon, Email, Website
- [ ] Telefon ist klickbar (tel: Link)
- [ ] Email ist klickbar (mailto: Link)
- [ ] Website ist klickbar (öffnet in neuem Tab)
- [ ] Service-Icons werden als kleine Badges/Chips auf der Card angezeigt
- [ ] Service-Icons haben Tooltip mit Service-Name
- [ ] Öffnungszeiten: "Tagsüber: HH:MM - HH:MM" oder "24h Service"
- [ ] Temporär geschlossene Stützpunkte: Badge/Banner "Temporär geschlossen" auf der Card
- [ ] Klick auf Card: Karte zentriert und zoomt auf den zugehörigen Pin
- [ ] Hover auf Card: Zugehöriger Pin auf Karte wird hervorgehoben
- [ ] Bild: Placeholder wenn kein Bild vorhanden
- [ ] Pagination: Max. 20 Cards pro Seite, Load More Button oder Infinite Scroll
- [ ] Sortierung: Standard nach Entfernung (wenn Standort bekannt), sonst alphabetisch
- [ ] Responsive: Cards im Grid (Desktop: 2-3 Spalten, Tablet: 2, Mobile: 1)
- [ ] Layout: Karte oben, Liste darunter (Mobile) / Karte links, Liste rechts (Desktop)

## Edge Cases
- Was passiert wenn kein Bild vorhanden? → Placeholder-Bild (z.B. Heizmann Logo oder generisches Gebäude)
- Was passiert wenn Website-URL fehlt? → Website-Zeile wird nicht angezeigt
- Was passiert bei sehr langem Stützpunkt-Namen? → Text wird mit Ellipsis abgeschnitten
- Was passiert bei 0 Ergebnissen nach Filterung? → Empty State mit Illustration und Text
- Was passiert bei langsamer Verbindung? → Skeleton-Loading für Cards

## Design-Referenz
- Zeroheight Webdesign Guidelines: https://zeroheight.com/7eb40b8a1/p/18def4-webdesign-guidelines
- Shadcn/ui Card Komponente als Basis
- Heizmann CI-Farben aus Widget-Konfiguration (PROJ-4)

## Technische Anforderungen
- Shadcn/ui Card, Badge, Tooltip Komponenten
- Lazy Loading für Stützpunkt-Bilder
- Intersection Observer für Infinite Scroll / Load More
- Responsive Grid mit Tailwind CSS

## Tech-Design (Solution Architect)

### Component-Struktur

```
Widget → Stützpunkt-Liste
├── LocationList               ← Scrollbare Liste / Grid
│   ├── LocationCard           ← Einzelne Stützpunkt-Karte
│   │   ├── CardImage          ← Stützpunkt-Bild (Lazy Loading)
│   │   │   └── Placeholder    ← Fallback wenn kein Bild
│   │   ├── CardHeader         ← Name + Status-Badge
│   │   ├── CardAddress        ← Straße, PLZ, Ort
│   │   ├── CardContact        ← Telefon (tel:), Email (mailto:), Website (blank)
│   │   ├── ServiceIcons       ← Reihe von Service-Icons mit Tooltips
│   │   │   └── ServiceIcon    ← Einzelnes Icon (Lucide) + Tooltip
│   │   ├── CardHours          ← "07:00-17:00" oder "24h Service"
│   │   └── ClosedBadge        ← "Temporär geschlossen" (orange Badge)
│   └── SkeletonCard           ← Loading-Placeholder während Daten laden
├── LoadMoreButton             ← "Mehr anzeigen" (wenn >20 Ergebnisse)
└── EmptyState                 ← Illustration + "Keine Stützpunkte gefunden"
```

### Responsive Layout

```
Desktop (>1024px):
┌────────────────────────────┬───────────────────┐
│                             │ ┌───────────────┐ │
│          KARTE              │ │   Card 1      │ │
│          (60%)              │ │               │ │
│                             │ ├───────────────┤ │
│                             │ │   Card 2      │ │
│                             │ │               │ │
│                             │ ├───────────────┤ │
│                             │ │   Card 3      │ │
└────────────────────────────┘ └───────────────┘ │
                                Scrollbar ↕       │
                              ────────────────────┘

Mobile (<768px):
┌────────────────────────────┐
│          KARTE              │
│         (50vh)              │
├────────────────────────────┤
│ ┌────────────────────────┐ │
│ │       Card 1            │ │
│ └────────────────────────┘ │
│ ┌────────────────────────┐ │
│ │       Card 2            │ │
│ └────────────────────────┘ │
│   [Mehr anzeigen]          │
└────────────────────────────┘
```

### Interaktion mit Karte (PROJ-5)

```
Card → Karte:
- Hover auf Card → Pin auf Karte wird hervorgehoben (größer/anderer Farbe)
- Klick auf Card → Karte zoomt und zentriert auf diesen Pin

Karte → Card:
- Klick auf Pin → Zugehörige Card scrollt in den sichtbaren Bereich
- Klick auf "Details" im Popup → Scrollt zur Card
```

### Tech-Entscheidungen

```
Warum "Mehr anzeigen" Button statt Infinite Scroll?
→ Besser für Accessibility und Performance. User hat Kontrolle.
  Infinite Scroll kann auf Mobile problematisch sein (Footer unerreichbar).

Warum Lazy Loading für Bilder?
→ Bei 20+ Cards mit Bildern verbessert Lazy Loading die initiale Ladezeit erheblich.
  Browser-natives loading="lazy" Attribut, kein extra JS nötig.

Warum Desktop: Karte links, Liste rechts (Split View)?
→ Klassisches Storefinder-Pattern das User kennen (Google Maps, Airbnb).
  User sieht Karte und Liste gleichzeitig.
```

### Dependencies
- Keine zusätzlichen Packages
  (Im Widget werden eigene Card-Komponenten gebaut, da shadcn/ui im
   standalone Widget-Bundle nicht direkt nutzbar ist. Die Styles
   orientieren sich an shadcn/ui Design-Sprache.)
