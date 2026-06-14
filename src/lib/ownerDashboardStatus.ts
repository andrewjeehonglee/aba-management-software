import { getAuthUtilizationByMonth } from "@/lib/authUtilization"
import { getNotesStatus } from "@/lib/notesStatus"
import { getStaffHoursByMonth } from "@/lib/staffHours"

export interface OwnerAttentionItem {
  id: "notes" | "hours" | "auth"
  scrollTargetId: string
  label: string
  detail: string
}

export interface OwnerAttentionSummary {
  attentionCount: number
  items: OwnerAttentionItem[]
  /** True while fetching; does not clear visible status once resolved. */
  loading: boolean
  /** True after the first successful fetch — prevents greeting/status flicker. */
  resolved: boolean
}

export async function getOwnerAttentionSummary(options?: {
  staffIds?: string[]
  clientIds?: string[]
}): Promise<Omit<OwnerAttentionSummary, "loading" | "resolved">> {
  const scope = {
    staffIds: options?.staffIds?.length ? options.staffIds : undefined,
    clientIds: options?.clientIds?.length ? options.clientIds : undefined,
  }

  const [notes, hours, auth] = await Promise.all([
    getNotesStatus(undefined, scope.staffIds || scope.clientIds ? scope : undefined),
    getStaffHoursByMonth(undefined, {
      ...scope,
      includeZeroHourStaff: true,
    }),
    getAuthUtilizationByMonth(undefined, scope.clientIds ? { clientIds: scope.clientIds } : undefined),
  ])

  const items: OwnerAttentionItem[] = []

  if (notes.totalOverdue > 0) {
    items.push({
      id: "notes",
      scrollTargetId: "notes-overdue",
      label: "Session notes",
      detail: `${notes.totalOverdue} overdue`,
    })
  }

  const flaggedStaff = hours.byStaff.filter((row) => row.flagged)
  if (flaggedStaff.length > 0) {
    items.push({
      id: "hours",
      scrollTargetId: "hours-by-staff",
      label: "Hours by staff",
      detail: `${flaggedStaff.length} below direct mix`,
    })
  }

  const flaggedClients = auth.byClient.filter((row) => row.flagged)
  if (flaggedClients.length > 0) {
    items.push({
      id: "auth",
      scrollTargetId: "auth-utilization",
      label: "Authorization utilization",
      detail: `${flaggedClients.length} at or above 80%`,
    })
  }

  return {
    attentionCount: items.length,
    items,
  }
}

export function timeGreeting(date: Date = new Date()): string {
  const hour = date.getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export function firstName(fullName: string | null | undefined): string {
  if (!fullName?.trim()) return "there"
  return fullName.trim().split(/\s+/)[0] ?? "there"
}
