// Team filter used across the dashboard. "All" means no restriction.
// Three clinical teams (A / B / C) map to the `team` field on Staff and
// ClientProfile records.
export type TeamFilter = "All" | "Team A" | "Team B" | "Team C"

export const TEAM_FILTERS: TeamFilter[] = ["All", "Team A", "Team B", "Team C"]

// Each non-Owner role defaults to a team so the demo immediately shows a
// scoped view when the role toggle is switched.
export const ROLE_DEFAULT_TEAM: Record<string, TeamFilter> = {
  Technician: "Team A",
  Supervisor:  "Team B",
  BCBA:        "Team A",
  Owner:       "All",
}
