import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react"
import {
  Card,
  CardAction,
  CardContent,
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
import { getOverdueNotes, type OverdueNoteRecord } from "@/lib/supabase"
import { toSlug } from "@/lib/slug"
import { cn } from "@/lib/utils"
import type { TeamFilter } from "@/types/team"

// Urgency thresholds
const CRITICAL_THRESHOLD = 10
const WARNING_THRESHOLD  = 1

type Urgency = "critical" | "warning" | "healthy"

function urgencyLevel(total: number): Urgency {
  if (total >= CRITICAL_THRESHOLD) return "critical"
  if (total >= WARNING_THRESHOLD)  return "warning"
  return "healthy"
}

function headlineColorClass(total: number): string {
  if (total >= 25) return "text-red-600"
  if (total >= 10) return "text-amber-600"
  return "text-[#1E2A2A]"
}

const SORT_OPTIONS = {
  overdue: {
    label: "Overdue count (high → low)",
    compare: (a: OverdueNoteRecord, b: OverdueNoteRecord) =>
      b.overdueCount - a.overdueCount ||
      a.staffName.localeCompare(b.staffName),
  },
  name: {
    label: "Staff name (A → Z)",
    compare: (a: OverdueNoteRecord, b: OverdueNoteRecord) =>
      a.staffName.localeCompare(b.staffName),
  },
} as const

type SortKey = keyof typeof SORT_OPTIONS

function countPillClass(count: number): string {
  if (count > 10) return "bg-red-100 text-red-700"
  if (count > 5)  return "bg-amber-100 text-amber-700"
  return "bg-slate-100 text-slate-700"
}

function CountPill({ count }: { count: number }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${countPillClass(count)}`}>
      {count}
    </span>
  )
}

export function NotesOverdueTile({ className, teamFilter, refreshKey }: { className?: string; teamFilter?: TeamFilter; refreshKey?: number }) {
  const [sortKey, setSortKey] = useState<SortKey>("overdue")
  const [allNotes, setAllNotes] = useState<OverdueNoteRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getOverdueNotes()
      .then(setAllNotes)
      .catch((err) => setError(err.message ?? "Failed to load overdue notes"))
      .finally(() => setLoading(false))
  }, [refreshKey])

  const teamNotes = teamFilter && teamFilter !== "All"
    ? allNotes.filter(n => n.staffTeam === teamFilter)
    : allNotes

  const sortedNotes = [...teamNotes].sort(SORT_OPTIONS[sortKey].compare)
  const totalOverdue  = sortedNotes.reduce((sum, row) => sum + row.overdueCount, 0)
  const staffWithOverdue = sortedNotes.length
  const urgency = urgencyLevel(totalOverdue)

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
        <CardTitle className="flex items-center gap-1.5">
          {UrgencyIcon}
          Notes Overdue
          <span
            title="Session notes that were due before today and haven't been submitted."
            className="inline-flex cursor-help ml-0.5"
          >
            <Info className="w-3.5 h-3.5 text-slate-400" />
          </span>
        </CardTitle>
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
        {!loading && !error && sortedNotes.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border py-8 text-center">
            <CheckCircle2 className="w-8 h-8 text-[#14A0A5]" />
            <p className="text-sm text-muted-foreground">All notes are up to date.</p>
          </div>
        )}
        {!loading && !error && sortedNotes.length > 0 && (
          <>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-bold tracking-tight tabular-nums leading-none ${headlineColorClass(totalOverdue)}`}>
                {totalOverdue}
              </span>
              <span className="text-xs text-muted-foreground">
                across {staffWithOverdue} staff
              </span>
            </div>

            <ul className="mt-3 space-y-2 border-t pt-3">
              {sortedNotes.map((row) => (
                <li key={row.id} className="flex items-center justify-between text-sm">
                  <span className="truncate min-w-0 pr-2">
                    <Link to={"/staff/" + toSlug(row.staffName)} className="hover:underline underline-offset-2">
                      {row.staffName}
                    </Link>
                  </span>
                  <CountPill count={row.overdueCount} />
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}
