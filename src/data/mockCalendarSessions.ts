import type { Session, SessionStatus } from "@/types/session"

// Calendar session data — separate from mockSessions.ts, which is the
// "dashboard tile today-only snapshot." This file covers Apr 20 – May 31
// 2026 (~6 weeks) so the SessionCalendar component has realistic
// history + future data to display.
//
// Today: Monday May 18, 2026.
//
// Status conventions:
//   - Sessions before May 18:  "completed"  (with named exceptions)
//   - Sessions May 18 morning: "completed"  (before 10:53 AM)
//   - Sessions May 18 future:  "scheduled"
//   - Sessions after May 18:   "scheduled"
//
// Exceptions (cross-tile narrative):
//   - Liam Anderson Apr 27 Mon: no-show  (attendance/transition goal)
//   - Mia Davis May 1 Fri:     no-show  (established struggling client)
//   - Mia Davis Apr 29 Wed:    cancelled
//   - Sophia Bennett May 6 Wed: cancelled
//   - Liam Anderson May 15 Fri: cancelled (Supervision)
//   - Ethan Carter May 7 Thu:   cancelled (Parent training)

// Compact constructor — keeps the array below readable.
function s(
  id: string,
  date: string,          // "YYYY-MM-DD"
  time: string,          // "HH:MM"
  clientName: string,
  staffName: string,
  sessionType: string,
  durationMinutes: number,
  status: SessionStatus,
): Session {
  return { id, time: `${date}T${time}`, clientName, staffName, sessionType, durationMinutes, status }
}

