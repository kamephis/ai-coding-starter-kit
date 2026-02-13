# PROJ-15: Widget initiale Sprache per Embed-Parameter

## Status: 🔵 Planned

## Abhängigkeiten
- Benötigt: PROJ-8 (Mehrsprachigkeit) - i18n-System muss vorhanden sein
- Benötigt: PROJ-4 (Widget-Konfiguration) - Snippet-Generator muss aktualisiert werden

## Beschreibung
Das Widget soll per `data-lang` Attribut auf dem Container-Element eine initiale Sprache erhalten können. Dies ermöglicht es, das Widget auf sprachspezifischen CMS-Seiten (z.B. FR-Version der Heizmann-Website) direkt in der richtigen Sprache anzuzeigen. Zusätzlich soll der Language Switcher per `data-hide-lang-switcher` ausblendbar sein.

## User Stories
- Als CMS-Redakteur möchte ich dem Widget per `data-lang="fr"` die Sprache meiner Seite mitgeben, damit der Storefinder sofort in der richtigen Sprache erscheint
- Als Website-Besucher auf der FR-Seite möchte ich den Storefinder direkt auf Französisch sehen, ohne manuell die Sprache wechseln zu müssen
- Als CMS-Redakteur möchte ich den Sprachwechsel-Button ausblenden können, wenn die Sprache durch die Seite vorgegeben ist
- Als Admin möchte ich im Snippet-Generator optional eine Sprache und Switcher-Sichtbarkeit konfigurieren können

## Embed-Format

### Nur initiale Sprache setzen (Switcher bleibt sichtbar):
```html
<div id="heizmann-storefinder" data-lang="fr"></div>
<script src="https://[app-url]/widget/storefinder.js"></script>
```

### Sprache setzen und Switcher ausblenden:
```html
<div id="heizmann-storefinder" data-lang="fr" data-hide-lang-switcher="true"></div>
<script src="https://[app-url]/widget/storefinder.js"></script>
```

### Ohne Parameter (bisheriges Verhalten):
```html
<div id="heizmann-storefinder"></div>
<script src="https://[app-url]/widget/storefinder.js"></script>
```

## Neue Sprach-Erkennungs-Priorität

| Priorität | Quelle | Beschreibung |
|-----------|--------|-------------|
| 1 (höchste) | `data-lang` Attribut | Embed-Parameter auf dem Container-Element |
| 2 | localStorage | Vorherige User-Auswahl (nur wenn kein `data-lang` gesetzt) |
| 3 | Browser-Sprache | `navigator.language` (z.B. "fr-CH" → "fr") |
| 4 | Widget-Config API | `default_language` aus Admin-Einstellungen |
| 5 (niedrigste) | Fallback | "de" |

**Wichtig:** Wenn `data-lang` gesetzt ist, hat es IMMER Vorrang — auch vor localStorage. Das stellt sicher, dass das Widget auf der FR-Seite immer Französisch anzeigt, selbst wenn der User zuvor auf einer anderen Seite DE gewählt hat.

## Acceptance Criteria
- [ ] Widget liest `data-lang` Attribut vom Container-Element `#heizmann-storefinder`
- [ ] Gültige Werte für `data-lang`: `"de"`, `"fr"`, `"it"` (case-insensitive)
- [ ] `data-lang` hat höchste Priorität bei der Spracherkennung (vor localStorage und Browser)
- [ ] Ungültiger `data-lang` Wert (z.B. `"en"`) wird ignoriert → Fallback auf bisherige Logik
- [ ] Widget liest `data-hide-lang-switcher` Attribut vom Container-Element
- [ ] Bei `data-hide-lang-switcher="true"` wird der LanguageSwitcher im Header nicht gerendert
- [ ] Ohne `data-hide-lang-switcher` oder bei Wert `"false"` bleibt Switcher sichtbar
- [ ] Wenn Switcher sichtbar und User Sprache wechselt, wird die neue Sprache in localStorage gespeichert
- [ ] Beim nächsten Laden greift trotzdem wieder `data-lang` (nicht localStorage)
- [ ] Snippet-Generator im Admin zeigt optionale `data-lang` und `data-hide-lang-switcher` Parameter
- [ ] Widget funktioniert weiterhin korrekt ohne jegliche data-Attribute (Rückwärtskompatibilität)

