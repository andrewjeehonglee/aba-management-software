import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { AlertCircle, AlertTriangle, Info, ShieldCheck } from "lucide-react"
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
import { getSupervision, type SupervisionRecord } from "@/lib/supabase"
import { SUPERVISION_THRESHOLD } from "@/lib/supervision"
import { toSlug } from "@/lib/slug"
import { cn } from "@/lib/utils"
import type { TeamFilter } from "@/types/team"

// Urgency thresholds
const CRITICAL_THRESHOLD = 5
const WARNING_THRESHOLD  = 1

type Urgency = "critical" | "warning" | "healthy"

function urgencyLevel(flagged: number): Urgency {
  if (flagged >= CRITICAL_THRESHOLD) return "critical"
  if (flagged >= WARNING_THRESHOLD)  return "warning"
  return "healthy"
}

function headlineColorClass(flagged: number): string {
  if (flagged >= 5) return "text-red-600"
  if (flagged >= 1) return "text-amber-600"
  return "text-emerald-600"
}


const SORT_OPTIONS = {
  pctAsc: {
    label: "Compliance % (low → high)",
    compare: (a: SupervisionRecord, b: SupervisionRecord) =>
      a.supervisionPct - b.supervisionPct || a.staffName.localeCompare(b.staffName),
  },
  name: {
    label: "RBT name (A → Z)",
    compare: (a: SupervisionRecord, b: SupervisionRecord) =>
      a.staffName.localeCompare(b.staffName),
  },
  pctDesc: {
    label: "Compliance % (high → low)",
    compare: (a: SupervisionRecord, b: SupervisionRecord) =>
      b.supervisionPct - a.supervisionPct || a.staffName.localeCompare(b.staffName),
  },
} as const

type SortKey = keyof typeof SORT_OPTIONS

export function SupervisionComplianceTile({ className, teamFilter }: { className?: string; teamFilter?: TeamFilter }) {
  const [sortKey, setSortKey] = useState<SortKey>("pctAsc")
  const [allSupervision, setAllSupervision] = useState<SupervisionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getSupervision()
      .then(setAllSupervision)
      .catch((err) => setError(err.message ?? "Failed to load supervision data"))
      .finally(() => setLoading(false))
  }, [])

  const teamSupervision = teamFilter && teamFilter !== "All"
    ? allSupervision.filter(r => r.staffTeam === teamFilter)
    : allSupervision

  const sortedRBTs = [...teamSupervision].sort(SORT_OPTIONS[sortKey].compare)
  const flaggedCount = sortedRBTs.filter(r => r.supervisionPct < SUPERVISION_THRESHOLD).length
  const totalRBTs = sortedRBTs.length
  const urgency = urgencyLevel(flaggedCount)

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
          Supervision Compliance
          <span
            title={`RBTs must receive at least ${SUPERVISION_THRESHOLD}% of their direct hours as supervision each month. Staff below this threshold are flagged.`}
            className="inline-flex cursor-help ml-0.5"
          >
            <Info className="w-3.5 h-3.5 text-slate-400" />
          </span>
        </CardTitle>
        <CardDescription className="text-xs">
          RBTs below {SUPERVISION_THRESHOLD}% supervision threshold flagged
        </CardDescription>
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
        {!loading && !error && sortedRBTs.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border py-8 text-center">
            <ShieldCheck className="w-8 h-8 text-[#14A0A5]" />
            <p className="text-sm text-muted-foreground">No supervision records found.</p>
          </div>
        )}
        {!loading && !error && sortedRBTs.length > 0 && (
          <>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-bold tracking-tight tabular-nums leading-none ${headlineColorClass(flaggedCount)}`}>
                {flaggedCount}
              </span>
              <span className="text-xs text-muted-foreground">
                of {totalRBTs} RBTs below threshold
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
              {sortedRBTs.map((rbt) => {
                const flagged = rbt.supervisionPct < SUPERVISION_THRESHOLD
                const firstName = rbt.staffName.split(' ')[0]
                return (
                  <Link
                    key={rbt.id}
                    to={"/staff/" + toSlug(rbt.staffName)}
                    title={rbt.staffName}
                    className={`inline-flex h-14 w-[4.75rem] flex-col items-center justify-center rounded-xl border-2 px-1 py-1 text-center transition-opacity hover:opacity-75 ${
                      flagged
                        ? "border-red-400 bg-red-50"
                        : "border-[#14A0A5] bg-[#E8F7F7]"
                    }`}
                  >
                    <span className="max-w-full truncate text-[11px] font-medium leading-tight text-foreground">
                      {firstName}
                    </span>
                    <span className={`text-sm font-bold tabular-nums leading-tight ${flagged ? "text-red-600" : "text-[#0D7377]"}`}>
                      {rbt.supervisionPct.toFixed(0)}%
                    </span>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
