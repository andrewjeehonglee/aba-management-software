import { isCompleteSessionNote } from "@/lib/notesStatus"
import type { SessionNoteRecord, SessionRecord } from "@/lib/supabase"
import { formatTime } from "@/lib/sessions"
import { P } from "@/pages/ClientOverviewPage/profileTokens"

export type CalendarColorMode = "status" | "type"

export type SessionChipStatus = "complete" | "note-overdue" | "cancelled" | "scheduled"

export type SessionChipType = "direct" | "indirect" | "supervision"

export const STATUS_CHIP: Record<
  SessionChipStatus,
  { bg: string; ink: string; border: string; label: string }
> = {
  complete: { bg: "#E4F0E7", ink: P.sageInk, border: P.calComplete, label: "Completed" },
  "note-overdue": { bg: P.amberBg, ink: P.amberInk, border: P.calNoteDue, label: "Note overdue" },
  cancelled: { bg: "#F5D5CE", ink: P.cancel, border: P.calCancelled, label: "Cancelled" },
  scheduled: { bg: P.calScheduledTint, ink: P.calScheduled, border: P.calScheduled, label: "Scheduled" },
}

const TYPE_CHIP: Record<
  SessionChipType,
  { bg: string; ink: string; border: string; label: string }
> = {
  direct: { bg: "#E4F0E7", ink: P.sageInk, border: P.calComplete, label: "Direct" },
  indirect: { bg: P.amberBg, ink: P.amberInk, border: P.calNoteDue, label: "Indirect" },
  supervision: { bg: P.calScheduledTint, ink: P.calScheduled, border: P.calScheduled, label: "Supervision" },
}

export function normalizeSessionType(raw: string): SessionChipType {
  const t = raw.toLowerCase().trim()
  if (t === "direct" || t.includes("direct therapy")) return "direct"
  if (t === "indirect" || t.includes("indirect")) return "indirect"
  if (t === "supervision" || t.includes("supervision")) return "supervision"
  return "direct"
}

export function sessionChipStatus(
  session: SessionRecord,
  todayISO: string,
  notesBySessionId: Map<string, SessionNoteRecord>,
): SessionChipStatus {
  if (session.status === "cancelled" || session.status === "no-show") return "cancelled"
  if (session.status === "completed") {
    return isCompleteSessionNote(notesBySessionId.get(session.id))
      ? "complete"
      : "note-overdue"
  }
  const day = session.time.slice(0, 10)
  if ((session.status === "scheduled" || session.status === "in-progress") && day >= todayISO) {
    return "scheduled"
  }
  if (session.status === "in-progress") return "scheduled"
  return "note-overdue"
}

export function chipColors(
  session: SessionRecord,
  colorMode: CalendarColorMode,
  todayISO: string,
  notesBySessionId: Map<string, SessionNoteRecord>,
) {
  if (colorMode === "type") {
    return TYPE_CHIP[normalizeSessionType(session.sessionType)]
  }
  return STATUS_CHIP[sessionChipStatus(session, todayISO, notesBySessionId)]
}

export function counterpartLabel(session: SessionRecord, viewKind: "client" | "staff"): string {
  if (viewKind === "client") {
    const first = session.staffName.split(/\s+/)[0] ?? session.staffName
    return first
  }
  return session.clientCode ?? session.clientName.split(/\s+/)[0] ?? session.clientName
}

export function chipTimeLabel(session: SessionRecord): string {
  return formatTime(session.time)
}

const CHIP_TYPE_LABEL: Record<SessionChipType, string> = {
  direct: "Direct",
  indirect: "Indirect",
  supervision: "Supervision",
}

export function chipClientShortLabel(session: SessionRecord): string {
  const code = session.clientCode?.trim()
  if (code) return code
  const name = session.clientName?.trim()
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return parts.map((p) => p[0] ?? "").join("").slice(0, 4)
    }
    return name.length <= 5 ? name : name.slice(0, 4)
  }
  return "?"
}

export function chipTypeShortLabel(session: SessionRecord): string {
  return CHIP_TYPE_LABEL[normalizeSessionType(session.sessionType)]
}

export function defaultColorMode(viewKind: "client" | "staff"): CalendarColorMode {
  return viewKind === "client" ? "status" : "type"
}

export function legendEntries(colorMode: CalendarColorMode) {
  if (colorMode === "type") {
    return (["direct", "indirect", "supervision"] as const).map((key) => ({
      color: TYPE_CHIP[key].border,
      label: TYPE_CHIP[key].label,
    }))
  }
  return (["complete", "note-overdue", "cancelled", "scheduled"] as const).map((key) => ({
    color: STATUS_CHIP[key].border,
    label: STATUS_CHIP[key].label,
  }))
}

export function localISO(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-")
}

export function monthGrid(anchorDate: Date): (Date | null)[][] {
  const year = anchorDate.getFullYear()
  const month = anchorDate.getMonth()
  const first = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0).getDate()
  const startOffset = first.getDay() === 0 ? 6 : first.getDay() - 1
  const cells: (Date | null)[] = Array<null>(startOffset).fill(null)
  for (let d = 1; d <= lastDay; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (Date | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export function formatMonthYear(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

export const DOW_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
