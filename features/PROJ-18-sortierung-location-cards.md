# PROJ-18: Sortierung der Location Cards

## Status: ✅ Deployed

## Abhängigkeiten
- Benötigt: PROJ-7 (Storefinder Liste/Cards) - für die Location Card Liste
- Benötigt: PROJ-5 (Kartenansicht) - für Geolocation/Position des Users
- Benötigt: PROJ-8 (Mehrsprachigkeit) - für übersetzte Sortier-Labels

## User Stories
- Als Website-Besucher möchte ich die Stützpunkt-Karten nach Entfernung sortieren, um den nächstgelegenen Standort schnell zu finden
- Als Website-Besucher möchte ich die Stützpunkt-Karten alphabetisch nach Name sortieren (A-Z / Z-A), um einen bestimmten Standort gezielt zu finden
- Als Website-Besucher möchte ich die Stützpunkt-Karten nach PLZ oder Ort sortieren, um Standorte in meiner Region zu finden
- Als Website-Besucher erwarte ich, dass nach Aktivierung der Geolocation automatisch nach Entfernung sortiert wird, damit ich sofort die relevantesten Ergebnisse sehe
- Als Website-Besucher möchte ich auf jeder Karte die Entfernung sehen (z.B. "12.3 km"), wenn nach Entfernung sortiert wird, damit ich die Distanz auf einen Blick einschätzen kann

## Acceptance Criteria
- [ ] Ein Sortier-Dropdown wird oberhalb der Location Card Liste angezeigt
- [ ] Folgende Sortieroptionen sind verfügbar: Entfernung (nächster zuerst), Name A-Z, Name Z-A, PLZ aufsteigend, Ort A-Z
- [ ] Standard-Sortierung ohne Geolocation: PLZ aufsteigend
- [ ] Sobald der User seine Position teilt (Geolocation-Button), wird automatisch auf "Entfernung" umgeschaltet
- [ ] Bei Sortierung nach Entfernung wird auf jeder Location Card die Distanz als Badge/Label angezeigt (z.B. "12.3 km")
- [ ] Distanz-Anzeige verschwindet, wenn eine andere Sortierung gewählt wird
- [ ] Die gewählte Sortierung bleibt beim Sprachwechsel (DE/FR/IT) erhalten
- [ ] Sortier-Labels sind in allen drei Sprachen übersetzt (DE/FR/IT)
- [ ] Sortierung funktioniert korrekt mit aktiven Such- und Service-Filtern (gefilterte Ergebnisse werden sortiert)
- [ ] Dropdown-Styling passt zum bestehenden Widget-Design (CSS Custom Properties `--hsf-*`)

## Edge Cases
- **Keine Geolocation verfügbar:** Option "Entfernung" ist im Dropdown ausgegraut/deaktiviert mit Hinweis "Position erforderlich"
- **Geolocation wird widerrufen:** Wenn User Position widerruft und aktuell nach Entfernung sortiert ist, Fallback auf PLZ aufsteigend
- **Gleiche Entfernung:** Bei identischer Distanz (gerundet auf 0.1 km) sekundär nach Name A-Z sortieren
- **Gleiche PLZ:** Bei identischer PLZ sekundär nach Name A-Z sortieren
- **Leere Ergebnisliste:** Dropdown bleibt sichtbar aber inaktiv, keine Fehlermeldung
- **Suchfeld-Eingabe mit Geocoding:** Wenn User einen Ort sucht und Geocoding eine Position liefert, soll "Entfernung" als Sortieroption ebenfalls verfügbar werden (Distanz zur gesuchten Position)

## Technische Anforderungen
- Sortierung erfolgt clientseitig im Widget (keine API-Änderung nötig)
- Entfernungsberechnung via Haversine-Formel (Luftlinie)
- Distanz-Anzeige gerundet auf 1 Dezimalstelle (z.B. "12.3 km")
- Performance: Sortierung < 50ms auch bei 500+ Standorten

## Tech-Design (Solution Architect)

### Component-Struktur

```
Widget (App.tsx)
├── Suchleiste (SearchBar)
├── Service-Filter-Chips (ServiceFilterBar)
├── Toolbar-Zeile [NEU: erweitert]
│   ├── Radius-Dropdown (RadiusSelector) — bereits vorhanden
│   └── Sortier-Dropdown (SortSelector) — NEU
├── Ergebnis-Counter
├── Stützpunkt-Karten-Liste
│   └── Location Card (LocationCard) — erweitert
│       ├── Bild / Platzhalter
│       ├── Name + Status-Badge
│       ├── Entfernungs-Badge — NEU (z.B. "12.3 km", nur bei Entfernungssortierung)
│       ├── Adresse
│       ├── Kontaktdaten
│       ├── Service-Badges
│       └── Öffnungszeiten
├── "Mehr laden" Button
└── Karte (LeafletMap)
```

### Daten-Model

Kein neues Daten-Model nötig — rein clientseitige Logik.

Neuer State in App.tsx:
- **Aktive Sortierung**: Welche Sortierung gerade gewählt ist (Entfernung / Name A-Z / Name Z-A / PLZ / Ort A-Z)
- **Standard**: PLZ aufsteigend (ohne Position), Entfernung (sobald Position verfügbar)

