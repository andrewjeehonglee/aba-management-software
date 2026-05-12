import type { Staff } from "@/types/staff"

export const DIRECT_HOURS_THRESHOLD = 0.5

export function isStaffFlagged(staff: Staff): boolean {
  if (staff.totalHours === 0) return false
  return staff.directHours / staff.totalHours < DIRECT_HOURS_THRESHOLD
}
