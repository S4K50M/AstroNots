import { useEffect, useState } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

const STORAGE_KEY = 'aurora_sightings'

function loadSightings() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function saveSightings(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

export default function SightingsLayer() {
  const map = useMap()
  const [sightings, setSightings] = useState(loadSightings)

  useEffect(() => {
    const markers = []

    // Draw existing sightings
    sightings.forEach(s => {
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:12px;height:12px;border-radius:50%;
          background:#00ffa3;border:2px solid #fff;
          box-shadow:0 0 8px #00ffa3;
          cursor:pointer;
        "></div>`,
        iconAnchor: [6, 6],
      })
      const m = L.marker([s.lat, s.lon], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:monospace;font-size:12px;color:#e8eef8;background:#0e1420;padding:8px;border-radius:6px">
            <b style="color:#00ffa3">👁 Aurora Sighted</b><br/>
            ${new Date(s.time).toUTCString().slice(5,22)} UTC<br/>
            ${s.lat.toFixed(3)}, ${s.lon.toFixed(3)}<br/>
            ${s.note || ''}
          </div>
        `, { className: 'aurora-popup' })
      markers.push(m)
    })

    // Click to add sighting
    const handleClick = (e) => {
      const { lat, lng } = e.latlng
      const note = window.prompt('Aurora sighting note (optional):')
      if (note === null) return // cancelled

      const newSighting = {
        lat: parseFloat(lat.toFixed(4)),
        lon: parseFloat(lng.toFixed(4)),
        time: new Date().toISOString(),
        note,
      }

      setSightings(prev => {
        const updated = [...prev, newSighting]
        saveSightings(updated)
        return updated
      })
    }

    map.on('contextmenu', handleClick)

    return () => {
      markers.forEach(m => map.removeLayer(m))
      map.off('contextmenu', handleClick)
    }
  }, [map, sightings])

  return null
}
