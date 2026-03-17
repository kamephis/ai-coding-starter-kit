# PROJ-14: CSV-Import für Stützpunkte

## Status: ✅ Deployed

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

---

## QA Test Results

**Tested:** 2026-02-12
**Method:** Code Review gegen Acceptance Criteria (statische Analyse)
**Reviewed Files:**
- `src/app/admin/(dashboard)/stuetzpunkte/import/page.tsx` (Wizard UI, 1023 Zeilen)
- `src/app/api/stuetzpunkte/check-duplicates/route.ts` (Duplikat-Check API, 77 Zeilen)
- `src/app/api/stuetzpunkte/import/route.ts` (Import API, 145 Zeilen)
- `src/app/admin/(dashboard)/stuetzpunkte/page.tsx` (Uebersichtsseite mit Button, 381 Zeilen)
- `src/app/api/geocode/route.ts` (Geocoding API, 47 Zeilen)

---

## Acceptance Criteria Status

### AC-1: Datei-Upload

- [x] Auf der Admin-Seite gibt es einen Import-Button auf der Stuetzpunkte-Seite
  - Button mit `FileSpreadsheet`-Icon und Text "CSV-Import" in `stuetzpunkte/page.tsx` Zeile 171-176
  - Verlinkt korrekt zu `/admin/stuetzpunkte/import`
- [x] Der Admin kann eine `.csv`-Datei per Datei-Dialog oder Drag & Drop hochladen
  - Drag & Drop via `onDragOver`/`onDragLeave`/`onDrop` Handler (Zeile 616-628)
  - Datei-Dialog via hidden `<input type="file" accept=".csv">` (Zeile 641-648)
- [x] Dateien bis 1.000 Zeilen werden unterstuetzt
  - `MAX_ROWS = 1000` Konstante (Zeile 95), Pruefung in `parseFile` (Zeile 259-261)
- [x] Das Trennzeichen (Komma, Semikolon, Tab) wird automatisch erkannt
  - Papa Parse mit `header: true` erkennt Trennzeichen automatisch (Zeile 244-246)
- [x] Die Zeichenkodierung UTF-8 wird unterstuetzt; UTF-8 BOM wird korrekt verarbeitet
  - Papa Parse mit `encoding: 'UTF-8'` (Zeile 247), BOM-Handling ist in Papa Parse integriert
- [x] Bei ungueltigen Dateien wird eine verstaendliche Fehlermeldung angezeigt
  - Pruefungen: nicht `.csv` (Zeile 234), zu gross (Zeile 239), keine Header (Zeile 249), keine Daten (Zeile 254), zu viele Zeilen (Zeile 259)

### AC-2: Feldmapping

- [x] Nach dem Upload werden alle erkannten CSV-Spaltenkopfe angezeigt
  - Mapping-Tabelle zeigt alle Headers (Zeile 692-744)
- [x] Pro CSV-Spalte gibt es ein Dropdown mit allen verfuegbaren Ziel-Feldern
  - Alle Felder in `TARGET_FIELDS` (Zeile 73-91): name, strasse, hausnummer, plz, ort, telefon, land, email, website, notfallnummer, latitude, longitude, oeffnungszeiten_typ/von/bis, status, "Nicht importieren"
- [x] Jedes Zielfeld kann nur einmal zugeordnet werden (keine Doppelbelegung)
  - `assignedTargets` Set verhindert Doppelbelegung (Zeile 330-332), Items werden als `disabled` markiert (Zeile 723-725, 731)
- [x] Der Admin sieht neben jedem Dropdown eine Vorschau der ersten 3 Werte
  - `getPreviewValues` zeigt erste 3 nicht-leere Werte (Zeile 337-342), als Badges angezeigt (Zeile 700-709)
- [x] Pflichtfelder sind als solche markiert
  - Mit `*` gekennzeichnet in Dropdown: `{'required' in field && field.required && ' *'}` (Zeile 733)
- [x] Der "Weiter"-Button ist erst aktiv, wenn alle Pflichtfelder zugeordnet sind
  - `disabled={!allRequiredMapped}` (Zeile 753)
- [x] Auto-Mapping Heuristik versucht Spalten automatisch zuzuordnen
  - `guessTargetField` Funktion (Zeile 100-128) mit umfangreichen Regex-Patterns

### AC-3: Vorschau & Validierung

