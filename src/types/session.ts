export type SessionStatus =
  | "scheduled"
  | "in-progress"
  | "completed"
  | "cancelled"
  | "no-show"

export interface Session {
  id: string
  time: string         // ISO time string, e.g. "2026-05-12T09:00"
  clientName: string
  staffName: string
  sessionType: string  // e.g. "Direct therapy", "Supervision", "Assessment"
  status: SessionStatus
}
