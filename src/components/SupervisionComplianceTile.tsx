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
import {
  SUPERVISION_THRESHOLD,
  complianceClasses,
} from "@/lib/supervision"
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

function MiniBar({ pct }: { pct: number }) {
  const { bar } = complianceClasses(pct)
  return (
    <div className="relative h-2 w-44 overflow-hidden rounded-full bg-slate-200">
      <div className={`h-full ${bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      <div
        className="absolute inset-y-0 w-px bg-slate-500/70"
        style={{ left: `${SUPERVISION_THRESHOLD}%` }}
        aria-hidden="true"
      />
    </div>
  )
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

            <ul className="mt-3 space-y-2 border-t pt-3">
              {sortedRBTs.map((rbt) => {
                const { text } = complianceClasses(rbt.supervisionPct)
                return (
                  <li key={rbt.id} className="flex items-center gap-3 text-sm">
                    <span className="flex-1 truncate min-w-0">
                      <Link to={"/staff/" + toSlug(rbt.staffName)} className="hover:underline underline-offset-2">
                        {rbt.staffName}
                      </Link>
                    </span>
                    <MiniBar pct={rbt.supervisionPct} />
                    <span className={`w-12 text-right tabular-nums font-medium ${text}`}>
                      {rbt.supervisionPct.toFixed(1)}%
                    </span>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}
