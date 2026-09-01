/**
 * One instrument readout: a label, a big number, and a coloured spine.
 *
 * `tone` sets the spine colour and the numeral colour, so a tile can go red
 * when its number means something bad without anything else changing.
 */

export default function StatTile({ label, value, sub, tone, glow, className = '' }) {
  return (
    <div
      className={`panel brackets stat ${className}`}
      style={{
        '--stat-accent': tone,
        '--stat-ink': tone,
        '--stat-glow': glow ? tone : 'transparent',
      }}
    >
      <div className="label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}
