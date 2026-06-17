import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FocalStatusArea } from "@/components/dashboard/FocalStatusArea"
import { OwnerNavRail } from "@/components/dashboard/OwnerNavRail"
import { OwnerPracticeGrid } from "@/components/dashboard/OwnerPracticeGrid"
import { OwnerRoleTabs } from "@/components/dashboard/OwnerRoleTabs"
import { supabase } from "@/lib/supabase"
import { DashboardCalendarTile } from "@/components/DashboardCalendarTile"
import { BcbaDashboardTiles } from "@/components/dashboard/BcbaDashboardTiles"
import { TechnicianDashboardTiles } from "@/components/dashboard/TechnicianDashboardTiles"
import {
  getStaffFullName,
  resolveCaseloadFilters,
  resolveEffectiveStaffId,
} from "@/lib/dashboardScope"
import {
  getRosterClientIds,
  getRosterStaffByRole,
  getRosterTechnicianStaffIds,
  type RosterStaffEntry,
} from "@/lib/rosterScope"
import { setRolePreview } from "@/lib/rolePreview"
import {
  firstName,
  getOwnerAttentionSummary,
  resolveOwnerDisplayName,
  timeGreeting,
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

function formatBcbaEyebrowDate(date: Date = new Date()): string {
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date)
  const monthDay = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" }).format(date)
  return `${weekday} · ${monthDay}`
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
  const isBcbaDashboard = viewRole === "BCBA"
  const isSupervisorDashboard = viewRole === "Supervisor"
  const isTechnician = viewRole === "Technician"
  const isLeadV3Dashboard =
    isBcbaDashboard || isSupervisorDashboard || isTechnician
  const isOwnerPreview = role === "Owner" && !isOwnerView

  const [notesRefreshKey, setNotesRefreshKey] = useState(0)
  const [staffRefreshKey] = useState(0)

  const [effectiveStaffId, setEffectiveStaffId] = useState<string | null>(null)
  const [staffDisplayName, setStaffDisplayName] = useState("")
  const [scopeClientIds, setScopeClientIds] = useState<string[]>([])
  const [scopeSuperviseeIds, setScopeSuperviseeIds] = useState<string[]>([])
  const [scopeTeamStaffIds, setScopeTeamStaffIds] = useState<string[]>([])
  const [scopeLoading, setScopeLoading] = useState(false)
  const [rosterTechnicianIds, setRosterTechnicianIds] = useState<string[]>([])
  const [rosterClientIds, setRosterClientIds] = useState<string[]>([])
  const [previewOptions, setPreviewOptions] = useState<RosterStaffEntry[]>([])
  const [previewStaffId, setPreviewStaffId] = useState<string | null>(null)
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
          return preferred?.id ?? options[0]?.id ?? null
        })
        return
      }

      if (viewRole === "Supervisor") {
        const options = await getRosterStaffByRole(practiceId!, "supervisor")
        setPreviewOptions(options)
        const preferred = options.find((s) => s.fullName === preferredName)
        setPreviewStaffId((prev) => {
          if (prev && options.some((s) => s.id === prev)) return prev
          return preferred?.id ?? options[0]?.id ?? null
        })
        return
      }

      if (viewRole === "Technician") {
        const options = await getRosterStaffByRole(practiceId!, "technician")
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
  }, [practiceId, role, viewRole, isOwnerView])

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
          setScopeClientIds([])
          setScopeSuperviseeIds([])
          setScopeTeamStaffIds([])
          return
        }

        const name = await getStaffFullName(id)
        setStaffDisplayName(name ?? "")

        if (isTechnician) {
          setScopeClientIds([])
          setScopeSuperviseeIds([])
          setScopeTeamStaffIds([id])
        } else {
          const filters = await resolveCaseloadFilters({ mode: "caseload", staffId: id })
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

  const ownerPersonaName = resolveOwnerDisplayName(userRole, ownerDisplayName)
  const leadPersonaName =
    (isOwnerPreview ? selectedPreviewStaff?.fullName : null) ||
    staffDisplayName ||
    PREVIEW_DEFAULTS[viewRole as CalendarRole]
  const bcbaNotesStaffIds =
    effectiveStaffId != null
      ? [...new Set([effectiveStaffId, ...scopeTeamStaffIds])]
      : []
  const supervisorNotesStaffIds =
    effectiveStaffId != null
      ? [...new Set([effectiveStaffId, ...scopeSuperviseeIds])]
      : scopeSuperviseeIds
  const leadNotesStaffIds = isSupervisorDashboard
    ? supervisorNotesStaffIds
    : bcbaNotesStaffIds
  const leadHoursStaffIds = isSupervisorDashboard ? scopeSuperviseeIds : scopeTeamStaffIds
  const leadCalendarRole = viewRole as CalendarRole
  const leadCalendarScopeLabels = isSupervisorDashboard
    ? { self: "My schedule", team: "Include supervisees" }
    : { self: "My sessions", team: "My team" }
  const leadPreviewPlaceholder = isTechnician
    ? "Select Technician"
    : isSupervisorDashboard
      ? "Select Supervisor"
      : "Select BCBA"

  return (
    <div
      className={cn(
        "bg-bg text-foreground",
        isOwnerView || isLeadV3Dashboard
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
              <div className="mb-2 flex shrink-0 items-center justify-between gap-4">
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
                className="mt-4 short:mt-3"
                refreshKey={notesRefreshKey + staffRefreshKey}
                staffIds={rosterScope?.staffIds}
                clientIds={rosterScope?.clientIds}
                activeClientCount={rosterClientIds.length}
                includeCaseloadStaff
                worklistItems={attention.worklist}
                worklistLoading={attention.loading && !attention.resolved}
              />
            </div>
          </main>
        </>
      ) : (
        <>
          <OwnerNavRail
            ownerName={leadPersonaName}
            practiceName={practiceName}
          />
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-6 min-[1000px]:px-[52px] min-[1000px]:py-5">
            <div className="mx-auto w-full max-w-[min(100%,1680px)] flex flex-col gap-2 pb-2">
              <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="text-lg font-semibold leading-tight tracking-[0.01em] text-ink-soft">
                    {formatBcbaEyebrowDate()}
                  </p>
                  <p className="text-[21px] font-normal leading-tight text-ink-soft">
                    {timeGreeting()}, {firstName(leadPersonaName)}.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {isDemo && role === "Owner" ? (
                    <OwnerRoleTabs viewRole={viewRole} onViewRoleChange={setViewRole} />
                  ) : role !== "Owner" ? (
                    <span className="inline-flex shrink-0 items-center rounded-full border border-line bg-surface-2 px-3 py-1.5 text-[12px] font-semibold text-muted">
                      {role}
                    </span>
                  ) : null}
                  {isOwnerPreview && previewOptions.length > 0 && (
                    <Select
                      value={previewStaffId ?? undefined}
                      onValueChange={(v) => setPreviewStaffId(v ?? null)}
                    >
                      <SelectTrigger className="h-8 w-[180px] text-xs">
                        <SelectValue placeholder={leadPreviewPlaceholder}>
                          {selectedPreviewStaff?.fullName ?? leadPreviewPlaceholder}
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
                  )}
                </div>
              </div>

              <DashboardCalendarTile
                key={
                  isTechnician
                    ? `technician-${effectiveStaffId ?? "calendar"}`
                    : `${leadCalendarRole}-${effectiveStaffId ?? "lead-calendar"}`
                }
                variant="v3"
                viewRole={leadCalendarRole}
                isOwnerPreview={isOwnerPreview}
                currentStaffId={isOwnerPreview ? effectiveStaffId : (currentStaffId ?? null)}
                previewStaffId={isOwnerPreview ? effectiveStaffId : null}
                staffDisplayName={leadPersonaName}
                practiceId={practiceId}
                scopeLabels={isTechnician ? undefined : leadCalendarScopeLabels}
              />

              {!scopeLoading && effectiveStaffId && isTechnician && (
                <div className="grid shrink-0 gap-4 lg:grid-cols-3">
                  <TechnicianDashboardTiles
                    key={effectiveStaffId}
                    staffId={effectiveStaffId}
                    refreshKey={notesRefreshKey + staffRefreshKey}
                  />
                </div>
              )}

              {!scopeLoading && effectiveStaffId && !isTechnician && (
                <div className="grid shrink-0 gap-4 lg:grid-cols-4">
                  <BcbaDashboardTiles
                    key={effectiveStaffId}
                    refreshKey={notesRefreshKey + staffRefreshKey}
                    notesStaffIds={leadNotesStaffIds}
                    hoursStaffIds={leadHoursStaffIds}
                    superviseeStaffIds={scopeSuperviseeIds}
                    clientIds={scopeClientIds}
                    includeZeroHourStaff={!isSupervisorDashboard}
                    includeCaseloadStaff={!isSupervisorDashboard}
                  />
                </div>
              )}
            </div>
          </main>
        </>
      )}
    </div>
  )
}
