# Dashboard Vision

> Living doc. The Figma is reference, not spec. This file is the source of truth for *intent*.

## North star

When a user logs in, **everything they need to start their day is on one screen, no scroll**. Five tiles, each a 30-second answer to a question that matters today. If they want detail, they drill in (`View all →`). The dashboard is air-traffic control, not the data warehouse.

This was validated with a target user; the five tile choices below are not up for debate. The visual treatment, layout, and colors are.

## The 5 tiles

| # | Tile | Question it answers | Pattern | Status |
|---|---|---|---|---|
| 1 | Today's Sessions | "What's on the schedule and who's covering it?" | Count + summary line + 3-row preview | Built (over-detailed) |
| 2 | Notes Overdue | "Who owes me notes?" | Count + 3-row drill list | Built |
| 3 | Auth Usage | "Which clients are about to run out of authorized hours?" | Count + 3-row drill list (red zone) | Not built |
| 4 | Supervision Compliance | "Which RBTs are below the supervision % threshold?" | Count + 3-row drill list with inline progress bars | Not built |
| 5 | Hours by Staff | "Who worked how much this pay period?" | Sorted horizontal bars (no big number — chart is the value) | Built (over-engineered for glance use) |

## Design principles distilled from the Figma

1. **Preview, not dump.** Each tile shows ~3 rows max. The full list lives behind `View all →`. This implies real routes/pages later — the dashboard is the entry point, not the destination.
2. **Headline color = severity.**
   - Black = neutral count ("9 sessions today")
   - Amber/orange = warning ("12 notes overdue", "2 RBTs below threshold")
   - Red = critical ("3 clients in red zone")
   - The big number itself carries the alert — no separate badge needed.
3. **Sub-line gives the *why*.** Below the headline number: a short, editorial sentence that tells you why the number matters today. Examples from the Figma:
   - "5 notes are 7+ days old" (not just "across 7 staff")
   - "1 session needs coverage"
   - "Above 80% of authorized hours"
4. **Affordance bar top-right of card.** Either `View all →` (drill-in tiles) or `Export ↓` (data-export tiles like Hours by Staff). Same position on every card so the user's eye learns the pattern.
5. **Asymmetric grid.** Top row = 3 narrower KPI tiles. Bottom row = 2 wider tiles (one narrow KPI + one wide chart). Equal-size tiles feel boring and waste hierarchy.
6. **App chrome.** Real header bar with workspace name + user avatar (e.g. "Social Play" / "JL"). Page label or breadcrumb above ("Screen 1 - Dashboard"). Currently we have just centered cards + a footer signature.

## What's flexible vs what's not

**Not flexible (these are the product):**
- 5 tiles, those 5
- Single screen, no vertical scroll on a 1280×800 desktop
- Each tile gives a 30-second read with a clear drill-in path

**Flexible (these are taste):**
- Exact colors, fonts, spacing
- Whether bars are stacked or single-color
- Density (we can show 3, 5, or 7 list rows depending on screen real estate — but not 13)
- Sort dropdowns, hover tooltips, and other interactions on the chart tiles

## Where current implementation diverges from the vision

- All tiles equal width (symmetric `lg:grid-cols-2`) instead of the 3-on-top, 2-on-bottom asymmetric grid
- All headline numbers are black; severity colors not yet applied
- No `View all →` affordances anywhere (no routing exists yet either)
- Sub-lines are informational ("across 7 staff") rather than editorial ("5 notes are 7+ days old")
- Tile content is too dense — Today's Sessions shows 12 rows, Notes Overdue shows 7
- No app chrome (header bar, workspace name, user avatar)
- HoursByStaffTile is a "drill-in" interaction model (sort dropdown, stacked series, flag icons) trapped inside what should be a glance card

## Anchor image

A reference Figma export should live at `docs/figma-original-dashboard.png`. (Drop your own export there manually — the file isn't in source control yet.)

---

*Last updated: May 12, 2026. Update this doc whenever a tile choice or principle changes.*
