import { useEffect, useState } from "react"
import { CalendarDays } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SessionCalendar } from "@/components/SessionCalendar"
import {
  CalendarScopeToggle,
  type CalendarSessionScope,
} from "@/components/dashboard/CalendarScopeToggle"
import { loadDashboardCalendarSessions } from "@/lib/dashboardCalendar"
import { cn } from "@/lib/utils"
import type { Session } from "@/types/session"

type CalendarViewRole = "Technician" | "Supervisor" | "BCBA"

interface DashboardCalendarTileProps {
  viewRole: CalendarViewRole
  isOwnerPreview: boolean
  currentStaffId: string | null
  previewStaffId?: string | null
  staffDisplayName?: string
  practiceId?: string
  className?: string
  /** v3 = owner warm-premium chrome; default = legacy card */
  variant?: "default" | "v3"
  scopeLabels?: { self: string; team: string }
}

export function DashboardCalendarTile({
  viewRole,
  isOwnerPreview,
  currentStaffId,
  previewStaffId,
  staffDisplayName,
  practiceId,
  className,
  variant = "default",
  scopeLabels,
}: DashboardCalendarTileProps) {
  const isV3 = variant === "v3"
  const showScopeToggle = viewRole === "BCBA" || viewRole === "Supervisor"
  const defaultScope: CalendarSessionScope = isV3 ? "self" : "team"

  const [scope, setScope] = useState<CalendarSessionScope>(defaultScope)
  const includeSupervisees = scope === "team"
  const [monthDate, setMonthDate] = useState(() => new Date())
  const [monthLabel, setMonthLabel] = useState<string>("")
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolvedStaff, setResolvedStaff] = useState(false)

  useEffect(() => {
    setScope(isV3 ? "self" : showScopeToggle ? "team" : "self")
  }, [viewRole, isV3, showScopeToggle])

  useEffect(() => {
    setLoading(true)
    setError(null)

    loadDashboardCalendarSessions({
      staffId: currentStaffId,
      viewRole,
      isOwnerPreview,
      includeSupervisees,
      monthDate,
      practiceId,
      previewStaffId,
    })
      .then((result) => {
        setMonthLabel(result.monthLabel)
        setSessions(result.sessions)
        setResolvedStaff(isOwnerPreview || currentStaffId !== null)
      })
      .catch((err) => setError(err.message ?? "Failed to load schedule"))
      .finally(() => setLoading(false))
  }, [
    currentStaffId,
    previewStaffId,
    viewRole,
    isOwnerPreview,
    includeSupervisees,
    monthDate,
    practiceId,
  ])

  const needsStaffLink = !loading && !error && !isOwnerPreview && !currentStaffId

  const calendarBody = (
    <>
      {loading && (
        <p className={cn("text-center text-sm text-muted", isV3 ? "py-8" : "py-10")}>
          Loading…
        </p>
      )}
      {error && (
        <p className={cn("text-center text-sm text-destructive", isV3 ? "py-8" : "py-10")}>
          {error}
        </p>
      )}
      {needsStaffLink && (
        <div
          className={cn(
            "flex flex-col items-center gap-2 rounded-md border border-dashed border-line text-center",
            isV3 ? "py-8" : "py-10",
          )}
        >
          <CalendarDays className="size-8 text-brand" />
          <p className="max-w-xs text-sm text-muted">
            Link your staff profile to see your schedule.
          </p>
        </div>
      )}
      {!loading && !error && !needsStaffLink && resolvedStaff && sessions.length === 0 && !isV3 && (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-line py-10 text-center">
          <CalendarDays className="size-8 text-brand" />
          <p className="text-sm text-muted">No sessions scheduled this month.</p>
        </div>
      )}
      {!loading && !error && !needsStaffLink && (resolvedStaff || isOwnerPreview) && (
        <SessionCalendar
          sessions={sessions}
          defaultView="month"
          displayMode="client"
          showStaffLabel={includeSupervisees}
          embedded
          monthOnly
          inlineDayContent={!isV3}
          summaryMonthCells={isV3}
          onMonthChange={setMonthDate}
        />
      )}
    </>
  )

  if (isV3) {
    return (
      <section
        className={cn(
          "rounded-[var(--radius)] bg-surface px-4 py-4 shadow-card sm:px-5 sm:py-5",
          className,
        )}
        aria-label="Monthly calendar"
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.10em] text-muted">
            Monthly calendar
          </h2>
          {showScopeToggle && (
            <CalendarScopeToggle
              scope={scope}
              onScopeChange={setScope}
              scopeLabels={scopeLabels}
            />
          )}
        </div>
        {calendarBody}
      </section>
    )
  }

  return (
    <Card size="sm" className={cn("flex w-full flex-col", className)}>
      <CardHeader>
        <div className="space-y-0.5">
          <CardTitle>{staffDisplayName || "My Schedule"}</CardTitle>
          {monthLabel && (
            <CardDescription className="text-sm">This month: {monthLabel}</CardDescription>
          )}
        </div>
        {showScopeToggle && (
          <div className="mt-2">
            <CalendarScopeToggle
              scope={scope}
              onScopeChange={setScope}
              scopeLabels={scopeLabels}
              aria-label="Schedule scope"
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1">{calendarBody}</CardContent>
    </Card>
  )
}
