import { useEffect, useRef } from "react"
import { MapContainer, TileLayer, useMap } from "react-leaflet"
import SightingsLayer from "./SightingsLayer"
import L from "leaflet"

// ── OVATION canvas overlay ─────────────────────────────────────
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
        this._canvas.style.opacity = "0.9"
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

        cells.forEach(({ lon, lat, aurora }) => {
          if (aurora < 5) return
          if (lat > tl.lat + 5 || lat < br.lat - 5) return

          const point = map.latLngToContainerPoint([
            lat,
            lon > 180 ? lon - 360 : lon,
          ])

          const zoom = map.getZoom()
          const r = Math.max(4, zoom * 3)

          let r_, g_, b_
          const p = aurora / 100

          if (p > 0.8) {
            r_ = 255
            g_ = 77
            b_ = 77
          } else if (p > 0.5) {
            r_ = 255
            g_ = 184
            b_ = 48
          } else if (p > 0.2) {
            r_ = 0
            g_ = 255
            b_ = 163
          } else {
            r_ = 0
            g_ = 120
            b_ = 70
          }

          ctx.beginPath()
          ctx.arc(point.x, point.y, r, 0, Math.PI * 2)

          ctx.fillStyle = `rgba(${r_},${g_},${b_},${0.25 + p * 0.45})`
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

// ── Location marker ────────────────────────────────────────────
function LocationMarker({ lat, lon, score }) {
  const map = useMap()

  useEffect(() => {
    if (!lat || !lon) return

    const color =
      score >= 70 ? "#00ffa3" : score >= 40 ? "#ffb830" : "#ff4d4d"

    const icon = L.divIcon({
      className: "",
      html: `<div style="
        width:14px;
        height:14px;
        border-radius:50%;
        background:${color};
        border:2px solid #fff;
        box-shadow:0 0 10px ${color};
      "></div>`,
      iconAnchor: [7, 7],
    })

    const marker = L.marker([lat, lon], { icon }).addTo(map)

    marker.bindPopup(
      `<b style="font-family:monospace">Score: ${score ?? "--"}/100</b>`
    )

    return () => map.removeLayer(marker)
  }, [map, lat, lon, score])

  return null
}

// ── Main component ─────────────────────────────────────────────
export default function AuroraMap({ ovation, userLat, userLon, score }) {
  const cells = ovation?.cells ?? []

  return (
    <div className="relative flex-1 min-h-[340px] overflow-hidden rounded-xl border border-white/10">

      <MapContainer
        center={[65, 0]}
        zoom={3}
        minZoom={2}
        maxZoom={8}
        zoomControl={true}
        className="w-full h-full min-h-[340px] bg-black"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution=""
        />

        <OvationLayer cells={cells} />
        <SightingsLayer />

        {userLat && userLon && (
          <LocationMarker lat={userLat} lon={userLon} score={score} />
        )}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-[500] flex flex-col gap-1 bg-black/70 border border-white/10 rounded-lg px-3 py-2 backdrop-blur">
        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-red-400"></span>80–100%
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>50–80%
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>20–50%
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-green-700"></span>5–20%
        </div>
      </div>

      {/* Label */}
      <div className="absolute bottom-4 left-4 z-[500] text-[10px] text-gray-400 bg-black/60 px-2 py-1 rounded font-mono tracking-wide">
        OVATION · {cells.length ? `${cells.length} cells` : "loading..."}
        {ovation?.observation_time && (
          <> · {new Date(ovation.observation_time).toUTCString().slice(17, 25)} UTC</>
        )}
      </div>

    </div>
  )
}