# PROJ-9: Storefinder Widget - Route zum Stützpunkt

## Status: 🔵 Planned

## Abhängigkeiten
- Benötigt: PROJ-5 (Kartenansicht) - für Leaflet-Karte und Marker
- Benötigt: PROJ-7 (Stützpunkt-Liste & Cards) - für LocationCard Integration
- Benötigt: PROJ-8 (Mehrsprachigkeit) - für i18n der UI-Texte

## Beschreibung
Routenanzeige vom aktuellen Standort des Users zum nächsten Stützpunkt. Die Route wird direkt in der Leaflet-Karte gezeichnet (via OSRM) UND als externer Link zu Google Maps / Apple Maps angeboten. Das System wählt automatisch den nächstgelegenen Stützpunkt basierend auf der Luftlinien-Entfernung (Haversine). Nur Auto-Navigation wird unterstützt.

## User Stories
- Als Website-Besucher möchte ich die Route zum nächsten Stützpunkt direkt auf der Karte sehen, um den Weg visuell nachvollziehen zu können
- Als Website-Besucher möchte ich einen "Route planen"-Button klicken können, der automatisch den nächstgelegenen Stützpunkt erkennt
- Als Website-Besucher möchte ich die Route auch in Google Maps / Apple Maps öffnen können, um die Navigation auf meinem Handy zu nutzen
- Als Website-Besucher möchte ich die Entfernung und geschätzte Fahrzeit zum nächsten Stützpunkt sehen
- Als Website-Besucher möchte ich die Route schließen und zur normalen Kartenansicht zurückkehren können

## Acceptance Criteria
- [ ] "Route"-Button im Widget (z.B. in der Toolbar neben Geolocation-Button)
- [ ] Klick auf "Route" fragt Browser-Standort ab (falls nicht bereits bekannt)
- [ ] System ermittelt automatisch den nächstgelegenen aktiven Stützpunkt (Haversine)
- [ ] Route wird als Linie auf der Leaflet-Karte gezeichnet (OSRM Routing API)
- [ ] Karte zoomt automatisch auf die Route (fitBounds Start → Ziel)
- [ ] Entfernung (km) und geschätzte Fahrzeit werden angezeigt
- [ ] Externer Link "In Google Maps öffnen" unter der Routeninfo
- [ ] Auf iOS-Geräten: "In Apple Maps öffnen" statt/zusätzlich zu Google Maps
- [ ] "Route schließen"-Button entfernt die Route und zeigt wieder die Normalansicht
- [ ] Nur Auto-Routing (driving) wird verwendet
- [ ] Ziel-Stützpunkt wird auf der Karte hervorgehoben (z.B. anderer Pin-Style)
- [ ] Temporär geschlossene Stützpunkte werden bei der "Nächster"-Berechnung übersprungen
- [ ] Route wird bei Fenster-Resize korrekt dargestellt
- [ ] Responsive: Routeninfo wird auf Mobile unter der Karte angezeigt

## Edge Cases
- Was passiert wenn User Geolocation ablehnt? → Fehlermeldung "Standort wird für die Routenberechnung benötigt" + Hinweis auf manuelle Standort-Eingabe via Suche
- Was passiert wenn kein aktiver Stützpunkt vorhanden ist? → Meldung "Kein Stützpunkt verfügbar"
- Was passiert wenn OSRM-API nicht erreichbar ist? → Fallback: Nur externer Google Maps-Link anzeigen, Route in Karte überspringen
- Was passiert wenn User sehr weit entfernt ist (z.B. anderes Land)? → Route trotzdem anzeigen, ggf. Hinweis bei >500km Entfernung
- Was passiert auf Mobile ohne GPS? → WiFi/IP-basierte Standortbestimmung des Browsers nutzen (weniger genau)

## Technische Anforderungen
- OSRM (Open Source Routing Machine) Demo-API für Routing: `https://router.project-osrm.org/route/v1/driving/{lng1},{lat1};{lng2},{lat2}?overview=full&geometries=geojson`
- Leaflet Polyline für Routen-Darstellung auf der Karte
- Haversine-Formel (bereits vorhanden in App.tsx) für nächsten Stützpunkt
- Google Maps Deeplink: `https://www.google.com/maps/dir/?api=1&origin={lat},{lng}&destination={lat},{lng}&travelmode=driving`
- Apple Maps Deeplink: `https://maps.apple.com/?saddr={lat},{lng}&daddr={lat},{lng}&dirflg=d`
- iOS-Erkennung: User Agent oder `navigator.platform` Check

