/**
 * 24-hour activity — one stacked bar per hour, split by detection type.
 *
 * Design notes worth knowing if you change this:
 *
 * - Every hour is drawn, including empty ones. A gap would read as missing
 *   data; a flat 2px line reads as "nothing happened", which is the truth.
 * - The whole column is the hover target, not just the bar. Hovering a 3px
 *   bar is miserable, especially on a laptop trackpad.
 * - Segments are separated by a 2px gap of background so two adjacent
 *   colours never touch and blur into one block.
 * - The legend is always shown, because there is more than one series, and
 *   each type also has an icon elsewhere in the app — colour is never the
 *   only thing telling them apart.
 */

import { useEffect, useState } from 'react'

import { DETECTION_TYPES, detection } from '../utils/detections'

/** "14:00" from an ISO hour bucket — always on the hour, so show the minutes. */
function hourOf(iso) {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export default function ActivityChart({ data, loading }) {
  const [hovered, setHovered] = useState(null)
  // Bars grow from the baseline on arrival rather than snapping to full
  // height — held back a frame so the browser paints the zero state first.
  const [grown, setGrown] = useState(false)

  useEffect(() => {
    if (loading) { setGrown(false); return }
    const frame = requestAnimationFrame(() => setGrown(true))
    return () => cancelAnimationFrame(frame)
  }, [loading, data])

  if (loading) {
    return <div className="panel chart"><div className="skel" style={{ height: 150 }} /></div>
  }

  const buckets = data?.buckets || []
  if (buckets.length === 0) return null

  const total = buckets.reduce((sum, b) => sum + b.total, 0)
  // Never divide by zero, and give a flat-but-nonzero chart a sane ceiling.
  const peak = Math.max(data.peak || 0, 1)

  return (
    <div className="panel chart">
      <div className="chart-head">
        <div>
          <div className="label">Activity · last 24 hours</div>
          <div style={{ fontFamily: 'var(--cond)', fontWeight: 300, fontSize: '1.9rem', marginTop: '0.3rem' }}>
            <span className="tabular">{total}</span>{' '}
            <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--ink-faint)', fontFamily: 'var(--mono)', letterSpacing: '0.08em' }}>
              detection{total === 1 ? '' : 's'}
            </span>
          </div>
        </div>
        <div className="label">peak {peak}/hr</div>
      </div>

      <div className="chart-plot">
        {buckets.map((bucket, index) => {
          // Stack tallest-first from the top so the bar reads top-down in the
          // same order as the legend.
          const segments = DETECTION_TYPES
            .map((type) => ({ type, count: bucket[type] || 0 }))
            .filter((s) => s.count > 0)

          return (
            <div
              key={bucket.hour}
              className="chart-col"
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
            >
              {hovered === index && (
                <div
                  className="chart-tip"
                  // Keep the tooltip inside the panel at the two edges.
                  style={{
                    left: index < 3 ? '0' : index > buckets.length - 4 ? 'auto' : '50%',
                    right: index > buckets.length - 4 ? '0' : 'auto',
                    transform: index < 3 || index > buckets.length - 4 ? 'none' : 'translateX(-50%)',
                  }}
                >
                  <div className="chart-tip-hour">{hourOf(bucket.hour)} · {bucket.total} total</div>
                  {segments.length === 0 ? (
                    <div className="chart-tip-row dim">No detections</div>
                  ) : (
                    segments.map(({ type, count }) => (
                      <div className="chart-tip-row" key={type}>
                        <span className="chart-tip-dot" style={{ background: detection(type).color }} />
                        {detection(type).label}
                        <span className="chart-tip-n">{count}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              <div className="chart-bar">
                {segments.length === 0 ? (
                  <div className="chart-zero" style={{ transitionDelay: `${index * 12}ms` }} />
                ) : (
                  segments.map(({ type, count }) => (
                    <div
                      key={type}
                      className="chart-seg"
                      style={{
                        '--seg': detection(type).color,
                        height: grown ? `${(count / peak) * 100}%` : '0%',
                        transitionDelay: `${index * 12}ms`,
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="chart-axis">
        <span>{hourOf(buckets[0].hour)}</span>
        <span>{hourOf(buckets[Math.floor(buckets.length / 2)].hour)}</span>
        <span>now</span>
      </div>

      <div className="legend">
        {DETECTION_TYPES.map((type) => (
          <span className="legend-item" key={type}>
            <span className="legend-swatch" style={{ background: detection(type).color }} />
            {detection(type).label}
          </span>
        ))}
      </div>
    </div>
  )
}
