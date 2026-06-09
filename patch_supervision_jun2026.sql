-- patch_supervision_jun2026.sql
-- Shift Coastal ABA supervision to June 2026 + ensure technician rows exist.
-- Run in Supabase SQL editor (Coastal practice: a1b2c3d4-...001).
-- Fixes empty Supervision Compliance tile when app filters current month = June 2026.

-- 1) Move existing May 2026 periods → June 2026 (seed + any prior patches)
UPDATE supervision
SET period_start = '2026-06-01',
    period_end   = '2026-06-30'
WHERE practice_id = 'a1b2c3d4-0000-0000-0000-000000000001'
  AND period_start >= '2026-05-01'
  AND period_start <  '2026-06-01';

-- 2) Ensure flagged technician rows exist (idempotent)
INSERT INTO supervision
  (id, practice_id, staff_id, supervision_pct, period_start, period_end)
VALUES
  ('70000000-0000-0000-0000-000000000012', 'a1b2c3d4-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003',  4, '2026-06-01', '2026-06-30'),
  ('70000000-0000-0000-0000-000000000013', 'a1b2c3d4-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 14, '2026-06-01', '2026-06-30'),
  ('70000000-0000-0000-0000-000000000014', 'a1b2c3d4-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000007',  3, '2026-06-01', '2026-06-30'),
  ('70000000-0000-0000-0000-000000000015', 'a1b2c3d4-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000008',  9, '2026-06-01', '2026-06-30'),
  ('70000000-0000-0000-0000-000000000016', 'a1b2c3d4-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000011', 18, '2026-06-01', '2026-06-30')
ON CONFLICT (id) DO UPDATE SET
  period_start = EXCLUDED.period_start,
  period_end   = EXCLUDED.period_end,
  supervision_pct = EXCLUDED.supervision_pct;

-- 3) Verify
SELECT s.full_name, s.team, s.role, sup.supervision_pct, sup.period_start, sup.period_end
FROM supervision sup
JOIN staff s ON s.id = sup.staff_id
WHERE sup.practice_id = 'a1b2c3d4-0000-0000-0000-000000000001'
  AND sup.period_start >= '2026-06-01'
ORDER BY s.full_name;
