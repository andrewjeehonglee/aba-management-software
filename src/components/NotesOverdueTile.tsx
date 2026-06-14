import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { AlertCircle, AlertTriangle, CheckCircle2, FileText, Info } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getNotesStatus, type StaffNotesStatus } from "@/lib/notesStatus"
import { staffProfilePath } from "@/lib/rosterScope"
import { cn } from "@/lib/utils"
import {
  PulseBaseline,
  PulseCompletionBar,
  PulseDrillSection,
  PulseDrillRow,
  PulseHealthyLine,
  PulseMetric,
  PulseTileError,
  PulseTileHeader,
  PulseTileShell,
  PulseTileSkeleton,
  trendGlyph,
} from "@/components/dashboard/PulseTile"

const CRITICAL_THRESHOLD = 10
const WARNING_THRESHOLD = 1

type Urgency = "critical" | "warning" | "healthy"

function urgencyLevel(totalOverdue: number, totalMissing: number): Urgency {
  const total = totalOverdue + totalMissing
  if (totalOverdue >= CRITICAL_THRESHOLD || total >= 25) return "critical"
  if (totalOverdue >= WARNING_THRESHOLD || total >= 10) return "warning"
  return total > 0 ? "warning" : "healthy"
}

function sortByOverdueDesc(a: StaffNotesStatus, b: StaffNotesStatus): number {
  return (
    b.overdueCount - a.overdueCount ||
    b.missingCount - a.missingCount ||
    a.staffName.localeCompare(b.staffName)
  )
}

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

function PulseNotesTile({
  className,
  summary,
  loading,
  error,
  onRetry,
  expanded,
  onExpand,
}: {
  className?: string
  summary: Awaited<ReturnType<typeof getNotesStatus>> | null
  loading: boolean
  error: string | null
  onRetry: () => void
  expanded: boolean
  onExpand: () => void
}) {
  if (loading) return <PulseTileSkeleton />

  const overdue = summary?.totalOverdue ?? 0
  const periodLabel = summary?.payPeriodLabel ?? ""
  const lastPeriodOverdue = summary?.lastPeriodOverdue ?? 0
  const pctDocumented = summary?.pctDocumented ?? 0
  const totalCompleted = summary?.totalCompleted ?? 0

  const staffWithOverdue = (summary?.byStaff ?? [])
    .filter((row) => row.overdueCount > 0)
    .sort(sortByOverdueDesc)

  const visibleStaff = expanded ? staffWithOverdue : staffWithOverdue.slice(0, 3)
  const hiddenCount = staffWithOverdue.length - 3

  if (error) {
    return (
      <PulseTileError
        title="Session Notes"
        message="Couldn't load notes."
        onRetry={onRetry}
        className={className}
      />
    )
  }

  if (totalCompleted === 0) {
    return (
      <PulseTileShell flagged={false} className={className}>
        <PulseTileHeader title="Session Notes" periodPrefix="This period" periodLabel={periodLabel} />
        <div className="mt-6 flex flex-1 flex-col items-start gap-2">
          <FileText className="size-5 text-subtle" aria-hidden />
          <p className="text-base text-ink">No sessions logged yet this period.</p>
          <p className="text-sm text-muted">
            Notes will appear here as your team documents sessions.
          </p>
        </div>
      </PulseTileShell>
    )
  }

  return (
    <PulseTileShell flagged={overdue > 0} severity="crit" className={className}>
      <PulseTileHeader title="Session Notes" periodPrefix="This period" periodLabel={periodLabel} />

      <div className="mt-4">
        <PulseMetric value={overdue} unit="overdue" flagged={overdue > 0} severity="crit" />
        {overdue > 0 ? (
          <PulseBaseline>
            {trendGlyph(overdue, lastPeriodOverdue)} was {lastPeriodOverdue} last period
          </PulseBaseline>
        ) : (
          <PulseHealthyLine>All notes in for this period.</PulseHealthyLine>
        )}
      </div>

      {totalCompleted > 0 && (
        <PulseCompletionBar pct={pctDocumented} label={`${pctDocumented}% documented`} />
      )}

      {staffWithOverdue.length > 0 && (
        <PulseDrillSection eyebrow="Per staff">
          <ul className="space-y-2.5">
            {visibleStaff.map((row) => (
              <PulseDrillRow
                key={row.staffId}
                name={row.staffName}
                to={row.staffExternalCode ? staffProfilePath(row.staffExternalCode) : undefined}
                dotColor="crit"
                value={row.overdueCount}
              />
            ))}
          </ul>
          {!expanded && hiddenCount > 0 && (
            <button
              type="button"
              onClick={onExpand}
              className="mt-3 text-left text-sm font-medium text-brand hover:underline"
            >
              + {hiddenCount} more staff
            </button>
          )}
        </PulseDrillSection>
      )}
    </PulseTileShell>
  )
}

