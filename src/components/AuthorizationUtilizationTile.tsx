import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { mockAuthorizations } from "@/data/mockAuthorizations"

// Authorization utilization is INVERTED from supervision: high % = bad.
// A client at 90%+ is about to hit the cap on insurance-authorized hours;
// Jenny wants to start the re-auth paperwork before that happens.
// Source: Jenny (target user) — May 5 working doc.
const FLAGGED_THRESHOLD = 80 // >= 81 trips the headline count
const RED_THRESHOLD = 85
const AMBER_LOWER = 75

function utilizationClass(pct: number): { bar: string; text: string } {
  if (pct >= RED_THRESHOLD) return { bar: "bg-red-500",     text: "text-red-700" }
  if (pct >= AMBER_LOWER)   return { bar: "bg-amber-500",   text: "text-amber-700" }
  return                           { bar: "bg-emerald-500", text: "text-emerald-700" }
}

function MiniBar({ pct }: { pct: number }) {
  const { bar } = utilizationClass(pct)
  return (
    <div className="relative h-2 w-32 overflow-hidden rounded-full bg-slate-200">
      <div
        className={`h-full ${bar}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
      {/* Threshold marker at the 80% line — bars that cross it are flagged. */}
      <div
        className="absolute inset-y-0 w-px bg-slate-500/70"
        style={{ left: `${FLAGGED_THRESHOLD}%` }}
        aria-hidden="true"
      />
    </div>
  )
}

export function AuthorizationUtilizationTile() {
  const sortedClients = [...mockAuthorizations].sort(
    (a, b) =>
      b.utilizationPct - a.utilizationPct ||
      a.clientName.localeCompare(b.clientName)
  )

  const flaggedCount = sortedClients.filter(
    (c) => c.utilizationPct > FLAGGED_THRESHOLD
  ).length
  const totalClients = sortedClients.length

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Authorization Utilization</CardTitle>
        <CardDescription className="text-xs">
          Clients above {FLAGGED_THRESHOLD}% utilization flagged
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="text-4xl font-semibold tabular-nums leading-none">
            {flaggedCount}
          </div>
          <div className="text-xs text-muted-foreground">
            of {totalClients} clients above threshold
          </div>
        </div>

        <ul className="mt-4 space-y-2 border-t pt-4">
          {sortedClients.map((client) => {
            const { text } = utilizationClass(client.utilizationPct)
            return (
              <li
                key={client.clientName}
                className="flex items-center gap-3 text-sm"
              >
                <span className="flex-1 truncate min-w-0">
                  {client.clientName}
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
