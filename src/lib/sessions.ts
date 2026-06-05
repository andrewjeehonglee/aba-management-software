// Session helpers — config and pure functions shared across the dashboard
// tile (TodaySessionsTile), the per-client page (ClientOverviewPage), and
// the per-staff page (StaffOverviewPage). Three callers = rule of three
// satisfied; this is the right time to extract.
//
// The React badge component lives in src/components/SessionStatusBadge.tsx
// — components don't belong in lib/ even when they're tiny.

import type { SessionStatus } from "@/types/session"

export const STATUS_CONFIG: Record<
  SessionStatus,
  { label: string; className: string }
> = {
  completed:     { label: "Completed",   className: "bg-emerald-100 text-emerald-800" },
  "in-progress": { label: "In progress", className: "bg-blue-100 text-blue-800" },
  scheduled:     { label: "Scheduled",   className: "bg-slate-100 text-slate-700" },
  cancelled:     { label: "Cancelled",   className: "bg-amber-100 text-amber-800" },
  "no-show":     { label: "No-show",     className: "bg-red-100 text-red-800" },
}

// Sort priority for "what should I look at first?" ordering. In progress
// comes top because it's happening NOW; cancelled/no-show next because they
// need a note or follow-up; scheduled is future; completed is done.
export const STATUS_ORDER: Record<SessionStatus, number> = {
  "in-progress": 0,
  "no-show":     1,
  cancelled:     2,
  scheduled:     3,
  completed:     4,
}

/** Coastal ABA / Jenny demo — always show clinic wall clock in Pacific. */
export const PRACTICE_TIMEZONE = "America/Los_Angeles"

// 24-hour HH:mm in practice timezone (e.g. 13:30, 09:00). Never 12-hour AM/PM.
export function formatTime(isoTime: string): string {
  const d = new Date(isoTime)
  if (Number.isNaN(d.getTime())) return "—"

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PRACTICE_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d)

  let hour = parts.find((p) => p.type === "hour")?.value ?? "00"
  if (hour === "24") hour = "00"
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00"
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`
}

/** Date + 24h time for note/incident headers. Falls back to session scheduled_at when created_at is missing. */
export function formatEventStamp(createdAt?: string | null, sessionAt?: string | null): { date: string; time: string } {
  const iso = createdAt ?? sessionAt
  if (!iso) return { date: "—", time: "" }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { date: "—", time: "" }
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  const time = formatTime(iso)
  return { date, time }
}
