import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { Stuetzpunkt } from '../types'
import { useTranslation } from '../i18n'

interface LeafletMapProps {
  stuetzpunkte: Stuetzpunkt[]
  center: [number, number]
  zoom: number
  primaryColor: string
  userLocation: { lat: number; lng: number } | null
  selectedRadius: number
  selectedStuetzpunkt: string | null
  hoveredStuetzpunkt: string | null
  onMarkerClick: (id: string) => void
  routeGeometry?: [number, number][] | null
  routeTargetId?: string | null
}

function createMarkerIcon(color: string, isHighlighted: boolean) {
  const size = isHighlighted ? 14 : 10
  return L.divIcon({
    className: 'hsf-marker',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};
      border:2px solid white;
      border-radius:50%;
      box-shadow:0 1px 4px rgba(0,0,0,.3);
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

export function LeafletMap({
  stuetzpunkte,
  center,
  zoom,
  primaryColor,
  userLocation,
  selectedRadius,
  selectedStuetzpunkt,
  hoveredStuetzpunkt,
  onMarkerClick,
  routeGeometry,
  routeTargetId,
}: LeafletMapProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.LayerGroup | null>(null)
  const circleRef = useRef<L.Circle | null>(null)
  const userMarkerRef = useRef<L.CircleMarker | null>(null)
  const routeLineRef = useRef<L.Polyline | null>(null)

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: true,
      attributionControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    markersRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update markers
  useEffect(() => {
    const map = mapRef.current
    const markers = markersRef.current
    if (!map || !markers) return

    markers.clearLayers()

    const bounds: L.LatLngExpression[] = []

    stuetzpunkte.forEach((sp) => {
      const isSelected = sp.id === selectedStuetzpunkt
      const isHovered = sp.id === hoveredStuetzpunkt
      const isRouteTarget = sp.id === routeTargetId
      const color = sp.status === 'temporaer_geschlossen' ? '#9ca3af' : primaryColor

      const marker = L.marker([sp.latitude, sp.longitude], {
        icon: createMarkerIcon(color, isSelected || isHovered || isRouteTarget),
        zIndexOffset: isSelected || isHovered || isRouteTarget ? 1000 : 0,
      })

      const services = sp.stuetzpunkt_services
        ?.map((ss) => ss.service_typen?.name)
        .filter(Boolean)
        .join(', ')

      const statusBadge = sp.status === 'temporaer_geschlossen'
        ? `<div style="color:#d97706;font-size:11px;margin-top:4px">${t('card.closed')}</div>`
        : ''

      marker.bindPopup(`
        <div style="font-family:system-ui,sans-serif;min-width:180px">
          <strong style="font-size:14px">${sp.name}</strong>
          ${statusBadge}
          <div style="font-size:12px;color:#6b7280;margin-top:4px">
            ${sp.strasse} ${sp.hausnummer}<br/>
            ${sp.plz} ${sp.ort}
          </div>
          <div style="font-size:12px;margin-top:4px">
            <a href="tel:${sp.telefon}" style="color:${primaryColor}">${sp.telefon}</a>
          </div>
          ${services ? `<div style="font-size:11px;color:#6b7280;margin-top:4px">${services}</div>` : ''}
        </div>
      `, { closeButton: true, maxWidth: 250 })

      marker.on('click', () => onMarkerClick(sp.id))

      markers.addLayer(marker)
      bounds.push([sp.latitude, sp.longitude])
    })

    if (bounds.length > 0 && !userLocation && !selectedStuetzpunkt) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30], maxZoom: 13 })
    }
  }, [stuetzpunkte, primaryColor, selectedStuetzpunkt, hoveredStuetzpunkt, onMarkerClick, t, userLocation, routeTargetId])

  // Fly to selected stuetzpunkt on card click
  const prevSelectedRef = useRef<string | null>(null)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedStuetzpunkt) {
      prevSelectedRef.current = selectedStuetzpunkt
      return
    }
    if (selectedStuetzpunkt === prevSelectedRef.current) return
    prevSelectedRef.current = selectedStuetzpunkt

    const sp = stuetzpunkte.find((s) => s.id === selectedStuetzpunkt)
    if (!sp) return

    map.flyTo([sp.latitude, sp.longitude], 14, { duration: 0.8 })
  }, [selectedStuetzpunkt, stuetzpunkte])

  // User location marker + radius circle
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Remove previous
    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current)
      userMarkerRef.current = null
    }
    if (circleRef.current) {
      map.removeLayer(circleRef.current)
      circleRef.current = null
    }

    if (userLocation) {
      userMarkerRef.current = L.circleMarker([userLocation.lat, userLocation.lng], {
        radius: 8,
        fillColor: '#3b82f6',
        fillOpacity: 1,
        color: 'white',
        weight: 2,
      }).addTo(map)

      if (selectedRadius > 0) {
        circleRef.current = L.circle([userLocation.lat, userLocation.lng], {
          radius: selectedRadius * 1000,
          fillColor: primaryColor,
          fillOpacity: 0.08,
          color: primaryColor,
          weight: 1,
          dashArray: '4 4',
        }).addTo(map)

        map.fitBounds(circleRef.current.getBounds(), { padding: [30, 30] })
      } else {
        map.setView([userLocation.lat, userLocation.lng], 11)
      }
    }
  }, [userLocation, selectedRadius, primaryColor])

  // Route polyline
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (routeLineRef.current) {
      map.removeLayer(routeLineRef.current)
      routeLineRef.current = null
    }

    if (routeGeometry && routeGeometry.length > 0) {
      const latLngs = routeGeometry.map(([lat, lng]) => L.latLng(lat, lng))
      routeLineRef.current = L.polyline(latLngs, {
        color: primaryColor,
        weight: 4,
        opacity: 0.8,
        dashArray: '8 6',
      }).addTo(map)

      map.fitBounds(routeLineRef.current.getBounds(), { padding: [40, 40] })
    }
  }, [routeGeometry, primaryColor])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: '300px' }}
    />
  )
}
