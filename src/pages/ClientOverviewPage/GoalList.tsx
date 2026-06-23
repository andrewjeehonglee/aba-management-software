import type { GoalRecord } from "@/lib/supabase"
import type { Goal } from "@/types/goal"
import { P } from "./profileTokens"

const GOAL_STATUS_ORDER: Record<string, number> = {
  "in-progress": 0,
  in_progress: 0,
  hold: 1,
  mastered: 2,
  discontinued: 3,
}

const GOAL_DOT: Record<string, string> = {
  "in-progress": P.goalInProgress,
  in_progress: P.goalInProgress,
  hold: P.goalHold,
  mastered: P.goalMastered,
  discontinued: P.faint,
}

const GOAL_LABEL: Record<string, string> = {
  "in-progress": "In progress",
  in_progress: "In progress",
  hold: "Hold",
  mastered: "Mastered",
  discontinued: "Discontinued",
}

function formatMeasurement(goal: GoalRecord): string {
  if (goal.streakDays === 0) return "Not started yet"
  return `${goal.streakDays} day${goal.streakDays === 1 ? "" : "s"} in a row at ${goal.streakPercent}%`
}

interface GoalListProps {
  goals: GoalRecord[]
  loading: boolean
  canAdd: boolean
  onAdd: () => void
  onSelect: (goal: Goal) => void
}

export function GoalList({ goals, loading, canAdd, onAdd, onSelect }: GoalListProps) {
  const activeGoals = goals
    .filter((g) => g.status !== "discontinued" && g.status !== "mastered")
    .sort(
      (a, b) =>
        (GOAL_STATUS_ORDER[a.status] ?? 9) - (GOAL_STATUS_ORDER[b.status] ?? 9) ||
        a.name.localeCompare(b.name),
    )

  return (
    <section
      className="flex min-h-0 flex-col p-5"
      style={{ backgroundColor: P.card, borderRadius: P.radius }}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[18px] font-semibold" style={{ color: P.ink }}>
          Active goals
        </h2>
        {canAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="text-[13px] font-medium transition-opacity hover:opacity-80"
            style={{ color: P.sage }}
          >
            + New goal
          </button>
        )}
      </div>

      {loading ? (
        <p className="mt-6 text-sm animate-pulse" style={{ color: P.faint }}>
          Loading…
        </p>
      ) : activeGoals.length === 0 ? (
        <EmptyGoals canAdd={canAdd} onAdd={onAdd} />
      ) : (
        <ul className="mt-4 min-h-0 flex-1">
          {activeGoals.map((goal, index) => (
            <li
              key={goal.id}
              className="py-3.5 first:pt-0"
              style={{ borderTop: index > 0 ? `1px solid ${P.rule}` : undefined }}
            >
              <GoalRow goal={goal} onSelect={() => onSelect(goal as Goal)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function GoalRow({ goal, onSelect }: { goal: GoalRecord; onSelect: () => void }) {
  const dot = GOAL_DOT[goal.status] ?? P.faint
  const label = GOAL_LABEL[goal.status] ?? goal.status

  return (
    <div className="space-y-1">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onSelect}
          className="text-left text-[16px] font-semibold hover:underline underline-offset-2"
          style={{ color: P.ink }}
        >
          {goal.name}
        </button>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px]" style={{ color: P.soft }}>
          <span className="size-2 rounded-full" style={{ backgroundColor: dot }} aria-hidden="true" />
          {label}
        </span>
      </div>
      {goal.masteryTarget && (
        <p className="text-[14px] leading-snug" style={{ color: P.soft }}>
          {goal.masteryTarget}
        </p>
      )}
      <p className="text-[13px] tabular-nums" style={{ color: P.faint }}>
        {formatMeasurement(goal)}
      </p>
    </div>
  )
}

function EmptyGoals({ canAdd, onAdd }: { canAdd: boolean; onAdd: () => void }) {
  return (
    <div className="mt-6 flex flex-col items-center gap-3 py-6 text-center">
      <svg
        className="size-8"
        style={{ color: P.sage }}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
        />
      </svg>
      <p className="text-sm font-medium" style={{ color: P.ink }}>
        No goals yet
      </p>
      {canAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="text-xs font-medium"
          style={{ color: P.sage }}
        >
          Add a goal →
        </button>
      )}
    </div>
  )
}
