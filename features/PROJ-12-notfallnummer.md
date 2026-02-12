# PROJ-12: Notfallnummer für Stützpunkte

## Status: 🔵 Planned

## Abhängigkeiten
- Benötigt: PROJ-2 (Stützpunkt-Verwaltung) - Basis-CRUD für Stützpunkte
- Benötigt: PROJ-8 (Mehrsprachigkeit) - i18n-System im Widget

## Kontext
Aktuell haben Stützpunkte nur ein Telefon-Feld (`telefon`). Zusätzlich wird eine optionale **Notfallnummer** benötigt, die im Admin gepflegt und im Widget neben der normalen Telefonnummer angezeigt wird.

## User Stories

- Als **Admin** möchte ich eine optionale Notfallnummer pro Stützpunkt erfassen können, damit Kunden im Notfall eine separate Nummer erreichen können.
- Als **Admin** möchte ich die Notfallnummer jederzeit ändern oder entfernen können, damit die Daten aktuell bleiben.
- Als **Website-Besucher** möchte ich die Notfallnummer eines Stützpunkts direkt auf der Karte/Card sehen, damit ich im Notfall schnell die richtige Nummer finde.
- Als **Website-Besucher (FR/IT)** möchte ich das Label der Notfallnummer in meiner Sprache sehen, damit ich es sofort verstehe.

## Acceptance Criteria

### Admin-Bereich
- [ ] Im Stützpunkt-Formular gibt es ein neues Feld "Notfallnummer" (type `tel`)
- [ ] Das Feld ist optional (kein Pflichtfeld)
- [ ] Das Feld befindet sich direkt unter dem bestehenden Telefon-Feld im Kontakt-Bereich
- [ ] Leere Eingabe und gültige Telefonnummern werden akzeptiert
- [ ] Die Notfallnummer wird beim Erstellen und Bearbeiten von Stützpunkten gespeichert

### Widget-Anzeige
- [ ] Die Notfallnummer wird neben/unter der normalen Telefonnummer in der LocationCard angezeigt
- [ ] Die Notfallnummer wird nur angezeigt, wenn sie gepflegt ist (nicht leer/null)
- [ ] Die Nummer ist als `tel:`-Link klickbar (wie die normale Telefonnummer)
- [ ] Ein dezentes Label "Notfall" / "Urgence" / "Emergenza" wird vor oder neben der Nummer angezeigt
- [ ] Das Label ist übersetzt (DE/FR/IT) gemäß aktiver Widget-Sprache

### Styling
- [ ] Das Styling ist dezent aber erkennbar – kleines Label, kein auffälliges rotes Icon
- [ ] Der Stil fügt sich in das bestehende Kontakt-Layout ein (gleiche Schriftgröße, gleicher Link-Stil)

### Datenbank
- [ ] Neues Feld `notfallnummer` (TEXT, nullable) in der Tabelle `stuetzpunkte`
- [ ] Migration-Datei `004_add_notfallnummer.sql` erstellt

### API
- [ ] POST/PUT-Endpoints akzeptieren das Feld `notfallnummer` (optional)
- [ ] GET-Endpoints (Admin + Widget) liefern das Feld mit aus
- [ ] Zod-Validierung: optionaler String, leerer String oder gültige Telefonnummer

## Edge Cases

- **Notfallnummer ohne normale Telefonnummer:** Kann nicht vorkommen, da `telefon` ein Pflichtfeld ist.
- **Nur Leerzeichen eingegeben:** Wird als leer/null behandelt (trimmen).
- **Sehr lange Nummer:** Keine spezielle Begrenzung nötig, da Telefonnummern-Feld auf der DB-Seite TEXT ist.
- **Gleiche Nummer wie Telefon:** Erlaubt – der Admin entscheidet, ob das sinnvoll ist.
- **Notfallnummer entfernen:** Feld leeren und speichern → wird auf NULL gesetzt, Widget zeigt nichts an.

## Betroffene Dateien (Referenz)

