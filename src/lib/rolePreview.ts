export type DisplayRole = "Owner" | "BCBA" | "Supervisor" | "Technician"

const STORAGE_KEY = "pulse_view_role"

export function setRolePreview(role: DisplayRole): void {
  sessionStorage.setItem(STORAGE_KEY, role)
}

export function getRolePreview(): DisplayRole | null {
  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (raw === "Owner" || raw === "BCBA" || raw === "Supervisor" || raw === "Technician") {
    return raw
  }
  return null
}

/** Owners preview via dashboard tabs; everyone else uses their DB role. */
export function effectiveRole(dbRole: string | undefined): string {
  const normalized = (dbRole ?? "technician").toLowerCase()
  if (normalized === "owner") {
    const preview = getRolePreview()
    if (preview) return preview.toLowerCase()
  }
  return normalized
}

export function canViewClinicalNotes(role: string): boolean {
  return role === "bcba" || role === "owner" || role === "supervisor"
}

export function canManageClinicalConfig(role: string): boolean {
  return role === "bcba" || role === "owner"
}
