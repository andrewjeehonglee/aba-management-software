import { useState } from "react"
import { Link } from "react-router-dom"
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
import { mockAuthorizations } from "@/data/mockAuthorizations"
import { toSlug } from "@/lib/slug"
import { cn } from "@/lib/utils"
import type { ClientAuthorization } from "@/types/authorization"

// Authorization utilization is INVERTED from supervision: high % = bad.
// A client at 90%+ is about to hit the cap on insurance-authorized hours;
// Jenny wants to start the re-auth paperwork before that happens.
// Source: Jenny (target user) — May 5 working doc.
const FLAGGED_THRESHOLD = 80
const RED_THRESHOLD = 85
const AMBER_LOWER = 75

function utilizationClass(pct: number): { bar: string; text: string } {
  if (pct >= RED_THRESHOLD) return { bar: "bg-red-500",     text: "text-red-700" }
  if (pct >= AMBER_LOWER)   return { bar: "bg-amber-500",   text: "text-amber-700" }
  return                           { bar: "bg-emerald-500", text: "text-emerald-700" }
}

// Severity coloring for the BIG headline number — count of clients above the
// 80% utilization threshold. >=5 means a meaningful chunk of the caseload is
// approaching their auth cap; 1-4 is a few re-auth conversations to start;
// 0 is fully under control.
function headlineClass(flaggedCount: number): string {
  if (flaggedCount >= 5) return "text-red-600"
  if (flaggedCount >= 1) return "text-amber-600"
  return "text-emerald-600"
}

function MiniBar({ pct }: { pct: number }) {
  const { bar } = utilizationClass(pct)
  return (
    <div className="relative h-2 w-44 overflow-hidden rounded-full bg-slate-200">
      <div
        className={`h-full ${bar}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
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
    compare: (a: ClientAuthorization, b: ClientAuthorization) =>
      b.utilizationPct - a.utilizationPct ||
      a.clientName.localeCompare(b.clientName),
  },
  name: {
    label: "Client name (A → Z)",
    compare: (a: ClientAuthorization, b: ClientAuthorization) =>
      a.clientName.localeCompare(b.clientName),
  },
  pctAsc: {
    label: "Utilization % (low → high)",
    compare: (a: ClientAuthorization, b: ClientAuthorization) =>
      a.utilizationPct - b.utilizationPct ||
      a.clientName.localeCompare(b.clientName),
  },
} as const

type SortKey = keyof typeof SORT_OPTIONS

export function AuthorizationUtilizationTile({ className }: { className?: string }) {
  const [sortKey, setSortKey] = useState<SortKey>("pctDesc")

  const sortedClients = [...mockAuthorizations].sort(
    SORT_OPTIONS[sortKey].compare
  )

  const flaggedCount = sortedClients.filter(
    (c) => c.utilizationPct > FLAGGED_THRESHOLD
  ).length
  const totalClients = sortedClients.length

  return (
    <Card size="sm" className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>Authorization Utilization</CardTitle>
        <CardDescription className="text-xs">
          Clients above {FLAGGED_THRESHOLD}% utilization flagged
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
            of {totalClients} clients above threshold
          </span>
        </div>

        <ul className="mt-3 space-y-2 border-t pt-3">
          {sortedClients.map((client) => {
            const { text } = utilizationClass(client.utilizationPct)
            return (
              <li
                key={client.clientName}
                className="flex items-center gap-3 text-sm"
              >
                <span className="flex-1 truncate min-w-0">
                  <Link
                    to={"/clients/" + toSlug(client.clientName)}
                    className="hover:underline underline-offset-2"
                  >
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
      </CardContent>
    </Card>
  )
}
