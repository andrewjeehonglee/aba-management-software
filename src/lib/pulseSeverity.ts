/** Days before pay period end when incomplete notes escalate on the Hours tile. */
export const PAYROLL_ESCALATION_DAYS = 3

export type PulseSeverity = "ok" | "warn" | "crit" | "flag"

export function worstSeverity(a: PulseSeverity, b: PulseSeverity): PulseSeverity {
  const rank: Record<PulseSeverity, number> = { ok: 0, warn: 1, flag: 2, crit: 3 }
  return rank[a] >= rank[b] ? a : b
}

export function severityDotClass(severity: PulseSeverity): string {
  if (severity === "crit") return "bg-alert-strong"
  if (severity === "warn") return "bg-alert"
  if (severity === "flag") return "bg-limit"
  return "bg-brand"
}

export function severityTextClass(severity: PulseSeverity): string {
  if (severity === "crit") return "text-alert-strong"
  if (severity === "warn") return "text-alert"
  if (severity === "flag") return "text-limit"
  return "text-brand"
}

export function severityTagClass(severity: PulseSeverity): string {
  if (severity === "crit") return "bg-alert-soft text-alert-strong"
  if (severity === "warn") return "bg-alert-soft text-alert"
  if (severity === "flag") return "bg-limit-soft text-limit"
  return "bg-accent-soft text-brand"
}
