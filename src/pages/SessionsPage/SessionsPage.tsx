import { useEffect, useMemo, useState } from "react"
import { OwnerAppShell } from "@/components/dashboard/OwnerAppShell"
import { useOwnerShell } from "@/hooks/useOwnerShell"
import {
  filterPanelBySearch,
  loadSessionsPagePanelData,
  type SessionsClientEntry,
  type SessionsPerson,
} from "@/lib/sessionsPageScope"
import {
  getSessionNotesBySessionIds,
  getSessionsByClientIdForMonth,
  getSessionsByStaffIdForMonth,
  type SessionNoteRecord,
  type SessionRecord,
} from "@/lib/supabase"
import { P } from "@/pages/ClientOverviewPage/profileTokens"
import { PracticeSessionCalendar } from "@/pages/SessionsPage/PracticeSessionCalendar"
import {
  SessionsPeoplePanel,
  type PanelTab,
} from "@/pages/SessionsPage/SessionsPeoplePanel"
import {
  defaultColorMode,
  type CalendarColorMode,
} from "@/pages/SessionsPage/sessionsCalendarUtils"

const RECENT_CLIENTS_KEY = "pulse-sessions-recent-clients"
const MAX_RECENT = 5

function loadRecentClientIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_CLIENTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : []
  } catch {
    return []
  }
}

function saveRecentClientIds(ids: string[]) {
  try {
    localStorage.setItem(RECENT_CLIENTS_KEY, JSON.stringify(ids.slice(0, MAX_RECENT)))
  } catch {
    // ignore quota errors
  }
}

function pushRecentClient(ids: string[], clientId: string): string[] {
  return [clientId, ...ids.filter((id) => id !== clientId)].slice(0, MAX_RECENT)
}

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
  const [clients, setClients] = useState<SessionsClientEntry[]>([])
  const [staffGroups, setStaffGroups] = useState<
    Awaited<ReturnType<typeof loadSessionsPagePanelData>>["staffGroups"]
  >([])
  const [hidePanel, setHidePanel] = useState(false)
  const [recentClientIds, setRecentClientIds] = useState<string[]>(() => loadRecentClientIds())

  const [panelTab, setPanelTab] = useState<PanelTab>("clients")
  const [searchQuery, setSearchQuery] = useState("")
  const [selected, setSelected] = useState<SessionsPerson | null>(null)
  const [colorModeOverride, setColorModeOverride] = useState<CalendarColorMode | null>(null)

  const [anchorDate, setAnchorDate] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  )
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [sessionNotes, setSessionNotes] = useState<SessionNoteRecord[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)

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

  const clientById = useMemo(
    () => new Map(clients.map((c) => [c.id, c])),
    [clients],
  )

  const recentClients = useMemo(
    () =>
      recentClientIds
        .map((id) => clientById.get(id))
        .filter((c): c is SessionsClientEntry => c != null),
    [recentClientIds, clientById],
  )

  const viewKind = selected?.kind ?? "client"
  const colorMode = colorModeOverride ?? defaultColorMode(viewKind)

  useEffect(() => {
    if (!selected) {
      setSessions([])
      setSessionNotes([])
      return
    }

    let cancelled = false
    setSessionsLoading(true)

    const fetchSessions =
      selected.kind === "client"
        ? getSessionsByClientIdForMonth(selected.id, anchorDate)
        : getSessionsByStaffIdForMonth(selected.id, anchorDate)

    fetchSessions
      .then(async ({ sessions: rows }) => {
        if (cancelled) return
        setSessions(rows)
        const ids = rows.map((r) => r.id)
        const notes = ids.length ? await getSessionNotesBySessionIds(ids) : []
        if (!cancelled) setSessionNotes(notes)
      })
      .catch(() => {
        if (!cancelled) {
          setSessions([])
          setSessionNotes([])
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
    setPanelTab(person.kind === "client" ? "clients" : "staff")

    if (person.kind === "client") {
      setRecentClientIds((prev) => {
        const next = pushRecentClient(prev, person.id)
        saveRecentClientIds(next)
        return next
      })
    }
  }

  const selectedLabel = selected
    ? selected.kind === "client"
      ? `Client · ${selected.label}`
      : `Staff · ${selected.label}`
    : undefined

  return (
    <OwnerAppShell
      ownerName={ownerName}
      practiceName={practiceName}
      maxWidthClass="max-w-[1600px]"
    >
      <header className="shrink-0">
        <h1 className="text-[28px] font-semibold tracking-tight" style={{ color: P.ink }}>
          Sessions
        </h1>
        <p className="mt-1 text-[15px]" style={{ color: P.soft }}>
          One person&apos;s schedule at a time.
        </p>
      </header>

      <div className="mt-6 flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
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
              recentClients={recentClients}
              staffGroups={filtered.staffGroups}
              selected={selected}
              onSelect={handleSelect}
            />
          )
        )}

        <PracticeSessionCalendar
          sessions={sessions}
          sessionNotes={sessionNotes}
          viewKind={viewKind}
          colorMode={colorMode}
          onColorModeChange={setColorModeOverride}
          anchorDate={anchorDate}
          onAnchorDateChange={setAnchorDate}
          loading={sessionsLoading}
          empty={!selected}
          selectedLabel={selectedLabel}
        />
      </div>
    </OwnerAppShell>
  )
}
