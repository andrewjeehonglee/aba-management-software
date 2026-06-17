import { supabase } from "@/lib/supabase"

export interface RosterRow {
  clientId: string
  clientCode: string
  clientDisplayName: string
  bcbaId: string | null
  bcbaName: string | null
  supervisorId: string | null
  supervisorName: string | null
  btId: string | null
  btName: string | null
  bcbaCode: string | null
  supervisorCode: string | null
  btCode: string | null
  btUnassigned: boolean
  location: string | null
}

export interface BcbaSummary {
  staffId: string
  fullName: string
  clientCount: number
  btCount: number
  unassignedBtCount: number
}

type ClientRow = {
  id: string
  external_code: string
  first_name: string | null
  last_name: string | null
}

type AssignmentRow = {
  client_id: string
  staff_id: string
  assignment_role: string
  location: string | null
}

type StaffNameRow = { id: string; full_name: string; external_code: string }

function clientDisplayName(client: ClientRow): string {
  const parts = [client.first_name, client.last_name].filter(Boolean)
  if (parts.length > 0) return parts.join(" ")
  return client.external_code
}

function staffMaps(staff: StaffNameRow[]): {
  names: Map<string, string>
  codes: Map<string, string>
} {
  return {
    names: new Map(staff.map((s) => [s.id, s.full_name])),
    codes: new Map(staff.map((s) => [s.id, s.external_code])),
  }
}

export async function getRosterRows(
  practiceId: string,
  options?: {
    bcbaStaffId?: string
    supervisorStaffId?: string
    technicianStaffId?: string
  },
): Promise<RosterRow[]> {
  const { data: clients, error: clientError } = await supabase
    .from("clients")
    .select("id, external_code, first_name, last_name")
    .eq("practice_id", practiceId)
    .eq("status", "active")
    .not("external_code", "is", null)
    .order("external_code", { ascending: true })

  if (clientError) throw clientError
  const clientList = (clients ?? []) as ClientRow[]
  if (clientList.length === 0) return []

  const clientIds = clientList.map((c) => c.id)

  const { data: assignments, error: assignError } = await supabase
    .from("client_assignments")
    .select("client_id, staff_id, assignment_role, location")
    .in("client_id", clientIds)
    .eq("is_active", true)
    .in("assignment_role", ["primary_bcba", "clinical_supervisor", "primary_bt"])

  if (assignError) throw assignError
  const assignmentList = (assignments ?? []) as AssignmentRow[]

  const staffIds = [...new Set(assignmentList.map((a) => a.staff_id))]
  let names = new Map<string, string>()
  let codes = new Map<string, string>()
  if (staffIds.length > 0) {
    const { data: staffRows, error: staffError } = await supabase
      .from("staff")
      .select("id, full_name, external_code")
      .in("id", staffIds)

    if (staffError) throw staffError
    const maps = staffMaps((staffRows ?? []) as StaffNameRow[])
    names = maps.names
    codes = maps.codes
  }

  const byClient = new Map<string, AssignmentRow[]>()
  for (const row of assignmentList) {
    const list = byClient.get(row.client_id) ?? []
    list.push(row)
    byClient.set(row.client_id, list)
  }

  let rows: RosterRow[] = clientList.map((client) => {
    const rowsForClient = byClient.get(client.id) ?? []
    const bcba = rowsForClient.find((r) => r.assignment_role === "primary_bcba")
    const supervisor = rowsForClient.find((r) => r.assignment_role === "clinical_supervisor")
    const bt = rowsForClient.find((r) => r.assignment_role === "primary_bt")
    const location =
      bt?.location ??
      supervisor?.location ??
      bcba?.location ??
      rowsForClient.find((r) => r.location)?.location ??
      null

    return {
      clientId: client.id,
      clientCode: client.external_code,
      clientDisplayName: clientDisplayName(client),
      bcbaId: bcba?.staff_id ?? null,
      bcbaName: bcba ? (names.get(bcba.staff_id) ?? null) : null,
      supervisorId: supervisor?.staff_id ?? null,
      supervisorName: supervisor ? (names.get(supervisor.staff_id) ?? null) : null,
      btId: bt?.staff_id ?? null,
      btName: bt ? (names.get(bt.staff_id) ?? null) : null,
      bcbaCode: bcba ? (codes.get(bcba.staff_id) ?? null) : null,
      supervisorCode: supervisor ? (codes.get(supervisor.staff_id) ?? null) : null,
      btCode: bt ? (codes.get(bt.staff_id) ?? null) : null,
      btUnassigned: !bt,
      location,
    }
  })

  if (options?.bcbaStaffId) {
    rows = rows.filter((r) => r.bcbaId === options.bcbaStaffId)
  }
  if (options?.supervisorStaffId) {
    rows = rows.filter((r) => r.supervisorId === options.supervisorStaffId)
  }
  if (options?.technicianStaffId) {
    rows = rows.filter((r) => r.btId === options.technicianStaffId)
  }

  return rows
}