- [x] Nach dem Mapping wird eine Vorschau-Tabelle aller Zeilen angezeigt
  - ScrollArea mit Tabelle (Zeile 838-920)
- [x] Jede Zeile hat einen Validierungsstatus: gueltig, Warnung (Duplikat), ungueltig
  - Status-Icons: CheckCircle2 (gruen), AlertTriangle (amber), XCircle (rot) (Zeile 868-876)
- [x] Ungueltige Zeilen zeigen den Grund an
  - Fehlertexte in `row.errors.join('; ')` (Zeile 888-890)
- [x] Validierungsregeln implementiert:
  - [x] Pflichtfelder duerfen nicht leer sein (Zeile 137-141)
  - [x] `status` muss `aktiv` oder `temporaer_geschlossen` sein (Zeile 144-149)
  - [x] `oeffnungszeiten_typ` muss `tagsueber` oder `24h` sein (Zeile 151-156)
  - [x] `email` muss gueltiges Format haben (Zeile 158-162)
  - [x] `latitude`/`longitude` muessen numerisch sein (Zeile 164-176)
- [x] Die Tabelle ist scrollbar bei vielen Zeilen
  - `ScrollArea` mit `h-[500px]` (Zeile 838)
- [x] Es gibt eine Zusammenfassungsleiste
  - Badges: "X gueltig, Y Duplikate, Z ungueltig" (Zeile 783-796)

### AC-4: Duplikat-Erkennung & -Behandlung

- [x] Ein Duplikat wird erkannt bei gleichem `name` UND gleicher `plz`
  - Server-Check via `/api/stuetzpunkte/check-duplicates` (Zeile 379), Key: `name_lower::plz` (Zeile 390)
- [x] Duplikate werden in der Vorschau als Warnung markiert und zeigen bestehenden Eintrag an
  - Amber-Hintergrund und Duplikat-Info (Zeile 892-895)
- [x] Pro Duplikat kann der Admin waehlen: "Ueberschreiben" oder "Ueberspringen"
  - Select mit zwei Optionen (Zeile 900-914)
- [x] Es gibt Bulk-Aktionen: "Alle Duplikate ueberschreiben" / "Alle Duplikate ueberspringen"
  - `setAllDuplicateAction` Buttons (Zeile 800-816)
- [x] Beim Ueberschreiben werden die gemappten Felder aktualisiert
  - Update via `supabase.update()` mit allen Datenfeldern (Import API Zeile 115-123)
- [ ] **BUG-1:** Beim Update werden ALLE Felder ueberschrieben, nicht nur die gemappten
  - Die Import API bekommt `row.data` mit allen Feldern inkl. Defaults. Nicht gemappte Felder erhalten Default-Werte (z.B. `land: 'CH'`, `status: 'aktiv'`), die bestehende Werte ueberschreiben koennen

### AC-5: Import-Ausfuehrung

- [x] Der Admin startet den Import mit einem "Importieren"-Button
  - Button mit Label "X Stuetzpunkte importieren" (Zeile 928-938)
- [x] Waehrend des Imports wird ein Fortschrittsbalken angezeigt
  - `Progress` Komponente mit `importProgress` State (Zeile 833-835)
- [ ] **BUG-2:** Der Import erfolgt NICHT transaktional
  - Die Import API (route.ts) fuehrt Batch-Insert durch, und bei Fehler einzelne Inserts als Fallback. Es gibt keinen Rollback-Mechanismus. Supabase Client unterstuetzt keine echten Transaktionen direkt. Teile des Imports koennen erfolgreich sein, waehrend andere fehlschlagen.
- [ ] **BUG-3:** Geocoding nach Import funktioniert nicht
  - `geocodeImportedRows` (Zeile 539-550) ruft `/api/geocode` auf, aber verwertet das Ergebnis NICHT. Die Koordinaten werden nur zurueckgegeben, aber nie in die Datenbank geschrieben. Es fehlt ein anschliessender `.update()` Aufruf.

### AC-6: Import-Ergebnis

- [x] Nach Abschluss wird eine Zusammenfassung angezeigt
  - Vier Karten: Neu angelegt, Aktualisiert, Uebersprungen, Fehlgeschlagen (Zeile 959-976)
- [x] Fehlerdetails werden angezeigt
  - Alert mit Fehlerliste (Zeile 978-991)
- [x] Der Admin kann zur Stuetzpunkte-Liste navigieren
  - "Zur Stuetzpunkte-Liste" Button (Zeile 994-996)
