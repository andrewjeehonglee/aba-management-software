import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { AuditExportMenu } from "@/components/audit/AuditExportMenu"
import { AuditReadinessSummary } from "@/components/audit/AuditReadinessSummary"
import { AuditSessionList } from "@/components/audit/AuditSessionList"
import { ClientSearchSelect } from "@/components/audit/ClientSearchSelect"
import { OwnerAppShell } from "@/components/dashboard/OwnerAppShell"
import { AppPageHeader } from "@/components/dashboard/AppPageHeader"
import { useOwnerShell } from "@/hooks/useOwnerShell"
import { getAuditScopedClients, type AuditClientEntry } from "@/lib/auditClients"
import {
  buildNoteBucketMap,
  computeAuditReadiness,
  sortAuditSessions,
} from "@/lib/auditReadiness"
import {
  getAuditNotesBundle,
  getSessionIdsWithBehaviorIncidents,
  type AuditNoteBundleItem,
} from "@/lib/auditPull"
import { P, SECTION_LABEL, TILE_TITLE } from "@/pages/ClientOverviewPage/profileTokens"

function formatDateInput(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function defaultDateRange(days: number): { startDate: string; endDate: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - (days - 1))
  return { startDate: formatDateInput(start), endDate: formatDateInput(end) }
}

type DatePreset = "30" | "90" | "custom"

const DATE_PRESETS: { id: Exclude<DatePreset, "custom">; label: string; days: number }[] = [
  { id: "30", label: "Last 30 days", days: 30 },
  { id: "90", label: "Last 90 days", days: 90 },
]

function presetForRange(startDate: string, endDate: string): DatePreset {
  for (const preset of DATE_PRESETS) {
    const range = defaultDateRange(preset.days)
    if (range.startDate === startDate && range.endDate === endDate) return preset.id
  }
  return "custom"
}

