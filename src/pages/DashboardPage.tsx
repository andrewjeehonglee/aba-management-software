import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar"
import { FocalStatusArea } from "@/components/dashboard/FocalStatusArea"
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
import {
  getOwnerAttentionSummary,
  type OwnerAttentionSummary,
} from "@/lib/ownerDashboardStatus"

type Role = "Technician" | "Supervisor" | "BCBA" | "Owner"
type CalendarRole = "Technician" | "Supervisor" | "BCBA"

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
  const [practiceName, setPracticeName] = useState<string | null>(null)
  const [ownerDisplayName, setOwnerDisplayName] = useState<string | null>(null)
  const [attention, setAttention] = useState<OwnerAttentionSummary>({
    attentionCount: 0,
    items: [],
    loading: true,
    resolved: false,
  })

  const rosterReady = rosterTechnicianIds.length > 0
  const rosterScopeKey = `${rosterTechnicianIds.join(",")}|${rosterClientIds.join(",")}`

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
    if (!practiceId) {
      setPracticeName(null)
      return
    }
    void supabase
      .from("practices")
      .select("name")
      .eq("id", practiceId)
      .maybeSingle()
      .then(
        ({ data }) => setPracticeName((data as { name: string } | null)?.name ?? null),
        () => setPracticeName(null),
      )
  }, [practiceId])

  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => {
      const metaName = session?.user?.user_metadata?.full_name as string | undefined
      if (metaName?.trim()) {
        setOwnerDisplayName((prev) => prev ?? metaName.trim())
      }
    })
  }, [])

  useEffect(() => {
    if (!currentStaffId) return
    getStaffFullName(currentStaffId)
      .then((name) => {
        if (name) setOwnerDisplayName(name)
      })
      .catch(() => {})
  }, [currentStaffId])

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
    if (!isOwnerView || !rosterReady) return

    let cancelled = false
    setAttention((prev) => ({ ...prev, loading: true }))

    getOwnerAttentionSummary({
      staffIds: rosterTechnicianIds,
      clientIds: rosterClientIds,
    })
      .then((summary) => {
        if (cancelled) return
        setAttention({ ...summary, loading: false, resolved: true })
      })
      .catch(() => {
        if (cancelled) return
        setAttention((prev) => ({
          attentionCount: 0,
          items: [],
          loading: false,
          resolved: prev.resolved,
        }))
      })

    return () => {
      cancelled = true
    }
  }, [isOwnerView, rosterReady, rosterScopeKey, notesRefreshKey, staffRefreshKey])

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
    <div className="flex min-h-svh flex-col bg-bg text-foreground">
      <DashboardTopBar
        practiceName={practiceName}
        role={role}
        viewRole={viewRole}
        onViewRoleChange={setViewRole}
        isDemo={isDemo}
      />

      {isOwnerView ? (
        <main className="mx-auto w-full max-w-[min(100%,1360px)] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-5">
            <FocalStatusArea
              userName={ownerDisplayName}
              attention={attention}
              rosterReady={rosterReady}
            />
          </div>

          <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
            <div id="notes-overdue" className="h-full">
              <NotesOverdueTile
                variant="pulse"
                refreshKey={notesRefreshKey}
                staffIds={rosterScope?.staffIds}
                clientIds={rosterScope?.clientIds}
              />
            </div>
            <div id="hours-by-staff" className="h-full">
              <HoursByStaffTile
                variant="pulse"
                refreshKey={staffRefreshKey}
                practiceId={practiceId}
                staffIds={rosterScope?.staffIds}
                clientIds={rosterScope?.clientIds}
                includeZeroHourStaff
                onStaffCreated={() => setStaffRefreshKey((k) => k + 1)}
              />
            </div>
            <div id="auth-utilization" className="h-full">
              <AuthorizationUtilizationTile
                variant="pulse"
                clientIds={rosterScope?.clientIds}
              />
            </div>
          </div>
        </main>
      ) : (
        <div className="mx-auto w-full max-w-[min(100%,1360px)] space-y-4 px-4 py-6 sm:px-6">
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

      <p className="px-4 pb-6 text-center text-xs text-subtle sm:px-6">Built by Andrew Lee · 2026</p>
    </div>
  )
}
