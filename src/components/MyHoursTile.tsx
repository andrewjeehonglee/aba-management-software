import { useEffect, useState } from "react"
import { TriangleAlert } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getStaffHoursByMonth, type StaffHoursRow } from "@/lib/staffHours"
import { cn } from "@/lib/utils"

const HOURS_COLORS = {
  direct: "#10b981",
  indirect: "#94a3b8",
} as const

function formatHoursBreakdown(row: StaffHoursRow): string {
  const d = Math.round(row.directHours)
  const i = Math.round(row.indirectHours)
  const t = Math.round(row.totalHours)
  return `${d} direct · ${i} indirect · ${t} total`
}

function HoursMixBar({ row }: { row: StaffHoursRow }) {
  const total = row.totalHours
  if (total <= 0) return null

  const segments = [
    { key: "direct", hours: row.directHours, color: HOURS_COLORS.direct },
    { key: "indirect", hours: row.indirectHours, color: HOURS_COLORS.indirect },
  ].filter((s) => s.hours > 0)

  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
      {segments.map((seg) => (
        <div
          key={seg.key}
          className="h-full min-w-[2px]"
          style={{
            width: `${(seg.hours / total) * 100}%`,
            backgroundColor: seg.color,
          }}
        />
      ))}
    </div>
  )
}

export function MyHoursTile({
  staffId,
  refreshKey,
  className,
}: {
  staffId: string
  refreshKey?: number
  className?: string
}) {
  const [row, setRow] = useState<StaffHoursRow | null>(null)
  const [monthLabel, setMonthLabel] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getStaffHoursByMonth(undefined, { staffIds: [staffId] })
      .then((summary) => {
        setMonthLabel(summary.monthLabel)
        setRow(summary.byStaff.find((r) => r.staffId === staffId) ?? null)
      })
      .catch((err) => setError(err.message ?? "Failed to load hours"))
      .finally(() => setLoading(false))
  }, [staffId, refreshKey])

  return (
    <Card size="sm" className={cn("w-full flex flex-col", className)}>
      <CardHeader>
        <div className="space-y-0.5">
          <CardTitle>My Hours</CardTitle>
          {monthLabel && (
            <CardDescription className="text-xs">
              This month: {monthLabel}
            </CardDescription>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {loading && (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        )}
        {error && (
          <p className="py-6 text-center text-sm text-destructive">{error}</p>
        )}
        {!loading && !error && !row && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No billable sessions this month.
          </p>
        )}
        {!loading && !error && row && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex items-center gap-1.5">
              {row.flagged && (
                <TriangleAlert className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
              )}
              <span
                className={cn(
                  "text-4xl font-bold tabular-nums leading-none",
                  row.flagged ? "text-amber-600" : "text-emerald-600",
                )}
              >
                {Math.round(row.directPct * 100)}%
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {row.flagged
                ? "Direct hours below 50% threshold"
                : "Meeting direct hours threshold this month"}
            </p>
            <div className="w-full max-w-xs space-y-2 pt-1">
              <HoursMixBar row={row} />
              <p className="text-xs tabular-nums text-muted-foreground">
                {formatHoursBreakdown(row)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t bg-slate-50/80 px-4 py-2.5 text-[11px] text-muted-foreground">
        Flag if direct &lt; 50% of direct + indirect hours
      </CardFooter>
    </Card>
  )
}
