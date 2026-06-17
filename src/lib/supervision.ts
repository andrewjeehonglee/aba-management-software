// Supervision compliance rules — single source of truth shared by the
// dashboard tile (SupervisionComplianceTile) and the per-staff detail page
// (StaffOverviewPage). Same architectural pattern as src/lib/authorization.ts.
//
// Tier 1 must (per Jenny's May 5 working doc): 5% of an RBT's billable hours
// must be supervised by a BCBA. Below 5% = non-compliant. 5-7% = at risk.
// >=7% = comfortably compliant.
//
// Semantics here are NOT inverted (unlike authorization): high % = good,
// low % = bad. Same direction as the "more is better" mental model.

export const SUPERVISION_THRESHOLD = 5  // minimum compliant % per month

export const WATCH_UPPER = 7            // detail-page “at risk” band only (not dashboard tiles)

/** Below minimum — flagged on dashboard tiles. Exactly 5% is compliant. */
export function isSupervisionBelowRequirement(pct: number): boolean {
  return pct < SUPERVISION_THRESHOLD
}

export function meetsSupervisionRequirement(pct: number): boolean {
  return pct >= SUPERVISION_THRESHOLD
}

export type ComplianceStatus = "compliant" | "at-risk" | "non-compliant"

export function complianceClasses(pct: number): { bar: string; text: string } {
  if (isSupervisionBelowRequirement(pct)) return { bar: "bg-red-500",     text: "text-red-700" }
  if (pct < WATCH_UPPER)           return { bar: "bg-amber-500",   text: "text-amber-700" }
  return                                  { bar: "bg-emerald-500", text: "text-emerald-700" }
}

export function complianceStatus(pct: number): ComplianceStatus {
  if (isSupervisionBelowRequirement(pct)) return "non-compliant"
  if (pct < WATCH_UPPER)           return "at-risk"
  return                                  "compliant"
}

// Required supervision hours for a given total of billable hours = 5% of
// total. Rounded to one decimal because mock data is whole hours and
// fractional supervision hours read fine at tenths but get noisy beyond.
export function requiredHours(totalHours: number): number {
  return Math.round((SUPERVISION_THRESHOLD / 100) * totalHours * 10) / 10
}

export function actualSupervisionHours(pct: number, totalHours: number): number {
  return Math.round((pct / 100) * totalHours * 10) / 10
}
