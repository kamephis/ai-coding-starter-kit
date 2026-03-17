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

---

## QA Test Results

**Tested:** 2026-03-17
**Methode:** Code Review (statische Analyse aller geänderten Dateien)

### Acceptance Criteria Status

### AC-1: Firmenlogo-Bereich im Admin-Panel
- [x] Card "Firmenlogo" existiert in `/admin/einstellungen` (zwischen Widget-Darstellung und Speichern-Button)
- [x] Card zeigt Icon, Titel "Firmenlogo" und Beschreibung mit erlaubten Formaten

### AC-2: Upload per Datei-Auswahl
- [x] "Logo hochladen" Button öffnet Datei-Dialog
- [x] ~~BUG-1:~~ Drag & Drop implementiert

### AC-3: Erlaubte Formate
- [x] Backend prüft: `image/jpeg`, `image/png`, `image/webp`, `image/svg+xml`
- [x] Frontend `accept` Attribut: `.jpg,.jpeg,.png,.webp,.svg`

### AC-4: Maximale Dateigröße 1 MB
- [x] Backend prüft: `MAX_SIZE = 1 * 1024 * 1024`
- [x] Fehlermeldung: "Datei zu groß. Maximum: 1 MB"

### AC-5: Vorschau nach Upload
- [x] Logo wird in 160x80px Container mit `object-contain` angezeigt

### AC-6: Logo ersetzen (altes löschen)
- [x] Neues Logo wird ZUERST hochgeladen, DANN altes gelöscht (safe order)
- [x] `extractStoragePath()` extrahiert korrekten Pfad für Löschung

### AC-7: Logo entfernen (Löschen-Button)
- [x] "Entfernen" Button sichtbar wenn Logo vorhanden
- [x] DELETE `/api/logo` löscht aus Storage UND setzt `logo_url` auf null

### AC-8: Logo-URL in widget_config
- [x] Gespeichert als `logo_url` in `widget_config` Tabelle
- [x] SQL Migration vorhanden: `005_add_logo_url.sql`

### AC-9: Logo im Widget oben links
- [x] Logo wird als `<img>` mit Klasse `hsf-logo` im Header gerendert
- [x] `max-height: 40px`, `max-width: 180px`, `object-fit: contain`
- [x] ~~BUG-2 (REGRESSION):~~ LanguageSwitcher Position — gefixt mit `margin-left: auto`

### AC-10: Logo im Admin-Panel Header
- [x] Sidebar zeigt Logo statt "Storefinder" Text wenn `logo_url` vorhanden
- [x] `max-h-8 max-w-[140px] object-contain`

### AC-11: Kein Logo = kein Platzhalter
- [x] Widget: Header zeigt nur LanguageSwitcher wenn kein Logo
- [x] Admin: Sidebar zeigt "Storefinder" Text als Fallback
- [x] Einstellungen: Zeigt gestrichelten "Kein Logo" Platzhalter (nur im Upload-Bereich)

### AC-12: Nur authentifizierte Admins
- [x] POST `/api/logo`: `supabase.auth.getUser()` Check → 401
- [x] DELETE `/api/logo`: `supabase.auth.getUser()` Check → 401

### AC-13: Fehlermeldungen bei ungültigem Upload
- [x] Ungültiges Format: "Ungültiges Format. Erlaubt: JPG, PNG, WebP, SVG"
- [x] Zu groß: "Datei zu groß. Maximum: 1 MB"
- [x] Fehler wird als rote Alert in der Logo-Card angezeigt

### Edge Cases Status

### EC-1: SVG mit eingebettetem Script (XSS)
- [x] SVG wird nur als `<img src="...">` eingebunden (Widget + Admin)
- [x] Kein `dangerouslySetInnerHTML` oder inline SVG
- [x] **SICHER:** Browser blockiert Script-Ausführung in `<img>`-Tags

### EC-2: Logo ersetzen bei Netzwerkfehler
- [x] Neues Logo wird zuerst hochgeladen, danach altes gelöscht
- [x] Bei Upload-Fehler: altes Logo bleibt erhalten

### EC-3: Sehr breites/hohes Logo
- [x] Widget: `max-height: 40px; max-width: 180px; object-fit: contain`
- [x] Admin Sidebar: `max-h-8 max-w-[140px] object-contain`
- [x] Admin Vorschau: Container `h-20 w-40` mit `max-h-full max-w-full object-contain`

### EC-4: Gleichzeitige Uploads (Race Condition)
- [x] Letzter Upload gewinnt (DB Update ist atomic)
- [x] ~~BUG-3:~~ Cleanup bereinigt alle alten Dateien in `branding/` nach Upload

### EC-5: Widget-Cache
- [x] Kein aggressives Caching — Widget lädt Config bei jedem Start via `fetch()`
- [x] Logo-URL enthält Timestamp (`logo-{Date.now()}.ext`), verhindert Browser-Cache

## Bugs Found

### ~~BUG-1: Kein Drag & Drop Upload~~ — GEFIXT
- **Fix:** Drag & Drop Handler (`onDragOver`, `onDragLeave`, `onDrop`) auf Logo-CardContent hinzugefügt. Visuelles Feedback bei Drag-Over.

### ~~BUG-2 (REGRESSION): LanguageSwitcher im Widget nach rechts verschoben~~ — GEFIXT
- **Fix:** `margin-left: auto` auf `.hsf-lang-switcher` — Switcher bleibt rechts auch ohne Logo.

### ~~BUG-3: Verwaiste Storage-Dateien bei gleichzeitigem Upload~~ — GEFIXT
- **Fix:** Nach Upload werden alle Dateien in `branding/` aufgelistet und alle außer der neuen gelöscht. Behebt Race Condition bei gleichzeitigen Uploads.

## Regression Test

- [x] Bestehende Einstellungen-Seite: Karten-Einstellungen, Widget-Darstellung, Embed-Code unverändert
- [x] Widget-Config PUT API: `UpdateConfigSchema` enthält KEIN `logo_url` → Logo wird beim Config-Speichern nicht überschrieben (Supabase `.update()` ändert nur übergebene Felder)
- [x] Widget-Config GET (Admin): nutzt `SELECT *` → `logo_url` automatisch enthalten
- [x] Widget-Config GET (Public): `logo_url` explizit in SELECT hinzugefügt
- [x] ~~BUG-2:~~ LanguageSwitcher Position — gefixt

## Security Check

- [x] Auth-Check auf allen Endpoints (POST, DELETE)
- [x] File-Type Validierung (serverseitig, nicht nur Client `accept`)
- [x] File-Size Validierung (serverseitig)
- [x] SVG nur als `<img>` — kein XSS-Risiko
- [x] Kein Path Traversal möglich (Filename wird mit `logo-{timestamp}.{ext}` generiert)
- [x] Storage-Pfad fest unter `branding/` Prefix

## Summary
- **13 von 13** Acceptance Criteria passed
- **3 Bugs found — alle gefixt** (BUG-1 Drag&Drop, BUG-2 LanguageSwitcher Regression, BUG-3 Race Condition)

## Recommendation
Alle Bugs gefixt. Ready for deployment.
