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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function buildSessionHtmlBlock(item: AuditNoteBundleItem): string {
  const { date, time } = sessionStamp(item.sessionAt)
  const when = time ? `${escapeHtml(date)} at ${escapeHtml(time)}` : escapeHtml(date)

  const soapRows = item.note
    ? (["Subjective", "Objective", "Assessment", "Plan"] as const).map((label, index) => {
        const key = ["subjective", "objective", "assessment", "plan"][index] as keyof NonNullable<
          typeof item.note
        >
        const value = item.note?.[key]?.trim() || "Not on file"
        return `<tr><th>${label}</th><td>${escapeHtml(value).replace(/\n/g, "<br>")}</td></tr>`
      }).join("")
    : `<tr><td colspan="2"><em>No session note on file for this session.</em></td></tr>`

  return `
    <section class="session">
      <h3>${when} · ${escapeHtml(item.staffName)} · ${escapeHtml(item.sessionType)}</h3>
      <p class="meta">Status: ${escapeHtml(item.status)}</p>
      <table>${soapRows}</table>
    </section>
  `
}

export function buildAuditPdfHtml(
  clientCode: string,
  clientName: string,
  startDate: string,
  endDate: string,
  items: AuditNoteBundleItem[],
): string {
  const clientLabel = clientCode ? `${clientCode} — ${clientName}` : clientName
  const sessionBlocks =
    items.length === 0
      ? "<p>No sessions in this date range.</p>"
      : items.map((item) => buildSessionHtmlBlock(item)).join("")

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Audit packet — ${escapeHtml(clientLabel)}</title>
  <style>
    @page { margin: 0.75in; }
    body {
      font-family: "Hanken Grotesk", "Inter", sans-serif;
      color: #2C2924;
      font-size: 11pt;
      line-height: 1.45;
    }
    h1 { font-size: 18pt; margin: 0 0 4px; }
    .subtitle { color: #6B6459; margin: 0 0 20px; }
    .session { page-break-inside: avoid; margin: 0 0 24px; padding-top: 12px; border-top: 1px solid #E2DACB; }
    .session h3 { font-size: 12pt; margin: 0 0 6px; }
    .meta { color: #6B6459; margin: 0 0 10px; font-size: 10pt; }
    table { width: 100%; border-collapse: collapse; }
    th, td { vertical-align: top; text-align: left; padding: 6px 8px 6px 0; }
    th { width: 88px; color: #97907F; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.06em; }
  </style>
</head>
<body>
  <h1>Insurance audit packet</h1>
  <p class="subtitle">Session notes bundle · Generated ${escapeHtml(formatGeneratedTimestamp())}</p>
  <p><strong>Client:</strong> ${escapeHtml(clientLabel)}</p>
  <p><strong>Date range:</strong> ${escapeHtml(startDate)} to ${escapeHtml(endDate)}</p>
  <p><strong>Sessions:</strong> ${items.length}</p>
  ${sessionBlocks}
</body>
</html>`
}

export function downloadAuditPdfPacket(
  clientCode: string,
  clientName: string,
  startDate: string,
  endDate: string,
  items: AuditNoteBundleItem[],
): void {
  const html = buildAuditPdfHtml(clientCode, clientName, startDate, endDate, items)
  const printWindow = window.open("", "_blank", "noopener,noreferrer")
  if (!printWindow) return

  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  printWindow.onload = () => {
    printWindow.print()
  }
}

export function auditFilename(
  clientCode: string,
  startDate: string,
  endDate: string,
  ext: "txt" | "csv",
): string {
  const safeCode = clientCode.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "client"
  return `audit-${safeCode}-${startDate}-to-${endDate}.${ext}`
}
