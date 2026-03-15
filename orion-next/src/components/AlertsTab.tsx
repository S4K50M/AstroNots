import { useState } from "react"

function parseMessage(msg: string) {
  if (!msg) return { title: "Unknown Alert", impacts: [], validFrom: "", validUntil: "" }

  const lines = msg.replace(/\r/g, "").split("\n").filter(l => l.trim())

  const titleLine = lines.find(
    l => l.includes("WARNING") || l.includes("WATCH") || l.includes("ALERT") || l.includes("SUMMARY")
  )
  const title = titleLine ? titleLine.trim() : lines[0]

  const validFrom = lines.find(l => l.startsWith("Valid From"))?.replace("Valid From: ", "") || ""
  const validUntil = lines.find(l => l.includes("Now Valid Until") || l.includes("Valid To"))?.split(": ")[1] || ""

  const impactStart = lines.findIndex(l => l.includes("Potential Impacts"))
  const impacts =
    impactStart >= 0
      ? lines.slice(impactStart + 1).filter(l => l.trim() && !l.includes("www.")).slice(0, 4)
      : []

  return { title, impacts, validFrom, validUntil }
}

function severityFromId(product_id?: string) {
  if (!product_id) return "info"
  if (product_id.includes("K08") || product_id.includes("K09")) return "extreme"
  if (product_id.includes("K07")) return "severe"
  if (product_id.includes("K06") || product_id.includes("K05")) return "moderate"
  if (product_id.includes("K04") || product_id.includes("K03")) return "minor"
  return "info"
}

const SEVERITY_COLORS: any = {
  extreme: "text-red-400 border-red-400",
  severe: "text-red-400 border-red-400",
  moderate: "text-yellow-400 border-yellow-400",
  minor: "text-cyan-400 border-cyan-400",
  info: "text-slate-400 border-slate-400",
}

const SEVERITY_LABELS: any = {
  extreme: "G4-G5 EXTREME",
  severe: "G3 STRONG",
  moderate: "G1-G2 STORM",
  minor: "WATCH",
  info: "INFO",
}

export default function AlertsTab({ alerts, wsAlerts }: any) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const [filter, setFilter] = useState("all")

  const noaaAlerts = (alerts?.alerts || []).slice(0, 20)

  const filtered =
    filter === "all"
      ? noaaAlerts
      : noaaAlerts.filter((a: any) => {
          const sev = severityFromId(a.product_id)
          if (filter === "storm") return ["extreme", "severe", "moderate"].includes(sev)
          if (filter === "watch") return sev === "minor"
          return true
        })

  return (
    <div className="flex flex-col gap-2">

      {/* Real-time alerts */}
      {wsAlerts?.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="text-[10px] uppercase tracking-widest text-gray-400 border-b border-white/10 pb-2">
            Real-time Events
          </div>

          {wsAlerts.map((a: any, i: number) => (
            <div
              key={i}
              className="flex flex-col gap-1 bg-zinc-800 rounded-md p-2 border-l-4 border-teal-400"
            >
              <span className="text-[10px] font-bold tracking-wide text-teal-400">
                {a.event?.type ?? a.type}
              </span>

              <span className="text-[11px] text-gray-400">
                {a.event?.bz_gsm != null && `Bz ${a.event.bz_gsm.toFixed(1)} nT`}
                {a.event?.speed_km_s != null && ` · Speed ${Math.round(a.event.speed_km_s)} km/s`}
                {a.event?.warning && ` · ${a.event.warning}`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2">
        {["all", "storm", "watch"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-[10px] px-3 py-1 rounded-md border transition
            ${filter === f
              ? "text-green-400 border-white/20 bg-green-500/10"
              : "text-gray-400 border-white/10 hover:text-white"}
            `}
          >
            {f.toUpperCase()}
          </button>
        ))}

        <span className="text-[10px] text-gray-500 ml-auto">
          {filtered.length} alerts
        </span>
      </div>

      {/* Alerts List */}
      <div className="flex flex-col gap-1 max-h-[400px] overflow-y-auto">

        {filtered.length === 0 && (
          <div className="text-[11px] text-gray-500">
            No alerts matching filter
          </div>
        )}

        {filtered.map((alert: any, i: number) => {
          const sev = severityFromId(alert.product_id)
          const color = SEVERITY_COLORS[sev]
          const label = SEVERITY_LABELS[sev]
          const parsed = parseMessage(alert.message)

          const isOpen = expanded === i

          const time = alert.issue_datetime
            ? new Date(alert.issue_datetime).toUTCString().slice(5, 22) + " UTC"
            : ""

          return (
            <div
              key={i}
              onClick={() => setExpanded(isOpen ? null : i)}
              className={`bg-zinc-900 rounded-md p-3 border-l-4 cursor-pointer hover:bg-zinc-800 transition ${color}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold tracking-wide">
                  {label}
                </span>

                <span className="text-[10px] text-gray-500 flex-1">
                  {time}
                </span>

                <span className="text-[9px] text-gray-500">
                  {isOpen ? "▲" : "▼"}
                </span>
              </div>

              <div className="text-[11px] text-gray-300 leading-snug">
                {parsed.title}
              </div>

              {isOpen && (
                <div className="mt-2 flex flex-col gap-1">

                  {parsed.validFrom && (
                    <div className="text-[10px] text-gray-500">
                      Valid: {parsed.validFrom} → {parsed.validUntil}
                    </div>
                  )}

                  {parsed.impacts.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <div className="text-[10px] text-gray-500">
                        Potential Impacts:
                      </div>

                      {parsed.impacts.map((imp: string, j: number) => (
                        <div key={j} className="text-[11px] text-gray-300 pl-1">
                          · {imp}
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}