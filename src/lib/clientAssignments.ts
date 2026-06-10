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
