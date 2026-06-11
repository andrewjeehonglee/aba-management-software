import type { AuditNoteBundleItem } from "@/lib/auditPull"
import { formatEventStamp } from "@/lib/sessions"
import { supabase, type SessionNoteRecord } from "@/lib/supabase"
import { downloadTextFile } from "@/lib/auditExport"

interface StaffExportSessionRow {
  id: string
  scheduled_at: string
  session_type: string
  status: string
  client_id: string
  clients: { first_name: string; last_name: string; external_code: string | null }
  staff: { full_name: string } | null
}

interface StaffExportNoteRow {
  session_id: string
  subjective: string | null
  objective: string | null
  assessment: string | null
  plan: string | null
}

function parseDateInput(value: string): { year: number; month: number; day: number } {
  const [year, month, day] = value.split("-").map(Number)
  return { year, month, day }
}

function localDateRangeToIso(startDate: string, endDate: string): { start: string; end: string } {
  const start = parseDateInput(startDate)
  const end = parseDateInput(endDate)
  return {
    start: new Date(start.year, start.month - 1, start.day, 0, 0, 0, 0).toISOString(),
    end: new Date(end.year, end.month - 1, end.day, 23, 59, 59, 999).toISOString(),
  }
}

function clientDisplayName(clients: StaffExportSessionRow["clients"]): string {
  const name = `${clients.first_name} ${clients.last_name}`.trim()
  return name || (clients.external_code ?? "Unknown")
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

export async function getStaffSessionExportBundle(
  staffId: string,
  startDate: string,
  endDate: string,
): Promise<AuditNoteBundleItem[]> {
  const { start, end } = localDateRangeToIso(startDate, endDate)

  const { data, error } = await supabase
    .from("sessions")
    .select(
      "id, scheduled_at, session_type, status, client_id, clients(first_name, last_name, external_code), staff(full_name)",
    )
    .eq("staff_id", staffId)
    .gte("scheduled_at", start)
    .lte("scheduled_at", end)
    .order("scheduled_at", { ascending: true })

  if (error) throw error

  const sessions = (data ?? []) as unknown as StaffExportSessionRow[]
  if (sessions.length === 0) return []

  const sessionIds = sessions.map((s) => s.id)
  const { data: notesData, error: notesError } = await supabase
    .from("session_notes")
    .select("session_id, subjective, objective, assessment, plan")
    .in("session_id", sessionIds)

  if (notesError) throw notesError

  const notesBySession = new Map(
    ((notesData ?? []) as StaffExportNoteRow[]).map((n) => [n.session_id, n]),
  )

  return sessions.map((session) => {
    const noteRow = notesBySession.get(session.id)
    const note: SessionNoteRecord | null = noteRow
      ? {
          id: session.id,
          session_id: session.id,
          staff_id: staffId,
          subjective: noteRow.subjective ?? "",
          objective: noteRow.objective ?? "",
          assessment: noteRow.assessment ?? "",
          plan: noteRow.plan ?? "",
          created_at: null,
          session_at: session.scheduled_at,
        }
      : null

    return {
      sessionId: session.id,
      sessionAt: session.scheduled_at,
      staffName: session.staff?.full_name ?? "Unknown",
      sessionType: session.session_type,
      status: session.status,
      clientCode: session.clients.external_code ?? "",
      clientName: clientDisplayName(session.clients),
      note,
    }
  })
}

export function buildStaffSessionsCsvBundle(
  staffExternalCode: string,
  staffName: string,
  startDate: string,
  endDate: string,
  items: AuditNoteBundleItem[],
): string {
  const headers = [
    "staff_code",
    "staff_name",
    "client_code",
    "client_name",
    "date_range_start",
    "date_range_end",
    "session_date",
    "session_time",
    "session_type",
    "status",
    "has_note",
    "subjective",
    "objective",
    "assessment",
    "plan",
  ]

  const rows = items.map((item) => {
    const { date, time } = formatEventStamp(undefined, item.sessionAt)
    return csvRow([
      staffExternalCode,
      staffName,
      item.clientCode,
      item.clientName,
      startDate,
      endDate,
      date,
      time,
      item.sessionType,
      item.status,
      item.note ? "yes" : "no",
      item.note?.subjective ?? "",
      item.note?.objective ?? "",
      item.note?.assessment ?? "",
      item.note?.plan ?? "",
    ])
  })

  return [csvRow(headers), ...rows].join("\n")
}

export function downloadStaffSessionsCsv(
  staffExternalCode: string,
  staffName: string,
  monthSlug: string,
  startDate: string,
  endDate: string,
  items: AuditNoteBundleItem[],
): void {
  const csv = buildStaffSessionsCsvBundle(
    staffExternalCode,
    staffName,
    startDate,
    endDate,
    items,
  )
  const safeCode = staffExternalCode.replace(/[^a-zA-Z0-9-]+/g, "-")
  downloadTextFile(`${safeCode}-sessions-${monthSlug}.csv`, csv, "text/csv;charset=utf-8")
}
