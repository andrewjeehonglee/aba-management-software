-- =============================================================================
-- Phase 7 Slice #7b — Social Play Group bootstrap + demo roster prep
-- =============================================================================
--
-- Run in Supabase SQL Editor BEFORE: npm run import:roster -- --all
-- =============================================================================


-- Social Play Group (Jenny pilot)
INSERT INTO practices (id, name)
VALUES ('c3d4e5f6-5047-4000-8000-533047000001', 'Social Play Group')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Jenny joins later via join code c3d4e5f6 (first 8 chars of practice UUID)


-- Coastal demo: rename to reflect real org
UPDATE practices
SET name = 'Social Play Group (Demo)'
WHERE id = 'a1b2c3d4-0000-0000-0000-000000000001';


-- Hide legacy fictional Coastal clients (keeps session FK integrity)
UPDATE clients
SET status = 'inactive'
WHERE practice_id = 'a1b2c3d4-0000-0000-0000-000000000001'
  AND external_code IS NULL;


-- Deactivate legacy staff only if status column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'staff'
      AND column_name = 'status'
  ) THEN
    UPDATE staff
    SET status = 'inactive'
    WHERE practice_id = 'a1b2c3d4-0000-0000-0000-000000000001'
      AND external_code IS NULL;
  END IF;
END $$;

-- If staff.status does not exist, old + new staff coexist until a future migration adds status.


-- Verification (uncomment after roster import)
-- SELECT assignment_role, COUNT(*) FROM client_assignments
-- WHERE practice_id = 'c3d4e5f6-5047-4000-8000-533047000001' AND is_active
-- GROUP BY assignment_role;
