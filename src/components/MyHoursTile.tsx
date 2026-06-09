import { useEffect, useState } from "react"
import { TriangleAlert } from "lucide-react"
import { Link } from "react-router-dom"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getStaffHoursByMonth, type StaffHoursRow } from "@/lib/staffHours"
import { toSlug } from "@/lib/slug"
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
          <div className="space-y-2 rounded-lg border border-border/50 bg-card px-3 py-2.5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                {row.flagged && (
                  <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
                )}
                <Link
                  to={"/staff/" + toSlug(row.staffName)}
                  className={cn(
                    "truncate text-sm hover:underline underline-offset-2",
                    row.flagged ? "font-medium text-amber-800" : "font-medium text-[#1E2A2A]",
                  )}
                >
                  {row.staffName}
                </Link>
              </div>
              <p className="shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {formatHoursBreakdown(row)}
              </p>
            </div>
            <HoursMixBar row={row} />
            <p className={cn("text-[11px] tabular-nums", row.flagged ? "text-amber-600 font-medium" : "text-muted-foreground")}>
              {Math.round(row.directPct * 100)}% direct
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t bg-slate-50/80 px-4 py-2.5 text-[11px] text-muted-foreground">
        Flag if direct &lt; 50% of direct + indirect hours
      </CardFooter>
    </Card>
  )
}
