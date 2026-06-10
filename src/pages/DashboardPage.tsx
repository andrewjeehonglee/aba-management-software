import { useEffect, useState } from "react"
import { useSearchParams, Link } from "react-router-dom"
import { Users } from "lucide-react"
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
import { getRosterClientIds, getRosterTechnicianStaffIds } from "@/lib/rosterScope"
import { getBcbaSummaries, type BcbaSummary } from "@/lib/rosterTable"
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
  const [rosterTechnicianIds, setRosterTechnicianIds] = useState<string[]>([])
  const [rosterClientIds, setRosterClientIds] = useState<string[]>([])
  const [bcbaPreviewOptions, setBcbaPreviewOptions] = useState<BcbaSummary[]>([])
  const [previewBcbaStaffId, setPreviewBcbaStaffId] = useState<string | null>(null)

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
    if (!practiceId || role !== "Owner") {
      setBcbaPreviewOptions([])
      setPreviewBcbaStaffId(null)
      return
    }

    getBcbaSummaries(practiceId)
      .then((summaries) => {
        setBcbaPreviewOptions(summaries)
        const jennifer = summaries.find((s) => s.fullName === "Jennifer")
        setPreviewBcbaStaffId((prev) => {
          if (prev && summaries.some((s) => s.staffId === prev)) return prev
          return jennifer?.staffId ?? summaries[0]?.staffId ?? null
        })
      })
      .catch(() => {
        setBcbaPreviewOptions([])
        setPreviewBcbaStaffId(null)
      })
  }, [practiceId, role])

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
      return
    }

    const calendarRole = viewRole as CalendarRole
    setScopeLoading(true)

    const staffIdPromise =
      isOwnerPreview && viewRole === "BCBA" && previewBcbaStaffId
        ? Promise.resolve(previewBcbaStaffId)
        : resolveEffectiveStaffId(currentStaffId ?? null, calendarRole, isOwnerPreview, practiceId)

    staffIdPromise
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
  }, [currentStaffId, viewRole, isOwnerView, isOwnerPreview, isTechnician, practiceId, previewBcbaStaffId])

  const selectedBcba = bcbaPreviewOptions.find(
    (b) => b.staffId === previewBcbaStaffId,
  )

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
            onStaffCreated={() => setStaffRefreshKey((k) => k + 1)}
          />
          <AuthorizationUtilizationTile
            clientIds={rosterScope?.clientIds}
          />
        </div>
      ) : (
        <div className="w-full max-w-[min(100%,1680px)] space-y-4 px-4 sm:px-6">
          {isOwnerPreview && viewRole === "BCBA" && bcbaPreviewOptions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">View as BCBA:</span>
              <Select
                value={previewBcbaStaffId ?? undefined}
                onValueChange={(v) => setPreviewBcbaStaffId(v ?? null)}
              >
                <SelectTrigger className="h-8 w-[180px] text-xs">
                  <SelectValue placeholder="Select BCBA">
                    {selectedBcba?.fullName ?? "Select BCBA"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {bcbaPreviewOptions.map((bcba) => (
                    <SelectItem key={bcba.staffId} value={bcba.staffId}>
                      {bcba.fullName}
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

          {!scopeLoading && effectiveStaffId && isBcbaOrSupervisor && (
            <div className="grid gap-4 lg:grid-cols-2">
              <NotesOverdueTile
                refreshKey={notesRefreshKey}
                staffIds={scopeSuperviseeIds}
                clientIds={scopeClientIds}
              />
              <HoursByStaffTile
                refreshKey={staffRefreshKey}
                staffIds={scopeSuperviseeIds}
                clientIds={scopeClientIds}
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