| Bereich | Datei |
|---------|-------|
| DB-Migration | `supabase/migrations/004_add_notfallnummer.sql` (neu) |
| TypeScript-Types | `src/widget/types.ts` |
| Admin-Formular | `src/components/stuetzpunkt-form.tsx` |
| API (CRUD) | `src/app/api/stuetzpunkte/route.ts` |
| API (Edit) | `src/app/api/stuetzpunkte/[id]/route.ts` |
| API (Widget) | `src/app/api/widget/stuetzpunkte/route.ts` |
| Widget-Card | `src/widget/components/LocationCard.tsx` |
| i18n DE | `src/widget/i18n/de.ts` |
| i18n FR | `src/widget/i18n/fr.ts` |
| i18n IT | `src/widget/i18n/it.ts` |

---

## Tech-Design (Solution Architect)

### Analyse der bestehenden Architektur

Das Feature ist ein **schlankes Erweiterungsfeature** -- es fuegt ein einzelnes optionales Feld zu einer bestehenden, gut strukturierten Infrastruktur hinzu. Alle benoetigten Muster (optionale Felder, bedingte Anzeige, i18n-Labels) existieren bereits im Projekt und koennen 1:1 wiederverwendet werden.

**Wichtige Erkenntnis:** Die Widget-API (`/api/widget/stuetzpunkte`) nutzt `SELECT *` -- das bedeutet, sobald das Feld in der Datenbank existiert, wird es automatisch an das Widget ausgeliefert. Hier ist keine Code-Aenderung noetig.

### Component-Struktur (Was aendert sich?)

#### Admin-Formular (bestehend, wird erweitert)

```
Stuetzpunkt-Formular
├── Basis-Informationen (unveraendert)
├── Adresse (unveraendert)
├── Kontakt                              <-- HIER wird erweitert
│   ├── [Zeile 1: 2-Spalten-Grid]
│   │   ├── Telefon * (bestehendes Pflichtfeld)
│   │   └── E-Mail (bestehendes optionales Feld)
│   ├── [Zeile 2: NEU]
│   │   └── Notfallnummer (neues optionales Feld, type tel)
│   └── Website (unveraendert)
├── Oeffnungszeiten (unveraendert)
├── Services (unveraendert)
└── Bild (unveraendert)
```

Das neue Feld "Notfallnummer" wird direkt unter dem Telefon/E-Mail-Grid eingefuegt, als eigene Zeile. Es folgt dem gleichen Muster wie die bestehenden optionalen Felder (E-Mail, Website).

#### Widget LocationCard (bestehend, wird erweitert)

```
LocationCard
├── Bild / Platzhalter (unveraendert)
└── Card-Body
    ├── Name + Status-Badge (unveraendert)
    ├── Adresse (unveraendert)
    ├── Kontakt-Bereich                  <-- HIER wird erweitert
    │   ├── Telefon-Link (bestehend)
    │   ├── Notfallnummer-Link (NEU)     <-- Nur sichtbar wenn gepflegt
    │   │   └── [Telefon-Icon] [Label "Notfall"] Nummer
    │   ├── E-Mail-Link (bestehend)
    │   └── Website-Link (bestehend)
    ├── Services (unveraendert)
    └── Oeffnungszeiten (unveraendert)
```

Die Notfallnummer erscheint direkt nach dem normalen Telefon-Link -- visuell zusammengehoerend, aber klar unterscheidbar durch das Label "Notfall" / "Urgence" / "Emergenza".

### Daten-Model

**Bestehendes Daten-Model (Stuetzpunkt) -- was sich aendert:**

```
Jeder Stuetzpunkt hat aktuell:
- Name, Adresse, Koordinaten, Status
- Telefon (Pflichtfeld)
- E-Mail (optional)
- Website (optional)
- Bild (optional)
- Oeffnungszeiten
- Services (Verknuepfung)

NEU dazukommt:
- Notfallnummer (optional, kann leer sein)
  → Wird als NULL gespeichert wenn nicht gepflegt
  → Gleicher Datentyp wie das bestehende Telefon-Feld
```

**Speicherort:** Supabase-Datenbank, Tabelle `stuetzpunkte` (besteht bereits).
Neue Migration `004_add_notfallnummer.sql` fuegt eine einzelne Spalte hinzu.

### Tech-Entscheidungen

