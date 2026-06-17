import { getCurrentPayPeriod } from "@/lib/payPeriod"
import { isCompleteSessionNote } from "@/lib/notesStatus"
import { DEFAULT_SESSION_HOURS } from "@/lib/staffHours"
import { supabase } from "@/lib/supabase"

export type PayPeriodRoleTier = "technician" | "supervisor" | "bcba"

export interface PayPeriodStaffHoursRow {
  staffId: string
  staffName: string
  staffExternalCode: string | null
  payableHours: number
  onHoldHours: number
}

export interface PayPeriodRoleTierDetail {
  tier: PayPeriodRoleTier
  label: string
  payableHours: number
  onHoldHours: number
  staff: PayPeriodStaffHoursRow[]
}

export interface PayPeriodHoursGapSummary {
  payPeriodLabel: string
  payPeriodShortLabel: string
  byRole: PayPeriodRoleTierDetail[]
}

export const PAY_PERIOD_TIER_ORDER: PayPeriodRoleTier[] = ["technician", "supervisor", "bcba"]

const TIER_LABELS: Record<PayPeriodRoleTier, string> = {
  technician: "Technicians",
  supervisor: "Supervisors",
  bcba: "BCBAs",
}

interface PayPeriodSessionRow {
  id: string
  staff_id: string
  staff: {
    full_name: string
    external_code: string | null
    role: string
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
}

function normalizeRoleTier(raw: string | null | undefined): PayPeriodRoleTier | null {
  const role = (raw ?? "").toLowerCase()
  if (role === "technician") return "technician"
  if (role === "supervisor") return "supervisor"
  if (role === "bcba") return "bcba"
  return null
}

function shortPayPeriodLabel(label: string): string {
  return label.replace(/,\s*\d{4}$/, "")
}

function finalizeStaffRows(byStaffId: Map<string, MutableStaffRow>): PayPeriodStaffHoursRow[] {
  return [...byStaffId.values()]
    .filter((row) => row.payableHours > 0 || row.onHoldHours > 0)
    .map(({ staffId, staffName, staffExternalCode, payableHours, onHoldHours }) => ({
      staffId,
      staffName,
      staffExternalCode,
      payableHours,
      onHoldHours,
    }))
}

export async function getPayPeriodHoursGap(
  now: Date = new Date(),
  options?: { staffIds?: string[]; clientIds?: string[] },
): Promise<PayPeriodHoursGapSummary> {
  const payPeriod = getCurrentPayPeriod(now)

  let sessionsQuery = supabase
    .from("sessions")
    .select("id, staff_id, staff(full_name, external_code, role)")
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
      }
      byStaffId.set(session.staff_id, row)
    }

    const hasCompleteNote = isCompleteSessionNote(notesBySessionId.get(session.id))
    if (hasCompleteNote) {
      row.payableHours += DEFAULT_SESSION_HOURS
    } else {
      row.onHoldHours += DEFAULT_SESSION_HOURS
    }
  }

  const staffRows = finalizeStaffRows(byStaffId)

  const byRole = PAY_PERIOD_TIER_ORDER.map((tier) => {
    const tierStaff = staffRows.filter((row) => {
      const mutable = byStaffId.get(row.staffId)
      return mutable?.tier === tier
    })

    return {
      tier,
      label: TIER_LABELS[tier],
      payableHours: tierStaff.reduce((sum, row) => sum + row.payableHours, 0),
      onHoldHours: tierStaff.reduce((sum, row) => sum + row.onHoldHours, 0),
      staff: tierStaff.sort(
        (a, b) =>
          b.onHoldHours - a.onHoldHours ||
          b.payableHours - a.payableHours ||
          a.staffName.localeCompare(b.staffName),
      ),
    }
  })

  return {
    payPeriodLabel: payPeriod.label,
    payPeriodShortLabel: shortPayPeriodLabel(payPeriod.label),
    byRole,
  }
}
