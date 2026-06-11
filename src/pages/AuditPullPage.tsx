import { useEffect, useMemo, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SessionStatusBadge } from "@/components/SessionStatusBadge"
import { getAuditNotesBundle, type AuditNoteBundleItem } from "@/lib/auditPull"
import {
  buildAuditCsvBundle,
  buildAuditTextBundle,
  downloadTextFile,
} from "@/lib/auditExport"
import { getRosterClients, type RosterClientEntry } from "@/lib/rosterScope"
import { formatEventStamp } from "@/lib/sessions"
import type { SessionStatus } from "@/types/session"

function formatDateInput(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function defaultDateRange(): { startDate: string; endDate: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 13)
  return { startDate: formatDateInput(start), endDate: formatDateInput(end) }
}

function clientOptionLabel(client: RosterClientEntry): string {
  if (client.displayName.toLowerCase() !== client.externalCode.toLowerCase()) {
    return `${client.externalCode} — ${client.displayName}`
  }
  return client.externalCode
}

type NoteBadgeKind = "on-file" | "missing" | "not-expected"

function noteBadgeKind(item: AuditNoteBundleItem): NoteBadgeKind {
  if (item.note) return "on-file"
  if (item.status === "completed") return "missing"
  return "not-expected"
}

const NOTE_BADGE_STYLES: Record<NoteBadgeKind, string> = {
  "on-file": "bg-emerald-50 text-emerald-800 ring-emerald-200",
  missing: "bg-amber-50 text-amber-800 ring-amber-200",
  "not-expected": "bg-muted text-muted-foreground ring-border",
}

const NOTE_BADGE_LABELS: Record<NoteBadgeKind, string> = {
  "on-file": "Note on file",
  missing: "Missing note",
  "not-expected": "No note expected",
}

function soapPreviewLine(item: AuditNoteBundleItem): string | null {
  if (!item.note) return null
  const text = item.note.subjective.trim() || item.note.objective.trim()
  if (!text) return null
  return text.replace(/\s+/g, " ")
}

function auditFilename(clientCode: string, startDate: string, endDate: string, ext: "txt" | "csv"): string {
  const safeCode = clientCode.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "client"
  return `audit-${safeCode}-${startDate}-to-${endDate}.${ext}`
}

