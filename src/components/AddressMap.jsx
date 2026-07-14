import { useEffect, useRef, useState } from 'react'
import { geocodeAddress } from '../lib/registry.js'

const PIN_SVG =
  '<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">' +
  '<path d="M15 1C7.8 1 2 6.8 2 14c0 9.6 13 25 13 25s13-15.4 13-25C28 6.8 22.2 1 15 1z" fill="#2563eb" stroke="#fff" stroke-width="2"/>' +
  '<circle cx="15" cy="14" r="5" fill="#fff"/></svg>'

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

/**
 * Map with a pin on the entered address (OpenStreetMap tiles via Leaflet,
 * loaded on demand). Renders nothing until an address is entered and the
 * address geocodes, so empty forms show no map at all.
 *
 * @param {{ address?: string; city?: string; country?: string; className?: string }} props
 */
export default function AddressMap({ address, city, country, className = '' }) {
  const hasAddress = Boolean(String(address ?? '').trim())
  const q = [address, city, country].map((s) => String(s ?? '').trim()).filter(Boolean).join(', ')
  const [spot, setSpot] = useState(/** @type {null | { lat: number; lon: number; precision?: string }} */ (null))
  const boxRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const mapRef = useRef(/** @type {any} */ (null))

  // Geocode (debounced) whenever the address settles; clear when it's removed.
  useEffect(() => {
    if (!hasAddress) { setSpot(null); return undefined }
    let alive = true
    const timer = setTimeout(async () => {
      const r = await geocodeAddress(q)
      if (alive) setSpot(r)
    }, 600)
    return () => { alive = false; clearTimeout(timer) }
  }, [q, hasAddress])

  // Build / update the Leaflet map once we have coordinates.
  useEffect(() => {
    if (!spot || !boxRef.current) return undefined
    let cancelled = false
    ;(async () => {
      const [{ default: L }] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')])
      if (cancelled || !boxRef.current) return
      if (!mapRef.current) {
        const map = L.map(boxRef.current, { scrollWheelZoom: false })
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map)
        map._addrPin = L.marker([spot.lat, spot.lon], {
          icon: L.divIcon({ className: 'addr-pin', html: PIN_SVG, iconSize: [30, 40], iconAnchor: [15, 38], popupAnchor: [0, -34] }),
        }).addTo(map)
        mapRef.current = map
      } else {
        mapRef.current._addrPin.setLatLng([spot.lat, spot.lon])
      }
      mapRef.current.setView([spot.lat, spot.lon], spot.precision === 'city' ? 12 : 16)
      mapRef.current._addrPin.bindPopup(`<span style="font-size:12px">${escapeHtml(q)}</span>`)
    })()
    return () => { cancelled = true }
  }, [spot, q])

  // Tear the map down when the address is cleared and on unmount.
  useEffect(() => {
    if (!spot && mapRef.current) { mapRef.current.remove(); mapRef.current = null }
  }, [spot])
  useEffect(() => () => { mapRef.current?.remove(); mapRef.current = null }, [])

  if (!hasAddress || !spot) return null
  return <div ref={boxRef} className={`addr-map h-56 w-full overflow-hidden rounded-xl border border-slate-200 ${className}`} />
}
