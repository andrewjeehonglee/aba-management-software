// Identity + administrative metadata for a client (the person receiving ABA
// services). Distinct from ClientAuthorization (insurance utilization data),
// which is its own concern and may eventually live in a separate system.
//
// `name` is the join key across mock data files (sessions, authorizations,
// clients). Real systems would use a stable client ID; we'll switch when
// authentication / a real backend lands.
export interface ClientProfile {
  name: string

  dateOfBirth: string                  // ISO date "YYYY-MM-DD"
  address: string                      // single-line street address

  insurance: string                    // payer name, e.g. "Blue Shield of California"
  authorizationPeriodStart: string     // ISO date — start of the current auth window
  authorizationPeriodEnd: string       // ISO date — end of the current auth window

  cptCode: string                      // billing code, e.g. "97153"
  cptLabel: string                     // plain-English label for the CPT code

  // Care team — explicit fallback values used when the client's session
  // history doesn't reveal who's currently in each role. The page may prefer
  // session-derived values when available (see ClientOverviewPage).
  bcba: string
  supervisor: string
  technician: string

  // Organizational team this client is assigned to. Drives the dashboard
  // team filter — selecting "Team B" shows only Team B clients and their staff.
  team: "Team A" | "Team B" | "Team C"
}
