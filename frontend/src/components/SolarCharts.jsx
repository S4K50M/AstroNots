import { ResponsiveContainer, AreaChart, Area, ReferenceLine, Tooltip, XAxis } from 'recharts'
import styles from './SolarCharts.module.css'

function fmt(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`
}

function Sparkline({ data, dataKey, color, threshold, thresholdLabel, unit, label, latest, alertColor }) {
  const isAlert = threshold != null && (
    (threshold < 0 && latest != null && latest < threshold) ||
    (threshold > 0 && latest != null && latest > threshold)
  )

  const chartData = (data ?? []).map(r => ({
    t: fmt(r.timestamp),
    v: r[dataKey] ?? null,
  })).filter(r => r.v != null)

  return (
    <div className={styles.chart}>
      <div className={styles.header}>
        <div>
          <div className={styles.label}>{label}</div>
          <div className={styles.threshold}>{thresholdLabel}</div>
        </div>
        <div className={`${styles.value} ${isAlert ? styles.alert : ''}`}>
          {latest != null ? (dataKey === 'speed' ? Math.round(latest) : latest.toFixed(1)) : '--'}
          <span className={styles.unit}>{unit}</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={72}>
        <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0}    />
            </linearGradient>
          </defs>
          <XAxis dataKey="t" hide />
          {threshold != null && (
            <ReferenceLine y={threshold} stroke="rgba(255,77,77,0.5)" strokeDasharray="4 4" strokeWidth={1} />
          )}
          <Tooltip
            contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'var(--mono)', fontSize: 11 }}
            labelStyle={{ color: 'var(--text-muted)' }}
            itemStyle={{ color }}
            formatter={v => [`${v?.toFixed(2)} ${unit}`, label]}
          />
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#grad-${dataKey})`}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function SolarCharts({ mag, plasma }) {
  const recent   = mag?.recent   ?? []
  const pRecent  = plasma?.recent ?? []

  return (
    <div className={styles.wrap}>
      <Sparkline
        data={recent}
        dataKey="bz_gsm"
        color="#00ffa3"
        threshold={-7}
        thresholdLabel="ALERT: −7.0 nT"
        unit="nT"
        label="IMF Bz"
        latest={mag?.latest?.bz_gsm}
      />
      <Sparkline
        data={pRecent}
        dataKey="speed"
        color="#00d4ff"
        threshold={500}
        thresholdLabel="ALERT: 500 km/s"
        unit="km/s"
        label="Solar Wind Speed"
        latest={plasma?.latest?.speed}
      />
    </div>
  )
}
