// Authorization utilization rules — single source of truth, shared by the
// dashboard tile (AuthorizationUtilizationTile) and the per-client detail
// page (ClientOverviewPage). When Jenny says "actually flag at 75% not
// 80%," it's one constant to change here and both screens update.
//
// Semantics are INVERTED from supervision: high % = bad. A client at 90%+
// is about to hit their insurance-authorized hour cap; we want to start the
// re-auth paperwork before that happens.
//
// Thresholds source: Jenny (target user) — May 5 working doc.

export const FLAGGED_THRESHOLD = 80
export const RED_THRESHOLD = 85
export const AMBER_LOWER = 75

export function utilizationClass(pct: number): { bar: string; text: string } {
  if (pct >= RED_THRESHOLD) return { bar: "bg-red-500",     text: "text-red-700" }
  if (pct >= AMBER_LOWER)   return { bar: "bg-amber-500",   text: "text-amber-700" }
  return                           { bar: "bg-emerald-500", text: "text-emerald-700" }
}

// Used hours = pct of authorized total. Rounded because mock data is whole
// hours and partial-hour displays read as a precision we don't have. If we
// ever surface true minute-level usage we'll switch to floor() here so we
// never overstate consumption.
export function usedHours(pct: number, totalHours: number): number {
  return Math.round((pct / 100) * totalHours)
}
