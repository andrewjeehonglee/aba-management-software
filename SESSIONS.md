# Session Log — ABA Management Software

A running log of what's been built, in chronological order, so future-me can pick up exactly where I left off.

- **Live app:** https://aba-management-software.vercel.app
- **Repo:** https://github.com/andrewjeehonglee/aba-management-software
- **Auto-deploy:** Every `git push` to `main` triggers a fresh Vercel build (~30 seconds to live).

---

## Stack at a glance

| Layer | Choice | Why |
|---|---|---|
| Build tool | **Vite 8** | Fast dev server, instant HMR |
| Framework | **React 19** | Industry standard |
| Language | **TypeScript 6** | Catches typos and refactor bugs before they ship |
| Styling | **Tailwind CSS v4** | Utility-first, no PostCSS config |
| Components | **shadcn/ui** (New York preset, Neutral base) | Components live in your repo, fully editable |
| Charts | **Recharts 3** | React-native charting, SVG-based |
| Icons | **lucide-react** | Tree-shakable, ships with shadcn |
| Hosting | **Vercel** (Hobby plan, free) | Auto-deploys from GitHub |

---

## Session 1 — Stack scaffold + first deploy

**What landed:** Empty folder → deployed React app on a public URL.

- Scaffolded Vite + React + TypeScript starter
- Installed Tailwind CSS v4 (just `@tailwindcss/vite` plugin + one CSS import line — v4 has no PostCSS config)
- Initialized shadcn/ui (`npx shadcn@latest init -d`) — gave us `Button`, `Card`, design tokens, `cn()` helper
- Set up TypeScript path aliases (`@/*` → `src/*`) so imports stay clean as the project grows
- Built a small "Hello, Andrew!" Card with counter buttons to prove React state works
- Initialized git, configured global identity, made the first commit
- Created GitHub repo via `gh repo create` (one command does create + push)
- Connected to Vercel via website (recovered an existing account by linking GitHub to it)
- Hit a real production build error (`baseUrl` deprecated in TS 6); diagnosed locally with `npm run build`, fixed, pushed — Vercel auto-redeployed
- Personalized the landing page (title, button colors, footer line)

**Commits:** `74ff096` → `9342718` → `bdc377d` → `51c96ed`

**New skills:** Git basics (init, add, commit, push), GitHub CLI, the magic auto-deploy loop, "works locally fails in prod" debugging pattern.

---

## Session 2 — Hours by Staff tile shell + mock data

**What landed:** First real product feature — a tile that displays staff and their total hours.

- Created `src/types/staff.ts` — TypeScript interface for a Staff record (name + 4 hour fields)
- Created `src/data/mockStaff.ts` — 13 hand-tuned mock staff with realistic ABA hour breakdowns (3 deliberately set below 50% direct for testing flag logic, 2 borderline at 51%)
- Created `src/components/HoursByStaffTile.tsx` — shadcn Card with title and a plain `<ul>` listing each staff name + total hours
- Replaced the counter Card in `App.tsx` with the new tile

**Commit:** `f4bf4e0`

**New skills:** TypeScript interfaces, file organization (`types/`, `data/`, `components/`), `.map()` for rendering lists, `key` prop convention, `tabular-nums` Tailwind utility.

---

## Session 3 — Flag logic + visual indicator

**What landed:** Staff below 50% direct hours get a clear visual warning.

- Created `src/lib/staff.ts` with:
  - `DIRECT_HOURS_THRESHOLD = 0.5` (named constant — no magic numbers)
  - `isStaffFlagged(staff): boolean` (pure helper, with divide-by-zero guard for safety)
- Updated `HoursByStaffTile.tsx` to show a `TriangleAlert` (lucide-react) icon in amber to the left of any flagged staff name
- Added `aria-label` for screen-reader accessibility
- Picked **amber** intentionally over red — amber = "needs attention" not "critical error"

**Commit:** `e205ff8`

**Verified at this stage:** David Kim (44%), Tyler Brooks (42%), Olivia Park (43%) flagged. Emma Williams and Sofia Martinez at exactly 51% correctly NOT flagged (proves we used `<` not `<=`).

**New skills:** Pure helper functions, named constants over magic numbers, defensive coding (divide-by-zero guard), conditional rendering with `{condition && <JSX/>}`, React Fragments `<>...</>`, accessibility with `sr-only` + `aria-hidden`.

---

## Session 4 — Recharts: stacked horizontal bar chart

