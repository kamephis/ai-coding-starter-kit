# PROJ-4: Widget-Konfiguration & Snippet-Generator

## Status: ✅ Deployed

## Abhängigkeiten
- Benötigt: PROJ-1 (Admin-Authentifizierung) - für geschützten Backend-Zugriff

## Beschreibung
Backend-Einstellungen für das Widget (Map-Provider, Farben, Standardsprache, etc.) sowie ein Generator, der den Embed-Code (JavaScript Snippet) erzeugt.

## User Stories
- Als Admin möchte ich den Map-Provider wählen können (OpenStreetMap oder Google Maps)
- Als Admin möchte ich einen Google Maps API Key hinterlegen können, falls Google Maps gewählt wird
- Als Admin möchte ich die Standardsprache des Widgets festlegen können (DE/FR/IT)
- Als Admin möchte ich die Primärfarbe des Widgets an unsere CI anpassen können
- Als Admin möchte ich den Standard-Umkreisradius festlegen können
- Als Admin möchte ich ein fertiges JavaScript-Snippet kopieren können, das ich in jede HTML-Seite einbinden kann
- Als Admin möchte ich eine Vorschau des Widgets mit aktuellen Einstellungen sehen können

## Datenmodell Widget-Konfiguration
| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| map_provider | Enum | Ja | "openstreetmap" / "google_maps" |
| google_maps_api_key | String | Bedingt | API Key (nur bei Google Maps) |
| default_language | Enum | Ja | "de" / "fr" / "it" |
| primary_color | String | Ja | HEX Farbwert (z.B. #E30613) |
| default_radius_km | Integer | Ja | Standard-Suchradius in km |
| default_center_lat | Float | Ja | Karten-Mittelpunkt Latitude |
| default_center_lng | Float | Ja | Karten-Mittelpunkt Longitude |
| default_zoom | Integer | Ja | Initiale Zoomstufe |

## Acceptance Criteria
- [ ] Einstellungsseite im Backend mit allen konfigurierbaren Feldern
- [ ] Map-Provider Auswahl: OpenStreetMap (Standard) oder Google Maps
- [ ] Google Maps API Key Feld erscheint nur bei Auswahl "Google Maps"
- [ ] Farbwähler (Color Picker) für Primärfarbe
- [ ] Standardsprache Dropdown: DE / FR / IT
- [ ] Standard-Umkreisradius: Dropdown mit 10km, 25km, 50km, 100km
- [ ] Standard Karten-Mittelpunkt: Lat/Lng Eingabe oder Karten-Pin setzen
- [ ] Snippet-Generator: Zeigt kopierbaren `<script>`-Tag an
- [ ] Snippet enthält eine eindeutige Widget-ID und API-Endpoint
- [ ] Copy-to-Clipboard Button für das Snippet
- [ ] Live-Vorschau des Widgets mit aktuellen Einstellungen
- [ ] Einstellungen werden sofort wirksam (kein Re-Deploy nötig)

## Snippet-Format (Beispiel)
```html
<!-- Heizmann Storefinder Widget -->
<div id="heizmann-storefinder"></div>
<script src="https://[app-url]/widget/storefinder.js"
        data-widget-id="[unique-id]">
</script>
```

## Edge Cases
- Was passiert wenn Google Maps Key ungültig ist? → Validierung beim Speichern, Fallback auf OpenStreetMap
- Was passiert wenn Widget-URL sich ändert? → Snippet enthält relative Pfade, Base-URL wird konfiguriert
- Was passiert bei ungültigem HEX-Farbwert? → Client-seitige Validierung
- Was passiert wenn Konfiguration gelöscht wird? → Nicht möglich, es gibt immer genau eine Konfiguration

## Technische Anforderungen
- Singleton-Pattern: Nur ein Konfigurationsdatensatz in der DB
- Widget-Script wird als statisches JS-Bundle bereitgestellt
- Widget liest Konfiguration beim Laden via API
- API-Endpoint öffentlich (kein Auth nötig) für Widget-Konfiguration
- CORS korrekt konfiguriert für Cross-Origin Embedding

## Tech-Design (Solution Architect)

### Component-Struktur

```
/admin/einstellungen          ← Widget-Konfiguration + Snippet

Komponenten:
├── WidgetConfigForm          ← Einstellungs-Formular
│   ├── MapProviderSelect      ← OpenStreetMap / Google Maps Toggle
│   ├── ApiKeyInput            ← Google Maps API Key (bedingt sichtbar)
│   ├── ColorPicker            ← Primärfarbe wählen
│   ├── LanguageSelect         ← Standard-Sprache (DE/FR/IT)
│   ├── RadiusSelect           ← Standard-Umkreis (10/25/50/100 km)
│   └── MapCenterPicker        ← Karten-Mittelpunkt (Mini-Map zum Setzen)
├── SnippetGenerator          ← Zeigt den Embed-Code an
│   ├── SnippetPreview         ← Code-Block mit Syntax-Highlighting
│   └── CopyButton             ← Kopiert Code in Zwischenablage
└── WidgetPreview             ← Live-Vorschau des Widgets (iFrame)
```

### Daten-Model

```
Tabelle: widget_config (Singleton - immer genau 1 Zeile)
- id: Immer 1
- map_provider: "openstreetmap" oder "google_maps"
- google_maps_api_key: API Key (verschlüsselt gespeichert)
- default_language: "de", "fr" oder "it"
- primary_color: HEX Farbcode (z.B. "#E30613")
- default_radius_km: 10, 25, 50 oder 100
- default_center_lat: Breitengrad (z.B. 46.9480 für Bern)
- default_center_lng: Längengrad (z.B. 7.4474 für Bern)
- default_zoom: Zoomstufe (z.B. 8)
- updated_at: Letztes Update
```

### Widget Build & Deployment

```
Das Widget wird als separates Vite-Projekt gebaut:

src/widget/                   ← Widget Quellcode (React + Vite)
├── main.tsx                  ← Entry Point: Liest data-widget-id, rendert App
├── App.tsx                   ← Haupt-Widget Komponente
├── ...                       ← Weitere Widget-Komponenten (PROJ-5/6/7/8)
└── vite.config.ts            ← Build-Konfiguration → Output: storefinder.js

Build-Output:
public/widget/storefinder.js  ← Standalone JS Bundle (~150-200 KB)
public/widget/storefinder.css ← Styles (isoliert, kein Konflikt mit Host-Seite)

Das Script wird über Next.js als statische Datei ausgeliefert.
```

### API-Endpoints

```
Geschützt (Admin):
GET    /api/widget-config      ← Aktuelle Konfiguration laden
PUT    /api/widget-config      ← Konfiguration speichern

Öffentlich (Widget):
GET    /api/widget/config      ← Konfiguration für Widget (ohne API Key!)
```

### Tech-Entscheidungen

```
Warum Vite für Widget-Build?
→ Schnell, erzeugt kleine Bundles, perfekt für standalone Libraries/Widgets.
  Next.js kann keine isolierten standalone JS-Bundles erzeugen.

Warum Konfiguration in DB statt in .env?
→ Admins können Einstellungen live ändern ohne Re-Deploy.
  Widget lädt Config bei jedem Laden frisch von der API.

Warum API Key nicht im Widget-Config-Endpoint?
→ Sicherheit! Der Google Maps API Key wird serverseitig verwendet.
  Das Widget bekommt nur den Map-Provider-Typ.
```

### Dependencies
- `vite` (Widget Build-Tool)
