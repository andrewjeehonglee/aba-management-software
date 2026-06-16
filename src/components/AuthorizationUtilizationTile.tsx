import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { AlertTriangle, BadgeCheck } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getAuthUtilizationByMonth, type ClientAuthUtilRow } from "@/lib/authUtilization"
import { FLAGGED_THRESHOLD, utilizationClass } from "@/lib/authorization"
import { clientProfilePath } from "@/lib/rosterScope"
import { cn } from "@/lib/utils"
import type { TeamFilter } from "@/types/team"
import {
  PulsePillarCard,
  PulseTileError,
  PulseTileSkeleton,
} from "@/components/dashboard/PulseTile"

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
  const href = row.clientCode ? clientProfilePath(row.clientCode) : null

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
          {href ? (
            <Link
              to={href}
              className={cn(
                "truncate text-sm hover:underline underline-offset-2",
                row.flagged ? "font-medium text-amber-800" : "font-medium text-[#1E2A2A]",
              )}
            >
              {row.clientName}
            </Link>
          ) : (
            <span className={cn(
              "truncate text-sm",
              row.flagged ? "font-medium text-amber-800" : "font-medium text-[#1E2A2A]",
            )}>
              {row.clientName}
            </span>
          )}
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

function sortByUtilizationDesc(a: ClientAuthUtilRow, b: ClientAuthUtilRow): number {
  return b.utilizationPct - a.utilizationPct || a.clientName.localeCompare(b.clientName)
}

function PulseAuthTile({
  className,
  summary,
  loading,
  error,
  onRetry,
  clientIds,
  compact,
}: {
  className?: string
  summary: Awaited<ReturnType<typeof getAuthUtilizationByMonth>> | null
  loading: boolean
  error: string | null
  onRetry: () => void
  clientIds?: string[]
  compact?: boolean
}) {
  const tileSize = compact ? "compact" : "default"
  if (loading) return <PulseTileSkeleton />

  const monthLabel = summary?.monthLabel ?? ""
  const overCount = summary?.overCount ?? 0
  const approachingCount = summary?.approachingCount ?? 0
  const withinCount = summary?.withinCount ?? 0
  const totalClients = summary?.totalClients ?? 0
  const totalOverHours = summary?.totalOverHours ?? 0

  if (error) {
    return (
      <PulseTileError
        title="Authorization utilization"
        message="Couldn't load authorizations."
        onRetry={onRetry}
        className={className}
      />
    )
  }

  if (totalClients === 0) {
    return (
      <PulsePillarCard
        id="auth-utilization"
        className={className}
        status="ok"
        title="Authorization utilization"
        period={`This month · ${monthLabel}`}
        metric="0"
        unit="clients over authorized limit"
        size={tileSize}
        support={
          clientIds?.length
            ? "No authorization records for this caseload yet."
            : "No utilization logged yet — delivery against auth limits appears as sessions are documented."
        }
      />
    )
  }

  const status = overCount > 0 ? "flag" : approachingCount > 0 ? "warn" : "ok"
  const metricSeverity = overCount > 0 ? "flag" : "ok"

  const support =
    overCount > 0 || approachingCount > 0 ? (
      <>
        {totalOverHours > 0 && (
          <>
            <span className="font-semibold text-crit">{totalOverHours} hrs delivered past auth — unreimbursed.</span>{" "}
          </>
        )}
        {withinCount} of {totalClients} within limits
        {overCount > 0 && (
          <>
            {" · "}
            <span className="font-semibold text-crit">{overCount} over</span>
          </>
        )}
        {approachingCount > 0 && (
          <>
            {" · "}
            <span className="font-semibold text-warn">{approachingCount} approaching</span>
          </>
        )}
        .
      </>
    ) : (
      `All ${totalClients} clients within authorized limits — no unreimbursed delivery this month.`
    )

  return (
    <PulsePillarCard
      id="auth-utilization"
      className={className}
      status={status}
      title="Authorization utilization"
      period={`This month · ${monthLabel}`}
      metric={overCount}
      unit="clients over authorized limit"
      metricSeverity={metricSeverity}
      size={tileSize}
      support={support}
    />
  )
}

export function AuthorizationUtilizationTile({
  className,
  teamFilter,
  clientIds,
  variant = "default",
  compact,
}: {
  className?: string
  teamFilter?: TeamFilter
  clientIds?: string[]
  variant?: "default" | "pulse"
  compact?: boolean
}) {
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getAuthUtilizationByMonth>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryTick, setRetryTick] = useState(0)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getAuthUtilizationByMonth(undefined, clientIds?.length ? { clientIds } : undefined)
      .then(setSummary)
      .catch((err) => setError(err.message ?? "Failed to load authorizations"))
      .finally(() => setLoading(false))
  }, [clientIds, retryTick])

  if (variant === "pulse") {
    return (
      <PulseAuthTile
        className={className}
        summary={summary}
        loading={loading}
        error={error}
        onRetry={() => setRetryTick((k) => k + 1)}
        clientIds={clientIds}
        compact={compact}
      />
    )
  }

  const teamClients = summary
    ? (clientIds?.length
        ? summary.byClient
        : teamFilter && teamFilter !== "All"
          ? summary.byClient.filter((c) => c.clientTeam === teamFilter)
          : summary.byClient)
    : []

  const sortedClients = [...teamClients].sort(sortByUtilizationDesc)

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
            <p className="text-sm text-muted-foreground">
              {clientIds?.length
                ? "No authorization records for this caseload yet."
                : "No billable sessions this month."}
            </p>
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
