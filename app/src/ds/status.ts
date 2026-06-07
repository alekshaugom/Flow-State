import { DesignStatus, STATUS_COLORS, STATUS_LABEL, mapStatusToDesign } from '../constants';

/**
 * Returns the foreground CSS variable string for a status.
 *
 * Backend resources surface statuses OUTSIDE the 5-key DesignStatus ramp
 * (e.g. 'too-low', 'no-flow', 'unknown', 'expert-only' — the last happens when a
 * section's gauge has no current reading). The Dashboard pre-maps them via
 * mapStatusToDesign, but CorridorView / raw RiverDetail can pass them straight
 * through. Route everything through mapStatusToDesign so STATUS_COLORS is always
 * indexed by a valid key — otherwise `STATUS_COLORS[status].fg` throws on an
 * unmapped status and blanks the whole screen. Bound to constants.ts.
 */
export function statusColor(status: DesignStatus | string): string {
  return STATUS_COLORS[mapStatusToDesign(status)].fg;
}

/**
 * Returns the human-readable label for a status. Prefers the exact backend label
 * when defined (e.g. 'Too Low', 'No Flow', 'Unknown'), else falls back to the
 * mapped ramp label. Bound to constants.ts STATUS_LABEL — no parallel map.
 */
export function statusLabel(status: DesignStatus | string): string {
  return STATUS_LABEL[status] ?? STATUS_LABEL[mapStatusToDesign(status)] ?? status;
}
