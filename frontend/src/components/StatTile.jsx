/**
 * One instrument readout: a label, a big number, and a tone colour.
 *
 * `tone` sets the numeral colour, so a tile can go red when its number means
 * something bad without anything else changing. Numeric values count up from
 * zero on arrival rather than just appearing — the one flourish this screen
 * gets, so it's worth having.
 */

import { useEffect, useRef, useState } from 'react'

const EASE = (t) => 1 - (1 - t) ** 3 // ease-out cubic
const DURATION = 900

/** Splits "7/12" into the piece that counts (7) and the piece that doesn't (/12). */
function parse(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return { n: value, suffix: '' }
  if (typeof value === 'string') {
    const match = value.match(/^(\d+)(.*)$/)
    if (match) return { n: Number(match[1]), suffix: match[2] }
  }
  return null
}

function useCountUp(value) {
  const [display, setDisplay] = useState(value)
  const prev = useRef(null)

  useEffect(() => {
    const parsed = parse(value)
    if (!parsed) { setDisplay(value); prev.current = null; return }

    const from = prev.current ?? 0
    prev.current = parsed.n
    if (from === parsed.n) { setDisplay(value); return }

    let frame
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / DURATION)
      const current = Math.round(from + (parsed.n - from) * EASE(t))
      setDisplay(`${current}${parsed.suffix}`)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return display
}

export default function StatTile({ label, value, sub, tone, className = '' }) {
  const display = useCountUp(value)

  return (
    <div
      className={`stat ${className}`}
      style={{ '--stat-ink': tone }}
    >
      <div className="label">{label}</div>
      <div className="stat-value tabular">{display}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}
