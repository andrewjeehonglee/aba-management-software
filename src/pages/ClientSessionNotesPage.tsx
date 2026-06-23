import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ChevronDown, ChevronRight, Download, Loader2 } from "lucide-react"
import { Link, useParams } from "react-router-dom"
import { getAuditNotesBundle, type AuditNoteBundleItem } from "@/lib/auditPull"
import {
  buildAuditCsvBundle,
  buildAuditTextBundle,
  downloadTextFile,
} from "@/lib/auditExport"
import { isCompleteSessionNote } from "@/lib/notesStatus"
import { clientProfilePath, resolveClientByRouteKey } from "@/lib/rosterScope"
import { formatEventStamp } from "@/lib/sessions"
import { P, SECTION_LABEL } from "@/pages/ClientOverviewPage/profileTokens"
import { formatClientDisplayName, clientStatusLabel } from "@/pages/ClientOverviewPage/clientProfileUtils"

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

type DatePreset = "7" | "14" | "30"

const DATE_PRESETS: { id: DatePreset; label: string; days: number }[] = [
  { id: "7", label: "7 days", days: 7 },
  { id: "14", label: "14 days", days: 14 },
  { id: "30", label: "1 month", days: 30 },
]

function presetForRange(startDate: string, endDate: string): DatePreset | null {
  for (const preset of DATE_PRESETS) {
    const { startDate: s, endDate: e } = defaultDateRange(preset.days)
    if (s === startDate && e === endDate) return preset.id
  }
  return null
}

function auditFilename(clientCode: string, startDate: string, endDate: string, ext: "txt" | "csv"): string {
  const safeCode = clientCode.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "client"
  return `audit-${safeCode}-${startDate}-to-${endDate}.${ext}`
}

function notePreview(item: AuditNoteBundleItem): string {
  if (!item.note) return ""
  const text = item.note.subjective.trim() || item.note.objective.trim()
  return text.replace(/\s+/g, " ")
}

