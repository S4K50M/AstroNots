import { useEffect, useRef } from "react"
import { MapContainer, TileLayer, useMap } from "react-leaflet"
import SightingsLayer from "./SightingLayer" // Make sure filename matches your project
import L from "leaflet"
import 'leaflet/dist/leaflet.css'

const MAP_MAX_BOUNDS = [
  [-85, -170],
  [85, 170],
]

// ── OVATION Glowing Canvas Overlay ──────────────────────────────
function OvationLayer({ cells }) {
  const map = useMap()
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!cells?.length) return

    const CanvasOverlay = L.Layer.extend({
      onAdd(map) {
        this._map = map
        const pane = map.getPane("overlayPane")

        this._canvas = L.DomUtil.create("canvas", "", pane)
        this._canvas.style.position = "absolute"
        this._canvas.style.pointerEvents = "none"
        // Base opacity for the entire glassy layer
        this._canvas.style.opacity = "0.8" 
        // Screen blending makes overlapping colors pop and glow like light
        this._canvas.style.mixBlendMode = "screen"

        map.on("moveend zoomend resize", this._render, this)
        this._render()
      },

      onRemove(map) {
        L.DomUtil.remove(this._canvas)
        map.off("moveend zoomend resize", this._render, this)
      },
      _render() {
        const map = this._map
        const cv = this._canvas
        const size = map.getSize()

        cv.width = size.x
        cv.height = size.y

        const ctx = cv.getContext("2d")

        const tl = map.containerPointToLatLng([0, 0])
        const br = map.containerPointToLatLng([size.x, size.y])

        L.DomUtil.setPosition(cv, map.containerPointToLayerPoint([0, 0]))

        ctx.clearRect(0, 0, cv.width, cv.height)

        // Screen/Lighter blending makes intersecting points brighten into a glowing core
        ctx.globalCompositeOperation = "lighter"

        cells.forEach(({ lon, lat, aurora }) => {
          if (aurora < 5) return // Ignore dead zones to save CPU
          
          if (lat > tl.lat + 10 || lat < br.lat - 10) return

          const point = map.latLngToContainerPoint([
            lat,
            lon > 180 ? lon - 360 : lon,
          ])

          const zoom = map.getZoom()
          // Radius scales with zoom so the glow remains continuous
          const r = Math.max(15, zoom * 10) 

          // THE FIX: p is between 0 and 1.
          const p = aurora / 100
          let rgb = ""
          
          // Realistic Aurora Emission Spectrum
          if (p >= 0.8) {
            rgb = "255, 40, 100"  // EXTREME: High-Altitude Oxygen (Crimson/Pink)
          } else if (p >= 0.5) {
            rgb = "168, 85, 247"  // HIGH: Nitrogen Resonance (Violet/Purple)
          } else if (p >= 0.2) {
            rgb = "16, 185, 129"  // MEDIUM: Classic Aurora (Bright Emerald Green)
          } else {
            rgb = "4, 120, 87"    // LOW: Faint atmospheric glow (Dark Green)
          }

          // Radial gradient for the glassy, soft-light effect
          const grad = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, r)
          
          // The core is brighter, the edges fade perfectly to transparent
          grad.addColorStop(0, `rgba(${rgb}, ${0.3 + (p * 0.4)})`)     
          grad.addColorStop(0.4, `rgba(${rgb}, ${0.1 + (p * 0.2)})`)   
          grad.addColorStop(1, `rgba(${rgb}, 0)`)                      

          ctx.beginPath()
          ctx.arc(point.x, point.y, r, 0, Math.PI * 2)
          ctx.fillStyle = grad
          ctx.fill()
        })
      },
    })

    const layer = new CanvasOverlay()
    layer.addTo(map)
    canvasRef.current = layer

    return () => map.removeLayer(layer)
  }, [map, cells])

  return null
}

