import { useEffect, useMemo, useState } from "react"
import { OwnerAppShell } from "@/components/dashboard/OwnerAppShell"
import { AppPageHeader } from "@/components/dashboard/AppPageHeader"
import { useOwnerShell } from "@/hooks/useOwnerShell"
import type { StaffSessionRow } from "@/lib/notesStatus"
import {
  filterPanelBySearch,
  loadSessionsPagePanelData,
  type SessionsPerson,
} from "@/lib/sessionsPageScope"
import {
  getSessionNotesBySessionIds,
  getSessionsByClientIdForMonth,
  getSessionsByStaffIdForMonth,
  getStaffSessionsForNoteStatus,
  type SessionNoteRecord,
  type SessionRecord,
} from "@/lib/supabase"
import { P } from "@/pages/ClientOverviewPage/profileTokens"
import { PracticeSessionCalendar } from "@/pages/SessionsPage/PracticeSessionCalendar"
import { SessionDetailPanel } from "@/pages/SessionsPage/SessionDetailPanel"
import {
  SessionsPeoplePanel,
  type PanelTab,
} from "@/pages/SessionsPage/SessionsPeoplePanel"
import {
  defaultColorMode,
  type CalendarColorMode,
} from "@/pages/SessionsPage/sessionsCalendarUtils"

export function SessionsPage({
  practiceId,
  userRole,
  currentStaffId,
}: {
  practiceId: string
  userRole?: string
  currentStaffId?: string | null
}) {
  const { ownerName, practiceName } = useOwnerShell(practiceId, userRole)

  const [panelLoading, setPanelLoading] = useState(true)
  const [clients, setClients] = useState<
    Awaited<ReturnType<typeof loadSessionsPagePanelData>>["clients"]
  >([])
  const [staffGroups, setStaffGroups] = useState<
    Awaited<ReturnType<typeof loadSessionsPagePanelData>>["staffGroups"]
  >([])
  const [hidePanel, setHidePanel] = useState(false)

  const [panelTab, setPanelTab] = useState<PanelTab>("clients")
  const [searchQuery, setSearchQuery] = useState("")
  const [selected, setSelected] = useState<SessionsPerson | null>(null)
  const [colorModeOverride, setColorModeOverride] = useState<CalendarColorMode | null>(null)

  const [anchorDate, setAnchorDate] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  )
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [sessionNotes, setSessionNotes] = useState<SessionNoteRecord[]>([])
  const [staffSessions, setStaffSessions] = useState<StaffSessionRow[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [selectedSession, setSelectedSession] = useState<SessionRecord | null>(null)

  useEffect(() => {
    let cancelled = false
    setPanelLoading(true)

    loadSessionsPagePanelData(practiceId, userRole ?? "technician", currentStaffId ?? null)
      .then((data) => {
        if (cancelled) return
        setClients(data.clients)
        setStaffGroups(data.staffGroups)
        setHidePanel(data.hidePanel)
        if (data.defaultPerson) {
          setSelected(data.defaultPerson)
          setPanelTab("staff")
        }
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setPanelLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [practiceId, userRole, currentStaffId])

  const filtered = useMemo(
    () => filterPanelBySearch(clients, staffGroups, searchQuery),
    [clients, staffGroups, searchQuery],
  )

  const viewKind = selected?.kind ?? "client"
  const colorMode = colorModeOverride ?? defaultColorMode(viewKind)

  useEffect(() => {
    if (!selected) {
      setSessions([])
      setSessionNotes([])
      setStaffSessions([])
      setSelectedSession(null)
      return
    }

    let cancelled = false
    setSessionsLoading(true)
    setSelectedSession(null)

    const fetchSessions =
      selected.kind === "client"
        ? getSessionsByClientIdForMonth(selected.id, anchorDate)
        : getSessionsByStaffIdForMonth(selected.id, anchorDate)

    fetchSessions
      .then(async ({ sessions: rows }) => {
        if (cancelled) return
        setSessions(rows)
        const ids = rows.map((r) => r.id)
        const staffIds = [...new Set(rows.map((r) => r.staffId))]
        const [notes, timeline] = await Promise.all([
          ids.length ? getSessionNotesBySessionIds(ids) : [],
          getStaffSessionsForNoteStatus(staffIds),
        ])
        if (!cancelled) {
          setSessionNotes(notes)
          setStaffSessions(timeline)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSessions([])
          setSessionNotes([])
          setStaffSessions([])
        }
      })
      .finally(() => {
        if (!cancelled) setSessionsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selected, anchorDate])

  function handleSelect(person: SessionsPerson) {
    setSelected(person)
    setColorModeOverride(null)
    setSelectedSession(null)
    setPanelTab(person.kind === "client" ? "clients" : "staff")
  }

  const selectedSessionNote = useMemo(() => {
    if (!selectedSession) return undefined
    return sessionNotes.find((n) => n.session_id === selectedSession.id)
  }, [selectedSession, sessionNotes])

  function closeSessionPanel() {
    setSelectedSession(null)
  }

  return (
    <OwnerAppShell
      ownerName={ownerName}
      practiceName={practiceName}
      maxWidthClass="max-w-[1600px]"
    >
      <AppPageHeader
        title="Sessions"
        subtitle="One person's schedule at a time."
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        {!hidePanel && (
          panelLoading ? (
            <aside
              className="flex w-full shrink-0 items-center justify-center lg:w-[300px]"
              style={{ backgroundColor: P.card, borderRadius: P.radius }}
            >
              <p className="py-16 text-[15px] animate-pulse" style={{ color: P.faint }}>
                Loading…
              </p>
            </aside>
          ) : (
            <SessionsPeoplePanel
              tab={panelTab}
              onTabChange={setPanelTab}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              clients={filtered.clients}
              staffGroups={filtered.staffGroups}
              selected={selected}
              onSelect={handleSelect}
            />
          )
        )}

        <div className="relative min-h-0 min-w-0 flex-1">
          <PracticeSessionCalendar
            sessions={sessions}
            sessionNotes={sessionNotes}
            viewKind={viewKind}
            colorMode={colorMode}
            onColorModeChange={setColorModeOverride}
            anchorDate={anchorDate}
            onAnchorDateChange={setAnchorDate}
            selectedSessionId={selectedSession?.id ?? null}
            onSessionSelect={setSelectedSession}
            loading={sessionsLoading}
            empty={!selected}
            showColorBy={Boolean(selected)}
          />

          {selectedSession && (
            <>
              <button
                type="button"
                className="absolute inset-0 z-10 cursor-default"
                aria-label="Close session details"
                onClick={closeSessionPanel}
              />
              <SessionDetailPanel
                session={selectedSession}
                note={selectedSessionNote}
                staffSessions={staffSessions}
                onClose={closeSessionPanel}
              />
            </>
          )}
        </div>
      </div>
    </OwnerAppShell>
  )
}
