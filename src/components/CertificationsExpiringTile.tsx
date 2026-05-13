import { CircleCheck } from "lucide-react"
import { Link } from "react-router-dom"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { mockStaff } from "@/data/mockStaff"
import { toSlug } from "@/lib/slug"
import {
  CERT_URGENT_DAYS,
  CERT_WARNING_DAYS,
  daysUntil,
  parseCertification,
} from "@/lib/staff"
import { cn } from "@/lib/utils"

// Today is computed at module-import time. For a real product this would be
// recomputed per render (or, better, server-driven). For the demo this is
// fine — the tile reflects "today as of when the page loaded."
const TODAY = new Date()

// Headline severity matches the other KPI tiles: 0 expiring is the all-clear
// (emerald), 1-2 is "manageable" (amber), 3+ is "needs attention" (red).
function headlineClass(count: number): string {
  if (count >= 3) return "text-red-600"
  if (count >= 1) return "text-amber-600"
  return "text-emerald-600"
}

// Per-row severity for the days-until-expiry chip. Mirrors the user-spec'd
// thresholds (≤ 30 = red, 31-90 = amber). Anything outside that window
// is filtered out before reaching this function.
function expiryChipClass(daysLeft: number): string {
  if (daysLeft <= CERT_URGENT_DAYS) return "bg-red-100 text-red-800"
  return "bg-amber-100 text-amber-800"
}

// Plain-English label for the days-until-expiry — "Today" / "Tomorrow" /
// "In N days". Reads less robotic than always emitting "X days".
function formatDaysLeft(daysLeft: number): string {
  if (daysLeft < 0)  return `Expired ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"} ago`
  if (daysLeft === 0) return "Expires today"
  if (daysLeft === 1) return "Expires tomorrow"
  return `In ${daysLeft} days`
}

interface ExpiringRow {
  name: string
  certType: string
  daysLeft: number
}

export function CertificationsExpiringTile({ className }: { className?: string }) {
  // Parse every staff cert string into a normalized row, then keep only
  // those expiring within the warning window. Skip silently if the string
  // can't be parsed (defensive — bad data shouldn't crash the dashboard).
  const expiring: ExpiringRow[] = mockStaff
    .map((staff) => {
      const parsed = parseCertification(staff.certification)
      if (!parsed) return null
      const daysLeft = daysUntil(parsed.expiryDate, TODAY)
      return { name: staff.name, certType: parsed.type, daysLeft }
    })
    .filter((row): row is ExpiringRow => row !== null && row.daysLeft <= CERT_WARNING_DAYS)
    .sort((a, b) => a.daysLeft - b.daysLeft)

  return (
    <Card size="sm" className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>Certifications Expiring Soon</CardTitle>
        <CardDescription className="text-xs">
          Within the next {CERT_WARNING_DAYS} days
        </CardDescription>
      </CardHeader>
      <CardContent>
        {expiring.length === 0 ? (
          /* Affirmative empty state — different visual language than the
             dashed-border "no data" empty states elsewhere. This is a
             celebratory "good news" outcome, so it earns an emerald tint
             and a check icon. */
          <div className="flex items-center gap-2 rounded-md bg-emerald-50 p-4 text-sm text-emerald-800">
            <CircleCheck className="size-4 shrink-0" aria-hidden="true" />
            <span>All certifications current.</span>
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-4xl font-semibold tabular-nums leading-none ${headlineClass(expiring.length)}`}
              >
                {expiring.length}
              </span>
              <span className="text-xs text-muted-foreground">
                within {CERT_WARNING_DAYS} days
              </span>
            </div>

            <ul className="mt-3 space-y-2 border-t pt-3">
              {expiring.map((row) => (
                <li
                  key={row.name}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate">
                      <Link
                        to={"/staff/" + toSlug(row.name)}
                        className="hover:underline underline-offset-2"
                      >
                        {row.name}
                      </Link>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {row.certType}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 text-right">
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {formatDaysLeft(row.daysLeft)}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${expiryChipClass(row.daysLeft)}`}
                    >
                      {row.daysLeft <= CERT_URGENT_DAYS ? "Urgent" : "Warning"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}
