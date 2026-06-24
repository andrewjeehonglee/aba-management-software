import { useEffect, useMemo, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { Link, useParams } from "react-router-dom"
import {
  getCaseloadBtStaffIds,
  getStaffClientTableForBcba,
  getStaffClientTableForSupervisor,
  getStaffClientTableForTechnician,
  getSuperviseesWithClients,
  type StaffClientTableRow,
  type SuperviseeClientsRow,
} from "@/lib/clientAssignments"
import { filterSupervisionRecordsForTile } from "@/lib/dashboardScope"
import { getNotesStatus } from "@/lib/notesStatus"
import { resolveStaffByRouteKey } from "@/lib/rosterScope"
import { getStaffHoursByMonth } from "@/lib/staffHours"
import { demoStaffEmail, demoStaffPhone } from "@/lib/staffContact"
import {
  isBcbaRole,
  isLeadershipRole,
  isTechnicianRole,
  resolveRosterStaffRole,
  staffRoleHeaderLabel,
  type RosterStaffRole,
} from "@/lib/staffRole"
import {
  downloadStaffSessionsCsv,
  getStaffSessionExportBundle,
} from "@/lib/staffSessionExport"
import { getCurrentCalendarMonthDateBounds } from "@/lib/payPeriod"
import { unslug } from "@/lib/slug"
import {
  getSessionNotesBySessionIds,
  getSessionsByStaffIdForMonth,
  getSupervisionByStaffId,
  getSupervisionForStaffIds,
  supabase,
  type SessionNoteRecord,
  type SessionRecord,
  type StaffRecord,
  type SupervisionRecord,
} from "@/lib/supabase"
import { P, TILE_TITLE } from "@/pages/ClientOverviewPage/profileTokens"
import { SessionCalendarMonth } from "@/pages/ClientOverviewPage/SessionCalendarMonth"
import { StaffCompliancePanel } from "@/pages/StaffOverviewPage/StaffCompliancePanel"
import { StaffFactsList } from "@/pages/StaffOverviewPage/StaffFactsList"
import { StaffMonthHoursInset } from "@/pages/StaffOverviewPage/StaffMonthHoursInset"
import { StaffPeoplePanel } from "@/pages/StaffOverviewPage/StaffPeoplePanel"
import { StaffRecentSessionsPanel } from "@/pages/StaffOverviewPage/StaffRecentSessionsPanel"
import { StaffRecordsBucket } from "@/pages/StaffOverviewPage/StaffRecordsBucket"

async function enrichSupervisionForStaffIds(
  staffIds: string[],
  records: SupervisionRecord[],
): Promise<SupervisionRecord[]> {
  const present = new Set(records.map((r) => r.staffId))
  const missingIds = staffIds.filter((id) => !present.has(id))
  if (missingIds.length === 0) return records

  const { data: staffRows } = await supabase
    .from("staff")
    .select("id, full_name, external_code, team")
    .in("id", missingIds)
    .eq("status", "active")

  const placeholders: SupervisionRecord[] = []
  for (const s of (staffRows ?? []) as {
    id: string
    full_name: string
    external_code: string | null
    team: string | null
  }[]) {
    placeholders.push({
      id: `placeholder-${s.id}`,
      staffId: s.id,
      staffName: s.full_name,
      staffExternalCode: s.external_code,
      staffTeam: s.team?.startsWith("Team") ? s.team : s.team ? `Team ${s.team}` : "",
      supervisionPct: 0,
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
    })
  }
  return [...records, ...placeholders]
}

export function StaffOverviewPage({ practiceId }: { practiceId: string }) {
  const { staffId: staffRouteKey } = useParams<{ staffId: string }>()

  const [staff, setStaff] = useState<StaffRecord | null>(null)
  const [resolvedRole, setResolvedRole] = useState<RosterStaffRole | null>(null)
  const [supervision, setSupervision] = useState<SupervisionRecord | null>(null)
  const [caseloadSupervision, setCaseloadSupervision] = useState<SupervisionRecord[]>([])
  const [supervisionMonthLabel, setSupervisionMonthLabel] = useState("")
  const [monthSessions, setMonthSessions] = useState<SessionRecord[]>([])
  const [sessionNotes, setSessionNotes] = useState<SessionNoteRecord[]>([])
  const [monthLabel, setMonthLabel] = useState("")
  const [clientTable, setClientTable] = useState<StaffClientTableRow[]>([])
  const [supervisees, setSupervisees] = useState<SuperviseeClientsRow[]>([])
  const [directHours, setDirectHours] = useState(0)
  const [indirectHours, setIndirectHours] = useState(0)
  const [hoursMonthLabel, setHoursMonthLabel] = useState("")
  const [missingCount, setMissingCount] = useState(0)
  const [overdueCount, setOverdueCount] = useState(0)
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!staffRouteKey) {
      setDataLoading(false)
      return
    }

    let cancelled = false
    setDataLoading(true)
    setDataError(false)

    resolveStaffByRouteKey(practiceId, staffRouteKey)
      .then(async (entry) => {
        if (cancelled) return
        if (!entry) {
          setStaff(null)
          setDataLoading(false)
          return
        }

        const { data, error } = await supabase
          .from("staff")
          .select(
            "id, full_name, external_code, role, team, hire_date, certification, direct_hours, indirect_hours, cancellation_hours",
          )
          .eq("id", entry.id)
          .eq("practice_id", practiceId)
          .maybeSingle()

        if (cancelled) return
        if (error || !data) {
          setStaff(null)
          setDataLoading(false)
          return
        }

        const row = data as {
          id: string
          full_name: string
          external_code: string
          role: string
          team: string
          hire_date: string
          certification: string
          direct_hours: number
          indirect_hours: number
          cancellation_hours: number
        }

        const role = resolveRosterStaffRole(row.external_code, row.role)
        const rawTeam = row.team ?? ""
        const staffRecord: StaffRecord = {
          id: row.id,
          name: row.full_name,
          externalCode: row.external_code,
          role: row.role,
          team: rawTeam.startsWith("Team") ? rawTeam : rawTeam ? `Team ${rawTeam}` : "—",
          hireDate: row.hire_date,
          certification: row.certification,
          directHours: row.direct_hours,
          indirectHours: row.indirect_hours,
          cancellationHours: row.cancellation_hours,
          totalHours: row.direct_hours + row.indirect_hours + row.cancellation_hours,
        }

        setStaff(staffRecord)
        setResolvedRole(role)

        const [monthResult, hoursSummary, notesSummary] = await Promise.all([
          getSessionsByStaffIdForMonth(entry.id),
          getStaffHoursByMonth(undefined, { staffIds: [entry.id] }),
          getNotesStatus(undefined, { staffIds: [entry.id] }),
        ])

        if (cancelled) return

        setMonthLabel(monthResult.label)
        setMonthSessions(monthResult.sessions)

        const hoursRow = hoursSummary.byStaff[0]
        setDirectHours(Math.round(hoursRow?.directHours ?? 0))
        setIndirectHours(Math.round(hoursRow?.indirectHours ?? 0))
        setHoursMonthLabel(hoursSummary.monthLabel)

        const notesRow = notesSummary.byStaff.find((s) => s.staffId === entry.id)
        setMissingCount(notesRow?.missingCount ?? 0)
        setOverdueCount(notesRow?.overdueCount ?? 0)

        const sessionIds = monthResult.sessions.map((s) => s.id)
        const notes = sessionIds.length
          ? await getSessionNotesBySessionIds(sessionIds)
          : []
        if (cancelled) return
        setSessionNotes(notes)

        if (isTechnicianRole(role)) {
          const [supervisionRow, table] = await Promise.all([
            getSupervisionByStaffId(entry.id),
            getStaffClientTableForTechnician(entry.id),
          ])
          if (cancelled) return
          setSupervision(supervisionRow)
          setClientTable(table)
          setCaseloadSupervision([])
          setSupervisees([])
        } else if (isLeadershipRole(role)) {
          const viewerRole = isBcbaRole(role) ? "bcba" : "supervisor"
          const [btIds, table, superviseeRows] = await Promise.all([
            getCaseloadBtStaffIds(entry.id, viewerRole),
            isBcbaRole(role)
              ? getStaffClientTableForBcba(entry.id)
              : getStaffClientTableForSupervisor(entry.id),
            isBcbaRole(role)
              ? Promise.resolve([] as SuperviseeClientsRow[])
              : getSuperviseesWithClients(entry.id),
          ])
          const rawSupervision = btIds.length
            ? await getSupervisionForStaffIds(btIds)
            : []
          const enriched = await enrichSupervisionForStaffIds(btIds, rawSupervision)
          const { records, displayMonthLabel } = filterSupervisionRecordsForTile(enriched)
          if (cancelled) return
          setSupervision(null)
          setClientTable(table)
          setSupervisees(superviseeRows)
          setCaseloadSupervision(
            [...records].sort(
              (a, b) =>
                a.supervisionPct - b.supervisionPct ||
                a.staffName.localeCompare(b.staffName),
            ),
          )
          setSupervisionMonthLabel(displayMonthLabel)
        }
      })
      .catch(() => {
        if (!cancelled) setDataError(true)
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [staffRouteKey, practiceId])

  const displayName =
    staff?.name
    ?? monthSessions[0]?.staffName
    ?? (staffRouteKey ? unslug(staffRouteKey) : "Unknown staff")

  const roleBadgeLabel = resolvedRole ? staffRoleHeaderLabel(resolvedRole) : null

  const recentSessions = useMemo(
    () =>
      [...monthSessions]
        .sort((a, b) => b.time.localeCompare(a.time))
        .slice(0, 5),
    [monthSessions],
  )

  const supervisionPanelMonth = supervisionMonthLabel || monthLabel

  async function handleExportSessions() {
    if (!staff) return
    setExporting(true)
    try {
      const { start, end } = getCurrentCalendarMonthDateBounds()
      const items = await getStaffSessionExportBundle(staff.id, start, end)
      downloadStaffSessionsCsv(
        staff.externalCode ?? staff.id,
        staff.name,
        start.slice(0, 7),
        start,
        end,
        items,
      )
    } finally {
      setExporting(false)
    }
  }

  if (dataLoading) {
    return (
      <div
        className="flex min-h-svh items-center justify-center text-[15px]"
        style={{ backgroundColor: P.bg, color: P.soft }}
      >
        Loading staff…
      </div>
    )
  }

  if (dataError || !staff || !resolvedRole || !staffRouteKey) {
    return (
      <div
        className="flex min-h-svh items-center justify-center text-[15px]"
        style={{ backgroundColor: P.bg, color: P.soft }}
      >
        Staff member not found.
      </div>
    )
  }

  const phone = demoStaffPhone(staff.externalCode)
  const email = demoStaffEmail(staff.externalCode)

  return (
    <div
      className="min-h-svh px-10 py-6"
      style={{ backgroundColor: P.bg, color: P.ink }}
    >
      <div className="mx-auto w-full max-w-[1600px]">
        <header>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[15px] transition-opacity hover:opacity-80"
            style={{ color: P.soft }}
          >
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <h1 className="text-[28px] font-semibold tracking-tight">
              {displayName}
            </h1>
            {roleBadgeLabel && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium"
                style={{
                  backgroundColor: P.inset,
                  color: P.soft,
                  boxShadow: `inset 0 0 0 1px ${P.rule}`,
                }}
              >
                {roleBadgeLabel}
              </span>
            )}
          </div>
        </header>

        <div className="mt-6 flex flex-col gap-6">
          <div className="grid items-stretch gap-6 max-xl:grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)_360px]">
            <aside
              className="h-full p-5"
              style={{ backgroundColor: P.card, borderRadius: P.radius }}
            >
              <h2 className={TILE_TITLE} style={{ color: P.ink }}>
                Staff details
              </h2>
              <div className="mt-4">
                <StaffFactsList
                  staff={staff}
                  role={resolvedRole}
                  phone={phone}
                  email={email}
                />
                <StaffMonthHoursInset
                  directHours={directHours}
                  indirectHours={indirectHours}
                  monthLabel={hoursMonthLabel || monthLabel}
                />
              </div>
            </aside>

            <div className="flex h-full min-w-0">
              <SessionCalendarMonth
                fillHeight
                sessions={monthSessions}
                sessionNotes={sessionNotes}
              />
            </div>

            <div className="self-start">
              <StaffRecordsBucket
                staffRouteKey={staffRouteKey}
                missingCount={missingCount}
                overdueCount={overdueCount}
              />
            </div>
          </div>

          <div className="grid items-start gap-6 max-xl:grid-cols-1 xl:grid-cols-2">
            <StaffPeoplePanel
              role={resolvedRole}
              clientTable={clientTable}
              supervisees={supervisees}
            />
            <StaffCompliancePanel
              role={resolvedRole}
              monthLabel={supervisionPanelMonth}
              supervision={supervision}
              staff={staff}
              caseloadRecords={caseloadSupervision}
            />
          </div>

          <StaffRecentSessionsPanel
            monthLabel={monthLabel}
            sessions={recentSessions}
            exporting={exporting}
            onExport={handleExportSessions}
          />
        </div>
      </div>
    </div>
  )
}
