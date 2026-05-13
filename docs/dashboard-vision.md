# Dashboard Vision

> Living doc. The Figma is reference, not spec. This file is the source of truth for *intent*.

> **Updated May 12, 2026:** Shifted from "glance + drill" to "glance + sort in place" product model after the polish pass on May 12 — better fit for the owner-operator daily-triage use case. See "What changed" note below.

## North star

When a user logs in, **everything they need to start their day is on one operational screen**. Five tiles, each a 30-second answer to a question that matters today. All data lives inline — no separate detail pages, no `View all →` drill-throughs. The user scans, **sorts in place** to reorder by what they care about right now, and acts. Vertical scroll is acceptable on dense data days; horizontal scroll is not.

The dashboard is the operator's working surface, not an executive summary.

This was validated with the target user; the five tile choices below are not up for debate. The visual treatment, layout, and colors are.

## What changed (May 12 polish pass)

The original Figma described a **"glance + drill"** model — each tile shows ~3 preview rows with a `View all →` link to a separate detail page. Good for executive summaries, wrong for an owner-operator who's working the dashboard every morning.

After building it that way and trying it, we shifted to **"glance + sort in place"**:
- Each tile shows **all** rows of its data (12 sessions, 13 staff, 7-10 RBTs/clients per tile)
- Each list tile has a **sort dropdown** in the top-right where `View all →` used to be
- No detail pages exist or are planned for the near term — everything is here
- The dashboard scrolls vertically on a typical desktop; that's the right tradeoff for "show me everything actionable today"

Why this fits Jenny better than the original:
- She's an owner-operator running daily ops, not an exec reviewing summary metrics
- Her data volumes are small enough to fit inline (12 sessions, 13 staff, 8-10 clients/RBTs per tile — not 100+)
- "View all" detail pages would mean clicking through to see one more row, which is friction she doesn't want
- Sort-in-place lets her re-anchor the dashboard around whichever question is hot ("show me worst supervision %" → "show me alphabetical for the team meeting")

## The 5 tiles

| # | Tile | Question it answers | Pattern | Status |
|---|---|---|---|---|
| 1 | Today's Sessions | "What's on the schedule and who's covering it?" | Time-sorted table, 4 sort options | Built |
| 2 | Hours by Staff | "Who worked how much this pay period?" | Sorted horizontal stacked bars, 4 sort options, all 13 staff visible | Built |
| 3 | Notes Overdue | "Who owes me notes?" | KPI headline + per-staff list with count pills, 2 sort options | Built |
| 4 | Supervision Compliance | "Which RBTs are below the 5% supervision threshold?" | KPI headline + per-RBT list with inline mini-bars + threshold marker, 3 sort options | Built |
| 5 | Authorization Utilization | "Which clients are about to hit their auth cap?" | KPI headline + per-client list with inline mini-bars + threshold marker, 3 sort options | Built |

## Design principles

1. **All data inline; sort to reorder.** No drill-in pages. Each list tile owns its full dataset, ranked by whatever sort the user selected. The sort dropdown sits top-right of each card.
2. **Headline color = severity.** The big number is itself the alert.
   - Black/neutral = informational count (e.g., "30" total notes when below the watch threshold)
   - Amber = warning (e.g., "10-24" total notes, "1-4" RBTs flagged)
   - Red = critical (e.g., "≥25" total notes, "≥5" RBTs flagged)
   - Emerald = "all clear" (e.g., zero clients flagged)
   - The big number itself carries the alert — no separate badge needed.
3. **Sub-line gives operating context, not flavor text.** Below the headline: a short, factual sentence that frames the number ("of 8 RBTs below threshold", "across 7 staff"). Editorial sub-lines like "5 notes are 7+ days old" are nice-to-have polish; the operating sub-line is the must-have.
4. **Affordance bar top-right of card.** Sort dropdown for list tiles. No "View all" / "Export" decorative links — every visible affordance must do something real. Dead links train users to ignore the UI.
5. **Asymmetric grid.** Top row = 2 wide tiles (the data-rich Today's Sessions table + Hours by Staff chart). Bottom row = 3 KPI tiles. Equal-size tiles feel monotonous and waste hierarchy.
6. **App chrome.** Real header bar with page title ("ABA Dashboard") + period indicator ("Last 7 days"). Eventually: workspace name + user avatar. Footer signature is fine but not load-bearing.

## What's flexible vs what's not

**Not flexible (these are the product):**
- 5 tiles, those 5
- All data inline; sort in place; no drill-in detail pages
- Vertical scroll is acceptable for an operational dashboard
- Each tile gives a 30-second scan + lets the user sort to re-anchor on what matters now

**Flexible (these are taste):**
- Exact colors, fonts, spacing
- Whether bars are stacked or single-color
- Sort options per tile (we picked sensible defaults; user can suggest more)
- Hover tooltips, click-through interactions, filter chips, "Last updated" timestamps — all valid future polish

## Where current implementation matches vs diverges from the vision

**Matches the new model (post May 12 polish):**
- 5 tiles built, all inline, all sortable
- Severity coloring on KPI headlines (red/amber/green)
- Sort dropdowns in top-right of every list tile
- 2+3 asymmetric grid
- Page header bar with title + period indicator
- Cross-tile data narrative (David Kim, Olivia Park, Tyler Brooks all flagged across multiple tiles)

**Still diverges (intentional or pending):**
- Sub-lines are operational ("across 7 staff") not editorial ("5 notes are 7+ days old") — pending if/when we want more flavor
- Header is title + date only; no workspace name, no user avatar — pending until auth/multi-tenancy
- HoursByStaffTile retains stacked-series + flag icons + sort dropdown — this is intentional richness, not over-engineering, given the no-drill-in model

## Anchor image

A reference Figma export lives at `docs/figma-original-dashboard.png`. The Figma describes the *original* "glance + drill" model — keep it for historical context but **the doc above is the source of truth, not the Figma**.

---

*Last updated: May 12, 2026. Update this doc whenever a tile choice, principle, or product model changes.*
