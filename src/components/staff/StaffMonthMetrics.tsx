import { useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getNotesStatus } from "@/lib/notesStatus"
import { getStaffHoursByMonth } from "@/lib/staffHours"
import { cn } from "@/lib/utils"

interface StaffMonthMetricsProps {
  staffId: string
  className?: string
}

function MetricCell({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: number
  valueClassName?: string
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-card px-3 py-3 shadow-sm">
      <p
        className={cn(
          "text-3xl font-bold tabular-nums leading-none tracking-tight",
          valueClassName,
        )}
      >
        {value}
      </p>
      <p className="mt-1.5 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

export function StaffMonthMetrics({ staffId, className }: StaffMonthMetricsProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [monthLabel, setMonthLabel] = useState("")
  const [payPeriodLabel, setPayPeriodLabel] = useState("")
  const [directHours, setDirectHours] = useState(0)
  const [indirectHours, setIndirectHours] = useState(0)
  const [missingCount, setMissingCount] = useState(0)
  const [overdueCount, setOverdueCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([
      getStaffHoursByMonth(undefined, { staffIds: [staffId] }),
      getNotesStatus(undefined, { staffIds: [staffId] }),
    ])
      .then(([hours, notes]) => {
        if (cancelled) return
        const row = hours.byStaff[0]
        const notesRow = notes.byStaff.find((s) => s.staffId === staffId)
        setMonthLabel(hours.monthLabel)
        setPayPeriodLabel(notes.payPeriodLabel)
        setDirectHours(Math.round(row?.directHours ?? 0))
        setIndirectHours(Math.round(row?.indirectHours ?? 0))
        setMissingCount(notesRow?.missingCount ?? 0)
        setOverdueCount(notesRow?.overdueCount ?? 0)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? "Failed to load metrics")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [staffId])

  return (
    <Card size="sm" className={cn("flex h-full flex-col", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">This month</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {loading && (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        )}
        {error && (
          <p className="py-8 text-center text-sm text-destructive">{error}</p>
        )}
        {!loading && !error && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MetricCell label="Direct hrs" value={directHours} />
            <MetricCell label="Indirect hrs" value={indirectHours} />
            <MetricCell
              label="Notes missing"
              value={missingCount}
              valueClassName={missingCount > 0 ? "text-amber-600" : undefined}
            />
            <MetricCell
              label="Notes overdue"
              value={overdueCount}
              valueClassName={overdueCount > 0 ? "text-red-600" : undefined}
            />
          </div>
        )}
      </CardContent>
      {!loading && !error && (
        <CardFooter className="border-t bg-slate-50/80 px-4 py-2 text-[11px] text-muted-foreground">
          Hours: {monthLabel}
          {payPeriodLabel ? ` · Notes pay period: ${payPeriodLabel}` : null}
        </CardFooter>
      )}
    </Card>
  )
}
