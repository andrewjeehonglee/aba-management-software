import { useState } from "react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { AuthorizationUtilizationTile } from "@/components/AuthorizationUtilizationTile"
import { HoursByStaffTile } from "@/components/HoursByStaffTile"
import { NotesOverdueTile } from "@/components/NotesOverdueTile"
import { SupervisionComplianceTile } from "@/components/SupervisionComplianceTile"
import { TodaySessionsTile } from "@/components/TodaySessionsTile"
import { ClientsListTile } from "@/components/ClientsListTile"
import {
  ROLE_DEFAULT_TEAM,
  TEAM_FILTERS,
  type TeamFilter,
} from "@/types/team"

// ─── Role definitions ─────────────────────────────────────────────────────────

const ROLES = ["Technician", "Supervisor", "BCBA", "Owner"] as const
type Role = typeof ROLES[number]

function canSee(role: Role): { hoursByStaff: boolean; authUtilization: boolean } {
  return {
    hoursByStaff:    role === "Owner",
    authUtilization: role !== "Technician",
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const [role, setRole] = useState<Role>("Owner")
  const [teamFilter, setTeamFilter] = useState<TeamFilter>("All")
  const visible = canSee(role)

  function handleRoleChange(newRole: Role) {
    setRole(newRole)
    setTeamFilter(ROLE_DEFAULT_TEAM[newRole] ?? "All")
  }

  return (
    <div className="min-h-svh bg-background text-foreground flex flex-col items-center gap-3 p-4">

      {/* ── Header ── */}
      <header className="flex w-full max-w-7xl items-center justify-between gap-4 border-b border-border py-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">ABA Dashboard</h1>
          <span className="text-sm text-muted-foreground">Last 7 days</span>
        </div>

        {/* Role toggle + sign out */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted-foreground hidden sm:block">Viewing as:</span>
          <div className="flex rounded-lg border border-border bg-muted p-0.5 gap-0.5">
            {ROLES.map(r => (
              <button
                key={r}
                onClick={() => handleRoleChange(r)}
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => supabase.auth.signOut()}
          >
            Sign Out
          </Button>
        </div>
      </header>

      {/* ── Team filter chips ── */}
      <div className="flex w-full max-w-7xl items-center gap-2 py-1">
        <span className="text-xs text-muted-foreground shrink-0">Team:</span>
        <div className="flex flex-wrap gap-1.5">
          {TEAM_FILTERS.map(t => (
            <button
              key={t}
              onClick={() => setTeamFilter(t)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                teamFilter === t
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/60 hover:text-foreground"
              }`}
            >
              {t === "All" ? "All Teams" : t}
            </button>
          ))}
        </div>
        {teamFilter !== "All" && (
          <span className="text-[11px] text-muted-foreground italic ml-1">
            Showing {teamFilter} only
          </span>
        )}
      </div>

      {/* ── Top row: Today's Sessions + Hours by Staff ── */}
      <div className="grid w-full max-w-7xl gap-4 lg:grid-cols-2">
        <div className={visible.hoursByStaff ? "" : "lg:col-span-2"}>
          <TodaySessionsTile teamFilter={teamFilter} />
        </div>
        {visible.hoursByStaff && <HoursByStaffTile teamFilter={teamFilter} />}
      </div>

      {/* ── Lower KPI tiles ── */}
      <div className="grid w-full max-w-7xl gap-4 lg:grid-cols-3">
        <NotesOverdueTile teamFilter={teamFilter} />
        <SupervisionComplianceTile teamFilter={teamFilter} />
        {visible.authUtilization && <AuthorizationUtilizationTile teamFilter={teamFilter} />}
      </div>

      {/* ── Clients (live Supabase data) ── */}
      <div className="w-full max-w-7xl">
        <ClientsListTile />
      </div>

      <p className="text-xs text-muted-foreground">Built by Andrew Lee · 2026</p>
    </div>
  )
}
