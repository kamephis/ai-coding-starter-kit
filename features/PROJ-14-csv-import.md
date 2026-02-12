# PROJ-14: CSV-Import für Stützpunkte

## Status: 🔵 Planned

## Abhängigkeiten
- Benötigt: PROJ-1 (Admin-Authentifizierung) – nur eingeloggte Admins dürfen importieren
- Benötigt: PROJ-2 (Stützpunkt-Verwaltung) – Ziel-Tabelle und Geocoding-Logik

## Übersicht

Admins können Stützpunkte per CSV-Datei importieren. Da die Spaltenbezeichnungen in fremden CSV-Dateien variieren, gibt es ein interaktives Feldmapping: Pro CSV-Spalte wählt der Admin über ein Dropdown das passende Datenbankfeld aus. Vor dem Import werden alle Zeilen in einer Vorschau-Tabelle mit Validierungsstatus angezeigt. Bei Duplikaten (gleicher Name + PLZ) entscheidet der Admin pro Eintrag, ob überschrieben oder übersprungen wird.

## User Stories

- Als **Admin** möchte ich eine CSV-Datei hochladen können, um viele Stützpunkte auf einmal anzulegen, statt sie einzeln einzugeben.
- Als **Admin** möchte ich die CSV-Spalten den Datenbankfeldern zuordnen können, damit ich beliebige CSV-Formate importieren kann.
- Als **Admin** möchte ich vor dem Import eine Vorschau aller Zeilen mit Validierungsstatus sehen, um Fehler vor dem Speichern zu erkennen.
- Als **Admin** möchte ich bei Duplikaten pro Eintrag entscheiden können, ob der bestehende Stützpunkt aktualisiert oder die neue Zeile übersprungen wird.
- Als **Admin** möchte ich nach dem Import eine Zusammenfassung sehen (erfolgreich / übersprungen / fehlerhaft), um den Importstatus nachvollziehen zu können.

## Acceptance Criteria

### Datei-Upload
- [ ] Auf der Admin-Seite gibt es einen neuen Menüpunkt „CSV-Import" oder einen Import-Button auf der Stützpunkte-Seite
- [ ] Der Admin kann eine `.csv`-Datei per Datei-Dialog oder Drag & Drop hochladen
- [ ] Dateien bis 1.000 Zeilen werden unterstützt
- [ ] Das Trennzeichen (Komma, Semikolon, Tab) wird automatisch erkannt
- [ ] Die Zeichenkodierung UTF-8 wird unterstützt; UTF-8 BOM wird korrekt verarbeitet
- [ ] Bei ungültigen Dateien (kein CSV, leer, >1.000 Zeilen) wird eine verständliche Fehlermeldung angezeigt

### Feldmapping
- [ ] Nach dem Upload werden alle erkannten CSV-Spaltenköpfe angezeigt
- [ ] Pro CSV-Spalte gibt es ein Dropdown mit allen verfügbaren Ziel-Feldern:
  - `name` (Pflicht), `strasse` (Pflicht), `hausnummer` (Pflicht), `plz` (Pflicht), `ort` (Pflicht)
  - `land`, `telefon` (Pflicht), `email`, `website`, `notfallnummer`
  - `latitude`, `longitude`
  - `oeffnungszeiten_typ`, `oeffnungszeiten_von`, `oeffnungszeiten_bis`
  - `status`
  - „Nicht importieren" (Spalte ignorieren)
- [ ] Jedes Zielfeld kann nur einmal zugeordnet werden (keine Doppelbelegung)
- [ ] Der Admin sieht neben jedem Dropdown eine Vorschau der ersten 3 Werte aus der CSV-Spalte
- [ ] Pflichtfelder (name, strasse, hausnummer, plz, ort, telefon) sind als solche markiert
- [ ] Der „Weiter"-Button ist erst aktiv, wenn alle Pflichtfelder zugeordnet sind

### Vorschau & Validierung
- [ ] Nach dem Mapping wird eine Vorschau-Tabelle aller Zeilen angezeigt
- [ ] Jede Zeile hat einen Validierungsstatus: ✅ gültig, ⚠️ Warnung (Duplikat), ❌ ungültig
- [ ] Ungültige Zeilen zeigen den Grund an (z.B. „PLZ fehlt", „Ungültiger Status-Wert")
- [ ] Validierungsregeln:
  - Pflichtfelder dürfen nicht leer sein
  - `status` muss `aktiv` oder `temporaer_geschlossen` sein (oder leer → Default `aktiv`)
  - `oeffnungszeiten_typ` muss `tagsueber` oder `24h` sein (oder leer → Default `tagsueber`)
  - `email` muss gültiges Format haben (wenn angegeben)
  - `latitude`/`longitude` müssen numerisch sein (wenn angegeben)
- [ ] Die Tabelle ist scrollbar bei vielen Zeilen
- [ ] Es gibt eine Zusammenfassungsleiste: „X gültig, Y Duplikate, Z ungültig"

