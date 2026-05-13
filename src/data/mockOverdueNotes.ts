import type { OverdueNotesByStaff } from "@/types/overdueNotes"

// Staff names match src/data/mockStaff.ts so the dashboard tells a coherent story:
// the same people flagged for low direct % in HoursByStaffTile (David, Tyler, Olivia)
// also have the most overdue notes here.
// Staff with 0 overdue notes are omitted — only show people who need follow-up.
export const mockOverdueNotes: OverdueNotesByStaff[] = [
  { staffName: "David Kim",      overdueCount: 9 },
  { staffName: "Tyler Brooks",   overdueCount: 7 },
  { staffName: "Olivia Park",    overdueCount: 6 },
  { staffName: "Emma Williams",  overdueCount: 3 },
  { staffName: "Marcus Johnson", overdueCount: 2 },
  { staffName: "Sofia Martinez", overdueCount: 2 },
  { staffName: "Sarah Chen",     overdueCount: 1 },
]
