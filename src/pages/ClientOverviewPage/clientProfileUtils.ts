import type { ClientDetail } from "@/lib/supabase"
import type { AuthRecord } from "@/lib/supabase"
import { usedHours } from "@/lib/authorization"

export function formatClientDisplayName(client: ClientDetail): string {
  const name = [client.first_name, client.last_name].filter(Boolean).join(" ").trim()
  if (name) return name
  return client.external_code ?? "Unknown client"
}

export function formatProfileDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

/** Compact range for authorization period — keeps end year only once. */
export function formatAuthPeriodRange(startIso: string, endIso: string): string {
  const start = new Date(startIso + "T00:00:00")
  const end = new Date(endIso + "T00:00:00")
  const startPart = start.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  const endPart = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  return `${startPart} – ${endPart}`
}

export function factValue(value: string | null | undefined): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed : "Not on file"
}

export function daysUntil(isoEnd: string): number {
  const end = new Date(isoEnd + "T00:00:00")
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function authUtilization(auth: AuthRecord) {
  const total = auth.totalAuthorizedHours
  const completed = usedHours(auth.utilizationPct, total)
  const remaining = Math.max(0, total - completed)
  const daysLeft = daysUntil(auth.endDate)
  const pctUsed = auth.utilizationPct
  const warn = daysLeft <= 14 || pctUsed >= 80
  return { total, completed, remaining, daysLeft, warn, endDate: auth.endDate }
}

export function clientStatusLabel(status: string | null): string {
  const raw = (status ?? "active").toLowerCase()
  if (raw === "active") return "Active"
  if (raw === "inactive") return "Inactive"
  if (raw === "discharged") return "Discharged"
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}
