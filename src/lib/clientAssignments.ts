import { supabase } from "@/lib/supabase"

export type ClientAssignmentRole =
  | "primary_bcba"
  | "clinical_supervisor"
  | "primary_bt"
  | "secondary_bt"

export interface ClientAssignment {
  id: string
  practiceId: string
  clientId: string
  staffId: string
  assignmentRole: ClientAssignmentRole
  location: string | null
  isActive: boolean
}

interface ClientAssignmentRow {
  id: string
  practice_id: string
  client_id: string
  staff_id: string
  assignment_role: ClientAssignmentRole
  location: string | null
  is_active: boolean
}

const ASSIGNMENT_SELECT =
  "id, practice_id, client_id, staff_id, assignment_role, location, is_active"

function mapRow(row: ClientAssignmentRow): ClientAssignment {
  return {
    id: row.id,
    practiceId: row.practice_id,
    clientId: row.client_id,
    staffId: row.staff_id,
    assignmentRole: row.assignment_role,
    location: row.location,
    isActive: row.is_active,
  }
}

export async function getAssignmentsForClient(clientId: string): Promise<ClientAssignment[]> {
  const { data, error } = await supabase
    .from("client_assignments")
    .select(ASSIGNMENT_SELECT)
    .eq("client_id", clientId)
    .eq("is_active", true)

  if (error) throw error
  return (data as ClientAssignmentRow[]).map(mapRow)
}

export async function getAssignmentsForStaff(staffId: string): Promise<ClientAssignment[]> {
  const { data, error } = await supabase
    .from("client_assignments")
    .select(ASSIGNMENT_SELECT)
    .eq("staff_id", staffId)
    .eq("is_active", true)

  if (error) throw error
  return (data as ClientAssignmentRow[]).map(mapRow)
}

export async function getClientIdsForStaffByRoles(
  staffId: string,
  roles: ClientAssignmentRole[],
): Promise<string[]> {
  if (roles.length === 0) return []

  const { data, error } = await supabase
    .from("client_assignments")
    .select("client_id")
    .eq("staff_id", staffId)
    .eq("is_active", true)
    .in("assignment_role", roles)

  if (error) throw error
  const ids = (data ?? []).map((row) => (row as { client_id: string }).client_id)
  return [...new Set(ids)]
}

export async function getStaffIdsForClientsByRoles(
  clientIds: string[],
  roles: ClientAssignmentRole[],
): Promise<string[]> {
  if (clientIds.length === 0 || roles.length === 0) return []

  const { data, error } = await supabase
    .from("client_assignments")
    .select("staff_id")
    .in("client_id", clientIds)
    .eq("is_active", true)
    .in("assignment_role", roles)

  if (error) throw error
  const ids = (data ?? []).map((row) => (row as { staff_id: string }).staff_id)
  return [...new Set(ids)]
}

export interface CareTeamMember {
  staffId: string
  fullName: string
  externalCode: string
}

export interface RosterStaffLink {
  staffId: string
  fullName: string
  externalCode: string
}

export interface StaffClientTableRow {
  clientId: string
  clientCode: string
  technician: RosterStaffLink | null
  supervisor: RosterStaffLink | null
}

export interface StaffPeopleGroups {
  bcbas: RosterStaffLink[]
  supervisors: RosterStaffLink[]
  technicians: RosterStaffLink[]
}

export interface BtClientAssignment {
  clientId: string
  clientCode: string
}

export interface CareTeamDetails {
  bcba: CareTeamMember | null
  supervisor: CareTeamMember | null
  bt: CareTeamMember | null
  hasAssignments: boolean
}

type StaffCareRow = {
  id: string
  full_name: string
  external_code: string | null
  status: string | null
}

function mapRosterStaff(row: StaffCareRow): CareTeamMember | null {
  if (!row.external_code?.trim()) return null
  if ((row.status ?? "active").toLowerCase() === "inactive") return null
  return {
    staffId: row.id,
    fullName: row.full_name,
    externalCode: row.external_code,
  }
}

function mapRosterStaffLink(row: StaffCareRow): RosterStaffLink | null {
  const member = mapRosterStaff(row)
  return member
}

async function fetchStaffLinks(staffIds: string[]): Promise<Map<string, RosterStaffLink>> {
  if (staffIds.length === 0) return new Map()

  const { data, error } = await supabase
    .from("staff")
    .select("id, full_name, external_code, status")
    .in("id", staffIds)

  if (error) throw error

  const map = new Map<string, RosterStaffLink>()
  for (const row of (data ?? []) as StaffCareRow[]) {
    const link = mapRosterStaffLink(row)
    if (link) map.set(link.staffId, link)
  }
  return map
}

