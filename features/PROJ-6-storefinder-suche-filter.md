# PROJ-6: Storefinder Widget - Suche & Filter

## Status: ✅ Deployed

## Abhängigkeiten
- Benötigt: PROJ-2 (Stützpunkt-Verwaltung) - für Stützpunkt-Daten
- Benötigt: PROJ-3 (Service-Typen) - für Service-Filter Optionen
- Benötigt: PROJ-5 (Kartenansicht) - Suchergebnisse filtern Karte und Liste gleichzeitig
- Benötigt: PROJ-8 (Mehrsprachigkeit) - für i18n der UI-Texte

## Beschreibung
Such- und Filterfunktionalität im Storefinder-Widget. Besucher können nach PLZ/Ort suchen, Freitext eingeben und nach Service-Typen filtern.

## User Stories
- Als Website-Besucher möchte ich nach PLZ oder Ortsname suchen, um Stützpunkte in meiner Nähe zu finden
- Als Website-Besucher möchte ich einen Freitext eingeben können, um nach Stützpunkt-Namen zu suchen
- Als Website-Besucher möchte ich nach Service-Typen filtern können (z.B. nur "Mobile Werkstatt")
- Als Website-Besucher möchte ich mehrere Service-Filter gleichzeitig kombinieren können
- Als Website-Besucher möchte ich alle Filter mit einem Klick zurücksetzen können
- Als Website-Besucher möchte ich die Anzahl der Ergebnisse sehen

## Acceptance Criteria
- [ ] Suchfeld: Eingabe von PLZ oder Ortsname
- [ ] Bei PLZ/Ort-Suche: Geocoding der Eingabe → Karte zentriert auf Ort + Umkreissuche
- [ ] Freitext-Suche: Sucht in Stützpunkt-Name und Ort
- [ ] Service-Filter: Buttons oder Chips für jeden Service-Typ (mit Icon)
- [ ] Service-Filter sind kombinierbar (AND-Logik: zeige Stützpunkte die ALLE gewählten Services haben)
- [ ] Aktive Filter sind visuell hervorgehoben
- [ ] "Alle Filter zurücksetzen" Button (nur sichtbar wenn Filter aktiv)
- [ ] Ergebnis-Counter: "X Stützpunkte gefunden"
- [ ] Suche aktualisiert sowohl Karte als auch Liste gleichzeitig
- [ ] Debouncing auf Freitext-Eingabe (300ms)
- [ ] Such-Eingabe hat Clear-Button (X)
- [ ] Bei keinen Ergebnissen: Meldung "Keine Stützpunkte gefunden. Versuchen Sie einen anderen Suchbegriff."
- [ ] Suche ist Case-insensitive

## Edge Cases
- Was passiert bei Tippfehler in PLZ? → Zeigt nächstbeste Ergebnisse oder "Ort nicht gefunden"
- Was passiert wenn Geocoding der Sucheingabe fehlschlägt? → Fallback auf Freitext-Suche in PLZ/Ort-Feldern
- Was passiert bei Sonderzeichen in Suche? → Input wird sanitized
- Was passiert bei sehr kurzer Eingabe (1-2 Zeichen)? → Suche startet erst ab 3 Zeichen oder bei Enter
- Was passiert bei Kombination PLZ + Service die 0 Ergebnisse hat? → "Keine Stützpunkte mit diesen Filtern gefunden"

## Technische Anforderungen
- Frontend-Geocoding via Nominatim API (OpenStreetMap) für Ort-Suche
- Client-seitige Filterung (alle Daten beim Widget-Laden geladen, bei >200 Einträgen Pagination via API)
- Debounce 300ms auf Eingabefelder
- URL-Parameter Sync optional (Filter in URL abbilden für Sharing)

## Tech-Design (Solution Architect)

### Component-Struktur

```
Widget → Such-Bereich
├── SearchBar                  ← Suchfeld mit Clear-Button
│   └── SearchInput            ← Text-Eingabe (PLZ / Ort / Freitext)
├── ServiceFilterBar           ← Horizontale Leiste mit Service-Chips
│   └── ServiceChip            ← Einzelner Filter-Button (Icon + Name)
│       └── (aktiv/inaktiv)    ← Visueller Toggle-State
├── RadiusSelector             ← Dropdown (10/25/50/100 km) - geteilt mit PROJ-5
├── ResetFiltersButton         ← "Filter zurücksetzen" (nur sichtbar wenn aktiv)
└── ResultCounter              ← "X Stützpunkte gefunden"
```

### Daten-Model

```
Such- und Filter-State (gemeinsam für Karte + Liste):
- Suchtext: Freitext-Eingabe des Users
- Geocoded Position: lat/lng (wenn PLZ/Ort erkannt wurde)
- Aktive Service-Filter: Liste der ausgewählten Service-IDs
- Radius: Gewählter Umkreis in km
- Gefilterte Ergebnisse: Stützpunkte die allen Kriterien entsprechen

Filter-Logik (Reihenfolge):
1. Textsuche: Filtert nach Name, PLZ, Ort (case-insensitive)
2. Service-Filter: Nur Stützpunkte die ALLE gewählten Services haben (AND)
3. Umkreis-Filter: Nur Stützpunkte innerhalb des Radius (wenn Standort bekannt)
```

### Datenfluss

```
User tippt "Bern"
  → Debounce 300ms
    → Nominatim Geocoding: "Bern" → { lat: 46.948, lng: 7.447 }
      → Karte zentriert auf Bern
      → Stützpunkte im Umkreis werden gefiltert
      → Liste + Karte aktualisieren sich gleichzeitig

User klickt Service-Filter "Mobile Werkstatt"
  → Filter wird aktiv (Chip hervorgehoben)
    → Ergebnisse werden sofort gefiltert
    → Liste + Karte aktualisieren sich
    → Counter: "12 Stützpunkte gefunden"
```

### Tech-Entscheidungen

```
Warum Nominatim für Geocoding im Widget?
→ Kostenlos, kein API Key. Für Suche nach PLZ/Ort mehr als ausreichend.
  Limit: 1 Request/Sekunde (passt mit Debouncing).

Warum Client-seitige Filterung als Standard?
→ Bei der ersten Seite (20 Items) ist Client-Filter schneller als API-Call.
  API wird nur für Pagination (nächste Seite laden) genutzt.

Warum AND-Logik bei Service-Filtern?
→ User sucht spezifisch: "Zeige mir Stützpunkte die Hydraulik UND Mobile Werkstatt bieten."
  OR-Logik wäre zu breit und weniger nützlich.
```

### Dependencies
- Keine zusätzlichen Packages (Nominatim wird per fetch angesprochen)