| Entscheidung | Begruendung |
|---|---|
| **Ein Feld in bestehender Tabelle** statt eigene Tabelle | Die Notfallnummer gehoert direkt zum Stuetzpunkt. Eine eigene Tabelle waere Overengineering fuer ein einzelnes optionales Feld. |
| **Widget-API braucht keine Aenderung** | Die API nutzt bereits `SELECT *` -- das neue Feld wird automatisch mitgeliefert, sobald es in der Datenbank existiert. Das spart Entwicklungsaufwand. |
| **Gleiches Muster wie E-Mail-Feld** | E-Mail ist ebenfalls optional und nullable. Das gleiche Muster (Zod-Validierung, bedingte Anzeige im Widget, NULL-Behandlung) wird fuer die Notfallnummer wiederverwendet. Kein neues Pattern noetig. |
| **Label statt Icon zur Kennzeichnung** | Die Spec fordert "dezent aber erkennbar". Ein kleines Text-Label ("Notfall") ist intuitiver als ein zusaetzliches Icon und passt besser in das bestehende Kontakt-Layout. |
| **Bestehendes i18n-System nutzen** | Die drei Sprachdateien (DE/FR/IT) haben bereits das Key-Pattern `card.phone`, `card.email` etc. Ein neuer Key `card.emergency` fuegt sich nahtlos ein. |
| **Kein Frontend-seitiger Telefonnummer-Validator** | Telefonnummern sind international sehr unterschiedlich formatiert. Die Spec erlaubt bewusst freie Eingabe. Nur leere Strings werden zu NULL konvertiert (Trimming). |

### Dependencies

**Keine neuen Packages noetig.**

Alle benoetigten Tools sind bereits im Projekt vorhanden:
- Admin: shadcn/ui Input + Label (bereits importiert)
- Widget: Bestehendes CSS-System (kein neues Styling-Package)
- i18n: Bestehendes Uebersetzungssystem
- Validierung: Zod (bereits in den APIs genutzt)

### Betroffene Bereiche -- Uebersicht fuer Entwickler

| Bereich | Aenderungsart | Aufwand |
|---|---|---|
| **Datenbank-Migration** | Neue Datei: Eine Spalte hinzufuegen | Minimal |
| **Admin-Formular** | Bestehendes Formular: Ein Feld hinzufuegen (Muster von E-Mail kopieren) | Klein |
| **Admin TypeScript-Interface** | Feld `notfallnummer` zum bestehenden Interface hinzufuegen | Minimal |
| **API POST (Erstellen)** | Zod-Schema: Ein optionales Feld hinzufuegen, NULL-Behandlung | Klein |
| **API PUT (Bearbeiten)** | Zod-Schema: Ein optionales Feld hinzufuegen | Klein |
| **API GET Widget** | Keine Aenderung noetig (SELECT * liefert automatisch) | Keiner |
| **Widget Types** | `Stuetzpunkt`-Interface: Ein Feld hinzufuegen | Minimal |
| **Widget LocationCard** | Bedingte Anzeige hinzufuegen (Muster von E-Mail kopieren) | Klein |
| **i18n (DE/FR/IT)** | Je einen neuen Key `card.emergency` hinzufuegen | Minimal |

**Geschaetzter Gesamtaufwand:** Klein -- es werden ausschliesslich bestehende Patterns erweitert, keine neue Infrastruktur benoetigt.

---

## QA Test Results

**Tested:** 2026-02-12
**Methode:** Statische Code-Analyse (DB-Migration noch nicht auf Supabase ausgefuehrt)
**Branch:** fix/email-optional (unstaged changes)

## Acceptance Criteria Status

### AC-1: Admin-Bereich

- [x] Im Stuetzpunkt-Formular gibt es ein neues Feld "Notfallnummer" (type `tel`)
  - Bestaetigt: `stuetzpunkt-form.tsx` Zeile 338-345, `<Input id="notfallnummer" type="tel" ...>`
- [x] Das Feld ist optional (kein Pflichtfeld)
  - Bestaetigt: Kein `required`-Attribut auf dem Input. Zod-Schema: `z.string().optional().or(z.literal('')).nullable()`
- [x] Das Feld befindet sich direkt unter dem bestehenden Telefon-Feld im Kontakt-Bereich
  - Bestaetigt: Im Kontakt-Card nach dem Telefon/E-Mail-Grid, vor dem Website-Feld (Zeile 337-346)
