/** Days before pay period end when incomplete notes escalate on the Hours tile. */
export const PAYROLL_ESCALATION_DAYS = 3

export type PulseSeverity = "ok" | "warn" | "crit"

export function worstSeverity(a: PulseSeverity, b: PulseSeverity): PulseSeverity {
  const rank: Record<PulseSeverity, number> = { ok: 0, warn: 1, crit: 2 }
  return rank[a] >= rank[b] ? a : b
}

export function severityDotClass(severity: PulseSeverity): string {
  if (severity === "crit") return "bg-crit"
  if (severity === "warn") return "bg-warn"
  return "bg-ok"
}

export function severityTextClass(severity: PulseSeverity): string {
  if (severity === "crit") return "text-crit"
  if (severity === "warn") return "text-warn"
  return "text-ink"
}
