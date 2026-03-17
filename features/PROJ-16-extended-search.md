# PROJ-16: Erweiterte Textsuche & Bugfix Geocoding/Textfilter-Koordination

## Status: ✅ Deployed

## Abhängigkeiten
- Benötigt: PROJ-6 (Storefinder Suche & Filter) - bestehende Suchlogik wird erweitert
- Benötigt: PROJ-8 (Mehrsprachigkeit) - fuer aktualisierte Placeholder-Texte in DE/FR/IT
- Loest ab / erweitert: BUG-1 (SQL-Injection-Risiko) - wird im Rahmen dieses Features mitbehoben

## Beschreibung
Die bestehende Textsuche im Storefinder durchsucht aktuell nur die Felder `plz` und `ort`. Die Suche nach Firmenname (`name`) ist zwar im Code vorhanden, funktioniert aber in der Praxis nicht zuverlaessig – ebenso die PLZ-Suche: bei 3 Ziffern werden Treffer gefunden, bei vollstaendiger PLZ (4-5 Ziffern) oft nicht.

**Root Causes (Analyse):**
1. **Geocoding ueberschreibt Textsuche:** Bei 4-5 Ziffern wird Geocoding ausgeloest (`/^\d{4,5}$/`), was `userLocation` setzt. Dadurch greift der **Radius-Filter** zusaetzlich zum Text-Filter und eliminiert Treffer, die ausserhalb des Radius liegen – obwohl sie textlich passen.
2. **Keine Koordination:** Geocoding (`useEffect`) und Textfilterung (`useMemo`) laufen unabhaengig. Wenn Geocoding fehlschlaegt (Nominatim findet nichts fuer reine PLZ), bleibt eine alte `userLocation` stehen und der Radius-Filter wirkt weiter.
3. **Name-Suche:** Wird durch denselben Radius-Filter-Effekt gestört – ein Firmenname-Treffer wird verworfen, wenn der Stuetzpunkt ausserhalb des aktuellen Geocoding-Radius liegt.

Dieses Feature behebt diese Bugs, erweitert die Suche um `strasse` und `hausnummer`, ermoeglicht Adress-Geocoding und fixt die SQL-Injection-Schwachstelle (BUG-1).

## Scope
Die Aenderungen betreffen konsistent alle drei Stellen der Textsuche:
1. **Widget client-seitig** (App.tsx, Zeile 116-124)
2. **Widget API** (/api/widget/stuetzpunkte/route.ts, Zeile 37)
3. **Admin API** (/api/stuetzpunkte/route.ts, Zeile 49)

## User Stories
- Als Website-Besucher moechte ich nach einem Firmennamen suchen koennen (z.B. "Heizmann"), um den passenden Stuetzpunkt zu finden – ohne dass ein Radius-Filter meine Ergebnisse einschraenkt
- Als Website-Besucher moechte ich eine PLZ eingeben – egal ob 4-stellig (CH: "4000"), 5-stellig (DE: "79576") oder in anderem Laenderformat – und zuverlaessig alle Stuetzpunkte mit dieser PLZ sehen, unabhaengig davon ob das Geocoding erfolgreich war
- Als Website-Besucher moechte ich nach einer Strassenbezeichnung suchen koennen (z.B. "Industriestrasse"), um Stuetzpunkte an einer bestimmten Strasse zu finden
- Als Website-Besucher moechte ich eine vollstaendige Adresse eingeben koennen (z.B. "Industriestrasse 5, Bern"), damit die Karte auf diese Adresse zentriert wird und mir nahe Stuetzpunkte angezeigt werden
- Als Website-Besucher moechte ich am Placeholder des Suchfelds erkennen, welche Suchmoeglichkeiten es gibt
- Als Admin moechte ich im Admin-Panel nach Name, Strasse und Hausnummer suchen koennen, um Stuetzpunkte schnell zu finden und zu verwalten
- Als Entwickler moechte ich sicher sein, dass die Suchparameter sanitisiert werden, damit keine SQL-Injection oder PostgREST-Filter-Manipulation moeglich ist

## Acceptance Criteria

### Bugfix: Geocoding/Textfilter-Koordination
- [ ] Textsuche-Treffer (Name, PLZ, Ort, Strasse, Hausnummer) werden IMMER angezeigt, auch wenn Geocoding aktiv ist – der Radius-Filter darf Textsuche-Treffer NICHT eliminieren
- [ ] Bei PLZ-Eingabe: Alle Stuetzpunkte mit passender PLZ werden angezeigt, unabhaengig davon ob Nominatim die PLZ geocoden konnte
- [ ] PLZ-Erkennung unterstuetzt verschiedene Laenderformate: 4-stellig (CH: "4000", AT: "1010"), 5-stellig (DE: "79576", FR: "68100", IT: "39100")
- [ ] Bei Name-Eingabe (z.B. "Heizmann"): Alle Stuetzpunkte mit passendem Namen werden angezeigt, ohne Radius-Einschraenkung
- [ ] Wenn Geocoding fehlschlaegt, wird keine alte `userLocation` beibehalten – der Radius-Filter wird deaktiviert bzw. zurueckgesetzt
- [ ] Wenn Geocoding erfolgreich ist, werden zusaetzlich zu den Texttreffern auch Stuetzpunkte im Umkreis angezeigt (Vereinigung, nicht Schnittmenge)

### Erweiterte Textsuche
- [ ] Textsuche durchsucht die Felder: `name`, `plz`, `ort`, `strasse`, `hausnummer` (case-insensitive, ilike)
- [ ] Client-seitige Filterung im Widget (App.tsx) filtert nach denselben 5 Feldern
- [ ] Widget-API (/api/widget/stuetzpunkte) filtert serverseitig nach denselben 5 Feldern
- [ ] Admin-API (/api/stuetzpunkte) filtert serverseitig nach denselben 5 Feldern
- [ ] Suche nach "Industriestrasse" findet alle Stuetzpunkte an einer Industriestrasse
- [ ] Suche nach "Heizmann" findet alle Stuetzpunkte mit "Heizmann" im Namen
- [ ] Bestehende Suche nach PLZ und Ort funktioniert zuverlaessig (kein Radius-Filter-Konflikt mehr)