// ── Day/Night Cycle Overlay ──────────────────────────────
function DayNightLayer() {
  const map = useMap()

  useEffect(() => {
    const TerminatorOverlay = L.Layer.extend({
      onAdd(map) {
        this._map = map
        const pane = map.getPane("overlayPane")

        this._canvas = L.DomUtil.create("canvas", "", pane)
        this._canvas.style.position = "absolute"
        this._canvas.style.pointerEvents = "none"
        this._canvas.style.opacity = "0.3"
        this._canvas.style.mixBlendMode = "multiply"

        map.on("moveend zoomend resize", this._render, this)
        this._render()
      },

      onRemove(map) {
        L.DomUtil.remove(this._canvas)
        map.off("moveend zoomend resize", this._render, this)
      },

      _render() {
        const map = this._map
        const cv = this._canvas
        const size = map.getSize()

        cv.width = size.x
        cv.height = size.y

        const ctx = cv.getContext("2d")

        L.DomUtil.setPosition(cv, map.containerPointToLayerPoint([0, 0]))

        ctx.clearRect(0, 0, cv.width, cv.height)

        // Calculate sun position
        const now = new Date()
        const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000)
        const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * Math.PI / 180)
        const hour = now.getUTCHours() + now.getUTCMinutes() / 60
        const sunLon = (hour - 12) * 15

        // Draw night overlay
        ctx.fillStyle = "rgba(255, 255, 255, 0.94)"

        for (let x = 0; x < size.x; x += 10) {
          for (let y = 0; y < size.y; y += 10) {
            const latlng = map.containerPointToLatLng([x, y])
            const lat = latlng.lat * Math.PI / 180
            const lon = latlng.lng * Math.PI / 180
            const dec = declination * Math.PI / 180
            const HA = lon - (sunLon * Math.PI / 180)

            const alt = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(HA)

            if (alt > 0) {
              ctx.fillRect(x, y, 10, 10)
            }
          }
        }
      },
    })

    const layer = new TerminatorOverlay()
    layer.addTo(map)

    return () => map.removeLayer(layer)
  }, [map])

  return null
}

// ── Glassmorphism Location Marker ──────────────────────────────
function LocationMarker({ lat, lon, score }) {
  const map = useMap()

  useEffect(() => {
    if (!lat || !lon) return

    const color = "#ef4444" // Red color for current location

    const icon = L.divIcon({
      className: "custom-glass-marker",
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;">
          <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: ${color}; opacity: 0.4; animation: pulseGlow 2s infinite;"></div>
          <div style="width: 10px; height: 10px; border-radius: 50%; background: ${color}; border: 1.5px solid white; box-shadow: 0 0 10px ${color}, inset 0 0 4px rgba(255,255,255,0.8); z-index: 10;"></div>
        </div>
      `,
      iconAnchor: [12, 12],
    })

    const marker = L.marker([lat, lon], { icon }).addTo(map)

    // Add a dark, sleek popup
    marker.bindPopup(
      `<div style="font-family: monospace; text-align: center; color: #fff;">
         <div style="font-size: 10px; color: #94a3b8; letter-spacing: 1px; margin-bottom: 2px;">VISIBILITY SCORE</div>
         <div style="font-size: 16px; font-weight: bold; color: ${color};">${score ?? "--"}/100</div>
       </div>`,
      { className: 'glass-popup' }
    )

    return () => map.removeLayer(marker)
  }, [map, lat, lon, score])

  return null
}

// ── Main component ─────────────────────────────────────────────
export default function AuroraMap({ ovation, userLat, userLon, score }) {
  const cells = ovation?.cells ?? []

  return (
    <div className="relative flex-1 h-full w-full overflow-hidden rounded-xl border border-slate-700/50 shadow-inner bg-void">

      <MapContainer
        center={[userLat || 65, userLon || -10]}
        zoom={3}
        minZoom={2}
        maxZoom={8}
        maxBounds={MAP_MAX_BOUNDS}
        maxBoundsViscosity={1.0}
        zoomControl={false} // Hiding default controls for cleaner UI
        className="w-full h-full bg-[#030712] z-0"
      >
        {/* Very dark, desaturated base map perfect for glowing overlays */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          noWrap
        />

        <OvationLayer cells={cells} />
        <DayNightLayer />
        <SightingsLayer />

        {userLat && userLon && (
          <LocationMarker lat={userLat} lon={userLon} score={score} />
        )}
      </MapContainer>

      {/* Legend - Now integrated directly into the HUD via MapPage, or kept here as a fallback */}
      <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 z-[400] text-[8px] sm:text-[9px] text-slate-400 bg-black/60 backdrop-blur-md px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md border border-slate-800 font-mono tracking-wide shadow-lg pointer-events-none max-w-[90%]">
        GRID LOADED: {cells.length ? `${cells.length} SECTORS` : "AWAITING SYNC..."}
      </div>

    </div>
  )
}