## Edge Cases
- Was passiert bei `data-lang="EN"` (Grossbuchstaben)? → Normalisierung zu Kleinbuchstaben, dann Validierung
- Was passiert bei `data-lang="fr-CH"` (mit Region)? → Nur Hauptsprache extrahieren: "fr"
- Was passiert bei `data-lang=""` (leerer String)? → Ignorieren, bisherige Logik verwenden
- Was passiert bei `data-lang="en"` (nicht unterstützte Sprache)? → Ignorieren, bisherige Logik verwenden
- Was passiert wenn `data-hide-lang-switcher` ohne Wert gesetzt ist (`<div data-hide-lang-switcher>`)? → Als `"true"` behandeln (HTML-Boolean-Attribut-Konvention)
- Was passiert wenn User Sprache per Switcher wechselt und dann Seite neu lädt? → `data-lang` greift wieder (gewolltes Verhalten für CMS-Seiten)

## Technische Anforderungen
- Attribute werden in `main.tsx` vom Container-Element gelesen und als Props an die App weitergegeben
- Keine zusätzlichen API-Calls nötig
- Keine Bundle-Size-Erhöhung (nur wenige Zeilen Code)
- Rückwärtskompatibel: Bestehendes Embed ohne data-Attribute funktioniert unverändert

---

## Tech-Design (Solution Architect)

### Betroffene Bereiche

Dieses Feature betrifft zwei Bereiche:
1. **Widget** (das eingebettete Storefinder-Widget auf Kunden-Websites)
2. **Admin Panel** (der Snippet-Generator in den Einstellungen)

Es werden **keine neuen Dateien** erstellt. Alle Aenderungen finden in bestehenden Dateien statt.
Es werden **keine neuen API-Endpoints** benoetigt.
Es werden **keine neuen Packages/Dependencies** benoetigt.

### Component-Struktur (Ist-Zustand vs. Soll-Zustand)

**Ist-Zustand (aktuell):**
```
main.tsx (liest Container, gibt nur apiBase weiter)
  └── App (empfaengt: apiBase)
        └── Header
              └── LanguageSwitcher (immer sichtbar)
```

**Soll-Zustand (nach PROJ-15):**
```
main.tsx (liest Container + data-lang + data-hide-lang-switcher)
  └── App (empfaengt: apiBase, initialLang, hideLangSwitcher)
        └── Header
              └── LanguageSwitcher (nur wenn hideLangSwitcher = false)
```

Die Aenderung ist minimal: `main.tsx` liest zwei zusaetzliche Attribute vom HTML-Element und gibt sie als Eigenschaften an die App weiter. Die App nutzt diese, um die Sprache zu setzen und den Switcher ein-/auszublenden.

### Datenfluss (Sprach-Erkennung)

**Ist-Zustand:**
```
Sprachauswahl-Reihenfolge:
1. localStorage (vorherige User-Auswahl)
2. Browser-Sprache (z.B. navigator.language)
3. Widget-Config default_language (aus Admin-Einstellungen)
4. Fallback "de"
```

**Soll-Zustand:**
```
Sprachauswahl-Reihenfolge:
1. data-lang Attribut vom HTML-Element  ← NEU (hoechste Prioritaet)
2. localStorage (nur wenn kein data-lang gesetzt)
3. Browser-Sprache
4. Widget-Config default_language
5. Fallback "de"
```

Wichtig: Wenn `data-lang` gesetzt ist, wird localStorage bei der initialen Spracherkennung ignoriert. Das stellt sicher, dass auf der FR-Seite immer Franzoesisch angezeigt wird, auch wenn der User vorher DE gewaehlt hat.

