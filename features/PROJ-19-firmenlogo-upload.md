# PROJ-19: Firmenlogo Upload & Anzeige

## Status: 🔵 Planned

## Abhängigkeiten
- Benötigt: PROJ-1 (Admin Authentifizierung) - für Logo-Upload im Admin-Panel
- Benötigt: PROJ-4 (Widget Konfiguration) - Logo-URL wird Teil der Widget-Config

## User Stories

- Als **Admin** möchte ich ein Firmenlogo im Admin-Panel hochladen können, um das Branding des Storefinders und des Admin-Panels anzupassen.
- Als **Admin** möchte ich ein bestehendes Logo durch ein neues ersetzen können, wobei das alte Logo automatisch gelöscht wird, um Speicherplatz zu sparen.
- Als **Admin** möchte ich ein hochgeladenes Logo wieder entfernen können, sodass kein Logo mehr angezeigt wird.
- Als **Website-Besucher** möchte ich das Firmenlogo oben links im Storefinder-Widget sehen, um die Marke des Anbieters zu erkennen.
- Als **Admin** möchte ich das Firmenlogo im Admin-Panel sehen, um ein einheitliches Branding zu haben.

## Acceptance Criteria

- [ ] Im Admin-Panel gibt es einen Bereich "Firmenlogo" (z.B. in den Widget-Einstellungen oder als eigener Bereich)
- [ ] Admin kann ein Logo per Datei-Upload hochladen (Drag & Drop oder Datei-Auswahl)
- [ ] Erlaubte Formate: JPG, PNG, WebP, SVG
- [ ] Maximale Dateigröße: 1 MB
- [ ] Nach dem Upload wird eine Vorschau des Logos im Admin-Panel angezeigt
- [ ] Admin kann das Logo durch ein neues ersetzen — das alte Logo wird automatisch aus dem Storage gelöscht
- [ ] Admin kann das Logo entfernen (Löschen-Button) — danach wird kein Logo angezeigt
- [ ] Die Logo-URL wird in der Widget-Konfiguration gespeichert (z.B. `logo_url` Feld in `widget_config`)
- [ ] Im Storefinder-Widget wird das Logo oben links im Header angezeigt
- [ ] Im Admin-Panel wird das Logo im Layout/Header angezeigt
- [ ] Wenn kein Logo hochgeladen ist, wird kein Logo angezeigt (kein Platzhalter) — das Layout passt sich entsprechend an
- [ ] Nur authentifizierte Admins können Logos hochladen/ersetzen/löschen
- [ ] Upload zeigt bei ungültigem Format oder zu großer Datei eine verständliche Fehlermeldung

## Edge Cases

- **Ungültiges Dateiformat:** Admin lädt z.B. eine .gif oder .bmp Datei hoch → Fehlermeldung mit erlaubten Formaten
- **Datei > 1 MB:** Upload wird abgelehnt mit Hinweis auf maximale Größe
- **SVG mit eingebettetem Script:** SVG-Dateien könnten XSS-Vektoren enthalten → SVG sollte sanitized werden oder nur als `<img>` eingebunden werden (kein inline SVG)
- **Logo ersetzen bei Netzwerkfehler:** Altes Logo darf erst gelöscht werden, wenn neues Logo erfolgreich hochgeladen ist
- **Sehr breites/hohes Logo:** Logo sollte mit max-height/max-width begrenzt werden, damit das Layout nicht bricht
- **Gleichzeitige Uploads:** Zwei Admins laden gleichzeitig ein Logo hoch → letzter Upload gewinnt, kein verwaistes Bild im Storage
- **Widget-Cache:** Nach Logo-Änderung muss das Widget die neue URL erhalten (kein aggressives Caching der Config)

## Technische Anforderungen

- Logo wird in Supabase Storage gespeichert (eigener Bucket oder Pfad z.B. `branding/logo.*`)
- Logo-URL wird als Feld `logo_url` in der `widget_config` Tabelle gespeichert
- SVG-Einbindung nur als `<img src="...">` (nie inline), um XSS zu verhindern
- Max-Darstellungsgröße im Widget: sinnvolle max-height (z.B. 40-50px) mit `object-fit: contain`

## Tech-Design (Solution Architect)

### Was bereits existiert und wiederverwendet wird
- **Upload-API** (`/api/upload`) — Bild-Upload nach Supabase Storage (Referenz-Pattern, aber Logo bekommt eigenen Endpoint)
- **Widget-Config API** (`/api/widget-config` + `/api/widget/config`) — Admin liest/speichert Config; Widget lädt Config beim Start
- **Einstellungen-Seite** (`/admin/einstellungen`) — hier wird der Logo-Upload-Bereich integriert
- **Admin-Layout** (`admin-layout.tsx`) — zeigt aktuell "Storefinder" als Text im Sidebar-Header

### Component-Struktur
```
Admin: Einstellungen-Seite (bestehend)
├── Karten-Einstellungen (bestehend)
├── Widget-Darstellung (bestehend)
├── NEU: Firmenlogo-Bereich
│   ├── Logo-Vorschau (zeigt aktuelles Logo oder "Kein Logo")
│   ├── Upload-Bereich (Datei-Auswahl Button)
│   └── Löschen-Button (nur sichtbar wenn Logo vorhanden)
├── Speichern-Button (bestehend)
└── Embed-Code (bestehend)

Admin: Sidebar (bestehend)
└── Header-Bereich
    └── NEU: Logo statt "Storefinder"-Text (wenn vorhanden)

Widget: Storefinder (bestehend)
├── NEU: Logo oben links (wenn vorhanden)
├── Sprachwechsel (bestehend)
├── Toolbar (bestehend)
└── Content (bestehend)
```

### Daten-Model
```
Widget-Konfiguration bekommt ein neues Feld:
- logo_url (optional) — URL zum hochgeladenen Logo in Supabase Storage

Gespeichert in: bestehende Tabelle "widget_config" (neues Feld "logo_url")
Logo-Datei: Supabase Storage, Bucket "stuetzpunkt-bilder", Pfad "branding/logo.{ext}"
```

Es gibt immer nur EIN Logo. Beim Ersetzen wird:
1. Neues Logo hochgeladen
2. Altes Logo aus Storage gelöscht
3. `logo_url` in `widget_config` aktualisiert

### Tech-Entscheidungen
```
Warum bestehenden Storage-Bucket wiederverwenden?
→ Bucket "stuetzpunkt-bilder" existiert bereits mit öffentlichem Zugriff.
  Eigener Pfad "branding/" trennt Logo von Stützpunkt-Bildern.

Warum Logo in Widget-Config statt eigener Tabelle?
→ Es gibt nur EIN Logo — ein einzelnes Feld reicht.
  Das Widget lädt Config sowieso beim Start, Logo-URL kommt "gratis" mit.

Warum SVG nur als <img> einbinden?
→ Inline-SVG kann JavaScript enthalten (XSS-Risiko).
  Als <img src="..."> wird SVG sicher gerendert.

Warum eigene Logo-API statt bestehende Upload-API erweitern?
→ Logo-Upload hat spezielle Logik: altes Logo löschen, nur 1 Datei,
  SVG-Support, 1 MB Limit. Besser als eigener Endpoint statt
  die generische Upload-API zu verkomplizieren.
```

### Dependencies
```
Keine neuen Packages nötig.
Alles wird mit bestehenden Tools gebaut:
- Supabase Storage (bereits eingerichtet)
- shadcn/ui Components (bereits vorhanden)
- Next.js API Routes (bestehendes Pattern)
```
