# Roster import template

Jenny's caseload sheet maps one row per client. Each row is the canonical care-team unit:

**BCBA | Clinical Supervisor | BT | Client code**

## CSV format

File: `roster_import.csv`

| Column | Meaning |
|--------|---------|
| `client_code` | Stable client key (e.g. `PeLe`, `BrTu`) — stored in `clients.external_code` |
| `bcba_name` | Primary BCBA first name — creates/finds staff with role `bcba` |
| `clinical_supervisor_name` | Clinical supervisor first name — role `supervisor` |
| `primary_bt_name` | Primary BT first name — role `technician`. Use `x`, `X`, blank, `-`, or `—` when unassigned |
| `client_first_name` | Optional display name; defaults to `client_code` if blank |
| `client_last_name` | Optional; defaults to empty string |
| `location` | Optional; stored on `client_assignments` rows |

## Import behavior

- **Idempotent** — safe to re-run. Existing staff/clients match by `external_code` or normalized name + role. Assignments use `ON CONFLICT DO NOTHING`; inactive assignments are reactivated.
- **Practice-scoped** — every row is imported into one practice UUID. The same CSV can seed multiple practices (SPG pilot + Coastal demo).
- **No auth linking** — staff rows never receive `user_id`. Jennifer (BCBA) is not linked to Jenny Lee (practice owner).
- **Team column deprecated** — imported staff get `team = NULL`.

Staff auto-codes when not supplied: `SPG-BCBA-jennifer`, `SPG-SUP-hilary`, `SPG-BT-jazmine`.

## CLI import

Requires a **service role key** in `.env` (never commit this):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Bootstrap SQL first (`migration_20260610_social_play_group.sql`), then:

```bash
npm run import:roster -- --all
npm run import:roster -- --practice-id=c3d4e5f6-5047-4000-8000-533047000001
```

Practice IDs:

| Practice | UUID | Join code (first 8 chars) |
|----------|------|---------------------------|
| Social Play Group (pilot) | `c3d4e5f6-5047-4000-8000-533047000001` | `c3d4e5f6` |
| Coastal demo | `a1b2c3d4-0000-0000-0000-000000000001` | `a1b2c3d4` |

Expected assignment counts per practice after import: `primary_bcba=16`, `clinical_supervisor=16`, `primary_bt=11` (5 clients with unassigned BT).
