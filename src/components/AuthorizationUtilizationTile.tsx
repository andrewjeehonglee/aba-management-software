import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { AlertCircle, AlertTriangle, BadgeCheck, Info } from "lucide-react"
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
import { getAuthorizations, type AuthRecord } from "@/lib/supabase"
import { FLAGGED_THRESHOLD, utilizationClass } from "@/lib/authorization"
import { toSlug } from "@/lib/slug"
import { cn } from "@/lib/utils"
import type { TeamFilter } from "@/types/team"

// Urgency thresholds
const CRITICAL_THRESHOLD = 3
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
  const { bar } = utilizationClass(pct)
  return (
    <div className="relative h-2 w-44 overflow-hidden rounded-full bg-slate-200">
      <div className={`h-full ${bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      <div
        className="absolute inset-y-0 w-px bg-slate-500/70"
        style={{ left: `${FLAGGED_THRESHOLD}%` }}
        aria-hidden="true"
      />
    </div>
  )
}

const SORT_OPTIONS = {
  pctDesc: {
    label: "Utilization % (high → low)",
    compare: (a: AuthRecord, b: AuthRecord) =>
      b.utilizationPct - a.utilizationPct || a.clientName.localeCompare(b.clientName),
  },
  name: {
    label: "Client name (A → Z)",
    compare: (a: AuthRecord, b: AuthRecord) =>
      a.clientName.localeCompare(b.clientName),
  },
  pctAsc: {
    label: "Utilization % (low → high)",
    compare: (a: AuthRecord, b: AuthRecord) =>
      a.utilizationPct - b.utilizationPct || a.clientName.localeCompare(b.clientName),
  },
} as const

type SortKey = keyof typeof SORT_OPTIONS

export function AuthorizationUtilizationTile({ className, teamFilter }: { className?: string; teamFilter?: TeamFilter }) {
  const [sortKey, setSortKey] = useState<SortKey>("pctDesc")
  const [allAuthorizations, setAllAuthorizations] = useState<AuthRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAuthorizations()
      .then(setAllAuthorizations)
      .catch((err) => setError(err.message ?? "Failed to load authorizations"))
      .finally(() => setLoading(false))
  }, [])

  const teamAuthorizations = teamFilter && teamFilter !== "All"
    ? allAuthorizations.filter(a => a.clientTeam === teamFilter)
    : allAuthorizations

  const sortedClients = [...teamAuthorizations].sort(SORT_OPTIONS[sortKey].compare)
  const flaggedCount = sortedClients.filter(c => c.utilizationPct > FLAGGED_THRESHOLD).length
  const totalClients = sortedClients.length
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
          Authorization Utilization
          <span
            title={`Tracks how much of each client's authorized therapy hours have been used. Clients above ${FLAGGED_THRESHOLD}% are approaching their auth cap and need re-authorization soon.`}
            className="inline-flex cursor-help ml-0.5"
          >
            <Info className="w-3.5 h-3.5 text-slate-400" />
          </span>
        </CardTitle>
        <CardDescription className="text-xs">
          Clients above {FLAGGED_THRESHOLD}% utilization flagged
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
        {!loading && !error && sortedClients.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border py-8 text-center">
            <BadgeCheck className="w-8 h-8 text-[#14A0A5]" />
            <p className="text-sm text-muted-foreground">No authorizations found.</p>
          </div>
        )}
        {!loading && !error && sortedClients.length > 0 && (
          <>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-bold tracking-tight tabular-nums leading-none ${headlineColorClass(flaggedCount)}`}>
                {flaggedCount}
              </span>
              <span className="text-xs text-muted-foreground">
                of {totalClients} clients above threshold
              </span>
            </div>

            <ul className="mt-3 space-y-2 border-t pt-3">
              {sortedClients.map((client) => {
                const { text } = utilizationClass(client.utilizationPct)
                return (
                  <li key={client.id} className="flex items-center gap-3 text-sm">
                    <span className="flex-1 truncate min-w-0">
                      <Link to={"/clients/" + toSlug(client.clientName)} className="hover:underline underline-offset-2">
                        {client.clientName}
                      </Link>
                    </span>
                    <MiniBar pct={client.utilizationPct} />
                    <span className={`w-12 text-right tabular-nums font-medium ${text}`}>
                      {client.utilizationPct.toFixed(0)}%
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