function CompletedNoteRow({ item }: { item: AuditNoteBundleItem }) {
  const [open, setOpen] = useState(false)
  const { date, time } = formatEventStamp(undefined, item.sessionAt)
  const preview = notePreview(item)

  return (
    <li
      className="py-4 first:pt-0"
      style={{ borderTop: `1px solid ${P.rule}` }}
    >
      <button
        type="button"
        className="flex w-full items-start gap-2 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="mt-0.5 shrink-0" style={{ color: P.faint }}>
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-[16px] font-medium" style={{ color: P.ink }}>
              {date}
            </span>
            {time && (
              <span className="text-[13px]" style={{ color: P.faint }}>
                {time}
              </span>
            )}
          </div>
          {!open && preview && (
            <p className="mt-1 line-clamp-1 text-[14px]" style={{ color: P.soft }}>
              {preview}
            </p>
          )}
        </div>
      </button>

      {open && item.note && (
        <dl className="mt-3 ml-6 grid grid-cols-[5.5rem_1fr] gap-x-4 gap-y-3 text-[14px]">
          {(
            [
              { label: "Subjective", value: item.note.subjective },
              { label: "Objective", value: item.note.objective },
              { label: "Assessment", value: item.note.assessment },
              { label: "Plan", value: item.note.plan },
            ] as const
          ).map(({ label, value }) => (
            <div key={label} className="contents">
              <dt
                className={`${SECTION_LABEL} pt-0.5`}
                style={{ color: P.faint }}
              >
                {label}
              </dt>
              <dd className="whitespace-pre-wrap leading-relaxed" style={{ color: P.soft }}>
                {value?.trim() || "Not on file"}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  )
}

function DueNoteRow({ item }: { item: AuditNoteBundleItem }) {
  const { date, time } = formatEventStamp(undefined, item.sessionAt)

  return (
    <li
      className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0"
      style={{ borderTop: `1px solid ${P.rule}` }}
    >
      <div>
        <p className="text-[16px] font-medium" style={{ color: P.ink }}>
          {date}
          {time ? ` · ${time}` : ""}
        </p>
        <p className="mt-0.5 text-[13px]" style={{ color: P.soft }}>
          {item.staffName} · {item.sessionType}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span
          className="inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-medium"
          style={{ backgroundColor: P.amberBg, color: P.amberInk }}
        >
          Note due
        </span>
        <Link
          to={`/session/${item.sessionId}`}
          className="text-[13px] font-medium hover:underline underline-offset-2"
          style={{ color: P.sage }}
        >
          Complete note →
        </Link>
      </div>
    </li>
  )
}

export function ClientSessionNotesPage({ practiceId }: { practiceId: string }) {
  const { clientId: clientRouteKey } = useParams<{ clientId: string }>()
  const defaults = useMemo(() => defaultDateRange(14), [])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [clientStatus, setClientStatus] = useState<string | null>("active")
  const [clientUuid, setClientUuid] = useState<string | null>(null)
  const [clientCode, setClientCode] = useState("")
  const [startDate, setStartDate] = useState(defaults.startDate)
  const [endDate, setEndDate] = useState(defaults.endDate)
  const [items, setItems] = useState<AuditNoteBundleItem[]>([])
  const [dueItems, setDueItems] = useState<AuditNoteBundleItem[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!clientRouteKey) {
      setNotFound(true)
      setLoading(false)
      return
    }
    let cancelled = false
    resolveClientByRouteKey(practiceId, clientRouteKey)
      .then((client) => {
        if (cancelled) return
        if (!client) {
          setNotFound(true)
          return
        }
        setDisplayName(formatClientDisplayName(client))
        setClientStatus(client.status)
        setClientUuid(client.id)
        setClientCode(client.external_code ?? clientRouteKey)
      })
      .catch(() => {
        if (!cancelled) setNotFound(true)
      })
    return () => {
      cancelled = true
    }
  }, [clientRouteKey, practiceId])

  useEffect(() => {
    if (!clientUuid) return
    if (startDate > endDate) return

    let cancelled = false
    setLoading(true)
    setFetchError(null)

    getAuditNotesBundle(clientUuid, startDate, endDate)
      .then((bundle) => {
        if (!cancelled) setItems(bundle)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setFetchError(err instanceof Error ? err.message : "Could not load session notes.")
          setItems([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [clientUuid, startDate, endDate])

  useEffect(() => {
    if (!clientUuid) return

    const dueRange = defaultDateRange(60)
    let cancelled = false

    getAuditNotesBundle(clientUuid, dueRange.startDate, dueRange.endDate)
      .then((bundle) => {
        if (cancelled) return
        setDueItems(
          bundle
            .filter(
              (item) =>
                item.status === "completed" &&
                !isCompleteSessionNote(item.note ?? undefined),
            )
            .sort((a, b) => b.sessionAt.localeCompare(a.sessionAt)),
        )
      })
      .catch(() => {
        if (!cancelled) setDueItems([])
      })

    return () => {
      cancelled = true
    }
  }, [clientUuid])

  const completedItems = useMemo(
    () =>
      items
        .filter((item) => item.note && isCompleteSessionNote(item.note))
        .sort((a, b) => b.sessionAt.localeCompare(a.sessionAt)),
    [items],
  )

  function handleExportTxt() {
    if (!clientUuid) return
    setExporting(true)
    try {
      const content = buildAuditTextBundle(clientCode, displayName, startDate, endDate, items)
      downloadTextFile(auditFilename(clientCode, startDate, endDate, "txt"), content)
    } finally {
      setExporting(false)
    }
  }

  function handleExportCsv() {
    if (!clientUuid) return
    setExporting(true)
    try {
      const content = buildAuditCsvBundle(clientCode, startDate, endDate, items)
      downloadTextFile(
        auditFilename(clientCode, startDate, endDate, "csv"),
        content,
        "text/csv;charset=utf-8",
      )
    } finally {
      setExporting(false)
    }
  }

  if (notFound) {
    return (
      <div
        className="flex min-h-svh items-center justify-center text-[15px]"
        style={{ backgroundColor: P.bg, color: P.soft }}
      >
        Client not found.
      </div>
    )
  }

  const profilePath = clientRouteKey ? clientProfilePath(clientRouteKey) : "/"
  const statusLabel = clientStatusLabel(clientStatus)
  const isActiveStatus = (clientStatus ?? "active").toLowerCase() === "active"
  const activePreset = presetForRange(startDate, endDate)

  function applyPreset(preset: DatePreset) {
    const match = DATE_PRESETS.find((p) => p.id === preset)
    if (!match) return
    const range = defaultDateRange(match.days)
    setStartDate(range.startDate)
    setEndDate(range.endDate)
  }

  return (
    <div className="min-h-svh px-10 py-6" style={{ backgroundColor: P.bg, color: P.ink }}>
      <div className="mx-auto w-full max-w-[900px]">
        <Link
          to={profilePath}
          className="inline-flex items-center gap-1.5 text-[15px] transition-opacity hover:opacity-80"
          style={{ color: P.soft }}
        >
          <ArrowLeft className="size-4" />
          Back to client profile
        </Link>

        <header className="mt-6">
          <h1 className="text-[28px] font-semibold tracking-tight">Session notes</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-[28px] font-semibold tracking-tight">
              {displayName || "…"}
            </p>
            {displayName && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium"
                style={{
                  backgroundColor: isActiveStatus ? P.sageBg : P.amberBg,
                  color: isActiveStatus ? P.sageInk : P.amberInk,
                }}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: isActiveStatus ? P.sage : P.amber }}
                  aria-hidden="true"
                />
                {statusLabel}
              </span>
            )}
          </div>
        </header>

        <section
          className="mt-6 p-5"
          style={{ backgroundColor: P.card, borderRadius: P.radius }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className={`${SECTION_LABEL} mr-1`} style={{ color: P.faint }}>
              Range
            </span>
            {DATE_PRESETS.map((preset) => {
              const selected = activePreset === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className="rounded-full px-3.5 py-1.5 text-[14px] font-medium transition-opacity hover:opacity-90"
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
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-4">
            <label className="space-y-1">
              <span className={`block ${SECTION_LABEL}`} style={{ color: P.faint }}>
                Start date
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border px-3 py-2 text-[15px]"
                style={{ borderColor: P.rule, backgroundColor: P.inset, color: P.ink }}
              />
            </label>
            <label className="space-y-1">
              <span className={`block ${SECTION_LABEL}`} style={{ color: P.faint }}>
                End date
              </span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border px-3 py-2 text-[15px]"
                style={{ borderColor: P.rule, backgroundColor: P.inset, color: P.ink }}
              />
            </label>
            <div className="ml-auto flex flex-wrap gap-2">
              <button
                type="button"
                disabled={exporting || loading || !clientUuid}
                onClick={handleExportTxt}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: P.sage }}
              >
                {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                Export for audit (.txt)
              </button>
              <button
                type="button"
                disabled={exporting || loading || !clientUuid}
                onClick={handleExportCsv}
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[14px] font-semibold disabled:opacity-50"
                style={{ borderColor: P.rule, color: P.sageInk, backgroundColor: P.sageBg }}
              >
                Export (.csv)
              </button>
            </div>
          </div>

          {startDate > endDate && (
            <p className="mt-3 text-[14px]" style={{ color: P.cancel }}>
              Start date must be on or before end date.
            </p>
          )}
          {fetchError && (
            <p className="mt-3 text-[14px]" style={{ color: P.cancel }}>
              {fetchError}
            </p>
          )}
        </section>

        <section
          className="mt-6 p-5"
          style={{ backgroundColor: P.card, borderRadius: P.radius }}
        >
          <h2 className="text-[18px] font-semibold" style={{ color: P.ink }}>
            Due
          </h2>
          {loading && dueItems.length === 0 ? (
            <p className="mt-4 text-[15px] animate-pulse" style={{ color: P.faint }}>
              Loading…
            </p>
          ) : dueItems.length === 0 ? (
            <p className="mt-4 text-[15px]" style={{ color: P.soft }}>
              No notes due — all caught up.
            </p>
          ) : (
            <ul className="mt-2">
              {dueItems.map((item) => (
                <DueNoteRow key={item.sessionId} item={item} />
              ))}
            </ul>
          )}
        </section>

        <section
          className="mt-6 p-5"
          style={{ backgroundColor: P.card, borderRadius: P.radius }}
        >
          <h2 className="text-[18px] font-semibold" style={{ color: P.ink }}>
            Completed notes
          </h2>
          {loading ? (
            <p className="mt-4 text-[15px] animate-pulse" style={{ color: P.faint }}>
              Loading…
            </p>
          ) : completedItems.length === 0 ? (
            <p className="mt-4 text-[15px]" style={{ color: P.soft }}>
              No submitted notes in this date range.
            </p>
          ) : (
            <ul className="mt-2">
              {completedItems.map((item) => (
                <CompletedNoteRow key={item.sessionId} item={item} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
