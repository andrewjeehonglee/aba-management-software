-- =============================================================================
-- Patch: Move "today" sessions from Jun 3 → Jun 4 2026
--        Add Jun 4 sessions for the 6 staff with no today entry
-- Run this once in the Supabase SQL Editor.
-- Safe to re-run (UPDATE is idempotent; INSERTs use ON CONFLICT DO NOTHING).
-- =============================================================================

-- ── 1. Shift the 8 seeded "today" sessions from Jun 3 → Jun 4 ───────────────

UPDATE sessions SET scheduled_at = '2026-06-04T08:00:00+00:00' WHERE id = '30000000-0000-0000-0000-000000000001';
UPDATE sessions SET scheduled_at = '2026-06-04T09:00:00+00:00' WHERE id = '30000000-0000-0000-0000-000000000002';
UPDATE sessions SET scheduled_at = '2026-06-04T09:30:00+00:00' WHERE id = '30000000-0000-0000-0000-000000000003';
UPDATE sessions SET scheduled_at = '2026-06-04T10:00:00+00:00' WHERE id = '30000000-0000-0000-0000-000000000004';
UPDATE sessions SET scheduled_at = '2026-06-04T13:00:00+00:00' WHERE id = '30000000-0000-0000-0000-000000000005';
UPDATE sessions SET scheduled_at = '2026-06-04T14:00:00+00:00' WHERE id = '30000000-0000-0000-0000-000000000006';
UPDATE sessions SET scheduled_at = '2026-06-04T11:00:00+00:00' WHERE id = '30000000-0000-0000-0000-000000000007';
UPDATE sessions SET scheduled_at = '2026-06-04T15:00:00+00:00' WHERE id = '30000000-0000-0000-0000-000000000008';


-- ── 2. Add Jun 4 sessions for the 6 staff who had none ───────────────────────
--   Staff 01 Sarah Chen      (BCBA,       Team A) → client Emma Rodriguez (001)
--   Staff 02 David Kim       (supervisor, Team A) → client Ava Martinez   (003)
--   Staff 05 Rachel Lee      (BCBA,       Team B) → client Sophia Davis   (005)
--   Staff 06 Kevin Martinez  (supervisor, Team B) → client Jackson Brown  (006)
--   Staff 09 Jennifer Nguyen (BCBA,       Team C) → client Mia Anderson   (009)
--   Staff 10 Laura Chen      (BCBA,       Team C) → client Lucas Thomas   (010)

INSERT INTO sessions
  (id, practice_id, client_id, staff_id, session_type, status, scheduled_at)
VALUES
  ('30000000-0000-0000-0000-000000000071', 'a1b2c3d4-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   'supervision', 'scheduled',  '2026-06-04T10:30:00+00:00'),

  ('30000000-0000-0000-0000-000000000072', 'a1b2c3d4-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002',
   'indirect',    'completed',  '2026-06-04T08:30:00+00:00'),

  ('30000000-0000-0000-0000-000000000073', 'a1b2c3d4-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005',
   'supervision', 'in-progress','2026-06-04T09:00:00+00:00'),

  ('30000000-0000-0000-0000-000000000074', 'a1b2c3d4-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000006',
   'indirect',    'completed',  '2026-06-04T08:00:00+00:00'),

  ('30000000-0000-0000-0000-000000000075', 'a1b2c3d4-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000009',
   'supervision', 'scheduled',  '2026-06-04T11:00:00+00:00'),

  ('30000000-0000-0000-0000-000000000076', 'a1b2c3d4-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000010',
   'indirect',    'in-progress','2026-06-04T13:30:00+00:00')

ON CONFLICT (id) DO NOTHING;
