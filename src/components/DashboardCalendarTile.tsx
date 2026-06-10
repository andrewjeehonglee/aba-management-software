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
import { loadDashboardCalendarSessions } from "@/lib/dashboardCalendar"
import { cn } from "@/lib/utils"
import type { Session } from "@/types/session"

type CalendarViewRole = "Technician" | "Supervisor" | "BCBA"

interface DashboardCalendarTileProps {
  viewRole: CalendarViewRole
  isOwnerPreview: boolean
  currentStaffId: string | null
  staffDisplayName?: string
  practiceId?: string
  className?: string
}

export function DashboardCalendarTile({
  viewRole,
  isOwnerPreview,
  currentStaffId,
  staffDisplayName,
  practiceId,
  className,
}: DashboardCalendarTileProps) {
  const [includeSupervisees, setIncludeSupervisees] = useState(false)
  const [monthDate, setMonthDate] = useState(() => new Date())
  const [monthLabel, setMonthLabel] = useState<string>("")
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolvedStaff, setResolvedStaff] = useState(false)

  const showSuperviseeToggle = viewRole === "BCBA" || viewRole === "Supervisor"

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
    })
      .then((result) => {
        setMonthLabel(result.monthLabel)
        setSessions(result.sessions)
        setResolvedStaff(
          isOwnerPreview || currentStaffId !== null,
        )
      })
      .catch((err) => setError(err.message ?? "Failed to load schedule"))
      .finally(() => setLoading(false))
  }, [currentStaffId, viewRole, isOwnerPreview, includeSupervisees, monthDate, practiceId])

  const needsStaffLink = !loading && !error && !isOwnerPreview && !currentStaffId

  return (
    <Card size="sm" className={cn("w-full flex flex-col", className)}>
      <CardHeader>
        <div className="space-y-0.5">
          <CardTitle>{staffDisplayName || "My Schedule"}</CardTitle>
          {monthLabel && (
            <CardDescription className="text-sm">
              This month: {monthLabel}
            </CardDescription>
          )}
        </div>
        {showSuperviseeToggle && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setIncludeSupervisees(false)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                !includeSupervisees
                  ? "border-[#0D7377] bg-[#0D7377] text-white"
                  : "border-[#D0DCDC] text-[#4A5C5C] hover:border-[#14A0A5] hover:text-[#0D7377]",
              )}
            >
              My schedule
            </button>
            <button
              type="button"
              onClick={() => setIncludeSupervisees(true)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                includeSupervisees
                  ? "border-[#0D7377] bg-[#0D7377] text-white"
                  : "border-[#D0DCDC] text-[#4A5C5C] hover:border-[#14A0A5] hover:text-[#0D7377]",
              )}
            >
              Include supervisees
            </button>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        {loading && (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
        )}
        {error && (
          <p className="py-10 text-center text-sm text-destructive">{error}</p>
        )}
        {needsStaffLink && (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border py-10 text-center">
            <CalendarDays className="w-8 h-8 text-[#14A0A5]" />
            <p className="text-sm text-muted-foreground max-w-xs">
              Link your staff profile to see your schedule.
            </p>
          </div>
        )}
        {!loading && !error && !needsStaffLink && resolvedStaff && sessions.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border py-10 text-center">
            <CalendarDays className="w-8 h-8 text-[#14A0A5]" />
            <p className="text-sm text-muted-foreground">No sessions scheduled this month.</p>
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
            inlineDayContent
            onMonthChange={setMonthDate}
          />
        )}
      </CardContent>
    </Card>
  )
}
