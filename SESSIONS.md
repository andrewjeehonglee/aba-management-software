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

## Session 10 — Routing, Client Overview, Staff Overview, Goals, Certifications tile

**What landed:** The dashboard stops being a single page. React Router lands; clicking a client name takes you to a real client page; clicking a staff name takes you to a real staff page; both pages cross-link back to each other. A 6th tile (Certifications Expiring Soon) joins the bottom row. Every tile name on the dashboard is now a working link into a real detail page — the "click anywhere" affordance is finally honest.

**1. React Router + SPA fallback (`c6e69d0`):**
- Installed `react-router-dom`, wrapped `<App />` in `<BrowserRouter>` in `main.tsx`
- `App.tsx` becomes a routing shell — `<Routes>` with `/` → `DashboardPage` and `/clients/:clientId` → `ClientOverviewPage` placeholder
- Moved all dashboard JSX out of `App.tsx` into a new `src/pages/DashboardPage.tsx` — clean separation between routing and page content
- Created `vercel.json` with `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }` — without this, hitting `/clients/sophia-bennett` directly on Vercel returns 404 because the server has no such file. The rewrite tells Vercel "always serve index.html and let React Router figure it out."

**2. Click-throughs + slug lib + Staff route (`dab42e7`, `578ef35`):**
- First pass: wrapped client names in `TodaySessionsTile` and `AuthorizationUtilizationTile` with inline `<Link to={"/clients/" + name.toLowerCase().replace(/\s+/g, "-")}>` — 2 callers, inline was fine
- Second pass: extracted `src/lib/slug.ts` with `toSlug(name)` and `unslug(slug)` once the third caller (staff links) materialized — rule of three applied
- Wired staff click-throughs in `HoursByStaffTile`, `NotesOverdueTile`, `SupervisionComplianceTile` (5 tiles total now have working click-throughs)
- The chart staff names live inside SVG, so `HoursByStaffTile`'s `<YAxisTick>` had to wrap the existing `<foreignObject>` content in a `<Link>` — same DOM-in-SVG escape hatch from Session 4 paying off again
- Added `/staff/:staffId` route → `StaffOverviewPage` placeholder, mirroring the client placeholder

