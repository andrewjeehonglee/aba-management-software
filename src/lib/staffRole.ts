export type RosterStaffRole = "bcba" | "supervisor" | "technician"

const ROLE_HEADER_LABEL: Record<RosterStaffRole, string> = {
  bcba: "BCBA",
  supervisor: "Clinical Supervisor",
  technician: "Behavior Technician",
}

const ROLE_TITLE: Record<RosterStaffRole, string> = {
  bcba: "Board Certified Behavior Analyst (BCBA)",
  supervisor: "Clinical Supervisor",
  technician: "Behavior Technician (RBT)",
}

/** Roster role from external_code prefix, falling back to DB role — never session-derived. */
export function resolveRosterStaffRole(
  externalCode: string | null | undefined,
  dbRole: string,
): RosterStaffRole {
  const code = (externalCode ?? "").toUpperCase()
  if (code.includes("-BCBA-")) return "bcba"
  if (code.includes("-SUP-")) return "supervisor"
  if (code.includes("-BT-")) return "technician"

  const normalized = dbRole.toLowerCase()
  if (normalized === "bcba" || normalized === "supervisor" || normalized === "technician") {
    return normalized
  }
  return "technician"
}

export function staffRoleHeaderLabel(role: RosterStaffRole): string {
  return ROLE_HEADER_LABEL[role]
}

export function staffRoleTitle(role: RosterStaffRole): string {
  return ROLE_TITLE[role]
}

export function isTechnicianRole(role: RosterStaffRole): boolean {
  return role === "technician"
}

export function isBcbaRole(role: RosterStaffRole): boolean {
  return role === "bcba"
}

export function isSupervisorRole(role: RosterStaffRole): boolean {
  return role === "supervisor"
}

export function isLeadershipRole(role: RosterStaffRole): boolean {
  return role === "bcba" || role === "supervisor"
}