### Duplikat-Erkennung & -Behandlung
- [ ] Ein Duplikat wird erkannt, wenn ein bestehender Stützpunkt mit gleichem `name` UND gleicher `plz` existiert
- [ ] Duplikate werden in der Vorschau als ⚠️ markiert und zeigen den bestehenden Eintrag an
- [ ] Pro Duplikat kann der Admin wählen: „Überschreiben" oder „Überspringen"
- [ ] Es gibt eine Bulk-Aktion: „Alle Duplikate überschreiben" / „Alle Duplikate überspringen"
- [ ] Beim Überschreiben werden nur die gemappten Felder aktualisiert (bestehende Werte in nicht-gemappten Feldern bleiben erhalten)

### Import-Ausführung
- [ ] Der Admin startet den Import mit einem „Importieren"-Button
- [ ] Während des Imports wird ein Fortschrittsbalken angezeigt
- [ ] Der Import erfolgt transaktional: bei kritischem Fehler wird der gesamte Import zurückgerollt
- [ ] Nach dem Import wird automatisch Geocoding für alle neu importierten Einträge ohne Koordinaten angestoßen

### Import-Ergebnis
- [ ] Nach Abschluss wird eine Zusammenfassung angezeigt:
  - Anzahl erfolgreich importiert (neu angelegt)
  - Anzahl überschrieben (aktualisiert)
  - Anzahl übersprungen (Duplikate)
  - Anzahl fehlgeschlagen (mit Fehlerdetails)
- [ ] Der Admin kann von der Ergebnis-Seite direkt zur Stützpunkte-Liste navigieren

## Edge Cases

- **Leere Zeilen in CSV:** Leere Zeilen werden automatisch übersprungen, ohne Fehlermeldung
- **Spaltenköpfe mit Leerzeichen/Sonderzeichen:** Werden korrekt angezeigt; Trimming der Werte erfolgt automatisch
- **Fehlende Spaltenköpfe:** Wenn die erste Zeile keine Spaltenköpfe enthält, wird ein Hinweis angezeigt: „Erste Zeile wird als Header interpretiert – stimmt das?"
- **CSV mit nur 1 Zeile (nur Header):** Fehlermeldung „Keine Daten zum Importieren gefunden"
- **Pflichtfeld leer in einzelnen Zeilen:** Zeile wird als ❌ ungültig markiert, restliche Zeilen können trotzdem importiert werden
- **Alle Zeilen ungültig:** Import-Button ist deaktiviert, Hinweis „Keine gültigen Einträge zum Importieren"
- **Doppelte Spaltenköpfe in CSV:** Werden als „Spalte A", „Spalte A (2)" etc. angezeigt
- **Sehr lange Feldwerte:** Werte werden auf max. 500 Zeichen begrenzt; längere Werte lösen eine Warnung aus
- **Sonderzeichen in Feldern (Umlaute, Akzente):** Werden korrekt importiert (UTF-8)
- **CSV mit Windows-Zeilenumbrüchen (CRLF):** Werden korrekt verarbeitet
- **Browser-Reload während Import:** Warnung „Import läuft – Seite wirklich verlassen?"
- **Geocoding-Fehler nach Import:** Fehlgeschlagenes Geocoding wird im Stützpunkt-Detail angezeigt, blockiert aber nicht den Import
- **Land-Feld nicht gemappt:** Default-Wert `CH` wird verwendet

## Technische Anforderungen

- **Parsing:** CSV wird clientseitig geparst (kein Upload der Rohdatei an den Server nötig)
- **Trennzeichen-Erkennung:** Automatisch anhand der ersten 5 Zeilen (Komma, Semikolon, Tab)
- **Max. Dateigröße:** 5 MB
- **Max. Zeilen:** 1.000 (exkl. Header)
- **Geocoding:** Asynchron nach Import, mit Rate-Limiting (max. 1 Request/Sekunde)
- **Datenbank:** Insert/Update via Supabase Client, innerhalb einer Transaktion

---

## Tech-Design (Solution Architect)

### Component-Struktur