Bestehende Daten werden wiederverwendet:
- Stützpunkt-Felder `name`, `plz`, `ort` → für alphabetische/PLZ-Sortierung
- Stützpunkt-Felder `latitude`, `longitude` + User-Position → für Entfernungssortierung
- Haversine-Formel ist bereits im Code vorhanden (App.tsx + SearchBar.tsx)

### Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `src/widget/components/SortSelector.tsx` | **NEU** — Sortier-Dropdown (gleicher Stil wie RadiusSelector) |
| `src/widget/App.tsx` | State für Sortierung hinzufügen, Sortierlogik im bestehenden `filteredStuetzpunkte` useMemo erweitern, Auto-Switch auf Entfernung bei Geolocation |
| `src/widget/components/LocationCard.tsx` | Optionalen Entfernungs-Badge anzeigen (neuer Prop `distance`) |
| `src/widget/styles.css` | CSS-Klasse für Entfernungs-Badge (`.hsf-card-distance`) |
| `src/widget/i18n/de.ts` | Neue Übersetzungskeys für Sortierung (DE) |
| `src/widget/i18n/fr.ts` | Neue Übersetzungskeys für Sortierung (FR) |
| `src/widget/i18n/it.ts` | Neue Übersetzungskeys für Sortierung (IT) |

### Tech-Entscheidungen

**Warum natives `<select>` statt Custom-Dropdown?**
→ Konsistent mit RadiusSelector, barrierefrei, kein zusätzliches CSS nötig, mobile-friendly

**Warum clientseitige Sortierung statt API-Parameter?**
→ Alle Standorte sind bereits geladen, Sortierung ist sofort (< 50ms), kein Netzwerk-Roundtrip nötig

**Warum Haversine (Luftlinie) statt OSRM (Fahrstrecke)?**
→ OSRM ist für einzelne Routen gedacht, nicht für Massen-Sortierung. Haversine ist für Sortierreihenfolge ausreichend genau und performant

**Warum bestehende Haversine-Funktion wiederverwenden?**
→ Gleiche Formel existiert bereits in App.tsx und SearchBar.tsx — idealerweise in eine gemeinsame Utility auslagern, um Duplikation zu reduzieren

### Dependencies

Keine neuen Packages nötig — alles mit bestehendem Stack umsetzbar.

### Sortier-Verhalten (Zusammenfassung)

```
Zustand                              → Sortierung
─────────────────────────────────────────────────
Kein Geolocation, kein Suche         → PLZ aufsteigend
Geolocation-Button geklickt          → Auto-Switch auf Entfernung
Ort in Suchfeld eingegeben (Geocoding) → Entfernung verfügbar (nicht auto)
User wählt manuell im Dropdown       → Gewählte Option
Sprachwechsel                        → Sortierung bleibt erhalten
Geolocation widerrufen               → Fallback auf PLZ aufsteigend
```

---

## QA Test Results

**Tested:** 2026-03-11
**Method:** Code Review + Static Analysis (kein laufender Server)
**Build:** Vite + Next.js Build erfolgreich (Exit Code 0)

## Acceptance Criteria Status

### AC-1: Sortier-Dropdown oberhalb der Location Card Liste
- [x] SortSelector in `hsf-toolbar-row` gerendert (App.tsx:489)
- [x] Wird vor den Location Cards angezeigt (oberhalb)

### AC-2: 5 Sortieroptionen verfügbar
- [x] `distance` — Entfernung (nächster zuerst)
- [x] `nameAZ` — Name A-Z
- [x] `nameZA` — Name Z-A
- [x] `plz` — PLZ aufsteigend
- [x] `cityAZ` — Ort A-Z

### AC-3: Standard-Sortierung PLZ aufsteigend
- [x] `useState<SortOption>('plz')` (App.tsx:33)

### AC-4: Auto-Switch auf Entfernung bei Geolocation
- [x] `setSortBy('distance')` in `handleUserGeolocation` (App.tsx:276)

### AC-5: Distanz-Badge auf Location Cards
- [x] `distance` Prop an LocationCard übergeben (App.tsx:574-576)
- [x] Badge mit Map-Pin-Icon und formatierter Distanz (LocationCard.tsx:67-74)
- [x] Gerundet auf 1 Dezimalstelle via `distance.toFixed(1)` (LocationCard.tsx:73)

### AC-6: Distanz-Anzeige verschwindet bei anderer Sortierung
- [x] `distance={sortBy === 'distance' && userLocation ? ... : null}` (App.tsx:574-576)
- [x] `distance != null` Check in LocationCard (LocationCard.tsx:67)

### AC-7: Sortierung bleibt bei Sprachwechsel erhalten
- [x] `sortBy` State ist unabhängig von `lang` State
- [x] Kein Reset von sortBy bei Language Change

