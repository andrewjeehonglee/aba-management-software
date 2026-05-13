import { AuthorizationUtilizationTile } from "@/components/AuthorizationUtilizationTile"
import { CertificationsExpiringTile } from "@/components/CertificationsExpiringTile"
import { HoursByStaffTile } from "@/components/HoursByStaffTile"
import { NotesOverdueTile } from "@/components/NotesOverdueTile"
import { SupervisionComplianceTile } from "@/components/SupervisionComplianceTile"
import { TodaySessionsTile } from "@/components/TodaySessionsTile"

export function DashboardPage() {
  return (
    <div className="min-h-svh bg-background text-foreground flex flex-col items-center gap-3 p-4">
      <header className="flex w-full max-w-7xl items-baseline justify-between border-b border-border py-6">
        <h1 className="text-2xl font-semibold tracking-tight">ABA Dashboard</h1>
        <span className="text-sm text-muted-foreground">Last 7 days</span>
      </header>

      {/* Top row: 2 wide tiles */}
      <div className="grid w-full max-w-7xl gap-4 lg:grid-cols-2">
        <TodaySessionsTile />
        <HoursByStaffTile />
      </div>

      {/* Bottom rows: 4 KPI tiles in a 3-col grid. CSS auto-flow puts the
          4th tile in row 2 column 1, leaving two empty cells to its right.
          Honest "we added a 6th tile, here's where it landed" layout — and
          the empty cells signal "more dashboard tiles can fit here."
          Avoids the lg:grid-cols-4 trap where the existing mini-bar tiles
          would get their staff-name columns clipped. */}
      <div className="grid w-full max-w-7xl gap-4 lg:grid-cols-3">
        <NotesOverdueTile />
        <SupervisionComplianceTile />
        <AuthorizationUtilizationTile />
        <CertificationsExpiringTile />
      </div>

      <p className="text-xs text-muted-foreground">Built by Andrew Lee · 2026</p>
    </div>
  )
}
