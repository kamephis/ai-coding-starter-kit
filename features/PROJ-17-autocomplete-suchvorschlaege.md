# PROJ-17: Autocomplete Suchvorschlaege

## Status: Planned

## Abhaengigkeiten
- Benoetigt: PROJ-6 (Storefinder Suche & Filter) - bestehende Suchleiste wird erweitert
- Benoetigt: PROJ-16 (Erweiterte Textsuche) - Suchlogik ueber 5 Felder ist Voraussetzung
- Benoetigt: PROJ-8 (Mehrsprachigkeit) - Vorschlaege muessen in allen 3 Sprachen funktionieren

## Beschreibung

Die Suchleiste im Storefinder-Widget zeigt aktuell keine Vorschlaege waehrend der Eingabe. Der User muss seinen Suchbegriff vollstaendig eintippen und auf die gefilterte Liste warten. Dieses Feature ergaenzt eine Autocomplete-Dropdown-Liste unterhalb des Suchfelds, die ab 3 eingegebenen Zeichen passende Stuetzpunkte als Vorschlaege anzeigt. Die Vorschlaege basieren rein auf den bereits client-seitig geladenen Stuetzpunkt-Daten (kein zusaetzlicher API-Call). Bei Auswahl eines Vorschlags wird direkt zum Stuetzpunkt navigiert (Karte zentrieren + Card selektieren).

**Abgrenzung zur bestehenden Suche (PROJ-16):** Die bestehende Textsuche filtert die gesamte Liste und loest ggf. Geocoding aus. Autocomplete ist ein ergaenzendes UI-Element, das schnelle Direktnavigation zu einem konkreten Stuetzpunkt ermoeglicht -- ohne die bestehende Suchlogik zu ersetzen. Die bestehende Suche per Enter/Debounce bleibt unveraendert.

## User Stories

- Als Website-Besucher moechte ich beim Tippen in die Suchleiste sofort passende Stuetzpunkte als Vorschlaege sehen, um schnell den gewuenschten Standort zu finden, ohne die gesamte Liste durchscrollen zu muessen
- Als Website-Besucher moechte ich auf einen Vorschlag klicken koennen, um direkt auf der Karte dorthin zu navigieren und die Detail-Card zu sehen, statt den Suchbegriff manuell fertig tippen zu muessen
- Als Website-Besucher moechte ich die Vorschlagsliste per Tastatur navigieren koennen (Pfeiltasten, Enter, Escape), um das Widget effizient ohne Maus bedienen zu koennen
- Als Website-Besucher moechte ich in den Vorschlaegen sehen, welcher Teil meiner Eingabe gematcht hat (Hervorhebung), um die Relevanz der Vorschlaege schnell einschaetzen zu koennen
- Als Website-Besucher moechte ich neben dem Stuetzpunkt-Namen auch die Adresse im Vorschlag sehen, um bei mehreren gleichnamigen Stuetzpunkten den richtigen auswaehlen zu koennen
- Als Website-Besucher auf einem Mobilgeraet moechte ich die Vorschlaege per Touch auswaehlen koennen, ohne dass die Liste durch den virtuellen Tastatur-Aufbau verdeckt wird

## Acceptance Criteria

### Vorschlaege anzeigen

- [ ] Ab 3 eingegebenen Zeichen erscheint eine Dropdown-Liste unterhalb des Suchfelds mit passenden Stuetzpunkt-Vorschlaegen
- [ ] Bei weniger als 3 Zeichen wird keine Dropdown-Liste angezeigt
- [ ] Maximal 5 Vorschlaege werden gleichzeitig angezeigt
- [ ] Die Vorschlaege basieren ausschliesslich auf den client-seitig geladenen Stuetzpunkt-Daten (Array `stuetzpunkte` im State) -- kein zusaetzlicher API-Call
- [ ] Die Suche matcht case-insensitive ueber die 5 Felder: `name`, `plz`, `ort`, `strasse`, `hausnummer` (konsistent mit PROJ-16)
- [ ] Jeder Vorschlag zeigt den Stuetzpunkt-Namen als Haupttext und die vollstaendige Adresse (Strasse Hausnummer, PLZ Ort) als Subtitle
- [ ] Der matchende Teil des Suchbegriffs wird in den Vorschlaegen fett hervorgehoben (`<strong>` oder CSS `font-weight: bold`)
- [ ] Duplikate werden nicht zusammengefasst: Jeder Stuetzpunkt ist ein eigener Vorschlag, auch wenn mehrere Stuetzpunkte im gleichen Ort sind
- [ ] Die Vorschlagsliste wird bei jedem Tastendruck sofort aktualisiert (kein Debounce fuer die Vorschlaege -- die bestehende 300ms-Debounce betrifft nur die Haupt-Suchlogik in App.tsx)

### Auswahl und Navigation

