import { useState } from "react"
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
import { mockSupervision } from "@/data/mockSupervision"
import { cn } from "@/lib/utils"
import type { RBTSupervision } from "@/types/supervision"

// Tier 1 must: 5% of an RBT's billable hours must be supervised by a BCBA.
// Source: Jenny (target user) — May 5 working doc.
const SUPERVISION_THRESHOLD = 5
const WATCH_UPPER = 7

function complianceClasses(pct: number): { bar: string; text: string } {
  if (pct < SUPERVISION_THRESHOLD) return { bar: "bg-red-500",     text: "text-red-700" }
  if (pct < WATCH_UPPER)           return { bar: "bg-amber-500",   text: "text-amber-700" }
  return                                  { bar: "bg-emerald-500", text: "text-emerald-700" }
}

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
    compare: (a: RBTSupervision, b: RBTSupervision) =>
      a.supervisionPct - b.supervisionPct ||
      a.rbtName.localeCompare(b.rbtName),
  },
  name: {
    label: "RBT name (A → Z)",
    compare: (a: RBTSupervision, b: RBTSupervision) =>
      a.rbtName.localeCompare(b.rbtName),
  },
  pctDesc: {
    label: "Compliance % (high → low)",
    compare: (a: RBTSupervision, b: RBTSupervision) =>
      b.supervisionPct - a.supervisionPct ||
      a.rbtName.localeCompare(b.rbtName),
  },
} as const

type SortKey = keyof typeof SORT_OPTIONS

export function SupervisionComplianceTile({ className }: { className?: string }) {
  const [sortKey, setSortKey] = useState<SortKey>("pctAsc")

  const sortedRBTs = [...mockSupervision].sort(SORT_OPTIONS[sortKey].compare)

  const flaggedCount = sortedRBTs.filter(
    (r) => r.supervisionPct < SUPERVISION_THRESHOLD
  ).length
  const totalRBTs = sortedRBTs.length

  return (
    <Card size="sm" className={cn("w-full", className)}>
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
        <div className="flex items-baseline gap-2">
          <span
            className={`text-4xl font-semibold tabular-nums leading-none ${headlineClass(flaggedCount)}`}
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
                key={rbt.rbtName}
                className="flex items-center gap-3 text-sm"
              >
                <span className="flex-1 truncate min-w-0">{rbt.rbtName}</span>
                <MiniBar pct={rbt.supervisionPct} />
                <span className={`w-12 text-right tabular-nums font-medium ${text}`}>
                  {rbt.supervisionPct.toFixed(1)}%
                </span>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
