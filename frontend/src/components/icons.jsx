/**
 * Small inline SVG icons.
 *
 * These are drawn with code rather than loaded as image files, so there are no
 * extra downloads and they can take their colour from the CSS around them.
 */

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
}

export const ShieldIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M12 2 4 5.5v6c0 5.2 3.4 8.9 8 10 4.6-1.1 8-4.8 8-10v-6L12 2z" />
    <circle cx="12" cy="11" r="3" />
  </svg>
)

export const MotionIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M3 12h3l2-5 4 10 2.5-6 2 3h4" />
  </svg>
)

export const PersonIcon = (props) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="7.5" r="3.5" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
  </svg>
)

export const VehicleIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M4 16v-3.2L6 8h12l2 4.8V16" />
    <path d="M2.5 16h19" />
    <circle cx="7.5" cy="17.5" r="1.6" />
    <circle cx="16.5" cy="17.5" r="1.6" />
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
    <path d="M5 11c0-2 1.6-3.5 3.5-3.5h7C17.4 7.5 19 9 19 11v3a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5v-3z" />
    <path d="M7 7.5 5.5 4.5M17 7.5 18.5 4.5" />
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

export const ExpandIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M4 9V4h5M20 15v5h-5M15 4h5v5M9 20H4v-5" />
  </svg>
)

/** Maps a detection type from the API to its icon. */
export const DETECTION_ICONS = {
  motion: MotionIcon,
  person: PersonIcon,
  vehicle: VehicleIcon,
  package: PackageIcon,
  animal: AnimalIcon,
}
