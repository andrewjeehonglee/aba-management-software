import { getCurrentPayPeriod } from "@/lib/payPeriod"
import { supabase } from "@/lib/supabase"

function teamLabel(raw: string | null | undefined): string {
  if (!raw) return ""
  return raw.startsWith("Team") ? raw : `Team ${raw}`
}

interface CompletedSessionRow {
  id: string
  scheduled_at: string
  staff_id: string
  staff: { full_name: string; team: string }
  clients: { first_name: string; last_name: string }
}

interface SessionNoteRow {
  session_id: string
  subjective: string | null
  objective: string | null
  assessment: string | null
  plan: string | null
}

interface StaffSessionRow {
  staff_id: string
  scheduled_at: string
  status: string
}

export interface NotesStatusItem {
  sessionId: string
  scheduledAt: string
  clientName: string
  bucket: "missing" | "overdue"
}

export interface StaffNotesStatus {
  staffId: string
  staffName: string
  staffTeam: string
  missingCount: number
  overdueCount: number
  items: NotesStatusItem[]
}

export interface NotesStatusSummary {
  payPeriodLabel: string
  totalMissing: number
  totalOverdue: number
  byStaff: StaffNotesStatus[]
}

export function isCompleteSessionNote(note: SessionNoteRow | undefined): boolean {
  if (!note) return false
  return [note.subjective, note.objective, note.assessment, note.plan].every(
    (field) => (field ?? "").trim().length > 0,
  )
}

function classifyNoteBucket(
  sessionScheduledAt: string,
  staffId: string,
  staffSessions: StaffSessionRow[],
  now: Date,
  payPeriodEnd: Date,
): "missing" | "overdue" {
  const sessionTime = new Date(sessionScheduledAt).getTime()

  const nextSession = staffSessions
    .filter((s) => s.staff_id === staffId && s.status !== "cancelled")
    .filter((s) => new Date(s.scheduled_at).getTime() > sessionTime)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0]

  if (nextSession) {
    return new Date(nextSession.scheduled_at) <= now ? "overdue" : "missing"
  }

  return now > payPeriodEnd ? "overdue" : "missing"
}

export async function getNotesStatus(
  now: Date = new Date(),
  options?: { staffIds?: string[] },
): Promise<NotesStatusSummary> {
  const payPeriod = getCurrentPayPeriod(now)

  let sessionsQuery = supabase
    .from("sessions")
    .select("id, scheduled_at, staff_id, staff(full_name, team), clients(first_name, last_name)")
    .eq("status", "completed")
    .gte("scheduled_at", payPeriod.start.toISOString())
    .lte("scheduled_at", payPeriod.end.toISOString())

  if (options?.staffIds?.length) {
    sessionsQuery = sessionsQuery.in("staff_id", options.staffIds)
  }

  const { data: sessionsData, error: sessionsError } = await sessionsQuery

  if (sessionsError) throw sessionsError

  const completedSessions = (sessionsData ?? []) as unknown as CompletedSessionRow[]
  if (completedSessions.length === 0) {
    return {
      payPeriodLabel: payPeriod.label,
      totalMissing: 0,
      totalOverdue: 0,
      byStaff: [],
    }
  }

  const sessionIds = completedSessions.map((s) => s.id)
  const staffIds = [...new Set(completedSessions.map((s) => s.staff_id))]

  const [{ data: notesData, error: notesError }, { data: staffSessionsData, error: staffSessionsError }] =
    await Promise.all([
      supabase
        .from("session_notes")
        .select("session_id, subjective, objective, assessment, plan")
        .in("session_id", sessionIds),
      supabase
        .from("sessions")
        .select("staff_id, scheduled_at, status")
        .in("staff_id", staffIds)
        .neq("status", "cancelled")
        .order("scheduled_at", { ascending: true }),
    ])

  if (notesError) throw notesError
  if (staffSessionsError) throw staffSessionsError

  const notesBySessionId = new Map(
    ((notesData ?? []) as SessionNoteRow[]).map((note) => [note.session_id, note]),
  )
  const staffSessions = (staffSessionsData ?? []) as StaffSessionRow[]

  const byStaffMap = new Map<string, StaffNotesStatus>()

  for (const session of completedSessions) {
    const note = notesBySessionId.get(session.id)
    if (isCompleteSessionNote(note)) continue

    const bucket = classifyNoteBucket(
      session.scheduled_at,
      session.staff_id,
      staffSessions,
      now,
      payPeriod.end,
    )

    const clientName = `${session.clients.first_name} ${session.clients.last_name}`
    const existing = byStaffMap.get(session.staff_id)

    if (existing) {
      if (bucket === "missing") existing.missingCount += 1
      else existing.overdueCount += 1
      existing.items.push({
        sessionId: session.id,
        scheduledAt: session.scheduled_at,
        clientName,
        bucket,
      })
    } else {
      byStaffMap.set(session.staff_id, {
        staffId: session.staff_id,
        staffName: session.staff.full_name,
        staffTeam: teamLabel(session.staff.team),
        missingCount: bucket === "missing" ? 1 : 0,
        overdueCount: bucket === "overdue" ? 1 : 0,
        items: [{
          sessionId: session.id,
          scheduledAt: session.scheduled_at,
          clientName,
          bucket,
        }],
      })
    }
  }

  const byStaff = [...byStaffMap.values()].sort(
    (a, b) =>
      b.overdueCount - a.overdueCount ||
      b.missingCount - a.missingCount ||
      a.staffName.localeCompare(b.staffName),
  )

  return {
    payPeriodLabel: payPeriod.label,
    totalMissing: byStaff.reduce((sum, row) => sum + row.missingCount, 0),
    totalOverdue: byStaff.reduce((sum, row) => sum + row.overdueCount, 0),
    byStaff,
  }
}
