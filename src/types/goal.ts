// A treatment goal in a client's ABA program. Goals are the unit of clinical
// progress: each represents a discrete skill being taught and tracked toward
// a mastery criterion (e.g. "80% accuracy across 3 sessions"). The status
// field reflects where the goal sits in its lifecycle:
//
//   in-progress   — actively being taught at a normal pace
//   hold          — temporarily paused (BCBA decision; e.g. awaiting assessment,
//                   attendance disruption, regression requiring re-baselining)
//   discontinued  — officially removed from the program; criterion not met but
//                   goal was deprioritised or clinically inappropriate to continue
//   mastered      — criterion met; still tracked periodically for maintenance
export type GoalStatus = "in-progress" | "hold" | "discontinued" | "mastered"

export interface Goal {
  id: string
  name: string                 // human-readable goal description
  masteryTarget: string        // criterion in plain English, e.g. "80% accuracy across 3 sessions"
  streakDays: number           // current consecutive days at or above streakPercent
  streakPercent: number        // 0-100 — accuracy threshold the streak is being held at
  lastUpdatedDaysAgo: number   // days since the most recent data point on this goal
  status: GoalStatus
}
