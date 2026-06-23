import type { BehaviorIncidentRecord, BehaviorRecord } from "@/lib/supabase"
import { P } from "./profileTokens"

function incidentsThisMonth(incidents: BehaviorIncidentRecord[]): Map<string, number> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const counts = new Map<string, number>()
  for (const incident of incidents) {
    const at = incident.session_at ?? incident.created_at
    if (!at) continue
    const d = new Date(at)
    if (d < monthStart) continue
    counts.set(incident.behavior_id, (counts.get(incident.behavior_id) ?? 0) + 1)
  }
  return counts
}

function recentCountLabel(count: number): string {
  if (count === 0) return "No incidents this month"
  return `${count} incident${count === 1 ? "" : "s"} this month`
}

interface BehaviorListProps {
  behaviors: BehaviorRecord[]
  incidents: BehaviorIncidentRecord[]
  loading: boolean
  canAdd: boolean
  onAdd: () => void
}

export function BehaviorList({
  behaviors,
  incidents,
  loading,
  canAdd,
  onAdd,
}: BehaviorListProps) {
  const counts = incidentsThisMonth(incidents)

  return (
    <section
      className="flex min-h-0 flex-col p-5"
      style={{ backgroundColor: P.card, borderRadius: P.radius }}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[18px] font-semibold" style={{ color: P.ink }}>
          Behaviors
        </h2>
        {canAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="text-[13px] font-medium transition-opacity hover:opacity-80"
            style={{ color: P.sage }}
          >
            + New behavior
          </button>
        )}
      </div>

      {loading ? (
        <p className="mt-6 text-sm animate-pulse" style={{ color: P.faint }}>
          Loading…
        </p>
      ) : behaviors.length === 0 ? (
        <EmptyBehaviors canAdd={canAdd} onAdd={onAdd} />
      ) : (
        <ul className="mt-4 min-h-0 flex-1">
          {behaviors.map((behavior, index) => (
            <li
              key={behavior.id}
              className="py-3.5 first:pt-0"
              style={{ borderTop: index > 0 ? `1px solid ${P.rule}` : undefined }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[16px] font-semibold" style={{ color: P.ink }}>
                  {behavior.name}
                </p>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[12px] font-medium"
                  style={{ backgroundColor: P.inset, color: P.soft }}
                >
                  Frequency
                </span>
              </div>
              {behavior.description && (
                <p className="mt-1 text-[14px] leading-snug" style={{ color: P.soft }}>
                  {behavior.description}
                </p>
              )}
              <p className="mt-1 text-[13px] tabular-nums" style={{ color: P.faint }}>
                {recentCountLabel(counts.get(behavior.id) ?? 0)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function EmptyBehaviors({ canAdd, onAdd }: { canAdd: boolean; onAdd: () => void }) {
  return (
    <div className="mt-6 flex flex-col items-center gap-2 py-6 text-center">
      <p className="text-sm" style={{ color: P.soft }}>
        No behaviors defined
      </p>
      {canAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="text-xs font-medium"
          style={{ color: P.sage }}
        >
          Add a behavior →
        </button>
      )}
    </div>
  )
}
