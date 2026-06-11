import { useEffect, useState } from "react"
import { useSearchParams, Link } from "react-router-dom"
import { ClipboardList, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { AuthorizationUtilizationTile } from "@/components/AuthorizationUtilizationTile"
import { BcbaCaseloadPanel } from "@/components/BcbaCaseloadPanel"
import { DashboardCalendarTile } from "@/components/DashboardCalendarTile"
import { HoursByStaffTile } from "@/components/HoursByStaffTile"
import { MyHoursTile } from "@/components/MyHoursTile"
import { NotesOverdueTile } from "@/components/NotesOverdueTile"
import { SupervisionComplianceTile } from "@/components/SupervisionComplianceTile"
import {
  getStaffFullName,
  resolveCaseloadFilters,
  resolveEffectiveStaffId,
  resolvePreviewStaffId,
} from "@/lib/dashboardScope"
import {
  getRosterClientIds,
  getRosterStaffByRole,
  getRosterTechnicianStaffIds,
  type RosterStaffEntry,
} from "@/lib/rosterScope"
import { getCaseloadStaffForBcba } from "@/lib/rosterTable"
import { setRolePreview } from "@/lib/rolePreview"

type Role = "Technician" | "Supervisor" | "BCBA" | "Owner"
type CalendarRole = "Technician" | "Supervisor" | "BCBA"

const ROLES: Role[] = ["Owner", "BCBA", "Supervisor", "Technician"]

const PREVIEW_DEFAULTS: Record<CalendarRole, string> = {
  BCBA: "Jennifer",
  Supervisor: "Hilary",
  Technician: "Jazmine",
}

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
  const [scopeTeamStaffIds, setScopeTeamStaffIds] = useState<string[]>([])
  const [scopeLoading, setScopeLoading] = useState(false)
  const [rosterTechnicianIds, setRosterTechnicianIds] = useState<string[]>([])
  const [rosterClientIds, setRosterClientIds] = useState<string[]>([])
  const [previewOptions, setPreviewOptions] = useState<RosterStaffEntry[]>([])
  const [previewStaffId, setPreviewStaffId] = useState<string | null>(null)
  /** BCBA selected on BCBA tab — scopes supervisor/BT preview dropdowns to that caseload. */
  const [anchorBcbaId, setAnchorBcbaId] = useState<string | null>(null)

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
    if (!practiceId) {
      setRosterTechnicianIds([])
      setRosterClientIds([])
      return
    }

    Promise.all([
      getRosterTechnicianStaffIds(practiceId),
      getRosterClientIds(practiceId),
    ])
      .then(([technicianIds, clientIds]) => {
        setRosterTechnicianIds(technicianIds)
        setRosterClientIds(clientIds)
      })
      .catch(() => {
        setRosterTechnicianIds([])
        setRosterClientIds([])
      })
  }, [practiceId])

  useEffect(() => {
    if (!practiceId || role !== "Owner") return
    resolvePreviewStaffId("BCBA", practiceId)
      .then((id) => {
        if (id) setAnchorBcbaId((prev) => prev ?? id)
      })
      .catch(() => {})
  }, [practiceId, role])

  useEffect(() => {
    if (!practiceId || role !== "Owner" || isOwnerView) {
      setPreviewOptions([])
      setPreviewStaffId(null)
      return
    }

    const roleMap: Record<CalendarRole, "bcba" | "supervisor" | "technician"> = {
      BCBA: "bcba",
      Supervisor: "supervisor",
      Technician: "technician",
    }
    const dbRole = roleMap[viewRole as CalendarRole]
    if (!dbRole) return

    const preferredName = PREVIEW_DEFAULTS[viewRole as CalendarRole]

    async function loadOptions() {
      if (viewRole === "BCBA") {
        const options = await getRosterStaffByRole(practiceId!, "bcba")
        setPreviewOptions(options)
        const preferred = options.find((s) => s.fullName === preferredName)
        setPreviewStaffId((prev) => {
          if (prev && options.some((s) => s.id === prev)) return prev
          const next = preferred?.id ?? options[0]?.id ?? null
          if (next) setAnchorBcbaId(next)
          return next
        })
        return
      }

      if (anchorBcbaId) {
        const caseloadRole = viewRole === "Supervisor" ? "supervisor" : "technician"
        const staff = await getCaseloadStaffForBcba(practiceId!, anchorBcbaId, caseloadRole)
        const options: RosterStaffEntry[] = staff.map((s) => ({
          id: s.staffId,
          fullName: s.fullName,
          externalCode: s.externalCode,
          role: caseloadRole,
        }))
        setPreviewOptions(options)
        const preferred = options.find((s) => s.fullName === preferredName)
        setPreviewStaffId((prev) => {
          if (prev && options.some((s) => s.id === prev)) return prev
          return preferred?.id ?? options[0]?.id ?? null
        })
        return
      }

      const options = await getRosterStaffByRole(practiceId!, dbRole)
      setPreviewOptions(options)
      const preferred = options.find((s) => s.fullName === preferredName)
      setPreviewStaffId((prev) => {
        if (prev && options.some((s) => s.id === prev)) return prev
        return preferred?.id ?? options[0]?.id ?? null
      })
    }

    loadOptions().catch(() => {
      setPreviewOptions([])
      setPreviewStaffId(null)
    })
  }, [practiceId, role, viewRole, isOwnerView, anchorBcbaId])

  useEffect(() => {
    if (viewRole === "BCBA" && previewStaffId) {
      setAnchorBcbaId(previewStaffId)
    }
  }, [viewRole, previewStaffId])

  const rosterScope =
    rosterTechnicianIds.length > 0
      ? { staffIds: rosterTechnicianIds, clientIds: rosterClientIds }
      : null

  useEffect(() => {
    if (isOwnerView) {
      setEffectiveStaffId(null)
      setStaffDisplayName("")
      setScopeStaffIds([])
      setScopeClientIds([])
      setScopeSuperviseeIds([])
      setScopeTeamStaffIds([])
      return
    }

    const calendarRole = viewRole as CalendarRole
    setScopeLoading(true)

    const staffIdPromise =
      isOwnerPreview && previewStaffId
        ? Promise.resolve(previewStaffId)
        : resolveEffectiveStaffId(currentStaffId ?? null, calendarRole, isOwnerPreview, practiceId)

    staffIdPromise
      .then(async (id) => {
        setEffectiveStaffId(id)
        if (!id) {
          setStaffDisplayName("")
          setScopeStaffIds([])
          setScopeClientIds([])
          setScopeSuperviseeIds([])
          setScopeTeamStaffIds([])
          return
        }

        const name = await getStaffFullName(id)
        setStaffDisplayName(name ?? "")

        if (isTechnician) {
          setScopeStaffIds([id])
          setScopeClientIds([])
          setScopeSuperviseeIds([])
          setScopeTeamStaffIds([id])
        } else {
          const filters = await resolveCaseloadFilters({ mode: "caseload", staffId: id })
          setScopeStaffIds(filters.staffIds)
          setScopeClientIds(filters.clientIds)
          setScopeSuperviseeIds(filters.superviseeStaffIds)
          setScopeTeamStaffIds(filters.teamStaffIds)
        }
      })
      .finally(() => setScopeLoading(false))
  }, [currentStaffId, viewRole, isOwnerView, isOwnerPreview, isTechnician, practiceId, previewStaffId])

  const selectedPreviewStaff = previewOptions.find(
    (s) => s.id === previewStaffId,
  )
  const previewRoleLabel =
    viewRole === "BCBA" ? "BCBA" : viewRole === "Supervisor" ? "Supervisor" : "Technician"

  return (
    <div className="min-h-svh bg-[#F0F4F4] text-foreground flex flex-col items-center gap-4 p-4">

      <header className={`-mx-4 -mt-4 mb-0 flex w-[calc(100%+2rem)] items-center justify-between gap-4 border-b border-slate-200 px-6 py-4 shadow-sm ${isDemo ? "bg-amber-50/60" : "bg-white"}`}>
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl font-bold tracking-tight text-[#0D7377] shrink-0">Pulse</span>
          <span className="hidden sm:block text-sm text-slate-400 truncate">ABA Management</span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {role === "Owner" && (
            // Users = care-team roster (distinct from dashboard role tabs)
            <Link
              to="/roster"
              aria-label="Caseload roster"
              title="Caseload roster"
              className="inline-flex items-center justify-center rounded-md p-2 text-[#0D7377] hover:bg-[#E8F7F7] transition-colors"
            >
              <Users className="size-4" />
            </Link>
          )}
          {role === "Owner" && (
            <Link
              to="/audit"
              aria-label="Audit pull"
              title="Audit pull"
              className="inline-flex items-center justify-center rounded-md p-2 text-[#0D7377] hover:bg-[#E8F7F7] transition-colors"
            >
              <ClipboardList className="size-4" />
            </Link>
          )}
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
            <NotesOverdueTile
              refreshKey={notesRefreshKey}
              staffIds={rosterScope?.staffIds}
              clientIds={rosterScope?.clientIds}
            />
          </div>
          <HoursByStaffTile
            refreshKey={staffRefreshKey}
            practiceId={practiceId}
            staffIds={rosterScope?.staffIds}
            clientIds={rosterScope?.clientIds}
            includeZeroHourStaff
            onStaffCreated={() => setStaffRefreshKey((k) => k + 1)}
          />
          <AuthorizationUtilizationTile
            clientIds={rosterScope?.clientIds}
          />
        </div>
      ) : (
        <div className="w-full max-w-[min(100%,1680px)] space-y-4 px-4 sm:px-6">
          {isOwnerPreview && previewOptions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">View as {previewRoleLabel}:</span>
              <Select
                value={previewStaffId ?? undefined}
                onValueChange={(v) => setPreviewStaffId(v ?? null)}
              >
                <SelectTrigger className="h-8 w-[180px] text-xs">
                  <SelectValue placeholder={`Select ${previewRoleLabel}`}>
                    {selectedPreviewStaff?.fullName ?? `Select ${previewRoleLabel}`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {previewOptions.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DashboardCalendarTile
            viewRole={viewRole as CalendarRole}
            isOwnerPreview={isOwnerPreview}
            currentStaffId={isOwnerPreview ? effectiveStaffId : (currentStaffId ?? null)}
            previewStaffId={isOwnerPreview ? effectiveStaffId : null}
            staffDisplayName={staffDisplayName}
            practiceId={practiceId}
          />

          {isOwnerPreview && viewRole === "BCBA" && effectiveStaffId && practiceId && (
            <BcbaCaseloadPanel
              practiceId={practiceId}
              bcbaStaffId={effectiveStaffId}
              bcbaName={selectedPreviewStaff?.fullName ?? staffDisplayName}
            />
          )}

          {!scopeLoading && effectiveStaffId && isBcbaOrSupervisor && (
            <div className="grid gap-4 lg:grid-cols-2">
              <NotesOverdueTile
                refreshKey={notesRefreshKey}
                staffIds={viewRole === "BCBA" ? scopeTeamStaffIds : scopeSuperviseeIds}
                clientIds={scopeClientIds}
                includeCaseloadStaff={viewRole === "BCBA"}
              />
              <HoursByStaffTile
                refreshKey={staffRefreshKey}
                staffIds={viewRole === "BCBA" ? scopeTeamStaffIds : scopeSuperviseeIds}
                clientIds={scopeClientIds}
                includeZeroHourStaff={viewRole === "BCBA"}
              />
              <AuthorizationUtilizationTile clientIds={scopeClientIds} />
              <SupervisionComplianceTile
                staffIds={scopeSuperviseeIds}
                includeAllCaseloadStaff={viewRole === "BCBA"}
              />
            </div>
          )}

          {!scopeLoading && effectiveStaffId && isTechnician && (
            <div className="grid gap-4 lg:grid-cols-3">
              <NotesOverdueTile
                refreshKey={notesRefreshKey}
                staffIds={scopeStaffIds}
                selfMode
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
