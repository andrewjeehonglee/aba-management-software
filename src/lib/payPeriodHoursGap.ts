import { getCurrentPayPeriod } from "@/lib/payPeriod"
import { shortClientLabel } from "@/lib/dashboardTileMetrics"
import { isCompleteSessionNote } from "@/lib/notesStatus"
import { DEFAULT_SESSION_HOURS } from "@/lib/staffHours"
import { PRACTICE_TIMEZONE } from "@/lib/sessions"
import { supabase } from "@/lib/supabase"

export type PayPeriodRoleTier = "technician" | "supervisor" | "bcba"

export interface OnHoldSessionDetail {
  sessionId: string
  clientLabel: string
  dateLabel: string
  displayText: string
  clientCode: string | null
}

export interface PayPeriodStaffHoursRow {
  staffId: string
  staffName: string
  staffExternalCode: string | null
  payableHours: number
  onHoldHours: number
  onHoldSessions: OnHoldSessionDetail[]
}

export interface PayPeriodRoleTierDetail {
  tier: PayPeriodRoleTier
  label: string
  staff: PayPeriodStaffHoursRow[]
}

export interface PayPeriodHoursGapSummary {
  payPeriodLabel: string
  payPeriodTableLabel: string
  byRole: PayPeriodRoleTierDetail[]
}

export const PAY_PERIOD_TIER_ORDER: PayPeriodRoleTier[] = ["technician", "supervisor", "bcba"]

const TIER_LABELS: Record<PayPeriodRoleTier, string> = {
  technician: "Technicians",
  supervisor: "Supervisors",
  bcba: "BCBAs",
}

export interface RosterStaffForPayroll {
  id: string
  fullName: string
  externalCode: string
  role: PayPeriodRoleTier
}

interface PayPeriodSessionRow {
  id: string
  staff_id: string
  scheduled_at: string
  staff: {
    full_name: string
    external_code: string | null
    role: string
  } | null
  clients: {
    first_name: string
    last_name: string
    external_code: string | null
  } | null
}

interface SessionNoteRow {
  session_id: string
  subjective: string | null
  objective: string | null
  assessment: string | null
  plan: string | null
}

interface MutableStaffRow {
  staffId: string
  staffName: string
  staffExternalCode: string | null
  tier: PayPeriodRoleTier
  payableHours: number
  onHoldHours: number
  onHoldSessions: OnHoldSessionDetail[]
}

function normalizeRoleTier(raw: string | null | undefined): PayPeriodRoleTier | null {
  const role = (raw ?? "").toLowerCase()
  if (role === "technician") return "technician"
  if (role === "supervisor") return "supervisor"
  if (role === "bcba") return "bcba"
  return null
}

function formatPayPeriodTableLabel(label: string): string {
  return label
    .replace(/,\s*\d{4}$/, "")
    .replace(/\u2013/g, " to ")
    .replace(/–/g, " to ")
}

function formatSessionDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: PRACTICE_TIMEZONE,
    month: "short",
    day: "numeric",
  })
}

function clientLabelFromSession(clients: PayPeriodSessionRow["clients"]): string {
  if (!clients) return "?"
  const code = clients.external_code?.trim()
  if (code) return shortClientLabel(code)
  const name = [clients.first_name, clients.last_name].filter(Boolean).join(" ")
  return shortClientLabel(name || "?")
}