**What landed:** Replaced the text list with an actual stacked-horizontal-bar visualization.

- Installed `recharts`
- Replaced `<ul>` text list with a `<BarChart>` (with `layout="vertical"` for horizontal bars, `stackId="hours"` to stack the three series)
- Three bars per row: **Direct (emerald), Indirect (slate), Cancellation (red)** — semantic colors that imply meaning before any legend exists
- Built a custom `<YAxisTick />` component using SVG `<foreignObject>` to render flagged staff names in amber + `TriangleAlert` icon (preserved the flag indicator from Session 3 in chart context)
- Added a manual color key above the chart (4 entries: 3 colors + 1 flag explanation)
- Hit a real bug — Recharts auto-skipped some YAxis ticks (Marcus Johnson, David Kim, Tyler Brooks went missing) — fixed with `interval={0}`
- Modernized the chart aesthetic — hid axis lines, hid tick marks, lightened grid, softer X-axis numbers (changed it from "Excel-y" to clean SaaS look)

**Commit:** `3e3e4f9`

**New skills:** Recharts mental model, custom tick components, `<foreignObject>` SVG escape hatch, mini-component extraction (`KeyItem`), Tailwind arbitrary values like `h-[460px]`, debugging chart libraries.

---

## Session 5 — Polish: shadcn Chart wrapper, tooltip, sort, real legend

**What landed:** Made the chart fully interactive and theme-aware.

- Installed shadcn's `Chart` wrapper (`npx shadcn add chart`) and migrated from raw Recharts to `ChartContainer` + `chartConfig`
- Defined `chartConfig` as the single source of truth for series labels and colors — bars, tooltip, and legend all read from it via CSS variables (`var(--color-directHours)`)
- Added `<ChartTooltip>` on hover — shows staff name + all 3 series for that row
- Installed shadcn's `Select` component
- Added a sort dropdown in the Card header (`<CardAction>` slot — auto-positions to the right of the title) with 4 options:
  - Name (A–Z)
  - Total hours (high → low)
  - Direct % (low → high) — flagged staff bubble to top, useful for triage
  - Cancellation hours (high → low)
- Wired the dropdown to `useState<SortKey>` and computed `sortedStaff = [...mockStaff].sort(...)` (clone-then-sort to avoid mutation)
- Hit two Recharts v3 / Radix v3 quirks:
  - `SelectValue` no longer auto-resolves the SelectItem text → fixed by passing `SORT_OPTIONS[sortKey].label` as children
  - `ChartLegend` (Recharts Legend) ignored our explicit `payload` order → punted to a manual legend rendered from `chartConfig` directly (more reliable, full style control)

**Commit:** `3931c9c`

**New skills:** `useState` + the controlled-component pattern, shadcn slot pattern (`CardAction`), sort options as data, `Object.entries().map()`, `as const` for narrowing, real-world judgment call: "render it yourself when fighting a library costs more than replacing it."

---

## Session 6 — Tile #2 "Today's Sessions" + 2-column dashboard layout

**What landed:** Second product tile, plus the dashboard goes from 1 tile to 2 in a responsive grid.