```
Admin-Bereich → Stützpunkte → "CSV-Import" Button
│
└── CSV-Import Seite (/admin/stuetzpunkte/import)
    │
    ├── Schritt-Anzeige (4 Schritte: Upload → Mapping → Vorschau → Ergebnis)
    │
    ├── Schritt 1: Datei-Upload
    │   ├── Drag & Drop Bereich (oder Datei-Dialog)
    │   ├── Datei-Info Anzeige (Name, Größe, Zeilen-Anzahl)
    │   └── Fehlermeldung (falls ungültige Datei)
    │
    ├── Schritt 2: Feld-Mapping
    │   ├── Mapping-Tabelle
    │   │   ├── Pro CSV-Spalte eine Zeile:
    │   │   │   ├── CSV-Spaltenname
    │   │   │   ├── Vorschau (erste 3 Werte)
    │   │   │   └── Dropdown → Zielfeld auswählen
    │   │   └── Pflichtfeld-Markierungen (*)
    │   ├── Status-Leiste ("5 von 6 Pflichtfeldern zugeordnet")
    │   └── "Weiter"-Button (erst aktiv wenn alle Pflichtfelder gemappt)
    │
    ├── Schritt 3: Vorschau & Validierung
    │   ├── Zusammenfassungs-Leiste ("120 gültig, 5 Duplikate, 3 ungültig")
    │   ├── Bulk-Aktionen für Duplikate ("Alle überschreiben" / "Alle überspringen")
    │   ├── Vorschau-Tabelle (scrollbar)
    │   │   └── Pro Zeile:
    │   │       ├── Status-Icon (gültig / Duplikat / ungültig)
    │   │       ├── Gemappte Felder (Name, PLZ, Ort, ...)
    │   │       ├── Fehler-/Warnungsgrund
    │   │       └── Duplikat-Aktion (Überschreiben / Überspringen)
    │   └── "Importieren"-Button (deaktiviert wenn 0 gültige Zeilen)
    │
    └── Schritt 4: Import-Ergebnis
        ├── Fortschrittsbalken (während Import läuft)
        └── Zusammenfassung
            ├── Neu angelegt: X
            ├── Aktualisiert: X
            ├── Übersprungen: X
            ├── Fehlgeschlagen: X (mit Details)
            └── "Zur Stützpunkte-Liste" Button
```

### Daten-Model

Keine neuen Datenbank-Tabellen nötig. Der Import schreibt direkt in die bestehende `stuetzpunkte`-Tabelle.

Temporäre Daten (nur während Import im Browser-Speicher / React State):

```
Jede importierte Zeile hat:
- Zeilennummer (aus CSV)
- Gemappte Feldwerte (Name, Straße, PLZ, etc.)
- Validierungsstatus (gültig / warnung / ungültig)
- Fehlergrund (falls ungültig)
- Duplikat-Info (gefundener bestehender Stützpunkt, falls vorhanden)
- Duplikat-Aktion (überschreiben / überspringen)
```

Duplikat-Erkennung: Abgleich über `name` + `plz` gegen bestehende Einträge in Supabase.

### Neue Seiten & API-Endpunkte

| Neu | Beschreibung |
|-----|-------------|
| **Seite:** `/admin/stuetzpunkte/import` | Mehrstufiger Import-Wizard |
| **API:** `POST /api/stuetzpunkte/import` | Batch-Import (Insert + Update in Transaktion) |
| **API:** `POST /api/stuetzpunkte/check-duplicates` | Prüft Liste von name+PLZ Paaren gegen Datenbank |

Bestehende API `/api/geocode` wird wiederverwendet für Geocoding nach Import.

### Datenfluss

```
CSV-Datei
  → [Browser] Parsing & Trennzeichen-Erkennung (Papa Parse)
  → [Browser] Feld-Mapping durch Admin
  → [Browser] Validierung (Pflichtfelder, Formate)
  → [Server] Duplikat-Check (name + PLZ gegen Datenbank)
  → [Browser] Admin reviewt Vorschau & entscheidet bei Duplikaten
  → [Server] Batch-Import (Insert/Update in Transaktion)
  → [Server] Geocoding für Einträge ohne Koordinaten (asynchron, 1/Sek.)
  → [Browser] Ergebnis-Anzeige
```

### Tech-Entscheidungen

| Entscheidung | Begründung |
|-------------|------------|
| **Papa Parse** für CSV-Parsing | Bewährte Library, erkennt Trennzeichen automatisch, unterstützt UTF-8 BOM, läuft im Browser |
| **Client-seitiges Parsing** | Keine Rohdatei an Server nötig, schneller, kein Upload-Limit am Server |
| **Mehrstufiger Wizard** | Übersichtlicher für Admin, klarer Ablauf, verhindert Fehler |
| **Server-seitige Transaktion** | Bei Fehler wird alles zurückgerollt, keine halb-importierten Daten |
| **Bestehende shadcn/ui Komponenten** | Konsistentes Design mit restlichem Admin-Panel |
| **Rate-Limited Geocoding** (1 Req/Sek) | OSRM Fair-Use Policy einhalten |

### Dependencies

```
Neues Package:
- papaparse (CSV-Parsing im Browser)

Bestehende Packages (werden wiederverwendet):
- shadcn/ui Komponenten (Table, Select, Button, Progress, Badge, Alert)
- Supabase Client
- Zod (Validierung)
- Lucide React (Icons)
```

### Navigation / Einstieg

- "CSV-Import" Button auf der Stützpunkte-Liste (/admin/stuetzpunkte)
- Führt zu /admin/stuetzpunkte/import
