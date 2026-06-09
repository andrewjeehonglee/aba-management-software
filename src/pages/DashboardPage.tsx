import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { AuthorizationUtilizationTile } from "@/components/AuthorizationUtilizationTile"
import { DashboardCalendarTile } from "@/components/DashboardCalendarTile"
import { HoursByStaffTile } from "@/components/HoursByStaffTile"
import { NotesOverdueTile } from "@/components/NotesOverdueTile"
import { setRolePreview } from "@/lib/rolePreview"
import {
  ROLE_DEFAULT_TEAM,
  TEAM_FILTERS,
  type TeamFilter,
} from "@/types/team"

// ─── Role definitions ─────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DashboardPage({
  practiceId,
  userRole,
  currentStaffId,
  isDemo,
}: {
  practiceId?: string
  userRole?: string
  currentStaffId?: string | null
  isDemo?: boolean
}) {
  const role = normaliseRole(userRole ?? "technician")

  const [viewRole, setViewRole] = useState<Role>(role)

  useEffect(() => {
    console.log('[DashboardPage] userRole prop:', userRole, '→ role:', role)
    setViewRole(role)
  }, [userRole]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (role === "Owner") setRolePreview(viewRole)
  }, [viewRole, role])

  const [searchParams, setSearchParams] = useSearchParams()

  const isOwnerView = viewRole === "Owner"

  const scopedTeam: TeamFilter =
    isOwnerView ? "All" : (ROLE_DEFAULT_TEAM[viewRole] ?? "All")

  useEffect(() => {
    if (isOwnerView) return
    const team = ROLE_DEFAULT_TEAM[viewRole] ?? "All"
    if (searchParams.get("team") !== team) {
      setSearchParams({ team }, { replace: true })
    }
  }, [viewRole]) // eslint-disable-line react-hooks/exhaustive-deps

  const rawTeam = searchParams.get("team") ?? scopedTeam
  const teamFilter: TeamFilter = (TEAM_FILTERS as string[]).includes(rawTeam)
    ? (rawTeam as TeamFilter)
    : scopedTeam

  const effectiveTeamFilter: TeamFilter = isOwnerView ? "All" : teamFilter

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

      <header className={`-mx-4 -mt-4 mb-0 flex w-[calc(100%+2rem)] items-center justify-between gap-4 border-b border-slate-200 px-6 py-4 shadow-sm ${isDemo ? "bg-amber-50/60" : "bg-white"}`}>
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl font-bold tracking-tight text-[#0D7377] shrink-0">Pulse</span>
          <span className="hidden sm:block text-sm text-slate-400 truncate">ABA Management</span>
        </div>

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

      {!isOwnerView && (
        <div className="flex w-full max-w-7xl items-center gap-2 py-1">
          <span className="text-xs text-muted-foreground shrink-0">Team:</span>
          <span className="rounded-full border border-[#0D7377] bg-[#0D7377] px-3 py-1 text-xs font-medium text-white">
            {scopedTeam}
          </span>
          {teamFilter !== "All" && (
            <span className="text-[11px] text-muted-foreground italic ml-1">
              Your team only
            </span>
          )}
        </div>
      )}

      {isOwnerView ? (
        <div className="grid w-full max-w-7xl gap-4 lg:grid-cols-3">
          <div id="notes-overdue">
            <NotesOverdueTile refreshKey={notesRefreshKey} />
          </div>
          <HoursByStaffTile
            teamFilter={effectiveTeamFilter}
            refreshKey={staffRefreshKey}
            practiceId={practiceId}
            onStaffCreated={() => setStaffRefreshKey(k => k + 1)}
          />
          <AuthorizationUtilizationTile teamFilter={effectiveTeamFilter} />
        </div>
      ) : (
        <div className="w-full max-w-7xl">
          <DashboardCalendarTile
            viewRole={viewRole}
            isOwnerPreview={role === "Owner"}
            currentStaffId={currentStaffId ?? null}
          />
        </div>
      )}

      <p className="text-xs text-muted-foreground">Built by Andrew Lee · 2026</p>
    </div>
  )
}
