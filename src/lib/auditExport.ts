import type { AuditNoteBundleItem } from "@/lib/auditPull"
import { formatEventStamp, PRACTICE_TIMEZONE } from "@/lib/sessions"

const SESSION_SEPARATOR = "────────────────────────────────────────"

function formatGeneratedTimestamp(date: Date = new Date()): string {
  return date.toLocaleString("en-US", {
    timeZone: PRACTICE_TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  })
}

function sessionStamp(sessionAt: string): { date: string; time: string } {
  return formatEventStamp(undefined, sessionAt)
}

function formatSessionHeader(sessionAt: string): string {
  const { date, time } = sessionStamp(sessionAt)
  return time ? `${date} at ${time}` : date
}

function soapSection(label: string, value: string): string {
  const body = value.trim() || "—"
  return `${label}:\n${body}`
}

function buildSessionTextBlock(item: AuditNoteBundleItem): string {
  const lines = [
    `Session — ${formatSessionHeader(item.sessionAt)}`,
    `Staff: ${item.staffName}`,
    `Type: ${item.sessionType}`,
    `Status: ${item.status}`,
    "",
  ]

  if (!item.note) {
    lines.push("NOTE: No session note on file for this session.")
    return lines.join("\n")
  }

  lines.push(
    soapSection("Subjective", item.note.subjective),
    "",
    soapSection("Objective", item.note.objective),
    "",
    soapSection("Assessment", item.note.assessment),
    "",
    soapSection("Plan", item.note.plan),
  )
  return lines.join("\n")
}

export function buildAuditTextBundle(
  clientCode: string,
  clientName: string,
  startDate: string,
  endDate: string,
  items: AuditNoteBundleItem[],
): string {
  const clientLabel = clientCode ? `${clientCode} — ${clientName}` : clientName
  const header = [
    "AUDIT PULL — SESSION NOTES",
    "==========================",
    "",
    `Client: ${clientLabel}`,
    `Date range: ${startDate} to ${endDate}`,
    `Sessions: ${items.length}`,
    `Generated: ${formatGeneratedTimestamp()}`,
    "",
    SESSION_SEPARATOR,
  ]

  if (items.length === 0) {
    return [...header, "", "No sessions in this date range.", ""].join("\n")
  }

  const blocks = items.map((item) => buildSessionTextBlock(item))
  return [...header, "", blocks.join(`\n\n${SESSION_SEPARATOR}\n\n`), ""].join("\n")
}

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function csvRow(values: string[]): string {
  return values.map(escapeCsvField).join(",")
}

export function buildAuditCsvBundle(
  clientCode: string,
  startDate: string,
  endDate: string,
  items: AuditNoteBundleItem[],
): string {
  const clientName = items[0]?.clientName ?? ""
  const headers = [
    "client_code",
    "client_name",
    "date_range_start",
    "date_range_end",
    "session_date",
    "session_time",
    "staff",
    "session_type",
    "status",
    "has_note",
    "subjective",
    "objective",
    "assessment",
    "plan",
  ]

  const rows = items.map((item) => {
    const { date, time } = sessionStamp(item.sessionAt)
    const hasNote = item.note ? "yes" : "no"
    return csvRow([
      clientCode,
      clientName,
      startDate,
      endDate,
      date,
      time,
      item.staffName,
      item.sessionType,
      item.status,
      hasNote,
      item.note?.subjective ?? "",
      item.note?.objective ?? "",
      item.note?.assessment ?? "",
      item.note?.plan ?? "",
    ])
  })

  return [csvRow(headers), ...rows].join("\n")
}

export function downloadTextFile(
  filename: string,
  content: string,
  mime = "text/plain;charset=utf-8",
): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.style.display = "none"
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
