/** BCBA dashboard tile states — distinct from owner pulse severity. */
export type BcbaTileState = "healthy" | "monitor" | "urgent"

export const BCBA_STATE_LABEL: Record<BcbaTileState, string> = {
  healthy: "Healthy",
  monitor: "Monitor",
  urgent: "Urgent",
}

export const BCBA_STATE_METRIC_CLASS: Record<BcbaTileState, string> = {
  healthy: "text-[#4F6B59]",
  monitor: "text-[#C99A3B]",
  urgent: "text-[#B0492F]",
}

/** Proactive auth utilization — BCBA dashboard only (owner tile stays at 80%). */
export const BCBA_AUTH_MONITOR_THRESHOLD = 90
