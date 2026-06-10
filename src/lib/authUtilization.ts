import { FLAGGED_THRESHOLD } from "@/lib/authorization"
import { isCompleteSessionNote } from "@/lib/notesStatus"
import { getCurrentCalendarMonth } from "@/lib/payPeriod"
import { classifySessionHours, DEFAULT_SESSION_HOURS } from "@/lib/staffHours"
import { supabase } from "@/lib/supabase"

function teamLabel(raw: string | null | undefined): string {
  if (!raw) return ""
  return raw.startsWith("Team") ? raw : `Team ${raw}`
}

interface AuthRow {
  id: string
  client_id: string
  authorized_units: number
  clients: {
    first_name: string
    last_name: string
    external_code: string | null
    team: string
    status: string | null
  }
}

interface ClientSessionRow {
  id: string
  client_id: string
  session_type: string
  status: string
}

interface SessionNoteRow {
  session_id: string
  subjective: string | null
  objective: string | null
  assessment: string | null
  plan: string | null
}

export interface ClientAuthUtilRow {
  authId: string
  clientId: string
  clientCode: string | null
  clientName: string
  clientTeam: string
  authorizedHours: number
  usedHours: number
  utilizationPct: number
  flagged: boolean
}

export interface AuthUtilizationSummary {
  monthLabel: string
  byClient: ClientAuthUtilRow[]
}

export async function getAuthUtilizationByMonth(
  now: Date = new Date(),
  options?: { clientIds?: string[] },
): Promise<AuthUtilizationSummary> {
  const month = getCurrentCalendarMonth(now)

  const { data: authData, error: authError } = await supabase
    .from("authorizations")
    .select("id, client_id, authorized_units, clients(first_name, last_name, external_code, team, status)")

  if (authError) throw authError

  const auths = (authData ?? []) as unknown as AuthRow[]
  let activeAuths = auths.filter(
    (a) =>
      (a.clients?.status === "active" || a.clients?.status == null) &&
      a.clients?.external_code?.trim(),
  )

  if (options?.clientIds?.length) {
    const allowed = new Set(options.clientIds)
    activeAuths = activeAuths.filter((a) => allowed.has(a.client_id))
  }

  if (activeAuths.length === 0) {
    return { monthLabel: month.label, byClient: [] }
  }

  const clientIds = activeAuths.map((a) => a.client_id)

  const { data: sessionsData, error: sessionsError } = await supabase
    .from("sessions")
    .select("id, client_id, session_type, status")
    .in("client_id", clientIds)
    .gte("scheduled_at", month.start.toISOString())
    .lte("scheduled_at", month.end.toISOString())

  if (sessionsError) throw sessionsError

  const sessions = (sessionsData ?? []) as ClientSessionRow[]
  const completedSessionIds = sessions
    .filter((s) => s.status === "completed")
    .map((s) => s.id)

  let notesBySessionId = new Map<string, SessionNoteRow>()
  if (completedSessionIds.length > 0) {
    const { data: notesData, error: notesError } = await supabase
      .from("session_notes")
      .select("session_id, subjective, objective, assessment, plan")
      .in("session_id", completedSessionIds)

    if (notesError) throw notesError
    notesBySessionId = new Map(
      ((notesData ?? []) as SessionNoteRow[]).map((note) => [note.session_id, note]),
    )
  }

  const usedByClientId = new Map<string, number>()

  for (const session of sessions) {
    const hasCompleteNote = isCompleteSessionNote(notesBySessionId.get(session.id))
    const bucket = classifySessionHours({
      status: session.status,
      sessionType: session.session_type,
      hasCompleteNote,
    })

    if (bucket !== "direct" && bucket !== "indirect") continue

    usedByClientId.set(
      session.client_id,
      (usedByClientId.get(session.client_id) ?? 0) + DEFAULT_SESSION_HOURS,
    )
  }

  const byClient = activeAuths
    .map((auth) => {
      const usedHours = usedByClientId.get(auth.client_id) ?? 0
      const authorizedHours = auth.authorized_units
      const utilizationPct = authorizedHours > 0
        ? Math.round((usedHours / authorizedHours) * 100)
        : 0
      const code = auth.clients.external_code
      const nameParts = [auth.clients.first_name, auth.clients.last_name].filter(Boolean)
      let displayName = "Unknown"
      if (code && nameParts.length) displayName = `${code} — ${nameParts.join(" ")}`
      else if (code) displayName = code
      else if (nameParts.length) displayName = nameParts.join(" ")

      return {
        authId: auth.id,
        clientId: auth.client_id,
        clientCode: code,
        clientName: displayName,
        clientTeam: teamLabel(auth.clients.team),
        authorizedHours,
        usedHours,
        utilizationPct,
        flagged: utilizationPct >= FLAGGED_THRESHOLD,
      }
    })
    .filter((row) => options?.clientIds?.length ? true : row.usedHours > 0)
    .sort(
      (a, b) =>
        b.utilizationPct - a.utilizationPct ||
        a.clientName.localeCompare(b.clientName),
    )

  return {
    monthLabel: month.label,
    byClient,
  }
}
