import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

export function DashboardPage({ practiceId, userRole, currentStaffId }: { practiceId?: string; userRole?: string; currentStaffId?: string | null }) {
  const role = normaliseRole(userRole ?? "technician")

  // Owners can preview the dashboard as any role. Non-owners are locked to their real role.
  const [viewRole, setViewRole] = useState<Role>(role)

  // Sync viewRole when the real role finishes loading from the DB (async in App.tsx).
  // Use a ref so the first async settle always wins, but a manual owner toggle afterwards
  // is not overwritten by a stale effect re-run.
  const roleSettled = useRef(false)
  useEffect(() => {
    if (!roleSettled.current) {
      roleSettled.current = true
      setViewRole(role)
    }
  }, [userRole]) // eslint-disable-line react-hooks/exhaustive-deps

  const [searchParams, setSearchParams] = useSearchParams()

  // Apply smart team default when no explicit ?team= param is present.
  const rawTeam = searchParams.get("team") ?? ROLE_DEFAULT_TEAM[viewRole] ?? "All"
  const teamFilter: TeamFilter = (TEAM_FILTERS as string[]).includes(rawTeam)
    ? (rawTeam as TeamFilter)
    : "All"
  const visible = canSee(viewRole)

  const [notesRefreshKey, setNotesRefreshKey] = useState(0)
  const [clientsRefreshKey, setClientsRefreshKey] = useState(0)
  const [staffRefreshKey, setStaffRefreshKey] = useState(0)
  const [copied, setCopied] = useState(false)

  const joinCode = practiceId ? practiceId.slice(0, 8).toUpperCase() : null

  function handleCopyCode() {
    if (!joinCode) return
    navigator.clipboard.writeText(joinCode.toLowerCase()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

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
    <div className="min-h-svh bg-background text-foreground flex flex-col items-center gap-3 p-4">

      {/* ── Header ── */}
      <header className="flex w-full max-w-7xl items-center justify-between gap-4 border-b border-border py-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">ABA Dashboard</h1>
          <span className="text-sm text-muted-foreground">Last 7 days</span>
        </div>

        {/* Sign out + role badge / owner view toggle */}
        <div className="flex items-center gap-3 shrink-0">
          {role === "Owner" ? (
            <div className="hidden sm:flex items-center rounded-full border border-border bg-muted p-0.5 gap-px">
              {ROLES.map(r => (
                <button
                  key={r}
                  onClick={() => setViewRole(r)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    viewRole === r
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          ) : (
            <span className="hidden sm:inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {role}
            </span>
          )}
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
              onClick={() => setSearchParams({ team: t })}
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
          <TodaySessionsTile
            teamFilter={teamFilter}
            staffId={viewRole === "Technician" ? (currentStaffId ?? undefined) : undefined}
          />
        </div>
        {visible.hoursByStaff && (
          <HoursByStaffTile
            teamFilter={teamFilter}
            refreshKey={staffRefreshKey}
            practiceId={practiceId}
            onStaffCreated={() => setStaffRefreshKey(k => k + 1)}
          />
        )}
      </div>

      {/* ── Lower KPI tiles ── */}
      <div className="grid w-full max-w-7xl gap-4 lg:grid-cols-3">
        <NotesOverdueTile teamFilter={teamFilter} refreshKey={notesRefreshKey} />
        <SupervisionComplianceTile teamFilter={teamFilter} />
        {visible.authUtilization && <AuthorizationUtilizationTile teamFilter={teamFilter} />}
      </div>

      {/* ── Clients (live Supabase data) ── */}
      <div className="w-full max-w-7xl">
        <ClientsListTile
          refreshKey={clientsRefreshKey}
          canAddClient={visible.addClient}
          practiceId={practiceId}
          onClientCreated={() => setClientsRefreshKey(k => k + 1)}
        />
      </div>

      {/* ── Team invite — Owner only ── */}
      {role === "Owner" && joinCode && (
        <div className="w-full max-w-7xl">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Invite Your Team</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Share this code with new staff. They enter it on the sign-up screen to join your practice as a technician.
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <span className="font-mono text-2xl font-bold tracking-[0.2em] text-foreground select-all">
                    {joinCode}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyCode}
                    className="h-7 px-2.5 text-xs shrink-0"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <p className="text-xs text-muted-foreground">Built by Andrew Lee · 2026</p>
    </div>
  )
}
