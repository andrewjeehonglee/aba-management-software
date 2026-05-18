import type { GoalStatus } from "@/types/goal"

export interface GoalDataPoint {
  date: string     // display label e.g. "Nov 10"
  session: number  // 0-100 — per-session accuracy %
  average: number  // 3-session rolling mean (rounds to integer)
}

export interface GoalHistory {
  masteryThreshold: number  // 0-100 — drives the dashed reference line
  points: GoalDataPoint[]
}

// -------------------------------------------------------------------
// Seeded pseudo-random number generator (LCG — Knuth constants).
// Determinism guarantees the same goal always draws the same chart,
// regardless of render order, so refreshing the page feels stable.
// -------------------------------------------------------------------
function seededRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = Math.imul(s, 1664525) + 1013904223
    return (s >>> 0) / 0xffffffff
  }
}

// Simple string → integer hash so goal IDs act as seeds without
// us maintaining a separate lookup table of numbers.
function hashStr(id: string): number {
  return id.split("").reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 17) >>> 0
}

// -------------------------------------------------------------------
// History generator.
//
// Produces 25 weekly data points starting Nov 10, 2025, which puts
// "today" (May 13, 2026) just past the last point — clinically the
// chart reads as "last ~6 months of sessions."
//
// Each GoalStatus drives a distinct trajectory shape so the chart
// tells a story consistent with what the goal list already shows:
//
//   under-progress  → starts 50–65%, slight downward drift, never
//                     gets close to threshold. Variance models a
//                     struggling learner with inconsistent sessions.
//
//   in-progress     → starts 45–62%, steady positive drift, ends
//                     around 70–82%. Not at threshold yet but clearly
//                     moving in the right direction.
//
//   nearing-mastery → starts 65–78%, accelerating drift, ends
//                     85–95%. Approaches threshold but hasn't crossed
//                     it cleanly for 3+ sessions.
//
//   mastered        → starts 58–72%, strong drift, crosses threshold
//                     around week 16 and stays above it with only
//                     occasional dips. The "lock-in" week represents
//                     the clinical decision to probe for maintenance.
// -------------------------------------------------------------------
function generatePoints(
  seed: number,
  status: GoalStatus,
  threshold: number,
): GoalDataPoint[] {
  const rng = seededRng(seed)

  // Trajectory parameters per status.
  const cfg: Record<
    GoalStatus,
    { startMin: number; startMax: number; drift: number; noise: number; lockWeek?: number }
  > = {
    "under-progress":  { startMin: 50, startMax: 65, drift: -0.15, noise: 12 },
    "in-progress":     { startMin: 45, startMax: 62, drift:  0.55, noise: 11 },
    "nearing-mastery": { startMin: 65, startMax: 78, drift:  0.80, noise:  9 },
    mastered:          { startMin: 58, startMax: 72, drift:  1.10, noise:  8, lockWeek: 16 },
  }
  const c = cfg[status]

  let current = c.startMin + rng() * (c.startMax - c.startMin)
  const sessions: number[] = []

  for (let i = 0; i < 25; i++) {
    current += c.drift + (rng() - 0.5) * 2 * c.noise

    // Once a mastered goal crosses its lock-in week, anchor it above
    // the threshold so the chart clearly shows maintenance-phase data.
    if (c.lockWeek !== undefined && i >= c.lockWeek) {
      current = Math.max(current, threshold - 3 + rng() * 7)
    }

    sessions.push(Math.round(Math.max(0, Math.min(100, current))))
  }

  // Base date: Nov 10, 2025 (25 weeks before mid-May 2026).
  const BASE = new Date(2025, 10, 10).getTime()
  const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

  return sessions.map((session, i) => {
    // 3-session rolling average — last 3 points inclusive of current.
    const window = sessions.slice(Math.max(0, i - 2), i + 1)
    const average = Math.round(window.reduce((s, v) => s + v, 0) / window.length)

    const d = new Date(BASE + i * MS_PER_WEEK)
    const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })

    return { date, session, average }
  })
}

