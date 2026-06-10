import type { SupabaseClient } from "@supabase/supabase-js"
import type { ClientAssignmentRole } from "@/lib/clientAssignments"
import { supabase as browserSupabase } from "@/lib/supabase"

export interface RosterImportRow {
  clientCode: string
  bcbaName: string
  clinicalSupervisorName?: string | null
  primaryBtName?: string | null
  clientFirstName?: string | null
  clientLastName?: string | null
  location?: string | null
}

export interface RosterImportResult {
  staffCreated: number
  staffUpdated: number
  clientsCreated: number
  clientsUpdated: number
  assignmentsCreated: number
  assignmentsSkipped: number
  unassignedBtClients: string[]
}

export const UNASSIGNED_BT = new Set(["x", "X", "", "-", "—"])

export const ROLE_MAP = {
  bcba: "bcba",
  clinical_supervisor: "supervisor",
  bt: "technician",
} as const

type StaffRole = (typeof ROLE_MAP)[keyof typeof ROLE_MAP]

const ROLE_SLUG: Record<StaffRole, string> = {
  bcba: "BCBA",
  supervisor: "SUP",
  technician: "BT",
}

let db: SupabaseClient = browserSupabase
let codePrefix = "SPG"

export function setRosterImportSupabase(client: SupabaseClient): void {
  db = client
}

export function setRosterImportCodePrefix(prefix: string): void {
  codePrefix = prefix
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ")
}

export function isUnassignedBt(value: string | null | undefined): boolean {
  return UNASSIGNED_BT.has((value ?? "").trim())
}