### Daten-Model

Dieses Feature benoetigt **keine Datenbank-Aenderungen** und **keine neuen Tabellen**. Die Information kommt ausschliesslich aus HTML-Attributen auf dem Container-Element.

Zwei neue Parameter werden vom Container-Element gelesen:

```
data-lang:
- Typ: Text (optional)
- Gueltige Werte: "de", "fr", "it" (Grossbuchstaben werden normalisiert)
- Sonderfaelle: "fr-CH" wird zu "fr" gekuerzt, leerer String wird ignoriert
- Wenn nicht gesetzt: bisherige Logik greift (localStorage, Browser, Config)

data-hide-lang-switcher:
- Typ: Boolean-aehnlich (optional)
- Werte: "true" oder ohne Wert = Switcher ausblenden
- "false" oder nicht vorhanden = Switcher sichtbar
```

### Betroffene Dateien

| Datei | Aenderung |
|-------|-----------|
| `src/widget/main.tsx` | data-lang und data-hide-lang-switcher vom Container lesen, als Props an App weitergeben |
| `src/widget/i18n/index.ts` | `detectLanguage()` erweitern: neuen optionalen Parameter fuer data-lang akzeptieren (hoechste Prioritaet) |
| `src/widget/App.tsx` | Neue Props empfangen, an detectLanguage weitergeben, LanguageSwitcher bedingt rendern |
| `src/app/admin/(dashboard)/einstellungen/page.tsx` | Snippet-Generator erweitern: optionale Felder fuer Sprache und Switcher-Sichtbarkeit, dynamische Snippet-Vorschau |

### Snippet-Generator (Admin Panel)

Der bestehende Snippet-Generator zeigt aktuell nur das Basis-Snippet:
```html
<div id="heizmann-storefinder"></div>
<script src=".../widget/storefinder.js"></script>
```

**Erweiterung:** Zwei optionale Felder unterhalb des Snippets hinzufuegen:
- Dropdown "Initiale Sprache" (Keine / Deutsch / Francais / Italiano)
- Checkbox "Sprachwechsel-Button ausblenden"

Die Snippet-Vorschau aktualisiert sich dynamisch, z.B.:
```html
<div id="heizmann-storefinder" data-lang="fr" data-hide-lang-switcher="true"></div>
<script src=".../widget/storefinder.js"></script>
```

Wenn keine optionalen Parameter gewaehlt werden, bleibt das Snippet wie bisher (Rueckwaertskompatibilitaet).

### Tech-Entscheidungen

| Entscheidung | Begruendung |
|-------------|-------------|
| HTML data-Attribute statt URL-Parameter | Standard-Methode fuer Widget-Konfiguration, funktioniert in allen CMS-Systemen, keine URL-Manipulation noetig |
| Keine neuen Dependencies | Feature ist so klein, dass keine externen Bibliotheken benoetigt werden |
| Kein Backend-Involvement | Attribute werden rein clientseitig gelesen, keine zusaetzlichen API-Calls |
| detectLanguage() erweitern statt neue Funktion | Behaelt die bestehende Sprach-Logik als Fallback bei, fuegt nur eine neue Prioritaetsstufe hinzu |
| Normalisierung im Widget (nicht im Admin) | data-lang wird beim Lesen normalisiert (Kleinbuchstaben, Region abschneiden), da CMS-Redakteure verschiedene Formate eingeben koennten |

### Rueckwaertskompatibilitaet

- Ohne `data-lang`: Verhalten ist identisch wie bisher (localStorage, Browser, Config, Fallback)
- Ohne `data-hide-lang-switcher`: Switcher bleibt sichtbar wie bisher
- Ohne beide Attribute: Widget funktioniert exakt wie vor PROJ-15
- Bestehende Embeds muessen NICHT angepasst werden

### Dependencies