- [x] "Neuen Import starten" Option verfuegbar
  - Button setzt alle States zurueck (Zeile 999-1016)

---

## Edge Cases Status

### EC-1: Leere Zeilen in CSV
- [x] Leere Zeilen werden automatisch uebersprungen
  - Papa Parse `skipEmptyLines: true` (Zeile 246) + zusaetzlicher Filter (Zeile 277-279)

### EC-2: Spaltenkopfe mit Leerzeichen/Sonderzeichen
- [x] Werden korrekt angezeigt; Trimming erfolgt automatisch
  - `deduplicateHeaders` trimmt (Zeile 184), Werte werden in `parseFile` getrimmt (Zeile 271)

### EC-3: Fehlende Spaltenkopfe
- [ ] **BUG-4:** Kein Hinweis "Erste Zeile wird als Header interpretiert - stimmt das?"
  - Papa Parse mit `header: true` nimmt die erste Zeile immer als Header. Es gibt keinen Check, ob die erste Zeile tatsaechlich Spaltenkopfe enthaelt, und keinen Bestaetigungsdialog.

### EC-4: CSV mit nur 1 Zeile (nur Header)
- [x] Fehlermeldung "Keine Daten zum Importieren gefunden (nur Header-Zeile)."
  - Zeile 254-256

### EC-5: Pflichtfeld leer in einzelnen Zeilen
- [x] Zeile wird als ungueltig markiert, restliche Zeilen koennen importiert werden
  - `validateRow` setzt Fehler, betroffene Zeile bekommt `status: 'invalid'`

### EC-6: Alle Zeilen ungueltig
- [x] Import-Button ist deaktiviert
  - `disabled={importableCount === 0}` (Zeile 930)
- [ ] **BUG-5:** Kein expliziter Hinweis "Keine gueltigen Eintraege zum Importieren"
  - Der Button ist deaktiviert, aber es fehlt eine textuelle Meldung

### EC-7: Doppelte Spaltenkopfe in CSV
- [x] Werden als "Spalte A", "Spalte A (2)" etc. angezeigt
  - `deduplicateHeaders` Funktion (Zeile 181-191)

### EC-8: Sehr lange Feldwerte
- [ ] **BUG-6:** Keine Begrenzung auf 500 Zeichen, keine Warnung bei langen Werten
  - Die Validierung (`validateRow`) prueft nicht auf Feldlaenge. Die Spec fordert max. 500 Zeichen mit Warnung.

### EC-9: Sonderzeichen (Umlaute, Akzente)
- [x] UTF-8 Encoding in Papa Parse konfiguriert

### EC-10: Windows-Zeilenumbrueche (CRLF)
- [x] Papa Parse verarbeitet CRLF automatisch

### EC-11: Browser-Reload waehrend Import
- [x] Warnung via `beforeunload` Event
  - `useEffect` mit `beforeunload` Handler (Zeile 220-227)

### EC-12: Geocoding-Fehler nach Import
- [ ] **BUG-3 (siehe oben):** Geocoding ist komplett defekt, da Ergebnisse nie gespeichert werden

### EC-13: Land-Feld nicht gemappt
- [x] Default-Wert `CH` wird verwendet
  - `land: r.mappedData.land?.trim() || 'CH'` (Zeile 460)

---

## Security Analysis (Red Team)

### SEC-1: Authentication Checks
- [x] `/api/stuetzpunkte/check-duplicates` prueft Auth (Zeile 18-21)
- [x] `/api/stuetzpunkte/import` prueft Auth (Zeile 36-39)
- [x] Beide Endpunkte verwenden `supabase.auth.getUser()` mit Server-seitigem Cookie-Check

### SEC-2: Input Validation
- [x] Zod-Schemas validieren Eingaben auf beiden API-Endpunkten
- [x] `CheckDuplicatesSchema` begrenzt auf max. 1000 Paare
- [x] `ImportSchema` begrenzt auf max. 1000 Zeilen
- [x] Import-Daten werden Pflichtfelder-validiert (min(1))
- [x] Status und Oeffnungszeiten-Typ sind auf erlaubte Enum-Werte beschraenkt