export const mockCalendarSessions: Session[] = [
  // ─────────────────────────────────────────────────────────────────────
  // SOPHIA BENNETT — Mon/Wed Direct (Marcus + Jasmine), Fri Supervision (Aisha)
  // ─────────────────────────────────────────────────────────────────────
  // W-4  Apr 20-26
  s("cal-sb-01", "2026-04-20", "08:30", "Sophia Bennett", "Marcus Johnson",  "Direct therapy", 60,  "completed"),
  s("cal-sb-02", "2026-04-22", "08:30", "Sophia Bennett", "Jasmine Lopez",   "Direct therapy", 60,  "completed"),
  s("cal-sb-03", "2026-04-24", "09:00", "Sophia Bennett", "Aisha Mohammed",  "Supervision",    90,  "completed"),
  // W-3  Apr 27 – May 3
  s("cal-sb-04", "2026-04-27", "08:30", "Sophia Bennett", "Marcus Johnson",  "Direct therapy", 60,  "completed"),
  s("cal-sb-05", "2026-04-29", "08:30", "Sophia Bennett", "Jasmine Lopez",   "Direct therapy", 60,  "completed"),
  s("cal-sb-06", "2026-05-01", "09:00", "Sophia Bennett", "Aisha Mohammed",  "Supervision",    90,  "completed"),
  // W-2  May 4-10
  s("cal-sb-07", "2026-05-04", "08:30", "Sophia Bennett", "Marcus Johnson",  "Direct therapy", 60,  "completed"),
  s("cal-sb-08", "2026-05-06", "08:30", "Sophia Bennett", "Jasmine Lopez",   "Direct therapy", 60,  "cancelled"), // ← cancellation
  s("cal-sb-09", "2026-05-08", "09:00", "Sophia Bennett", "Aisha Mohammed",  "Supervision",    90,  "completed"),
  // W-1  May 11-17
  s("cal-sb-10", "2026-05-11", "08:30", "Sophia Bennett", "Marcus Johnson",  "Direct therapy", 60,  "completed"),
  s("cal-sb-11", "2026-05-13", "08:30", "Sophia Bennett", "Jasmine Lopez",   "Direct therapy", 60,  "completed"),
  s("cal-sb-12", "2026-05-15", "09:00", "Sophia Bennett", "Aisha Mohammed",  "Supervision",    90,  "completed"),
  // W0   May 18-24  (current week — today is Monday May 18)
  s("cal-sb-13", "2026-05-18", "08:30", "Sophia Bennett", "Marcus Johnson",  "Direct therapy", 60,  "completed"), // morning, done
  s("cal-sb-14", "2026-05-20", "08:30", "Sophia Bennett", "Jasmine Lopez",   "Direct therapy", 60,  "scheduled"),
  s("cal-sb-15", "2026-05-22", "09:00", "Sophia Bennett", "Aisha Mohammed",  "Supervision",    90,  "scheduled"),
  // W+1  May 25-31
  s("cal-sb-16", "2026-05-25", "08:30", "Sophia Bennett", "Marcus Johnson",  "Direct therapy", 60,  "scheduled"),
  s("cal-sb-17", "2026-05-27", "08:30", "Sophia Bennett", "Jasmine Lopez",   "Direct therapy", 60,  "scheduled"),
  s("cal-sb-18", "2026-05-29", "09:00", "Sophia Bennett", "Aisha Mohammed",  "Supervision",    90,  "scheduled"),

  // ─────────────────────────────────────────────────────────────────────
  // LIAM ANDERSON — Mon/Tue Direct (Sarah), Thu Direct (James), Fri Supervision (Aisha)
  // Intensive 4x/week schedule explains red-zone auth utilization (87%)
  // ─────────────────────────────────────────────────────────────────────
  // W-4  Apr 20-26
  s("cal-la-01", "2026-04-20", "08:00", "Liam Anderson",  "Sarah Chen",      "Direct therapy", 60,  "completed"),
  s("cal-la-02", "2026-04-21", "08:00", "Liam Anderson",  "Sarah Chen",      "Direct therapy", 60,  "completed"),
  s("cal-la-03", "2026-04-23", "09:00", "Liam Anderson",  "James Rodriguez", "Direct therapy", 60,  "completed"),
  s("cal-la-04", "2026-04-24", "10:00", "Liam Anderson",  "Aisha Mohammed",  "Supervision",    60,  "completed"),
  // W-3  Apr 27 – May 3
  s("cal-la-05", "2026-04-27", "08:00", "Liam Anderson",  "Sarah Chen",      "Direct therapy", 60,  "no-show"),   // ← no-show, narrative: transition goal
  s("cal-la-06", "2026-04-28", "08:00", "Liam Anderson",  "Sarah Chen",      "Direct therapy", 60,  "completed"),
  s("cal-la-07", "2026-04-30", "09:00", "Liam Anderson",  "James Rodriguez", "Direct therapy", 60,  "completed"),
  s("cal-la-08", "2026-05-01", "10:00", "Liam Anderson",  "Aisha Mohammed",  "Supervision",    60,  "completed"),
  // W-2  May 4-10
  s("cal-la-09", "2026-05-04", "08:00", "Liam Anderson",  "Sarah Chen",      "Direct therapy", 60,  "completed"),
  s("cal-la-10", "2026-05-05", "08:00", "Liam Anderson",  "Sarah Chen",      "Direct therapy", 60,  "completed"),
  s("cal-la-11", "2026-05-07", "09:00", "Liam Anderson",  "James Rodriguez", "Direct therapy", 60,  "completed"),
  s("cal-la-12", "2026-05-08", "10:00", "Liam Anderson",  "Aisha Mohammed",  "Supervision",    60,  "completed"),
  // W-1  May 11-17
  s("cal-la-13", "2026-05-11", "08:00", "Liam Anderson",  "Sarah Chen",      "Direct therapy", 60,  "completed"),
  s("cal-la-14", "2026-05-12", "08:00", "Liam Anderson",  "Sarah Chen",      "Direct therapy", 60,  "completed"),
  s("cal-la-15", "2026-05-14", "09:00", "Liam Anderson",  "James Rodriguez", "Direct therapy", 60,  "completed"),
  s("cal-la-16", "2026-05-15", "10:00", "Liam Anderson",  "Aisha Mohammed",  "Supervision",    60,  "cancelled"), // ← cancellation
  // W0   May 18-24
  s("cal-la-17", "2026-05-18", "08:00", "Liam Anderson",  "Sarah Chen",      "Direct therapy", 60,  "completed"), // done by 10:53
  s("cal-la-18", "2026-05-19", "08:00", "Liam Anderson",  "Sarah Chen",      "Direct therapy", 60,  "scheduled"),
  s("cal-la-19", "2026-05-21", "09:00", "Liam Anderson",  "James Rodriguez", "Direct therapy", 60,  "scheduled"),
  s("cal-la-20", "2026-05-22", "10:00", "Liam Anderson",  "Aisha Mohammed",  "Supervision",    60,  "scheduled"),
  // W+1  May 25-31
  s("cal-la-21", "2026-05-25", "08:00", "Liam Anderson",  "Sarah Chen",      "Direct therapy", 60,  "scheduled"),
  s("cal-la-22", "2026-05-26", "08:00", "Liam Anderson",  "Sarah Chen",      "Direct therapy", 60,  "scheduled"),
  s("cal-la-23", "2026-05-28", "09:00", "Liam Anderson",  "James Rodriguez", "Direct therapy", 60,  "scheduled"),
  s("cal-la-24", "2026-05-29", "10:00", "Liam Anderson",  "Aisha Mohammed",  "Supervision",    60,  "scheduled"),

  // ─────────────────────────────────────────────────────────────────────
  // MIA DAVIS — Mon/Wed Direct (David + Noah). Attendance issues explain
  // low utilization (38%) and stale goal data in Active Goals.
  // ─────────────────────────────────────────────────────────────────────
  // W-4  Apr 20-26
  s("cal-md-01", "2026-04-20", "09:00", "Mia Davis",      "David Kim",       "Direct therapy", 60,  "completed"),
  s("cal-md-02", "2026-04-22", "09:00", "Mia Davis",      "Noah Thompson",   "Direct therapy", 60,  "completed"),
  // W-3  Apr 27 – May 3
  s("cal-md-03", "2026-04-27", "09:00", "Mia Davis",      "David Kim",       "Direct therapy", 60,  "completed"),
  s("cal-md-04", "2026-04-29", "09:00", "Mia Davis",      "Noah Thompson",   "Direct therapy", 60,  "cancelled"), // ← cancellation
  s("cal-md-05", "2026-05-01", "09:00", "Mia Davis",      "David Kim",       "Direct therapy", 60,  "no-show"),   // ← no-show
  // W-2  May 4-10
  s("cal-md-06", "2026-05-04", "09:00", "Mia Davis",      "David Kim",       "Direct therapy", 60,  "completed"),
  s("cal-md-07", "2026-05-06", "09:00", "Mia Davis",      "Noah Thompson",   "Direct therapy", 60,  "completed"),
  // W-1  May 11-17
  s("cal-md-08", "2026-05-11", "09:00", "Mia Davis",      "David Kim",       "Direct therapy", 60,  "completed"),
  s("cal-md-09", "2026-05-13", "09:00", "Mia Davis",      "Noah Thompson",   "Direct therapy", 60,  "completed"),
  // W0   May 18-24
  s("cal-md-10", "2026-05-18", "09:00", "Mia Davis",      "David Kim",       "Direct therapy", 60,  "completed"), // done by 10:53
  s("cal-md-11", "2026-05-20", "09:00", "Mia Davis",      "Noah Thompson",   "Direct therapy", 60,  "scheduled"),
  // W+1  May 25-31
  s("cal-md-12", "2026-05-25", "09:00", "Mia Davis",      "David Kim",       "Direct therapy", 60,  "scheduled"),
  s("cal-md-13", "2026-05-27", "09:00", "Mia Davis",      "Noah Thompson",   "Direct therapy", 60,  "scheduled"),

  // ─────────────────────────────────────────────────────────────────────
  // ETHAN CARTER — Tue Direct (Priya), Thu Parent Training (Emma)
  // ─────────────────────────────────────────────────────────────────────
  s("cal-ec-01", "2026-04-21", "10:00", "Ethan Carter",   "Priya Patel",     "Direct therapy",   60, "completed"),
  s("cal-ec-02", "2026-04-23", "14:00", "Ethan Carter",   "Emma Williams",   "Parent training",  45, "completed"),
  s("cal-ec-03", "2026-04-28", "10:00", "Ethan Carter",   "Priya Patel",     "Direct therapy",   60, "completed"),
  s("cal-ec-04", "2026-04-30", "14:00", "Ethan Carter",   "Emma Williams",   "Parent training",  45, "completed"),
  s("cal-ec-05", "2026-05-05", "10:00", "Ethan Carter",   "Priya Patel",     "Direct therapy",   60, "completed"),
  s("cal-ec-06", "2026-05-07", "14:00", "Ethan Carter",   "Emma Williams",   "Parent training",  45, "cancelled"), // ← cancellation
  s("cal-ec-07", "2026-05-12", "10:00", "Ethan Carter",   "Priya Patel",     "Direct therapy",   60, "completed"),
  s("cal-ec-08", "2026-05-14", "14:00", "Ethan Carter",   "Emma Williams",   "Parent training",  45, "completed"),
  s("cal-ec-09", "2026-05-19", "10:00", "Ethan Carter",   "Priya Patel",     "Direct therapy",   60, "scheduled"),
  s("cal-ec-10", "2026-05-21", "14:00", "Ethan Carter",   "Emma Williams",   "Parent training",  45, "scheduled"),
  s("cal-ec-11", "2026-05-26", "10:00", "Ethan Carter",   "Priya Patel",     "Direct therapy",   60, "scheduled"),
  s("cal-ec-12", "2026-05-28", "14:00", "Ethan Carter",   "Emma Williams",   "Parent training",  45, "scheduled"),

  // ─────────────────────────────────────────────────────────────────────
  // NOAH EDWARDS — Mon Assessment (Tyler), Wed Direct (Tyler)
  // Assessment-heavy — fresh out of intake, new program
  // ─────────────────────────────────────────────────────────────────────
  s("cal-ne-01", "2026-04-20", "11:00", "Noah Edwards",   "Tyler Brooks",    "Assessment",       90, "completed"),
  s("cal-ne-02", "2026-04-22", "11:00", "Noah Edwards",   "Tyler Brooks",    "Direct therapy",   60, "completed"),
  s("cal-ne-03", "2026-04-27", "11:00", "Noah Edwards",   "Tyler Brooks",    "Assessment",       90, "completed"),
  s("cal-ne-04", "2026-04-29", "11:00", "Noah Edwards",   "Tyler Brooks",    "Direct therapy",   60, "completed"),
  s("cal-ne-05", "2026-05-04", "11:00", "Noah Edwards",   "Tyler Brooks",    "Assessment",       90, "completed"),
  s("cal-ne-06", "2026-05-06", "11:00", "Noah Edwards",   "Tyler Brooks",    "Direct therapy",   60, "completed"),
  s("cal-ne-07", "2026-05-11", "11:00", "Noah Edwards",   "Tyler Brooks",    "Assessment",       90, "completed"),
  s("cal-ne-08", "2026-05-13", "11:00", "Noah Edwards",   "Tyler Brooks",    "Direct therapy",   60, "completed"),
  s("cal-ne-09", "2026-05-18", "11:00", "Noah Edwards",   "Tyler Brooks",    "Assessment",       90, "scheduled"), // 11 AM — not yet
  s("cal-ne-10", "2026-05-20", "11:00", "Noah Edwards",   "Tyler Brooks",    "Direct therapy",   60, "scheduled"),
  s("cal-ne-11", "2026-05-25", "11:00", "Noah Edwards",   "Tyler Brooks",    "Assessment",       90, "scheduled"),
  s("cal-ne-12", "2026-05-27", "11:00", "Noah Edwards",   "Tyler Brooks",    "Direct therapy",   60, "scheduled"),

  // ─────────────────────────────────────────────────────────────────────
  // OLIVIA FOSTER — Tue/Thu Direct (Olivia Park)
  // ─────────────────────────────────────────────────────────────────────
  s("cal-of-01", "2026-04-21", "13:00", "Olivia Foster",  "Olivia Park",     "Direct therapy",   60, "completed"),
  s("cal-of-02", "2026-04-23", "13:00", "Olivia Foster",  "Olivia Park",     "Direct therapy",   60, "completed"),
  s("cal-of-03", "2026-04-28", "13:00", "Olivia Foster",  "Olivia Park",     "Direct therapy",   60, "completed"),
  s("cal-of-04", "2026-04-30", "13:00", "Olivia Foster",  "Olivia Park",     "Direct therapy",   60, "completed"),
  s("cal-of-05", "2026-05-05", "13:00", "Olivia Foster",  "Olivia Park",     "Direct therapy",   60, "completed"),
  s("cal-of-06", "2026-05-07", "13:00", "Olivia Foster",  "Olivia Park",     "Direct therapy",   60, "completed"),
  s("cal-of-07", "2026-05-12", "13:00", "Olivia Foster",  "Olivia Park",     "Direct therapy",   60, "completed"),
  s("cal-of-08", "2026-05-14", "13:00", "Olivia Foster",  "Olivia Park",     "Direct therapy",   60, "completed"),
  s("cal-of-09", "2026-05-19", "13:00", "Olivia Foster",  "Olivia Park",     "Direct therapy",   60, "scheduled"),
  s("cal-of-10", "2026-05-21", "13:00", "Olivia Foster",  "Olivia Park",     "Direct therapy",   60, "scheduled"),
  s("cal-of-11", "2026-05-26", "13:00", "Olivia Foster",  "Olivia Park",     "Direct therapy",   60, "scheduled"),
  s("cal-of-12", "2026-05-28", "13:00", "Olivia Foster",  "Olivia Park",     "Direct therapy",   60, "scheduled"),

  // ─────────────────────────────────────────────────────────────────────
  // LUCAS HAYES — Mon/Fri Direct (Ben Garcia). Maintenance phase — mostly mastered goals.
  // ─────────────────────────────────────────────────────────────────────
  s("cal-lh-01", "2026-04-20", "14:30", "Lucas Hayes",    "Ben Garcia",      "Direct therapy",   60, "completed"),
  s("cal-lh-02", "2026-04-24", "14:30", "Lucas Hayes",    "Ben Garcia",      "Direct therapy",   60, "completed"),
  s("cal-lh-03", "2026-04-27", "14:30", "Lucas Hayes",    "Ben Garcia",      "Direct therapy",   60, "completed"),
  s("cal-lh-04", "2026-05-01", "14:30", "Lucas Hayes",    "Ben Garcia",      "Direct therapy",   60, "completed"),
  s("cal-lh-05", "2026-05-04", "14:30", "Lucas Hayes",    "Ben Garcia",      "Direct therapy",   60, "completed"),
  s("cal-lh-06", "2026-05-08", "14:30", "Lucas Hayes",    "Ben Garcia",      "Direct therapy",   60, "completed"),
  s("cal-lh-07", "2026-05-11", "14:30", "Lucas Hayes",    "Ben Garcia",      "Direct therapy",   60, "completed"),
  s("cal-lh-08", "2026-05-15", "14:30", "Lucas Hayes",    "Ben Garcia",      "Direct therapy",   60, "completed"),
  s("cal-lh-09", "2026-05-18", "14:30", "Lucas Hayes",    "Ben Garcia",      "Direct therapy",   60, "scheduled"), // afternoon
  s("cal-lh-10", "2026-05-22", "14:30", "Lucas Hayes",    "Ben Garcia",      "Direct therapy",   60, "scheduled"),
  s("cal-lh-11", "2026-05-25", "14:30", "Lucas Hayes",    "Ben Garcia",      "Direct therapy",   60, "scheduled"),
  s("cal-lh-12", "2026-05-29", "14:30", "Lucas Hayes",    "Ben Garcia",      "Direct therapy",   60, "scheduled"),

  // ─────────────────────────────────────────────────────────────────────
  // AVA HUGHES — Tue/Fri Direct (Sofia Martinez). Youngest client, new to ABA.
  // ─────────────────────────────────────────────────────────────────────
  s("cal-ah-01", "2026-04-21", "10:00", "Ava Hughes",     "Sofia Martinez",  "Direct therapy",   60, "completed"),
  s("cal-ah-02", "2026-04-24", "10:00", "Ava Hughes",     "Sofia Martinez",  "Direct therapy",   60, "completed"),
  s("cal-ah-03", "2026-04-28", "10:00", "Ava Hughes",     "Sofia Martinez",  "Direct therapy",   60, "completed"),
  s("cal-ah-04", "2026-05-01", "10:00", "Ava Hughes",     "Sofia Martinez",  "Direct therapy",   60, "completed"),
  s("cal-ah-05", "2026-05-05", "10:00", "Ava Hughes",     "Sofia Martinez",  "Direct therapy",   60, "completed"),
  s("cal-ah-06", "2026-05-08", "10:00", "Ava Hughes",     "Sofia Martinez",  "Direct therapy",   60, "completed"),
  s("cal-ah-07", "2026-05-12", "10:00", "Ava Hughes",     "Sofia Martinez",  "Direct therapy",   60, "completed"),
  s("cal-ah-08", "2026-05-15", "10:00", "Ava Hughes",     "Sofia Martinez",  "Direct therapy",   60, "completed"),
  s("cal-ah-09", "2026-05-19", "10:00", "Ava Hughes",     "Sofia Martinez",  "Direct therapy",   60, "scheduled"),
  s("cal-ah-10", "2026-05-22", "10:00", "Ava Hughes",     "Sofia Martinez",  "Direct therapy",   60, "scheduled"),
  s("cal-ah-11", "2026-05-26", "10:00", "Ava Hughes",     "Sofia Martinez",  "Direct therapy",   60, "scheduled"),
  s("cal-ah-12", "2026-05-29", "10:00", "Ava Hughes",     "Sofia Martinez",  "Direct therapy",   60, "scheduled"),
]