Keine neuen Packages erforderlich. Das Feature wird vollstaendig mit bestehendem Code und Standard-Browser-APIs umgesetzt (`element.getAttribute()`, `element.hasAttribute()`).

---

## QA Test Results

**Tested:** 2026-02-13
**Methode:** Code Review + Build-Verifikation
**Build Status:** PASSED (Vite widget + Next.js 16.1.1, keine TypeScript-Fehler)
**Getestete Dateien:**
- `src/widget/i18n/index.ts` (parseDataLang, detectLanguage)
- `src/widget/main.tsx` (Container-Attribut-Auswertung)
- `src/widget/App.tsx` (Props-Handling, bedingte Darstellung)
- `src/app/admin/(dashboard)/einstellungen/page.tsx` (Snippet-Generator)
- `src/widget/components/LanguageSwitcher.tsx` (unveraendert, Regression)

## Acceptance Criteria Status

### AC-1: Widget liest data-lang Attribut vom Container
- [x] `main.tsx` Z.56: `parseDataLang(container.getAttribute('data-lang'))` liest korrekt vom `#heizmann-storefinder` Element
- [x] Ergebnis wird als `initialLang` Prop an App weitergegeben

### AC-2: Gueltige Werte de/fr/it (case-insensitive)
- [x] `parseDataLang` normalisiert via `.trim().toLowerCase().slice(0,2)`
- [x] Validierung via `normalized in translations` gegen `{de, fr, it}`
- [x] Nur exakt gueltige Werte werden als `Language` zurueckgegeben

### AC-3: data-lang hat hoechste Prioritaet
- [x] `detectLanguage` Z.22: `if (initialLang) return initialLang` -- wird VOR localStorage (Z.25) und Browser (Z.31) geprueft
- [x] Prioritaetsreihenfolge korrekt: data-lang > localStorage > Browser > Config > Fallback

### AC-4: Ungueltiger data-lang wird ignoriert
- [x] `parseDataLang` gibt `null` zurueck bei ungueltigen Werten
- [x] `detectLanguage` behandelt `null` als falsy -> Fallback auf bisherige Logik

### AC-5: Widget liest data-hide-lang-switcher
- [x] `main.tsx` Z.57-58: `container.hasAttribute('data-hide-lang-switcher') && container.getAttribute('data-hide-lang-switcher') !== 'false'`
- [x] Ergebnis wird als `hideLangSwitcher` boolean Prop an App weitergegeben

### AC-6: Bei data-hide-lang-switcher="true" wird LanguageSwitcher nicht gerendert
- [x] `App.tsx` Z.364: `{!hideLangSwitcher && (` -- gesamter Header-Block inkl. LanguageSwitcher wird nicht gerendert
- [x] Kein DOM-Element wird erzeugt (conditional rendering, nicht CSS display:none)

### AC-7: Ohne data-hide-lang-switcher oder bei "false" bleibt Switcher sichtbar
- [x] Ohne Attribut: `hasAttribute` -> `false` -> `hideLangSwitcher = false` -> Switcher sichtbar
- [x] Bei `"false"`: `getAttribute !== 'false'` -> `false` -> `hideLangSwitcher = false` -> Switcher sichtbar

### AC-8: Sprachwechsel speichert in localStorage
- [x] `App.tsx` Z.54-57: `setLang` callback ruft `saveLanguage(l)` auf
- [x] `saveLanguage` schreibt via `localStorage.setItem(STORAGE_KEY, lang)`
- [x] Funktioniert unabhaengig von hideLangSwitcher (solange Switcher sichtbar ist)

### AC-9: Beim naechsten Laden greift data-lang erneut (nicht localStorage)
- [x] `detectLanguage` Z.22: `if (initialLang) return initialLang` hat Vorrang vor localStorage-Check in Z.25
- [x] localStorage wird bei gesetztem data-lang komplett uebersprungen

