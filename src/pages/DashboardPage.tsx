import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { AuthorizationUtilizationTile } from "@/components/AuthorizationUtilizationTile"
import { HoursByStaffTile } from "@/components/HoursByStaffTile"
import { NotesOverdueTile } from "@/components/NotesOverdueTile"
import { PracticeHeroTile } from "@/components/PracticeHeroTile"
import { SupervisionComplianceTile } from "@/components/SupervisionComplianceTile"
import { TodaySessionsTile } from "@/components/TodaySessionsTile"
import {
  ROLE_DEFAULT_TEAM,
  TEAM_FILTERS,
  type TeamFilter,
} from "@/types/team"

// ─── Role definitions ─────────────────────────────────────────────────────────

// Normalise the lowercase DB role string ("owner", "bcba", …) to the display
// casing used throughout canSee so the rest of the component is unchanged.
type Role = "Technician" | "Supervisor" | "BCBA" | "Owner"

const ROLES: Role[] = ["Owner", "BCBA", "Supervisor", "Technician"]

function normaliseRole(raw: string): Role {
  const map: Record<string, Role> = {
    owner:      "Owner",
    bcba:       "BCBA",
    supervisor: "Supervisor",
    technician: "Technician",
  }
  return map[raw.toLowerCase()] ?? "Technician"
}

function canSee(role: Role): { hoursByStaff: boolean; authUtilization: boolean; addClient: boolean } {
  return {
    hoursByStaff:    role === "Owner",
    authUtilization: role !== "Technician",
    addClient:       role === "Owner" || role === "BCBA",
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DashboardPage({ practiceId, userRole, currentStaffId, isDemo }: { practiceId?: string; userRole?: string; currentStaffId?: string | null; isDemo?: boolean }) {
  const role = normaliseRole(userRole ?? "technician")

  // Owners can preview the dashboard as any role. Non-owners are locked to their real role.
  const [viewRole, setViewRole] = useState<Role>(role)

  // Sync viewRole whenever the real role arrives from the DB (async in App.tsx).
  // The initial render uses the "technician" default; this effect fires again once
  // getUserRole() resolves and the prop updates to the real value (e.g. "owner").
  // Safe to run unconditionally because userRole only changes on auth events —
  // an Owner's manual view-toggle won't be overwritten here.
  useEffect(() => {
    console.log('[DashboardPage] userRole prop:', userRole, '→ role:', role)
    setViewRole(role)
  }, [userRole]) // eslint-disable-line react-hooks/exhaustive-deps

  const [searchParams, setSearchParams] = useSearchParams()

  // Apply smart team default when no explicit ?team= param is present.
  const rawTeam = searchParams.get("team") ?? ROLE_DEFAULT_TEAM[viewRole] ?? "All"
  const teamFilter: TeamFilter = (TEAM_FILTERS as string[]).includes(rawTeam)
    ? (rawTeam as TeamFilter)
    : "All"
  const visible = canSee(viewRole)

  const [notesRefreshKey, setNotesRefreshKey] = useState(0)
  const [staffRefreshKey, setStaffRefreshKey] = useState(0)

  useEffect(() => {
    if (searchParams.get("refresh") === "notes") {
      setNotesRefreshKey(k => k + 1)
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        next.delete("refresh")
        return next
      }, { replace: true })
    }
  }, [])

  return (
    <div className="min-h-svh bg-[#F0F4F4] text-foreground flex flex-col items-center gap-4 p-4">

      {/* ── Header ── */}
      <header className={`-mx-4 -mt-4 mb-0 flex w-[calc(100%+2rem)] items-center justify-between gap-4 border-b border-slate-200 px-6 py-4 shadow-sm ${isDemo ? "bg-amber-50/60" : "bg-white"}`}>
        {/* Left: Pulse wordmark + subtitle */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl font-bold tracking-tight text-[#0D7377] shrink-0">Pulse</span>
          <span className="hidden sm:block text-sm text-slate-400 truncate">ABA Management</span>
        </div>

        {/* Right: role controls + sign out */}
        <div className="flex items-center gap-3 shrink-0">
          {role === "Owner" ? (
            <div className="hidden sm:flex items-center rounded-full border border-[#D0DCDC] bg-[#E8F7F7] p-0.5 gap-px">
              {ROLES.map(r => (
                <button
                  key={r}
                  onClick={() => setViewRole(r)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    viewRole === r
                      ? "bg-white text-[#0D7377] shadow-sm"
                      : "text-[#4A5C5C] hover:text-[#0D7377]"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          ) : (
            <span className="hidden sm:inline-flex items-center rounded-full bg-[#E8F7F7] px-2.5 py-1 text-xs font-medium text-[#0D7377]">
              {role}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-pulse-muted hover:text-pulse-text"
            onClick={() => supabase.auth.signOut()}
          >
            Sign out
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
              onClick={() => setSearchParams({ team: t })}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                teamFilter === t
                  ? "bg-[#0D7377] text-white border-[#0D7377]"
                  : "border-[#D0DCDC] text-[#4A5C5C] hover:border-[#14A0A5] hover:text-[#0D7377]"
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

      {/* ── Row 1: Practice Hero (full width) ── */}
      <div className="w-full max-w-7xl">
        <PracticeHeroTile />
      </div>

      {/* ── Row 2: 3 KPI tiles ── */}
      <div className="grid w-full max-w-7xl gap-4 lg:grid-cols-3">
        <div id="notes-overdue">
          <NotesOverdueTile teamFilter={teamFilter} refreshKey={notesRefreshKey} />
        </div>
        <SupervisionComplianceTile teamFilter={teamFilter} />
        {visible.authUtilization && <AuthorizationUtilizationTile teamFilter={teamFilter} />}
      </div>

      {/* ── Row 3: Today's Sessions + Hours by Staff ── */}
      <div className="grid w-full max-w-7xl gap-4 lg:grid-cols-2">
        <div className={visible.hoursByStaff ? "" : "lg:col-span-2"}>
          <TodaySessionsTile
            teamFilter={teamFilter}
            staffId={viewRole === "Technician" ? (currentStaffId ?? undefined) : undefined}
            isDemo={isDemo}
          />
        </div>
        {visible.hoursByStaff && (
          <HoursByStaffTile
            teamFilter={teamFilter}
            refreshKey={staffRefreshKey}
            practiceId={practiceId}
            isDemo={isDemo}
            onStaffCreated={() => setStaffRefreshKey(k => k + 1)}
          />
        )}
      </div>

      <p className="text-xs text-muted-foreground">Built by Andrew Lee · 2026</p>
    </div>
  )
}
