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

// "HH:mm" slice from an ISO string like "2026-05-12T08:00". Named helper
// because the slice indices are otherwise opaque at the call site.
export function formatTime(isoTime: string): string {
  return isoTime.slice(11, 16)
}
