import { AuthorizationUtilizationTile } from "@/components/AuthorizationUtilizationTile"
import { HoursByStaffTile } from "@/components/HoursByStaffTile"
import { NotesOverdueTile } from "@/components/NotesOverdueTile"
import { SupervisionComplianceTile } from "@/components/SupervisionComplianceTile"
import { TodaySessionsTile } from "@/components/TodaySessionsTile"

function App() {
  return (
    <div className="min-h-svh bg-background text-foreground flex flex-col items-center gap-3 p-4">
      <div className="grid w-full max-w-7xl gap-4 lg:grid-cols-6">
        {/* Top row: 3 KPI tiles, each spans 2 of 6 columns at lg+ */}
        <TodaySessionsTile className="lg:col-span-2" />
        <NotesOverdueTile className="lg:col-span-2" />
        <AuthorizationUtilizationTile className="lg:col-span-2" />

        {/* Bottom row: narrow KPI (2 cols) + wide chart (4 cols) */}
        <SupervisionComplianceTile className="lg:col-span-2" />
        <HoursByStaffTile className="lg:col-span-4" />
      </div>
      <p className="text-xs text-muted-foreground">Built by Andrew Lee · 2026</p>
    </div>
  )
}

export default App