- [x] Leere Eingabe und gueltige Telefonnummern werden akzeptiert
  - Bestaetigt: Zod-Schema akzeptiert optional, leeren String und nullable. POST-API trimmt und konvertiert zu NULL.
- [x] Die Notfallnummer wird beim Erstellen und Bearbeiten von Stuetzpunkten gespeichert
  - Bestaetigt: POST-Route (Zeile 100): `notfallnummer: stuetzpunktData.notfallnummer?.trim() || null`
  - Bestaetigt: PUT-Route (Zeile 78-79): Normalisierung mit `updateData.notfallnummer = updateData.notfallnummer?.trim() || null`

### AC-2: Widget-Anzeige

- [x] Die Notfallnummer wird neben/unter der normalen Telefonnummer in der LocationCard angezeigt
  - Bestaetigt: `LocationCard.tsx` Zeile 81-89, direkt nach dem Telefon-Link
- [x] Die Notfallnummer wird nur angezeigt wenn sie gepflegt ist (nicht leer/null)
  - Bestaetigt: `{sp.notfallnummer && (...)}` bedingte Anzeige (Zeile 81)
- [x] Die Nummer ist als `tel:`-Link klickbar (wie die normale Telefonnummer)
  - Bestaetigt: `<a href={`tel:${sp.notfallnummer}`}` (Zeile 82)
- [x] Ein dezentes Label "Notfall" / "Urgence" / "Emergenza" wird vor oder neben der Nummer angezeigt
  - Bestaetigt: `<span className="hsf-emergency-label">{t('card.emergency')}:</span>` (Zeile 86)
- [x] Das Label ist uebersetzt (DE/FR/IT) gemaess aktiver Widget-Sprache
  - Bestaetigt: DE `'card.emergency': 'Notfall'`, FR `'card.emergency': 'Urgence'`, IT `'card.emergency': 'Emergenza'`

### AC-3: Styling

- [x] Das Styling ist dezent aber erkennbar -- kleines Label, kein auffaelliges rotes Icon
  - Bestaetigt: `.hsf-emergency-label` CSS (Zeile 394-399): `font-size: 11px`, `font-weight: 600`, `text-transform: uppercase`, `letter-spacing: 0.03em`. Kein rotes Styling, keine spezielle Farbe.
- [x] Der Stil fuegt sich in das bestehende Kontakt-Layout ein (gleiche Schriftgroesse, gleicher Link-Stil)
  - Bestaetigt: Verwendet gleiche `hsf-card-link` Klasse wie Telefon/E-Mail/Website. Gleicher primaryColor-Style.

### AC-4: Datenbank

- [x] Neues Feld `notfallnummer` (TEXT, nullable) in der Tabelle `stuetzpunkte`
  - Bestaetigt: Migration `004_add_notfallnummer.sql`: `ALTER TABLE stuetzpunkte ADD COLUMN notfallnummer TEXT;` (TEXT ist per Default nullable)
- [x] Migration-Datei `004_add_notfallnummer.sql` erstellt
  - Bestaetigt: Datei existiert unter `supabase/migrations/004_add_notfallnummer.sql`

### AC-5: API

- [x] POST/PUT-Endpoints akzeptieren das Feld `notfallnummer` (optional)
  - Bestaetigt: Beide Zod-Schemas enthalten `notfallnummer: z.string().optional().or(z.literal('')).nullable()`
- [x] GET-Endpoints (Admin + Widget) liefern das Feld mit aus
  - Admin GET: Nutzt `select('*, stuetzpunkt_services(...)')` -- liefert automatisch alle Spalten inkl. notfallnummer
  - Widget GET: Nutzt ebenfalls `select('*, stuetzpunkt_services(...)')` -- liefert automatisch mit (keine Code-Aenderung noetig, korrekt laut Tech-Design)
- [x] Zod-Validierung: optionaler String, leerer String oder gueltige Telefonnummer
  - Bestaetigt: `z.string().optional().or(z.literal('')).nullable()` -- akzeptiert alle drei Varianten

## Edge Cases Status

