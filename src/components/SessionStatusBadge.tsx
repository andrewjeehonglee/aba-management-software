import { STATUS_CONFIG } from "@/lib/sessions"
import type { SessionStatus } from "@/types/session"

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  const { label, className } = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-medium min-w-[5.5rem] whitespace-nowrap ${className}`}
    >
      {label}
    </span>
  )
}
