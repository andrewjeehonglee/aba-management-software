import { useEffect, useMemo, useState } from "react"
import { OwnerAppShell } from "@/components/dashboard/OwnerAppShell"
import { useOwnerShell } from "@/hooks/useOwnerShell"
import {
  filterPanelBySearch,
  loadSessionsPagePanelData,
  type SessionsPerson,
} from "@/lib/sessionsPageScope"
import {
  getSessionNotesBySessionIds,
  getSessionsByClientIdForMonth,
  getSessionsByStaffIdForMonth,
  type SessionNoteRecord,
  type SessionRecord,
} from "@/lib/supabase"
import { cn } from "@/lib/utils"
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
  const [clientGroups, setClientGroups] = useState<
    Awaited<ReturnType<typeof loadSessionsPagePanelData>>["clientGroups"]
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
  const [sessionsLoading, setSessionsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setPanelLoading(true)

    loadSessionsPagePanelData(practiceId, userRole ?? "technician", currentStaffId ?? null)
      .then((data) => {
        if (cancelled) return
        setClientGroups(data.clientGroups)
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
    () => filterPanelBySearch(clientGroups, staffGroups, searchQuery),
    [clientGroups, staffGroups, searchQuery],
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
          One person&apos;s schedule at a time — pick from the panel or search.
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
                Loading people…
              </p>
            </aside>
          ) : (
            <SessionsPeoplePanel
              tab={panelTab}
              onTabChange={setPanelTab}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              clientGroups={filtered.clientGroups}
              staffGroups={filtered.staffGroups}
              selected={selected}
              onSelect={handleSelect}
            />
          )
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          {selected && (
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <span
                className="text-[12px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: P.faint }}
              >
                Color by
              </span>
              <div
                className="inline-flex items-center gap-0.5 rounded-full p-1"
                style={{ backgroundColor: P.inset }}
              >
                {(
                  [
                    { id: "status" as const, label: "Status" },
                    { id: "type" as const, label: "Type" },
                  ] as const
                ).map(({ id, label }) => {
                  const active = colorMode === id
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setColorModeOverride(id)}
                      className={cn(
                        "rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                        active ? "shadow-sm" : "hover:opacity-80",
                      )}
                      style={{
                        backgroundColor: active ? P.card : "transparent",
                        color: active ? P.sageInk : P.soft,
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <PracticeSessionCalendar
            sessions={sessions}
            sessionNotes={sessionNotes}
            viewKind={viewKind}
            colorMode={colorMode}
            anchorDate={anchorDate}
            onAnchorDateChange={setAnchorDate}
            loading={sessionsLoading}
            empty={!selected}
            selectedLabel={selectedLabel}
          />
        </div>
      </div>
    </OwnerAppShell>
  )
}
