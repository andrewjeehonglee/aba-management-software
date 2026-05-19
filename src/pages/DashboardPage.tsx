import { useState } from "react"
import { AuthorizationUtilizationTile } from "@/components/AuthorizationUtilizationTile"
import { HoursByStaffTile } from "@/components/HoursByStaffTile"
import { NotesOverdueTile } from "@/components/NotesOverdueTile"
import { SupervisionComplianceTile } from "@/components/SupervisionComplianceTile"
import { TodaySessionsTile } from "@/components/TodaySessionsTile"

// ─── Role definitions ─────────────────────────────────────────────────────────

const ROLES = ["Technician", "Supervisor", "BCBA", "Owner"] as const
type Role = typeof ROLES[number]

// Returns which tiles are visible for a given role.
function canSee(role: Role): { hoursByStaff: boolean; authUtilization: boolean } {
  return {
    hoursByStaff:    role === "Owner",
    authUtilization: role !== "Technician",
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const [role, setRole] = useState<Role>("Owner")
  const visible = canSee(role)

  return (
    <div className="min-h-svh bg-background text-foreground flex flex-col items-center gap-3 p-4">

      {/* ── Header ── */}
      <header className="flex w-full max-w-7xl items-center justify-between gap-4 border-b border-border py-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">ABA Dashboard</h1>
          <span className="text-sm text-muted-foreground">Last 7 days</span>
        </div>

        {/* Role toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground hidden sm:block">Viewing as:</span>
          <div className="flex rounded-lg border border-border bg-muted p-0.5 gap-0.5">
            {ROLES.map(r => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  role === r
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Top row: Today's Sessions + Hours by Staff ── */}
      <div className="grid w-full max-w-7xl gap-4 lg:grid-cols-2">
        {/* TodaySessionsTile spans full width when HoursByStaff is hidden */}
        <div className={visible.hoursByStaff ? "" : "lg:col-span-2"}>
          <TodaySessionsTile />
        </div>
        {visible.hoursByStaff && <HoursByStaffTile />}
      </div>

      {/* ── Lower KPI tiles ── */}
      <div className="grid w-full max-w-7xl gap-4 lg:grid-cols-3">
        <NotesOverdueTile />
        <SupervisionComplianceTile />
        {visible.authUtilization && <AuthorizationUtilizationTile />}
      </div>

      <p className="text-xs text-muted-foreground">Built by Andrew Lee · 2026</p>
    </div>
  )
}