export async function getPayPeriodHoursGap(
  now: Date = new Date(),
  options?: {
    staffIds?: string[]
    clientIds?: string[]
    rosterStaff?: RosterStaffForPayroll[]
  },
): Promise<PayPeriodHoursGapSummary> {
  const payPeriod = getCurrentPayPeriod(now)

  let sessionsQuery = supabase
    .from("sessions")
    .select(
      "id, staff_id, scheduled_at, staff(full_name, external_code, role), clients(first_name, last_name, external_code)",
    )
    .eq("status", "completed")
    .gte("scheduled_at", payPeriod.start.toISOString())
    .lte("scheduled_at", payPeriod.end.toISOString())

  if (options?.staffIds?.length) {
    sessionsQuery = sessionsQuery.in("staff_id", options.staffIds)
  }
  if (options?.clientIds?.length) {
    sessionsQuery = sessionsQuery.in("client_id", options.clientIds)
  }

  const { data: sessionsData, error: sessionsError } = await sessionsQuery
  if (sessionsError) throw sessionsError

  const sessions = (sessionsData ?? []) as unknown as PayPeriodSessionRow[]
  const sessionIds = sessions.map((s) => s.id)

  let notesBySessionId = new Map<string, SessionNoteRow>()
  if (sessionIds.length > 0) {
    const { data: notesData, error: notesError } = await supabase
      .from("session_notes")
      .select("session_id, subjective, objective, assessment, plan")
      .in("session_id", sessionIds)

    if (notesError) throw notesError
    notesBySessionId = new Map(
      ((notesData ?? []) as SessionNoteRow[]).map((note) => [note.session_id, note]),
    )
  }

  const byStaffId = new Map<string, MutableStaffRow>()

  for (const session of sessions) {
    if (!session.staff?.full_name) continue
    const tier = normalizeRoleTier(session.staff.role)
    if (!tier) continue

    let row = byStaffId.get(session.staff_id)
    if (!row) {
      row = {
        staffId: session.staff_id,
        staffName: session.staff.full_name,
        staffExternalCode: session.staff.external_code ?? null,
        tier,
        payableHours: 0,
        onHoldHours: 0,
        onHoldSessions: [],
      }
      byStaffId.set(session.staff_id, row)
    }

    const hasCompleteNote = isCompleteSessionNote(notesBySessionId.get(session.id))
    if (hasCompleteNote) {
      row.payableHours += DEFAULT_SESSION_HOURS
    } else {
      row.onHoldHours += DEFAULT_SESSION_HOURS
      const clientLabel = clientLabelFromSession(session.clients)
      const dateLabel = formatSessionDateLabel(session.scheduled_at)
      row.onHoldSessions.push({
        sessionId: session.id,
        clientLabel,
        dateLabel,
        displayText: `${clientLabel}, ${dateLabel}`,
        clientCode: session.clients?.external_code?.trim() || null,
      })
    }
  }

  if (options?.rosterStaff?.length) {
    for (const staff of options.rosterStaff) {
      if (byStaffId.has(staff.id)) continue
      byStaffId.set(staff.id, {
        staffId: staff.id,
        staffName: staff.fullName,
        staffExternalCode: staff.externalCode,
        tier: staff.role,
        payableHours: 0,
        onHoldHours: 0,
        onHoldSessions: [],
      })
    }
  }

  const byRole = PAY_PERIOD_TIER_ORDER.map((tier) => {
    const tierStaff = [...byStaffId.values()]
      .filter((row) => row.tier === tier)
      .map(
        ({
          staffId,
          staffName,
          staffExternalCode,
          payableHours,
          onHoldHours,
          onHoldSessions,
        }) => ({
          staffId,
          staffName,
          staffExternalCode,
          payableHours,
          onHoldHours,
          onHoldSessions: [...onHoldSessions].sort(
            (a, b) => a.dateLabel.localeCompare(b.dateLabel) || a.clientLabel.localeCompare(b.clientLabel),
          ),
        }),
      )
      .sort(
        (a, b) =>
          b.onHoldHours - a.onHoldHours ||
          b.payableHours - a.payableHours ||
          a.staffName.localeCompare(b.staffName),
      )

    return {
      tier,
      label: TIER_LABELS[tier],
      staff: tierStaff,
    }
  })

  return {
    payPeriodLabel: payPeriod.label,
    payPeriodTableLabel: formatPayPeriodTableLabel(payPeriod.label),
    byRole,
  }
}
