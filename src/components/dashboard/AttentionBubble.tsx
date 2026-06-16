import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

export type AttentionBubbleTone = "healthy" | "monitor" | "urgent"

const DOT: Record<AttentionBubbleTone, string> = {
  healthy: "bg-[#4F6B59]",
  monitor: "bg-[#C99A3B]",
  urgent: "bg-[#B0492F]",
}

const VALUE: Record<AttentionBubbleTone, string> = {
  healthy: "text-[#4F6B59]",
  monitor: "text-[#C99A3B]",
  urgent: "text-[#B0492F]",
}

export function AttentionBubble({
  name,
  value,
  tone = "monitor",
  href,
  onClick,
  popping,
}: {
  name: string
  value: string
  tone?: AttentionBubbleTone
  href?: string
  onClick?: () => void
  popping?: boolean
}) {
  const className = cn(
    "inline-flex max-w-full items-center gap-1.5 rounded-[18px_18px_18px_6px] border border-line bg-surface px-3 py-2 text-[15px] shadow-card transition-[transform,box-shadow,opacity] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
    popping && "animate-bubble-pop pointer-events-none",
    (href || onClick) && "cursor-pointer",
  )

  const inner = (
    <>
      <span className={cn("size-2 shrink-0 rounded-full", DOT[tone])} aria-hidden />
      <span className="font-medium text-ink">{name}</span>
      <span className={cn("font-semibold tabular-nums", VALUE[tone])}>{value}</span>
    </>
  )

  if (href) {
    return (
      <Link to={href} className={className} onClick={onClick}>
        {inner}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {inner}
      </button>
    )
  }

  return <span className={className}>{inner}</span>
}
