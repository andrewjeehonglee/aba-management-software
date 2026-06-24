import { getClientIdsForStaffByRoles } from "@/lib/clientAssignments"
import { supabase } from "@/lib/supabase"
import type { RosterClientEntry } from "@/lib/rosterScope"

export interface AuditClientEntry extends RosterClientEntry {
  authStartDate: string | null
  authEndDate: string | null
}

function mapClientRow(row: {
  id: string
  external_code: string
  first_name: string | null
  last_name: string | null
  auth_start_date: string | null
  auth_end_date: string | null
}): AuditClientEntry {
  const parts = [row.first_name, row.last_name].filter(Boolean)
  return {
    id: row.id,
    externalCode: row.external_code,
    displayName: parts.length > 0 ? parts.join(" ") : row.external_code,
    authStartDate: row.auth_start_date,
    authEndDate: row.auth_end_date,
  }
}

async function fetchClientsByIds(clientIds: string[]): Promise<AuditClientEntry[]> {
  if (clientIds.length === 0) return []

  const { data, error } = await supabase
    .from("clients")
    .select("id, external_code, first_name, last_name, auth_start_date, auth_end_date")
    .in("id", clientIds)
    .eq("status", "active")
    .not("external_code", "is", null)
    .neq("external_code", "")
    .order("external_code", { ascending: true })

  if (error) throw error
  return ((data ?? []) as Parameters<typeof mapClientRow>[0][]).map(mapClientRow)
}

async function filterActiveClientIds(clientIds: string[]): Promise<string[]> {
  if (clientIds.length === 0) return []

  const { data, error } = await supabase
    .from("clients")
    .select("id")
    .in("id", clientIds)
    .eq("status", "active")
    .not("external_code", "is", null)
    .neq("external_code", "")

  if (error) throw error
  return ((data ?? []) as { id: string }[]).map((row) => row.id)
}

/** Role-scoped client list for audit pulls — owner sees all, BCBA/supervisor see caseload only. */
export async function getAuditScopedClients(
  practiceId: string,
  userRole: string,
  staffId: string | null,
): Promise<AuditClientEntry[]> {
  const role = userRole.toLowerCase()

  if (role === "owner") {
    const { data, error } = await supabase
      .from("clients")
      .select("id, external_code, first_name, last_name, auth_start_date, auth_end_date")
      .eq("practice_id", practiceId)
      .eq("status", "active")
      .not("external_code", "is", null)
      .neq("external_code", "")
      .order("external_code", { ascending: true })

    if (error) throw error
    return ((data ?? []) as Parameters<typeof mapClientRow>[0][]).map(mapClientRow)
  }

  if (!staffId) return []

  const assignmentRoles =
    role === "bcba"
      ? (["primary_bcba"] as const)
      : role === "supervisor"
        ? (["clinical_supervisor"] as const)
        : null

  if (!assignmentRoles) return []

  const rawIds = await getClientIdsForStaffByRoles(staffId, [...assignmentRoles])
  const activeIds = await filterActiveClientIds(rawIds)
  return fetchClientsByIds(activeIds)
}

export function auditClientLabel(client: RosterClientEntry): string {
  if (client.displayName.toLowerCase() !== client.externalCode.toLowerCase()) {
    return `${client.displayName} (${client.externalCode})`
  }
  return client.displayName
}

export function clientMatchesSearch(client: RosterClientEntry, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    client.displayName.toLowerCase().includes(q) ||
    client.externalCode.toLowerCase().includes(q)
  )
}