export function NotesOverdueTile({
  className,
  refreshKey,
  staffIds,
  clientIds,
  selfMode,
  includeCaseloadStaff,
  variant = "default",
}: {
  className?: string
  teamFilter?: string
  refreshKey?: number
  staffIds?: string[]
  clientIds?: string[]
  selfMode?: boolean
  includeCaseloadStaff?: boolean
  variant?: "default" | "pulse"
}) {
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getNotesStatus>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [retryTick, setRetryTick] = useState(0)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getNotesStatus(
      undefined,
      staffIds?.length || clientIds?.length || includeCaseloadStaff
        ? {
            staffIds: staffIds?.length ? staffIds : undefined,
            clientIds: clientIds?.length ? clientIds : undefined,
            includeCaseloadStaff,
          }
        : undefined,
    )
      .then(setSummary)
      .catch((err) => setError(err.message ?? "Failed to load notes status"))
      .finally(() => setLoading(false))
  }, [refreshKey, staffIds, clientIds, includeCaseloadStaff, retryTick])

  if (variant === "pulse" && !selfMode) {
    return (
      <PulseNotesTile
        className={className}
        summary={summary}
        loading={loading}
        error={error}
        expanded={expanded}
        onExpand={() => setExpanded(true)}
        onRetry={() => setRetryTick((k) => k + 1)}
      />
    )
  }

  const sortedStaff = summary ? [...summary.byStaff].sort(sortByOverdueDesc) : []

  const totalMissing = summary?.totalMissing ?? 0
  const totalOverdue = summary?.totalOverdue ?? 0
  const staffWithGaps = sortedStaff.length
  const urgency = urgencyLevel(totalOverdue, totalMissing)
  const hasGaps = totalMissing > 0 || totalOverdue > 0
  const showCaseloadRoster = Boolean(includeCaseloadStaff && sortedStaff.length > 0 && !selfMode)

  const borderClass =
    urgency === "critical"
      ? "border-l-4 border-l-red-500"
      : urgency === "warning"
        ? "border-l-4 border-l-amber-500"
        : ""
  const shadowClass = urgency !== "healthy" ? "shadow-md" : ""

  const UrgencyIcon =
    urgency === "critical" ? (
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
            <CardDescription className="text-xs">
              Pay period: {summary.payPeriodLabel}
            </CardDescription>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
        )}
        {error && (
          <p className="py-10 text-center text-sm text-destructive">{error}</p>
        )}
        {!loading && !error && !hasGaps && !showCaseloadRoster && (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border py-8 text-center">
            <CheckCircle2 className="w-8 h-8 text-[#14A0A5]" />
            <p className="text-sm text-muted-foreground">
              All completed sessions this pay period have notes.
            </p>
          </div>
        )}
        {!loading && !error && showCaseloadRoster && !hasGaps && (
          <>
            <p className="text-xs text-muted-foreground mb-2">
              Caseload team — all notes complete this pay period
            </p>
            <ul className="space-y-2">
              {sortedStaff.map((row) => (
                <li key={row.staffId} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate min-w-0 pr-2">
                    <Link
                      to={row.staffExternalCode ? staffProfilePath(row.staffExternalCode) : "#"}
                      className="hover:underline underline-offset-2"
                    >
                      {row.staffName}
                    </Link>
                  </span>
                  <span className="text-xs text-emerald-700 shrink-0">0 gaps</span>
                </li>
              ))}
            </ul>
          </>
        )}
        {!loading && !error && hasGaps && selfMode && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            {totalMissing > 0 && (
              <div className="flex flex-col items-center gap-1">
                <span className="text-4xl font-bold tabular-nums leading-none text-amber-600">
                  {totalMissing}
                </span>
                <p className="text-sm text-muted-foreground">missing notes this pay period</p>
              </div>
            )}
            {totalOverdue > 0 && (
              <div className="flex flex-col items-center gap-1">
                <span className="text-4xl font-bold tabular-nums leading-none text-red-600">
                  {totalOverdue}
                </span>
                <p className="text-sm text-muted-foreground">overdue notes this pay period</p>
              </div>
            )}
          </div>
        )}
        {!loading && !error && hasGaps && !selfMode && (
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
                {includeCaseloadStaff
                  ? `${sortedStaff.length} on caseload`
                  : `across ${staffWithGaps} staff`}
              </span>
            </div>

            <ul className="mt-3 space-y-2 border-t pt-3">
              {sortedStaff.map((row) => (
                <li key={row.staffId} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate min-w-0 pr-2">
                    <Link
                      to={row.staffExternalCode ? staffProfilePath(row.staffExternalCode) : "#"}
                      className="hover:underline underline-offset-2"
                    >
                      {row.staffName}
                    </Link>
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {row.missingCount === 0 && row.overdueCount === 0 ? (
                      <span className="text-xs text-emerald-700">0 gaps</span>
                    ) : (
                      <>
                        <MissingPill count={row.missingCount} />
                        <OverduePill count={row.overdueCount} />
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
      {!loading && !error && (
        <CardFooter className="flex flex-wrap gap-x-4 gap-y-1 border-t bg-slate-50/80 px-4 py-2.5 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />
            <span>
              <span className="font-medium text-amber-700">Missing</span> — due before next session
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden />
            <span>
              <span className="font-medium text-red-700">Overdue</span> — next session started or
              period ended
            </span>
          </span>
        </CardFooter>
      )}
    </Card>
  )
}
