import { DesignStatus, STATUS_COLORS, STATUS_LABEL } from '../constants';

/**
 * Returns the foreground CSS variable string for a given DesignStatus.
 * Bound to constants.ts STATUS_COLORS — no parallel color map.
 */
export function statusColor(status: DesignStatus): string {
  return STATUS_COLORS[status].fg;
}

/**
 * Returns the human-readable label for a given DesignStatus.
 * Bound to constants.ts STATUS_LABEL — no parallel label map.
 */
export function statusLabel(status: DesignStatus): string {
  return STATUS_LABEL[status] ?? status;
}
