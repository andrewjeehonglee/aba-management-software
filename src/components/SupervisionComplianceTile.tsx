import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { ShieldCheck } from "lucide-react"
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

// Severity coloring for the BIG headline number — count of RBTs below the
// 5% threshold. >=5 flagged is a systemic problem; 1-4 is a coaching moment;
// 0 is "all compliant" and earns the green badge.
function headlineClass(flaggedCount: number): string {
  if (flaggedCount >= 5) return "text-red-600"
  if (flaggedCount >= 1) return "text-amber-600"
  return "text-emerald-600"
}

function MiniBar({ pct }: { pct: number }) {
  const { bar } = complianceClasses(pct)
  return (
    <div className="relative h-2 w-44 overflow-hidden rounded-full bg-slate-200">
      <div
        className={`h-full ${bar}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
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
      a.supervisionPct - b.supervisionPct ||
      a.staffName.localeCompare(b.staffName),
  },
  name: {
    label: "RBT name (A → Z)",
    compare: (a: SupervisionRecord, b: SupervisionRecord) =>
      a.staffName.localeCompare(b.staffName),
  },
  pctDesc: {
    label: "Compliance % (high → low)",
    compare: (a: SupervisionRecord, b: SupervisionRecord) =>
      b.supervisionPct - a.supervisionPct ||
      a.staffName.localeCompare(b.staffName),
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

  const flaggedCount = sortedRBTs.filter(
    (r) => r.supervisionPct < SUPERVISION_THRESHOLD
  ).length
  const totalRBTs = sortedRBTs.length

  const borderClass = flaggedCount >= 1 ? "border-l-4 border-l-red-500" : ""

  return (
    <Card size="sm" className={cn("w-full", borderClass, className)}>
      <CardHeader>
        <CardTitle>Supervision Compliance</CardTitle>
        <CardDescription className="text-xs">
          RBTs below {SUPERVISION_THRESHOLD}% supervision threshold flagged
        </CardDescription>
        <CardAction>
          <Select
            value={sortKey}
            onValueChange={(v) => setSortKey(v as SortKey)}
          >
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue>{SORT_OPTIONS[sortKey].label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SORT_OPTIONS).map(([key, { label }]) => (
                <SelectItem key={key} value={key} className="text-xs">
                  {label}
                </SelectItem>
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
          <div className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-[#14A0A5]" />
            No supervision records found.
          </div>
        )}
        {!loading && !error && sortedRBTs.length > 0 && (
          <>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-4xl font-bold tracking-tight tabular-nums leading-none ${headlineClass(flaggedCount)}`}
              >
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
                  <li
                    key={rbt.id}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="flex-1 truncate min-w-0">
                      <Link
                        to={"/staff/" + toSlug(rbt.staffName)}
                        className="hover:underline underline-offset-2"
                      >
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

