import { HoursByStaffTile } from "@/components/HoursByStaffTile"
import { TodaySessionsTile } from "@/components/TodaySessionsTile"

function App() {
  return (
    <div className="min-h-svh bg-background text-foreground flex flex-col items-center justify-center gap-4 p-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <TodaySessionsTile />
        <HoursByStaffTile />
      </div>
      <p className="text-xs text-muted-foreground">Built by Andrew Lee · 2026</p>
    </div>
  )
}

export default App
