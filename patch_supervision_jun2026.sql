-- patch_supervision_jun2026.sql
-- June 2026 supervision periods for Coastal ABA demo technicians.
-- Run in Supabase SQL editor after seed_coastal_aba.sql.
-- Fixes empty Supervision Compliance tile (filters current calendar month = June 2026).

INSERT INTO supervision
  (id, practice_id, staff_id, supervision_pct, period_start, period_end)
VALUES
  -- Team A (Sarah Chen BCBA caseload)
  ('70000000-0000-0000-0000-000000000012', 'a1b2c3d4-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003',  4, '2026-06-01', '2026-06-30'),  -- Mike Torres — BELOW 5%
  ('70000000-0000-0000-0000-000000000013', 'a1b2c3d4-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 14, '2026-06-01', '2026-06-30'),  -- Emily Park
  -- Team B (Rachel Lee BCBA caseload)
  ('70000000-0000-0000-0000-000000000014', 'a1b2c3d4-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000007',  3, '2026-06-01', '2026-06-30'),  -- James Wilson — BELOW 5%
  ('70000000-0000-0000-0000-000000000015', 'a1b2c3d4-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000008',  9, '2026-06-01', '2026-06-30'),  -- Ashley Brown
  -- Team C (Jennifer Nguyen BCBA caseload)
  ('70000000-0000-0000-0000-000000000016', 'a1b2c3d4-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000011', 18, '2026-06-01', '2026-06-30')   -- Tyler Johnson
ON CONFLICT (id) DO NOTHING;
