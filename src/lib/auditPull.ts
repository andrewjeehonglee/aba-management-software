import { supabase, type SessionNoteRecord } from "@/lib/supabase"

export interface AuditNoteBundleItem {
  sessionId: string
  sessionAt: string
  staffId: string
  staffName: string
  sessionType: string
  status: string
  clientCode: string
  clientName: string
  note: SessionNoteRecord | null
}

interface AuditSessionRow {
  id: string
  scheduled_at: string
  session_type: string
  status: string
  staff_id: string
  client_id: string
  clients: { first_name: string; last_name: string; external_code: string | null }
  staff: { full_name: string; team: string } | null
}

interface AuditNoteRow {
  id: string
  session_id: string
  staff_id: string
  subjective: string
  objective: string
  assessment: string
  plan: string
}

function parseDateInput(value: string): { year: number; month: number; day: number } {
  const [year, month, day] = value.split("-").map(Number)
  return { year, month, day }
}

/** Inclusive local-day bounds from `<input type="date">` values (YYYY-MM-DD). */
function localDateRangeToIso(startDate: string, endDate: string): { start: string; end: string } {
  const start = parseDateInput(startDate)
  const end = parseDateInput(endDate)
  return {
    start: new Date(start.year, start.month - 1, start.day, 0, 0, 0, 0).toISOString(),
    end: new Date(end.year, end.month - 1, end.day, 23, 59, 59, 999).toISOString(),
  }
}

function clientDisplayName(clients: AuditSessionRow["clients"]): string {
  const name = `${clients.first_name} ${clients.last_name}`.trim()
  return name || (clients.external_code ?? "Unknown")
}

function mapNoteRow(row: AuditNoteRow, sessionAt: string): SessionNoteRecord {
  return {
    id: row.id,
    session_id: row.session_id,
    staff_id: row.staff_id,
    subjective: row.subjective,
    objective: row.objective,
    assessment: row.assessment,
    plan: row.plan,
    created_at: null,
    session_at: sessionAt,
  }
}

export async function getStaffAuditNotesBundle(
  staffId: string,
  startDate: string,
  endDate: string,
): Promise<AuditNoteBundleItem[]> {
  const { start, end } = localDateRangeToIso(startDate, endDate)

  const { data, error } = await supabase
    .from("sessions")
    .select("id, scheduled_at, session_type, status, staff_id, client_id, clients(first_name, last_name, external_code), staff(full_name, team)")
    .eq("staff_id", staffId)
    .gte("scheduled_at", start)
    .lte("scheduled_at", end)
    .order("scheduled_at", { ascending: true })
  if (error) throw error

  const sessions = (data ?? []) as unknown as AuditSessionRow[]
  if (sessions.length === 0) return []

  const sessionIds = sessions.map((row) => row.id)
  const scheduledAtBySessionId = new Map(sessions.map((row) => [row.id, row.scheduled_at]))

  const { data: notesData, error: notesError } = await supabase
    .from("session_notes")
    .select("id, session_id, staff_id, subjective, objective, assessment, plan")
    .in("session_id", sessionIds)
    .order("id", { ascending: false })
  if (notesError) throw notesError

  const notesBySessionId = new Map<string, SessionNoteRecord>()
  for (const row of (notesData ?? []) as AuditNoteRow[]) {
    if (notesBySessionId.has(row.session_id)) continue
    notesBySessionId.set(
      row.session_id,
      mapNoteRow(row, scheduledAtBySessionId.get(row.session_id) ?? ""),
    )
  }

  return sessions.map((row) => ({
    sessionId: row.id,
    sessionAt: row.scheduled_at,
    staffId: row.staff_id,
    staffName: row.staff?.full_name ?? "Unknown",
    sessionType: row.session_type,
    status: row.status,
    clientCode: row.clients.external_code ?? "",
    clientName: clientDisplayName(row.clients),
    note: notesBySessionId.get(row.id) ?? null,
  }))
}

export async function getAuditNotesBundle(
  clientId: string,
  startDate: string,
  endDate: string,
): Promise<AuditNoteBundleItem[]> {
  const { start, end } = localDateRangeToIso(startDate, endDate)

  const { data, error } = await supabase
    .from("sessions")
    .select("id, scheduled_at, session_type, status, staff_id, client_id, clients(first_name, last_name, external_code), staff(full_name, team)")
    .eq("client_id", clientId)
    .gte("scheduled_at", start)
    .lte("scheduled_at", end)
    .order("scheduled_at", { ascending: true })
  if (error) throw error

  const sessions = (data ?? []) as unknown as AuditSessionRow[]
  if (sessions.length === 0) return []

  const sessionIds = sessions.map((row) => row.id)
  const scheduledAtBySessionId = new Map(sessions.map((row) => [row.id, row.scheduled_at]))

  const { data: notesData, error: notesError } = await supabase
    .from("session_notes")
    .select("id, session_id, staff_id, subjective, objective, assessment, plan")
    .in("session_id", sessionIds)
    .order("id", { ascending: false })
  if (notesError) throw notesError

  const notesBySessionId = new Map<string, SessionNoteRecord>()
  for (const row of (notesData ?? []) as AuditNoteRow[]) {
    if (notesBySessionId.has(row.session_id)) continue
    notesBySessionId.set(
      row.session_id,
      mapNoteRow(row, scheduledAtBySessionId.get(row.session_id) ?? ""),
    )
  }

  return sessions.map((row) => ({
    sessionId: row.id,
    sessionAt: row.scheduled_at,
    staffId: row.staff_id,
    staffName: row.staff?.full_name ?? "Unknown",
    sessionType: row.session_type,
    status: row.status,
    clientCode: row.clients.external_code ?? "",
    clientName: clientDisplayName(row.clients),
    note: notesBySessionId.get(row.id) ?? null,
  }))
}

export async function getSessionIdsWithBehaviorIncidents(
  sessionIds: string[],
): Promise<Set<string>> {
  if (sessionIds.length === 0) return new Set()

  const { data, error } = await supabase
    .from("behavior_incidents")
    .select("session_id")
    .in("session_id", sessionIds)

  if (error) throw error
  return new Set(((data ?? []) as { session_id: string }[]).map((row) => row.session_id))
}
