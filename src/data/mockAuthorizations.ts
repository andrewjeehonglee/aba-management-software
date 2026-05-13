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
export const mockAuthorizations: ClientAuthorization[] = [
  { clientName: "Sophia Bennett", utilizationPct: 92 },
  { clientName: "Liam Anderson",  utilizationPct: 87 },
  { clientName: "Ethan Carter",   utilizationPct: 81 },
  { clientName: "Noah Edwards",   utilizationPct: 78 },
  { clientName: "Olivia Foster",  utilizationPct: 71 },
  { clientName: "Lucas Hayes",    utilizationPct: 56 },
  { clientName: "Ava Hughes",     utilizationPct: 49 },
  { clientName: "Mia Davis",      utilizationPct: 38 },
]
