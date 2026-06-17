import { PRACTICE_TIMEZONE } from "@/lib/sessions"
import { getCurrentCalendarMonth } from "@/lib/payPeriod"
import { DEFAULT_SESSION_HOURS } from "@/lib/staffHours"
import { formatClientDisplayName } from "@/lib/authUtilization"
import { shortClientLabel } from "@/lib/dashboardTileMetrics"
import { supabase } from "@/lib/supabase"

/** Only flag direct-engagement ratio after this day of the calendar month (practice TZ). */
export const CLIENT_DIRECT_ENGAGEMENT_FLAG_DAY = 21

export const CLIENT_DIRECT_ENGAGEMENT_THRESHOLD = 0.5

export interface ClientDirectEngagementRow {
  clientId: string
  clientCode: string | null
  clientLabel: string
  authorizedHours: number
  directHours: number
  directRatio: number
}

function calendarDayInPracticeTz(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PRACTICE_TIMEZONE,
    day: "numeric",
  }).formatToParts(date)
  return Number(parts.find((p) => p.type === "day")?.value ?? 1)
}

export function shouldFlagClientDirectEngagement(now: Date = new Date()): boolean {
  return calendarDayInPracticeTz(now) >= CLIENT_DIRECT_ENGAGEMENT_FLAG_DAY
}

interface AuthRow {
  id: string
  client_id: string
  authorized_units: number
  clients: {
    first_name: string
    last_name: string
    external_code: string | null
    status: string | null
  }
}

interface ClientSessionRow {
  client_id: string
  session_type: string
  status: string
}

export async function getClientDirectEngagementFlags(
  now: Date = new Date(),
  options?: { clientIds?: string[] },
): Promise<ClientDirectEngagementRow[]> {
  if (!shouldFlagClientDirectEngagement(now)) return []

  const month = getCurrentCalendarMonth(now)

  const { data: authData, error: authError } = await supabase
    .from("authorizations")
    .select("id, client_id, authorized_units, clients(first_name, last_name, external_code, status)")

  if (authError) throw authError

  let auths = (authData ?? []) as unknown as AuthRow[]
  auths = auths.filter(
    (a) =>
      (a.clients?.status === "active" || a.clients?.status == null) &&
      a.clients?.external_code?.trim(),
  )

  if (options?.clientIds?.length) {
    const allowed = new Set(options.clientIds)
    auths = auths.filter((a) => allowed.has(a.client_id))
  }

  if (auths.length === 0) return []

  const clientIds = auths.map((a) => a.client_id)

  const { data: sessionsData, error: sessionsError } = await supabase
    .from("sessions")
    .select("client_id, session_type, status")
    .in("client_id", clientIds)
    .gte("scheduled_at", month.start.toISOString())
    .lte("scheduled_at", month.end.toISOString())

  if (sessionsError) throw sessionsError

  const directByClientId = new Map<string, number>()
  for (const session of (sessionsData ?? []) as ClientSessionRow[]) {
    if (session.status !== "completed" || session.session_type !== "direct") continue
    directByClientId.set(
      session.client_id,
      (directByClientId.get(session.client_id) ?? 0) + DEFAULT_SESSION_HOURS,
    )
  }

  const flagged: ClientDirectEngagementRow[] = []

  for (const auth of auths) {
    const authorizedHours = auth.authorized_units
    if (authorizedHours <= 0) continue

    const directHours = directByClientId.get(auth.client_id) ?? 0
    const directRatio = directHours / authorizedHours
    if (directRatio >= CLIENT_DIRECT_ENGAGEMENT_THRESHOLD) continue

    const code = auth.clients.external_code?.trim() || null
    const displayName = formatClientDisplayName(
      code,
      auth.clients.first_name,
      auth.clients.last_name,
    )

    flagged.push({
      clientId: auth.client_id,
      clientCode: code,
      clientLabel: shortClientLabel(displayName),
      authorizedHours,
      directHours,
      directRatio,
    })
  }

  return flagged.sort(
    (a, b) => a.directRatio - b.directRatio || a.clientLabel.localeCompare(b.clientLabel),
  )
}