export async function getBcbaSummaries(practiceId: string): Promise<BcbaSummary[]> {
  const { data: bcbas, error: bcbaError } = await supabase
    .from("staff")
    .select("id, full_name")
    .eq("practice_id", practiceId)
    .eq("role", "bcba")
    .not("external_code", "is", null)
    .order("full_name", { ascending: true })

  if (bcbaError) throw bcbaError
  const bcbaList = (bcbas ?? []) as StaffNameRow[]
  if (bcbaList.length === 0) return []

  const allRows = await getRosterRows(practiceId)

  return bcbaList.map((bcba) => {
    const caseload = allRows.filter((r) => r.bcbaId === bcba.id)
    const btIds = new Set(
      caseload.filter((r) => r.btId).map((r) => r.btId as string),
    )
    const unassignedBtCount = caseload.filter((r) => r.btUnassigned).length

    return {
      staffId: bcba.id,
      fullName: bcba.full_name,
      clientCount: caseload.length,
      btCount: btIds.size,
      unassignedBtCount,
    }
  })
}

export interface ClientCaseloadLabel {
  clientId: string
  clientCode: string | null
  displayName: string
}

export interface CaseloadStaffLink {
  staffId: string
  fullName: string
  externalCode: string
}

export interface BcbaCaseloadOverview {
  bcbaStaffId: string
  clients: { clientId: string; clientCode: string }[]
  supervisors: CaseloadStaffLink[]
  technicians: CaseloadStaffLink[]
}

export async function getBcbaCaseloadOverview(
  practiceId: string,
  bcbaStaffId: string,
): Promise<BcbaCaseloadOverview> {
  const rows = await getRosterRows(practiceId, { bcbaStaffId })

  const supervisorMap = new Map<string, CaseloadStaffLink>()
  const technicianMap = new Map<string, CaseloadStaffLink>()

  for (const row of rows) {
    if (row.supervisorId && row.supervisorName && row.supervisorCode) {
      supervisorMap.set(row.supervisorId, {
        staffId: row.supervisorId,
        fullName: row.supervisorName,
        externalCode: row.supervisorCode,
      })
    }
    if (row.btId && row.btName && row.btCode) {
      technicianMap.set(row.btId, {
        staffId: row.btId,
        fullName: row.btName,
        externalCode: row.btCode,
      })
    }
  }

  const byName = (a: CaseloadStaffLink, b: CaseloadStaffLink) =>
    a.fullName.localeCompare(b.fullName, undefined, { sensitivity: "base" })

  return {
    bcbaStaffId,
    clients: rows.map((r) => ({ clientId: r.clientId, clientCode: r.clientCode })),
    supervisors: [...supervisorMap.values()].sort(byName),
    technicians: [...technicianMap.values()].sort(byName),
  }
}

export async function getCaseloadStaffForBcba(
  practiceId: string,
  bcbaStaffId: string,
  role: "supervisor" | "technician",
): Promise<CaseloadStaffLink[]> {
  const overview = await getBcbaCaseloadOverview(practiceId, bcbaStaffId)
  return role === "supervisor" ? overview.supervisors : overview.technicians
}

export async function getClientCaseloadLabels(
  clientIds: string[],
): Promise<ClientCaseloadLabel[]> {
  if (clientIds.length === 0) return []

  const { data, error } = await supabase
    .from("clients")
    .select("id, external_code, first_name, last_name")
    .in("id", clientIds)
    .order("external_code", { ascending: true })

  if (error) throw error

  return ((data ?? []) as ClientRow[]).map((c) => ({
    clientId: c.id,
    clientCode: c.external_code,
    displayName: clientDisplayName(c),
  }))
}