### EC-1: Notfallnummer ohne normale Telefonnummer
- [x] Kann nicht vorkommen, da `telefon` ein Pflichtfeld ist
  - Bestaetigt: Zod POST-Schema hat `telefon: z.string().min(1, 'Telefon ist erforderlich')`, HTML-Input hat `required`

### EC-2: Nur Leerzeichen eingegeben
- [x] Wird als leer/null behandelt (trimmen)
  - Bestaetigt POST: `stuetzpunktData.notfallnummer?.trim() || null` (Zeile 100)
  - Bestaetigt PUT: `updateData.notfallnummer = updateData.notfallnummer?.trim() || null` (Zeile 79)

### EC-3: Sehr lange Nummer
- [x] Keine spezielle Begrenzung noetig (DB-Feld ist TEXT)
  - Bestaetigt: TEXT-Spalte in PostgreSQL hat keine Laengenbegrenzung. Zod-Schema hat ebenfalls kein `.max()`.

### EC-4: Gleiche Nummer wie Telefon
- [x] Erlaubt -- keine Validierung gegen Duplikate implementiert
  - Bestaetigt: Kein Code vergleicht `notfallnummer` mit `telefon`

### EC-5: Notfallnummer entfernen
- [x] Feld leeren und speichern -> wird auf NULL gesetzt, Widget zeigt nichts an
  - Bestaetigt PUT: Trim + NULL-Konvertierung
  - Bestaetigt Widget: `{sp.notfallnummer && (...)}` verhindert Anzeige bei null/leer

## Regression Test

### E-Mail-Feld (PROJ-2 Fix)
- [x] E-Mail-Anzeige im Widget war zuvor NICHT bedingt (immer angezeigt, auch wenn null)
  - BEHOBEN im gleichen Diff: `{sp.email && (...)}` wurde hinzugefuegt (war vorher ohne Bedingung)
  - Dies ist eine Verbesserung, kein Regression-Bug

### Bestehende Kontakt-Felder
- [x] Telefon-Link unveraendert (kein Regression-Risiko)
- [x] Website-Link unveraendert (war bereits bedingt mit `{sp.website && (...)}`)
- [x] Card-Layout und CSS-Klassen unveraendert (bestehende Klassen nicht modifiziert)

### Widget-API
- [x] `/api/widget/stuetzpunkte/route.ts` wurde NICHT geaendert (korrekt, SELECT * liefert neues Feld automatisch)

## Bugs Found

### BUG-1: SQL-Injection-Risiko in Supabase-Textsuche
- **Severity:** High
- **Datei:** `src/app/api/widget/stuetzpunkte/route.ts` Zeile 37 und `src/app/api/stuetzpunkte/route.ts` Zeile 49
- **Beschreibung:** Die Suchparameter werden direkt in den `.or()` Filter-String interpoliert:
  ```
  query = query.or(`name.ilike.%${search}%,plz.ilike.%${search}%,ort.ilike.%${search}%`)
  ```
  Ein Angreifer koennte ueber den `search`-Parameter spezielle Zeichen einschleusen, die die PostgREST-Filtersyntax manipulieren (z.B. Kommas, Klammern, Punkt-Notation).
- **Betroffenes Feature:** NICHT PROJ-12 spezifisch -- bestehendes Risiko in der Suchfunktion (PROJ-6)
- **Priority:** High (Security Issue -- bestehend, nicht durch PROJ-12 eingefuehrt)
- **Empfehlung:** Suchparameter sanitieren oder Supabase `.ilike()` Methodenaufrufe statt String-Interpolation verwenden.

### BUG-2: tel:-Link enthaelt unsanitisierte Telefonnummer
- **Severity:** Medium
- **Datei:** `src/widget/components/LocationCard.tsx` Zeile 82
- **Beschreibung:** Die Notfallnummer wird direkt in den `tel:`-Link eingebaut:
  ```
  <a href={`tel:${sp.notfallnummer}`}>
  ```
  Da der Admin-Bereich keine Telefonnummer-Validierung durchfuehrt (bewusste Designentscheidung laut Spec), koennte ein Admin theoretisch JavaScript oder andere Inhalte in das Feld eingeben. Browser-seitig ist `tel:` jedoch safe (wird nicht als JS ausgefuehrt), daher nur Medium.