async function getClientCodesById(clientIds: string[]): Promise<Map<string, string>> {
  if (clientIds.length === 0) return new Map()

  const { data, error } = await supabase
    .from("clients")
    .select("id, external_code")
    .in("id", clientIds)

  if (error) throw error

  return new Map(
    ((data ?? []) as { id: string; external_code: string | null }[])
      .filter((c) => c.external_code)
      .map((c) => [c.id, c.external_code as string]),
  )
}

async function buildClientTableRows(clientIds: string[]): Promise<StaffClientTableRow[]> {
  if (clientIds.length === 0) return []

  const clientCodes = await getClientCodesById(clientIds)
  const { data, error } = await supabase
    .from("client_assignments")
    .select("client_id, staff_id, assignment_role")
    .in("client_id", clientIds)
    .eq("is_active", true)

  if (error) throw error

  const staffIds = [...new Set(((data ?? []) as { staff_id: string }[]).map((r) => r.staff_id))]
  const staffById = await fetchStaffLinks(staffIds)

  const rowsByClient = new Map<string, StaffClientTableRow>()
  for (const clientId of clientIds) {
    rowsByClient.set(clientId, {
      clientId,
      clientCode: clientCodes.get(clientId) ?? clientId,
      technician: null,
      supervisor: null,
    })
  }

  for (const row of (data ?? []) as {
    client_id: string
    staff_id: string
    assignment_role: ClientAssignmentRole
  }[]) {
    const entry = rowsByClient.get(row.client_id)
    const link = staffById.get(row.staff_id)
    if (!entry || !link) continue
    if (row.assignment_role === "primary_bt" || row.assignment_role === "secondary_bt") {
      entry.technician = link
    }
    if (row.assignment_role === "clinical_supervisor") {
      entry.supervisor = link
    }
  }

  return [...rowsByClient.values()].sort((a, b) => a.clientCode.localeCompare(b.clientCode))
}

/** Full caseload table for a BCBA (Client | Technician | Supervisor). */
export async function getStaffClientTableForBcba(bcbaStaffId: string): Promise<StaffClientTableRow[]> {
  const clientIds = await getClientIdsForStaffByRoles(bcbaStaffId, ["primary_bcba"])
  return buildClientTableRows(clientIds)
}

/** Full caseload table for a clinical supervisor. */
export async function getStaffClientTableForSupervisor(
  supervisorStaffId: string,
): Promise<StaffClientTableRow[]> {
  const clientIds = await getClientIdsForStaffByRoles(supervisorStaffId, ["clinical_supervisor"])
  return buildClientTableRows(clientIds)
}

/** BT primary assignments — client chips for technician pages. */
export async function getBtClientAssignments(staffId: string): Promise<BtClientAssignment[]> {
  const clientIds = await getClientIdsForStaffByRoles(staffId, ["primary_bt", "secondary_bt"])
  const codes = await getClientCodesById(clientIds)
  return clientIds
    .map((clientId) => ({
      clientId,
      clientCode: codes.get(clientId) ?? clientId,
    }))
    .sort((a, b) => a.clientCode.localeCompare(b.clientCode))
}

/** Colleagues on shared caseloads, grouped by roster role. */
export async function getStaffPeopleGroups(
  staffId: string,
  viewerRole: "bcba" | "supervisor",
): Promise<StaffPeopleGroups> {
  const assignmentRole: ClientAssignmentRole =
    viewerRole === "bcba" ? "primary_bcba" : "clinical_supervisor"
  const clientIds = await getClientIdsForStaffByRoles(staffId, [assignmentRole])
  if (clientIds.length === 0) {
    return { bcbas: [], supervisors: [], technicians: [] }
  }

  const { data, error } = await supabase
    .from("client_assignments")
    .select("staff_id, assignment_role")
    .in("client_id", clientIds)
    .eq("is_active", true)
    .neq("staff_id", staffId)

  if (error) throw error

  const roleBuckets: Record<"bcba" | "supervisor" | "technician", Set<string>> = {
    bcba: new Set(),
    supervisor: new Set(),
    technician: new Set(),
  }

  for (const row of (data ?? []) as { staff_id: string; assignment_role: ClientAssignmentRole }[]) {
    if (row.assignment_role === "primary_bcba") roleBuckets.bcba.add(row.staff_id)
    if (row.assignment_role === "clinical_supervisor") roleBuckets.supervisor.add(row.staff_id)
    if (row.assignment_role === "primary_bt" || row.assignment_role === "secondary_bt") {
      roleBuckets.technician.add(row.staff_id)
    }
  }

  const allIds = [
    ...roleBuckets.bcba,
    ...roleBuckets.supervisor,
    ...roleBuckets.technician,
  ]
  const staffById = await fetchStaffLinks(allIds)

  const pick = (ids: Set<string>): RosterStaffLink[] =>
    [...ids]
      .map((id) => staffById.get(id))
      .filter((link): link is RosterStaffLink => Boolean(link))
      .sort((a, b) => a.fullName.localeCompare(b.fullName))

  return {
    bcbas: pick(roleBuckets.bcba),
    supervisors: pick(roleBuckets.supervisor),
    technicians: pick(roleBuckets.technician),
  }
}

