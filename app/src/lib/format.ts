/**
 * Karma formatting utilities.
 *
 * The ledger stores integer karma points in fields named *Cents (e.g.
 * `balanceCents`, `escrowCents`). Slice 23b treats those integers DIRECTLY as
 * karma — no division by 100, no decimals.  When real payments land (slice 23)
 * this layer will divide by 100 and switch to USD display.
 *
 * Glyph: ✦  (BLACK FOUR POINTED STAR, U+2726)
 * Compact:  ✦ 11,000
 * Prose:    11,000 karma
 */

/**
 * Format a karma amount as "✦ 11,000".
 * The input is the raw integer stored in the ledger (interim: integer holds
 * karma points (slice 23b); becomes USD-cents when real payments land (slice 23)).
 */
export function formatKarma(points: number): string {
	const sign = points < 0 ? '-' : '';
	const abs = Math.abs(Math.round(points));
	const formatted = abs.toLocaleString('en-US');
	return `${sign}✦ ${formatted}`;
}
