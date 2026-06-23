import { ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import { isCompleteSessionNote } from "@/lib/notesStatus"
import type { BehaviorIncidentRecord, SessionNoteRecord, SessionRecord } from "@/lib/supabase"
import { P, TILE_TITLE } from "./profileTokens"

function notesDueCount(sessions: SessionRecord[], notes: SessionNoteRecord[]): number {
  const notesBySession = new Map(notes.map((n) => [n.session_id, n]))
  return sessions.filter(
    (s) => s.status === "completed" && !isCompleteSessionNote(notesBySession.get(s.id)),
  ).length
}

function incidentsThisMonthCount(incidents: BehaviorIncidentRecord[]): number {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  return incidents.filter((i) => {
    const at = i.session_at ?? i.created_at
    if (!at) return false
    return new Date(at) >= monthStart
  }).length
}

interface RecordsBucketProps {
  clientRouteKey: string
  sessionNotes: SessionNoteRecord[]
  sessions: SessionRecord[]
  incidents: BehaviorIncidentRecord[]
}

export function RecordsBucket({
  clientRouteKey,
  sessionNotes,
  sessions,
  incidents,
}: RecordsBucketProps) {
  const noteCount = sessionNotes.length
  const dueCount = notesDueCount(sessions, sessionNotes)
  const monthIncidents = incidentsThisMonthCount(incidents)

  return (
    <section
      className="p-5"
      style={{ backgroundColor: P.card, borderRadius: P.radius }}
    >
      <h2 className={`${TILE_TITLE} mb-4`} style={{ color: P.ink }}>
        Records
      </h2>
      <div className="flex flex-col gap-2">
        <RecordCard
          title="Session notes"
          meta={`${noteCount} note${noteCount === 1 ? "" : "s"} · ${dueCount} due`}
          hint="Browse, filter by date, export for audit."
          to={`/clients/${encodeURIComponent(clientRouteKey)}/notes`}
        />
        <RecordCard
          title="Behavior incidents"
          meta={`${monthIncidents} logged this month`}
          hint="Full ABC history"
          to={`/clients/${encodeURIComponent(clientRouteKey)}/incidents`}
        />
      </div>
    </section>
  )
}

function RecordCard({
  title,
  meta,
  hint,
  to,
}: {
  title: string
  meta: string
  hint: string
  to: string
}) {
  return (
    <Link
      to={to}
      className="group flex items-start justify-between gap-3 rounded-[14px] p-4 transition-colors hover:opacity-90"
      style={{ backgroundColor: P.inset }}
    >
      <div className="min-w-0 space-y-1">
        <p className="text-[16px] font-semibold" style={{ color: P.ink }}>
          {title}
        </p>
        <p className="text-[13.5px] tabular-nums" style={{ color: P.soft }}>
          {meta}
        </p>
        <p className="text-[13px] leading-snug" style={{ color: P.faint }}>
          {hint}
        </p>
      </div>
      <ChevronRight
        className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
        style={{ color: P.faint }}
        aria-hidden="true"
      />
    </Link>
  )
}
