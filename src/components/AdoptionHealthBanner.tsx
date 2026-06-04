import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Activity } from "lucide-react"
import { getAdoptionHealthStats, type AdoptionHealthStats } from "@/lib/supabase"

function rateColor(rate: number) {
  if (rate >= 80) return "text-emerald-600"
  if (rate >= 60) return "text-amber-600"
  return "text-red-600"
}

export function AdoptionHealthBanner() {
  const [stats, setStats] = useState<AdoptionHealthStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAdoptionHealthStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return null

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-border bg-card px-5 py-3 shadow-sm">
      <div className="flex items-center gap-2 shrink-0">
        <Activity className="w-4 h-4 text-[#14A0A5]" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Adoption Health
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          Owner
        </span>
      </div>

      {stats ? (
        <>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold tabular-nums text-[#0D7377]">
              {stats.activeStaffThisWeek}
              <span className="text-sm font-normal text-muted-foreground">/{stats.totalStaff}</span>
            </span>
            <span className="text-xs text-muted-foreground">staff active this week</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-xl font-bold tabular-nums ${rateColor(stats.completionRate)}`}>
              {stats.completionRate}%
            </span>
            <span className="text-xs text-muted-foreground">completion rate</span>
          </div>
          <div className="ml-auto shrink-0">
            <Link
              to="/#notes-overdue"
              className="text-xs text-primary hover:underline underline-offset-2"
              onClick={e => {
                e.preventDefault()
                document.getElementById("notes-overdue")?.scrollIntoView({ behavior: "smooth" })
              }}
            >
              View overdue notes ↓
            </Link>
          </div>
        </>
      ) : (
        <span className="text-xs text-muted-foreground">No data yet.</span>
      )}
    </div>
  )
}