### AC-10: Snippet-Generator zeigt optionale Parameter
- [x] Dropdown "Initiale Sprache" mit Optionen: Keine / Deutsch / Francais / Italiano (Z.335-347)
- [x] Checkbox "Sprachwechsel-Button ausblenden" (Z.353-364)
- [x] Snippet-Vorschau aktualisiert sich dynamisch (Z.104-112)
- [x] data-lang und data-hide-lang-switcher werden korrekt in den Snippet-Code eingefuegt
- [x] Beschreibungstexte vorhanden: `data-lang` Erklaerung (Z.349-351) und Switcher-Erklaerung (Z.365-367)

### AC-11: Rueckwaertskompatibilitaet ohne data-Attribute
- [x] Ohne Attribute: `parseDataLang(null)` -> `null`, `hideLangSwitcher` -> `false`
- [x] `detectLanguage` mit `initialLang=null` -> Fallback auf localStorage/Browser/Config/de
- [x] LanguageSwitcher bleibt sichtbar
- [x] Bisherige Funktionalitaet komplett erhalten (keine Breaking Changes)

## Edge Cases Status

### EC-1: data-lang="EN" (Grossbuchstaben)
- [x] `.toLowerCase()` -> `"en"`, `.slice(0,2)` -> `"en"`, `"en" in translations` -> `false` -> `null`
- [x] Korrekt: wird ignoriert, Fallback greift (EN ist keine unterstuetzte Sprache)

### EC-2: data-lang="fr-CH" (mit Region)
- [x] `.toLowerCase()` -> `"fr-ch"`, `.slice(0,2)` -> `"fr"`, `"fr" in translations` -> `true`
- [x] Korrekt: Hauptsprache "fr" wird extrahiert

### EC-3: data-lang="" (leerer String)
- [x] `if (!raw)` -- leerer String ist falsy in JavaScript -> `return null`
- [x] Korrekt: wird ignoriert, bisherige Logik greift

### EC-4: data-lang="en" (nicht unterstuetzte Sprache)
- [x] `"en" in translations` -> `false` -> `return null`
- [x] Korrekt: wird ignoriert, Fallback greift

### EC-5: data-hide-lang-switcher ohne Wert (HTML Boolean Attribut)
- [x] `hasAttribute` -> `true`, `getAttribute` -> `""`, `"" !== 'false'` -> `true`
- [x] `true && true` -> `hideLangSwitcher = true`
- [x] Korrekt: wird als `true` behandelt (HTML-Boolean-Attribut-Konvention)

### EC-6: User wechselt Sprache per Switcher und laedt Seite neu
- [x] Sprachwechsel: `setLang` -> `saveLanguage` schreibt localStorage
- [x] Reload: `parseDataLang` liest `data-lang` erneut, `detectLanguage` gibt `initialLang` zurueck (Vorrang vor localStorage)
- [x] Korrekt: data-lang greift wieder (gewolltes CMS-Verhalten)

## Security Audit (Red Team)

### SEC-1: XSS via data-lang Attribut
- [x] KEIN RISIKO: `parseDataLang` sanitisiert Eingabe vollstaendig
  - `.trim().toLowerCase().slice(0,2)` -- maximal 2 Zeichen
  - Validierung gegen festes Set `{de, fr, it}` -- nur 3 gueltige Werte
  - Wert wird nie in innerHTML oder dangerouslySetInnerHTML verwendet

### SEC-2: Prototype Pollution via `in` Operator
- [x] KEIN RISIKO: `.slice(0,2)` reduziert alle Eingaben auf 2 Zeichen
  - `"__proto__"` -> `"__"` -> nicht in translations
  - `"constructor"` -> `"co"` -> nicht in translations
  - `"toString"` -> `"to"` -> nicht in translations
  - Verifiziert via Node.js Test: `"__" in {de:1,fr:2,it:3}` -> `false`
- [x] HINWEIS (Low, kein Bug): `Object.hasOwn(translations, normalized)` waere theoretisch sicherer als `in`, spielt aber durch den `slice(0,2)` keine Rolle

