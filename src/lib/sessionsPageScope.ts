import { getSuperviseeStaffIdsForBcba } from "@/lib/dashboardScope"
import { getRosterRows } from "@/lib/rosterTable"
import { getRosterStaffByRole, type RosterStaffEntry } from "@/lib/rosterScope"
import { supabase } from "@/lib/supabase"

export type SessionsPersonKind = "client" | "staff"

export interface SessionsPerson {
  kind: SessionsPersonKind
  id: string
  label: string
  code: string
}

export interface SessionsClientEntry {
  id: string
  code: string
  displayName: string
}

export interface SessionsStaffGroup {
  role: "bcba" | "supervisor" | "technician"
  roleLabel: string
  members: RosterStaffEntry[]
}

export interface SessionsPagePanelData {
  clients: SessionsClientEntry[]
  staffGroups: SessionsStaffGroup[]
  hidePanel: boolean
  defaultPerson: SessionsPerson | null
}

const STAFF_ROLE_LABELS: Record<"bcba" | "supervisor" | "technician", string> = {
  bcba: "BCBA",
  supervisor: "Clinical Supervisor",
  technician: "Technician",
}

function normaliseRole(raw?: string): string {
  return (raw ?? "technician").toLowerCase()
}

function clientsFromRows(rows: Awaited<ReturnType<typeof getRosterRows>>): SessionsClientEntry[] {
  return rows
    .map((row) => ({
      id: row.clientId,
      code: row.clientCode,
      displayName: row.clientDisplayName,
    }))
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { sensitivity: "base" }))
}

async function staffEntriesByIds(ids: string[]): Promise<RosterStaffEntry[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase
    .from("staff")
    .select("id, full_name, external_code, role")
    .in("id", ids)
    .eq("status", "active")
    .not("external_code", "is", null)
    .neq("external_code", "")
    .order("full_name", { ascending: true })

  if (error) throw error

  return ((data ?? []) as { id: string; full_name: string; external_code: string; role: string }[])
    .map((row) => ({
      id: row.id,
      fullName: row.full_name,
      externalCode: row.external_code,
      role: row.role,
    }))
}

function groupStaffByRole(members: RosterStaffEntry[]): SessionsStaffGroup[] {
  const roles: ("bcba" | "supervisor" | "technician")[] = ["bcba", "supervisor", "technician"]
  return roles
    .map((role) => ({
      role,
      roleLabel: STAFF_ROLE_LABELS[role],
      members: members.filter((m) => m.role === role),
    }))
    .filter((g) => g.members.length > 0)
}

async function staffPerson(staffId: string): Promise<SessionsPerson | null> {
  const { data, error } = await supabase
    .from("staff")
    .select("id, full_name, external_code")
    .eq("id", staffId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const row = data as { id: string; full_name: string; external_code: string | null }
  if (!row.external_code?.trim()) return null

  return {
    kind: "staff",
    id: row.id,
    label: row.full_name,
    code: row.external_code,
  }
}

export async function loadSessionsPagePanelData(
  practiceId: string,
  userRole: string,
  currentStaffId: string | null,
): Promise<SessionsPagePanelData> {
  const role = normaliseRole(userRole)

  if (role === "technician" && currentStaffId) {
    const person = await staffPerson(currentStaffId)
    return {
      clients: [],
      staffGroups: [],
      hidePanel: true,
      defaultPerson: person,
    }
  }

  if (role === "owner") {
    const [rows, bcbaStaff, supervisorStaff, technicianStaff] = await Promise.all([
      getRosterRows(practiceId),
      getRosterStaffByRole(practiceId, "bcba"),
      getRosterStaffByRole(practiceId, "supervisor"),
      getRosterStaffByRole(practiceId, "technician"),
    ])

    return {
      clients: clientsFromRows(rows),
      staffGroups: groupStaffByRole([...bcbaStaff, ...supervisorStaff, ...technicianStaff]),
      hidePanel: false,
      defaultPerson: null,
    }
  }

  if (role === "bcba" && currentStaffId) {
    const [rows, teamStaffIds] = await Promise.all([
      getRosterRows(practiceId, { bcbaStaffId: currentStaffId }),
      getSuperviseeStaffIdsForBcba(currentStaffId),
    ])

    const teamMembers = await staffEntriesByIds(teamStaffIds)

    return {
      clients: clientsFromRows(rows),
      staffGroups: groupStaffByRole(teamMembers),
      hidePanel: false,
      defaultPerson: null,
    }
  }

  if (role === "supervisor" && currentStaffId) {
    const rows = await getRosterRows(practiceId, { supervisorStaffId: currentStaffId })
    const btIds = [...new Set(rows.filter((r) => r.btId).map((r) => r.btId as string))]
    const teamMembers = await staffEntriesByIds(btIds)

    return {
      clients: clientsFromRows(rows),
      staffGroups: groupStaffByRole(teamMembers),
      hidePanel: false,
      defaultPerson: null,
    }
  }

  const rows = await getRosterRows(practiceId)

  return {
    clients: clientsFromRows(rows),
    staffGroups: [],
    hidePanel: false,
    defaultPerson: null,
  }
}

export function filterPanelBySearch(
  clients: SessionsClientEntry[],
  staffGroups: SessionsStaffGroup[],
  query: string,
): { clients: SessionsClientEntry[]; staffGroups: SessionsStaffGroup[] } {
  const q = query.trim().toLowerCase()
  if (!q) return { clients, staffGroups }

  const filteredClients = clients.filter(
    (c) =>
      c.code.toLowerCase().includes(q) ||
      c.displayName.toLowerCase().includes(q),
  )

  const filteredStaff = staffGroups
    .map((group) => ({
      ...group,
      members: group.members.filter(
        (m) =>
          m.fullName.toLowerCase().includes(q) ||
          m.externalCode.toLowerCase().includes(q),
      ),
    }))
    .filter((g) => g.members.length > 0)

  return { clients: filteredClients, staffGroups: filteredStaff }
}
