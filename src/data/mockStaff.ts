import type { Staff } from "@/types/staff"

// Staff registry. Hour fields drive HoursByStaffTile; identity fields drive
// StaffOverviewPage. Distribution notes:
//   - 2 BCBAs (Aisha Mohammed, Emma Williams). Realistic ratio for a small
//     practice supervising 11 RBTs.
//   - Team C is intentionally where the flagged staff (David Kim, Tyler
//     Brooks, Olivia Park) cluster — gives Jenny an obvious "Team C is
//     having a tough week" read across the dashboard.
//   - Certification expirations are spread across 2026-2027 so a future
//     "expiring soon" tile would have realistic data to flag.
//   - Tyler Brooks's role is Technician here even though he led an
//     Assessment session this week — the page-level derivation picks that
//     up as a "this week he did BCBA-level work" signal, while his formal
//     role stays Technician. The mismatch is intentional product nuance,
//     not a data bug.
export const mockStaff: Staff[] = [
  { name: "Sarah Chen",       totalHours: 36, directHours: 28, indirectHours:  6, cancellationHours:  2, role: "Technician", hireDate: "2023-08-15", certification: "RBT — expires Mar 2027",  team: "Team A" },
  { name: "Marcus Johnson",   totalHours: 40, directHours: 32, indirectHours:  5, cancellationHours:  3, role: "Technician", hireDate: "2022-04-10", certification: "RBT — expires Aug 2026",  team: "Team A" },
  { name: "Priya Patel",      totalHours: 38, directHours: 30, indirectHours:  5, cancellationHours:  3, role: "Technician", hireDate: "2024-01-22", certification: "RBT — expires Jan 2027",  team: "Team B" },
  { name: "James Rodriguez",  totalHours: 42, directHours: 34, indirectHours:  6, cancellationHours:  2, role: "Technician", hireDate: "2021-09-03", certification: "RBT — expires Sep 2026",  team: "Team B" },
  { name: "Emma Williams",    totalHours: 35, directHours: 18, indirectHours: 14, cancellationHours:  3, role: "BCBA",       hireDate: "2020-06-12", certification: "BCBA — expires Jun 2027", team: "Team A" },
  { name: "David Kim",        totalHours: 32, directHours: 14, indirectHours:  8, cancellationHours: 10, role: "Technician", hireDate: "2024-11-04", certification: "RBT — expires Nov 2026",  team: "Team C" },
  { name: "Jasmine Lopez",    totalHours: 40, directHours: 33, indirectHours:  5, cancellationHours:  2, role: "Technician", hireDate: "2023-02-28", certification: "RBT — expires Feb 2027",  team: "Team B" },
  { name: "Tyler Brooks",     totalHours: 38, directHours: 16, indirectHours: 19, cancellationHours:  3, role: "Technician", hireDate: "2024-08-19", certification: "RBT — expires Aug 2026",  team: "Team C" },
  { name: "Aisha Mohammed",   totalHours: 39, directHours: 31, indirectHours:  6, cancellationHours:  2, role: "BCBA",       hireDate: "2019-05-20", certification: "BCBA — expires May 2027", team: "Team A" },
  { name: "Ben Garcia",       totalHours: 41, directHours: 33, indirectHours:  5, cancellationHours:  3, role: "Technician", hireDate: "2022-11-15", certification: "RBT — expires Nov 2026",  team: "Team B" },
  { name: "Olivia Park",      totalHours: 30, directHours: 13, indirectHours:  7, cancellationHours: 10, role: "Technician", hireDate: "2024-09-30", certification: "RBT — expires Sep 2026",  team: "Team C" },
  { name: "Noah Thompson",    totalHours: 43, directHours: 35, indirectHours:  6, cancellationHours:  2, role: "Technician", hireDate: "2021-07-08", certification: "RBT — expires Jul 2027",  team: "Team A" },
  { name: "Sofia Martinez",   totalHours: 37, directHours: 19, indirectHours: 15, cancellationHours:  3, role: "Technician", hireDate: "2023-10-12", certification: "RBT — expires Oct 2026",  team: "Team B" },
]
