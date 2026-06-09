import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { AlertTriangle, BadgeCheck } from "lucide-react"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getAuthUtilizationByMonth, type ClientAuthUtilRow } from "@/lib/authUtilization"
import { FLAGGED_THRESHOLD, utilizationClass } from "@/lib/authorization"
import { cn } from "@/lib/utils"
import type { TeamFilter } from "@/types/team"

function MiniBar({ pct }: { pct: number }) {
  const { bar } = utilizationClass(pct)
  return (
    <div className="relative h-2 w-full min-w-[5rem] max-w-[11rem] flex-1 overflow-hidden rounded-full bg-slate-200">
      <div className={`h-full ${bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      <div
        className="absolute inset-y-0 w-px bg-slate-500/70"
        style={{ left: `${FLAGGED_THRESHOLD}%` }}
        aria-hidden="true"
      />
    </div>
  )
}

function AuthClientRow({ row }: { row: ClientAuthUtilRow }) {
  const { text } = utilizationClass(row.utilizationPct)

  return (
    <div className="space-y-1.5 rounded-lg border border-border/50 bg-card px-3 py-2.5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {row.flagged && (
            <AlertTriangle
              className="h-3.5 w-3.5 shrink-0 text-amber-500"
              aria-label={`At or above ${FLAGGED_THRESHOLD}% utilization`}
            />
          )}
          <Link
            to={"/clients/" + row.clientId}
            className={cn(
              "truncate text-sm hover:underline underline-offset-2",
              row.flagged ? "font-medium text-amber-800" : "font-medium text-[#1E2A2A]",
            )}
          >
            {row.clientName}
          </Link>
        </div>
        <p className={cn("shrink-0 text-xs tabular-nums", text)}>
          {row.usedHours} / {row.authorizedHours} hrs · {row.utilizationPct}%
        </p>
      </div>
      <MiniBar pct={row.utilizationPct} />
    </div>
  )
}

function AuthLegendFooter() {
  return (
    <CardFooter className="flex flex-wrap gap-x-4 gap-y-1 border-t bg-slate-50/80 px-4 py-2.5 text-[11px] text-muted-foreground">
      <span>
        <span className="font-medium text-foreground/80">Used</span> = completed sessions with complete notes this month
      </span>
      <span>
        <span className="font-medium text-amber-700">Flag</span> = ≥ {FLAGGED_THRESHOLD}% of authorized hours
      </span>
    </CardFooter>
  )
}

const SORT_OPTIONS = {
  pctDesc: {
    label: "Utilization % (high → low)",
    compare: (a: ClientAuthUtilRow, b: ClientAuthUtilRow) =>
      b.utilizationPct - a.utilizationPct || a.clientName.localeCompare(b.clientName),
  },
  name: {
    label: "Client name (A → Z)",
    compare: (a: ClientAuthUtilRow, b: ClientAuthUtilRow) =>
      a.clientName.localeCompare(b.clientName),
  },
  pctAsc: {
    label: "Utilization % (low → high)",
    compare: (a: ClientAuthUtilRow, b: ClientAuthUtilRow) =>
      a.utilizationPct - b.utilizationPct || a.clientName.localeCompare(b.clientName),
  },
} as const

type SortKey = keyof typeof SORT_OPTIONS

export function AuthorizationUtilizationTile({
  className,
  teamFilter,
  clientIds,
}: {
  className?: string
  teamFilter?: TeamFilter
  clientIds?: string[]
}) {
  const [sortKey, setSortKey] = useState<SortKey>("pctDesc")
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getAuthUtilizationByMonth>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAuthUtilizationByMonth(undefined, clientIds?.length ? { clientIds } : undefined)
      .then(setSummary)
      .catch((err) => setError(err.message ?? "Failed to load authorizations"))
      .finally(() => setLoading(false))
  }, [clientIds])

  const teamClients = summary
    ? (clientIds?.length
        ? summary.byClient
        : teamFilter && teamFilter !== "All"
          ? summary.byClient.filter((c) => c.clientTeam === teamFilter)
          : summary.byClient)
    : []

  const sortedClients = [...teamClients].sort(SORT_OPTIONS[sortKey].compare)

  return (
    <Card size="sm" className={cn("w-full flex flex-col", className)}>
      <CardHeader>
        <div className="space-y-0.5">
          <CardTitle>Authorization Utilization</CardTitle>
          {summary && (
            <CardDescription className="text-xs">
              This month: {summary.monthLabel}
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
      <CardContent className="flex-1">
        {loading && (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
        )}
        {error && (
          <p className="py-10 text-center text-sm text-destructive">{error}</p>
        )}
        {!loading && !error && sortedClients.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border py-10 text-center">
            <BadgeCheck className="w-8 h-8 text-[#14A0A5]" />
            <p className="text-sm text-muted-foreground">No billable sessions this month.</p>
          </div>
        )}
        {!loading && !error && sortedClients.length > 0 && (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-0.5">
            {sortedClients.map((row) => (
              <AuthClientRow key={row.authId} row={row} />
            ))}
          </div>
        )}
      </CardContent>
      {!loading && !error && <AuthLegendFooter />}
    </Card>
  )
}