function SessionPreviewRow({ item }: { item: AuditNoteBundleItem }) {
  const { date, time } = formatEventStamp(undefined, item.sessionAt)
  const badgeKind = noteBadgeKind(item)
  const preview = soapPreviewLine(item)

  return (
    <li className="rounded-lg border border-border bg-background px-3 py-3 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium text-foreground">
            {time ? `${date} · ${time}` : date}
          </p>
          <p className="text-sm text-muted-foreground">
            {item.staffName} · {item.sessionType}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <SessionStatusBadge status={item.status as SessionStatus} />
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${NOTE_BADGE_STYLES[badgeKind]}`}
          >
            {NOTE_BADGE_LABELS[badgeKind]}
          </span>
        </div>
      </div>
      {preview && (
        <p className="text-xs text-muted-foreground line-clamp-1">{preview}</p>
      )}
    </li>
  )
}

export function AuditPullPage({ practiceId }: { practiceId: string }) {
  const defaults = useMemo(() => defaultDateRange(), [])
  const [clients, setClients] = useState<RosterClientEntry[]>([])
  const [clientsLoading, setClientsLoading] = useState(true)
  const [clientsError, setClientsError] = useState<string | null>(null)

  const [clientId, setClientId] = useState("")
  const [startDate, setStartDate] = useState(defaults.startDate)
  const [endDate, setEndDate] = useState(defaults.endDate)
  const [formError, setFormError] = useState<string | null>(null)

  const [pulling, setPulling] = useState(false)
  const [pullError, setPullError] = useState<string | null>(null)
  const [items, setItems] = useState<AuditNoteBundleItem[] | null>(null)
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

    getRosterClients(practiceId)
      .then((rows) => {
        if (cancelled) return
        setClients(rows)
        if (rows.length > 0) {
          setClientId((current) => current || rows[0].id)
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
  }, [practiceId])

  const missingNoteCount = useMemo(() => {
    if (!items) return 0
    return items.filter((item) => item.status === "completed" && !item.note).length
  }, [items])

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

    try {
      const bundle = await getAuditNotesBundle(clientId, startDate, endDate)
      const client = clients.find((c) => c.id === clientId)
      setItems(bundle)
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

  function handleDownloadTxt() {
    if (!items || !pulledMeta) return
    const content = buildAuditTextBundle(
      pulledMeta.clientCode,
      pulledMeta.clientName,
      pulledMeta.startDate,
      pulledMeta.endDate,
      items,
    )
    downloadTextFile(
      auditFilename(pulledMeta.clientCode, pulledMeta.startDate, pulledMeta.endDate, "txt"),
      content,
    )
  }

  function handleDownloadCsv() {
    if (!items || !pulledMeta) return
    const content = buildAuditCsvBundle(
      pulledMeta.clientCode,
      pulledMeta.startDate,
      pulledMeta.endDate,
      items,
    )
    downloadTextFile(
      auditFilename(pulledMeta.clientCode, pulledMeta.startDate, pulledMeta.endDate, "csv"),
      content,
      "text/csv;charset=utf-8",
    )
  }

  return (
    <div className="min-h-svh bg-[#F0F4F4] text-foreground flex flex-col items-center gap-6 p-4 pb-10">
      <header className="flex w-full max-w-3xl items-center justify-between gap-4 pt-2">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Dashboard
        </Link>
      </header>

      <div className="w-full max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#1E2A2A]">
            Audit pull
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a client and date range to bundle session notes for an insurance audit.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Search</CardTitle>
            <CardDescription>
              Sessions in the range are listed with SOAP notes where available.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {clientsLoading && (
              <p className="text-sm text-muted-foreground animate-pulse">Loading clients…</p>
            )}

            {clientsError && (
              <p className="text-sm text-red-600">{clientsError}</p>
            )}

            {!clientsLoading && !clientsError && clients.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No active clients with roster codes. Import a roster first.
              </p>
            )}

            {!clientsLoading && !clientsError && clients.length > 0 && (
              <>
                <div className="space-y-1.5">
                  <label htmlFor="audit-client" className="text-sm font-medium">
                    Client
                  </label>
                  <Select
                    value={clientId}
                    onValueChange={(value) => setClientId(value ?? "")}
                    disabled={pulling}
                  >
                    <SelectTrigger id="audit-client" className="w-full">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {clientOptionLabel(client)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="audit-start" className="text-sm font-medium">
                      Start date
                    </label>
                    <Input
                      id="audit-start"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      disabled={pulling}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="audit-end" className="text-sm font-medium">
                      End date
                    </label>
                    <Input
                      id="audit-end"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      disabled={pulling}
                    />
                  </div>
                </div>

                {(formError || pullError) && (
                  <p className="text-sm text-red-600">{formError ?? pullError}</p>
                )}

                <Button type="button" onClick={handlePull} disabled={pulling}>
                  {pulling ? "Pulling notes…" : "Pull notes"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {items !== null && pulledMeta && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {items.length} session{items.length === 1 ? "" : "s"}
              </CardTitle>
              <CardDescription>
                {items.length === 0
                  ? "No sessions in this date range."
                  : missingNoteCount > 0
                    ? `${missingNoteCount} completed session${missingNoteCount === 1 ? "" : "s"} missing notes.`
                    : "All completed sessions have notes on file."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.length > 0 && (
                <>
                  <ul className="space-y-2">
                    {items.map((item) => (
                      <SessionPreviewRow key={item.sessionId} item={item} />
                    ))}
                  </ul>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={handleDownloadTxt}>
                      Download .txt
                    </Button>
                    <Button type="button" variant="outline" onClick={handleDownloadCsv}>
                      Download .csv
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
