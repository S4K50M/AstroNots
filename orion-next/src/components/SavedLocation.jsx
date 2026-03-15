import { useState, useEffect } from "react"
import { saveLocation, getLocations, deleteLocation, getVisibility } from "../services/api"

export default function SavedLocations({ currentLat, currentLon }) {
  const [locations, setLocations] = useState([])
  const [name, setName] = useState("")
  const [threshold, setThreshold] = useState(60)
  const [saving, setSaving] = useState(false)
  const [scores, setScores] = useState({})

  const load = async () => {
    try {
      const data = await getLocations()
      setLocations(data.locations)

      data.locations.forEach(async loc => {
        try {
          const s = await getVisibility(loc.lat, loc.lon)
          setScores(prev => ({ ...prev, [loc.id]: s.composite_score }))
        } catch {}
      })
    } catch {}
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)

    try {
      await saveLocation({
        name,
        lat: currentLat,
        lon: currentLon,
        threshold
      })

      setName("")
      await load()
    } catch {}

    setSaving(false)
  }

  const handleDelete = async id => {
    await deleteLocation(id)
    await load()
  }

  const scoreColor = s =>
    s >= 70 ? "#00ffa3" :
    s >= 40 ? "#ffb830" :
    "#ff4d4d"

  return (
    <div className="flex flex-col gap-3">

      {/* Title */}
      <div className="text-[10px] uppercase tracking-widest text-gray-500 border-b border-white/10 pb-2 font-mono">
        Saved Locations
      </div>

      {/* Add location */}
      <div className="flex flex-col gap-2">

        <input
          className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2
          text-[12px] font-mono text-white outline-none
          focus:border-emerald-400/40 placeholder:text-gray-500"
          placeholder="Location name"
          value={name}
          onChange={e => setName(e.target.value)}
        />

        <div className="flex items-center gap-2 flex-wrap">

          <span className="text-[10px] text-gray-500 font-mono whitespace-nowrap">
            Alert when score ≥
          </span>

          <input
            type="range"
            min="20"
            max="90"
            value={threshold}
            onChange={e => setThreshold(Number(e.target.value))}
            className="flex-1"
          />

          <span className="text-[12px] font-mono text-emerald-400 min-w-[24px]">
            {threshold}
          </span>

        </div>

        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="font-mono text-[11px] tracking-wide
          bg-emerald-400/10 border border-emerald-400/30 text-emerald-400
          rounded-lg px-3 py-2
          hover:bg-emerald-400/20 transition
          disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : "+ SAVE CURRENT LOCATION"}
        </button>

      </div>

      {locations.length === 0 && (
        <div className="text-[11px] text-gray-500 font-mono">
          No saved locations yet
        </div>
      )}

      {/* Locations list */}
      {locations.map(loc => {
        const score = scores[loc.id]
        const alertFiring = score != null && score >= loc.threshold

        return (
          <div
            key={loc.id}
            className={`bg-zinc-900 border rounded-lg px-3 py-2 transition
            ${alertFiring
              ? "border-emerald-400/50 bg-emerald-400/10"
              : "border-white/10"
            }`}
          >

            <div className="flex items-center gap-2 mb-1">

              <span className="text-[12px] font-mono font-bold text-white flex-1">
                {loc.name}
              </span>

              {alertFiring && (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 px-2 py-[2px] rounded">
                  ⚡ ALERT
                </span>
              )}

              <button
                onClick={() => handleDelete(loc.id)}
                className="text-gray-500 hover:text-red-400 text-[12px]"
              >
                ✕
              </button>

            </div>

            <div className="flex gap-3 flex-wrap text-[10px] font-mono text-gray-400">

              <span>
                {loc.lat.toFixed(2)}, {loc.lon.toFixed(2)}
              </span>

              <span>
                Threshold: {loc.threshold}
              </span>

              {score != null && (
                <span
                  style={{ color: scoreColor(score), fontWeight: 700 }}
                >
                  Score: {Math.round(score)}/100
                </span>
              )}

            </div>

          </div>
        )
      })}
    </div>
  )
}