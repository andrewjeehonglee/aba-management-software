# Session log — Wed Jun 10, 2026 (afternoon)

**Practice:** Demo `a1b2c3d4-0000-0000-0000-000000000001` · SPG `c3d4e5f6-5047-4000-8000-533047000001`  
**Source of truth:** `templates/roster_import.csv`  
**Demo login:** `demo@pulseaba.app`  
**Live app:** https://aba-management-software.vercel.app  

---

## What we set out to do

Phase **7g** — full Jenny roster parity, legacy demo purge, all 14 staff + 16 client profile pages, roster-only enforcement across the app.

Mid-session pivot: stop band-aiding globally; **prove Jennifer’s BCBA caseload end-to-end first** (8 clients, 4 supervisors, 5 BTs), then replicate for Blair/Annie.

---

## Git commits pushed this afternoon (main)

| Commit | Summary |
|--------|---------|
| `690471c` | **#7g** — Roster-only enforcement: `rosterScope`, legacy isolation migration, verify script, roster directories, 16 client + 14 staff routes |
| `1f7fa14` | **Jennifer BCBA visibility** — full team on dashboard tiles, `BcbaCaseloadPanel`, auth links by `PeLe` code, `seed_jennifer_caseload_visibility.sql` |
| `e075ad0` | **Staff page fix** — null `team` crash on roster staff; client links use `external_code` |