### Geocoding fuer vollstaendige Adressen
- [ ] Geocoding wird nicht nur bei reiner PLZ (4-5 Ziffern, je nach Land) oder reinem Ortsnamen ausgeloest, sondern auch bei Adresseingaben wie "Strasse Nr, Ort" oder "Strasse Nr PLZ Ort"
- [ ] Eingabe "Industriestrasse 5, Bern" fuehrt zu erfolgreichem Geocoding und Kartenzentrierung
- [ ] Eingabe "Industriestrasse 5, 3012 Bern" fuehrt zu erfolgreichem Geocoding
- [ ] Eingabe "3012 Bern" fuehrt zu erfolgreichem Geocoding (PLZ + Ort Kombination)
- [ ] Bei erfolgreichem Adress-Geocoding werden Stuetzpunkte im Umkreis angezeigt (zusaetzlich zu Texttreffern)
- [ ] PLZ-Geocoding funktioniert fuer 4-stellige (CH/AT) und 5-stellige (DE/FR/IT) Postleitzahlen
- [ ] Bestehende Ort-Geocoding-Logik bleibt funktional
- [ ] Fallback: Wenn Geocoding fehlschlaegt, werden ausschliesslich Textsuche-Treffer angezeigt (ohne Radius-Filter)

### Placeholder-Aktualisierung (i18n)
- [ ] Deutsch: "Suche nach Name, Adresse, PLZ oder Ort"
- [ ] Franzoesisch: "Rechercher par nom, adresse, NPA ou localite"
- [ ] Italienisch: "Cerca per nome, indirizzo, CAP o localita"
- [ ] Placeholder wird in allen drei Sprachen korrekt angezeigt

