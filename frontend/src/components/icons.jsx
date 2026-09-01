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

export const ShieldIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M12 2.5 4.5 6v6c0 5 3.2 8.6 7.5 9.5 4.3-.9 7.5-4.5 7.5-9.5V6L12 2.5z" />
    <circle cx="12" cy="11" r="3.1" />
    <circle cx="12" cy="11" r="0.6" fill="currentColor" />
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

export const LogoutIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15" />
    <path d="M11 8l-4 4 4 4M7 12h10" />
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
