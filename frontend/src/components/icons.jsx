/**
 * Inline SVG icons — drawn in code so there is nothing to download and they
 * inherit whatever colour the surrounding CSS sets.
 */

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
}

/**
 * The mark: a faceted shield standing in for the case, a lens standing in
 * for what it watches. The pupil is always the one champagne accent, never
 * `currentColor` — it stays gold even where the rest of the mark is drawn
 * as a near-invisible ink watermark.
 */
export const ShieldIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M12 2.8 17.3 4.7v6.2c0 5.6-2.3 9.2-5.3 10.7-3-1.5-5.3-5.1-5.3-10.7V4.7L12 2.8z" />
    <path d="M7.9 11.4c1.6-2.4 3-3.5 4.1-3.5s2.5 1.1 4.1 3.5c-1.6 2.4-3 3.5-4.1 3.5s-2.5-1.1-4.1-3.5z" />
    <circle cx="12" cy="11.4" r="1.15" fill="var(--signal, #b9a88c)" stroke="none" />
  </svg>
)

export const MotionIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M2.5 12h3l2.2-5.5L11.5 17l2.6-6.5 1.9 3.2h5.5" />
  </svg>
)

export const PersonIcon = (props) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="7.5" r="3.4" />
    <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />
  </svg>
)

export const VehicleIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M4 16v-3.2L6 8h12l2 4.8V16" />
    <path d="M2.5 16h19" />
    <circle cx="7.5" cy="17.4" r="1.5" />
    <circle cx="16.5" cy="17.4" r="1.5" />
  </svg>
)

export const PackageIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7z" />
    <path d="M4 8.5 12 13l8-4.5M12 13v7" />
  </svg>
)

export const AnimalIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M5 11.5c0-2 1.6-3.6 3.6-3.6h6.8c2 0 3.6 1.6 3.6 3.6v2.6a4.9 4.9 0 0 1-4.9 4.9h-4.2A4.9 4.9 0 0 1 5 14.1v-2.6z" />
    <path d="M7.2 7.9 5.6 4.6M16.8 7.9l1.6-3.3" />
    <path d="M10 13h.01M14 13h.01" />
  </svg>
)

export const CameraIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M3 8.5 17 5v7L3 15.5v-7z" />
    <path d="M6 15.5V20M17 8.5l4 1.5v-3l-4 1.5z" />
  </svg>
)

export const BellIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9z" />
    <path d="M10 18a2 2 0 0 0 4 0" />
  </svg>
)

export const GridIcon = (props) => (
  <svg {...base} {...props}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.2" />
  </svg>
)

export const SlidersIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </svg>
)

export const ExpandIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M4 9V4h5M20 15v5h-5M15 4h5v5M9 20H4v-5" />
  </svg>
)

export const EyeIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="2.8" />
  </svg>
)

export const LockIcon = (props) => (
  <svg {...base} {...props}>
    <rect x="5" y="10.5" width="14" height="10" rx="1.6" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </svg>
)

export const LogoutIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15" />
    <path d="M11 8l-4 4 4 4M7 12h10" />
  </svg>
)

export const ArrowIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
)

export const ChipIcon = (props) => (
  <svg {...base} {...props}>
    <rect x="7" y="7" width="10" height="10" rx="1.2" />
    <path d="M9.5 7V3.5M14.5 7V3.5M9.5 21v-3.5M14.5 21v-3.5M7 9.5H3.5M7 14.5H3.5M21 9.5h-3.5M21 14.5h-3.5" />
  </svg>
)

export const TagIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M12.6 3.5H5.5v7.1L14.9 20l7.1-7.1L12.6 3.5z" />
    <circle cx="8.7" cy="7.6" r="1.3" fill="currentColor" stroke="none" />
  </svg>
)

export const DropIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M12 3.5c3.5 4.4 6 8 6 10.8a6 6 0 1 1-12 0c0-2.8 2.5-6.4 6-10.8z" />
  </svg>
)

export const MenuIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
)

export const CloseIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)

/** Detection type -> icon. The secondary encoding alongside colour. */
export const DETECTION_ICONS = {
  motion: MotionIcon,
  person: PersonIcon,
  vehicle: VehicleIcon,
  package: PackageIcon,
  animal: AnimalIcon,
}

export const iconFor = (type) => DETECTION_ICONS[type] || BellIcon
