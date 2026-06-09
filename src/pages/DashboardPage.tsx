import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { AuthorizationUtilizationTile } from "@/components/AuthorizationUtilizationTile"
import { DashboardCalendarTile } from "@/components/DashboardCalendarTile"
import { HoursByStaffTile } from "@/components/HoursByStaffTile"
import { MyHoursTile } from "@/components/MyHoursTile"
import { NotesOverdueTile } from "@/components/NotesOverdueTile"
import { SupervisionComplianceTile } from "@/components/SupervisionComplianceTile"
import {
  getStaffFullName,
  resolveCaseloadFilters,
  resolveEffectiveStaffId,
} from "@/lib/dashboardScope"
import { setRolePreview } from "@/lib/rolePreview"

type Role = "Technician" | "Supervisor" | "BCBA" | "Owner"
type CalendarRole = "Technician" | "Supervisor" | "BCBA"

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
    setViewRole(role)
  }, [userRole]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (role === "Owner") setRolePreview(viewRole)
  }, [viewRole, role])

  const [searchParams, setSearchParams] = useSearchParams()
  const isOwnerView = viewRole === "Owner"
  const isBcbaOrSupervisor = viewRole === "BCBA" || viewRole === "Supervisor"
  const isTechnician = viewRole === "Technician"
  const isOwnerPreview = role === "Owner" && !isOwnerView

  const [notesRefreshKey, setNotesRefreshKey] = useState(0)
  const [staffRefreshKey, setStaffRefreshKey] = useState(0)

  const [effectiveStaffId, setEffectiveStaffId] = useState<string | null>(null)
  const [staffDisplayName, setStaffDisplayName] = useState("")
  const [scopeStaffIds, setScopeStaffIds] = useState<string[]>([])
  const [scopeClientIds, setScopeClientIds] = useState<string[]>([])
  const [scopeSuperviseeIds, setScopeSuperviseeIds] = useState<string[]>([])
  const [scopeLoading, setScopeLoading] = useState(false)

  useEffect(() => {
    if (searchParams.get("refresh") === "notes") {
      setNotesRefreshKey((k) => k + 1)
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete("refresh")
        return next
      }, { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOwnerView) {
      setEffectiveStaffId(null)
      setStaffDisplayName("")
      setScopeStaffIds([])
      setScopeClientIds([])
      setScopeSuperviseeIds([])
      return
    }

    const calendarRole = viewRole as CalendarRole
    setScopeLoading(true)

    resolveEffectiveStaffId(currentStaffId ?? null, calendarRole, isOwnerPreview)
      .then(async (id) => {
        setEffectiveStaffId(id)
        if (!id) {
          setStaffDisplayName("")
          setScopeStaffIds([])
          setScopeClientIds([])
          setScopeSuperviseeIds([])
          return
        }

        const name = await getStaffFullName(id)
        setStaffDisplayName(name ?? "")

        if (isTechnician) {
          setScopeStaffIds([id])
          setScopeClientIds([])
          setScopeSuperviseeIds([])
        } else {
          const filters = await resolveCaseloadFilters({ mode: "caseload", staffId: id })
          setScopeStaffIds(filters.staffIds)
          setScopeClientIds(filters.clientIds)
          setScopeSuperviseeIds(filters.superviseeStaffIds)
        }
      })
      .finally(() => setScopeLoading(false))
  }, [currentStaffId, viewRole, isOwnerView, isOwnerPreview, isTechnician])

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
              {ROLES.map((r) => (
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

      {isOwnerView ? (
        <div className="grid w-full max-w-[min(100%,1680px)] gap-4 px-4 sm:px-6 lg:grid-cols-3">
          <div id="notes-overdue">
            <NotesOverdueTile refreshKey={notesRefreshKey} />
          </div>
          <HoursByStaffTile
            refreshKey={staffRefreshKey}
            practiceId={practiceId}
            onStaffCreated={() => setStaffRefreshKey((k) => k + 1)}
          />
          <AuthorizationUtilizationTile />
        </div>
      ) : (
        <div className="w-full max-w-[min(100%,1680px)] space-y-4 px-4 sm:px-6">
          <DashboardCalendarTile
            viewRole={viewRole as CalendarRole}
            isOwnerPreview={isOwnerPreview}
            currentStaffId={isOwnerPreview ? null : (currentStaffId ?? null)}
            staffDisplayName={staffDisplayName}
          />

          {!scopeLoading && effectiveStaffId && isBcbaOrSupervisor && (
            <div className="grid gap-4 lg:grid-cols-2">
              <NotesOverdueTile
                refreshKey={notesRefreshKey}
                staffIds={scopeStaffIds}
              />
              <HoursByStaffTile
                refreshKey={staffRefreshKey}
                staffIds={scopeStaffIds}
              />
              <AuthorizationUtilizationTile clientIds={scopeClientIds} />
              <SupervisionComplianceTile staffIds={scopeSuperviseeIds} />
            </div>
          )}

          {!scopeLoading && effectiveStaffId && isTechnician && (
            <div className="grid gap-4 lg:grid-cols-3">
              <NotesOverdueTile
                refreshKey={notesRefreshKey}
                staffIds={scopeStaffIds}
              />
              <MyHoursTile
                staffId={effectiveStaffId}
                refreshKey={staffRefreshKey}
              />
              <SupervisionComplianceTile
                staffIds={[effectiveStaffId]}
                selfMode
              />
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">Built by Andrew Lee · 2026</p>
    </div>
  )
}
