import type { ClientProfile } from "@/types/client"

// Client identity records. Names match src/data/mockSessions.ts and
// src/data/mockAuthorizations.ts so per-client lookups via toSlug(name)
// land on a coherent "this is who they are + what's authorized + what
// sessions they had" picture.
//
// Notes on the mock variety:
//   - 4 different insurance payers — real Bay Area mix.
//   - 3 different CPT codes (97151 = assessment, 97153 = direct treatment by
//     protocol, 97155 = treatment with protocol modification by a BCBA). All
//     real ABA billing codes.
//   - 2 supervisors (Dr. Rachel Kim, Dr. Marcus Liu) intentionally do NOT
//     appear in mockStaff. Senior BCBA-Ds typically aren't in the daily
//     session schedule, so this asymmetry is realistic.
//   - BCBA names (Aisha Mohammed, Tyler Brooks, Emma Williams) ARE in
//     mockStaff — consistent with their session types there ("Supervision",
//     "Assessment", "Parent training" respectively).
//   - Technician names match the actual "Direct therapy" staff in
//     mockSessions when present, so the runtime derivation in
//     ClientOverviewPage agrees with the mock fallback for the typical case.
export const mockClients: ClientProfile[] = [
  {
    name: "Sophia Bennett",
    dateOfBirth: "2018-03-14",
    address: "412 Maple St, San Jose, CA",
    insurance: "Blue Shield of California",
    authorizationPeriodStart: "2026-01-01",
    authorizationPeriodEnd: "2026-06-30",
    cptCode: "97153",
    cptLabel: "Adaptive Behavior Treatment by Protocol",
    bcba: "Aisha Mohammed",
    supervisor: "Dr. Rachel Kim",
    technician: "Marcus Johnson",
    team: "Team A",
  },
  {
    name: "Liam Anderson",
    dateOfBirth: "2017-09-22",
    address: "1908 Oak Ridge Dr, Mountain View, CA",
    insurance: "Aetna",
    authorizationPeriodStart: "2026-02-01",
    authorizationPeriodEnd: "2026-07-31",
    cptCode: "97153",
    cptLabel: "Adaptive Behavior Treatment by Protocol",
    bcba: "Aisha Mohammed",
    supervisor: "Dr. Rachel Kim",
    technician: "Sarah Chen",
    team: "Team A",
  },
  {
    name: "Ethan Carter",
    dateOfBirth: "2019-11-05",
    address: "738 Cypress Ave, Santa Clara, CA",
    insurance: "Kaiser Permanente",
    authorizationPeriodStart: "2026-01-01",
    authorizationPeriodEnd: "2026-06-30",
    cptCode: "97155",
    cptLabel: "Adaptive Behavior Treatment with Protocol Modification",
    bcba: "Tyler Brooks",
    supervisor: "Dr. Marcus Liu",
    technician: "Priya Patel",
    team: "Team B",
  },
  {
    name: "Mia Davis",
    dateOfBirth: "2020-06-30",
    address: "256 Birch Lane, Sunnyvale, CA",
    insurance: "Cigna",
    authorizationPeriodStart: "2026-03-01",
    authorizationPeriodEnd: "2026-08-31",
    cptCode: "97153",
    cptLabel: "Adaptive Behavior Treatment by Protocol",
    bcba: "Tyler Brooks",
    supervisor: "Dr. Marcus Liu",
    technician: "David Kim",
    team: "Team C",
  },
  {
    name: "Noah Edwards",
    dateOfBirth: "2018-12-11",
    address: "55 Pine St, Palo Alto, CA",
    insurance: "United Healthcare",
    authorizationPeriodStart: "2026-01-15",
    authorizationPeriodEnd: "2026-07-15",
    cptCode: "97151",
    cptLabel: "Behavior Identification Assessment",
    bcba: "Tyler Brooks",
    supervisor: "Dr. Marcus Liu",
    technician: "Tyler Brooks",
    team: "Team C",
  },
  {
    name: "Olivia Foster",
    dateOfBirth: "2019-02-18",
    address: "3201 Willow Way, Cupertino, CA",
    insurance: "Anthem Blue Cross",
    authorizationPeriodStart: "2026-02-01",
    authorizationPeriodEnd: "2026-07-31",
    cptCode: "97153",
    cptLabel: "Adaptive Behavior Treatment by Protocol",
    bcba: "Emma Williams",
    supervisor: "Dr. Rachel Kim",
    technician: "Olivia Park",
    team: "Team A",
  },
  {
    name: "Lucas Hayes",
    dateOfBirth: "2017-04-07",
    address: "147 Magnolia Ct, Los Altos, CA",
    insurance: "Blue Shield of California",
    authorizationPeriodStart: "2026-01-01",
    authorizationPeriodEnd: "2026-06-30",
    cptCode: "97153",
    cptLabel: "Adaptive Behavior Treatment by Protocol",
    bcba: "Emma Williams",
    supervisor: "Dr. Rachel Kim",
    technician: "Ben Garcia",
    team: "Team B",
  },
  {
    name: "Ava Hughes",
    dateOfBirth: "2020-08-23",
    address: "892 Redwood Blvd, Menlo Park, CA",
    insurance: "Health Net",
    authorizationPeriodStart: "2026-03-15",
    authorizationPeriodEnd: "2026-09-14",
    cptCode: "97155",
    cptLabel: "Adaptive Behavior Treatment with Protocol Modification",
    bcba: "Emma Williams",
    supervisor: "Dr. Rachel Kim",
    technician: "Sofia Martinez",
    team: "Team B",
  },
]
