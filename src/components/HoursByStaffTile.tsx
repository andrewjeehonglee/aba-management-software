import { useState, useEffect } from "react"
import { Plus, TriangleAlert, Users, Check } from "lucide-react"
import { Link } from "react-router-dom"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createStaff } from "@/lib/supabase"
import { getStaffHoursByMonth, type StaffHoursRow } from "@/lib/staffHours"
import { staffProfilePath } from "@/lib/rosterScope"
import { cn } from "@/lib/utils"
import type { TeamFilter } from "@/types/team"

const HOURS_COLORS = {
  direct: "#10b981",
  indirect: "#94a3b8",
} as const

// ─── New Staff Modal ──────────────────────────────────────────────────────────

const STAFF_ROLES = ["Technician", "Supervisor", "BCBA", "Owner"] as const
const TEAMS       = ["A", "B", "C"] as const

const EMPTY_STAFF_FORM = { name: "", role: "" as string, team: "" as string }

interface NewStaffModalProps {
  open:         boolean
  practiceId:   string
  onClose:      () => void
  onSuccess:    () => void
}

function NewStaffModal({ open, practiceId, onClose, onSuccess }: NewStaffModalProps) {
  const [form, setForm]       = useState(EMPTY_STAFF_FORM)
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function reset() {
    setForm(EMPTY_STAFF_FORM)
    setError(null)
    setLoading(false)
  }

  function handleOpenChange(next: boolean) {
    if (!next) { reset(); onClose() }
  }

  function set<K extends keyof typeof EMPTY_STAFF_FORM>(key: K, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const canSubmit = form.name.trim() && form.role && form.team

  async function handleSubmit() {
    if (!canSubmit) return
    setError(null)
    setLoading(true)
    try {
      await createStaff({
        practiceId,
        name: form.name.trim(),
        role: form.role,
        team: `Team ${form.team}`,
      })
      reset()
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create staff member.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New Staff Member</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.name}
              onChange={e => set("name", e.target.value)}
              placeholder="e.g. Maria Gonzalez"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Role <span className="text-red-500">*</span>
              </label>
              <Select value={form.role ?? ""} onValueChange={v => set("role", v ?? "")} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Team <span className="text-red-500">*</span>
              </label>
              <Select value={form.team ?? ""} onValueChange={v => set("team", v ?? "")} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {TEAMS.map(t => (
                    <SelectItem key={t} value={t}>Team {t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { reset(); onClose() }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
            >
              {loading ? "Saving…" : "Add Staff"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Payroll row ─────────────────────────────────────────────────────────────

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
    <div
      className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100"
      role="img"
      aria-label={`${row.staffName}: ${formatHoursBreakdown(row)}`}
    >
      {segments.map((seg) => (
        <div
          key={seg.key}
          className="h-full min-w-[2px] transition-[width] duration-300"
          style={{
            width: `${(seg.hours / total) * 100}%`,
            backgroundColor: seg.color,
          }}
        />
      ))}
    </div>
  )
}

function PayrollStaffRow({ row }: { row: StaffHoursRow }) {
  const directPctLabel = `${Math.round(row.directPct * 100)}% direct`

  return (
    <div className="space-y-1.5 rounded-lg border border-border/50 bg-card px-3 py-2.5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {row.flagged && (
            <TriangleAlert
              className="h-3.5 w-3.5 shrink-0 text-amber-500"
              aria-label="Less than 50% direct hours"
            />
          )}
          <Link
            to={row.staffExternalCode ? staffProfilePath(row.staffExternalCode) : "#"}
            className={cn(
              "truncate text-sm hover:underline underline-offset-2",
              row.flagged ? "font-medium text-amber-800" : "font-medium text-[#1E2A2A]",
              !row.staffExternalCode && "pointer-events-none",
            )}
          >
            {row.staffName}
          </Link>
        </div>
        <div className="shrink-0 text-right">
          <p className="max-w-[11rem] text-right text-[11px] leading-snug tabular-nums text-muted-foreground sm:max-w-none sm:text-xs">
            {formatHoursBreakdown(row)}
          </p>
          <p
            className={cn(
              "text-[11px] tabular-nums",
              row.flagged ? "font-medium text-amber-600" : "text-muted-foreground",
            )}
          >
            {directPctLabel}
          </p>
        </div>
      </div>
      <HoursMixBar row={row} />
    </div>
  )
}

function HoursLegendFooter() {
  return (
    <CardFooter className="flex flex-wrap gap-x-4 gap-y-1 border-t bg-slate-50/80 px-4 py-2.5 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
        <span><span className="font-medium text-emerald-700">Direct</span> — completed + note</span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-slate-400" aria-hidden />
        <span><span className="font-medium text-slate-600">Indirect</span> — completed + note</span>
      </span>
      <span className="w-full sm:w-auto text-muted-foreground/80">
        Flag if direct &lt; 50% of direct + indirect hours
      </span>
    </CardFooter>
  )
}

function sortByTotalHoursDesc(a: StaffHoursRow, b: StaffHoursRow): number {
  return b.totalHours - a.totalHours
}

function PulseHoursSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-2xl bg-surface p-6 shadow-card">
      <div className="flex items-start justify-between">
        <div className="h-4 w-28 animate-pulse rounded bg-border" />
        <div className="h-8 w-16 animate-pulse rounded bg-border" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-8 w-12 animate-pulse rounded bg-border" />
        <div className="h-3 w-40 animate-pulse rounded bg-border" />
      </div>
      <div className="mt-5 space-y-2 border-t border-border pt-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-4 w-full animate-pulse rounded bg-border" />
        ))}
      </div>
    </div>
  )
}

