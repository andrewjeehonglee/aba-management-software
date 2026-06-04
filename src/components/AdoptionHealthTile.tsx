import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getAdoptionHealthStats, type AdoptionHealthStats } from "@/lib/supabase"

function StatBlock({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div className="space-y-0.5">
      <p className={`text-4xl font-bold tracking-tight tabular-nums leading-none ${color ?? "text-foreground"}`}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

export function AdoptionHealthTile() {
  const [stats, setStats] = useState<AdoptionHealthStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAdoptionHealthStats()
      .then(setStats)
      .catch(e => setError(e.message ?? "Failed to load"))
      .finally(() => setLoading(false))
  }, [])

  const rateColor = (rate: number) =>
    rate >= 80 ? "text-emerald-600" : rate >= 60 ? "text-amber-600" : "text-red-600"

  const borderClass = stats && stats.completionRate < 80 ? "border-l-4 border-l-amber-500" : ""

  return (
    <Card className={`w-full ${borderClass}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2">
          <span>Adoption Health</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Owner
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <p className="py-6 text-center text-sm text-muted-foreground animate-pulse">Loading…</p>
        )}
        {error && (
          <p className="py-6 text-center text-sm text-destructive">{error}</p>
        )}
        {!loading && !error && stats && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <StatBlock
                value={`${stats.activeStaffThisWeek} / ${stats.totalStaff}`}
                label="Staff active this week"
              />
              <StatBlock
                value={`${stats.completionRate}%`}
                label={`Completion rate (${stats.totalSessionsThisWeek} sessions)`}
                color={rateColor(stats.completionRate)}
              />
            </div>

            {/* Progress bar for staff activity */}
            {stats.totalStaff > 0 && (
              <div className="space-y-1">
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.round((stats.activeStaffThisWeek / stats.totalStaff) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            <Link
              to="/#notes-overdue"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline underline-offset-2"
              onClick={e => {
                e.preventDefault()
                document.getElementById("notes-overdue")?.scrollIntoView({ behavior: "smooth" })
              }}
            >
              View overdue notes ↓
            </Link>
          </div>
        )}
        {!loading && !error && !stats && (
          <div className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <Activity className="w-8 h-8 text-[#14A0A5]" />
            No adoption data yet.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
