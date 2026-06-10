-- =============================================================================
-- Phase 7 Slice #7g — Roster-only legacy isolation (deactivate, do not delete)
-- Run in Supabase AFTER roster import on demo + SPG practices.
-- =============================================================================

-- 0a. staff.status column (if missing)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
UPDATE staff SET status = 'active' WHERE status IS NULL;

-- 0b. Deactivate ALL non-roster staff (both practices)
UPDATE staff
SET status = 'inactive'
WHERE external_code IS NULL
  AND practice_id IN (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'c3d4e5f6-5047-4000-8000-533047000001'
  );

-- 0c. Deactivate ALL non-roster clients (belt + suspenders)
UPDATE clients
SET status = 'inactive'
WHERE external_code IS NULL
  AND practice_id IN (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'c3d4e5f6-5047-4000-8000-533047000001'
  );

-- ─── 0d. Verification queries ───────────────────────────────────────────────
-- Coastal demo (a1b2c3d4-0000-0000-0000-000000000001):
-- Expected: bcba=3, supervisor=5, technician=6 → 14 total roster staff
-- SELECT role, COUNT(*) FROM staff
-- WHERE practice_id = 'a1b2c3d4-0000-0000-0000-000000000001'
--   AND external_code IS NOT NULL AND status = 'active'
-- GROUP BY role ORDER BY role;
--
-- Expected: 16 roster clients
-- SELECT COUNT(*) FROM clients
-- WHERE practice_id = 'a1b2c3d4-0000-0000-0000-000000000001'
--   AND external_code IS NOT NULL AND status = 'active';
--
-- Expected: 0 active legacy staff/clients
-- SELECT COUNT(*) FROM staff
-- WHERE practice_id = 'a1b2c3d4-0000-0000-0000-000000000001'
--   AND external_code IS NULL AND status = 'active';
-- SELECT COUNT(*) FROM clients
-- WHERE practice_id = 'a1b2c3d4-0000-0000-0000-000000000001'
--   AND external_code IS NULL AND status = 'active';
--
-- Repeat the same four queries for SPG (c3d4e5f6-5047-4000-8000-533047000001).
