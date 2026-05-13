import type { RBTSupervision } from "@/types/supervision"

// Names mirror src/data/mockStaff.ts so the dashboard tells one story across
// all four tiles: David Kim, Olivia Park, and Tyler Brooks are the same staff
// flagged for low direct % (HoursByStaffTile) and most overdue notes
// (NotesOverdueTile). Keeping them under-supervised here as well makes the
// "these three need a 1:1 this week" narrative obvious at a glance.
export const mockSupervision: RBTSupervision[] = [
  { rbtName: "David Kim",       supervisionPct: 2.1 },
  { rbtName: "Olivia Park",     supervisionPct: 3.8 },
  { rbtName: "Tyler Brooks",    supervisionPct: 4.2 },
  { rbtName: "Emma Williams",   supervisionPct: 5.4 },
  { rbtName: "Sofia Martinez",  supervisionPct: 6.8 },
  { rbtName: "Marcus Johnson",  supervisionPct: 8.5 },
  { rbtName: "Sarah Chen",      supervisionPct: 9.2 },
  { rbtName: "Jasmine Lopez",   supervisionPct: 11.0 },
]
