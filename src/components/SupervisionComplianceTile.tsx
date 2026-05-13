import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { mockSupervision } from "@/data/mockSupervision"
import { cn } from "@/lib/utils"

const PREVIEW_ROW_LIMIT = 5

const SUPERVISION_THRESHOLD = 5
const WATCH_UPPER = 7

function complianceClasses(pct: number): { bar: string; text: string } {
  if (pct < SUPERVISION_THRESHOLD) return { bar: "bg-red-500",     text: "text-red-700" }
  if (pct < WATCH_UPPER)           return { bar: "bg-amber-500",   text: "text-amber-700" }
  return                                  { bar: "bg-emerald-500", text: "text-emerald-700" }
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

export function SupervisionComplianceTile({ className }: { className?: string }) {
  const sortedRBTs = [...mockSupervision].sort(
    (a, b) =>
      a.supervisionPct - b.supervisionPct ||
      a.rbtName.localeCompare(b.rbtName)
  )

  const flaggedCount = sortedRBTs.filter(
    (r) => r.supervisionPct < SUPERVISION_THRESHOLD
  ).length
  const totalRBTs = sortedRBTs.length
  const previewRBTs = sortedRBTs.slice(0, PREVIEW_ROW_LIMIT)

  return (
    <Card size="sm" className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>Supervision Compliance</CardTitle>
        <CardDescription className="text-xs">
          RBTs below {SUPERVISION_THRESHOLD}% supervision threshold flagged
        </CardDescription>
        <CardAction>
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline"
          >
            View all →
          </button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-semibold tabular-nums leading-none">
            {flaggedCount}
          </span>
          <span className="text-xs text-muted-foreground">
            of {totalRBTs} RBTs below threshold
          </span>
        </div>

        <ul className="mt-3 space-y-2 border-t pt-3">
          {previewRBTs.map((rbt) => {
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
