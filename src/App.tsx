import { AuthorizationUtilizationTile } from "@/components/AuthorizationUtilizationTile"
import { HoursByStaffTile } from "@/components/HoursByStaffTile"
import { NotesOverdueTile } from "@/components/NotesOverdueTile"
import { SupervisionComplianceTile } from "@/components/SupervisionComplianceTile"
import { TodaySessionsTile } from "@/components/TodaySessionsTile"

function App() {
  return (
    <div className="min-h-svh bg-background text-foreground flex flex-col items-center gap-4 p-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <TodaySessionsTile />
        <HoursByStaffTile />
        <NotesOverdueTile />
        <SupervisionComplianceTile />
        <AuthorizationUtilizationTile />
      </div>
      <p className="text-xs text-muted-foreground">Built by Andrew Lee · 2026</p>
    </div>
  )
}

export default App
