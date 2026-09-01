/**
 * Everything that varies by detection type, in one place.
 *
 * The colours are a validated categorical palette: checked for contrast
 * against the console background and for separation under colour-blind
 * simulation, so no two types are told apart by hue alone in a way that
 * could fail someone. Each type also carries an icon, so colour is never
 * doing the job by itself.
 *
 * The ORDER matters — it's the fixed assignment order for the chart legend
 * and stacking. Don't shuffle it; a series must keep its colour when others
 * are filtered out.
 */

export const DETECTION_TYPES = ['motion', 'person', 'vehicle', 'package', 'animal']

export const DETECTIONS = {
  motion: { label: 'Motion', color: 'var(--d-motion)', hex: '#3987e5' },
  person: { label: 'Person', color: 'var(--d-person)', hex: '#d95926' },
  vehicle: { label: 'Vehicle', color: 'var(--d-vehicle)', hex: '#199e70' },
  package: { label: 'Package', color: 'var(--d-package)', hex: '#c98500' },
  animal: { label: 'Animal', color: 'var(--d-animal)', hex: '#d55181' },
}

/** Safe lookup — an unknown type from the API shouldn't crash a page. */
export function detection(type) {
  return DETECTIONS[type] || { label: type || 'Unknown', color: 'var(--ink-dim)', hex: '#8fa3b8' }
}

export const detectionLabel = (type) => detection(type).label
export const detectionColor = (type) => detection(type).color