export function AuditPullPage({
  practiceId,
  userRole,
  currentStaffId,
}: {
  practiceId: string
  userRole?: string
  currentStaffId?: string | null
}) {
  const { ownerName, practiceName } = useOwnerShell(practiceId, userRole)
  const [searchParams] = useSearchParams()
  const presetClientId = searchParams.get("clientId") ?? ""
  const defaults = useMemo(() => defaultDateRange(30), [])

  const [clients, setClients] = useState<AuditClientEntry[]>([])
  const [clientsLoading, setClientsLoading] = useState(true)
  const [clientsError, setClientsError] = useState<string | null>(null)

  const [clientId, setClientId] = useState("")
  const [datePreset, setDatePreset] = useState<DatePreset>("30")
  const [startDate, setStartDate] = useState(defaults.startDate)
  const [endDate, setEndDate] = useState(defaults.endDate)
  const [formError, setFormError] = useState<string | null>(null)

  const [pulling, setPulling] = useState(false)
  const [pullError, setPullError] = useState<string | null>(null)
  const [items, setItems] = useState<AuditNoteBundleItem[] | null>(null)
  const [incidentSessionIds, setIncidentSessionIds] = useState<Set<string>>(new Set())
  const [pulledMeta, setPulledMeta] = useState<{
    clientCode: string
    clientName: string
    startDate: string
    endDate: string
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    setClientsLoading(true)
    setClientsError(null)

    getAuditScopedClients(practiceId, userRole ?? "technician", currentStaffId ?? null)
      .then((rows) => {
        if (cancelled) return
        setClients(rows)
        if (rows.length > 0) {
          setClientId((current) => {
            if (current && rows.some((row) => row.id === current)) return current
            if (presetClientId && rows.some((row) => row.id === presetClientId)) {
              return presetClientId
            }
            return rows[0].id
          })
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setClientsError(err instanceof Error ? err.message : "Could not load clients.")
      })
      .finally(() => {
        if (!cancelled) setClientsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [practiceId, presetClientId, userRole, currentStaffId])

  const activePreset: DatePreset =
    datePreset === "custom" ? "custom" : presetForRange(startDate, endDate)

  const bucketMap = useMemo(
    () => (items ? buildNoteBucketMap(items) : new Map()),
    [items],
  )

  const readiness = useMemo(
    () => (items ? computeAuditReadiness(items, bucketMap) : null),
    [items, bucketMap],
  )

  const sortedItems = useMemo(
    () => (items ? sortAuditSessions(items, bucketMap) : []),
    [items, bucketMap],
  )

  function applyPreset(preset: Exclude<DatePreset, "custom">) {
    setDatePreset(preset)
    const match = DATE_PRESETS.find((entry) => entry.id === preset)
    if (!match) return
    const range = defaultDateRange(match.days)
    setStartDate(range.startDate)
    setEndDate(range.endDate)
  }

  async function handlePull() {
    setFormError(null)
    setPullError(null)

    if (!clientId) {
      setFormError("Select a client.")
      return
    }
    if (startDate > endDate) {
      setFormError("Start date must be on or before end date.")
      return
    }

    setPulling(true)
    setItems(null)
    setPulledMeta(null)
    setIncidentSessionIds(new Set())

    try {
      const bundle = await getAuditNotesBundle(clientId, startDate, endDate)
      const client = clients.find((entry) => entry.id === clientId)
      const sessionIds = bundle.map((item) => item.sessionId)
      const incidents = await getSessionIdsWithBehaviorIncidents(sessionIds)

      setItems(bundle)
      setIncidentSessionIds(incidents)
      setPulledMeta({
        clientCode: client?.externalCode ?? bundle[0]?.clientCode ?? "",
        clientName: client?.displayName ?? bundle[0]?.clientName ?? "",
        startDate,
        endDate,
      })
    } catch (err: unknown) {
      setPullError(err instanceof Error ? err.message : "Could not pull session notes.")
    } finally {
      setPulling(false)
    }
  }

  return (
    <OwnerAppShell ownerName={ownerName} practiceName={practiceName} maxWidthClass="max-w-[1600px]">
      <div className="flex min-h-0 flex-1 flex-col">
        <AppPageHeader
          title="Audit"
          subtitle="Pick a client and date range to pull session notes for an insurance audit."
        />

        <section
          className="p-6"
          style={{ backgroundColor: P.card, borderRadius: P.radius }}
        >

          {clientsLoading && (
            <p className="text-[16px] animate-pulse" style={{ color: P.faint }}>
              Loading clients…
            </p>
          )}

          {clientsError && (
            <p className="text-[15px]" style={{ color: P.cancel }}>
              {clientsError}
            </p>
          )}

          {!clientsLoading && !clientsError && clients.length === 0 && (
            <p className="text-[16px]" style={{ color: P.soft }}>
              No clients on your caseload with roster codes. Import a roster first.
            </p>
          )}

          {!clientsLoading && !clientsError && clients.length > 0 && (
            <div className="space-y-6">
              <ClientSearchSelect
                clients={clients}
                value={clientId}
                onChange={setClientId}
                disabled={pulling}
              />

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`${SECTION_LABEL} mr-1 text-[13px]`} style={{ color: P.faint }}>
                    Date range
                  </span>
                  {DATE_PRESETS.map((preset) => {
                    const selected = activePreset === preset.id
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        disabled={pulling}
                        onClick={() => applyPreset(preset.id)}
                        className="rounded-full px-4 py-2 text-[15px] font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
                        style={{
                          backgroundColor: selected ? P.sageBg : P.inset,
                          color: selected ? P.sageInk : P.soft,
                          boxShadow: selected ? `inset 0 0 0 1px ${P.sage}` : undefined,
                        }}
                      >
                        {preset.label}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    disabled={pulling}
                    onClick={() => setDatePreset("custom")}
                    className="rounded-full px-4 py-2 text-[15px] font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
                    style={{
                      backgroundColor: activePreset === "custom" ? P.sageBg : P.inset,
                      color: activePreset === "custom" ? P.sageInk : P.soft,
                      boxShadow: activePreset === "custom" ? `inset 0 0 0 1px ${P.sage}` : undefined,
                    }}
                  >
                    Custom
                  </button>
                </div>

                {activePreset === "custom" && (
                  <div className="mt-4 flex flex-wrap items-end gap-4">
                    <label className="space-y-1.5">
                      <span className={`block ${SECTION_LABEL} text-[13px]`} style={{ color: P.faint }}>
                        Start date
                      </span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setDatePreset("custom")
                          setStartDate(e.target.value)
                        }}
                        disabled={pulling}
                        className="rounded-lg border px-3 py-2.5 text-[16px]"
                        style={{ borderColor: P.rule, backgroundColor: P.inset, color: P.ink }}
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className={`block ${SECTION_LABEL} text-[13px]`} style={{ color: P.faint }}>
                        End date
                      </span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          setDatePreset("custom")
                          setEndDate(e.target.value)
                        }}
                        disabled={pulling}
                        className="rounded-lg border px-3 py-2.5 text-[16px]"
                        style={{ borderColor: P.rule, backgroundColor: P.inset, color: P.ink }}
                      />
                    </label>
                  </div>
                )}
              </div>

              {(formError || pullError) && (
                <p className="text-[15px]" style={{ color: P.cancel }}>
                  {formError ?? pullError}
                </p>
              )}

              {startDate > endDate && (
                <p className="text-[15px]" style={{ color: P.cancel }}>
                  Start date must be on or before end date.
                </p>
              )}

              <button
                type="button"
                onClick={handlePull}
                disabled={pulling || startDate > endDate}
                className="inline-flex rounded-full px-6 py-3 text-[16px] font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: P.sage }}
              >
                {pulling ? "Pulling notes…" : "Pull notes"}
              </button>
            </div>
          )}
        </section>

        {items !== null && pulledMeta && readiness && (
          <div className="owner-scroll mt-6 min-h-0 flex-1 space-y-6 overflow-y-auto pb-2 pr-1">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className={TILE_TITLE} style={{ color: P.ink }}>
                  Results
                </h2>
                <p className="mt-1.5 text-[15px]" style={{ color: P.soft }}>
                  {pulledMeta.clientName}
                  {pulledMeta.clientCode ? ` (${pulledMeta.clientCode})` : ""} ·{" "}
                  {pulledMeta.startDate} to {pulledMeta.endDate}
                </p>
              </div>
              <AuditExportMenu
                clientCode={pulledMeta.clientCode}
                clientName={pulledMeta.clientName}
                startDate={pulledMeta.startDate}
                endDate={pulledMeta.endDate}
                items={sortedItems}
              />
            </div>

            <AuditReadinessSummary stats={readiness} />

            <section className="p-6" style={{ backgroundColor: P.card, borderRadius: P.radius }}>
              <h2 className={TILE_TITLE} style={{ color: P.ink }}>
                Sessions
              </h2>
              <p className="mt-1.5 text-[14px]" style={{ color: P.faint }}>
                Gaps appear first — expand a row for SOAP notes and signature status.
              </p>
              <div className="mt-3">
                <AuditSessionList
                  items={sortedItems}
                  bucketMap={bucketMap}
                  incidentSessionIds={incidentSessionIds}
                />
              </div>
            </section>
          </div>
        )}
      </div>
    </OwnerAppShell>
  )
}