function PulseHoursTile({
  className,
  summary,
  loading,
  error,
  onRetry,
  expanded,
  onExpand,
}: {
  className?: string
  summary: Awaited<ReturnType<typeof getStaffHoursByMonth>> | null
  loading: boolean
  error: string | null
  onRetry: () => void
  expanded: boolean
  onExpand: () => void
}) {
  if (loading) return <PulseHoursSkeleton />

  const monthLabel = summary?.monthLabel ?? ""
  const allStaff = summary?.byStaff ?? []
  const flaggedStaff = allStaff.filter((row) => row.flagged).sort(sortByTotalHoursDesc)
  const flaggedCount = flaggedStaff.length
  const totalBillable = allStaff.reduce((sum, row) => sum + row.totalHours, 0)

  const visibleFlagged = expanded ? flaggedStaff : flaggedStaff.slice(0, 3)
  const hiddenFlagged = flaggedStaff.length - 3

  if (error) {
    return (
      <div className={cn("flex h-full flex-col rounded-2xl bg-surface p-6 shadow-card", className)}>
        <h3 className="text-[15px] font-semibold text-ink">Hours by Staff</h3>
        <p className="mt-4 text-sm text-muted">Couldn&apos;t load hours.</p>
        <button type="button" onClick={onRetry} className="mt-2 w-fit text-xs text-brand hover:underline">
          Retry
        </button>
      </div>
    )
  }

  if (allStaff.length === 0) {
    return (
      <div className={cn("flex h-full flex-col rounded-2xl bg-surface p-6 shadow-card", className)}>
        <div className="flex items-start justify-between">
          <h3 className="text-[15px] font-semibold text-ink">Hours by Staff</h3>
          {monthLabel && (
            <span className="text-right text-xs leading-tight text-subtle">
              This month
              <br />
              {monthLabel}
            </span>
          )}
        </div>
        <div className="mt-6 flex flex-1 flex-col items-start gap-2">
          <Users className="size-5 text-subtle" aria-hidden />
          <p className="text-sm text-ink">No billable hours logged yet this month.</p>
        </div>
      </div>
    )
  }

  return (
    <div
      data-flagged={flaggedCount > 0}
      className={cn(
        "flex h-full flex-col rounded-2xl border-0 bg-surface p-6 shadow-card",
        "data-[flagged=true]:border-l-4 data-[flagged=true]:border-l-warn data-[flagged=true]:shadow-card-flagged",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <h3 className="text-[15px] font-semibold text-ink">Hours by Staff</h3>
        <span className="text-right text-xs leading-tight text-subtle">
          This month
          <br />
          {monthLabel}
        </span>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "text-[30px] font-semibold tabular-nums tracking-tight",
              flaggedCount > 0 ? "text-warn" : "text-ink",
            )}
          >
            {flaggedCount}
          </span>
          <span className="text-sm text-muted">below direct mix</span>
        </div>
        {flaggedCount > 0 ? (
          <p className="mt-1 text-xs text-subtle">
            {allStaff.length} staff · {Math.round(totalBillable)} billable hrs this month
          </p>
        ) : (
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-ok">
            <Check size={13} aria-hidden />
            All staff above 50% direct mix · {Math.round(totalBillable)} billable hrs.
          </p>
        )}
      </div>

      {flaggedStaff.length > 0 && (
        <div className="mt-5 flex flex-1 flex-col border-t border-border pt-4">
          <p className="mb-2 text-xs text-subtle">Per staff</p>
          <ul className="space-y-2">
            {visibleFlagged.map((row) => (
              <li key={row.staffId} className="flex items-center justify-between gap-2 text-sm text-ink">
                <Link
                  to={row.staffExternalCode ? staffProfilePath(row.staffExternalCode) : "#"}
                  className="truncate hover:underline underline-offset-2"
                >
                  {row.staffName}
                </Link>
                <span className="inline-flex shrink-0 items-center gap-1.5 tabular-nums text-muted">
                  <span className="size-1.5 rounded-full bg-warn" aria-hidden />
                  {Math.round(row.directPct * 100)}% direct
                </span>
              </li>
            ))}
          </ul>
          {!expanded && hiddenFlagged > 0 && (
            <button
              type="button"
              onClick={onExpand}
              className="mt-3 text-left text-xs text-brand hover:underline"
            >
              + {hiddenFlagged} more staff
            </button>
          )}
        </div>
      )}
    </div>
  )
}