### SEC-3: SQL Injection
- [x] Supabase Client verwendet parametrisierte Queries, kein rohes SQL
- [ ] **SEC-BUG-1 (CRITICAL): SQL Injection in bestehender Stuetzpunkte-Suche**
  - In `src/app/api/stuetzpunkte/route.ts` Zeile 48 wird der `search`-Parameter direkt in einen `.or()` Filter eingebaut: `query = query.or(\`name.ilike.%${search}%,plz.ilike.%${search}%,ort.ilike.%${search}%\`)`
  - Ein Angreifer kann PostgREST-Filter-Syntax in den `search`-Parameter injizieren (z.B. `%,id.neq.0)--` oder aehnliche PostgREST-Operatoren)
  - Dies betrifft NICHT das PROJ-14 Feature direkt, sondern die bestehende API, auf die der Import verlinkt
  - **HINWEIS:** Dies wurde bereits in `features/BUG-1-sql-injection-search.md` dokumentiert

### SEC-4: Rate Limiting
- [ ] **SEC-BUG-2 (HIGH): Kein Rate Limiting auf Import-API**
  - Ein authentifizierter Admin kann die Import-API beliebig oft aufrufen
  - Bei 1000 Zeilen pro Request koennte ein kompromittierter Admin-Account massenhaft Daten einfuegen
  - Es gibt kein serverseitiges Rate Limiting auf `/api/stuetzpunkte/import`

### SEC-5: Data Exfiltration via Duplicate Check
- [ ] **SEC-BUG-3 (MEDIUM): Information Disclosure ueber Duplikat-Check**
  - Die `/api/stuetzpunkte/check-duplicates` API gibt bei Duplikaten die vollstaendige Adresse (id, name, plz, ort, strasse, hausnummer) zurueck
  - Ein authentifizierter Admin kann durch systematisches Abfragen mit verschiedenen name+plz Kombinationen bestehende Stuetzpunkte enumerieren
  - Risiko: Niedrig, da Admin-Zugang erforderlich, aber bei Multi-Tenant-Szenarien problematisch

### SEC-6: Missing CSRF Protection
- [x] Next.js API Routes sind durch SameSite Cookies geschuetzt (Standard-Verhalten)

### SEC-7: Denial of Service
- [ ] **SEC-BUG-4 (MEDIUM): Keine Payload-Groessenbegrenzung auf API-Ebene**
  - Die Import-API akzeptiert bis zu 1000 Zeilen. Bei maximal 16+ Feldern pro Zeile und 500+ Zeichen pro Feld koennen extrem grosse Payloads gesendet werden
  - Zod validiert zwar die Struktur, aber die Datenmenge wird erst nach dem vollstaendigen JSON-Parsing geprueft
  - Next.js hat ein Standard-Body-Size-Limit (1MB), aber dies sollte explizit konfiguriert werden

### SEC-8: Update Authorization
- [ ] **SEC-BUG-5 (HIGH): Fehlende Autorisierungspruefung bei Updates**
  - Die Import-API fuehrt Updates via `existingId` durch (Zeile 115-123 in import/route.ts)
  - Das `existingId` kommt direkt vom Client und wird zwar als UUID validiert, aber es wird nicht geprueft ob der angemeldete Admin Bearbeitungsrechte auf diesen spezifischen Eintrag hat
  - Wenn RLS-Policies in Supabase nicht korrekt konfiguriert sind, koennte ein Admin fremde Eintraege ueberschreiben
  - Aktuell scheint die App Single-Tenant zu sein (ein Admin verwaltet alle), aber bei zukuenftiger Multi-Tenant-Erweiterung waere dies kritisch

---

## Bugs Found

### BUG-1: Update ueberschreibt alle Felder statt nur gemappte
- **Severity:** High
- **Location:** `src/app/admin/(dashboard)/stuetzpunkte/import/page.tsx` Zeile 453-483 und `src/app/api/stuetzpunkte/import/route.ts` Zeile 115-123
- **Steps to Reproduce:**
  1. CSV importieren mit nur den Spalten name, strasse, hausnummer, plz, ort, telefon
  2. Ein Duplikat wird erkannt (bestehender Stuetzpunkt mit website="www.example.com")
  3. Admin waehlt "Ueberschreiben"
  4. Expected: Nur gemappte Felder werden aktualisiert, website bleibt "www.example.com"
  5. Actual: website wird auf `null` gesetzt, status wird auf Default "aktiv" ueberschrieben