### SEC-3: DOM-basierte Angriffe
- [x] KEIN RISIKO: Nur `getAttribute()` und `hasAttribute()` -- reine Lese-Operationen
- [x] Keine dynamische HTML-Generierung aus den Attributwerten

### SEC-4: localStorage-Manipulation durch Dritte
- [x] KEIN RISIKO: `data-lang` hat Vorrang vor localStorage
- [x] Sogar ein Sicherheitsvorteil: CMS-Seitenbetreiber kann Sprache erzwingen

### SEC-5: Snippet-Generator (Admin Panel)
- [x] KEIN RISIKO: Admin-Bereich ist hinter Authentifizierung geschuetzt
- [x] Snippet-Werte kommen aus kontrollierten UI-Elementen (Select/Checkbox)
- [x] Keine Freitext-Eingabe fuer data-lang im Admin

## Regression Test

### Bestehende Features geprueft
- [x] PROJ-8 (Mehrsprachigkeit): `detectLanguage` Signatur ist rueckwaertskompatibel (zweiter Parameter optional mit `?`)
- [x] PROJ-4 (Widget-Konfiguration): Snippet-Generator erweitert, Basis-Snippet unveraendert bei "Keine" Auswahl
- [x] i18n-System: `translate()`, `saveLanguage()`, `I18nContext`, `useTranslation()` -- alle unveraendert
- [x] LanguageSwitcher-Komponente: Keine Aenderungen, funktioniert weiterhin identisch
- [x] Widget-Initialisierung: `main.tsx` liest weiterhin `apiBase`, injiziiert CSS, prueft Container -- bestehende Logik unveraendert
- [x] Build: Vite + Next.js Build erfolgreich, keine TypeScript-Fehler, keine neuen Warnungen

### Zuletzt geaenderte Features (potenzielle Regression)
- [x] PROJ-14 (CSV Import): Betrifft Admin Stuetzpunkte-Import -- keine Ueberschneidung mit Widget i18n
- [x] PROJ-13 (Map Zoom on Card Click): Betrifft LeafletMap -- keine Ueberschneidung
- [x] PROJ-12 (Notfallnummer): Betrifft LocationCard -- keine Ueberschneidung

## Bugs Found

Keine Bugs gefunden.

## Hinweise (Improvements, kein Bug)

### HINT-1: Object.hasOwn statt `in` Operator
- **Severity:** Info (kein Bug)
- **Datei:** `src/widget/i18n/index.ts` Zeile 16
- **Beschreibung:** `normalized in translations` koennte theoretisch durch Prototype-Properties wie `"toString"` getaeuscht werden. Durch den `slice(0,2)` ist das in der Praxis nicht ausnutzbar, da kein 2-Buchstaben-Prototype-Property mit `de`, `fr`, `it` kollidiert. Trotzdem waere `Object.hasOwn(translations, normalized)` die defensivere Variante.
- **Priority:** Low (Best Practice, kein Sicherheitsrisiko)

### HINT-2: data-hide-lang-switcher="TRUE" (Grossbuchstaben)
- **Severity:** Info (kein Bug)
- **Beschreibung:** `data-hide-lang-switcher="TRUE"` oder `data-hide-lang-switcher="True"` funktioniert korrekt (wird als `true` behandelt, da nur `"false"` explizit gecheckt wird). Das ist gewuenschtes Verhalten, aber undokumentiert.

## Summary
- 11/11 Acceptance Criteria bestanden
- 6/6 Edge Cases bestanden
- 5/5 Security Checks bestanden
- 0 Bugs gefunden
- 2 Verbesserungshinweise (Info-Level, kein Handlungsbedarf)
- Build: PASSED
- Regression: Keine Regressionen festgestellt

## Recommendation
Feature ist **production-ready**. Alle Acceptance Criteria erfuellt, keine Bugs, keine Security-Issues. Die Implementierung ist minimal, rueckwaertskompatibel und gut strukturiert. Die Verbesserungshinweise sind optional und haben keine Prioritaet.
