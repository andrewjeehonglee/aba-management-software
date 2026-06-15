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
import { OwnerNavRail } from "@/components/dashboard/OwnerNavRail"
import { OwnerPracticeGrid } from "@/components/dashboard/OwnerPracticeGrid"
import { OwnerRoleTabs } from "@/components/dashboard/OwnerRoleTabs"
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
  resolveOwnerDisplayName,
  type OwnerAttentionSummary,
} from "@/lib/ownerDashboardStatus"
import { cn } from "@/lib/utils"

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

function formatEyebrowDate(date: Date = new Date()): string {
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date)
  const monthDay = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" }).format(date)
  return `${weekday.toUpperCase()} · ${monthDay.toUpperCase()}`
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
  const [staffRefreshKey] = useState(0)

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
    worstSeverity: "ok",
    items: [],
    worklist: [],
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
          worstSeverity: "ok",
          items: [],
          worklist: [],
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

  const ownerPersonaName = resolveOwnerDisplayName(userRole, ownerDisplayName)

  return (
    <div
      className={cn(
        "bg-bg text-foreground",
        isOwnerView
          ? "grid h-dvh overflow-hidden min-[1000px]:grid-cols-[236px_1fr] max-[999px]:grid-rows-[auto_1fr]"
          : "flex min-h-svh flex-col",
      )}
    >
      {isOwnerView ? (
        <>
          <OwnerNavRail
            ownerName={ownerPersonaName}
            practiceName={practiceName}
          />
          <main className="flex min-h-0 min-w-0 flex-col overflow-hidden px-5 py-6 short:py-5 min-[1000px]:px-[52px] min-[1000px]:py-8">
            <div className="mx-auto flex h-full w-full max-w-[1400px] min-h-0 flex-col">
              <div className="mb-5 flex shrink-0 items-center justify-between gap-4 short:mb-4">
                <p className="text-[15px] font-semibold uppercase tracking-[0.10em] text-muted">
                  {formatEyebrowDate()}
                </p>
                {role === "Owner" && (
                  <OwnerRoleTabs viewRole={viewRole} onViewRoleChange={setViewRole} />
                )}
              </div>

              <FocalStatusArea
                userName={ownerPersonaName}
                attention={attention}
                rosterReady={rosterReady}
              />

              <OwnerPracticeGrid
                className="mt-6 short:mt-4"
                refreshKey={notesRefreshKey + staffRefreshKey}
                staffIds={rosterScope?.staffIds}
                clientIds={rosterScope?.clientIds}
                includeCaseloadStaff
                worklistItems={attention.worklist}
                worklistLoading={attention.loading && !attention.resolved}
              />
            </div>
          </main>
        </>
      ) : (
        <>
      <DashboardTopBar
        practiceName={practiceName}
        role={role}
        viewRole={viewRole}
        onViewRoleChange={setViewRole}
        isDemo={isDemo}
        ownerName={ownerPersonaName}
      />

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

      {!isOwnerView && (
        <p className="px-4 pb-6 text-center text-xs text-subtle sm:px-6">Built by Andrew Lee · 2026</p>
      )}
        </>
      )}
    </div>
  )
}
