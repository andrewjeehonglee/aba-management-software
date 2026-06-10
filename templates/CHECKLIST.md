# Roster parity checklist (#7g)

Source of truth: `templates/roster_import.csv`

Practices: Demo `a1b2c3d4-0000-0000-0000-000000000001`, SPG `c3d4e5f6-5047-4000-8000-533047000001`

Run after `npm run import:roster -- --all` and `migration_20260612_roster_only_legacy_isolation.sql`.

| Entity | Expected | SQL check |
|--------|----------|-----------|
| Staff BCBA | 3 | `SELECT COUNT(*) FROM staff WHERE practice_id = '<id>' AND role = 'bcba' AND external_code IS NOT NULL AND status = 'active';` |
| Staff Supervisor | 5 | `SELECT COUNT(*) FROM staff WHERE practice_id = '<id>' AND role = 'supervisor' AND external_code IS NOT NULL AND status = 'active';` |
| Staff BT | 6 | `SELECT COUNT(*) FROM staff WHERE practice_id = '<id>' AND role = 'technician' AND external_code IS NOT NULL AND status = 'active';` |
| Staff total | 14 | Sum of above |
| Clients | 16 | `SELECT COUNT(*) FROM clients WHERE practice_id = '<id>' AND external_code IS NOT NULL AND status = 'active';` |
| Assignments primary_bcba | 16 | `SELECT COUNT(*) FROM client_assignments ca JOIN clients c ON c.id = ca.client_id WHERE c.practice_id = '<id>' AND ca.assignment_role = 'primary_bcba' AND ca.is_active;` |
| Assignments clinical_supervisor | 16 | Same with `assignment_role = 'clinical_supervisor'` |
| Assignments primary_bt | 11 | Same with `assignment_role = 'primary_bt'` (5 clients unassigned BT) |
| Legacy active staff | 0 | `SELECT COUNT(*) FROM staff WHERE practice_id = '<id>' AND external_code IS NULL AND status = 'active';` |
| Legacy active clients | 0 | `SELECT COUNT(*) FROM clients WHERE practice_id = '<id>' AND external_code IS NULL AND status = 'active';` |

Automated: `npm run verify:roster`

Browser smoke (demo@pulseaba.app):

| URL / view | Expected |
|------------|----------|
| Clients list | 16 codes (PeLe…) |
| `/clients/PeLe` | Jennifer / Hilary / Jazmine care team |
| `/clients/{legacy-uuid}` | Client not found |
| `/staff/SPG-BT-jazmine` | Caseload + sessions |
| `/staff/SPG-SUP-hilary` | Supervisor profile |
| Owner Hours | All 6 BTs visible |
| `/roster` | 16 client + 14 staff directory links |