// -------------------------------------------------------------------
// Per-goal spec: mastery threshold (numeric %) + status.
//
// Thresholds are derived from the masteryTarget prose in mockGoals.ts
// and expressed as integers the chart can use directly:
//
//   "80% accuracy ..."            → 80
//   "90% accuracy ..."            → 90
//   "4 of 5 trials ..."           → 80  (4/5 = 80%)
//   "5 consecutive trials, 0…"   → 100
//   "0 accidents ..."             → 100
//   "Independent in 4 of 5 …"    → 80
//   "Independent for full …"      → 100
//   "Spontaneous use …"           → 100
//   "<2 prompts on 5 …"           → 60  (3 of 5 independent = 60%)
//   "Calm waiting in 4 of 5 …"   → 80
// -------------------------------------------------------------------
const GOAL_SPECS: Record<string, { threshold: number; status: GoalStatus }> = {
  // sophia-bennett
  "g-sb-1": { threshold: 80,  status: "in-progress"     },
  "g-sb-2": { threshold: 90,  status: "nearing-mastery" },
  "g-sb-3": { threshold: 80,  status: "in-progress"     },
  "g-sb-4": { threshold: 80,  status: "in-progress"     },
  "g-sb-5": { threshold: 100, status: "in-progress"     },
  "g-sb-6": { threshold: 80,  status: "in-progress"     },
  "g-sb-7": { threshold: 80,  status: "in-progress"     },

  // liam-anderson
  "g-la-1": { threshold: 100, status: "nearing-mastery" },
  "g-la-2": { threshold: 60,  status: "nearing-mastery" },
  "g-la-3": { threshold: 80,  status: "in-progress"     },
  "g-la-4": { threshold: 80,  status: "under-progress"  },
  "g-la-5": { threshold: 90,  status: "in-progress"     },
  "g-la-6": { threshold: 100, status: "in-progress"     },
  "g-la-7": { threshold: 90,  status: "in-progress"     },
  "g-la-8": { threshold: 90,  status: "under-progress"  },

  // ethan-carter
  "g-ec-1": { threshold: 80,  status: "mastered"        },
  "g-ec-2": { threshold: 80,  status: "in-progress"     },
  "g-ec-3": { threshold: 90,  status: "in-progress"     },
  "g-ec-4": { threshold: 80,  status: "in-progress"     },
  "g-ec-5": { threshold: 100, status: "under-progress"  },
  "g-ec-6": { threshold: 100, status: "in-progress"     },

  // mia-davis
  "g-md-1": { threshold: 60,  status: "under-progress"  },
  "g-md-2": { threshold: 80,  status: "under-progress"  },
  "g-md-3": { threshold: 80,  status: "under-progress"  },
  "g-md-4": { threshold: 100, status: "in-progress"     },
  "g-md-5": { threshold: 90,  status: "in-progress"     },
  "g-md-6": { threshold: 80,  status: "in-progress"     },
  "g-md-7": { threshold: 80,  status: "in-progress"     },

  // noah-edwards
  "g-ne-1": { threshold: 80,  status: "in-progress"     },
  "g-ne-2": { threshold: 80,  status: "in-progress"     },
  "g-ne-3": { threshold: 90,  status: "in-progress"     },
  "g-ne-4": { threshold: 90,  status: "in-progress"     },
  "g-ne-5": { threshold: 100, status: "in-progress"     },
  "g-ne-6": { threshold: 60,  status: "in-progress"     },

  // olivia-foster
  "g-of-1": { threshold: 80,  status: "mastered"        },
  "g-of-2": { threshold: 90,  status: "mastered"        },
  "g-of-3": { threshold: 90,  status: "in-progress"     },
  "g-of-4": { threshold: 100, status: "in-progress"     },
  "g-of-5": { threshold: 80,  status: "in-progress"     },
  "g-of-6": { threshold: 100, status: "in-progress"     },

  // lucas-hayes
  "g-lh-1": { threshold: 80,  status: "mastered"        },
  "g-lh-2": { threshold: 90,  status: "mastered"        },
  "g-lh-3": { threshold: 80,  status: "mastered"        },
  "g-lh-4": { threshold: 100, status: "nearing-mastery" },
  "g-lh-5": { threshold: 100, status: "in-progress"     },
  "g-lh-6": { threshold: 80,  status: "in-progress"     },
  "g-lh-7": { threshold: 100, status: "in-progress"     },
  "g-lh-8": { threshold: 100, status: "in-progress"     },

  // ava-hughes
  "g-ah-1": { threshold: 80,  status: "in-progress"     },
  "g-ah-2": { threshold: 80,  status: "in-progress"     },
  "g-ah-3": { threshold: 90,  status: "in-progress"     },
  "g-ah-4": { threshold: 80,  status: "in-progress"     },
  "g-ah-5": { threshold: 100, status: "in-progress"     },
  "g-ah-6": { threshold: 90,  status: "in-progress"     },
}

// Computed at module load — deterministic, so safe to keep at module scope.
export const mockGoalHistory: Record<string, GoalHistory> = Object.fromEntries(
  Object.entries(GOAL_SPECS).map(([id, { threshold, status }]) => [
    id,
    {
      masteryThreshold: threshold,
      points: generatePoints(hashStr(id), status, threshold),
    },
  ]),
)