export function slugCode(name: string, role: StaffRole, prefix = codePrefix): string {
  const slug = normalizeName(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return `${prefix}-${ROLE_SLUG[role]}-${slug}`
}

function emptyResult(): RosterImportResult {
  return {
    staffCreated: 0,
    staffUpdated: 0,
    clientsCreated: 0,
    clientsUpdated: 0,
    assignmentsCreated: 0,
    assignmentsSkipped: 0,
    unassignedBtClients: [],
  }
}

export async function upsertStaffByName(
  practiceId: string,
  fullName: string,
  role: StaffRole,
  externalCode?: string,
  result?: RosterImportResult,
): Promise<string> {
  const normalized = normalizeName(fullName)
  if (!normalized) throw new Error("Staff name is required")

  const code = externalCode ?? slugCode(normalized, role)

  const { data: byCode, error: codeError } = await db
    .from("staff")
    .select("id, full_name")
    .eq("practice_id", practiceId)
    .eq("external_code", code)
    .maybeSingle()

  if (codeError) throw codeError
  if (byCode) {
    if (byCode.full_name !== normalized) {
      const { error: updateError } = await db
        .from("staff")
        .update({ full_name: normalized })
        .eq("id", byCode.id)
      if (updateError) throw updateError
      if (result) result.staffUpdated += 1
    }
    return byCode.id
  }

  const { data: byPractice, error: listError } = await db
    .from("staff")
    .select("id, full_name, external_code")
    .eq("practice_id", practiceId)
    .eq("role", role)

  if (listError) throw listError

  const byName = (byPractice ?? []).find(
    (row) => normalizeName(row.full_name) === normalized,
  )

  if (byName) {
    if (!byName.external_code) {
      const { error: updateError } = await db
        .from("staff")
        .update({ external_code: code, full_name: normalized, team: null })
        .eq("id", byName.id)
      if (updateError) throw updateError
      if (result) result.staffUpdated += 1
    }
    return byName.id
  }

  const { data: inserted, error: insertError } = await db
    .from("staff")
    .insert({
      practice_id: practiceId,
      full_name: normalized,
      role,
      team: null,
      external_code: code,
      direct_hours: 0,
      indirect_hours: 0,
      cancellation_hours: 0,
    })
    .select("id")
    .single()

  if (insertError) throw insertError
  if (result) result.staffCreated += 1
  return (inserted as { id: string }).id
}

export async function upsertClientByCode(
  practiceId: string,
  clientCode: string,
  firstName?: string | null,
  lastName?: string | null,
  result?: RosterImportResult,
): Promise<string> {
  const code = clientCode.trim()
  if (!code) throw new Error("Client code is required")

  const first = normalizeName(firstName ?? "") || code
  const last = normalizeName(lastName ?? "")

  const { data: existing, error: lookupError } = await db
    .from("clients")
    .select("id, first_name, last_name, status")
    .eq("practice_id", practiceId)
    .eq("external_code", code)
    .maybeSingle()

  if (lookupError) throw lookupError

  if (existing) {
    const patch: Record<string, string> = {}
    if (existing.first_name !== first) patch.first_name = first
    if (existing.last_name !== last) patch.last_name = last
    if (existing.status !== "active") patch.status = "active"

    if (Object.keys(patch).length > 0) {
      const { error: updateError } = await db
        .from("clients")
        .update(patch)
        .eq("id", existing.id)
      if (updateError) throw updateError
      if (result) result.clientsUpdated += 1
    }
    return existing.id
  }

  const { data: inserted, error: insertError } = await db
    .from("clients")
    .insert({
      practice_id: practiceId,
      external_code: code,
      first_name: first,
      last_name: last,
      status: "active",
    })
    .select("id")
    .single()

  if (insertError) throw insertError
  if (result) result.clientsCreated += 1
  return (inserted as { id: string }).id
}

export async function upsertAssignment(
  practiceId: string,
  clientId: string,
  staffId: string,
  role: ClientAssignmentRole,
  location?: string | null,
  result?: RosterImportResult,
): Promise<"created" | "skipped"> {
  const { data: existing, error: lookupError } = await db
    .from("client_assignments")
    .select("id, is_active, location")
    .eq("client_id", clientId)
    .eq("staff_id", staffId)
    .eq("assignment_role", role)
    .maybeSingle()

  if (lookupError) throw lookupError

  if (existing) {
    if (!existing.is_active || (location && existing.location !== location)) {
      const { error: updateError } = await db
        .from("client_assignments")
        .update({
          is_active: true,
          ...(location ? { location } : {}),
        })
        .eq("id", existing.id)
      if (updateError) throw updateError
      if (result) result.assignmentsCreated += 1
      return "created"
    }
    if (result) result.assignmentsSkipped += 1
    return "skipped"
  }

  const { error: insertError } = await db.from("client_assignments").insert({
    practice_id: practiceId,
    client_id: clientId,
    staff_id: staffId,
    assignment_role: role,
    location: location ?? null,
    is_active: true,
  })

  if (insertError) {
    if (insertError.code === "23505") {
      if (result) result.assignmentsSkipped += 1
      return "skipped"
    }
    throw insertError
  }

  if (result) result.assignmentsCreated += 1
  return "created"
}

export async function upsertClientCareTeam(
  practiceId: string,
  row: RosterImportRow,
  result?: RosterImportResult,
): Promise<void> {
  const clientId = await upsertClientByCode(
    practiceId,
    row.clientCode,
    row.clientFirstName,
    row.clientLastName,
    result,
  )

  const bcbaId = await upsertStaffByName(
    practiceId,
    row.bcbaName,
    ROLE_MAP.bcba,
    undefined,
    result,
  )

  await upsertAssignment(
    practiceId,
    clientId,
    bcbaId,
    "primary_bcba",
    row.location,
    result,
  )

  const supervisorName = normalizeName(row.clinicalSupervisorName ?? "")
  if (supervisorName) {
    const supervisorId = await upsertStaffByName(
      practiceId,
      supervisorName,
      ROLE_MAP.clinical_supervisor,
      undefined,
      result,
    )
    await upsertAssignment(
      practiceId,
      clientId,
      supervisorId,
      "clinical_supervisor",
      row.location,
      result,
    )
  }

  let primaryBtId: string | null = null
  if (!isUnassignedBt(row.primaryBtName)) {
    primaryBtId = await upsertStaffByName(
      practiceId,
      row.primaryBtName!,
      ROLE_MAP.bt,
      undefined,
      result,
    )
    await upsertAssignment(
      practiceId,
      clientId,
      primaryBtId,
      "primary_bt",
      row.location,
      result,
    )
  } else if (result) {
    result.unassignedBtClients.push(row.clientCode)
  }

  const { error: clientPatchError } = await db
    .from("clients")
    .update({ assigned_staff_id: primaryBtId })
    .eq("id", clientId)

  if (clientPatchError) throw clientPatchError
}

export async function importRosterRows(
  practiceId: string,
  rows: RosterImportRow[],
): Promise<RosterImportResult> {
  const result = emptyResult()

  for (const row of rows) {
    await upsertClientCareTeam(practiceId, row, result)
  }

  result.unassignedBtClients = [...new Set(result.unassignedBtClients)]
  return result
}

export function parseRosterCsv(csvText: string): RosterImportRow[] {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) return []

  const rows: RosterImportRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((cell) => cell.trim())
    const clientCode = cols[0]
    if (!clientCode) continue

    rows.push({
      clientCode,
      bcbaName: cols[1] ?? "",
      clinicalSupervisorName: cols[2] || null,
      primaryBtName: cols[3] || null,
      clientFirstName: cols[4] || null,
      clientLastName: cols[5] || null,
      location: cols[6] || null,
    })
  }

  return rows
}