- [ ] Bei Klick/Tap auf einen Vorschlag wird die Karte auf den Stuetzpunkt zentriert (flyTo) und die Detail-Card wird selektiert (geoeffnet)
- [ ] Bei Auswahl eines Vorschlags wird der Suchtext im Inputfeld durch den Namen des gewaehlten Stuetzpunkts ersetzt
- [ ] Nach Auswahl eines Vorschlags schliesst sich die Dropdown-Liste
- [ ] Die bestehende Suchlogik (Text-Filterung + Geocoding aus PROJ-16) wird durch den ersetzten Suchtext ausgeloest, sodass die Ergebnisliste konsistent zum selektierten Stuetzpunkt passt

### Keyboard-Navigation

- [ ] Pfeiltaste Unten: Naechster Vorschlag wird hervorgehoben (visueller Fokus)
- [ ] Pfeiltaste Oben: Vorheriger Vorschlag wird hervorgehoben
- [ ] Enter: Der aktuell hervorgehobene Vorschlag wird ausgewaehlt (gleiche Aktion wie Klick)
- [ ] Enter ohne hervorgehobenen Vorschlag: Bestehende Suchlogik wird ausgeloest (normales Verhalten beibehalten)
- [ ] Escape: Dropdown-Liste wird geschlossen, Suchtext bleibt erhalten, Fokus bleibt im Inputfeld
- [ ] Bei Keyboard-Navigation wird der hervorgehobene Vorschlag visuell unterscheidbar dargestellt (z.B. Hintergrundfarbe)
- [ ] Keyboard-Navigation wrapt nicht: Am Anfang/Ende der Liste stoppt die Navigation

### Dropdown-Verhalten

- [ ] Klick ausserhalb der Suchleiste und Dropdown-Liste schliesst die Vorschlaege (Suchtext bleibt erhalten)
- [ ] Erneuter Fokus auf das Suchfeld oeffnet die Vorschlaege wieder (sofern Suchtext >= 3 Zeichen und Treffer vorhanden)
- [ ] Loeschen des Suchfelds (Clear-Button oder manuell) schliesst die Dropdown-Liste
- [ ] Die Dropdown-Liste ueberlagert darunterliegende Inhalte (z-index), ohne das Layout zu verschieben (position: absolute)
- [ ] Die Dropdown-Liste hat einen sichtbaren Rand/Schatten, um sie vom Rest der Seite abzuheben

### Accessibility (a11y)

- [ ] Das Suchfeld hat das ARIA-Attribut `role="combobox"` mit `aria-expanded` (true/false je nach Dropdown-Status)
- [ ] Die Dropdown-Liste hat `role="listbox"` und jeder Vorschlag hat `role="option"`
- [ ] Der aktuell hervorgehobene Vorschlag wird per `aria-activedescendant` auf dem Input referenziert
- [ ] Screenreader koennen die Vorschlaege vorlesen und navigieren

### Styling

- [ ] Die Dropdown-Liste verwendet das bestehende Widget-Design-System (CSS-Variablen `--hsf-*`, `hsf-` Prefix fuer Klassen)
- [ ] Hover-Zustand auf Vorschlaegen: Hintergrundfarbe aendert sich (z.B. `var(--hsf-neutral-100)`)
- [ ] Keyboard-Fokus-Zustand: Gleiche Hervorhebung wie Hover
- [ ] Der Stuetzpunkt-Name (Haupttext) ist in normaler Schriftgroesse (14px, konsistent mit Suchfeld)
- [ ] Die Adresse (Subtitle) ist in kleinerer Schriftgroesse (12px) und gedaempfter Farbe (z.B. `var(--hsf-neutral-500)`)
- [ ] Styling ist rein ueber Widget-CSS (plain CSS in `styles.css`), kein Tailwind

### i18n

- [ ] Vorschlaege funktionieren in allen 3 Sprachen (DE/FR/IT) ohne sprachspezifische Anpassung (die Stuetzpunkt-Daten sind bereits in der aktuellen Sprache geladen)
- [ ] Falls keine Vorschlaege gefunden werden (>= 3 Zeichen, aber 0 Treffer), wird kein leeres Dropdown angezeigt -- die Dropdown-Liste bleibt geschlossen

## Edge Cases

