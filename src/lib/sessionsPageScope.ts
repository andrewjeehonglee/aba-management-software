import { getSuperviseeStaffIdsForBcba } from "@/lib/dashboardScope"
import { getBcbaSummaries, getRosterRows, type BcbaSummary } from "@/lib/rosterTable"
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

export interface SessionsClientGroup {
  bcbaId: string
  bcbaName: string
  bcbaCode: string | null
  clients: SessionsClientEntry[]
}

export interface SessionsStaffGroup {
  role: "bcba" | "supervisor" | "technician"
  roleLabel: string
  members: RosterStaffEntry[]
}

export interface SessionsPagePanelData {
  clientGroups: SessionsClientGroup[]
  staffGroups: SessionsStaffGroup[]
  hidePanel: boolean
  defaultPerson: SessionsPerson | null
}

const STAFF_ROLE_LABELS: Record<"bcba" | "supervisor" | "technician", string> = {
  bcba: "BCBA",
  supervisor: "Supervisor",
  technician: "Technician",
}

function normaliseRole(raw?: string): string {
  return (raw ?? "technician").toLowerCase()
}

function clientGroupsFromRows(
  rows: Awaited<ReturnType<typeof getRosterRows>>,
  bcbaSummaries: BcbaSummary[],
): SessionsClientGroup[] {
  const byBcba = new Map<string, SessionsClientGroup>()

  for (const summary of bcbaSummaries) {
    byBcba.set(summary.staffId, {
      bcbaId: summary.staffId,
      bcbaName: summary.fullName,
      bcbaCode: rows.find((r) => r.bcbaId === summary.staffId)?.bcbaCode ?? null,
      clients: [],
    })
  }

  for (const row of rows) {
    const bcbaId = row.bcbaId ?? "unassigned"
    let group = byBcba.get(bcbaId)
    if (!group) {
      group = {
        bcbaId,
        bcbaName: row.bcbaName ?? "Unassigned",
        bcbaCode: row.bcbaCode,
        clients: [],
      }
      byBcba.set(bcbaId, group)
    }
    group.clients.push({
      id: row.clientId,
      code: row.clientCode,
      displayName: row.clientDisplayName,
    })
  }

  return [...byBcba.values()]
    .filter((g) => g.clients.length > 0)
    .sort((a, b) => a.bcbaName.localeCompare(b.bcbaName))
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
      clientGroups: [],
      staffGroups: [],
      hidePanel: true,
      defaultPerson: person,
    }
  }

  if (role === "owner") {
    const [rows, bcbaSummaries, bcbaStaff, supervisorStaff, technicianStaff] = await Promise.all([
      getRosterRows(practiceId),
      getBcbaSummaries(practiceId),
      getRosterStaffByRole(practiceId, "bcba"),
      getRosterStaffByRole(practiceId, "supervisor"),
      getRosterStaffByRole(practiceId, "technician"),
    ])

    return {
      clientGroups: clientGroupsFromRows(rows, bcbaSummaries),
      staffGroups: groupStaffByRole([...bcbaStaff, ...supervisorStaff, ...technicianStaff]),
      hidePanel: false,
      defaultPerson: null,
    }
  }

  if (role === "bcba" && currentStaffId) {
    const [rows, bcbaSummaries, teamStaffIds] = await Promise.all([
      getRosterRows(practiceId, { bcbaStaffId: currentStaffId }),
      getBcbaSummaries(practiceId),
      getSuperviseeStaffIdsForBcba(currentStaffId),
    ])

    const teamMembers = await staffEntriesByIds(teamStaffIds)

    return {
      clientGroups: clientGroupsFromRows(rows, bcbaSummaries),
      staffGroups: groupStaffByRole(teamMembers),
      hidePanel: false,
      defaultPerson: null,
    }
  }

  if (role === "supervisor" && currentStaffId) {
    const rows = await getRosterRows(practiceId, { supervisorStaffId: currentStaffId })
    const btIds = [...new Set(rows.filter((r) => r.btId).map((r) => r.btId as string))]
    const teamMembers = await staffEntriesByIds(btIds)

    const bcbaIds = [...new Set(rows.filter((r) => r.bcbaId).map((r) => r.bcbaId as string))]
    const bcbaSummaries: BcbaSummary[] = bcbaIds.map((id) => {
      const match = rows.find((r) => r.bcbaId === id)
      const caseload = rows.filter((r) => r.bcbaId === id)
      return {
        staffId: id,
        fullName: match?.bcbaName ?? "Unknown",
        clientCount: caseload.length,
        btCount: caseload.filter((r) => r.btId).length,
        unassignedBtCount: caseload.filter((r) => r.btUnassigned).length,
      }
    })

    return {
      clientGroups: clientGroupsFromRows(rows, bcbaSummaries),
      staffGroups: groupStaffByRole(teamMembers),
      hidePanel: false,
      defaultPerson: null,
    }
  }

  const [rows, bcbaSummaries] = await Promise.all([
    getRosterRows(practiceId),
    getBcbaSummaries(practiceId),
  ])

  return {
    clientGroups: clientGroupsFromRows(rows, bcbaSummaries),
    staffGroups: [],
    hidePanel: false,
    defaultPerson: null,
  }
}

export function filterPanelBySearch(
  clientGroups: SessionsClientGroup[],
  staffGroups: SessionsStaffGroup[],
  query: string,
): { clientGroups: SessionsClientGroup[]; staffGroups: SessionsStaffGroup[] } {
  const q = query.trim().toLowerCase()
  if (!q) return { clientGroups, staffGroups }

  const filteredClients = clientGroups
    .map((group) => ({
      ...group,
      clients: group.clients.filter(
        (c) =>
          c.code.toLowerCase().includes(q) ||
          c.displayName.toLowerCase().includes(q) ||
          group.bcbaName.toLowerCase().includes(q),
      ),
    }))
    .filter((g) => g.clients.length > 0)

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

  return { clientGroups: filteredClients, staffGroups: filteredStaff }
}
