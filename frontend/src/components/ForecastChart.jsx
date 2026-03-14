import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, ReferenceLine, Tooltip, ResponsiveContainer } from 'recharts'
import styles from './ForecastChart.module.css'

export default function ForecastChart() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json')
      .then(r => r.json())
      .then(raw => {
        const rows = raw.slice(1).map(row => ({
          time:     row[0].slice(5, 13).replace(' ', ' '),
          kp:       parseFloat(row[1]),
          observed: row[2] === 'observed',
        }))
        // last 8 observed + all predicted
        const observed  = rows.filter(r => r.observed).slice(-8)
        const predicted = rows.filter(r => !r.observed)
        setData([...observed, ...predicted])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const kpColor = kp => kp >= 7 ? '#ff4d4d' : kp >= 5 ? '#ffb830' : '#00ffa3'

  const CustomDot = ({ cx, cy, payload }) => {
    if (!payload) return null
    const color = kpColor(payload.kp)
    return <circle cx={cx} cy={cy} r={3} fill={color} stroke="none" />
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.label}>3-DAY Kp FORECAST</span>
        <div className={styles.legend}>
          <span className={styles.obs}>— observed</span>
          <span className={styles.pred}>— predicted</span>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading forecast…</div>
      ) : (
        <ResponsiveContainer width="100%" height={100}>
          <AreaChart data={data} margin={{ top: 8, right: 4, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="kpGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#00ffa3" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00ffa3" stopOpacity={0}   />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              tick={{ fontSize: 9, fontFamily: 'var(--mono)', fill: 'var(--text-dim)' }}
              interval={7}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 9]}
              ticks={[0,3,5,7,9]}
              tick={{ fontSize: 9, fontFamily: 'var(--mono)', fill: 'var(--text-dim)' }}
              tickLine={false}
              axisLine={false}
            />
            <ReferenceLine y={5} stroke="rgba(255,184,48,0.4)" strokeDasharray="4 4" strokeWidth={1} />
            <ReferenceLine y={7} stroke="rgba(255,77,77,0.4)"  strokeDasharray="4 4" strokeWidth={1} />
            <Tooltip
              contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'var(--mono)', fontSize: 11 }}
              labelStyle={{ color: 'var(--text-muted)' }}
              formatter={(v, _, props) => [
                `Kp ${v?.toFixed(2)} — ${props.payload?.observed ? 'observed' : 'predicted'}`,
              ]}
            />
            <Area
              type="monotone"
              dataKey="kp"
              stroke="#00ffa3"
              strokeWidth={1.5}
              strokeDasharray="0"
              fill="url(#kpGrad)"
              dot={<CustomDot />}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}

      <div className={styles.storms}>
        {[
          { kp: 5, label: 'G1', color: 'var(--teal)' },
          { kp: 6, label: 'G2', color: 'var(--aurora)' },
          { kp: 7, label: 'G3', color: 'var(--amber)' },
          { kp: 8, label: 'G4', color: 'var(--red)' },
        ].map(s => (
          <div key={s.kp} className={styles.stormTag} style={{ color: s.color, borderColor: s.color }}>
            Kp{s.kp}+ = {s.label}
          </div>
        ))}
      </div>
    </div>
  )
}