- **Root Cause:** `executeImport()` sendet alle Felder mit Default-Werten. Die API macht `update({...row.data})` und ueberschreibt auch nicht-gemappte Felder.
- **Fix-Vorschlag:** Nur Felder senden, die tatsaechlich gemappt wurden. Das Mapping als Metadata mitsenden, damit die API weiss welche Felder zu updaten sind.
- **Priority:** High (Data Loss)

### BUG-2: Import ist nicht transaktional
- **Severity:** High
- **Location:** `src/app/api/stuetzpunkte/import/route.ts`
- **Steps to Reproduce:**
  1. CSV mit 100 Zeilen importieren
  2. Zeile 50 hat einen Datenbankfehler (z.B. Unique Constraint Violation)
  3. Expected: Gesamter Import wird zurueckgerollt (alle 100 Zeilen)
  4. Actual: Zeilen 1-49 sind eingefuegt, Zeile 50 fehlgeschlagen, Zeilen 51-100 werden versucht
- **Root Cause:** Supabase JavaScript Client bietet kein natives Transaction-API. Die aktuelle Implementierung verwendet Batch Insert mit Single-Row-Fallback.
- **Fix-Vorschlag:** Supabase RPC mit einer PostgreSQL-Funktion verwenden, die den gesamten Import in einer Transaktion ausfuehrt. Alternativ: Spec anpassen, um "best effort" Import zu beschreiben (teilweiser Import mit Fehlerreport).
- **Priority:** High (Data Integrity)

### BUG-3: Geocoding nach Import speichert keine Koordinaten
- **Severity:** Critical
- **Location:** `src/app/admin/(dashboard)/stuetzpunkte/import/page.tsx` Zeile 539-550
- **Steps to Reproduce:**
  1. CSV importieren ohne latitude/longitude Spalten
  2. Import ist erfolgreich
  3. Expected: Koordinaten werden asynchron via Geocoding ermittelt und in DB gespeichert
  4. Actual: `/api/geocode` wird aufgerufen, Response wird komplett ignoriert, keine Koordinaten in DB
- **Root Cause:** `geocodeImportedRows()` ruft `fetch(/api/geocode?address=...)` auf, aber das Ergebnis wird nicht weiterverwendet. Die Funktion muesste nach erfolgreichem Geocoding ein Update auf den Stuetzpunkt durchfuehren. Ausserdem kennt die Funktion die IDs der neu erstellten Stuetzpunkte nicht, da `importResult` nur Zaehler enthaelt.
- **Fix-Vorschlag:** Die Import-API sollte die IDs der erstellten Eintraege zurueckgeben. Dann muss `geocodeImportedRows` fuer jede ID einen Update-Aufruf mit den Koordinaten machen, z.B. via `PATCH /api/stuetzpunkte/[id]`.
- **Priority:** Critical (Kernfunktion defekt - Stuetzpunkte ohne Koordinaten erscheinen nicht auf der Karte)

### BUG-4: Kein Bestaetigungsdialog fuer Header-Erkennung
- **Severity:** Low
- **Location:** `src/app/admin/(dashboard)/stuetzpunkte/import/page.tsx` Zeile 244-306
- **Steps to Reproduce:**
  1. CSV hochladen, deren erste Zeile Daten enthaelt (keine Spaltenkopfe)
  2. Expected: Hinweis "Erste Zeile wird als Header interpretiert - stimmt das?"
  3. Actual: Erste Zeile wird stillschweigend als Header genommen, Daten gehen verloren
- **Fix-Vorschlag:** Nach dem Parsing pruefen, ob die Header-Werte "typisch" aussehen (z.B. enthalten Zahlen, Sonderzeichen, oder sind sehr lang). Falls verdaechtig, Bestaetigungsdialog anzeigen.
- **Priority:** Low (Edge Case, UX)

### BUG-5: Fehlender Hinweis wenn alle Zeilen ungueltig
- **Severity:** Low
- **Location:** `src/app/admin/(dashboard)/stuetzpunkte/import/page.tsx` Schritt 3
- **Steps to Reproduce:**
  1. CSV hochladen mit Daten wo alle Zeilen Validierungsfehler haben
  2. Expected: Explizite Meldung "Keine gueltigen Eintraege zum Importieren"
  3. Actual: Import-Button ist deaktiviert, aber kein erklaereder Text warum
- **Fix-Vorschlag:** Conditional Alert anzeigen wenn `importableCount === 0`: "Keine gueltigen Eintraege zum Importieren. Bitte korrigieren Sie die CSV-Datei."
- **Priority:** Low (UX)

