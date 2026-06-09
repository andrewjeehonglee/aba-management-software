import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getNotesStatus, type StaffNotesStatus } from "@/lib/notesStatus"
import { toSlug } from "@/lib/slug"
import { cn } from "@/lib/utils"

const CRITICAL_THRESHOLD = 10
const WARNING_THRESHOLD = 1

type Urgency = "critical" | "warning" | "healthy"

function urgencyLevel(totalOverdue: number, totalMissing: number): Urgency {
  const total = totalOverdue + totalMissing
  if (totalOverdue >= CRITICAL_THRESHOLD || total >= 25) return "critical"
  if (totalOverdue >= WARNING_THRESHOLD || total >= 10) return "warning"
  return total > 0 ? "warning" : "healthy"
}

const SORT_OPTIONS = {
  overdue: {
    label: "Overdue count (high → low)",
    compare: (a: StaffNotesStatus, b: StaffNotesStatus) =>
      b.overdueCount - a.overdueCount ||
      b.missingCount - a.missingCount ||
      a.staffName.localeCompare(b.staffName),
  },
  name: {
    label: "Staff name (A → Z)",
    compare: (a: StaffNotesStatus, b: StaffNotesStatus) =>
      a.staffName.localeCompare(b.staffName),
  },
} as const

type SortKey = keyof typeof SORT_OPTIONS

function MissingPill({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium tabular-nums text-amber-800">
      {count} missing
    </span>
  )
}

function OverduePill({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium tabular-nums text-red-700">
      {count} overdue
    </span>
  )
}

export function NotesOverdueTile({
  className,
  refreshKey,
}: {
  className?: string
  teamFilter?: string
  refreshKey?: number
}) {
  const [sortKey, setSortKey] = useState<SortKey>("overdue")
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getNotesStatus>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getNotesStatus()
      .then(setSummary)
      .catch((err) => setError(err.message ?? "Failed to load notes status"))
      .finally(() => setLoading(false))
  }, [refreshKey])

  const sortedStaff = summary
    ? [...summary.byStaff].sort(SORT_OPTIONS[sortKey].compare)
    : []

  const totalMissing = summary?.totalMissing ?? 0
  const totalOverdue = summary?.totalOverdue ?? 0
  const staffWithGaps = sortedStaff.length
  const urgency = urgencyLevel(totalOverdue, totalMissing)
  const hasGaps = totalMissing > 0 || totalOverdue > 0

  const borderClass = urgency === "critical" ? "border-l-4 border-l-red-500"
                    : urgency === "warning"  ? "border-l-4 border-l-amber-500"
                    : ""
  const shadowClass = urgency !== "healthy" ? "shadow-md" : ""

  const UrgencyIcon = urgency === "critical" ? (
    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" aria-hidden />
  ) : urgency === "warning" ? (
    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" aria-hidden />
  ) : null

  return (
    <Card size="sm" className={cn("w-full", borderClass, shadowClass, className)}>
      <CardHeader>
        <div className="space-y-0.5">
          <CardTitle className="flex items-center gap-1.5">
            {UrgencyIcon}
            Session Notes
            <span
              title="Counts completed sessions in this pay period without a full SOAP note. Missing = still in grace until your next session. Overdue = grace expired (next session started or pay period ended)."
              className="inline-flex cursor-help ml-0.5"
            >
              <Info className="w-3.5 h-3.5 text-slate-400" />
            </span>
          </CardTitle>
          {summary && (
            <CardDescription className="text-xs space-y-1">
              <span className="block">Pay period: {summary.payPeriodLabel}</span>
              <span className="block text-[11px] leading-snug text-muted-foreground/90">
                <span className="font-medium text-amber-700">Missing:</span> session completed, note not submitted, due before next session.{" "}
                <span className="font-medium text-red-700">Overdue:</span> next session started or pay period ended, note still open.
              </span>
            </CardDescription>
          )}
        </div>
        <CardAction>
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue>{SORT_OPTIONS[sortKey].label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SORT_OPTIONS).map(([key, { label }]) => (
                <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent>
        {loading && (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
        )}
        {error && (
          <p className="py-10 text-center text-sm text-destructive">{error}</p>
        )}
        {!loading && !error && !hasGaps && (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border py-8 text-center">
            <CheckCircle2 className="w-8 h-8 text-[#14A0A5]" />
            <p className="text-sm text-muted-foreground">
              All completed sessions this pay period have notes.
            </p>
          </div>
        )}
        {!loading && !error && hasGaps && (
          <>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              {totalMissing > 0 && (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold tracking-tight tabular-nums leading-none text-amber-600">
                    {totalMissing}
                  </span>
                  <span className="text-xs text-muted-foreground">missing</span>
                </div>
              )}
              {totalOverdue > 0 && (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold tracking-tight tabular-nums leading-none text-red-600">
                    {totalOverdue}
                  </span>
                  <span className="text-xs text-muted-foreground">overdue</span>
                </div>
              )}
              <span className="text-xs text-muted-foreground w-full sm:w-auto">
                across {staffWithGaps} staff
              </span>
            </div>

            <ul className="mt-3 space-y-2 border-t pt-3">
              {sortedStaff.map((row) => (
                <li key={row.staffId} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate min-w-0 pr-2">
                    <Link
                      to={"/staff/" + toSlug(row.staffName)}
                      className="hover:underline underline-offset-2"
                    >
                      {row.staffName}
                    </Link>
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <MissingPill count={row.missingCount} />
                    <OverduePill count={row.overdueCount} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}