- **Schnelles Tippen:** Bei schneller Eingabe (z.B. "Heizmann" schnell getippt) muss die Vorschlagsliste ruckelfrei aktualisiert werden. Da die Filterung client-seitig auf max. ~500 Eintraegen laeuft, ist Performance unkritisch. Kein Debounce noetig fuer die Vorschlaege.
- **Gleichnamige Stuetzpunkte:** Wenn mehrere Stuetzpunkte "Heizmann" heissen, werden alle als separate Vorschlaege mit jeweils unterschiedlicher Adresse angezeigt. Der User kann anhand der Adresse unterscheiden.
- **Suchbegriff matcht in Adressfeld, nicht im Namen:** Beispiel: Suche "Basel" matcht im `ort`-Feld. Der Name "Heizmann AG" hat kein Highlighting, aber "Basel" im Adress-Subtitle wird hervorgehoben. Das ist korrektes Verhalten.
- **Highlight ueber Feldgrenzen:** Der Suchbegriff wird pro Feld gematcht. Wenn "4000" im PLZ-Feld matcht, wird "4000" im Subtitle hervorgehoben. Es gibt kein felduebergreifendes Highlighting.
- **NULL/leere Felder:** Wenn `strasse` oder `hausnummer` bei einem Stuetzpunkt NULL/leer ist, wird die Adresse entsprechend formatiert (z.B. nur "4000 Basel" statt "null null, 4000 Basel"). Kein Crash bei fehlenden Feldern.
- **Alle 5 Vorschlaege identischer Name:** Unwahrscheinlich, aber moeglich. Die Adresse im Subtitle ermoeglicht die Unterscheidung.
- **Clear-Button waehrend Dropdown offen:** Klick auf den bestehenden Clear-Button (X im Suchfeld) leert den Text und schliesst die Dropdown-Liste.
- **Touch-Geraete:** Auf Mobilgeraeten muss die Dropdown-Liste ueber der virtuellen Tastatur sichtbar sein. Da die Dropdown-Liste direkt unter dem Suchfeld positioniert ist und das Suchfeld in der Regel oben auf der Seite liegt, sollte dies der Standardfall sein.
- **Widget in kleinem Container:** Wenn das Widget in einem schmalen Container eingebettet ist (min-width 300px), muss die Dropdown-Liste die volle Breite des Suchfelds einnehmen und nicht ueberlaufen.
- **Sonderzeichen in Stuetzpunkt-Daten:** Stuetzpunkt-Namen oder Adressen mit Sonderzeichen (Umlaute, Bindestriche, Apostrophe) muessen korrekt angezeigt und hervorgehoben werden. HTML-Encoding fuer `<strong>`-Tags darf keine XSS-Luecke oeffnen (React JSX escaped automatisch).
- **Vorschlag waehlen waehrend Geocoding laeuft:** Wenn der User einen Vorschlag waehlt, waehrend ein Geocoding-Request aus der normalen Suche noch laeuft, soll die Direktnavigation Vorrang haben. Ein evtl. spaeter eintreffendes Geocoding-Ergebnis darf die Kartenposition nicht ueberschreiben.
- **Sortierung der Vorschlaege:** Wenn `userLocation` verfuegbar ist (Browser-Geolocation oder vorheriges Geocoding), werden die Vorschlaege nach Entfernung zum User sortiert (naechster zuerst). Ohne `userLocation` werden Vorschlaege in der Reihenfolge der Stuetzpunkt-Daten angezeigt (wie vom Server geliefert).
- **Interaktion mit Service-Filtern:** Autocomplete-Vorschlaege beruecksichtigen aktive Service-Filter. Wenn der User z.B. nur "Heizoel" als Service-Filter aktiv hat, werden nur Stuetzpunkte mit diesem Service als Vorschlaege angezeigt.
- **Interaktion mit bestehender Debounce:** Die SearchBar hat intern eine 300ms Debounce auf den `onChange`-Callback (der die Hauptsuche ausloest). Die Autocomplete-Vorschlaege muessen sofort auf den lokalen `input`-State reagieren, NICHT auf den debounced `searchText` aus App.tsx. Die Vorschlaege muessen also innerhalb der SearchBar-Komponente (oder einer neuen Autocomplete-Komponente) auf den ungedebouncten Input-Wert reagieren.

## Nicht im Scope

- Nominatim-Ortsvorschlaege (z.B. "Bern" als Ort-Autocomplete) -- nur Stuetzpunkt-Daten werden vorgeschlagen
- Fuzzy-Search / Tippfehler-Korrektur bei den Vorschlaegen
- Such-History / Letzte Suchanfragen anzeigen
- Server-seitige Autocomplete-API
- Vorschlaege fuer Service-Typen (z.B. "Heizoel" als Service-Vorschlag)
- Gruppierung/Kategorisierung der Vorschlaege nach Typ (z.B. Ueberschriften "Stuetzpunkte" / "Orte")

## Technische Anforderungen

- Performance: Vorschlaege muessen innerhalb von < 16ms gerendert werden (ein Frame bei 60fps), da rein client-seitige String-Filterung auf max. ~500 Eintraegen
- Kein zusaetzliches npm-Package: Autocomplete wird mit bestehenden Bordmitteln (React State, plain CSS) implementiert
- CSS-Klassen mit `hsf-` Prefix (Widget-Konvention)
- Widget-CSS in `src/widget/styles.css` (plain CSS, kein Tailwind)
- ARIA-konform: `role="combobox"`, `role="listbox"`, `role="option"`, `aria-activedescendant`
