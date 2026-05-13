import type { ClientAuthorization } from "@/types/authorization"

// Client names match src/data/mockSessions.ts so the dashboard tells one story
// across tiles: clients you saw on the schedule today are the same clients
// whose authorization status you can read here.
//
// Story arc:
//   - Sophia Bennett & Liam Anderson are both on today's schedule AND in the
//     red zone — Jenny should start re-auth conversations this week.
//   - Mia Davis had a no-show + a cancellation today, and is also UNDER-utilizing
//     her auth at 38% — different problem, but worth flagging in a future tile.
//
// totalAuthorizedHours varies by client intensity (typical ABA range: 60-160
// hrs per period). The pct is the load-bearing metric for the dashboard tile;
// the absolute total is what the per-client overview page needs to render
// "X of Y hrs used — Z remaining" in plain English.
export const mockAuthorizations: ClientAuthorization[] = [
  { clientName: "Sophia Bennett", utilizationPct: 92, totalAuthorizedHours: 100 },
  { clientName: "Liam Anderson",  utilizationPct: 87, totalAuthorizedHours: 120 },
  { clientName: "Ethan Carter",   utilizationPct: 81, totalAuthorizedHours: 100 },
  { clientName: "Noah Edwards",   utilizationPct: 78, totalAuthorizedHours: 80  },
  { clientName: "Olivia Foster",  utilizationPct: 71, totalAuthorizedHours: 100 },
  { clientName: "Lucas Hayes",    utilizationPct: 56, totalAuthorizedHours: 80  },
  { clientName: "Ava Hughes",     utilizationPct: 49, totalAuthorizedHours: 60  },
  { clientName: "Mia Davis",      utilizationPct: 38, totalAuthorizedHours: 100 },
]