### BUG-6: Keine Feldlaenge-Begrenzung (max. 500 Zeichen)
- **Severity:** Medium
- **Location:** `src/app/admin/(dashboard)/stuetzpunkte/import/page.tsx` `validateRow()` Funktion
- **Steps to Reproduce:**
  1. CSV mit einem Name-Feld von 10.000 Zeichen importieren
  2. Expected: Warnung "Wert zu lang (max. 500 Zeichen)"
  3. Actual: Wert wird ohne Warnung importiert (nur durch DB-Spaltengroesse begrenzt)
- **Fix-Vorschlag:** In `validateRow()` Laengenpruefung fuer alle Textfelder hinzufuegen.
- **Priority:** Medium (Data Quality)

### BUG-7: Fortschrittsbalken zeigt keine echte Progress
- **Severity:** Low
- **Location:** `src/app/admin/(dashboard)/stuetzpunkte/import/page.tsx` Zeile 437-536
- **Steps to Reproduce:**
  1. Import mit vielen Zeilen starten
  2. Expected: Fortschrittsbalken zeigt echten Fortschritt
  3. Actual: Springt von 10% -> 30% -> 70% -> 90% -> 100% in festen Schritten. Es gibt keinen echten Progress-Tracking, da der gesamte Import in einem einzigen API-Call passiert.
- **Fix-Vorschlag:** Fuer echten Fortschritt muesste der Import in Batches aufgeteilt werden, oder Server-Sent Events / WebSocket fuer Progress-Updates verwenden. Alternativ: Spec anpassen, da bei einem einzigen API-Call kein echter Fortschritt moeglich ist.
- **Priority:** Low (UX)

---

## Regression Test

### Stuetzpunkte-Uebersichtsseite
- [x] Bestehende Funktionalitaet (Suche, Sortierung, Pagination, Loeschen) nicht beeintraechtigt
  - Nur ein Button wurde hinzugefuegt (Zeile 171-176), restlicher Code unveraendert
- [x] "Neuer Stuetzpunkt" Button weiterhin vorhanden und funktional

### Bestehende APIs
- [x] GET/POST `/api/stuetzpunkte` nicht veraendert
- [x] Bestehende CRUD-Operationen nicht betroffen (nur neue Dateien hinzugefuegt)

### Widget
- [x] Widget-Code nicht veraendert durch PROJ-14
- [x] Keine Aenderungen an `public/widget/` Dateien

---

## Summary

- 22 Acceptance Criteria geprueft
- 19 PASSED
- 3 FAILED (BUG-1, BUG-2, BUG-3)
- 13 Edge Cases geprueft
- 9 PASSED
- 4 FAILED (BUG-3, BUG-4, BUG-5, BUG-6)
- 7 Bugs gefunden (1 Critical, 2 High, 1 Medium, 3 Low)
- 5 Security-Findings (1 Critical [vorbekannt], 2 High, 2 Medium)
- Feature ist **NICHT production-ready** (Critical + High Bugs muessen gefixt werden)

---

## Recommendations

### Must Fix vor Deployment (Critical/High):

1. **BUG-3 (Critical):** Geocoding nach Import reparieren - Koordinaten muessen in DB geschrieben werden. Ohne Fix haben importierte Stuetzpunkte keine Kartenposition.
2. **BUG-1 (High):** Update-Logik so aendern, dass nur gemappte Felder aktualisiert werden. Bestehende Werte duerfen nicht durch Defaults ueberschrieben werden.
3. **BUG-2 (High):** Transaktionales Verhalten implementieren (Supabase RPC) oder Spec aktualisieren und klare Kommunikation bei partiellem Import.

### Should Fix (Medium):

4. **BUG-6 (Medium):** Feldlaenge-Validierung (max. 500 Zeichen) einbauen.
5. **SEC-BUG-2 (High):** Rate Limiting auf Import-API hinzufuegen.
6. **SEC-BUG-5 (High):** Update-Autorisierung absichern (relevant fuer zukuenftige Multi-Tenant-Szenarien).

### Nice to Have (Low):

7. **BUG-4:** Header-Bestaetigungsdialog
8. **BUG-5:** Explizite Meldung bei 0 gueltigen Zeilen
9. **BUG-7:** Realistischerer Fortschrittsbalken
