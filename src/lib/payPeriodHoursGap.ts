import { getCurrentPayPeriod } from "@/lib/payPeriod"
import { isCompleteSessionNote } from "@/lib/notesStatus"
import { DEFAULT_SESSION_HOURS } from "@/lib/staffHours"
import { supabase } from "@/lib/supabase"

export type PayPeriodRoleTier = "technician" | "supervisor" | "bcba"

export interface PayPeriodRoleTierRow {
  tier: PayPeriodRoleTier
  label: string
  payableHours: number
  onHoldHours: number
}

export interface PayPeriodHoursGapSummary {
  payPeriodLabel: string
  totalOnHoldHours: number
  byRole: PayPeriodRoleTierRow[]
}

const TIER_LABELS: Record<PayPeriodRoleTier, string> = {
  technician: "Technicians",
  supervisor: "Supervisors",
  bcba: "BCBAs",
}

const TIER_ORDER: PayPeriodRoleTier[] = ["technician", "supervisor", "bcba"]

interface PayPeriodSessionRow {
  id: string
  staff_id: string
  staff: { role: string } | null
}

interface SessionNoteRow {
  session_id: string
  subjective: string | null
  objective: string | null
  assessment: string | null
  plan: string | null
}

function normalizeRoleTier(raw: string | null | undefined): PayPeriodRoleTier | null {
  const role = (raw ?? "").toLowerCase()
  if (role === "technician") return "technician"
  if (role === "supervisor") return "supervisor"
  if (role === "bcba") return "bcba"
  return null
}

export async function getPayPeriodHoursGap(
  now: Date = new Date(),
  options?: { staffIds?: string[]; clientIds?: string[] },
): Promise<PayPeriodHoursGapSummary> {
  const payPeriod = getCurrentPayPeriod(now)

  let sessionsQuery = supabase
    .from("sessions")
    .select("id, staff_id, staff(role)")
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

  const totals = new Map<PayPeriodRoleTier, { payable: number; onHold: number }>(
    TIER_ORDER.map((tier) => [tier, { payable: 0, onHold: 0 }]),
  )

  for (const session of sessions) {
    const tier = normalizeRoleTier(session.staff?.role)
    if (!tier) continue

    const bucket = totals.get(tier)!
    const hasCompleteNote = isCompleteSessionNote(notesBySessionId.get(session.id))
    if (hasCompleteNote) {
      bucket.payable += DEFAULT_SESSION_HOURS
    } else {
      bucket.onHold += DEFAULT_SESSION_HOURS
    }
  }

  const byRole = TIER_ORDER.map((tier) => {
    const row = totals.get(tier)!
    return {
      tier,
      label: TIER_LABELS[tier],
      payableHours: row.payable,
      onHoldHours: row.onHold,
    }
  })

  const totalOnHoldHours = byRole.reduce((sum, row) => sum + row.onHoldHours, 0)

  return {
    payPeriodLabel: payPeriod.label,
    totalOnHoldHours,
    byRole,
  }
}
