/**
 * The landing page's primary nav: a row of circular icon badges that expand
 * into labeled pills on hover/focus.
 *
 * Adapted from a pasted "gradient-menu" component — same expand mechanic,
 * but recoloured entirely: the original gave each item its own rainbow
 * gradient, which is exactly what the rest of this app deliberately avoids.
 * Here every item shares the one champagne accent instead, consistent with
 * how it's used everywhere else (the primary button, the active nav state,
 * the one indulgent flourish on an otherwise quiet page).
 */

import { Link } from 'react-router-dom'

export default function PillNav({ items, className = '' }) {
  return (
    <nav className={`pillnav ${className}`.trim()} aria-label="Primary">
      <ul className="pillnav-list">
        {items.map(({ label, Icon, href }) => {
          // A route gets client-side routing; a same-page "#section" stays
          // a plain anchor, since that's the correct way to jump within
          // one static page.
          const isRoute = href.startsWith('/')
          const Tag = isRoute ? Link : 'a'
          const linkProp = isRoute ? { to: href } : { href }
          return (
            <li key={label}>
              <Tag className="pillnav-item" {...linkProp}>
                <span className="pillnav-icon"><Icon /></span>
                <span className="pillnav-label">{label}</span>
              </Tag>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