### AC-8: Labels in DE/FR/IT übersetzt
- [x] DE: 8 Keys (sort.label, sort.distance, sort.nameAZ, sort.nameZA, sort.plz, sort.cityAZ, sort.requiresPosition, card.distance)
- [x] FR: 8 Keys identisch vorhanden
- [x] IT: 8 Keys identisch vorhanden
- [x] Fallback zu DE via translate() Funktion (i18n/index.ts:49)

### AC-9: Sortierung funktioniert mit aktiven Filtern
- [x] Sortierung wird NACH Filterung angewendet (App.tsx:156-190)
- [x] `results.slice()` verhindert Mutation des gefilterten Arrays

### AC-10: Dropdown-Styling konsistent
- [x] Verwendet `.hsf-select` Klasse (identisch mit RadiusSelector)
- [x] `.hsf-sort` / `.hsf-sort-label` folgt RadiusSelector-Pattern

## Edge Cases Status

### EC-1: Keine Geolocation — Distance disabled
- [x] `disabled={opt === 'distance' && !distanceAvailable}` (SortSelector.tsx:35)
- [x] Label zeigt "(Position erforderlich)" wenn nicht verfügbar (SortSelector.tsx:18-19)

### EC-2: Geolocation widerrufen — Fallback auf PLZ
- [x] useEffect überwacht `sortBy` + `userLocation` (App.tsx:280-284)
- [x] Fallback auf `'plz'` wenn `sortBy === 'distance' && !userLocation`

### EC-3: Gleiche Entfernung — Sekundär nach Name
- [x] `Math.round(da * 10) === Math.round(db * 10)` → `a.name.localeCompare(b.name)` (App.tsx:165-166)

### EC-4: Gleiche PLZ — Sekundär nach Name
- [x] `cmp !== 0 ? cmp : a.name.localeCompare(b.name)` (App.tsx:180-181)

### EC-5: Leere Ergebnisliste — Dropdown sichtbar
- [x] SortSelector ist in Toolbar, wird immer gerendert (auch bei leerer Liste)
- [ ] ❌ BUG-1: Dropdown ist nicht visuell "inaktiv" bei leerer Ergebnisliste (Spec sagt "inaktiv")

### EC-6: Geocoding macht Entfernung verfügbar
- [x] Geocoding setzt `userLocation` → `distanceAvailable={!!userLocation}` wird true
- [x] Kein Auto-Switch (korrekt: nur Geolocation-Button triggert Auto-Switch)

## Bugs Found

### BUG-1: Sort-Dropdown nicht deaktiviert bei leerer Ergebnisliste
- **Severity:** Low
- **Location:** SortSelector.tsx + App.tsx
- **Description:** Spec sagt "Leere Ergebnisliste: Dropdown bleibt sichtbar aber inaktiv". Das Dropdown ist immer voll interaktiv, auch wenn 0 Ergebnisse angezeigt werden. Sortierung einer leeren Liste hat keinen sichtbaren Effekt, aber das Dropdown sollte laut Spec visuell deaktiviert sein.
- **Expected:** `<select disabled>` wenn `resultCount === 0`
- **Actual:** Select ist immer enabled
- **Priority:** Low (UX Kosmetik — funktional kein Problem)

### BUG-2: Inline-Styles statt CSS-Klasse im LocationCard Header
- **Severity:** Low
- **Location:** LocationCard.tsx:66
- **Description:** Die Wrapper-`div` für Distance-Badge + Closed-Badge verwendet Inline-Styles (`display: flex; alignItems: center; gap: 6px; flexShrink: 0`) statt einer CSS-Klasse. Widget-Konvention ist Plain CSS mit `hsf-*` Prefix.
- **Expected:** CSS-Klasse `.hsf-card-header-badges` in styles.css
- **Actual:** Inline `style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}`
- **Priority:** Low (Code-Konsistenz — funktional korrekt)

## Regression Check

- [x] Haversine-Utility extrahiert — SearchBar.tsx und App.tsx nutzen gemeinsame Funktion
- [x] Bestehende Filterlogik (Text + Radius Union) unverändert
- [x] RadiusSelector unverändert
- [x] LocationCard bestehende Props unverändert (distance ist optional)
- [x] Route-Funktionalität unverändert
- [x] Build erfolgreich (Vite Widget + Next.js)

## Security Check

- [x] Kein User-Input wird in Sort-Logik ungefiltert verwendet
- [x] SortOption ist TypeScript-typisiert (nur 5 erlaubte Werte)
- [x] Keine API-Änderungen → kein neues Angriffsvektorpotential

## Performance Check

- [x] Clientseitige Sortierung via Array.sort — O(n log n) für n Standorte
- [x] Haversine-Berechnung ist leichtgewichtig (reine Mathematik)
- [x] < 50ms für 500+ Standorte ist realistisch

## Summary
- ✅ **10/10 Acceptance Criteria passed**
- ✅ **5/6 Edge Cases passed**
- ❌ **2 Bugs found** (0 Critical, 0 High, 2 Low)
- ✅ **Regression:** Keine bestehenden Features beeinträchtigt
- ✅ **Security:** Keine neuen Risiken

## Recommendation

**Feature ist production-ready.** Beide Bugs sind Low-Priority (UX-Kosmetik) und blockieren kein Deployment. Optional vor Release fixen.
