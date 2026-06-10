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
