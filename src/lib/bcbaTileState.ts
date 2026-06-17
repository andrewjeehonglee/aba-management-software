/** Dashboard tile states — Healthy / Monitor / Urgent (shared sitewide). */
export type BcbaTileState = "healthy" | "monitor" | "urgent"

export const BCBA_STATE_LABEL: Record<BcbaTileState, string> = {
  healthy: "Healthy",
  monitor: "Monitor",
  urgent: "Urgent",
}

/** Metric number + state word color (sage · amber · red-orange). */
export const BCBA_STATE_METRIC_CLASS: Record<BcbaTileState, string> = {
  healthy: "text-brand",
  monitor: "text-alert",
  urgent: "text-alert-strong",
}

export const TILE_STATE_DOT_CLASS: Record<BcbaTileState, string> = {
  healthy: "bg-brand",
  monitor: "bg-alert",
  urgent: "bg-alert-strong",
}

export const TILE_STATE_VALUE_CLASS: Record<BcbaTileState, string> = {
  healthy: "text-brand",
  monitor: "text-alert",
  urgent: "text-alert-strong",
}

export const TILE_STATE_TAG_CLASS: Record<BcbaTileState, string> = {
  healthy: "bg-accent-soft text-brand",
  monitor: "bg-alert-soft text-alert",
  urgent: "bg-alert-soft text-alert-strong",
}
