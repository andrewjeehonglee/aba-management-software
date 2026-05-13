// Staff role enum. Drives both the per-staff page subtitle (with session-
// based override; see deriveStaffRoleFromSessions) and the formal "Role
// title" line in the detail grid.
export type StaffRole = "BCBA" | "Supervisor" | "Technician"

export interface Staff {
  name: string

  // Operational metrics — the original fields, drive HoursByStaffTile.
  totalHours: number
  directHours: number
  indirectHours: number
  cancellationHours: number

  // Identity / HR fields — drive StaffOverviewPage. These are the static
  // ground truth for "who is this person on paper"; the per-page derivation
  // from session types may show a different role this week (e.g. an RBT who
  // ran one assessment under supervision will derive as BCBA-this-week
  // while their formal role stays Technician).
  role: StaffRole
  hireDate: string                  // ISO date "YYYY-MM-DD"
  certification: string             // e.g. "RBT — expires Dec 2026"
  team: string                      // e.g. "Team A"
}
