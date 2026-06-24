import { useState } from "react"
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react"
import type { AuditNoteBundleItem } from "@/lib/auditPull"
import type { SessionNoteBucket } from "@/lib/auditReadiness"
import { isCompleteSessionNote } from "@/lib/notesStatus"
import { formatEventStamp } from "@/lib/sessions"
import { P, SECTION_LABEL } from "@/pages/ClientOverviewPage/profileTokens"

function notePreview(item: AuditNoteBundleItem): string {
  if (!item.note) return ""
  const text = item.note.subjective.trim() || item.note.objective.trim()
  return text.replace(/\s+/g, " ")
}

type RowBadge = {
  label: string
  bg: string
  ink: string
}

function sessionBadge(
  item: AuditNoteBundleItem,
  bucketMap: Map<string, SessionNoteBucket>,
): RowBadge {
  if (item.status === "cancelled" || item.status === "no-show") {
    return { label: "Cancelled", bg: P.inset, ink: P.faint }
  }
  if (item.status === "completed" || item.status === "shortened") {
    if (item.note && isCompleteSessionNote(item.note)) {
      return { label: "Complete", bg: P.sageBg, ink: P.sageInk }
    }
    const bucket = bucketMap.get(item.sessionId)
    if (bucket === "overdue") {
      return { label: "Overdue", bg: "#F5D5CE", ink: P.cancel }
    }
    return { label: "Missing", bg: P.amberBg, ink: P.amberInk }
  }
  return { label: "Scheduled", bg: P.calScheduledTint, ink: P.calScheduled }
}

function signatureLabel(item: AuditNoteBundleItem): { label: string; signed: boolean } {
  if (item.status === "cancelled" || item.status === "no-show") {
    return { label: "N/A", signed: true }
  }
  if (item.note && isCompleteSessionNote(item.note)) {
    return { label: "Signed", signed: true }
  }
  if (item.note) {
    return { label: "Unsigned", signed: false }
  }
  return { label: "No note", signed: false }
}

interface AuditSessionNoteRowProps {
  item: AuditNoteBundleItem
  bucketMap: Map<string, SessionNoteBucket>
  hasBehaviorIncidents?: boolean
}

export function AuditSessionNoteRow({
  item,
  bucketMap,
  hasBehaviorIncidents = false,
}: AuditSessionNoteRowProps) {
  const [open, setOpen] = useState(false)
  const { date, time } = formatEventStamp(undefined, item.sessionAt)
  const preview = notePreview(item)
  const badge = sessionBadge(item, bucketMap)
  const signature = signatureLabel(item)

  return (
    <li className="py-4 first:pt-0" style={{ borderTop: `1px solid ${P.rule}` }}>
      <button
        type="button"
        className="flex w-full items-start gap-2 text-left"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span className="mt-0.5 shrink-0" style={{ color: P.faint }}>
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[16px] font-medium" style={{ color: P.ink }}>
              {date}
            </span>
            {time && (
              <span className="text-[13px] tabular-nums" style={{ color: P.faint }}>
                {time}
              </span>
            )}
            <span
              className="inline-flex rounded-full px-2 py-0.5 text-[12px] font-medium"
              style={{ backgroundColor: badge.bg, color: badge.ink }}
            >
              {badge.label}
            </span>
            <span
              className="inline-flex items-center gap-1 text-[12px] font-medium"
              style={{ color: signature.signed ? P.sageInk : P.amberInk }}
            >
              {signature.signed ? (
                <CheckCircle2 className="size-3.5" aria-hidden />
              ) : (
                <AlertTriangle className="size-3.5" aria-hidden />
              )}
              {signature.label}
            </span>
          </div>
          <p className="mt-0.5 text-[13px]" style={{ color: P.soft }}>
            {item.staffName} · {item.sessionType}
          </p>
          {!open && preview && (
            <p className="mt-1 line-clamp-1 text-[14px]" style={{ color: P.soft }}>
              {preview}
            </p>
          )}
        </div>
      </button>

      {open && (
        <div className="ml-6 mt-3 space-y-3">
          {item.note ? (
            <dl className="grid grid-cols-[5.5rem_1fr] gap-x-4 gap-y-3 text-[14px]">
              {(
                [
                  { label: "Subjective", value: item.note.subjective },
                  { label: "Objective", value: item.note.objective },
                  { label: "Assessment", value: item.note.assessment },
                  { label: "Plan", value: item.note.plan },
                ] as const
              ).map(({ label, value }) => (
                <div key={label} className="contents">
                  <dt className={`${SECTION_LABEL} pt-0.5`} style={{ color: P.faint }}>
                    {label}
                  </dt>
                  <dd className="whitespace-pre-wrap leading-relaxed" style={{ color: P.soft }}>
                    {value?.trim() || "Not on file"}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-[14px]" style={{ color: P.soft }}>
              No session note on file for this session.
            </p>
          )}

          <p className="text-[13px]" style={{ color: P.faint }}>
            Signature: {signature.label}
            {hasBehaviorIncidents ? " · Behavior incidents logged for this session" : ""}
          </p>
        </div>
      )}
    </li>
  )
}

interface AuditSessionListProps {
  items: AuditNoteBundleItem[]
  bucketMap: Map<string, SessionNoteBucket>
  incidentSessionIds: Set<string>
}

export function AuditSessionList({
  items,
  bucketMap,
  incidentSessionIds,
}: AuditSessionListProps) {
  if (items.length === 0) {
    return (
      <p className="text-[15px]" style={{ color: P.soft }}>
        No sessions in this date range.
      </p>
    )
  }

  return (
    <ul>
      {items.map((item) => (
        <AuditSessionNoteRow
          key={item.sessionId}
          item={item}
          bucketMap={bucketMap}
          hasBehaviorIncidents={incidentSessionIds.has(item.sessionId)}
        />
      ))}
    </ul>
  )
}
