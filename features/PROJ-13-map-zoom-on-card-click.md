# PROJ-13: Map Zoom auf Stuetzpunkt bei Card-Klick

## Status: Planned

## Abhaengigkeiten
- Benoetigt: PROJ-5 (Kartenansicht) - LeafletMap-Komponente
- Benoetigt: PROJ-7 (Stuetzpunkt-Liste & Cards) - LocationCard-Komponente + Klick-Handler
- Vervollstaendigt: PROJ-7 AC "Klick auf Card: Karte zentriert und zoomt auf den zugehoerigen Pin" (bereits spezifiziert, aber nie implementiert)

## Beschreibung
Wenn ein Benutzer auf eine Stuetzpunkt-Card in der Liste klickt, soll die Karte auf den zugehoerigen Standort zoomen und zentrieren. Aktuell wird bei Klick lediglich der Marker visuell hervorgehoben (groesser dargestellt), aber die Kartenansicht aendert sich nicht. Das Hover-Verhalten (Marker-Hervorhebung ohne Zoom) bleibt unveraendert.

## Ist-Zustand (Bug/Missing Feature)
- Card-Klick (`handleCardClick` in App.tsx): Setzt nur `selectedStuetzpunkt` State
- LeafletMap reagiert auf `selectedStuetzpunkt`-Aenderung: Aktualisiert nur das Marker-Icon (groesser), aber kein `flyTo`/`setView`
- Marker-Klick (`handleMarkerClick` in App.tsx): Setzt `selectedStuetzpunkt` + scrollt Card in View -- hat aber ebenfalls keinen Zoom

## User Stories
- Als Website-Besucher moechte ich bei Klick auf eine Stuetzpunkt-Card, dass die Karte auf diesen Standort zoomt, um den genauen Ort auf der Karte zu sehen
- Als Website-Besucher moechte ich nach dem Zoom den hervorgehobenen Marker klar erkennen, um sicher zu sein, dass der richtige Stuetzpunkt angezeigt wird
- Als Website-Besucher moechte ich, dass der Zoom sanft animiert wird (fly-to), um die raeumliche Orientierung nicht zu verlieren
- Als Website-Besucher moechte ich bei erneutem Klick auf eine andere Card, dass die Karte zum neuen Standort fliegt

## Acceptance Criteria
- [ ] Klick auf eine LocationCard zoomt die Karte auf den zugehoerigen Stuetzpunkt
- [ ] Die Karte zentriert sich auf die Koordinaten (latitude, longitude) des angeklickten Stuetzpunkts
- [ ] Der Zoom-Level nach dem Fly-To ist angemessen (z.B. Zoom 14-15), um den Standort im Stadtkontext zu sehen
- [ ] Die Zoom-Animation ist sanft (Leaflet `flyTo` statt hartem `setView`)
- [ ] Hover auf Card loest weiterhin KEINEN Zoom aus (nur Marker-Hervorhebung)
- [ ] Bei Klick auf eine andere Card fliegt die Karte zum neuen Standort
- [ ] Wenn bereits eine Route angezeigt wird, soll der Card-Klick trotzdem zum Stuetzpunkt zoomen (Route bleibt sichtbar)
- [ ] Die Karte reagiert auch auf Keyboard-Navigation (Enter auf fokussierter Card)

## Edge Cases
- Was passiert bei schnellem Klicken auf verschiedene Cards hintereinander? --> Letzte Animation gewinnt, vorherige wird abgebrochen (`flyTo` ueberschreibt vorheriges `flyTo` automatisch in Leaflet)
- Was passiert wenn der angeklickte Stuetzpunkt bereits zentriert ist? --> Kein erneuter Fly-To noetig (optional: nur Zoom-Anpassung falls Zoom-Level zu niedrig)
- Was passiert auf Mobile, wo die Karte oberhalb der Liste liegt? --> Der Zoom findet statt; die Karte ist moeglicherweise nicht sichtbar wenn der User weit unten in der Liste gescrollt hat. Kein Auto-Scroll zur Karte erforderlich (einfache V1)
- Was passiert wenn der Marker durch den Zoom ausserhalb des sichtbaren Bereichs geraten wuerde? --> `flyTo` zentriert automatisch, daher nicht moeglich

## Betroffene Dateien (Kontext fuer Entwickler)
- `src/widget/App.tsx` - `handleCardClick` muss erweitert werden oder Koordinaten an LeafletMap weitergegeben werden
- `src/widget/components/LeafletMap.tsx` - Muss auf `selectedStuetzpunkt`-Aenderung mit `flyTo` reagieren
