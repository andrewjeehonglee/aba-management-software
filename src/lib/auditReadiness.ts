import type { AuditNoteBundleItem } from "@/lib/auditPull"
import { isCompleteSessionNote } from "@/lib/notesStatus"
import { getCurrentPayPeriod } from "@/lib/payPeriod"

export type SessionNoteBucket = "missing" | "overdue"

export interface AuditReadinessStats {
  sessionsInRange: number
  billableCount: number
  completeCount: number
  missingCount: number
  overdueCount: number
  unsignedCount: number
  gapCount: number
  auditReady: boolean
}

function isBillableStatus(status: string): boolean {
  return status === "completed" || status === "shortened"
}

function classifyNoteBucket(
  sessionScheduledAt: string,
  staffId: string,
  staffSessions: { staff_id: string; scheduled_at: string; status: string }[],
  now: Date,
  payPeriodEnd: Date,
): SessionNoteBucket {
  const sessionTime = new Date(sessionScheduledAt).getTime()

  const nextSession = staffSessions
    .filter((s) => s.staff_id === staffId && s.status !== "cancelled")
    .filter((s) => new Date(s.scheduled_at).getTime() > sessionTime)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0]

  if (nextSession) {
    return new Date(nextSession.scheduled_at) <= now ? "overdue" : "missing"
  }

  return now > payPeriodEnd ? "overdue" : "missing"
}

export function buildNoteBucketMap(
  items: AuditNoteBundleItem[],
  now: Date = new Date(),
): Map<string, SessionNoteBucket> {
  const payPeriod = getCurrentPayPeriod(now)
  const staffSessions = items.map((item) => ({
    staff_id: item.staffId,
    scheduled_at: item.sessionAt,
    status: item.status,
  }))

  const bucketMap = new Map<string, SessionNoteBucket>()

  for (const item of items) {
    if (!isBillableStatus(item.status)) continue
    if (isCompleteSessionNote(item.note ?? undefined)) continue

    bucketMap.set(
      item.sessionId,
      classifyNoteBucket(item.sessionAt, item.staffId, staffSessions, now, payPeriod.end),
    )
  }

  return bucketMap
}

export function computeAuditReadiness(
  items: AuditNoteBundleItem[],
  bucketMap: Map<string, SessionNoteBucket>,
): AuditReadinessStats {
  const billable = items.filter((item) => isBillableStatus(item.status))
  let completeCount = 0
  let missingCount = 0
  let overdueCount = 0
  let unsignedCount = 0

  for (const item of billable) {
    if (isCompleteSessionNote(item.note ?? undefined)) {
      completeCount += 1
      continue
    }

    if (item.note) {
      unsignedCount += 1
    }

    const bucket = bucketMap.get(item.sessionId)
    if (bucket === "overdue") overdueCount += 1
    else missingCount += 1
  }

  const gapCount = billable.length - completeCount

  return {
    sessionsInRange: items.length,
    billableCount: billable.length,
    completeCount,
    missingCount,
    overdueCount,
    unsignedCount,
    gapCount,
    auditReady: billable.length > 0 && gapCount === 0,
  }
}

export type SessionSortPriority = 0 | 1 | 2 | 3 | 4

export function sessionGapPriority(
  item: AuditNoteBundleItem,
  bucketMap: Map<string, SessionNoteBucket>,
): SessionSortPriority {
  if (item.status === "cancelled" || item.status === "no-show") return 4
  if (!isBillableStatus(item.status)) return 3

  if (isCompleteSessionNote(item.note ?? undefined)) return 3

  const bucket = bucketMap.get(item.sessionId)
  if (bucket === "overdue") return 0
  if (item.note) return 1
  return 2
}

export function sortAuditSessions(
  items: AuditNoteBundleItem[],
  bucketMap: Map<string, SessionNoteBucket>,
): AuditNoteBundleItem[] {
  return [...items].sort((a, b) => {
    const priorityDiff = sessionGapPriority(a, bucketMap) - sessionGapPriority(b, bucketMap)
    if (priorityDiff !== 0) return priorityDiff
    return b.sessionAt.localeCompare(a.sessionAt)
  })
}