- **Priority:** Medium (Defense-in-Depth)
- **Empfehlung:** Optional: Minimale Sanitisierung, die Nicht-Telefon-Zeichen entfernt (nur fuer den href, nicht fuer die Anzeige).

### BUG-3: Admin-API GET Einzelansicht liefert notfallnummer ohne explizite Feldauswahl
- **Severity:** Info (kein Bug, aber Hinweis)
- **Datei:** `src/app/api/stuetzpunkte/[id]/route.ts` Zeile 39-42
- **Beschreibung:** Der GET-Endpoint nutzt `select('*, stuetzpunkt_services(service_typ_id)')`. Das Sternchen liefert alle Spalten. Wenn kuenftig sensible Felder zur Tabelle hinzugefuegt werden, wuerden diese automatisch exponiert. Fuer PROJ-12 kein Problem, da `notfallnummer` keine sensiblen Daten enthaelt.
- **Priority:** Info (Best-Practice-Empfehlung fuer die Zukunft)

## Security-Pruefung (Red Team)

### Berechtigungen
- [x] POST/PUT/GET/DELETE Admin-APIs pruefen Auth: `supabase.auth.getUser()` mit 401-Response bei fehlender Authentifizierung
- [x] Widget-API ist oeffentlich (kein Auth) -- korrekt, da Widget eingebettet wird
- [ ] HINWEIS: Keine Rollen-basierte Autorisierung (RBAC). Jeder authentifizierte User kann alle Stuetzpunkte bearbeiten.

### Eingabevalidierung
- [x] Zod-Validierung auf POST und PUT vorhanden
- [x] Notfallnummer wird getrimmt und zu NULL konvertiert
- [ ] HINWEIS: Keine maximale Laengenbegrenzung auf `notfallnummer`. Ein Angreifer mit Admin-Zugang koennte extrem lange Strings speichern (DoS auf DB-Ebene unwahrscheinlich bei TEXT, aber Client-Rendering koennte leiden).

### XSS-Pruefung
- [x] React JSX escaped automatisch -- kein direktes XSS-Risiko durch `{sp.notfallnummer}` im Widget
- [x] `tel:`-Links fuehren kein JavaScript aus

### CORS
- [x] Widget-API setzt `Access-Control-Allow-Origin: *` -- bewusst offen fuer Cross-Origin Widget-Embedding

## Summary
- 17/17 Acceptance Criteria bestanden (Code-Review)
- 5/5 Edge Cases bestanden (Code-Review)
- 0 Critical Bugs gefunden (in PROJ-12 Scope)
- 1 High Bug gefunden (BUG-1: SQL-Injection-Risiko -- bestehendes Problem, nicht durch PROJ-12 eingefuehrt)
- 1 Medium Bug gefunden (BUG-2: tel:-Link Sanitisierung -- Defense-in-Depth)
- 1 Info-Hinweis (BUG-3: SELECT * Best Practice)
- Regression: E-Mail-Anzeige im Widget wurde korrigiert (Verbesserung)

## Offene Punkte (nicht testbar ohne laufende App)
- [ ] DB-Migration `004_add_notfallnummer.sql` muss noch auf Supabase ausgefuehrt werden
- [ ] Visueller Test: Styling der Notfallnummer in der LocationCard (Cross-Browser)
- [ ] Responsive Test: Mobile (375px), Tablet (768px), Desktop (1440px)
- [ ] Funktionaler End-to-End-Test: Admin-Formular -> Speichern -> Widget-Anzeige
- [ ] Build-Artefakt pruefen: `public/widget/storefinder.js` und `storefinder.css` muessen nach Build aktuell sein

## Recommendation

**Feature ist aus Code-Sicht production-ready** (keine Critical/High Bugs im PROJ-12 Scope).

Vor dem Deployment:
1. DB-Migration `004_add_notfallnummer.sql` auf Supabase ausfuehren
2. Visuellen End-to-End-Test nach Migration durchfuehren
3. Optional: BUG-2 (tel:-Sanitisierung) als Defense-in-Depth-Massnahme implementieren
4. Separates Ticket fuer BUG-1 (SQL-Injection in Suche) erstellen -- betrifft alle Features mit Suchfunktion
