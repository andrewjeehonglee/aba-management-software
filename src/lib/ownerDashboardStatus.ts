import { getAuthUtilizationByMonth } from "@/lib/authUtilization"
import { getNotesStatus } from "@/lib/notesStatus"
import { getStaffHoursByMonth } from "@/lib/staffHours"

export interface OwnerAttentionItem {
  id: "notes" | "hours" | "auth"
  scrollTargetId: string
}

export interface OwnerAttentionSummary {
  attentionCount: number
  items: OwnerAttentionItem[]
  loading: boolean
}

export async function getOwnerAttentionSummary(options?: {
  staffIds?: string[]
  clientIds?: string[]
}): Promise<Omit<OwnerAttentionSummary, "loading">> {
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
    items.push({ id: "notes", scrollTargetId: "notes-overdue" })
  }

  if (hours.byStaff.some((row) => row.flagged)) {
    items.push({ id: "hours", scrollTargetId: "hours-by-staff" })
  }

  if (auth.byClient.some((row) => row.flagged)) {
    items.push({ id: "auth", scrollTargetId: "auth-utilization" })
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
