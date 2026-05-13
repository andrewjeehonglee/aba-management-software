import type { Goal } from "@/types/goal"

// Active goals per client, keyed by URL slug for direct lookup. Goal names
// and mastery criteria are drawn from real ABA practice (Cooper, Heron,
// Heward — Applied Behavior Analysis textbook conventions) so the demo
// reads as genuine to anyone who's worked in the field.
//
// Cross-tile narrative continues here:
//   - Mia Davis (no-show + cancellation today, 38% utilization): three
//     "under-progress" goals with stale lastUpdatedDaysAgo (5-7 days). The
//     attendance gap and the goal stagnation are the same problem surfacing
//     twice — exactly the pattern Jenny would want to see flagged.
//   - Liam Anderson (red zone in auth, 87%): heavy treatment showing payoff
//     in two "nearing-mastery" goals + recent streak data, plus one
//     under-progress to justify the intensive hours.
//   - Sophia Bennett (red zone, 92%): all in-progress + one nearing-mastery,
//     fresh data (1-2 days). The "intense work, on track" client.
//   - Lucas Hayes (steady, 56% utilization): three mastered goals (long
//     history) — the "doing well, in maintenance phase" client.
//   - Noah Edwards (assessment-heavy this week): all in-progress, low
//     streakDays. Just out of assessment, fresh program.
//   - Ava Hughes (youngest at 5): all in-progress with low streaks; early
//     learner, new to ABA.
export const mockGoals: Record<string, Goal[]> = {
  "sophia-bennett": [
    { id: "g-sb-1", name: "Manding for preferred items",        masteryTarget: "80% accuracy across 3 sessions",          streakDays: 4, streakPercent: 85, lastUpdatedDaysAgo: 1, status: "in-progress"     },
    { id: "g-sb-2", name: "Tacting common household objects",   masteryTarget: "90% accuracy across 5 sessions",          streakDays: 5, streakPercent: 88, lastUpdatedDaysAgo: 1, status: "nearing-mastery" },
    { id: "g-sb-3", name: "Eye contact during greetings",       masteryTarget: "4 of 5 trials across 3 sessions",         streakDays: 3, streakPercent: 80, lastUpdatedDaysAgo: 2, status: "in-progress"     },
    { id: "g-sb-4", name: "Echoing 2-syllable words",           masteryTarget: "80% accuracy across 3 sessions",          streakDays: 2, streakPercent: 82, lastUpdatedDaysAgo: 1, status: "in-progress"     },
    { id: "g-sb-5", name: "Joint attention to objects",         masteryTarget: "5 consecutive trials, 0 prompts",         streakDays: 3, streakPercent: 90, lastUpdatedDaysAgo: 2, status: "in-progress"     },
    { id: "g-sb-6", name: "Following 1-step instructions",      masteryTarget: "80% accuracy across 3 different staff",   streakDays: 4, streakPercent: 85, lastUpdatedDaysAgo: 1, status: "in-progress"     },
    { id: "g-sb-7", name: "Tolerating wait time (1 min)",       masteryTarget: "Calm waiting in 4 of 5 trials",           streakDays: 2, streakPercent: 75, lastUpdatedDaysAgo: 3, status: "in-progress"     },
  ],

  "liam-anderson": [
    { id: "g-la-1", name: "Independent toileting",              masteryTarget: "0 accidents for 5 consecutive sessions",  streakDays: 5, streakPercent: 100, lastUpdatedDaysAgo: 1, status: "nearing-mastery" },
    { id: "g-la-2", name: "Tolerating transitions",             masteryTarget: "<2 prompts on 5 transitions",             streakDays: 4, streakPercent: 80,  lastUpdatedDaysAgo: 1, status: "nearing-mastery" },
    { id: "g-la-3", name: "Manding using full sentences",       masteryTarget: "Independent in 4 of 5 opportunities",     streakDays: 3, streakPercent: 78,  lastUpdatedDaysAgo: 2, status: "in-progress"     },
    { id: "g-la-4", name: "Greeting peers appropriately",       masteryTarget: "Independent in 4 of 5 opportunities",     streakDays: 1, streakPercent: 60,  lastUpdatedDaysAgo: 3, status: "under-progress"  },
    { id: "g-la-5", name: "Receptive ID of body parts",         masteryTarget: "90% accuracy on 10 body parts, 3 sessions", streakDays: 3, streakPercent: 85, lastUpdatedDaysAgo: 1, status: "in-progress"     },
    { id: "g-la-6", name: "Turn-taking in board games",         masteryTarget: "Independent for full game, 3 sessions",   streakDays: 2, streakPercent: 70,  lastUpdatedDaysAgo: 2, status: "in-progress"     },
    { id: "g-la-7", name: "Imitating gross motor movements",    masteryTarget: "90% accuracy across 4 sessions",          streakDays: 4, streakPercent: 90,  lastUpdatedDaysAgo: 1, status: "in-progress"     },
    { id: "g-la-8", name: "Tooth brushing sequence",            masteryTarget: "90% accuracy on task analysis, 3 sessions", streakDays: 2, streakPercent: 72, lastUpdatedDaysAgo: 2, status: "under-progress"  },
  ],

  "ethan-carter": [
    { id: "g-ec-1", name: "Color matching (6 colors)",          masteryTarget: "80% across 5 colors, 3 sessions",         streakDays: 6, streakPercent: 95, lastUpdatedDaysAgo: 1, status: "mastered"        },
    { id: "g-ec-2", name: "Color naming (expressive)",          masteryTarget: "80% across 6 colors, 3 sessions",         streakDays: 3, streakPercent: 80, lastUpdatedDaysAgo: 1, status: "in-progress"     },
    { id: "g-ec-3", name: "Receptive ID of common objects",     masteryTarget: "90% accuracy across 3 sessions",          streakDays: 4, streakPercent: 88, lastUpdatedDaysAgo: 1, status: "in-progress"     },
    { id: "g-ec-4", name: "Pointing to request",                masteryTarget: "Independent in 4 of 5 opportunities",     streakDays: 2, streakPercent: 75, lastUpdatedDaysAgo: 2, status: "in-progress"     },
    { id: "g-ec-5", name: "Sitting at table for 5 minutes",     masteryTarget: "5 minutes without prompts, 3 sessions",   streakDays: 1, streakPercent: 60, lastUpdatedDaysAgo: 3, status: "under-progress"  },
    { id: "g-ec-6", name: "Hand washing routine",               masteryTarget: "Independent for full sequence, 3 sessions", streakDays: 3, streakPercent: 85, lastUpdatedDaysAgo: 2, status: "in-progress"   },
  ],

  "mia-davis": [
    { id: "g-md-1", name: "Tolerating transitions",             masteryTarget: "<2 prompts on 5 transitions",             streakDays: 0, streakPercent: 50, lastUpdatedDaysAgo: 6, status: "under-progress"  },
    { id: "g-md-2", name: "Manding for preferred items",        masteryTarget: "80% accuracy across 3 sessions",          streakDays: 1, streakPercent: 65, lastUpdatedDaysAgo: 5, status: "under-progress"  },
    { id: "g-md-3", name: "Eye contact during greetings",       masteryTarget: "4 of 5 trials across 3 sessions",         streakDays: 0, streakPercent: 55, lastUpdatedDaysAgo: 7, status: "under-progress"  },
    { id: "g-md-4", name: "Joint attention to objects",         masteryTarget: "5 consecutive trials, 0 prompts",         streakDays: 2, streakPercent: 70, lastUpdatedDaysAgo: 4, status: "in-progress"     },
    { id: "g-md-5", name: "Imitating gross motor movements",    masteryTarget: "90% accuracy across 4 sessions",          streakDays: 2, streakPercent: 75, lastUpdatedDaysAgo: 4, status: "in-progress"     },
    { id: "g-md-6", name: "Following 1-step instructions",      masteryTarget: "80% accuracy across 3 different staff",   streakDays: 3, streakPercent: 80, lastUpdatedDaysAgo: 3, status: "in-progress"     },
    { id: "g-md-7", name: "Pointing to request",                masteryTarget: "Independent in 4 of 5 opportunities",     streakDays: 1, streakPercent: 60, lastUpdatedDaysAgo: 5, status: "in-progress"     },
  ],

  "noah-edwards": [
    { id: "g-ne-1", name: "Manding for preferred items",        masteryTarget: "80% accuracy across 3 sessions",          streakDays: 1, streakPercent: 70, lastUpdatedDaysAgo: 1, status: "in-progress"     },
    { id: "g-ne-2", name: "Eye contact during greetings",       masteryTarget: "4 of 5 trials across 3 sessions",         streakDays: 1, streakPercent: 65, lastUpdatedDaysAgo: 1, status: "in-progress"     },
    { id: "g-ne-3", name: "Imitating gross motor movements",    masteryTarget: "90% accuracy across 4 sessions",          streakDays: 2, streakPercent: 80, lastUpdatedDaysAgo: 1, status: "in-progress"     },
    { id: "g-ne-4", name: "Receptive ID of common objects",     masteryTarget: "90% accuracy across 3 sessions",          streakDays: 1, streakPercent: 75, lastUpdatedDaysAgo: 2, status: "in-progress"     },
    { id: "g-ne-5", name: "Sitting at table for 5 minutes",     masteryTarget: "5 minutes without prompts, 3 sessions",   streakDays: 1, streakPercent: 60, lastUpdatedDaysAgo: 1, status: "in-progress"     },
    { id: "g-ne-6", name: "Tolerating transitions",             masteryTarget: "<2 prompts on 5 transitions",             streakDays: 1, streakPercent: 70, lastUpdatedDaysAgo: 2, status: "in-progress"     },
  ],

  "olivia-foster": [
    { id: "g-of-1", name: "Color matching (6 colors)",          masteryTarget: "80% across 5 colors, 3 sessions",         streakDays: 7, streakPercent: 95, lastUpdatedDaysAgo: 2, status: "mastered"        },
    { id: "g-of-2", name: "Receptive ID of body parts",         masteryTarget: "90% accuracy on 10 body parts, 3 sessions", streakDays: 6, streakPercent: 92, lastUpdatedDaysAgo: 1, status: "mastered"      },
    { id: "g-of-3", name: "Tacting common household objects",   masteryTarget: "90% accuracy across 5 sessions",          streakDays: 4, streakPercent: 88, lastUpdatedDaysAgo: 1, status: "in-progress"     },
    { id: "g-of-4", name: "Asking 'what's that?'",              masteryTarget: "Spontaneous use in 3 different contexts", streakDays: 3, streakPercent: 80, lastUpdatedDaysAgo: 1, status: "in-progress"     },
    { id: "g-of-5", name: "Greeting peers appropriately",       masteryTarget: "Independent in 4 of 5 opportunities",     streakDays: 3, streakPercent: 82, lastUpdatedDaysAgo: 2, status: "in-progress"     },
    { id: "g-of-6", name: "Hand washing routine",               masteryTarget: "Independent for full sequence, 3 sessions", streakDays: 4, streakPercent: 90, lastUpdatedDaysAgo: 1, status: "in-progress"   },
  ],

  "lucas-hayes": [
    { id: "g-lh-1", name: "Manding using full sentences",       masteryTarget: "Independent in 4 of 5 opportunities",     streakDays: 8, streakPercent: 95, lastUpdatedDaysAgo: 3, status: "mastered"        },
    { id: "g-lh-2", name: "Tooth brushing sequence",            masteryTarget: "90% accuracy on task analysis, 3 sessions", streakDays: 6, streakPercent: 92, lastUpdatedDaysAgo: 2, status: "mastered"      },
    { id: "g-lh-3", name: "Tolerating wait time (3 min)",       masteryTarget: "Calm waiting in 4 of 5 trials",           streakDays: 7, streakPercent: 90, lastUpdatedDaysAgo: 2, status: "mastered"        },
    { id: "g-lh-4", name: "Independent toileting",              masteryTarget: "0 accidents for 5 consecutive sessions",  streakDays: 4, streakPercent: 90, lastUpdatedDaysAgo: 1, status: "nearing-mastery" },
    { id: "g-lh-5", name: "Turn-taking in board games",         masteryTarget: "Independent for full game, 3 sessions",   streakDays: 3, streakPercent: 85, lastUpdatedDaysAgo: 2, status: "in-progress"     },
    { id: "g-lh-6", name: "Greeting peers appropriately",       masteryTarget: "Independent in 4 of 5 opportunities",     streakDays: 4, streakPercent: 82, lastUpdatedDaysAgo: 1, status: "in-progress"     },
    { id: "g-lh-7", name: "Asking 'what's that?'",              masteryTarget: "Spontaneous use in 3 different contexts", streakDays: 2, streakPercent: 75, lastUpdatedDaysAgo: 3, status: "in-progress"     },
    { id: "g-lh-8", name: "Sitting at table for 10 minutes",    masteryTarget: "10 minutes without prompts, 3 sessions",  streakDays: 3, streakPercent: 80, lastUpdatedDaysAgo: 2, status: "in-progress"     },
  ],

  "ava-hughes": [
    { id: "g-ah-1", name: "Eye contact during greetings",       masteryTarget: "4 of 5 trials across 3 sessions",         streakDays: 2, streakPercent: 70, lastUpdatedDaysAgo: 1, status: "in-progress"     },
    { id: "g-ah-2", name: "Pointing to request",                masteryTarget: "Independent in 4 of 5 opportunities",     streakDays: 3, streakPercent: 75, lastUpdatedDaysAgo: 1, status: "in-progress"     },
    { id: "g-ah-3", name: "Imitating gross motor movements",    masteryTarget: "90% accuracy across 4 sessions",          streakDays: 2, streakPercent: 80, lastUpdatedDaysAgo: 2, status: "in-progress"     },
    { id: "g-ah-4", name: "Manding for preferred items",        masteryTarget: "80% accuracy across 3 sessions",          streakDays: 3, streakPercent: 78, lastUpdatedDaysAgo: 1, status: "in-progress"     },
    { id: "g-ah-5", name: "Sitting at table for 5 minutes",     masteryTarget: "5 minutes without prompts, 3 sessions",   streakDays: 1, streakPercent: 65, lastUpdatedDaysAgo: 2, status: "in-progress"     },
    { id: "g-ah-6", name: "Receptive ID of common objects",     masteryTarget: "90% accuracy across 3 sessions",          streakDays: 2, streakPercent: 72, lastUpdatedDaysAgo: 1, status: "in-progress"     },
  ],
}