/** BT staff IDs on this leader's caseload (for supervision compliance table). */
export async function getCaseloadBtStaffIds(
  staffId: string,
  viewerRole: "bcba" | "supervisor",
): Promise<string[]> {
  const assignmentRole: ClientAssignmentRole =
    viewerRole === "bcba" ? "primary_bcba" : "clinical_supervisor"
  const clientIds = await getClientIdsForStaffByRoles(staffId, [assignmentRole])
  return getStaffIdsForClientsByRoles(clientIds, ["primary_bt", "secondary_bt"])
}

const ASSIGNMENT_ROLE_LABEL: Record<ClientAssignmentRole, string> = {
  primary_bcba: "BCBA",
  clinical_supervisor: "Supervisor",
  primary_bt: "BT",
  secondary_bt: "BT",
}

export interface StaffCareTeamLink {
  staffId: string
  fullName: string
  externalCode: string
  roleLabel: string
  sharedClientCount: number
}

/** Colleagues on shared client caseloads (excludes self). Roster staff only. */
export async function getStaffCareTeamLinks(
  staffId: string,
): Promise<StaffCareTeamLink[]> {
  const myAssignments = await getAssignmentsForStaff(staffId)
  if (myAssignments.length === 0) return []

  const clientIds = [...new Set(myAssignments.map((a) => a.clientId))]
  if (clientIds.length === 0) return []

  const { data, error } = await supabase
    .from("client_assignments")
    .select(
      "client_id, staff_id, assignment_role, staff(id, full_name, external_code, status, role)",
    )
    .in("client_id", clientIds)
    .eq("is_active", true)
    .neq("staff_id", staffId)

  if (error) throw error

  type Row = {
    client_id: string
    staff_id: string
    assignment_role: ClientAssignmentRole
    staff: StaffCareRow | StaffCareRow[] | null
  }

  const byStaffId = new Map<string, StaffCareTeamLink & { roles: Set<string> }>()

  for (const row of (data ?? []) as Row[]) {
    const staffRow = Array.isArray(row.staff) ? row.staff[0] : row.staff
    const member = staffRow ? mapRosterStaff(staffRow) : null
    if (!member) continue

    const roleLabel = ASSIGNMENT_ROLE_LABEL[row.assignment_role]
    const existing = byStaffId.get(member.staffId)
    if (existing) {
      existing.sharedClientCount += 1
      existing.roles.add(roleLabel)
    } else {
      byStaffId.set(member.staffId, {
        ...member,
        roleLabel,
        sharedClientCount: 1,
        roles: new Set([roleLabel]),
      })
    }
  }

  return [...byStaffId.values()]
    .map(({ roles, ...link }) => ({
      ...link,
      roleLabel: [...roles].sort().join(" · "),
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
}

/** Care team from active client_assignments + roster staff only. */
export async function getCareTeamDetailsForClient(
  clientId: string,
): Promise<CareTeamDetails> {
  const assignments = await getAssignmentsForClient(clientId)
  if (assignments.length === 0) {
    return { bcba: null, supervisor: null, bt: null, hasAssignments: false }
  }

  const staffIds = [...new Set(assignments.map((a) => a.staffId))]
  const { data, error } = await supabase
    .from("staff")
    .select("id, full_name, external_code, status")
    .in("id", staffIds)

  if (error) throw error

  const staffById = new Map(
    ((data ?? []) as StaffCareRow[]).map((s) => [s.id, s]),
  )

  const pick = (role: ClientAssignmentRole): CareTeamMember | null => {
    const assignment = assignments.find((a) => a.assignmentRole === role)
    if (!assignment) return null
    const staff = staffById.get(assignment.staffId)
    return staff ? mapRosterStaff(staff) : null
  }

  return {
    hasAssignments: true,
    bcba: pick("primary_bcba"),
    supervisor: pick("clinical_supervisor"),
    bt: pick("primary_bt"),
  }
}