interface HoursByStaffTileProps {
  className?:      string
  teamFilter?:     TeamFilter
  refreshKey?:     number
  practiceId?:     string
  onStaffCreated?: () => void
  staffIds?:       string[]
  clientIds?:      string[]
  includeZeroHourStaff?: boolean
  variant?: "default" | "pulse"
}

export function HoursByStaffTile({
  className,
  teamFilter: _teamFilter,
  refreshKey,
  practiceId,
  onStaffCreated,
  staffIds,
  clientIds,
  includeZeroHourStaff,
  variant = "default",
}: HoursByStaffTileProps) {
  const [summary, setSummary]     = useState<Awaited<ReturnType<typeof getStaffHoursByMonth>> | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [expanded, setExpanded]   = useState(false)
  const [retryTick, setRetryTick] = useState(0)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getStaffHoursByMonth(
      undefined,
      staffIds?.length || clientIds?.length || includeZeroHourStaff
        ? {
            staffIds: staffIds?.length ? staffIds : undefined,
            clientIds: clientIds?.length ? clientIds : undefined,
            includeZeroHourStaff,
          }
        : undefined,
    )
      .then(setSummary)
      .catch((err) => setError(err.message ?? "Failed to load staff hours"))
      .finally(() => setLoading(false))
  }, [refreshKey, staffIds, clientIds, includeZeroHourStaff, retryTick])

  if (variant === "pulse") {
    return (
      <>
        <PulseHoursTile
          className={className}
          summary={summary}
          loading={loading}
          error={error}
          expanded={expanded}
          onExpand={() => setExpanded(true)}
          onRetry={() => setRetryTick((k) => k + 1)}
        />
        {practiceId && (
          <NewStaffModal
            open={modalOpen}
            practiceId={practiceId}
            onClose={() => setModalOpen(false)}
            onSuccess={() => { setModalOpen(false); onStaffCreated?.() }}
          />
        )}
      </>
    )
  }

  const sortedStaff = summary
    ? [...summary.byStaff].sort(sortByTotalHoursDesc)
    : []

  return (
    <>
    <Card size="sm" className={cn("w-full flex flex-col", className)}>
      <CardHeader>
        <div className="space-y-0.5">
          <CardTitle>Hours by Staff</CardTitle>
          {summary && (
            <CardDescription className="text-xs">
              This month: {summary.monthLabel}
            </CardDescription>
          )}
        </div>
        {practiceId && (
          <CardAction>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs gap-1"
              onClick={() => setModalOpen(true)}
            >
              <Plus className="size-3.5" />
              New Staff
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        {loading && (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
        )}
        {error && (
          <p className="py-10 text-center text-sm text-destructive">{error}</p>
        )}
        {!loading && !error && sortedStaff.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border py-10 text-center">
            <Users className="w-8 h-8 text-[#14A0A5]" />
            <p className="text-sm text-muted-foreground">
              {includeZeroHourStaff
                ? "No caseload staff to display."
                : "No billable sessions this month."}
            </p>
          </div>
        )}
        {!loading && !error && sortedStaff.length > 0 && (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-0.5">
            {sortedStaff.map((row) => (
              <PayrollStaffRow key={row.staffId} row={row} />
            ))}
          </div>
        )}
      </CardContent>
      {!loading && !error && <HoursLegendFooter />}
    </Card>

    {practiceId && (
      <NewStaffModal
        open={modalOpen}
        practiceId={practiceId}
        onClose={() => setModalOpen(false)}
        onSuccess={() => { setModalOpen(false); onStaffCreated?.() }}
      />
    )}
    </>
  )
}
