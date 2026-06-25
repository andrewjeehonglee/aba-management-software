/** Locked Pulse client-profile tokens — aligned with global --surface tokens. */
export const P = {
  bg: "#EAE4D8",
  card: "#FAF8F3",
  inset: "#F3F0E8",
  rule: "#E2DACB",
  ink: "#2C2924",
  soft: "#6B6459",
  faint: "#97907F",
  sage: "#4C6B52",
  sageBg: "#DCE7D7",
  sageInk: "#3E5A44",
  amber: "#A9762A",
  amberBg: "#F2E4C7",
  amberInk: "#845A18",
  cancel: "#B0492F",
  scheduled: "#B6AE9E",
  scheduledTint: "#EEEAE3",
  /** Calendar day-bar + legend hues (v6) */
  calComplete: "#3F8A53",
  calNoteDue: "#E08A2B",
  calCancelled: "#B5362A",
  calScheduled: "#3A6BA5",
  calScheduledTint: "#E3ECF4",
  goalInProgress: "#3E6B9C",
  goalHold: "#A9762A",
  goalMastered: "#4C6B52",
  radius: "18px",
} as const

export const SECTION_LABEL =
  "text-[12px] font-semibold uppercase tracking-[0.08em]"

/** Max list height (~3 goal/behavior rows) before internal scroll */
export const TILE_LIST_MAX_H = "max-h-[320px] overflow-y-auto profile-scroll"

/** Shared card/tile title — 18px, weight 700, sentence case */
export const TILE_TITLE = "text-[18px] font-bold leading-snug"
