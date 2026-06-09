export type SessionStatus =
  | "scheduled"
  | "in-progress"
  | "completed"
  | "cancelled"
  | "no-show"

export interface Session {
  id: string
  time: string              // ISO datetime, e.g. "2026-05-18T09:00" (local time)
  clientId?: string
  clientName: string
  staffName: string
  sessionType: string       // e.g. "Direct therapy", "Supervision", "Assessment"
  status: SessionStatus
  durationMinutes?: number  // session length; present in calendar data, absent in dashboard snapshots
}
