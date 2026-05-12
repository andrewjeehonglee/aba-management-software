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

## Project anatomy

```
src/
├── App.tsx                          ← Page shell — 12 lines, just lays out tiles
├── main.tsx                         ← React boot (don't touch)
├── index.css                        ← Tailwind import + shadcn design tokens
│
├── components/
│   ├── HoursByStaffTile.tsx         ← The whole tile (chart, sort, legend, flags)
│   └── ui/                          ← shadcn-generated primitives — DO NOT EDIT
│       ├── button.tsx
│       ├── card.tsx
│       ├── chart.tsx
│       └── select.tsx
│
├── data/
│   └── mockStaff.ts                 ← 13 mock staff records
│
├── lib/
│   ├── staff.ts                     ← isStaffFlagged() + DIRECT_HOURS_THRESHOLD
│   └── utils.ts                     ← shadcn's cn() helper
│
└── types/
    └── staff.ts                     ← Staff interface
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

1. **Build a second tile** — pick another metric from the Phase 1 plan. Reuse the patterns: type → mock data → tile component → chart.
2. **Wire to a real backend** — replace `mockStaff` with API data. Introduces `useEffect`, `fetch`, loading/error states.
3. **Add routing** — React Router for multiple pages (Dashboard / Staff / Settings).
4. **Add authentication** — log in / out, sessions.
5. **Add dark mode toggle** — small win, surfaces all the design-token work shadcn did silently.
6. **Optional polish on the existing tile** — click-to-toggle series visibility on the legend (would need ~15 lines of useState).

---

*Last updated: May 12, 2026 (end of Session 5).*
