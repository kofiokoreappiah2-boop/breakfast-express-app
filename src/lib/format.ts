/** Formats a number as Ghana cedis, e.g. GH₵5.00 */
export function formatCedis(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `GH₵${safe.toFixed(2)}`;
}

/** Rounds money to 2dp to avoid floating point drift. */
export function money(amount: number): number {
  return Math.round((Number.isFinite(amount) ? amount : 0) * 100) / 100;
}
