import type { Session } from "@/types/session"

export const mockSessions: Session[] = [
  { id: "s-001", time: "2026-05-12T08:00", clientName: "Liam Anderson",  staffName: "Sarah Chen",       sessionType: "Direct therapy",     status: "completed"   },
  { id: "s-002", time: "2026-05-12T08:30", clientName: "Sophia Bennett", staffName: "Marcus Johnson",   sessionType: "Direct therapy",     status: "completed"   },
  { id: "s-003", time: "2026-05-12T09:00", clientName: "Ethan Carter",   staffName: "Priya Patel",      sessionType: "Direct therapy",     status: "completed"   },
  { id: "s-004", time: "2026-05-12T09:30", clientName: "Mia Davis",      staffName: "David Kim",        sessionType: "Direct therapy",     status: "no-show"     },
  { id: "s-005", time: "2026-05-12T10:00", clientName: "Liam Anderson",  staffName: "Aisha Mohammed",   sessionType: "Supervision",        status: "completed"   },
  { id: "s-006", time: "2026-05-12T11:00", clientName: "Noah Edwards",   staffName: "Tyler Brooks",     sessionType: "Assessment",         status: "completed"   },
  { id: "s-007", time: "2026-05-12T12:00", clientName: "Sophia Bennett", staffName: "Jasmine Lopez",    sessionType: "Direct therapy",     status: "in-progress" },
  { id: "s-008", time: "2026-05-12T13:00", clientName: "Olivia Foster",  staffName: "Olivia Park",      sessionType: "Direct therapy",     status: "in-progress" },
  { id: "s-009", time: "2026-05-12T14:00", clientName: "Ethan Carter",   staffName: "Emma Williams",    sessionType: "Parent training",    status: "scheduled"   },
  { id: "s-010", time: "2026-05-12T14:30", clientName: "Lucas Hayes",    staffName: "Ben Garcia",       sessionType: "Direct therapy",     status: "scheduled"   },
  { id: "s-011", time: "2026-05-12T15:30", clientName: "Mia Davis",      staffName: "Noah Thompson",    sessionType: "Direct therapy",     status: "cancelled"   },
  { id: "s-012", time: "2026-05-12T16:00", clientName: "Ava Hughes",     staffName: "Sofia Martinez",   sessionType: "Direct therapy",     status: "scheduled"   },
]