- Created `src/types/session.ts` — `SessionStatus` union (`scheduled | in-progress | completed | cancelled | no-show`) + `Session` interface (id, time, clientName, staffName, sessionType, status)
- Created `src/data/mockSessions.ts` — 12 sessions across the day (5 completed, 2 in-progress, 3 scheduled, 1 cancelled, 1 no-show), staff names overlap with `mockStaff.ts` for cross-tile narrative
- Created `src/components/TodaySessionsTile.tsx` — Card with title, list sorted by time, color-coded status badges driven by a `STATUS_CONFIG` lookup (one place to change a label or color)
- Wrapped `App.tsx` in `lg:grid-cols-2` so the two tiles sit side-by-side on desktop, stack on mobile
- Swapped tile order on user request (Today's Sessions left, Hours by Staff right) — flipping JSX children flips the visual order, no CSS dance needed
- Top-aligned the dashboard (dropped `justify-center` from the outer flex) so it sits at the top of the viewport instead of floating in the middle

**Commits:** `be9b9e8` → `b8d8061`

**New skills:** Multi-tile dashboard layout, responsive grids (`lg:` breakpoint), the `Record<EnumKey, ConfigShape>` single-source-of-truth pattern, deliberate cross-tile data continuity (same names appear across multiple tiles for storytelling), JSX child-order = visual order.

---

## Session 7 — Tile #3 "Notes Overdue" — KPI + drill list pattern

**What landed:** Third tile introduces a brand-new visualization shape: a big stat headline plus a per-staff drill list.

- Created `src/types/overdueNotes.ts` — `OverdueNotesByStaff` interface (staffName, overdueCount)
- Created `src/data/mockOverdueNotes.ts` — 7 staff with overdue notes summing to 30. Same names as `mockStaff` (David Kim, Tyler Brooks, Olivia Park appear here too) — the staff already flagged for low direct % are also the worst offenders. Cross-tile narrative now spans 3 tiles.
- Created `src/components/NotesOverdueTile.tsx` — headline (big number + "across N staff" sub-line) + per-staff list with color-coded count pills (red >10, amber >5, gray ≤5) via a `countPillClass(count)` helper
- Extracted a small `CountPill` mini-component — at 7+ rows it earns its own block (rule of three)
- Added as 3rd child in `App.tsx` (lands in row 2 left half on desktop)

**Commit:** `4f4de1f`

**New skills:** KPI headline pattern (big number + sub-line in a flex baseline row), threshold-driven class helper as a function not a ternary chain, `Array.reduce` for derived totals (don't store what you can compute), the rule of three for extracting reusable mini-components.

---

## Session 8 — Vision doc + Tiles #4 & #5 — dashboard becomes feature-complete

**What landed:** Captured the Figma + product intent into version-controlled docs, then built the final two tiles to complete the v1 vision.

**Vision capture:**
- Created `docs/dashboard-vision.md` — north star, the 5-tile spec, 6 design principles distilled from the Figma, "what's flexible vs not" framing, and a gap list comparing current build vs target
- Saved the Figma export to `docs/figma-original-dashboard.png` so the visual reference lives in source control next to the doc that interprets it

**Tile #4 — Supervision Compliance:**
- Created `src/types/supervision.ts`, `src/data/mockSupervision.ts` (8 RBTs spanning red/amber/green), `src/components/SupervisionComplianceTile.tsx`
- New visualization pattern: inline mini-progress-bar per RBT + a faint vertical "threshold marker" at the 5% line so the eye instantly sees "above this is compliant, below it is flagged"
- Threshold sourced from a real ABA Tier 1 must-have: 5% supervision per Jenny's May 5 working doc (referenced in code comments so the magic number has a paper trail)

**Tile #5 — Authorization Utilization:**
- Created `src/types/authorization.ts`, `src/data/mockAuthorizations.ts` (8 clients pulled from `mockSessions` for cross-tile name continuity), `src/components/AuthorizationUtilizationTile.tsx`
- Same MiniBar pattern as Supervision but with **inverted threshold semantics**: high % = bad (clients about to hit their auth cap)
- Made the deliberate call NOT to extract a shared `MiniBar` component yet — only 2 instances, and the threshold semantics differ enough that DRY would obscure the inversion. Rule of three says: wait for the third caller.
- Per-tile width override added: `className?: string` prop merged via `cn()` so `App.tsx` can pass `"lg:col-span-2 lg:max-w-none"` to make Tile #5 span both columns of the grid

**Commits:** `0c025c8` → `06ac6ff` → `35422a9` → `f692a14` → `75bd741`

**New skills:** Markdown product docs as code-adjacent artifacts (versioned alongside the code they describe), inverted threshold semantics in the same code shape, the `lg:col-span-N + lg:max-w-none` combo for per-tile grid overrides, `cn()` from shadcn for safe Tailwind class merging (resolves conflicts via `tailwind-merge`), pattern reuse vs duplication judgment ("wait for the third").

---

## Session 9 — The polish day (layout, header, severity colors, sort everywhere, filter chips, vision realignment)

**What landed:** Six rounds of polish, each driven by tight feedback, that took the dashboard from "5 tiles in a 2-col stack" to production-grade — and shifted the underlying product model along the way.

**1. Restructure to 3+2 then 2+3 grid (`284f2c4`, `ecec302`):**
- First pass: switched `lg:grid-cols-2` → `lg:grid-cols-6` with col-spans (3 KPI tiles on top, narrow KPI + wide chart on bottom) to fit on one screen with no scroll
- Each tile got an optional `className` prop merged via `cn()`, plus `Card size="sm"` for tighter padding
- Second pass: re-restructured to **2+3** (Today's Sessions + Hours by Staff on top; 3 KPI tiles on bottom) using two separate grid containers — better hierarchy, the data-rich tiles read first
- Hours by Staff: chart height 460px → 380px, all 13 staff visible (via `interval={0}` on YAxis) so the cross-tile narrative arc holds (David Kim, Olivia Park, Tyler Brooks must all be on screen here too — they're the through-line of the demo)

**2. Page header (`71a9268`):**
- New `<header>` above the grid: `<h1>ABA Dashboard</h1>` + right-aligned "Last 7 days" subtitle, separated by a `border-b`
- Used `items-baseline` flex alignment — aligns letter baselines instead of bounding boxes, which is the small detail that makes a header look "designed"

**3. Color-coded KPI severity (`f2d197a`):**
- Added per-tile `headlineClass(count)` helpers — same threshold pattern, different bands
  - Notes Overdue: ≥25 red, 10-24 amber, <10 neutral
  - Supervision + Auth: ≥5 red, 1-4 amber, 0 emerald ("all clear")
- The big number IS the alert — no separate badge needed. Subtitle stays muted so the eye lands on the count first.

**4. Show all data + sort dropdowns on every list tile (`ecec302`):**
- Removed all `.slice()` truncation — every tile now renders its full dataset. Vertical scroll is acceptable for an operational dashboard.
- Removed `View all →` and `Export ↓` decorative links (they didn't go anywhere — dead links train users to ignore the UI)
- Added a shadcn Select dropdown to each of the 4 list tiles, mirroring the Hours by Staff sort pattern. Sort options:
  - Today's Sessions: time / status (custom weight: in-progress > no-show > cancelled > scheduled > completed) / staff / client
  - Notes Overdue: count / name
  - Supervision: % asc (worst first, default) / name / % desc
  - Auth: % desc (worst first, default) / name / % asc
- Each tile owns its own `SORT_OPTIONS` config — semantics differ enough that sharing would force false generality

**5. Vision doc realignment (`c5568a7`):**
- Rewrote `docs/dashboard-vision.md` to reflect the **product model shift** that emerged during the polish pass: from "glance + drill" (preview rows + drill-in pages) to **"glance + sort in place"** (all data inline, sort dropdowns reorder, no separate detail pages)
- Added a dated "What changed" section explaining the *why*: Jenny is an owner-operator running daily ops, not an exec reviewing summaries; small data volumes fit inline; no detail pages on the roadmap
- Hardened a new design principle worth pocketing: **"No 'View all' / 'Export' decorative links — every visible affordance must do something real. Dead links train users to ignore the UI."**
- Same commit fixed Today's Sessions table column alignment with explicit grid tracks (`grid-cols-[3.5rem_minmax(0,1fr)_minmax(0,1fr)_8rem_6rem]`) so all rows align under their headers, and killed the dead `Export ↓` link in Hours by Staff

**6. Filter chips on Today's Sessions (`01a605c`):**
- Installed shadcn `toggle-group` (`npx shadcn add toggle-group`) — pulled in `toggle.tsx` + `toggle-group.tsx`. Note: this version of shadcn wraps **base-ui**, not Radix.
- Added a 6-chip filter row: All / Completed / In progress / Scheduled / Cancelled / No-show
- Filter applied **before** sort (filter narrows the dataset, sort orders what remains — matches how users think about it)
- Empty state ("No sessions match this filter.") wired in for resilience
- Hit a base-ui API gotcha: ToggleGroup expects `value: Value[]` even for single-select (`multiple={false}` default), so we wrap/unwrap with `[statusFilter]` and `values[0]`. Added a defensive `if (values.length > 0)` guard so clicking the active chip doesn't empty the array and break the "All" return path.

**Commits:** `284f2c4` → `71a9268` → `f2d197a` → `ecec302` → `c5568a7` → `01a605c`

**New skills:**
- Asymmetric grid layouts via two `<div className="grid">` containers (cleaner than one big grid with col-spans when rows have different column counts)
- `items-baseline` for typography-aware flex alignment
- Naming a product-model shift mid-build and updating the vision doc to reflect it (instead of letting the doc go stale and become a lie)
- "Filter THEN sort" composition with two independent `useState`s — order matters both semantically and for performance
- Adapter shim pattern when a 3rd-party API doesn't fit your mental model (base-ui's array-shaped value for single-select)
- Diagnosing transient Vite "dependency optimization reload" errors that look scary in the dev console but resolve on browser refresh
- A new design principle as a hard rule: **every visible affordance must do something real**

---

## Project anatomy

```
src/
├── App.tsx                                ← Page shell — header + 2 grids (top: 2-col, bottom: 3-col) + footer
├── main.tsx                               ← React boot (don't touch)
├── index.css                              ← Tailwind import + shadcn design tokens
│
├── components/
│   ├── HoursByStaffTile.tsx               ← Stacked Recharts bar (all 13 staff, sortable, flag indicators)
│   ├── TodaySessionsTile.tsx              ← Today's session table + status filter chips + sort dropdown
│   ├── NotesOverdueTile.tsx               ← KPI headline + per-staff overdue count list (sortable)
│   ├── SupervisionComplianceTile.tsx      ← KPI + per-RBT mini-bars (low % = bad, 5% threshold marker)
│   ├── AuthorizationUtilizationTile.tsx   ← KPI + per-client mini-bars (high % = bad, inverted semantics)
│   └── ui/                                ← shadcn-generated primitives — DO NOT EDIT
│       ├── button.tsx
│       ├── card.tsx
│       ├── chart.tsx
│       ├── select.tsx
│       ├── toggle.tsx
│       └── toggle-group.tsx
│
├── data/                                  ← Mock data, one file per domain
│   ├── mockStaff.ts                       ← 13 staff records (3 below 50% direct)
│   ├── mockSessions.ts                    ← 12 sessions across the day, mixed statuses
│   ├── mockOverdueNotes.ts                ← 7 staff with overdue notes (totals to 30)
│   ├── mockSupervision.ts                 ← 8 RBTs spanning red/amber/green compliance
│   └── mockAuthorizations.ts              ← 8 clients with utilization %, names match mockSessions
│
├── lib/
│   ├── staff.ts                           ← isStaffFlagged() + DIRECT_HOURS_THRESHOLD
│   └── utils.ts                           ← shadcn's cn() helper
│
└── types/                                 ← TypeScript interfaces, one file per domain
    ├── staff.ts
    ├── session.ts
    ├── overdueNotes.ts
    ├── supervision.ts
    └── authorization.ts

docs/
├── dashboard-vision.md                    ← Source of truth for product intent (supersedes Figma)
└── figma-original-dashboard.png           ← Original Figma export, kept for historical context
```

---

## Running locally

```bash
# Install dependencies (only needed first time after cloning)
npm install

# Start dev server (Vite, hot reload, ~http://localhost:5173)
npm run dev

# Production build (used by Vercel; run locally to catch build errors before push)
npm run build
```

---

## Daily workflow loop

```bash
# Make changes in src/...
# Auto-save handles saving (Cursor: files.autoSave = afterDelay)

git status                                    # See what changed
git add .                                     # Stage everything
git commit -m "what I did in plain English"   # Snapshot
git push                                      # → GitHub → Vercel auto-deploys
```

---

## What's NOT done yet (next sessions, suggested order)

**Tier 1 — real product work:**
1. **Wire to a real backend** — replace each `mockX` import with API data. Introduces `useEffect`, `fetch`, loading + error + empty states. The shape of every tile already matches a future API response, so this is mostly plumbing.
2. **Add authentication** — log in / log out, session persistence, route guards. Will also unlock workspace name + user avatar in the page header.
3. **Add routing** — React Router for multiple pages (Dashboard / Staff / Clients / Settings). Currently all one page.

**Tier 2 — Jenny-feedback polish (waiting for next user-feedback round):**
4. **Sort dropdown labels are wider than they need to be** — trim padding or use a more compact Select variant; the truncation is small but visible at desktop width.
5. **Status badges in Today's Sessions aren't uniform width** — should pad to the widest label so the right edge of the column is a clean line.
6. **Editorial sub-lines** — replace structural sub-lines like "across 7 staff" with editorial ones like "5 notes are 7+ days old" once we have the underlying timestamp data.
7. **Hover tooltips on mini-bars** in Supervision + Auth — show the exact % on hover instead of relying on the right-aligned number.

**Tier 3 — nice-to-have:**
8. **Dark mode toggle** — small win, surfaces all the design-token work shadcn did silently.
9. **Click-to-toggle series visibility on the Hours by Staff legend** — ~15 lines of useState.
10. **"Last updated 2 minutes ago" timestamp** in the header — useful once data is live.

---

*Last updated: May 12, 2026 (end of Session 9).*
