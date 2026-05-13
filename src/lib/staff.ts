import type { Staff } from "@/types/staff"

export const DIRECT_HOURS_THRESHOLD = 0.5

export function isStaffFlagged(staff: Staff): boolean {
  if (staff.totalHours === 0) return false
  return staff.directHours / staff.totalHours < DIRECT_HOURS_THRESHOLD
}

// Certification expiry thresholds — drive both the dashboard tile filter
// (CertificationsExpiringTile, "within 90 days") and the per-tile severity
// chip (≤ 30 days = urgent / red, 31-90 = warning / amber). One source of
// truth so changing the policy is a one-line edit.
export const CERT_WARNING_DAYS = 90
export const CERT_URGENT_DAYS = 30

export interface ParsedCertification {
  type: string       // credential code, e.g. "RBT" or "BCBA"
  expiryDate: Date   // the last day of the listed expiry month
}

const MONTH_INDEX: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May:  4, Jun:  5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
}

// Parses strings shaped like "RBT — expires Aug 2026". Returns null if the
// string doesn't fit the expected shape — defensive so the tile doesn't
// crash if a cert string is malformed in real data later.
//
// Convention: ABA certifications expire on the LAST day of the listed month
// (e.g. "expires Mar 2027" = March 31, 2027). The `new Date(year, m+1, 0)`
// trick exploits a JS quirk where day 0 of month N+1 = last day of month N.
export function parseCertification(cert: string): ParsedCertification | null {
  const match = cert.match(/^(\w+)\s+—\s+expires\s+(\w{3})\s+(\d{4})$/)
  if (!match) return null

  const [, type, monthAbbr, yearStr] = match
  const month = MONTH_INDEX[monthAbbr]
  if (month === undefined) return null

  const year = Number(yearStr)
  return {
    type,
    expiryDate: new Date(year, month + 1, 0),
  }
}

// Whole-day difference between two dates. Both are normalized to local
// midnight first so the result is a clean integer (otherwise time-of-day
// jitter from `new Date()` produces fractional results that round oddly).
export function daysUntil(target: Date, today: Date = new Date()): number {
  const t1 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const t2 = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime()
  return Math.round((t2 - t1) / (1000 * 60 * 60 * 24))
}