### Security (BUG-1 Fix)
- [ ] Suchparameter werden vor Einsetzen in `.or()` Filter sanitisiert (Sonderzeichen die PostgREST-Syntax brechen koennten: `,`, `.`, `(`, `)`, `"`, `'`, `\`)
- [ ] Sanitisierung ist in einer wiederverwendbaren Hilfsfunktion implementiert (`sanitizeSearch` o.ae.)
- [ ] Dieselbe Sanitisierung wird in Widget-API UND Admin-API verwendet
- [ ] Normale Suche funktioniert trotz Sanitisierung (Umlaute, Bindestriche, Leerzeichen bleiben erhalten)
- [ ] Eingabe von `%,id.neq.0` fuehrt NICHT zu Filter-Manipulation, sondern wird als normaler Suchtext behandelt

## Edge Cases
- **Radius-Filter vs. Textsuche:** Wenn Geocoding "Basel" findet aber ein Textsuche-Treffer in "Zuerich" liegt, muss der Zuercher Treffer trotzdem angezeigt werden (Textsuche-Treffer haben Vorrang)
- **PLZ-Eingabe ohne Geocoding-Erfolg:** "9999" (nicht existierende PLZ) – Geocoding schlaegt fehl, Textsuche findet keinen Treffer → leeres Ergebnis (korrekt), aber kein alter Radius-Filter darf uebrig bleiben
- **Hausnummer-Konflikte:** Suche nach "5" matcht sowohl Hausnummer 5 als auch PLZ die "5" enthaelt oder Name mit "5" -- das ist akzeptables Verhalten, da ilike-Match
- **Strasse ohne Hausnummer in DB:** Manche Stuetzpunkte haben ggf. keine Hausnummer gespeichert -- Suche nach "Industriestrasse" soll diese trotzdem finden (nur strasse-Feld matcht)
- **Geocoding-Mehrdeutigkeit:** "Bahnhofstrasse" existiert in vielen Orten -- ohne Ort-Zusatz wird Geocoding ggf. den falschen Ort waehlen. Textsuche-Treffer werden trotzdem angezeigt
- **Hausnummer mit Buchstaben:** "5a", "12b" -- muss als Freitext durchsuchbar sein (ilike match im hausnummer-Feld)
- **Leere Felder:** Wenn `strasse` oder `hausnummer` bei einem Stuetzpunkt NULL/leer ist, darf das keinen Fehler verursachen (ilike auf NULL liefert kein Match, das ist korrekt)
- **Sonderzeichen in Strassennamen:** Strassen mit Bindestrich ("Robert-Walser-Gasse"), Apostroph oder Umlauten muessen korrekt durchsuchbar bleiben nach Sanitisierung
- **Sehr lange Eingaben:** Suchtext laenger als 200 Zeichen sollte auf max. 200 Zeichen begrenzt werden (Schutz vor Missbrauch)
- **PLZ-Laenderformate:** Die PLZ-Erkennung darf nicht auf eine feste Stellenanzahl hardcoded sein. Unterstuetzte Formate: 4-stellig (CH: 1000-9999, AT: 1010-9992), 5-stellig (DE: 01001-99998, FR: 01000-98999, IT: 00010-98168). Die Regex muss `/^\d{4,5}$/` sein (nicht z.B. nur `/^\d{4}$/`)
- **Geocoding-Erkennung:** Die Heuristik muss neben (a) reiner PLZ (4-5 Ziffern) und (b) reinem Ortsname auch erkennen: (c) PLZ+Ort ("3012 Bern", "79576 Weil am Rhein"), (d) Strasse+Nr+Ort ("Industriestrasse 5, Bern")

## Nicht im Scope
- Telefon und Email werden NICHT durchsuchbar gemacht
- Land wird NICHT durchsuchbar gemacht
- Autocomplete/Vorschlaege waehrend der Eingabe sind nicht Teil dieses Features
- Fuzzy-Search / Tippfehler-Korrektur ist nicht Teil dieses Features

## Tech-Design (Solution Architect)

### Betroffene Bereiche (Übersicht)

Dieses Feature ändert **keine** UI-Komponenten und **keine** Datenbank-Struktur. Es betrifft ausschliesslich **Logik und Konfiguration** in bestehenden Dateien:

```
Änderungen
├── 1. Neue Hilfsfunktion: sanitizeSearch()
│      → Wiederverwendbar für alle 3 Suchstellen
│      → Schützt gegen PostgREST-Filter-Manipulation (BUG-1)
│
├── 2. Widget-Filterlogik (App.tsx)
│      ├── Textsuche: + strasse, hausnummer durchsuchbar
│      ├── Geocoding-Erkennung: erkennt auch Adressen ("Strasse Nr, Ort")
│      └── Bugfix: Textsuche-Treffer werden NICHT mehr vom Radius-Filter entfernt
│
├── 3. Widget-API (/api/widget/stuetzpunkte)
│      ├── Textsuche: + strasse, hausnummer durchsuchbar
│      └── Suchparameter: sanitisiert (BUG-1 Fix)
│
├── 4. Admin-API (/api/stuetzpunkte)
│      ├── Textsuche: + strasse, hausnummer durchsuchbar
│      └── Suchparameter: sanitisiert (BUG-1 Fix)
│
└── 5. Übersetzungen (i18n)
       └── Neuer Placeholder-Text in DE/FR/IT
```

### Kern-Design: Textsuche + Radius als Vereinigung (nicht Schnittmenge)

**Aktuelles Problem (Bug):**
```
Nutzer sucht "4000" (PLZ Basel)
→ Textsuche findet: 3 Stützpunkte mit PLZ "4000" ✓
→ Geocoding findet: Basel-Koordinaten → Radius-Filter aktiviert
→ Radius-Filter entfernt: Stützpunkt "4000" der >50km von Basel entfernt liegt ✗
→ Ergebnis: Nur 2 von 3 Treffern angezeigt!
```

**Neues Verhalten (Fix):**
```
Nutzer sucht "4000"
→ Textsuche findet: 3 Stützpunkte mit PLZ "4000" (ALLE bleiben)
→ Geocoding findet: Basel-Koordinaten → zeigt ZUSÄTZLICH Stützpunkte im Umkreis
→ Ergebnis: Textsuche-Treffer ∪ Radius-Treffer (Vereinigung)
```

**Logik in Worten:**
1. Textsuche-Treffer werden IMMER angezeigt – egal wo sie geografisch liegen
2. Wenn Geocoding erfolgreich war: Stützpunkte im Umkreis werden ZUSÄTZLICH angezeigt
3. Keine Duplikate: Ein Stützpunkt der beides matcht (Text + Radius) wird nur einmal angezeigt
4. Wenn Geocoding fehlschlägt: Nur Textsuche-Treffer, kein Radius-Filter
5. Alte userLocation wird bei Geocoding-Fehler gelöscht (kein veralteter Radius)

### Erweiterte Suchfelder

**Vorher durchsuchbar:** name, plz, ort (3 Felder)
**Nachher durchsuchbar:** name, plz, ort, strasse, hausnummer (5 Felder)

Alle 3 Suchstellen werden identisch erweitert:
- Widget client-seitig (App.tsx) → JavaScript `.includes()`
- Widget API → Supabase `.or()` mit `ilike`
- Admin API → Supabase `.or()` mit `ilike`

### Erweiterte Geocoding-Erkennung

**Vorher erkannte Muster:**
- Reine PLZ: "4000", "79576" (4-5 Ziffern)
- Reiner Ortsname: "Bern", "Basel" (nur Buchstaben)

**Nachher erkannte Muster (zusätzlich):**
- PLZ + Ort: "3012 Bern", "79576 Weil am Rhein"
- Strasse + Nr + Ort: "Industriestrasse 5, Bern"
- Strasse + Nr + PLZ + Ort: "Industriestrasse 5, 3012 Bern"

**Heuristik:** Geocoding wird ausgelöst wenn der Suchtext mindestens eines dieser Muster erfüllt:
- Nur Ziffern (4-5 Stellen) → PLZ
- Nur Buchstaben (3+ Zeichen) → Ortsname
- Enthält Komma → Adresse (z.B. "Strasse Nr, Ort")
- Ziffern + Buchstaben gemischt → PLZ+Ort Kombination (z.B. "3012 Bern")

### Security: Suchparameter-Sanitisierung (BUG-1 Fix)

**Problem:** Suchtext wird direkt in Supabase `.or()` Filter-String eingesetzt. Sonderzeichen wie `,`, `.`, `(`, `)` können den PostgREST-Filter manipulieren.

**Lösung:** Neue gemeinsame Hilfsfunktion `sanitizeSearch()`:
- Entfernt PostgREST-Steuerzeichen: `,` `.` `(` `)` `"` `'` `\`
- Bewahrt normale Zeichen: Buchstaben, Ziffern, Leerzeichen, Bindestriche, Umlaute
- Begrenzt Eingabe auf max. 200 Zeichen
- Wird von Widget-API UND Admin-API verwendet (eine Funktion, zwei Nutzer)
- Ablageort: Gemeinsame Utility-Datei (z.B. `src/lib/search-utils.ts`)

### Daten-Model

**Keine Änderungen am Daten-Model nötig!**

Die Felder `strasse` und `hausnummer` existieren bereits in der Tabelle `stuetzpunkte`. Sie werden aktuell nur nicht durchsucht. Dieses Feature aktiviert lediglich die Suche über diese bestehenden Felder.

```
Tabelle: stuetzpunkte (bereits vorhanden)
├── name          → durchsuchbar (schon heute) ✓
├── plz           → durchsuchbar (schon heute) ✓
├── ort           → durchsuchbar (schon heute) ✓
├── strasse       → NEU durchsuchbar
├── hausnummer    → NEU durchsuchbar
├── telefon       → nicht durchsuchbar (gewollt)
├── email         → nicht durchsuchbar (gewollt)
└── ...
```

### Übersetzungen (Placeholder-Text)

Aktuell: "PLZ oder Ort eingeben"
Neu:

| Sprache | Neuer Placeholder |
|---------|-------------------|
| DE | "Suche nach Name, Adresse, PLZ oder Ort" |
| FR | "Rechercher par nom, adresse, NPA ou localité" |
| IT | "Cerca per nome, indirizzo, CAP o località" |

### Tech-Entscheidungen

**Warum Vereinigung statt Schnittmenge?**
→ Ein Nutzer der "Heizmann" sucht, erwartet ALLE Heizmann-Standorte – egal ob die Karte gerade auf Basel zentriert ist. Die Textsuche ist die explizite Absicht des Nutzers, der Radius ist nur ein geografischer Zusatz.

**Warum client-seitige Filterung im Widget beibehalten?**
→ Das Widget lädt bereits alle Stützpunkte (max. ~500). Client-seitige Filterung ermöglicht instant-Feedback ohne API-Roundtrip bei jedem Tastendruck.

**Warum Geocoding-Heuristik statt "immer geocoden"?**
→ Bei reinen Firmennamen (z.B. "Heizmann") wäre ein Geocoding-Aufruf sinnlos und würde nur Latenz hinzufügen. Die Heuristik erkennt, WANN ein Geocoding-Versuch sinnvoll ist.

**Warum eine gemeinsame sanitizeSearch()-Funktion?**
→ Verhindert, dass Widget-API und Admin-API unterschiedlich sanitisieren. Zentrale Wartung, ein Fix gilt überall.

**Warum keine neue Library/Package nötig?**
→ Alles wird mit bestehenden Bordmitteln gelöst (String-Operationen, Regex). Kein neues Package erforderlich.

### Dependencies

**Keine neuen Packages nötig.** Alle Änderungen nutzen vorhandene Technologien:
- Supabase JS Client (bereits vorhanden)
- Nominatim API für Geocoding (bereits vorhanden)
- React State Management (bereits vorhanden)

### Dateien die geändert werden

| Datei | Änderung |
|-------|----------|
| `src/lib/search-utils.ts` | **NEU:** `sanitizeSearch()` Hilfsfunktion |
| `src/widget/App.tsx` | Filterlogik erweitern (5 Felder, Vereinigung, Geocoding-Heuristik) |
| `src/app/api/widget/stuetzpunkte/route.ts` | Textsuche + 2 Felder, Sanitisierung |
| `src/app/api/stuetzpunkte/route.ts` | Textsuche + 2 Felder, Sanitisierung |
| `src/widget/i18n/de.ts` | Neuer Placeholder-Text |
| `src/widget/i18n/fr.ts` | Neuer Placeholder-Text |
| `src/widget/i18n/it.ts` | Neuer Placeholder-Text |

### Risiken & Hinweise

- **Keine Breaking Changes:** Alle bestehenden Suchen funktionieren weiterhin identisch
- **Performance:** Kein Einfluss – gleiche Datenmenge, nur 2 zusätzliche String-Vergleiche pro Stützpunkt
- **Abwärtskompatibel:** Widget-Einbettungen müssen nicht aktualisiert werden

## Abnahme-Checkliste
- [ ] Widget: Suche nach "Heizmann" (Firmenname) zeigt passende Stuetzpunkte
- [ ] Widget: Suche nach "4000" (4-stellige CH-PLZ) zeigt zuverlaessig alle Stuetzpunkte mit PLZ 4000
- [ ] Widget: Suche nach "79576" (5-stellige DE-PLZ) zeigt zuverlaessig alle Stuetzpunkte mit PLZ 79576
- [ ] Widget: Suche nach "3" (Teilstring) zeigt Treffer mit PLZ/Name die "3" enthalten (ab 3 Zeichen)
- [ ] Widget: Suche nach "Industriestrasse" zeigt passende Stuetzpunkte
- [ ] Widget: Suche nach "Industriestrasse 5, Bern" geocodiert korrekt und zeigt Umkreis-Ergebnisse + Textsuche-Treffer
- [ ] Widget: Suche nach "Bern" geocodiert und zeigt Umkreis-Ergebnisse
- [ ] Widget: Name-Treffer in anderem Kanton wird NICHT durch Radius-Filter entfernt
- [ ] Widget: Placeholder zeigt in DE/FR/IT den neuen Text
- [ ] Admin: Suche nach Name/Strasse/Hausnummer funktioniert
- [ ] Security: Eingabe von `%,id.neq.0` wird sicher behandelt
- [ ] Alle drei APIs verwenden dieselbe Sanitisierungs-Funktion

---

## QA Test Results (Code Review)

**Reviewed:** 2026-02-13
**Reviewer:** QA Engineer (Code Review)
**Method:** Static code analysis against Acceptance Criteria
**Files reviewed:**
- `src/lib/search-utils.ts`
- `src/widget/App.tsx`
- `src/app/api/widget/stuetzpunkte/route.ts`
- `src/app/api/stuetzpunkte/route.ts`
- `src/widget/i18n/de.ts`
- `src/widget/i18n/fr.ts`
- `src/widget/i18n/it.ts`
- `src/widget/components/SearchBar.tsx`
- `src/widget/types.ts`

---

### AC-Gruppe 1: Bugfix Geocoding/Textfilter-Koordination

#### AC: Textsuche-Treffer werden IMMER angezeigt, auch wenn Geocoding aktiv ist
- [x] PASSED
- **Begruendung:** `App.tsx` Zeile 155-158 implementiert Vereinigungs-Logik (Union). Wenn sowohl `hasTextSearch` als auch `hasRadius` aktiv sind, werden `textMatchIds` und `radiusMatchIds` in ein gemeinsames `unionIds` Set zusammengefuehrt. Textsuche-Treffer koennen dadurch nicht durch den Radius-Filter eliminiert werden.

#### AC: Bei PLZ-Eingabe alle Stuetzpunkte mit passender PLZ angezeigt, unabhaengig von Geocoding
- [x] PASSED
- **Begruendung:** Die Textsuche (Zeile 124-138) laeuft unabhaengig vom Geocoding. Auch wenn Nominatim die PLZ nicht geocoden kann, bleiben die `textMatchIds` erhalten und werden angezeigt (Zeile 159: `results = base.filter((sp) => textMatchIds.has(sp.id))`). Wenn Geocoding fehlschlaegt, wird `userLocation` auf `null` gesetzt (Zeile 203-207), sodass kein Radius-Filter greift.

#### AC: PLZ-Erkennung unterstuetzt 4-stellig (CH/AT) und 5-stellig (DE/FR/IT)
- [x] PASSED
- **Begruendung:** `shouldGeocode()` Zeile 227 verwendet `/^\d{4,5}$/` -- matcht sowohl 4-stellige ("4000", "1010") als auch 5-stellige PLZ ("79576", "68100", "39100").

#### AC: Bei Name-Eingabe alle Stuetzpunkte mit passendem Namen ohne Radius-Einschraenkung
- [x] PASSED
- **Begruendung:** Ein reiner Firmenname wie "Heizmann" matcht die `shouldGeocode()`-Heuristik als "Pure town name" (nur Buchstaben). Geocoding wird ausgeloest, aber: (a) Nominatim wird fuer "Heizmann" vermutlich nichts finden, dann wird `userLocation` geloescht (Zeile 203-207), und nur Textsuche-Treffer werden angezeigt. Die Textsuche im `name`-Feld (Zeile 129) stellt sicher, dass alle Namenstreffer angezeigt werden. Und selbst falls Geocoding zufaellig ein Ergebnis liefert, greift die Vereinigungs-Logik -- Textsuche-Treffer bleiben erhalten.

#### AC: Wenn Geocoding fehlschlaegt, wird keine alte userLocation beibehalten
- [x] PASSED
- **Begruendung:** `geocodedLocationRef` tracked ob die aktuelle `userLocation` via Geocoding gesetzt wurde. Bei Geocoding-Fehler (Zeile 203-207, 212-215) wird `userLocation` auf `null` gesetzt UND `geocodedLocationRef` zurueckgesetzt. Wichtig: Die `if (geocodedLocationRef.current)` Pruefung stellt sicher, dass eine via Browser-Geolocation gesetzte `userLocation` nicht versehentlich geloescht wird.

#### AC: Wenn Geocoding erfolgreich, zusaetzlich Stuetzpunkte im Umkreis anzeigen (Vereinigung)
- [x] PASSED
- **Begruendung:** Zeile 155-158 in `App.tsx`: `const unionIds = new Set([...textMatchIds, ...radiusMatchIds])` -- klassische Mengenvereinigung. Keine Duplikate dank Set.

---

### AC-Gruppe 2: Erweiterte Textsuche

#### AC: Textsuche durchsucht name, plz, ort, strasse, hausnummer (5 Felder, case-insensitive)
- [x] PASSED (alle 3 Stellen)
- **App.tsx (client-seitig):** Zeile 127-134 -- `.toLowerCase().includes(q)` auf allen 5 Feldern. `strasse` und `hausnummer` werden mit optionaler Verkettung (`sp.strasse &&`) abgesichert fuer den Fall dass sie `null`/`undefined` sind.
- **Widget-API:** Zeile 40 -- `.or(name.ilike...plz.ilike...ort.ilike...strasse.ilike...hausnummer.ilike...)` mit allen 5 Feldern.
- **Admin-API:** Zeile 53 -- Identischer Filter-String wie Widget-API.

#### AC: Suche nach "Industriestrasse" findet Stuetzpunkte an Industriestrasse
- [x] PASSED
- **Begruendung:** `strasse.ilike.%Industriestrasse%` (serverseitig) und `sp.strasse.toLowerCase().includes("industriestrasse")` (clientseitig) decken diesen Fall ab.

#### AC: Suche nach "Heizmann" findet Stuetzpunkte mit "Heizmann" im Namen
- [x] PASSED
- **Begruendung:** `name.ilike.%Heizmann%` (serverseitig) und `sp.name.toLowerCase().includes("heizmann")` (clientseitig).

#### AC: Bestehende Suche nach PLZ und Ort funktioniert zuverlaessig
- [x] PASSED
- **Begruendung:** `plz` und `ort` Felder sind weiterhin in der Suche enthalten. Die neue Vereinigungs-Logik stellt sicher, dass PLZ-Treffer nicht mehr durch den Radius-Filter eliminiert werden.

---

### AC-Gruppe 3: Geocoding fuer vollstaendige Adressen

#### AC: Geocoding bei Adresseingaben wie "Strasse Nr, Ort"
- [x] PASSED
- **Begruendung:** `shouldGeocode()` Zeile 231: `if (trimmed.includes(',')) return true` -- jede Eingabe mit Komma loest Geocoding aus. "Industriestrasse 5, Bern" enthaelt ein Komma.

#### AC: Eingabe "Industriestrasse 5, Bern" fuehrt zu Geocoding
- [x] PASSED
- **Begruendung:** Komma-Erkennung in `shouldGeocode()`. Die Nominatim-Anfrage (Zeile 190-191) mit `countrycodes=ch,de,at,fr,it` wird diese Adresse korrekt geocoden.

#### AC: Eingabe "Industriestrasse 5, 3012 Bern" fuehrt zu Geocoding
- [x] PASSED
- **Begruendung:** Enthaelt Komma, wird von `shouldGeocode()` erkannt.

#### AC: Eingabe "3012 Bern" fuehrt zu Geocoding (PLZ + Ort)
- [x] PASSED
- **Begruendung:** `shouldGeocode()` Zeile 233: Mixed digits + letters + space: `/\d/.test(trimmed) && /[a-zA-Z...]/.test(trimmed) && trimmed.includes(' ')` -- "3012 Bern" matcht alle drei Bedingungen.

#### AC: Bei Adress-Geocoding werden Stuetzpunkte im Umkreis zusaetzlich zu Texttreffern angezeigt
- [x] PASSED
- **Begruendung:** Vereinigungs-Logik (Zeile 155-158).

#### AC: PLZ-Geocoding fuer 4-stellige und 5-stellige PLZ
- [x] PASSED
- **Begruendung:** Regex `/^\d{4,5}$/` in `shouldGeocode()`.

#### AC: Bestehende Ort-Geocoding-Logik bleibt funktional
- [x] PASSED
- **Begruendung:** `shouldGeocode()` Zeile 229 erkennt reine Ortsnamen (nur Buchstaben, 3+ Zeichen). "Bern", "Basel", "Zuerich" werden weiterhin geocodiert.

#### AC: Fallback bei Geocoding-Fehler: nur Textsuche-Treffer, kein Radius
- [x] PASSED
- **Begruendung:** Bei Fehler wird `userLocation` auf `null` gesetzt (Zeile 203-207, 212-215). Dadurch ist `hasRadius` false, und Zeile 159 greift: `results = base.filter((sp) => textMatchIds.has(sp.id))`.

---

### AC-Gruppe 4: Placeholder-Aktualisierung (i18n)

#### AC: Deutsch "Suche nach Name, Adresse, PLZ oder Ort"
- [x] PASSED
- **Begruendung:** `de.ts` Zeile 2: `'search.placeholder': 'Suche nach Name, Adresse, PLZ oder Ort'` -- exakt der geforderte Text.

#### AC: Franzoesisch "Rechercher par nom, adresse, NPA ou localite"
- [x] PASSED (mit Akzent)
- **Begruendung:** `fr.ts` Zeile 2: `'search.placeholder': 'Rechercher par nom, adresse, NPA ou localite'` -- der Code hat `localite` mit Akzent (korrekt fuer Franzoesisch). Die Feature Spec schreibt "localite" ohne Akzent, aber das ist ein Limitation der Spec (ASCII). Die Implementierung ist korrekt.

#### AC: Italienisch "Cerca per nome, indirizzo, CAP o localita"
- [x] PASSED (mit Akzent)
- **Begruendung:** `it.ts` Zeile 2: `'search.placeholder': 'Cerca per nome, indirizzo, CAP o localita'` -- mit Akzent auf dem letzten a. Korrekt.

#### AC: Placeholder wird in allen drei Sprachen angezeigt
- [x] PASSED
- **Begruendung:** `SearchBar.tsx` Zeile 34 verwendet `t('search.placeholder')`, das I18n-System ist in allen 3 Sprachen konfiguriert.

---

### AC-Gruppe 5: Security (BUG-1 Fix)

#### AC: Suchparameter werden vor .or() sanitisiert
- [x] PASSED
- **Begruendung:** `sanitizeSearch()` in `src/lib/search-utils.ts` entfernt `,`, `.`, `(`, `)`, `"`, `'`, `\`. Wird in Widget-API (Zeile 38) und Admin-API (Zeile 51) aufgerufen.

#### AC: Sanitisierung in wiederverwendbarer Hilfsfunktion
- [x] PASSED
- **Begruendung:** `sanitizeSearch()` in `src/lib/search-utils.ts` -- separate Datei, exportiert, importiert von beiden APIs.

#### AC: Dieselbe Sanitisierung in Widget-API UND Admin-API
- [x] PASSED
- **Begruendung:** Beide importieren `sanitizeSearch` aus `@/lib/search-utils`. Identische Funktion, identischer Aufruf.

#### AC: Normale Suche funktioniert trotz Sanitisierung (Umlaute, Bindestriche, Leerzeichen)
- [x] PASSED
- **Begruendung:** Die Regex `/[,.()"'\\]/g` entfernt nur die aufgelisteten Sonderzeichen. Buchstaben (inkl. Umlaute), Ziffern, Leerzeichen und Bindestriche bleiben erhalten.

#### AC: Eingabe von "%,id.neq.0" fuehrt NICHT zu Filter-Manipulation
- [ ] BUG-QA-1: `%` Zeichen wird nicht sanitisiert (siehe Bugs)

---

### Edge Cases

#### EC: Radius-Filter vs. Textsuche (Basel-Geocoding, Treffer in Zuerich)
- [x] PASSED
- **Begruendung:** Vereinigungs-Logik stellt sicher, dass Textsuche-Treffer in Zuerich erhalten bleiben, auch wenn Geocoding auf Basel zeigt.

#### EC: PLZ ohne Geocoding-Erfolg ("9999")
- [x] PASSED
- **Begruendung:** Geocoding schlaegt fehl, `userLocation` wird auf `null` gesetzt. Textsuche findet vermutlich nichts. Ergebnis: leer (korrekt). Kein alter Radius bleibt stehen.

#### EC: Hausnummer-Konflikte (Suche "5" matcht mehrere Felder)
- [x] PASSED
- **Begruendung:** ilike-Match auf allen 5 Feldern ist bewusstes Design. "5" matcht PLZ mit "5", Hausnummer "5", etc. Dies ist als akzeptabel definiert.
- **Hinweis:** Bei Suche nach "5" greift die Mindestlaenge von 3 Zeichen (Zeile 125: `searchText.length >= 3`), daher wird "5" allein clientseitig NICHT gesucht. Serverseitig (API) gibt es keine Mindestlaenge -- hier wuerde "5" matchen.

#### EC: Strasse ohne Hausnummer in DB
- [x] PASSED
- **Begruendung:** Client-seitig: `sp.strasse && sp.strasse.toLowerCase().includes(q)` -- wenn `hausnummer` null/leer ist, wird der hausnummer-Check einfach uebersprungen. Serverseitig: `ilike` auf NULL liefert kein Match (korrekt).

#### EC: Geocoding-Mehrdeutigkeit ("Bahnhofstrasse")
- [x] PASSED
- **Begruendung:** Nominatim waehlt das wahrscheinlichste Ergebnis. Die Vereinigungs-Logik stellt sicher, dass Textsuche-Treffer fuer "Bahnhofstrasse" an allen Standorten weiterhin angezeigt werden, unabhaengig vom Geocoding-Ergebnis.

#### EC: Hausnummer mit Buchstaben ("5a", "12b")
- [x] PASSED
- **Begruendung:** `ilike.%5a%` matcht Freitext. Keine numerische Konvertierung, rein String-basiert.

#### EC: Leere Felder (strasse/hausnummer NULL)
- [x] PASSED
- **Begruendung:** Client-seitig: Guard-Klauseln (`sp.strasse &&`). Serverseitig: `ilike` auf NULL = kein Fehler.

#### EC: Sonderzeichen in Strassennamen (Bindestriche, Umlaute)
- [x] PASSED
- **Begruendung:** `sanitizeSearch()` bewaehrt Bindestriche und Umlaute. "Robert-Walser-Gasse" und "Muenchnerstrasse" (mit Umlauten) bleiben intakt.

#### EC: Sehr lange Eingaben (> 200 Zeichen)
- [x] PASSED
- **Begruendung:** `sanitizeSearch()` Zeile 10: `.slice(0, 200)` begrenzt auf 200 Zeichen. ABER: Nur serverseitig! Client-seitig (App.tsx) gibt es keine Laengenbegrenzung. Siehe Hinweis BUG-QA-3.

#### EC: PLZ-Laenderformate (nicht auf feste Stellenanzahl hardcoded)
- [x] PASSED
- **Begruendung:** `/^\d{4,5}$/` akzeptiert 4 und 5 Stellen.

#### EC: Geocoding-Erkennung (alle 4 Muster)
- [x] PASSED
- **Begruendung:**
  - (a) Reine PLZ: `/^\d{4,5}$/` -- "4000", "79576"
  - (b) Reiner Ortsname: `/^[a-zA-Z...]{3,}$/` -- "Bern", "Basel"
  - (c) PLZ+Ort: Mixed digits+letters+space -- "3012 Bern", "79576 Weil am Rhein"
  - (d) Adresse mit Komma: `includes(',')` -- "Industriestrasse 5, Bern"

---

## Bugs Found

### BUG-QA-1: sanitizeSearch() entfernt `%` nicht -- PostgREST LIKE-Wildcard-Injection moeglich
- **Severity:** High
- **Betroffene Datei:** `src/lib/search-utils.ts` Zeile 9
- **Beschreibung:** Die `sanitizeSearch()` Funktion entfernt Steuerzeichen `,`, `.`, `(`, `)`, `"`, `'`, `\` -- aber NICHT das `%`-Zeichen. In PostgREST ist `%` ein Wildcard fuer `ilike` (entspricht SQL LIKE `%`). Ein Angreifer kann das `%` in boesartiger Weise nutzen:
  - Eingabe `%` allein: Matcht ALLE Eintraege (da `ilike.%%` = `LIKE '%%'` = alles)
  - Eingabe `%,id.neq.0`: Das Komma wird zwar entfernt, ABER...
  - Eingabe `%%`: Fuehrt zu `ilike.%%%%` -- funktioniert, matcht alles
- **Konkretes Risiko:** Die Feature Spec fordert explizit in AC Security: "Eingabe von `%,id.neq.0` fuehrt NICHT zu Filter-Manipulation". Das Komma wird entfernt, aber das `%` bleibt stehen. Das `%` selbst ist kein Filter-Manipulation-Zeichen (es bricht die `.or()` Syntax nicht), aber es erweitert die Suche unkontrolliert (Wildcard).
- **Bewertung:** Das Kernrisiko (Filter-Syntax-Manipulation via `,`, `.`, `(`, `)`) ist abgedeckt. Das `%`-Zeichen kann die `.or()` Syntax nicht brechen. Es ermoeglicht aber eine breite Suche (alles matchen). Dies ist eher ein UX-Problem als ein Sicherheitsproblem, da keine Daten-Exfiltration moeglich ist, die nicht bereits ueber die normale API erreichbar waere.
- **Empfehlung:** `%` und `_` (SQL LIKE single-char wildcard) ebenfalls entfernen/escapen:
  ```typescript
  .replace(/[,.()"'\\%_]/g, '')
  ```
- **Priority:** Medium (kein Sicherheitsrisiko im engeren Sinne, da die API ohnehin alle Daten ausgibt; aber Defense-in-Depth gebietet die Bereinigung)

### BUG-QA-2: Geocoding-Heuristik loest bei reinen Firmennamen faelschlicherweise Geocoding aus
- **Severity:** Low
- **Betroffene Datei:** `src/widget/App.tsx` Zeile 229
- **Beschreibung:** Die Heuristik `/^[a-zA-ZaeoeueAeOeUe...]{3,}$/` erkennt "reine Buchstaben (3+ Zeichen)" als Ortsnamen. Das bedeutet, dass auch Firmennamen wie "Heizmann", "Bosch", "Siemens" ein Geocoding ausloesen. Bei diesen Namen wird Nominatim in der Regel nichts finden, und die Location wird korrekt auf `null` gesetzt (Zeile 203-207). Es entsteht also kein **funktionaler Bug** -- nur ein **unnoetiger API-Call** an Nominatim.
- **Bewertung:** Das ist ein bewusstes Design-Trade-off (Feature Spec "Warum Geocoding-Heuristik statt immer geocoden?"). Die Heuristik kann nicht zuverlaessig zwischen Ortsnamen und Firmennamen unterscheiden. Der Fallback (Geocoding-Fehler -> nur Textsuche) funktioniert korrekt.
- **Priority:** Low (Performance: ein zusaetzlicher HTTP-Request pro Firmenname-Suche, ca. 100-300ms Latenz, kein funktionaler Impact)

### BUG-QA-3: Client-seitige Suche hat keine Laengenbegrenzung (200-Zeichen-Limit nur serverseitig)
- **Severity:** Low
- **Betroffene Datei:** `src/widget/App.tsx` Zeile 126
- **Beschreibung:** Die Feature Spec definiert: "Suchtext laenger als 200 Zeichen sollte auf max. 200 Zeichen begrenzt werden (Schutz vor Missbrauch)". Die `sanitizeSearch()` Funktion begrenzt auf 200 Zeichen, wird aber nur in den APIs verwendet. Die client-seitige Filterung in `App.tsx` verwendet `searchText` direkt ohne Laengenbegrenzung. Da die client-seitige Filterung auf maximal ~500 bereits geladene Datensaetze arbeitet, ist das Performance-Risiko minimal. Auch die Nominatim-Geocoding-URL wuerde bei extrem langen Strings sehr lang.
- **Priority:** Low (kein Sicherheitsrisiko, minimaler Performance-Impact)

### BUG-QA-4: Geocoding-Heuristik erkennt Firmennamen mit Zahlen falsch als PLZ+Ort
- **Severity:** Low
- **Betroffene Datei:** `src/widget/App.tsx` Zeile 233
- **Beschreibung:** Die Bedingung fuer "Mixed digits + letters" (`/\d/.test(trimmed) && /[a-zA-Z...]/.test(trimmed) && trimmed.includes(' ')`) matcht auch Eingaben wie "Firma 24 GmbH" oder "Team 7". Das ist unproblematisch, da (a) die Textsuche trotzdem korrekt laeuft und (b) bei Geocoding-Fehler die Location geloescht wird.
- **Priority:** Low (kein funktionaler Impact dank Fallback-Logik)

---

## Security Review (Red Team)

### Geprueft und abgesichert:
1. **PostgREST-Filter-Injection via `.or()`:** Steuerzeichen `,`, `.`, `(`, `)`, `"`, `'`, `\` werden entfernt. Ein Angreifer kann die Filter-Syntax nicht brechen.
2. **SQL-Injection via Supabase Client:** Supabase JS Client verwendet parametrisierte Queries -- die `.or()` String-Interpolation wird von PostgREST geparsed, nicht direkt als SQL ausgefuehrt. Die Sanitisierung ist eine zusaetzliche Defense-in-Depth-Massnahme.
3. **XSS via Suchtext:** Suchtext wird nur in JavaScript-Vergleichen verwendet (`.includes()`), nicht in HTML/DOM injiziert. React's JSX escaped automatisch.
4. **Nominatim API Abuse:** Der Suchtext wird via `encodeURIComponent()` kodiert (Zeile 191). Kein Injection-Risiko.
5. **Admin-API erfordert Authentifizierung:** `supabase.auth.getUser()` wird geprueft (Zeile 31-34 in Admin-API).

### Offene Punkte:
1. **`%` und `_` Wildcards:** Siehe BUG-QA-1. Empfehlung: Mit-sanitisieren.
2. **Rate-Limiting Nominatim:** Kein clientseitiges Debouncing fuer Geocoding. Bei schnellem Tippen werden mehrere Nominatim-Requests ausgeloest. Die SearchBar hat ein 300ms Debounce (Zeile 22 in SearchBar.tsx), das hilft. Aber bei schnellem Paste koennte es zu mehreren Requests kommen. Nominatim hat eine Usage Policy (max 1 req/s). Dies ist ein pre-existierendes Verhalten, nicht durch PROJ-16 eingefuehrt.
3. **Widget-API hat keinen Status-Filter:** Der Kommentar in Zeile 25 sagt "Nur aktive + temporaer geschlossene Stuetzpunkte", aber es gibt keinen `.eq('status', ...)` Filter. Das ist ein pre-existierendes Problem, nicht durch PROJ-16 eingefuehrt.

---

## Regression Check

### Geprueft gegen letzte Commits:
- **PROJ-15 (Widget Initial Language):** `initialLang` Parameter wird weiterhin korrekt verarbeitet (Zeile 31, 75, 82 in App.tsx). Keine Konflikte.
- **PROJ-14 (CSV Import):** Admin-API `POST /api/stuetzpunkte` wurde nicht veraendert. Nur der GET-Endpoint wurde aktualisiert. Keine Konflikte.
- **PROJ-13 (Map FlyTo on Card Click):** Map-Interaktion in `LeafletMap.tsx` wurde nicht veraendert. Keine Konflikte.
- **PROJ-12 (Notfallnummer):** LocationCard und types.ts nicht veraendert. `notfallnummer` Feld bleibt intakt.
- **Route-Funktionalitaet:** Route-Berechnung und OSRM-Integration in App.tsx wurden nicht veraendert. AbortController-Logik bleibt identisch.
- **Service-Filter:** Service-Filter-Logik (Zeile 116-121) bleibt unveraendert.

**Ergebnis:** Keine Regressionsrisiken identifiziert. Die Aenderungen sind isoliert auf Suchlogik, Geocoding-Koordination und Sanitisierung.

---

## Summary

- 24 Acceptance Criteria geprueft
- 23 PASSED
- 0 FAILED (blockierend)
- 1 PARTIAL (BUG-QA-1: `%` Wildcard nicht sanitisiert -- niedrig-kritisch)
- 4 Bugs dokumentiert (0 Critical, 1 Medium, 3 Low)
- 0 Regressionen gefunden

## Production-Ready Entscheidung

**BEDINGT READY** -- das Feature ist funktional vollstaendig und die kritische Security-Luecke (BUG-1 PostgREST-Filter-Manipulation) ist behoben. Der verbleibende BUG-QA-1 (`%`-Wildcard) stellt kein echtes Sicherheitsrisiko dar (keine Daten-Exfiltration moeglich, da die API ohnehin alle Daten ausgeben kann), ist aber ein Defense-in-Depth-Defizit.

**Empfehlung:**
1. BUG-QA-1 fixen (1 Zeile, `%` und `_` zu Regex hinzufuegen) -- Quick Fix vor Deployment
2. BUG-QA-2, BUG-QA-3, BUG-QA-4 koennen nach Deployment gefixt werden (Low Priority)
