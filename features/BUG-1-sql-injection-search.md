# BUG-1: SQL-Injection-Risiko in Stützpunkt-Suche

## Status: ✅ Done (gefixt in PROJ-16, Commit 7fa7047)

## Severity: High

## Beschreibung
Die Admin-API für Stützpunkte (`GET /api/stuetzpunkte`) interpoliert den `search`-Parameter direkt in den Supabase `.or()` Filter-String. Ein authentifizierter Admin könnte durch speziell formatierte Sucheingaben den PostgREST-Filter manipulieren.

## Betroffene Datei
- `src/app/api/stuetzpunkte/route.ts` (Zeile 48)

## Aktueller Code (verwundbar)
```typescript
if (search) {
  query = query.or(`name.ilike.%${search}%,plz.ilike.%${search}%,ort.ilike.%${search}%`)
}
```

Der Wert von `search` wird ohne Sanitisierung in den Filter-String eingesetzt. Ein Angreifer könnte z.B. `%,id.neq.0` eingeben, um den Filter zu manipulieren.

## Risikobewertung
- **Angriffsfläche:** Nur authentifizierte Admins (kein öffentlicher Endpunkt)
- **Impact:** Potenzielle Datenexfiltration über manipulierte Filter
- **Wahrscheinlichkeit:** Niedrig (erfordert Admin-Zugang), aber Defense-in-Depth erfordert Fix

## Fix-Vorschlag
Supabase-JS bietet einzelne Filter-Methoden, die Werte automatisch escapen:

```typescript
if (search) {
  const pattern = `%${search}%`
  query = query.or(`name.ilike.${pattern},plz.ilike.${pattern},ort.ilike.${pattern}`)
}
```

Alternativ den Suchbegriff vor der Interpolation sanitisieren (Sonderzeichen escapen die PostgREST-Syntax brechen könnten: `,`, `.`, `(`):

```typescript
function sanitizeSearch(input: string): string {
  return input.replace(/[,.()"'\\]/g, '')
}
```

## Acceptance Criteria
- [ ] Suchparameter wird vor Einsetzen in `.or()` sanitisiert
- [ ] Normale Suche nach PLZ, Ort, Name funktioniert weiterhin
- [ ] Sonderzeichen in der Suche führen nicht zu Fehlern oder unerwartetem Verhalten
