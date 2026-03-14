import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import styles from './AuroraMap.module.css'

// ── OVATION canvas overlay ────────────────────────────────────────────────────
function OvationLayer({ cells }) {
  const map = useMap()
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!cells?.length) return

    const CanvasOverlay = L.Layer.extend({
      onAdd(map) {
        this._map = map
        const pane = map.getPane('overlayPane')
        this._canvas = L.DomUtil.create('canvas', styles.ovationCanvas, pane)
        this._canvas.style.position = 'absolute'
        this._canvas.style.pointerEvents = 'none'
        map.on('moveend zoomend resize', this._render, this)
        this._render()
      },
      onRemove(map) {
        L.DomUtil.remove(this._canvas)
        map.off('moveend zoomend resize', this._render, this)
      },
      _render() {
        const map   = this._map
        const cv    = this._canvas
        const size  = map.getSize()
        cv.width    = size.x
        cv.height   = size.y
        const ctx   = cv.getContext('2d')
        const tl    = map.containerPointToLatLng([0, 0])
        const br    = map.containerPointToLatLng([size.x, size.y])
        L.DomUtil.setPosition(cv, map.containerPointToLayerPoint([0, 0]))

        ctx.clearRect(0, 0, cv.width, cv.height)

        cells.forEach(({ lon, lat, aurora }) => {
          if (aurora < 5) return
          // Skip if outside visible bounds (with padding)
          if (lat > tl.lat + 5 || lat < br.lat - 5) return

          const point = map.latLngToContainerPoint([lat, lon > 180 ? lon - 360 : lon])
          const zoom  = map.getZoom()
          const r     = Math.max(4, zoom * 3)

          let r_, g_, b_
          const p = aurora / 100
          if (p > 0.8)      { r_ = 255; g_ = 77;  b_ = 77  }
          else if (p > 0.5) { r_ = 255; g_ = 184; b_ = 48  }
          else if (p > 0.2) { r_ = 0;   g_ = 255; b_ = 163 }
          else               { r_ = 0;   g_ = 120; b_ = 70  }

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

// ── Day/night terminator ──────────────────────────────────────────────────────
function TerminatorLayer() {
  const map = useMap()

  useEffect(() => {
    const getSunPosition = () => {
      const now = new Date()
      const JD  = now / 86400000 + 2440587.5
      const n   = JD - 2451545.0
      const L0  = (280.46 + 0.9856474 * n) % 360
      const g   = ((357.528 + 0.9856003 * n) % 360) * Math.PI / 180
      const lam = (L0 + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * Math.PI / 180
      const eps = 23.439 * Math.PI / 180
      const decl = Math.asin(Math.sin(eps) * Math.sin(lam)) * 180 / Math.PI
      const GMST = (18.697375 + 24.065709824279 * (JD - 2451545)) % 24
      const sunLon = -(GMST * 15 - 180)
      return { decl, sunLon }
    }

    const drawTerminator = () => {
      const { decl, sunLon } = getSunPosition()
      const pts = []
      for (let lon = -180; lon <= 180; lon += 2) {
        const x   = (lon - sunLon) * Math.PI / 180
        const lat = Math.atan(-Math.cos(x) / Math.tan(decl * Math.PI / 180)) * 180 / Math.PI
        pts.push([lat, lon])
      }

      if (window._terminatorLayer) map.removeLayer(window._terminatorLayer)
      const poly = L.polyline(pts, {
        color: 'rgba(0,212,255,0.4)',
        weight: 1.5,
        dashArray: '4 6',
      })
      poly.addTo(map)
      window._terminatorLayer = poly
    }

    drawTerminator()
    const t = setInterval(drawTerminator, 60000)
    return () => {
      clearInterval(t)
      if (window._terminatorLayer) map.removeLayer(window._terminatorLayer)
    }
  }, [map])

  return null
}

// ── Location marker ───────────────────────────────────────────────────────────
function LocationMarker({ lat, lon, score }) {
  const map = useMap()

  useEffect(() => {
    if (!lat || !lon) return
    const color = score >= 70 ? '#00ffa3' : score >= 40 ? '#ffb830' : '#ff4d4d'
    const icon = L.divIcon({
      className: '',
      html: `<div style="
        width:14px;height:14px;border-radius:50%;
        background:${color};
        border:2px solid #fff;
        box-shadow:0 0 10px ${color};
      "></div>`,
      iconAnchor: [7, 7],
    })
    const marker = L.marker([lat, lon], { icon }).addTo(map)
    marker.bindPopup(`<b style="font-family:monospace">Score: ${score ?? '--'}/100</b>`)
    return () => map.removeLayer(marker)
  }, [map, lat, lon, score])

  return null
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AuroraMap({ ovation, userLat, userLon, score }) {
  const cells = ovation?.cells ?? []

  return (
    <div className={styles.wrap}>
      <MapContainer
        center={[65, 0]}
        zoom={3}
        minZoom={2}
        maxZoom={8}
        className={styles.map}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution=""
        />
        <OvationLayer cells={cells} />
        <TerminatorLayer />
        {userLat && userLon && (
          <LocationMarker lat={userLat} lon={userLon} score={score} />
        )}
      </MapContainer>

      <div className={styles.legend}>
        <div className={styles.legendItem}><span style={{background:'#ff4d4d'}} />80–100%</div>
        <div className={styles.legendItem}><span style={{background:'#ffb830'}} />50–80%</div>
        <div className={styles.legendItem}><span style={{background:'#00ffa3'}} />20–50%</div>
        <div className={styles.legendItem}><span style={{background:'#007844'}} />5–20%</div>
      </div>

      <div className={styles.ovationLabel}>
        OVATION · {cells.length ? `${cells.length} cells` : 'loading...'}
        {ovation?.observation_time && (
          <> · {new Date(ovation.observation_time).toUTCString().slice(17, 25)} UTC</>
        )}
      </div>
    </div>
  )
}