Prior (same phase, earlier): `ed728b0` (#7f), `ed33ce8` (#7e).

---

## Supabase — what Andrew ran

1. `npm run import:roster -- --all`
2. `migration_20260612_roster_only_legacy_isolation.sql` — adds `staff.status`, deactivates non-roster staff/clients
3. Optional assignment cleanup (deactivate legacy `client_assignments` pointing at inactive staff/clients)
4. `seed_jennifer_caseload_visibility.sql` — June sessions/notes for Enny/Daniel/Emaya, supervisor sessions, supervision rows for 5 BTs

**Verification query lesson:** Count assignments **roster clients only**:

```sql
SELECT ca.assignment_role, COUNT(*)
FROM client_assignments ca
JOIN clients c ON c.id = ca.client_id
WHERE c.practice_id = 'a1b2c3d4-0000-0000-0000-000000000001'
  AND c.external_code IS NOT NULL AND c.status = 'active'
  AND ca.is_active = true
GROUP BY ca.assignment_role;
-- Expect: primary_bcba=16, clinical_supervisor=16, primary_bt=11
```

Unscoped query (all clients incl. legacy) showed 28/24/23 — expected before legacy assignment cleanup.

CLI: `npm run verify:roster` (needs `SUPABASE_SERVICE_ROLE_KEY` in `.env`).

---

## Jennifer roster (canonical)

| Role | Names |
|------|--------|
| BCBA | Jennifer |
| Supervisors | Hilary, AJ, Bryanna, Madeline |
| BTs | Jazmine, Enny, Emaya, Daniel, Lisa |
| Clients (8) | PeLe, BrTu, Ells, AlLo, LiBo, IsRi, CoTa, LoEl |

External codes: `SPG-BCBA-jennifer`, `SPG-SUP-hilary`, `SPG-BT-jazmine`, client codes `PeLe`, etc.

---

## Verified working on demo (screenshots, post-deploy ~1f7fa14)

**Owner → BCBA → Jennifer:**

- Calendar with supervisees — 8 client codes, BT sessions visible
- **Jennifer's caseload** panel — 8 clients, 4 supervisors, 5 BTs (all clickable)
- **Session Notes** — 9 on caseload (4 sup + 5 BT); Jazmine has gaps; others 0 gaps
- **Hours by Staff** — Enny, Jazmine, Lisa, Daniel, Emaya, AJ (+ scroll for rest)
- **Authorization Utilization** — 8 clients with `PeLe`-style labels
- **Supervision Compliance** — 5 BTs (Enny/Jazmine flagged below threshold)

**Still broken at that moment:** Clicking any staff name → empty / "Staff member not found" (fixed in `e075ad0`, redeploy pending).

**Owner dashboard:** Auth tile had linked UUIDs → blank client page; fixed to link only when `external_code` present (`/clients/PeLe`).

---

## Root causes we hit (for strategy change)

1. **Legacy + roster coexisting** — Coastal demo rows and assignments inflated counts; UI filters helped but DB still had noise until deactivation + assignment cleanup.
2. **BCBA tiles scoped to BT supervisees only** — supervisors invisible on Notes/Hours; fixed with `teamStaffIds` (supervisors + BTs).
3. **Tiles only showed staff with activity** — zero-hour / zero-gap staff hidden; fixed with `includeCaseloadStaff` / `includeZeroHourStaff`.
4. **Staff profile crash** — roster import sets `team = null`; `StaffOverviewPage` called `.startsWith()` on null → every roster staff page failed.
5. **URL strategy mixed** — UUID vs `PeLe` vs slug; standardizing on `external_code` for links, UUID still supported on resolve.
6. **Deploy lag** — Vercel needed redeploy after each push; user validated on live site, not just local build.

---

## Key files touched (7g + Jennifer afternoon)

| Area | Files |
|------|--------|
| Roster scope / routes | `src/lib/rosterScope.ts` |
| Dashboard scope | `src/lib/dashboardScope.ts`, `src/pages/DashboardPage.tsx` |
| Jennifer panel | `src/components/BcbaCaseloadPanel.tsx` |
| Tiles | `NotesOverdueTile`, `HoursByStaffTile`, `SupervisionComplianceTile`, `AuthorizationUtilizationTile` |
| Client page | `src/pages/ClientOverviewPage.tsx`, `src/lib/clientAssignments.ts` |
| Staff page | `src/pages/StaffOverviewPage.tsx` |
| SQL | `migration_20260612_roster_only_legacy_isolation.sql`, `seed_jennifer_caseload_visibility.sql` |
| Verify | `scripts/verify_roster_parity.mjs`, `templates/CHECKLIST.md` |

---

## Not done / deferred

- [ ] Confirm `e075ad0` on Vercel — all 9 staff profile pages load (Jazmine, Hilary, AJ, etc.)
- [ ] Confirm all 8 client pages load from caseload panel (`/clients/PeLe`)
- [ ] Blair + Annie caseload parity (same pattern as Jennifer)
- [ ] Supervisor/Technician preview tabs scoped to anchor BCBA when on Owner (Carmen/Valerie should not appear when Jennifer is anchor)
- [ ] `npm run verify:roster` PASS both practices (after migrations)
- [ ] Strategy rethink — see below

Untracked locally: `scripts/test-supervision.mjs` (not committed).

---

## Suggested strategy shift (for next session)

**Old:** Enforce roster-only everywhere + fix all 16 clients / 14 staff / 2 practices in one slice.

**Proposed:** **One BCBA vertical slice at a time.**

1. Pick BCBA (Jennifer ✓ in progress)
2. DB: import + legacy isolation + Jennifer seed only
3. App: dashboard + caseload panel + all staff/client pages for that caseload only
4. Demo sign-off checklist (screenshot + URL list)
5. Clone pattern → Blair (4 clients) → Annie (4 clients)
6. Only then Owner-wide / multi-BCBA roster view polish

This avoids chasing legacy UUIDs, wrong assignment counts, and partial tile scoping across the whole practice.

---

## Quick smoke checklist (after latest deploy)

| URL / action | Expected |
|--------------|----------|
| Owner → BCBA → Jennifer | Caseload panel 8+4+5 |
| `/staff/SPG-BT-jazmine` | Profile, caseload, June sessions |
| `/staff/SPG-SUP-hilary` | Profile loads (not blank) |
| `/clients/PeLe` | Care team Jennifer/Hilary/Jazmine |
| Owner → Auth → click PeLe | `/clients/PeLe` loads |

---

*End of session log. Resume from "Suggested strategy shift" + smoke checklist after deploy.*
