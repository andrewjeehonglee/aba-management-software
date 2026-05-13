// A treatment goal in a client's ABA program. Goals are the unit of clinical
// progress: each represents a discrete skill being taught and tracked toward
// a mastery criterion (e.g. "80% accuracy across 3 sessions"). The status
// field reflects where the goal sits in its lifecycle, not whether it's
// "active" — a "mastered" goal still appears on the active list because
// behavior analysts probe mastered skills periodically to ensure maintenance.
export type GoalStatus =
  | "under-progress"   // not making progress, regression, or stalled data
  | "in-progress"      // actively being taught at a normal pace
  | "nearing-mastery"  // close to meeting the mastery criterion
  | "mastered"         // criterion met; still tracked for maintenance

export interface Goal {
  id: string
  name: string                 // human-readable goal description
  masteryTarget: string        // criterion in plain English, e.g. "80% accuracy across 3 sessions"
  streakDays: number           // current consecutive days at or above streakPercent
  streakPercent: number        // 0-100 — accuracy threshold the streak is being held at
  lastUpdatedDaysAgo: number   // days since the most recent data point on this goal
  status: GoalStatus
}
