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

## What's NOT done yet (next sessions, suggested order)

**Phase 2 — remaining product builds:**
1. **Session View (Screen 2)** — the largest remaining build. Per-session detail page (clinical notes, data collection grid per goal, timer, billing fields). Reachable from any session row across the app. This is where most of the daily clinical work actually happens.
2. **Calendar on Client Overview** — weekly/monthly view of past + upcoming sessions for a client. Today the Sessions card is a flat list; the calendar adds shape to "what's their schedule actually look like."
3. **RBAC role-toggle** — surface a dev-only role switcher (Owner / BCBA / RBT / Front-desk) that changes which tiles + actions are visible. Today every visitor sees everything; real ABA orgs need scoped views.
4. **Real data hookup** — replace each `mockX` import with API calls. Introduces `useEffect`, `fetch`, loading/error/empty states. Every tile and page is already shaped to a future API response, so this is mostly plumbing.

**Tier 2 — polish backlog (waiting for next user-feedback round):**
5. **Sort dropdown labels are wider than they need to be** — trim padding or use a more compact Select variant; the truncation is small but visible at desktop width.
6. **Status badges in Today's Sessions aren't uniform width** — should pad to the widest label so the right edge of the column is a clean line.
7. **Editorial sub-lines** — replace structural sub-lines like "across 7 staff" with editorial ones like "5 notes are 7+ days old" once we have the underlying timestamp data.
8. **Hover tooltips on mini-bars** in Supervision + Auth — show the exact % on hover instead of relying on the right-aligned number.
9. **Hide the "0 sessions / 0 clients" chips on staff pages with no activity** — they're slightly redundant with the collapsed empty-state notice. Two-line edit when it bothers someone.

**Tier 3 — nice-to-have:**
10. **Dark mode toggle** — small win, surfaces all the design-token work shadcn did silently.
11. **Click-to-toggle series visibility on the Hours by Staff legend** — ~15 lines of useState.
12. **"Last updated 2 minutes ago" timestamp** in the header — useful once data is live.
13. **Stable demo "today" reference** — `CertificationsExpiringTile` uses `new Date()` at module load. Swap for a fixed date constant when the demo audience matters more than real-time accuracy.

---

*Last updated: May 13, 2026 (end of Session 10).*