**3. Client Overview build-out — 4 sections in 4 commits (`e474bd2` → `ec5bd96` → `9e2909b` → `de26102` → `2891207`):**
- **Header section** (`e474bd2`): Display name (slug-matched against sessions, auth, then `unslug()` fallback). Summary chips ("3 sessions today", "2 staff assigned") derived from `mockSessions`. Status breakdown sub-line ("Today: 1 completed · 1 in progress …").
- **Authorization section** (`e474bd2`): Expanded mini-bar pattern — full-width bar, percentage, plain-English line ("72 of 100 hrs used — 28 remaining"). Threshold marker preserved from the dashboard tile. Empty state for clients without auth data.
- **Auth lib extraction** (`e474bd2`): Once `AuthorizationUtilizationTile` AND `ClientOverviewPage` both needed the same threshold + color logic, extracted `src/lib/authorization.ts` with `FLAGGED_THRESHOLD`, `utilizationClass()`, `usedHours()`. `mockAuthorizations.ts` gained a `totalAuthorizedHours` field so the page can show absolute hours, not just %.
- **"Working with" row** (`ec5bd96`): Comma-separated staff name links under the chips. Cross-page navigation lives in the header now — visitors don't need to scroll to find their next click.
- **Sessions table** (`9e2909b`): "Sessions — Last 7 Days" card with 4 columns (Time / Staff linked / Type / Status). Status uses a copied `STATUS_CONFIG` block from `TodaySessionsTile` — 2 callers, deferred extraction. (This will get extracted in step 4 once a third caller appears.)
- **Identity detail grid** (`de26102`): 8 fields from Jenny's working doc — DOB, address, insurance, authorization period, CPT/billing code with plain-English label, BCBA, Supervisor, Technician (last three derived from sessions where possible, then mock fallbacks). New `src/types/client.ts` + `src/data/mockClients.ts` (8 entries with realistic demographics + care team). Renders as semantic `<dl>/<dt>/<dd>` for screen-reader-friendly definition list semantics.
- **Active Goals section** (`2891207`): New `src/types/goal.ts` and `src/data/mockGoals.ts` keyed by client slug, 6-8 goals each. Each row: bold goal name, muted mastery criteria below, right-aligned streak ("3 days in a row at 80%"), color-coded status chip (under-progress red / in-progress slate / nearing-mastery amber / mastered emerald), "Last updated X days ago" with editorial today/yesterday formatting. Sort priority: under-progress → in-progress → nearing-mastery → mastered (worst first, matching the rest of the dashboard's "needs attention first" pattern). Deliberate call NOT to add progress bars per Jenny's May 5 input ("we already have streaks, bars would be visual noise").

**4. Staff Overview build-out + domain lib extractions (`df925db`):**
- New `src/pages/StaffOverviewPage.tsx` mirroring the client page's 4-section shape
- **Header**: Name + role subtitle ("Technician · this week", derived from session types — leading any Supervision/Assessment/Parent training session reads as Supervisor / BCBA, otherwise Technician). Chips for sessions + clients served. Identity detail grid: Role title (formal credential — "Behavior Technician (RBT)"), Hire date, Certification, Assigned team.
- **Supervision compliance**: Expanded mini-bar + % + `ComplianceBadge` (Compliant / At risk / Non-compliant) + plain-English line ("3.4 of 2 required supervision hours this period"). Empty state for staff without supervision data.
- **Sessions this week**: Same 4-column table as Client Overview, with client names linked back to `/clients/:clientId` — completes the navigation loop (client page → staff page → client page).
- **Client caseload**: Unique clients this staff member has sessions with, rendered as linked chips.
- **Three lib + component extractions**, all forced by the rule of three:
  - `src/lib/sessions.ts` — `STATUS_CONFIG`, `STATUS_ORDER`, `formatTime` (3rd caller arrived: Today's Sessions tile, Client Overview, Staff Overview)
  - `src/components/SessionStatusBadge.tsx` — extracted from inline `StatusBadge` for the same reason
  - `src/lib/supervision.ts` — `SUPERVISION_THRESHOLD`, `WATCH_UPPER`, `complianceClasses`, `complianceStatus`, `requiredHours`, `actualSupervisionHours` (Supervision tile + Staff Overview both compute compliance bands)
- **Staff type extended**: `src/types/staff.ts` gained `StaffRole` enum (BCBA / Supervisor / Technician) + `hireDate`, `certification`, `team` fields. All 13 mockStaff records updated with realistic data.

**5. CertificationsExpiringTile — 6th dashboard tile (`cf5061c`):**
- New `src/components/CertificationsExpiringTile.tsx` — KPI headline (count of staff with certs expiring within 90 days) + per-staff list sorted soonest-first. Each row: linked staff name, cert type, days-until-expiry with editorial formatting ("In 18 days" / "Expires tomorrow" / "Expired N days ago"), color-coded chip (Urgent ≤ 30 days red, Warning 31-90 amber).
- Extended `src/lib/staff.ts` with `parseCertification()` (regex-parses "RBT — expires Aug 2026" into `{ type, expiryDate }`), `daysUntil()` (whole-day diff with midnight normalization), and named thresholds `CERT_WARNING_DAYS` / `CERT_URGENT_DAYS`
- Convention: ABA certs expire on the LAST day of the listed month (`new Date(year, month+1, 0)` JS quirk gets us "last day of month N" via "day 0 of month N+1"). Documented in code comments.
- Affirmative empty state — when zero certs are expiring, an emerald-tinted card with check icon ("All certifications current") instead of the usual dashed "no data" border. Different visual language for celebratory outcomes vs missing data.
- Tweaked 3 mockStaff cert dates (Marcus Johnson → May 2026 urgent, James Rodriguez + Ben Garcia → Jul 2026 warning) so the tile actually has data to render against today's date. Picked staff *outside* the existing flagged trio (David Kim / Olivia Park / Tyler Brooks) so the cert tile flags new people instead of piling on — adds variety to the cross-tile narrative.
- **Layout decision**: declined `lg:grid-cols-4` for the bottom KPI row because the existing Supervision/Auth mini-bars (fixed `w-44`) would clip the staff-name column at 25% tile width. Instead, added the tile as a 4th child in the existing `lg:grid-cols-3` grid and let CSS auto-flow place it at row 2 column 1. Two empty cells to its right read as "open slots for future tiles" rather than a defect.

**6. Graceful empty-staff page (`03c401f`):**
- Click-throughs revealed a problem: James Rodriguez appears in `mockStaff` and the cert tile but has no sessions, no supervision, no caseload. Clicking through landed on a page where 3 of 4 sections empty-stated out and the role subtitle didn't render at all (because the derivation requires sessions). Looked broken.
- **Subtitle fallback**: when `derivedRole` is null, fall back to formal `staff.role` ("Technician") without the "· this week" suffix. With-suffix means "what they're doing now"; without-suffix means "who they are on paper" — same word, different semantics encoded by a single qualifier.
- **Empty-state collapse**: when sessions AND supervision are both empty, replace the cascade of three near-identical "No X" dashed cards with one explanatory notice ("No session activity for [name] this week. When sessions are scheduled, supervision compliance, sessions, and caseload will appear here."). Reads as intentional, not broken. Header card always renders — the cert visitor still gets the cert info they came for.

**Commits:** `c6e69d0` → `dab42e7` → `578ef35` → `e474bd2` → `ec5bd96` → `9e2909b` → `de26102` → `2891207` → `df925db` → `cf5061c` → `03c401f`

**New skills:**
- React Router fundamentals (`BrowserRouter`, `Routes`/`Route`, `useParams`, `<Link>`) and the SPA-fallback gotcha that catches everyone the first time they deploy a client-routed app to a static host
- The `src/pages/` convention — pages own data fetching + composition, components own a single visual unit. Routing is a shell, not a participant.
- Slug-based identity ("name → URL → name") with paired `toSlug` / `unslug` helpers, including the unslug fallback for displaying clients/staff that exist in the URL but not in any data file
- Rule of three applied four times in one session (sessions lib, supervision lib, slug lib, SessionStatusBadge component) — pattern for recognizing when "copy" becomes "extract"
- Multi-section detail page composition — 4 cards on each overview page, each card a self-contained section with its own empty state
- Cross-page navigation as a graph, not a tree — clicking a client name on the dashboard → client page → linked staff name → staff page → linked client chip → another client page. No dead ends.
- Date parsing without a date library — month-abbreviation regex + `new Date(year, month+1, 0)` for last-day-of-month + midnight-normalized whole-day diff. Robust enough for production cert handling.
- Embedding `<Link>` into Recharts SVG via `<foreignObject>` — third use of this escape hatch (icons in Session 4, link-wrapping here)
- Affirmative vs neutral empty states — celebratory outcomes ("All certifications current") get a different visual language than missing data ("No supervision data available")
- Distinguishing two semantically-different empty states with the same word — "Technician · this week" (active) vs "Technician" (formal) — by adding/removing a qualifier
- Collapsing a cascade of related empty cards into a single explanatory notice — "three things missing reads as broken; one notice reads as intentional"

---

## Project anatomy

```
src/
├── App.tsx                                ← Routing shell — <Routes> with 3 paths
├── main.tsx                               ← React boot + <BrowserRouter> wrap (don't touch)
├── index.css                              ← Tailwind import + shadcn design tokens
│
├── pages/
│   ├── DashboardPage.tsx                  ← Header + 2 grids (top: 2-col, bottom: 3-col with auto-flowed 6th tile) + footer
│   ├── ClientOverviewPage.tsx             ← /clients/:clientId — header + auth + sessions + active goals
│   └── StaffOverviewPage.tsx              ← /staff/:staffId — header + supervision + sessions + caseload (with collapsed empty state)
│
├── components/
│   ├── HoursByStaffTile.tsx               ← Stacked Recharts bar (all 13 staff, sortable, flag indicators, linked names)
│   ├── TodaySessionsTile.tsx              ← Today's session table + status filter chips + sort dropdown (linked clients)
│   ├── NotesOverdueTile.tsx               ← KPI headline + per-staff overdue count list (sortable, linked names)
│   ├── SupervisionComplianceTile.tsx      ← KPI + per-RBT mini-bars (low % = bad, 5% threshold marker, linked names)
│   ├── AuthorizationUtilizationTile.tsx   ← KPI + per-client mini-bars (high % = bad, inverted semantics, linked names)
│   ├── CertificationsExpiringTile.tsx     ← KPI + per-staff list (90-day window, urgent/warning chips, affirmative empty state)
│   ├── SessionStatusBadge.tsx             ← Shared status pill (used by Today's Sessions, Client Overview, Staff Overview)
│   └── ui/                                ← shadcn-generated primitives — DO NOT EDIT
│       ├── button.tsx
│       ├── card.tsx
│       ├── chart.tsx
│       ├── select.tsx
│       ├── toggle.tsx
│       └── toggle-group.tsx
│
├── data/                                  ← Mock data, one file per domain
│   ├── mockStaff.ts                       ← 13 staff records (role, hire date, certification, team + hour fields)
│   ├── mockSessions.ts                    ← 12 sessions across the day, mixed statuses
│   ├── mockOverdueNotes.ts                ← 7 staff with overdue notes (totals to 30)
│   ├── mockSupervision.ts                 ← 8 RBTs spanning red/amber/green compliance
│   ├── mockAuthorizations.ts              ← 8 clients with utilization % + total authorized hours
│   ├── mockClients.ts                     ← 8 client identity profiles (DOB, address, insurance, auth period, CPT, care team)
│   └── mockGoals.ts                       ← Client goals keyed by slug, 6-8 each (name, mastery target, streak, status)
│
├── lib/
│   ├── slug.ts                            ← toSlug() / unslug() — name ↔ URL conversion
│   ├── sessions.ts                        ← STATUS_CONFIG + STATUS_ORDER + formatTime() (shared session display logic)
│   ├── supervision.ts                     ← SUPERVISION_THRESHOLD + complianceClasses() + complianceStatus() + hour calcs
│   ├── authorization.ts                   ← FLAGGED_THRESHOLD + utilizationClass() + usedHours()
│   ├── staff.ts                           ← isStaffFlagged() + parseCertification() + daysUntil() + cert thresholds
│   └── utils.ts                           ← shadcn's cn() helper
│
└── types/                                 ← TypeScript interfaces, one file per domain
    ├── staff.ts                           ← Staff + StaffRole
    ├── session.ts                         ← Session + SessionStatus
    ├── overdueNotes.ts
    ├── supervision.ts
    ├── authorization.ts                   ← ClientAuthorization (with totalAuthorizedHours)
    ├── client.ts                          ← ClientProfile (identity + care team)
    └── goal.ts                            ← Goal + GoalStatus

vercel.json                                ← SPA fallback rewrite — required for client-side routing on Vercel

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

## Session 11 — Goal modal polish, week calendar redesign, real ABA goal states

**Date:** May 18, 2026

**Commits:** `a518a55` → `dac0fa4` → `85b300a` → `9c0a769` → `b84a85f` → `f311c86` → `5884fc0` → `be777ff` → `51a4ad1`

---

### What landed

#### Goal Detail Modal — chart readability pass
- Increased dialog height from `220px` → `280px`; line `strokeWidth` raised to `2.5` on both lines
- Explicit hex colors: Session % line = `#2563eb` (blue), Rolling average = `#16a34a` (green), Mastery reference line = `#dc2626` (red, dashed)
- `dot={{ r: 3 }}` on session line so every data point is visible; `activeDot={{ r: 5 }}` on hover
- Mastery reference line label moved to `position="insideTopRight"` — no longer overlaps early data points

#### Goal chart right-edge gap — three-attempt diagnosis + fix
- **Root cause 1 (date):** `BASE` was hardcoded to `new Date(2025, 10, 10)`, so 25 weekly points ended Apr 27. Fixed by computing `BASE = today − 24 weeks` at runtime, anchoring the last point to today.
- **Root cause 2 (modal width):** The dialog was stuck at `max-w-sm` (~384px) because shadcn's `DialogContent` hardcodes `sm:max-w-sm` and `max-w-2xl` (no breakpoint) couldn't override it. Fixed by passing `sm:max-w-2xl`.
- **Root cause 3 (axis scale):** Recharts' category axis uses a band scale, leaving a half-band gap at each edge. `scale="point"` and `padding={{ left: 0, right: 0 }}` weren't enough. Fixed definitively by switching to a **numeric XAxis**: added `idx: 0..24` to every `GoalDataPoint`, set `type="number" domain={["dataMin","dataMax"]}`, explicit `ticks={[0,4,8,12,16,20,24]}`, and a `tickFormatter` that looks up the date string by index. `labelFormatter` on the tooltip preserves the date on hover.

#### Session Calendar — horizontal week grid redesign
- **Before:** 7 days stacked vertically, each as a full-width row with session cards
- **After:** `grid-cols-7` CSS grid — one column per day (Mon–Sun), cards stacking inside each column
- Each column header: day name + date number + "Today" badge in primary color
- Session cards have a **2px colored left border** by status: green = Completed, blue = Scheduled, amber = Cancelled, red = No-show
- Empty days show a faint `—` (not "No sessions scheduled" — too noisy in a 7-column layout)
- **Week summary strip** above the grid: e.g. "5 sessions · 3 completed · 1 scheduled · 1 cancelled"
- Month view unchanged

#### Real ABA goal states (client-confirmed)
Replaced the four invented statuses with the four real lifecycle states the client confirmed:

| Old | New |
|---|---|
| `under-progress` | `hold` |
| `nearing-mastery` | `in-progress` |
| — | `discontinued` *(new)* |
| `mastered` | `mastered` *(unchanged)* |

**Chip colors:**
- In progress → blue (`bg-blue-100 text-blue-800`)
- Hold → amber (`bg-amber-100 text-amber-800`)
- Mastered → green (`bg-emerald-100 text-emerald-800`)
- Discontinued → gray muted (`bg-gray-100 text-gray-500`) + `opacity-50` + `line-through` on the goal name

**Sort order:** In progress → Hold → Mastered → Discontinued

**Files changed:** `src/types/goal.ts`, `src/data/mockGoals.ts`, `src/data/mockGoalHistory.ts`, `src/pages/ClientOverviewPage.tsx`, `src/components/GoalDetailModal.tsx`

**Mock data updates:**
- `"nearing-mastery"` goals → `"in-progress"` across all clients
- `"under-progress"` goals → `"hold"` (most) or `"discontinued"` (Liam's tooth brushing g-la-8, Mia's tolerating transitions g-md-1 — both fit the cross-tile attendance story)
- Chart trajectory shapes updated: `hold` = flat/slight decline; `discontinued` = declining (clinically why it was removed)
- `shadcn Input` installed (`npx shadcn add input`) for edit mode below

#### Goal Detail Modal — edit mode
- **Edit button** in the modal header (right-aligned, next to title, hidden during edit)
- Clicking Edit switches the metadata block to two editable fields:
  - **Status** — shadcn `Select` with all 4 states, pre-selected to current value
  - **Mastery criterion** — shadcn `Input` pre-filled with the current criterion text
- **Save** commits the draft to local `saved` state and returns to view mode; **Cancel** discards and returns to view mode
- Chart and streak data remain visible in both view and edit mode
- State design: `draft` (in-flight edits) + `saved` (committed overrides) layered on top of original `goal` prop; resets on modal close

#### Goal Detail Modal — pill badge legend
- Replaced the SVG line-swatch legend below the chart with three colored pill badges **above** the chart
- Blue solid filled pill → "Per-session score"
- Green dashed-border pill → "Rolling average"
- Red dashed-border pill → "Mastery criterion"
- Left-aligned horizontal row with `gap-3` (12px); dashed borders mirror the dashed line styles in the chart

---

### Files changed this session

| File | Change |
|---|---|
| `src/components/GoalDetailModal.tsx` | Chart polish, width fix, numeric XAxis, edit mode, pill legend |
| `src/components/SessionCalendar.tsx` | Week view → 7-column horizontal grid with summary strip |
| `src/components/ui/input.tsx` | New — installed via `npx shadcn add input` |
| `src/data/mockGoalHistory.ts` | Numeric `idx` field; dynamic BASE date; updated trajectory configs + GOAL_SPECS |
| `src/types/goal.ts` | New `GoalStatus` type: `in-progress \| hold \| discontinued \| mastered` |
| `src/data/mockGoals.ts` | All statuses remapped to 4 real states |
| `src/pages/ClientOverviewPage.tsx` | Updated `GOAL_STATUS_CONFIG`, sort order, `GoalRow` strikethrough for discontinued |

---

---

## Session 12 — Session View page, role toggle, team filter, cert relocation

**Date:** May 19, 2026
**Commits:** `a6c4ceb` → `c8404a3` (6 commits)

### What landed

#### Session View page (`/session/:sessionId`)

The most complex screen in the app — built end-to-end in one session. An RBT opens this page from the "Start Session" button on any Client Overview page. It has two distinct modes separated by a single "End Session" tap.

**Sticky header (always visible in both modes):**
- Client name links back to Client Overview; "Back" arrow also navigates there
- Live count-up timer (monospace, auto-starts on mount, pauses when End Session is tapped)
- Billing code chip auto-filled from `mockClients` → `cptCode`
- Location free-text input (required; validated before End Session is allowed — shows inline red error if empty)
- Attendees multi-select: "Client" always checked and non-interactive; Mom / Dad / Grandparents / Supervisor / BCBA are pill-toggle buttons

**MODE 1 — Active Session (two-column layout):**

Left column — Behaviors:
- `src/data/mockBehaviors.ts` created with 2–3 clinically-named behaviors per client (Elopement, Aggression, Non-compliance, SIB, etc.)
- Each behavior card has a large `−` / `+` counter (size-12 touch targets)
- "Add ABC context" opens a 3-step inline flow directly below the card:
  - Step 1: Antecedent multi-select (12 options)
  - Step 2: Consequence multi-select (12 options)
  - Step 3: Intensity toggle (Low / Medium / High) + Duration picker (6 options: `<1 min` → `1+ hr`)
  - Completed entries saved below the card as small summary rows (intensity color-coded red/amber/slate, A/C lists shown inline)

Right column — Programs:
- Checkbox selector pulls all `in-progress` and `hold` goals from `mockGoals[clientId]` — **discontinued and mastered goals are filtered out** (they shouldn't be run in an active session)
- Each selected goal becomes a program card with: goal name, mastery criteria text, live `correct/total · %` readout, ✓ Correct and ✗ Incorrect trial buttons (44 px+ tap targets)
- Tapping ✗ opens a "Why incorrect?" inline picker (6 reasons: Verbal/vocal prompt needed, Physical prompt needed, Refused task, Distracted, Not yet introduced, Other)
- Trial history displays as a row of ✓/✗ color-coded dots below each card; % color is green ≥ 80%, amber ≥ 60%, red below

Sticky "End Session" button — full-width, destructive style, fixed to the viewport bottom.

**MODE 2 — Post-Session:**

Session status selector — 4 large tap targets (2×2 grid) with color-coded borders: Occurred (emerald), Shortened (blue), Cancelled (amber), No-show (red). Switching resets the signature state.

Cancelled / No-show path:
- Cancellation reason field (required, blocks Submit)
- Optional internal note (textarea)
- Submit navigates to `/`

Occurred / Shortened path:
- SOAP note form — 4 fields, each with a persistent visible prompt label above the textarea:
  - **S:** "What did the caregiver or client report at the start of the session?"
  - **O:** "What data was collected? Summarize program performance and behavior incidents."
  - **A:** "What interventions or strategies were used?"
  - **P:** "What are the goals or adjustments for the next session?"
- Signature block: caregiver "Tap to sign" area locked until all 4 SOAP fields have content; turns emerald with checkmark once tapped
- Staff signature shown as a deferred/dimmed block — "complete later"
- "Submit Session" disabled until caregiver signature captured; navigates to `/` on submit

---

#### Role toggle on dashboard header

- Segmented pill control in the header right: `Technician | Supervisor | BCBA | Owner`
- Default: **Owner** (sees all tiles)
- Tile visibility per role:

| Role | Hours by Staff | Auth Utilization |
|---|---|---|
| Technician | ✗ hidden | ✗ hidden |
| Supervisor | ✗ hidden | ✓ visible |
| BCBA | ✗ hidden | ✓ visible |
| Owner | ✓ visible | ✓ visible |

- When Hours by Staff is hidden, Today's Sessions expands to `lg:col-span-2` to fill the row

---

#### Team filter chips

- `src/types/team.ts` created — `TeamFilter` type, `TEAM_FILTERS` array, `ROLE_DEFAULT_TEAM` map
- `ClientProfile` type got a new `team: "Team A" | "Team B" | "Team C"` field
- All 8 clients assigned: Team A (Sophia, Liam, Olivia), Team B (Ethan, Lucas, Ava), Team C (Mia, Noah)
- Filter chips appear below the header: `All Teams | Team A | Team B | Team C`
- **Role → team sync:** switching roles auto-snaps the team filter (Technician → A, Supervisor → B, BCBA → A, Owner → All). User can override manually.
- "Showing Team X only" italic hint appears when a team is active
- All 5 tiles accept a `teamFilter?` prop and filter independently:

| Tile | Join key |
|---|---|
| Hours by Staff | `staff.team` directly |
| Today's Sessions | `mockStaff.find(staffName).team` |
| Notes Overdue | `mockStaff.find(staffName).team` |
| Supervision Compliance | `mockStaff.find(rbtName).team` |
| Auth Utilization | `mockClients.find(clientName).team` |

KPI headline numbers recalculate from the filtered list — e.g., switching to Team C shows "2 clients" in auth utilization, not "8."

---

#### Certifications relocated to StaffOverviewPage

- `CertificationsExpiringTile.tsx` deleted — certifications belong on the individual staff page, not the dashboard glance
- New "Certifications" card added as Section 2 on `StaffOverviewPage` (always visible, not gated by `hasNoActivity`)
- Reuses existing `parseCertification`, `daysUntil`, `CERT_URGENT_DAYS`, `CERT_WARNING_DAYS` from `@/lib/staff` — no new logic
- Each cert row shows: cert type ("RBT Certification" / "BCBA Certification"), expiry date, days-remaining context, and a status chip:
  - 🔴 **Expired** — past the expiry date
  - 🔴 **Urgent** — ≤ 30 days
  - 🟡 **Warning** — 31–90 days
  - 🟢 **Current** — > 90 days
- Designed as a `<ul>` over a single-element array so it extends naturally if `Staff` later grows a `certs[]` field

---

### Files changed this session

| File | Change |
|---|---|
| `src/data/mockBehaviors.ts` | **New** — 2–3 behaviors per client keyed by slug |
| `src/types/team.ts` | **New** — `TeamFilter` type, `TEAM_FILTERS`, `ROLE_DEFAULT_TEAM` |
| `src/types/client.ts` | Added `team` field to `ClientProfile` |
| `src/data/mockClients.ts` | Added `team` assignment to all 8 clients |
| `src/pages/SessionViewPage.tsx` | **Full build** — replaced placeholder with ~500-line page |
| `src/pages/DashboardPage.tsx` | Role toggle, team filter chips, role→team sync, prop pass-through |
| `src/pages/StaffOverviewPage.tsx` | Added Certifications section (Section 2); updated section numbering |
| `src/components/TodaySessionsTile.tsx` | `teamFilter` prop; filter sessions via staff team lookup |
| `src/components/HoursByStaffTile.tsx` | `teamFilter` prop; filter `mockStaff` by team |
| `src/components/NotesOverdueTile.tsx` | `teamFilter` prop; filter via staff team lookup |
| `src/components/SupervisionComplianceTile.tsx` | `teamFilter` prop; filter via staff team lookup |
| `src/components/AuthorizationUtilizationTile.tsx` | `teamFilter` prop; filter via client team lookup |
| `src/components/CertificationsExpiringTile.tsx` | **Deleted** — functionality moved to `StaffOverviewPage` |

---

## Session 13 — Supabase auth + practice onboarding (fully working)

**What landed:** The app now requires a real Supabase account to access the dashboard. New users are onboarded through a practice creation flow before reaching any data.

### Auth gate
- `src/pages/AuthPage.tsx` — email/password sign-in and sign-up, error display, Enter key support
- `App.tsx` — checks `supabase.auth.getSession()` on mount and listens via `onAuthStateChange`; renders `<AuthPage />` if no session, `<CreatePracticePage />` if session but no practice, otherwise the full dashboard

### Practice onboarding
- `src/pages/CreatePracticePage.tsx` — inserts into `practices` then `practice_members` (linking user as `owner`); calls `onPracticeCreated()` on success
- `src/lib/supabase.ts` — `getUserPractice(userId)` queries `practice_members` with `.maybeSingle()`; now wrapped in an 8-second timeout race so a missing SELECT policy surfaces as a logged error rather than a silent hang

### Supabase database setup (all policies confirmed active)
Ran these in SQL editor to establish the full permission set in one shot:

| Table | Policy | Type |
|---|---|---|
| `practices` | `insert_practices` | INSERT (authenticated, `WITH CHECK (true)`) |
| `practices` | `select_practices` | SELECT (authenticated, `USING (true)`) |
| `practice_members` | `insert_practice_members` | INSERT (authenticated, `WITH CHECK (user_id = auth.uid())`) |
| `practice_members` | `select_practice_members` | SELECT (authenticated, `USING (user_id = auth.uid())`) |

Also ran: `GRANT SELECT, INSERT, UPDATE, DELETE ON practices TO authenticated` and same for `practice_members`.

### Debugging improvements
- `App.tsx` now shows a visible "Loading…" spinner instead of a blank screen when initialising
- All state transitions log to console (`[App]`, `[getUserPractice]`, `[CreatePractice]`) for easy tracing
- Race condition fixed: `initialised` flag ensures `setLoading(false)` runs exactly once regardless of which path (`getSession` vs `onAuthStateChange`) resolves first

### Key lesson
The root cause of the multi-session debugging loop was that Supabase RLS blocks queries silently (the fetch hangs rather than returning an error) when a SELECT policy is missing. The 8-second timeout in `getUserPractice` plus the `console.error` on catch now surface this immediately.

---

## Session 14 — Sign-out, duplicate row fix, first live Supabase data tile

**What landed:** Sign-out button on the dashboard, a defensive fix for duplicate `practice_members` rows, and the first tile reading real data from Supabase instead of mock data.

### Sign-out button
- `src/pages/DashboardPage.tsx` — added a shadcn `Button` (variant `outline`, size `sm`) on the far right of the dashboard header. Calls `supabase.auth.signOut()` on click; `onAuthStateChange` in `App.tsx` automatically swaps back to `<AuthPage />`.

### Duplicate practice_members fix
- **Root cause:** The user had clicked "Create Practice" multiple times across debugging sessions. Each click successfully inserted a new row into both `practices` and `practice_members`. `maybeSingle()` throws an error (not null) when it receives more than one row — causing `getUserPractice` to always return null and the app to stay stuck on the onboarding screen.
- **Database fix:** Ran `DELETE FROM practice_members WHERE ctid NOT IN (SELECT max(ctid) FROM practice_members GROUP BY user_id)` to keep only the latest membership row per user.
- **Code fix:** `src/lib/supabase.ts` — added `.limit(1)` before `.maybeSingle()` in `getUserPractice` so future duplicates never trigger the multi-row error.

### First live data tile — Clients
- `src/lib/supabase.ts` — added `Client` interface and `getClients()` function: queries `clients` table for `id, first_name, last_name, date_of_birth, status`, ordered by `last_name` ascending. Throws on error.
- `src/components/ClientsListTile.tsx` — **new component**. Fetches on mount via `useEffect`. States: loading spinner, red error message, "No clients yet" empty state, or a full table. Columns: Name (Last, First), Date of Birth (formatted), Status (colored badge: green = active, amber = inactive, gray = discharged).
- `src/pages/DashboardPage.tsx` — added `<ClientsListTile />` as a full-width row below the existing 5 tiles.
- **Supabase SQL required:** `ALTER TABLE clients ENABLE ROW LEVEL SECURITY` + `CREATE POLICY "select_clients" ON clients FOR SELECT TO authenticated USING (true)`.
- **Confirmed working:** "Torres, Emma — Apr 11, 2018 — Active" rendered from live Supabase data.

### Files changed
| File | Change |
|---|---|
| `src/pages/DashboardPage.tsx` | Sign-out button; import + render `ClientsListTile` |
| `src/lib/supabase.ts` | `.limit(1)` on `getUserPractice`; added `Client` type + `getClients()` |
| `src/components/ClientsListTile.tsx` | **New** — live Supabase clients table tile |

---

---

## Session 15 — Phase 3 Day 2: staff table, seed, and first live staff tile

**What landed:** Supabase `staff` table created and seeded with 13 mock staff members; `HoursByStaffTile` reads live data instead of the `mockStaff` fixture.

### Supabase — database work
- **Orphan cleanup:** deleted all `practices` rows except `1c938c8c-4677-4ef3-812c-d9538646f3e5` (the real practice).
- **`staff` table created** following the standing template:
  - Columns: `id` (uuid PK, `gen_random_uuid()`), `practice_id` (uuid FK → `practices` CASCADE), `full_name`, `role`, `team`, `hire_date`, `certification`, `created_at`, `direct_hours`, `indirect_hours`, `cancellation_hours`
  - RLS enabled with 4 policies (SELECT / INSERT / UPDATE / DELETE) scoped to `practice_members`
  - `GRANT ALL ON staff TO authenticated`
- **Seeded 13 staff rows** matching `src/data/mockStaff.ts` names, roles, teams, hire dates, certifications, and hour values.

### Code changes
- `src/lib/supabase.ts` — added `StaffRecord` interface and `getStaff()` function: queries all staff columns, maps snake_case → camelCase, computes `totalHours = direct + indirect + cancellation`.
- `src/components/HoursByStaffTile.tsx` — replaced `mockStaff` import with a `useEffect` + `getStaff()` fetch; added loading / error / empty states; `YAxisTick` now receives the live staff array via props; sort comparators updated to use `StaffRecord` type.

### Files changed
| File | Change |
|---|---|
| `src/lib/supabase.ts` | Added `StaffRecord` type + `getStaff()` |
| `src/components/HoursByStaffTile.tsx` | Replaced mock import with live Supabase query |

---

## Session 16 — Phase 3 Day 3: Vercel env vars, sessions table, live TodaySessionsTile

**What landed:** Production app now reads real Supabase data; `sessions` table created and seeded; `TodaySessionsTile` wired to live data; UTC time display bug fixed.

### Vercel environment variables
- Added `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the Vercel project under Settings → Environment Variables (Production + Preview + Development).
- Triggered a manual redeploy — build completed in 25 s. Production URL now reads live Supabase data for both the Clients tile and the Hours by Staff tile.

### Supabase — database work
- **Seeded 8 missing clients** (`Anderson`, `Bennett`, `Carter`, `Davis`, `Edwards`, `Foster`, `Hayes`, `Hughes`) matching the names used in `mockSessions.ts`.
- **`sessions` table created** following the standing template:
  - Columns: `id` (uuid PK), `practice_id` (FK → `practices` CASCADE), `client_id` (FK → `clients` CASCADE), `staff_id` (FK → `staff` CASCADE), `scheduled_at` (timestamptz), `session_type` (text), `status` (text), `created_at` (timestamptz)
  - Indexes on `practice_id` and `scheduled_at`
  - RLS enabled with 4 policies (SELECT / INSERT / UPDATE / DELETE) scoped to `practice_members`
  - `GRANT ALL ON sessions TO authenticated`
- **Seeded 17 sessions for today (2026-05-29)** — mix of completed, in-progress, scheduled, cancelled, and no-show; covers all 13 staff members and all 9 clients.

### Code changes
- `src/lib/supabase.ts` — added `SessionRecord` interface and `getSessionsToday()`: queries `sessions` with PostgREST joins to `clients` and `staff`, filters to the current local day using UTC boundaries, maps to a flat record including `staffTeam` (eliminating the need for a separate staff lookup in the tile).
- `src/components/TodaySessionsTile.tsx` — replaced `mockSessions` + `mockStaff` imports with `useEffect` + `getSessionsToday()`; added loading / error / empty states; team filter now uses `s.staffTeam` directly from the JOIN.
- `src/lib/sessions.ts` — fixed `formatTime` to parse the full ISO timestamp as a `Date` and format in the user's local timezone via `toLocaleTimeString`, instead of slicing the raw string (which was returning UTC hours).

### Files changed
| File | Change |
|---|---|
| `src/lib/supabase.ts` | Added `SessionRecord` type + `getSessionsToday()` |
| `src/components/TodaySessionsTile.tsx` | Replaced mock imports with live Supabase query |
| `src/lib/sessions.ts` | Fixed `formatTime` to show local time instead of UTC |

---

## Session 17 — Phase 3 Day 4: all 5 dashboard tiles on live Supabase data

**What landed:** Three more tiles migrated from mock fixtures to Supabase — Authorization Utilization, Supervision Compliance, and Notes Overdue. Every dashboard tile now reads real data.

### Supabase — database work
- **`clients` table** — added `team` column; backfilled Team A / B / C for all 9 clients.
- **`authorizations` table** — created with standing template (id, practice_id FK CASCADE, client_id FK CASCADE, RLS 4 policies, GRANT ALL). Columns: `cpt_code`, `authorized_units`, `used_units`, `start_date`, `end_date`. Seeded 9 rows (one per client) with utilization values matching the mock; Emma Torres added at 65% / 80 h.
- **`supervision` table** — created with standing template. Columns: `staff_id` FK → staff CASCADE, `supervision_pct` (numeric 5,1), `period_start`, `period_end`. Seeded 8 rows for May 2026 matching `mockSupervision.ts`.
- **`overdue_notes` table** — created with standing template. Columns: `staff_id` FK → staff CASCADE, `overdue_count` (int), `as_of_date` (date). Seeded 7 rows dated 2026-05-29 matching `mockOverdueNotes.ts`.

### Code changes
- `src/lib/supabase.ts` — added `AuthRecord` + `getAuthorizations()`, `SupervisionRecord` + `getSupervision()`, `OverdueNoteRecord` + `getOverdueNotes()`. All use PostgREST joins to pull staff/client names and team without a second query.
- `src/components/AuthorizationUtilizationTile.tsx` — replaced `mockAuthorizations` + `mockClients` with `useEffect` + `getAuthorizations()`; team filter uses `a.clientTeam` from JOIN; sort comparators use `AuthRecord`.
- `src/components/SupervisionComplianceTile.tsx` — replaced `mockSupervision` + `mockStaff` with `useEffect` + `getSupervision()`; team filter uses `r.staffTeam`; sort comparators use `SupervisionRecord`.
- `src/components/NotesOverdueTile.tsx` — replaced `mockOverdueNotes` + `mockStaff` with `useEffect` + `getOverdueNotes()`; team filter uses `n.staffTeam`; sort comparators use `OverdueNoteRecord`.

### Files changed
| File | Change |
|---|---|
| `src/lib/supabase.ts` | Added `AuthRecord`, `SupervisionRecord`, `OverdueNoteRecord` types + 3 fetch functions |
| `src/components/AuthorizationUtilizationTile.tsx` | Live Supabase query |
| `src/components/SupervisionComplianceTile.tsx` | Live Supabase query |
| `src/components/NotesOverdueTile.tsx` | Live Supabase query |

---

## Session 18 — Phase 3 Day 5: clients schema expanded, tile rows clickable, live Client Overview header

**What landed:** Clients table fully populated with all identity fields; clicking a client row navigates to their overview page; the header card on `/clients/:id` reads live Supabase data.

### Supabase — database work
- **`clients` table expanded** — added columns: `insurance` (text), `auth_start_date` (date), `auth_end_date` (date), `assigned_staff_id` (uuid FK → staff), `cpt_codes` (text[]). Note: `date_of_birth` and `team` already existed.
- **Backfilled all 9 clients** with insurance payer, auth period dates, CPT codes, and assigned technician from `mockClients.ts`. Emma Torres (the original seed client) had DOB already set; all other fields filled in.

### Code changes
- `src/lib/supabase.ts` — added `ClientDetail` interface and `getClientById(id)` function: queries all client columns with a `staff(full_name)` join on `assigned_staff_id`, returns `null` for unknown IDs via `maybeSingle()`.
- `src/components/ClientsListTile.tsx` — rows now link to `/clients/${c.id}` (UUID-based). The name cell uses a `Link` with `after:absolute` overlay so the entire row is the click target.
- `src/pages/ClientOverviewPage.tsx` — detects UUID vs slug in `clientId` param via regex. UUID → fires `getClientById()` on mount and shows `LiveClientDetailGrid` (status, DOB, team, insurance, auth period, CPT codes, assigned staff). Slug → falls back to existing mock-based `ClientDetailGrid`. Sessions, goals, and auth utilization sections still use mock data.

### Files changed
| File | Change |
|---|---|
| `src/lib/supabase.ts` | Added `ClientDetail` type + `getClientById()` |
| `src/components/ClientsListTile.tsx` | Rows now navigate to `/clients/:id` |
| `src/pages/ClientOverviewPage.tsx` | UUID detection + live header via `LiveClientDetailGrid` |

---

## Session 19 — Phase 3 Day 6 (part 2): Session Calendar on live data

**What landed:** The Session Calendar on `/clients/:id` now reads from the live `sessions` table instead of `mockCalendarSessions`. The sessions table section ("Last 7 days") is also live.

### Supabase — database work
- **54 historical session rows seeded** — 3 weeks of back-history per client (Sophia Bennett, Emma Torres, Liam Anderson, Olivia Parker — whichever clients had the most mock calendar data), plus today's 17 rows already seeded in Session 16. Covers the full 6-week window the calendar can scroll through.

### Code changes
- `src/lib/supabase.ts` — added `getSessionsByClientId(clientId)`: same SessionRow interface and mapping as `getSessionsToday`, ordered `scheduled_at ASC`, no date filter (returns full history).
- `src/pages/ClientOverviewPage.tsx`:
  - Added `liveSessions` state + `useEffect` that calls `getSessionsByClientId` when `isUUID`.
  - `calendarSessions` → `liveSessions` when UUID-based, else `mockCalendarSessions` filtered by slug.
  - `sortedClientSessions` (sessions table) → last-7-days window of `liveSessions` when UUID-based.
  - `clientSessions` (chips / "today" count) → today-only filter of `liveSessions` when UUID-based.
  - All `SessionStatus` casts updated so TypeScript strict mode stays happy.

### Files changed
| File | Change |
|---|---|
| `src/lib/supabase.ts` | Added `getSessionsByClientId()` |
| `src/pages/ClientOverviewPage.tsx` | Live session calendar + last-7-days table |

---

## Session 20 — Phase 3 Day 7: Session View wired to live Supabase data

**What landed:** `SessionViewPage` no longer reads from any mock session, client, or goals fixture. All three are now fetched live from Supabase. `mockBehaviors` stays in place (no `behaviors` table yet — noted below).

### Supabase — database work
No schema changes. All required tables (`sessions`, `clients`, `goals`) were already in place from earlier sessions.

### Code changes

**`src/lib/supabase.ts`**
- Added `SessionByIdRow` (private interface) — extends the base session row with `client_id`, `staff_id`, and single-object joins for `clients` and `staff`.
- Added `SessionDetail` (exported interface) — `{ id, clientId, staffId, sessionType, scheduledAt, status, clientName, staffName }`.
- Added `getSessionById(sessionId)` — queries `sessions` with `clients(first_name, last_name)` and `staff(full_name)` joins, uses `.maybeSingle()` so missing IDs return `null` cleanly rather than throwing.

**`src/pages/SessionViewPage.tsx`**
- Removed imports: `mockCalendarSessions`, `mockClients`, `mockGoals`.
- Added imports: `getSessionById`, `getClientById`, `getGoalsByClientId`, `SessionDetail`, `ClientDetail`, `GoalRecord` from `@/lib/supabase`.
- Replaced the 8-line synchronous mock-lookup block (lines 264–272) with:
  - `useState` for `sessionDetail`, `goals`, `clientDetail`, `dataLoading`, `dataError`.
  - `useEffect` with a cancellation flag that:
    1. Calls `getSessionById(sessionId)`.
    2. On success, fires `getGoalsByClientId` and `getClientById` in parallel via `Promise.all`.
    3. Filters goals to `in-progress` and `hold` only before setting state.
    4. Sets `dataError` on any rejection.
- Added loading gate: renders "Loading session…" while `dataLoading` is true.
- Added error gate: renders "Session not found." if `dataError` or `sessionDetail` is null.
- `behaviors` still reads from `mockBehaviors` — keyed by `toSlug(sessionDetail.clientName)` (same slug logic as before, just sourced from the live name).
- `displayName` → `sessionDetail.clientName`.
- `billingCode` → `clientDetail?.cpt_codes?.[0] ?? "—"`.
- Back/breadcrumb `Link` hrefs updated from old slug `clientId` to `sessionDetail.clientId` (UUID), so "Back" navigates correctly to `/clients/:uuid`.
- Fixed `GoalStatus` cast at the goal-status badge render site (`goal.status as GoalStatus`) to satisfy TypeScript strict mode.

### Files changed
| File | Change |
|---|---|
| `src/lib/supabase.ts` | Added `SessionByIdRow`, `SessionDetail` interface, `getSessionById()` |
| `src/pages/SessionViewPage.tsx` | Full data-layer swap: mock → live Supabase; loading + error gates added |

---

## Session 21 — Phase 3 Day 8: all remaining mock surfaces cleared

**What landed:** Three wins eliminated the last mock data sources across StaffOverviewPage, Client Overview auth utilization, and Session View behaviors. Phase 3 read-path migration is now complete — every page reads from live Supabase data.

### Supabase — database work
- **`behaviors` table created** — `id`, `practice_id` FK → practices, `client_id` FK → clients, `name` (text), `description` (text), `created_at`. Full RLS (4 policies) + GRANT ALL to authenticated.
- **21 behavior rows seeded** — all 8 clients from `mockBehaviors`, names preserved exactly: Sophia Bennett (3), Liam Anderson (3), Ethan Carter (2), Mia Davis (3), Noah Edwards (2), Olivia Foster (2), Lucas Hayes (2), Ava Hughes (2).

### Code changes

**Win 1 — StaffOverviewPage on live data**
- `src/lib/supabase.ts` — added `getSupervisionByStaffId(staffId)` (returns `SupervisionRecord | null` via `.maybeSingle()`) and `getSessionsByStaffId(staffId)` (returns `SessionRecord[]`).
- `src/pages/StaffOverviewPage.tsx` — removed `mockSessions`, `mockStaff`, `mockSupervision`, `Session`, `RBTSupervision` imports. Added `useEffect` chain: `getStaff()` → slug-match → UUID → `Promise.all([getSupervisionByStaffId, getSessionsByStaffId])`. Sub-components `StaffDetailGrid`, `CertificationsDetail`, `SupervisionDetail` prop types updated from mock types to `StaffRecord` / `SupervisionRecord`. Loading + error gates added.

**Win 2 — Client Overview auth utilization on live data**
- `src/lib/supabase.ts` — added `getAuthorizationsByClientId(clientId)` (returns `AuthRecord | null` via `.maybeSingle()`).
- `src/pages/ClientOverviewPage.tsx` — added `liveAuth` state + `useEffect`. `auth` variable is now `liveAuth ?? mockAuthorizations.find(...)` (live-first, mock fallback for slug URLs). `AuthorizationDetail` prop type widened to `ClientAuthorization | AuthRecord`.

**Win 3 — Session View behaviors on live data**
- `src/lib/supabase.ts` — added `BehaviorRow`, `BehaviorRecord` interface, `getBehaviorsByClientId(clientId)` (returns `BehaviorRecord[]` ordered by `created_at`).
- `src/pages/SessionViewPage.tsx` — removed `mockBehaviors`, `Behavior`, `toSlug` imports. Added `behaviors` state (`BehaviorRecord[]`). `getBehaviorsByClientId` added to the existing `Promise.all` alongside goals and client detail — one fetch round-trip for all three. The mock IIFE lookup removed entirely.

### Files changed
| File | Change |
|---|---|
| `src/lib/supabase.ts` | Added `getSupervisionByStaffId`, `getSessionsByStaffId`, `getAuthorizationsByClientId`, `BehaviorRecord`, `getBehaviorsByClientId` |
| `src/pages/StaffOverviewPage.tsx` | Full live data wiring; loading + error gates |
| `src/pages/ClientOverviewPage.tsx` | Auth utilization section on live data |
| `src/pages/SessionViewPage.tsx` | Behaviors on live data; `mockBehaviors` removed |

---

## What's NOT done yet (next sessions, suggested order)

**Phase 3 — complete.** All read paths are on live Supabase data. Next phase is the write path.

**Write path (Phase 4 — suggested order):**
1. **Session submit** — `SessionViewPage` POST-session form (SOAP notes, outcome, signature) currently has no persistence. Write to a `session_notes` table on submit.
2. **Goal edit persistence** — edit mode in `GoalDetailModal` saves to local React state only; changes are lost on modal close. Write back to `goals` table on save.
3. **Behavior count persist** — ABC entries and counts in `SessionViewPage` are local state; wire to a `behavior_incidents` table.

**Phase 2 — remaining builds:**
1. **Session View tablet testing** — built tablet-first but not yet verified on a real device.

**Tier 2 — polish backlog:**
4. **Session timer survives navigation** — lift to `sessionStorage` or a context so it survives back-navigation.
5. **Team filter persists across navigation** — consider URL search params (`?team=Team+B`).
6. **Sort dropdown labels are wider than needed** — trim padding or use a more compact Select variant.
7. **Status badges in Today's Sessions aren't uniform width** — pad to widest label.
8. **Editorial sub-lines** — replace structural sub-lines with data-driven ones.
9. **Hover tooltips on mini-bars** in Supervision + Auth tiles.
10. **Hide "0 sessions / 0 clients" chips** on staff pages with zero activity.

**Tier 3 — nice-to-have:**
11. **Dark mode toggle.**
12. **Click-to-toggle series visibility** on the Hours by Staff legend.
13. **"Last updated X minutes ago" timestamp** in the dashboard header.

---

*Last updated: May 29, 2026 (end of Session 21).*

---

# Session 22 — Sat May 30, 2026 (Evening)
**ABA Management Software: Jenny-Readiness Sprint + Vercel Build Fixes**

Session ran ~9 PM PT. Picked up after the main daytime session (see `2026-05-29-bi-weekly-review-and-automation-rebuild.md` for the full day's log including Stock Analyst AI, MLB, and ABA Phase 4 write path).

---

## What Was Built This Evening

### 1. Staff Auto-Link on Join (close the last Phase 4 gap)
- `joinPractice` now accepts a `displayName` parameter and auto-creates a `staff` row with `user_id`, `full_name`, and default role/team
- `CreatePracticePage.tsx` join form: added "Your name" input (required before Join enables)
- Owner create-practice flow: added "Your name" field + Step 3 staff row insert — owners now get a staff row automatically, same as joining staff
- **Why it matters:** `getStaffByUserId` returns the staff PK; `sessions.staff_id` is a FK to `staff.id`. Without this, `createSession` would insert the auth user ID as `staff_id`, breaking the sessions join and the TodaySessionsTile scoping filter.

### 2. `createSession` Staff ID Bug Fix
- `handleStartSession` in `ClientOverviewPage` was passing `staffId: user.id` (auth UUID) to `createSession`
- Fixed to call `getStaffByUserId(user.id)` first and use the staff table PK
- Added user-facing error if no staff row found: "Your account isn't linked to a staff profile yet"

### 3. SOAP Notes Read View
- `supabase.ts`: added `SessionNoteRecord` interface + `getSessionNotesByClientId` (select from `session_notes` by `client_id`, ordered newest-first)
- `ClientOverviewPage`: new "Session Notes" card (Section 6) — BCBA/supervisor/owner only (`canViewNotes` gate)
- Expandable per-note rows (`SessionNoteRow` component): collapsed shows date + time; expanded shows S/O/A/P fields in labeled grid with `whitespace-pre-wrap`

### 4. Behaviors Pre-Definition UI
- `supabase.ts`: added `NewBehavior` interface + `createBehavior` function
- `ClientOverviewPage`: new "Behaviors" card (Section 5) listing pre-defined behaviors per client
- `NewBehaviorModal`: BCBA/owner only. Fields: name (required) + operational definition (optional). Same modal pattern as `NewGoalModal`. `behaviorsRefreshKey` triggers re-fetch on success.
- **Why it matters:** `SessionViewPage` pulls behaviors via `getBehaviorsByClientId` to populate the behavior recording UI. Without pre-defined behaviors, therapists have nothing to select during sessions.

### 5. Behavior Incidents Read View
- `supabase.ts`: added `BehaviorIncidentRecord` interface + `getBehaviorIncidentsByClientId` (joins `behaviors(name)` in one query)
- `ClientOverviewPage`: new "Behavior Incidents" card between Behaviors and Session Notes — same `canViewNotes` gate
- `BehaviorIncidentRow`: expandable rows. Collapsed: date + behavior name + color-coded intensity chip (red=high, amber=medium, slate=low). Expanded: antecedents + consequences (joined arrays), duration formatted as `Xm Ys`

### 6. Authorization Create/Edit UI
- `supabase.ts`: added `NewAuthorization` interface + `createAuthorization` (inserts with `used_units: 0`) + `updateAuthorization` (patch-only, never touches `used_units`)
- `ClientOverviewPage`: `NewAuthorizationModal` with pre-population from `existingAuth` when editing. Fields: total hours, start date, end date, CPT codes (comma-separated → array on save)
- Authorization card header: shows "Add Authorization" (+ icon) when no record exists, "Edit" button when one does — both BCBA/owner only
- `authRefreshKey` in `getAuthorizationsByClientId` dep array — save triggers live re-fetch of the utilization bar

---

## Supabase Write Helpers Added This Evening

| Function | Table | Notes |
|----------|-------|-------|
| `saveTrialResult` | `session_trials` | Fire-and-forget, silent fail |
| `updateGoalStatus` | `goals` | Fire-and-forget, silent fail |
| `submitSessionNote` | `session_notes` | Fire-and-forget, silent fail |
| `completeSession` | `sessions` | Fire-and-forget, silent fail |
| `saveBehaviorIncident` | `behavior_incidents` | Fire-and-forget, silent fail |
| `createSession` | `sessions` | Throws — caller owns error UX |
| `createNewClient` | `clients` | Throws |
| `createStaff` | `staff` | Throws |
| `createGoal` | `goals` | Throws |
| `createBehavior` | `behaviors` | Throws |
| `createAuthorization` | `authorizations` | Throws |
| `updateAuthorization` | `authorizations` | Throws |
| `joinPractice` | `practice_members` + `staff` | Throws — two inserts atomically |
| `getUserRole` | `practice_members` | Throws if no row |
| `getStaffByUserId` | `staff` | Returns null if no row |

---

## Vercel Build Fixes (4 rounds)

The build was clean locally (Vite/HMR) but failed on Vercel's strict `tsc -b` pass. Fixed across 3–4 push cycles:

| Error | Root Cause | Fix |
|-------|-----------|-----|
| `string \| null` not assignable to `string` on `Select value` props | Base UI `Select.Root.onValueChange` passes `string \| null`, not `string` (unlike Radix UI) | Added `?? ""` to all `value` props and `v ?? ""` to all `onValueChange` callbacks |
| `PromiseLike<void>` missing `catch`/`finally` | 5 fire-and-forget helpers used `.then()` on Supabase query builder which returns `PromiseLike` not `Promise` | Converted all 5 to `async/await` |
| `goalsRefreshKey` used before declaration | State declared after the `useEffect` that depended on it | Moved declaration before the goals `useEffect` |
| `startSessionId` / `nextSession` declared but never read | Unused variables left over from mock-data era | Removed both |
| `createClient` name collision | Helper shadowed Supabase's own named export from `@supabase/supabase-js` | Renamed helper to `createNewClient` throughout |

---

## Jenny-Readiness Checklist — Final State

| Item | Status |
|------|--------|
| Full write path (trials, SOAP, behavior incidents, goal status, session lifecycle) | ✅ |
| Session timer persistence across navigation (sessionStorage) | ✅ |
| Multi-user join flow + staff row auto-link | ✅ |
| Owner create-practice flow + owner staff row | ✅ |
| Add client / staff / goal / behavior modals (role-gated) | ✅ |
| Real role enforcement from DB (no mock toggle) | ✅ |
| Invite Your Team card with join code (owner only) | ✅ |
| Team filter persists in URL (`?team=`) | ✅ |
| TodaySessionsTile scoped to current staff member (Technician role) | ✅ |
| SOAP notes read view (BCBA/supervisor/owner) | ✅ |
| Behavior incidents read view (BCBA/supervisor/owner) | ✅ |
| Behaviors pre-definition UI | ✅ |
| Authorization create/edit UI (BCBA/owner) | ✅ |
| Notes Overdue tile refreshes after session submit | ✅ |
| `createSession` staff ID bug fixed | ✅ |
| Live on Vercel (build green) | ✅ |

---

## One Remaining Non-Code Step

Before Jenny's existing seeded staff can start sessions, run in Supabase production:

```sql
alter table staff add column if not exists user_id uuid references auth.users(id);
-- Then for each existing staff member:
update staff set user_id = '<auth-user-uuid>' where full_name = 'Staff Name';
```

New accounts (create or join flow) auto-populate `user_id` going forward.

---

## Repo
`https://github.com/andrewjeehonglee/aba-management-software` — all commits on `main`, deployed to `aba-management-software.vercel.app`

---

*Last updated: May 30, 2026 (end of Session 22).*

---

## Session 23 — Owner role-view toggle + join-with-role (Jun 1, 2026)

### What landed

#### 1. `AuthPage.tsx` — signUp() confirmed clean
Checked `supabase.auth.signUp()` for a `emailRedirectTo` option pointing to localhost. The call only passes `{ email, password }` — no redirect option present. No change needed.

#### 2. Owner-only role-view toggle restored on dashboard header (`DashboardPage.tsx`)

The Phase 2 segmented role toggle was removed in Session 22 when real DB role enforcement was added. Tonight it came back — but scoped correctly so real enforcement stays intact.

**How it works:**
- `role` = real normalized role from `practice_members` (lowercase DB value → Title Case). Used only to decide who sees the toggle and whether to show the Invite card.
- `viewRole` = new local `useState<Role>` — starts equal to `role` after the first async DB load, then owners can change it freely.
- A `useRef` (`roleSettled`) ensures the first DB-load sync wins, but subsequent owner toggle selections are not overwritten by re-renders.
- All tile gating (`canSee(viewRole)`), team defaults (`ROLE_DEFAULT_TEAM[viewRole]`), and session scoping (`viewRole === "Technician"`) drive off `viewRole`.

**UI:**
- Owners → segmented pill control: `Owner | BCBA | Supervisor | Technician` (rounded-full border, active segment gets `bg-background shadow-sm`)
- Non-owners → unchanged read-only muted pill badge showing their real role

**Real enforcement untouched:** `ClientOverviewPage` gates (`canViewNotes`, `canAddGoal`, etc.) still read from `practiceMembership.role` (live DB value). The toggle is purely a local dashboard-view concern.

**Files changed:** `src/pages/DashboardPage.tsx`
**Commit:** `4b12459` — *Restore owner-only role view toggle on dashboard header*

---

#### 3. Role selector added to "Join a practice" card (`CreatePracticePage.tsx` + `supabase.ts`)

Previously every user who joined via join code was inserted as `'technician'` regardless. Now the joining user picks their role.

**`CreatePracticePage.tsx`:**
- Imported shadcn `Select` / `SelectContent` / `SelectItem` / `SelectTrigger` / `SelectValue`
- Added `joinRole` state defaulting to `"Technician"`
- New labeled `Select` field between "Your name" and "Join code" in the Join card. Options: Owner, BCBA, Supervisor, Technician
- `handleJoin` passes `joinRole` as the fourth argument to `joinPractice()`

**`supabase.ts` — `joinPractice` signature change:**

```ts
// Before
export async function joinPractice(userId: string, joinCode: string, displayName: string): Promise<void>

// After
export async function joinPractice(userId: string, joinCode: string, displayName: string, role: string = 'technician'): Promise<void>
```

- `role` defaults to `'technician'` so any existing callers without the argument continue to work
- Inserted value uses `role.toLowerCase()` to match DB convention (all-lowercase membership roles)

**Files changed:** `src/pages/CreatePracticePage.tsx`, `src/lib/supabase.ts`
**Commit:** `19fd79a` — *Add role selector to Join a Practice card; pass role into joinPractice()*

---

### Updated checklist

| Item | Status |
|------|--------|
| Full write path (trials, SOAP, behavior incidents, goal status, session lifecycle) | ✅ |
| Session timer persistence across navigation (sessionStorage) | ✅ |
| Multi-user join flow + staff row auto-link | ✅ |
| Owner create-practice flow + owner staff row | ✅ |
| Add client / staff / goal / behavior modals (role-gated) | ✅ |
| Real role enforcement from DB | ✅ |
| Owner-only role-view toggle (preview dashboard as any role) | ✅ |
| Joining user selects their own role (Owner/BCBA/Supervisor/Technician) | ✅ |
| Invite Your Team card with join code (owner only) | ✅ |
| Team filter persists in URL (`?team=`) | ✅ |
| TodaySessionsTile scoped to current staff member (Technician view) | ✅ |
| SOAP notes read view (BCBA/supervisor/owner) | ✅ |
| Behavior incidents read view (BCBA/supervisor/owner) | ✅ |
| Behaviors pre-definition UI | ✅ |
| Authorization create/edit UI (BCBA/owner) | ✅ |
| Notes Overdue tile refreshes after session submit | ✅ |
| Live on Vercel (build green) | ✅ |

---

*Last updated: Jun 1, 2026 (end of Session 23).*

---

## Session 24 — Session-token refresh fix + practice-lookup error handling (Jun 1, 2026)

### The reported bug

Users were getting **randomly logged out, roughly on a timer** — not on every action. Symptom pointed at session token refresh: the JWT was expiring/refreshing on a schedule and something in the auth gate was bouncing the user back to the login page when it shouldn't.

### What landed

#### 1. Explicit Supabase auth config (`src/lib/supabase.ts`)

The client was created with **no `auth` options at all** (`createClient(url, key)`). Relying on defaults left session persistence and token refresh ambiguous. Made it explicit:

```ts
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
})
```

`storage` is guarded behind a `window` check so non-browser/SSR contexts don't throw; in the browser it resolves to `localStorage`.

#### 2. Event-aware `onAuthStateChange` (`src/App.tsx`) — the real bug

The auth gate is purely `if (!session) return <AuthPage />`, and the old handler called `setSession(session)` for **every** event. Two failure modes:
- A transient **null** session payload during a refresh cycle instantly bounced the user to login.
- Every `TOKEN_REFRESHED` (fires on a timer — matches the symptom) re-ran `checkPractice` → `getUserPractice`, whose 8-second timeout returned `null` on a slow query and dropped the user onto onboarding.

New handler logic:
- **Only `SIGNED_OUT`** clears session/practice/staff and routes to `AuthPage`.
- A `null` session on any other event is **ignored** (keep current session) — covers the transient-refresh case.
- A valid session payload is always applied via `setSession` (carries freshly rotated tokens) → session persists across refreshes.
- `TOKEN_REFRESHED` / `USER_UPDATED` **no longer re-run** `checkPractice`, so routine refreshes never hit the timeout query path.

#### 3. `PracticeLookupError` — distinguish "no practice" from "couldn't check" (`src/lib/supabase.ts` + `src/App.tsx`)

`getUserPractice` previously swallowed query errors **and** timeouts into `null`, identical to a genuine zero-row result — so a slow/failed query made a real member look practice-less and dumped them on onboarding.

- Added exported `PracticeLookupError` class.
- `getUserPractice` now **throws** `PracticeLookupError` on query error or timeout, and returns `null` **only** on a genuine zero-row success.
- The **join-code lookup** in `joinPractice` now logs and throws `PracticeLookupError` on a query/RLS failure, while keeping the friendly `"No practice found with that code"` message strictly for the genuine zero-row case.
- `App.checkPractice` wraps the call in `try/catch`: on success it sets practice (null = truly no practice yet); on throw it sets a visible `practiceError` and **keeps** any existing practice instead of bouncing to onboarding.
- Added a **retryable error screen** in `App.tsx` that renders on a lookup failure (between the session check and the onboarding check), with a "Try again" button that re-runs `checkPractice`.

Verified the other `getUserPractice` call sites (`ClientOverviewPage`, `SessionViewPage`) already wrap in `try/catch` or `.catch(() => {})`, so the new throwing behavior is safe.

**Commit:** `6c9de6b` — *fix: persist session across token refresh and distinguish practice lookup failures*

#### 4. Vercel TS build fix — join-role `Select` null coalesce (`src/pages/CreatePracticePage.tsx`)

Base UI `Select` passes `string | null` to `onValueChange`, but `setJoinRole` expects `string`. Applied the same pattern used in the May 30 build fix for other Selects:

```tsx
<Select value={joinRole} onValueChange={(v) => setJoinRole(v ?? 'Technician')} disabled={joinLoading}>
```

Grepped the file — this was the only `onValueChange` handler, no second instance.

**Commit:** `543e0f4` — *fix: coalesce null in join-role Select onValueChange to satisfy Vercel TS check*

### Files changed
- `src/lib/supabase.ts` — explicit auth config; `PracticeLookupError`; throwing `getUserPractice`; join-code lookup error handling
- `src/App.tsx` — event-aware `onAuthStateChange`; `checkPractice` error handling; retryable practice-lookup error screen
- `src/pages/CreatePracticePage.tsx` — join-role `Select` null coalesce

### Commits (both pushed to `main`)
- `543e0f4` — join-role Select TS fix
- `6c9de6b` — session refresh persistence + practice-lookup error handling

### Follow-up — CLOSED
- ~~Confirm the `practice_members` SELECT RLS policy is in place in production so the 8s timeout path is genuinely rare.~~ **Verified clean (Jun 1, 2026):** two SELECT policies, both scoped to `user_id = auth.uid()` — each user can only read their own membership row, which is exactly right. There is **no policy gap**, so the `getUserPractice` 8-second timeout path will not be triggered by missing/blocking RLS. (The timeout remains as a safety net for genuine network stalls.)

---

*Last updated: Jun 3, 2026 (end of Session 27).*

---

## Session 25 — Demo mode fixes (Jun 3, 2026)

**What landed:** Four targeted fixes to the demo account experience.

### Fix 1 — Role toggle restored in demo mode
`DashboardPage.tsx` had an `isDemo ? <Create your practice button>` branch in the header that replaced the role toggle for demo users. Removed it. The demo banner (amber top bar) already carries the "Create your free account →" CTA, so the upsell path was duplicated and the role toggle was lost.

### Fix 2 — Owner role not resolving (root cause: `roleSettled` ref)
**Bug:** `Hours by Staff`, `Auth Utilization`, and `Adoption Health` tiles were hidden in the demo. Root cause: `canSee("Technician")` was returning `false` for all three because `viewRole` was stuck on `"Technician"` even though the demo user is an Owner.

**Why it happened:** `App.tsx` initialises `userRole` state as `"technician"` (the default), then fires `getUserRole()` async. `DashboardPage` had a `roleSettled` ref that ran `setViewRole(role)` only on the _first_ effect execution — which happened with the default `"technician"` value, before the DB call resolved. When `"owner"` arrived from the DB, `roleSettled.current` was already `true` so the update was silently dropped.

**Fix:** Removed the `roleSettled` ref entirely. The effect now unconditionally syncs `viewRole` to `role` on every `userRole` prop change. Safe to do because `userRole` only changes on auth events (not on Owner view-toggles), so manual toggles are never overwritten.

Added `console.log('[DashboardPage] userRole prop:', userRole, '→ role:', role)` for live debugging.

### Fix 3 — Today's Sessions diagnostic logging
Added `console.log` to `getSessionsToday()` in `supabase.ts` printing the UTC start/end boundaries and the raw Supabase row count before any JS-side filtering. This was partly auto-fixed by Fix 2 (staffId filter was being applied in Technician view, excluding all sessions not assigned to the demo staff member), but the log remains for future debugging.

### Fix 4 — Client link (already correct)
Audited `TodaySessionsTile.tsx` line 172 — link uses `s.clientId` (UUID), not a slug. No change needed.

### Files changed
- `src/pages/DashboardPage.tsx` — removed `roleSettled` ref; removed isDemo header CTA branch; added role console.log
- `src/lib/supabase.ts` — added UTC boundary + row count console.log to `getSessionsToday`

### Commits
- `65c8ab0` — *Fix demo mode: role toggle, role sync timing, session diagnostics*

---

## Session 26 — Block 7 final: design upgrade (Jun 3, 2026)

**What landed:** Six design steps completing the Pulse visual upgrade. Zero TypeScript errors. Two new components, two redesigned components, full dashboard grid restructure.

### Step A — Brand color short aliases
Added `--color-pulse-medium`, `--color-pulse-light`, `--color-pulse-text`, `--color-pulse-muted` as short aliases in `index.css` `@theme inline` alongside the existing long-form names. Both naming conventions now work (e.g., `bg-pulse-medium` and `bg-pulse-primary-medium` are equivalent).

### Step B — Dashboard header polish
Changed `border-slate-100` → `border-slate-200` and added `shadow-sm` to the header so it lifts cleanly above the `bg-[#F0F4F4]` page surface.

### Step C — PracticeHeroTile (the hero/WOW element)
New full-width tile at the top of the dashboard.

**Left 60%:** Recharts `AreaChart` showing session counts per day for the last 14 days. Teal gradient fill (`#14A0A5` at 40% → transparent). `#0D7377` stroke, 2px. Today's data point renders with a larger dot + outer glow ring via a custom `ChartDot` component. X-axis shows single day-letter labels (M T W T F S S). No Y-axis — just the shape of the curve.

**Right 40%:** 2×2 grid of stat bubbles on `bg-[#E8F7F7]` rounded tiles:
- Sessions This Week
- Completion Rate (color-coded: emerald ≥80%, amber ≥60%, red <60%)
- Staff Active This Week
- Active Clients

New data functions in `supabase.ts`:
- `getSessionsLast14Days()` — queries sessions, groups by `scheduled_at` date, pre-fills all 14 days with 0 for a continuous chart
- `getPracticeHeroStats()` — calls `getAdoptionHealthStats` + `getSessionsLast14Days` + active client count in parallel; returns `{ sessionsThisWeek, completionRate, staffOnTrack, activeClients, dailySessions }`

New component: `src/components/PracticeHeroTile.tsx`

### Step C (cont.) — AdoptionHealthBanner
Replaced the old full-card `AdoptionHealthTile` in Row 4 with a new slim banner component (`AdoptionHealthBanner.tsx`). Renders as a single `rounded-xl border` flex row: `Activity` icon + "Adoption Health" label + "X/Y staff active" + "Z% completion rate" + "View overdue notes ↓" link. Owner-only.

New component: `src/components/AdoptionHealthBanner.tsx`

### Step D — Supervision pills (replaced mini-bars)
`SupervisionComplianceTile.tsx`: removed the `MiniBar` component and the horizontal bar list entirely. Replaced with a `flex flex-wrap gap-2` grid of pill chips — one per RBT:
- `h-14 w-[4.75rem]` rounded-xl chip
- First name truncated, compliance % below it
- Red border + red-50 background if below threshold; teal border + teal-light background if passing
- Hover tooltip shows full name
- Two red chips pop out immediately at a glance

Removed unused `complianceClasses` import (MiniBar was its only consumer).

### Step E — Dashboard grid restructure
New layout in `DashboardPage.tsx`:
- **Row 1 (full width):** `PracticeHeroTile`
- **Row 2 (3 cols):** `NotesOverdueTile` | `SupervisionComplianceTile` | `AuthorizationUtilizationTile`
- **Row 3 (2 cols):** `TodaySessionsTile` | `HoursByStaffTile`
- **Row 4 (full width, Owner only):** `AdoptionHealthBanner`

`ClientsListTile` removed from the dashboard. Clients are accessible by clicking any client name in Today's Sessions (UUID-based routing). Removed the team invite card as well to reduce clutter.

Removed unused `Card/CardContent/CardHeader/CardTitle` and `ClientsListTile` imports.

### Step F — Today's Sessions card list (replaced table)
`TodaySessionsTile.tsx`: replaced the dense `<table>`-style grid with a card list. Each session is a `rounded-lg border border-l-4` card with a left border color that communicates status instantly:
- Emerald (`border-l-emerald-500`) — completed
- Blue (`border-l-blue-500`) — in-progress
- Amber (`border-l-amber-400`) — scheduled
- Red (`border-l-red-400`) — no-show / cancelled

Each card shows: time (mono font) | client name (linked to `/clients/:uuid`) | staff name | session type (hidden on mobile) | status badge.

### Files changed
- `src/index.css` — short alias color tokens
- `src/lib/supabase.ts` — `DailySessionCount`, `PracticeHeroStats` interfaces; `getSessionsLast14Days()`, `getPracticeHeroStats()` functions
- `src/components/PracticeHeroTile.tsx` — **new**
- `src/components/AdoptionHealthBanner.tsx` — **new**
- `src/components/SupervisionComplianceTile.tsx` — pill chips, removed MiniBar
- `src/components/TodaySessionsTile.tsx` — card list
- `src/pages/DashboardPage.tsx` — grid restructure, import cleanup

### Commits
- `b6d32ab` — *Block 7 final: PracticeHeroTile, supervision pills, session cards, new grid layout*
- `f47138c` — *Fix TS2322: remove explicit number type on Tooltip formatter value param* (Recharts `Tooltip` types `formatter` first arg as `ValueType | undefined`; explicit `number` caused Vercel build failure)

---

## Session 27 — Public Landing Page, Routing Overhaul, and Data Fixes

*Date: Jun 4, 2026*

### Goal
Ship a public-facing landing page at `/` for unauthenticated visitors, wire clean routing for the full sign-in / sign-up / demo funnel, and fix two silent data bugs in the live demo (team filter mismatch + missing today's sessions).

---

### Step A — Landing page (`src/pages/LandingPage.tsx`) — new file

Full marketing page at the unauthenticated `/` route. Sections in order:

**Nav** — Pulse wordmark (text-xl font-bold, pulse-primary) + single "Get started" CTA button (→ `/signup`). No "Log in" in nav — keeps the front door clean.

**Hero** — `text-5xl md:whitespace-nowrap` headline: "Keep your ABA practice connected." One CTA: "Get started" → `/signup`. Subhead: "One platform for your whole team, so you can focus on your clients." (`text-xl text-pulse-text/80 text-balance`).

**Problem section** (`bg-pulse-surface`) — Heading: "In ABA, up to 1 in 3 claims gets denied." Three icon blocks in a `md:grid-cols-3` grid, each with a BellRing / ClipboardList / Clock icon, a `text-lg font-semibold` title, a `font-semibold` punch line, and a `text-sm text-pulse-muted` detail line:
- "An authorization lapsed" — "You already delivered the hours. Now they are unbillable." — detail on renewal/denial mechanics
- "A note was incomplete" — "One missing signature voids the whole claim." — detail on payer rejection criteria
- "Nobody caught it in time" — "You find out weeks later, when the denial lands." — detail on appeal window

**Bridge / punchline** (white section, `py-10`) — `text-4xl font-bold`, `md:whitespace-nowrap`: "Pulse catches all three `<span class="text-pulse-primary">before the claim does</span>`"

**Feature cards** — Heading: "How Pulse catches each one." Three `Card` components with `border-l-4 border-l-pulse-primary` left accent, `p-8`, `text-xl font-semibold` titles, `text-base leading-snug` bodies:
1. "Authorization tracking, always current" — expiring auths surface on dashboard before lapsed hours get booked
2. "Documentation that closes before you leave" — notes, behavior data, billing code in one flow before session closes
3. "Everyone sees what they need to act on" — every role sees open items at login, never buried in a spreadsheet

**Demo CTA band** (`bg-pulse-primary`) — Heading: "See it for yourself." Button: "Try the demo" — calls `supabase.auth.signInWithPassword` with demo credentials directly; on success, `App.tsx`'s `onAuthStateChange` SIGNED_IN event takes over and navigates to dashboard.

**Footer** — "Pulse · Built by Andrew Lee" + greyed "Privacy" placeholder (no navigation).

Design notes: `bg-gradient-to-b from-slate-50 to-white` outer wrapper. All CTAs use `buttonVariants()` on `<Link>` elements (not `asChild`, which doesn't exist on this project's `@base-ui/react` Button). Section vertical padding tightened globally: hero `py-12 md:py-16`, problem `py-12`, bridge `py-10`, features `py-12`.

---

### Step B — Routing overhaul (`src/App.tsx`)

**Before:** `if (!session) return <AuthPage />` — single component, no routes, no URL differentiation.

**After — unauthenticated block:**
```tsx
<Routes>
  <Route path="/"       element={<LandingPage />} />
  <Route path="/login"  element={<AuthPage mode="login" />} />
  <Route path="/signup" element={<AuthPage mode="signup" />} />
  <Route path="*"       element={<Navigate to="/" replace />} />
</Routes>
```

**After — authenticated block:** added `<Route path="*" element={<Navigate to="/" replace />} />` to the existing authenticated Routes. Critical bug fix: without this, a user signing in from `/login` or `/signup` stays on that URL while authenticated, no route matches, blank screen.

Both wildcard catches (`*`) ensure no URL ever reaches a dead end.

---

### Step C — AuthPage (`src/pages/AuthPage.tsx`)

- Added `mode?: "login" | "signup"` prop (defaults to `"login"`)
- Heading adapts: "Welcome back" / "Sign in to your practice" for login; "Create your account" / "Start your free Pulse practice" for signup
- Primary button swaps: Sign In is primary for login mode, Sign Up is primary for signup mode
- Added "← Back to home" `<Link to="/">` at top of right panel (ArrowLeft icon from lucide-react)
- Removed local `DashboardMockup` function — replaced with import from shared component (see Step D)

---

### Step D — Shared `DashboardMockup` component (`src/components/DashboardMockup.tsx`) — new file

Extracted `DashboardMockup` from `AuthPage.tsx` into a shared component with a `size` prop:

- `size="sm"` (default) — compact white-on-teal mockup used in AuthPage left panel (visually identical to the old local function)
- `size="lg"` — richer mockup used in the landing page hero (later removed from hero in favor of typography-only). Includes: teal app header with "Owner" role badge, labeled KPI cards (28 sessions / 2 overdue / 91% supervision), teal bar chart with day labels, authorization utilization bar, today's sessions list with Complete / In Progress / Scheduled status chips

`AuthPage.tsx` now imports from `@/components/DashboardMockup`. `size="lg"` is available for future reuse.

---

### Step E — Dashboard sign-out button (`src/pages/DashboardPage.tsx`)

The existing sign-out button was wrapped in `{!isDemo && (...)}` — invisible in demo mode. Removed the guard. Button is now always visible (`variant="ghost" size="sm" className="text-pulse-muted hover:text-pulse-text"`), for demo and real accounts alike. The DemoBanner "Create your free account →" button also still works for demo sign-out; the header button is the second path out.

---

### Step F — Build fix: `asChild` not available on `@base-ui/react` Button

Vercel build failed:
```
error TS2322: Property 'asChild' does not exist on type '...'
```

Root cause: this project's shadcn uses `@base-ui/react/button`, not Radix UI. `asChild` is a Radix pattern and doesn't exist here.

Fix: replaced all `<Button asChild><Link>...</Link></Button>` patterns in `LandingPage.tsx` with:
```tsx
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

<Link to="/signup" className={cn(buttonVariants({ size: "lg" }), "bg-pulse-primary ...")}>
  Get started
</Link>
```
Visually identical; TypeScript-correct.

---

### Step G — Data fix: team filter mismatch (`src/lib/supabase.ts`)

**Root cause:** The DB stores team as bare letters (`'A'`, `'B'`, `'C'`). The dashboard's team filter chips and `ROLE_DEFAULT_TEAM` in `src/types/team.ts` compare against `"Team A"` / `"Team B"` / `"Team C"`. The string comparison `'A' === "Team A"` is always false, so toggling any team filter other than "All" blanked every tile.

**Fix:** Added a `teamLabel()` normalizer at the top of `supabase.ts`:
```ts
function teamLabel(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw.startsWith('Team') ? raw : `Team ${raw}`
}
```

Applied to all 9 mapper sites that previously returned raw `.team` values:
- `getStaff()` → `team: teamLabel(row.team)`
- `getSessionsToday()`, `getSessionsByClientId()`, `getSessionsByStaffId()` → `staffTeam: teamLabel(row.staff.team)`
- `getAuthorizations()`, `getAuthorizationsByClientId()` → `clientTeam: teamLabel(row.clients.team)`
- `getSupervisionCompliance()`, `getSupervisionByStaffId()` → `staffTeam: teamLabel(row.staff.team)`
- `getOverdueNotes()` → `staffTeam: teamLabel(row.staff.team)`

Already-normalised values (e.g. "Team A" from the add-staff form) pass through unchanged. No DB migration needed.

---

### Step H — Data fix: today's sessions dated wrong + 6 staff with no today entry

**Root cause:** `getSessionsToday()` queries using real `new Date()`. All seeded "today" sessions were timestamped `2026-06-03`. As of Jun 4, the dashboard showed 0 sessions today, and 6 staff (Sarah Chen, David Kim, Rachel Lee, Kevin Martinez, Jennifer Nguyen, Laura Chen) had no Jun 4 entry, so their profile pages hit the empty "No session activity" state.

**Fix — SQL patch (`patch_sessions_jun4.sql`):** Run once in the Supabase SQL Editor.
- `UPDATE` 8 existing sessions from `2026-06-03T*` → `2026-06-04T*`
- `INSERT` 6 new sessions on Jun 4 (one per missing staff, with realistic session types and statuses) using UUIDs `30000000-...-000000000071` through `000000000076`

**Fix — seed file (`seed_coastal_aba.sql`):** Updated "today's sessions" block to use Jun 4 timestamps and include all 14 session rows (8 original + 6 new), so future re-seeds are correct from the start.

---

### Files changed

| File | Change |
|------|--------|
| `src/pages/LandingPage.tsx` | **new** — full public landing page |
| `src/components/DashboardMockup.tsx` | **new** — shared sm/lg mockup component |
| `src/App.tsx` | Unauthenticated routes block; authenticated wildcard fix |
| `src/pages/AuthPage.tsx` | `mode` prop, back-to-home link, import shared DashboardMockup |
| `src/pages/DashboardPage.tsx` | Sign-out button always visible (removed `!isDemo` guard) |
| `src/lib/supabase.ts` | `teamLabel()` helper; applied to 9 mapper sites |
| `seed_coastal_aba.sql` | Today's sessions updated to Jun 4 + 6 new staff rows |
| `patch_sessions_jun4.sql` | **new** — one-time SQL to fix live DB dates + add missing sessions |

### Commits
- `3482cae` — *Add public landing page with full unauthenticated routing*
- `42a8f47` — *Fix build: replace asChild Button with buttonVariants on Link elements*
- `2ae84c4` — *Fix team filter mismatch and seed today sessions for all 11 staff*

### Deployment
All three commits pushed to `main` → auto-deployed to Vercel at https://aba-management-software.vercel.app

**Pending manual step:** Run `patch_sessions_jun4.sql` in the Supabase SQL Editor to fix the live demo DB (date shift + 6 missing-staff sessions).

---

*Last updated: Jun 4, 2026 (end of Session 27).*
