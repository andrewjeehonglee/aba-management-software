import { HoursByStaffTile } from "@/components/HoursByStaffTile"

function App() {
  return (
    <div className="min-h-svh bg-background text-foreground flex flex-col items-center justify-center gap-4 p-6">
      <HoursByStaffTile />
      <p className="text-xs text-muted-foreground">Built by Andrew Lee · 2026</p>
    </div>
  )
}

export default App