## Tech-Design (Solution Architect)

### Component-Struktur

```
Widget → Route zum Stützpunkt
├── RouteButton               ← "Route zum nächsten Stützpunkt" Button
├── RoutePanel                ← Info-Panel mit Entfernung, Dauer, Links
│   ├── RouteInfo             ← Entfernung (km) + Fahrzeit (min)
│   ├── ExternalLinks         ← Google Maps / Apple Maps Deeplinks
│   │   ├── GoogleMapsLink    ← "In Google Maps öffnen"
│   │   └── AppleMapsLink     ← "In Apple Maps öffnen" (nur iOS)
│   └── CloseRouteButton      ← "Route schließen"
└── RouteLine (auf Karte)     ← Leaflet Polyline der berechneten Route
```

### Ablauf

```
1. User klickt "Route"-Button
2. Browser-Standort wird abgefragt (falls nicht bekannt)
3. Nächster aktiver Stützpunkt wird per Haversine ermittelt
4. OSRM-API wird mit Start/Ziel aufgerufen
5. Route wird als GeoJSON Polyline auf der Karte gezeichnet
6. Karte zoomt auf Route (fitBounds)
7. RoutePanel zeigt Entfernung + Fahrzeit + externe Links
8. User kann Route schließen → Normalansicht
```

### OSRM API Response (relevante Felder)

```json
{
  "routes": [{
    "geometry": { "type": "LineString", "coordinates": [[lng, lat], ...] },
    "distance": 12345.6,   // Meter
    "duration": 890.5       // Sekunden
  }]
}
```

### Externe Links Format

```
Google Maps:
https://www.google.com/maps/dir/?api=1&origin={userLat},{userLng}&destination={destLat},{destLng}&travelmode=driving

Apple Maps (iOS):
https://maps.apple.com/?saddr={userLat},{userLng}&daddr={destLat},{destLng}&dirflg=d
```

### Integration in bestehende Komponenten

```
App.tsx:
- Neuer State: routeActive, routeData (geometry, distance, duration), routeTarget
- Neue Funktion: startRoute() → Geolocation + findNearest + OSRM-Fetch
- Neue Funktion: closeRoute() → State zurücksetzen

LeafletMap.tsx:
- Neues Prop: routeGeoJSON (optional) → Polyline rendern
- Route-Layer wird über den Marker-Layer gelegt
- FitBounds auf Route wenn aktiv

Neue Komponenten:
- RouteButton.tsx → Trigger-Button
- RoutePanel.tsx → Info-Panel mit Dauer/Distanz/Links
```

### i18n Keys (neue Übersetzungen)

```
route_button: "Route zum nächsten Stützpunkt"
route_distance: "Entfernung: {distance} km"
route_duration: "Fahrzeit: ca. {duration} Min."
route_open_google: "In Google Maps öffnen"
route_open_apple: "In Apple Maps öffnen"
route_close: "Route schließen"
route_no_location: "Standort wird für die Routenberechnung benötigt"
route_no_target: "Kein Stützpunkt verfügbar"
route_error: "Route konnte nicht berechnet werden"
route_far_away: "Der nächste Stützpunkt ist über {distance} km entfernt"
```

### Tech-Entscheidungen

```
Warum OSRM statt Google Directions API?
→ OSRM ist kostenlos und Open Source. Die Demo-API reicht für
  moderate Nutzung. Kein API-Key erforderlich. Bei hohem Traffic
  kann ein eigener OSRM-Server deployed werden.

Warum automatisch nächster statt manuelle Auswahl?
→ Einfachster UX-Flow: Ein Klick → Route. Der häufigste Use Case
  ist "Wie komme ich zum nächsten Stützpunkt?". Manuelle Auswahl
  kann in einer späteren Iteration ergänzt werden.

Warum nur Auto?
→ Heizmann-Kunden fahren typischerweise mit dem Auto zum Stützpunkt
  (Heizungs-/Sanitär-Service). Weitere Modi können bei Bedarf ergänzt werden.

Warum externer Link zusätzlich zur Karten-Route?
→ Mobile User möchten die Route oft in ihrer Navigations-App nutzen.
  Die In-Karte-Route gibt einen schnellen Überblick, der externe Link
  ermöglicht die tatsächliche Navigation.
```

### Dependencies
- Keine zusätzlichen Packages (OSRM wird per fetch aufgerufen, Leaflet Polyline ist bereits in Leaflet enthalten)
