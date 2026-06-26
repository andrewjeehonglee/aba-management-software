-- =============================================================================
-- Demo Start Session — open sessions for roster clients (today's date)
-- =============================================================================
--
-- Run in Supabase SQL Editor AFTER roster import + demo activity seeds.
-- Idempotent — skips rows that already exist for the same client/day/staff.
--
-- Demo practice: a1b2c3d4-0000-0000-0000-000000000001  (Social Play Group Demo)
-- SPG practice:  c3d4e5f6-5047-4000-8000-533047000001  (Social Play Group)
-- =============================================================================

WITH practices AS (
  SELECT unnest(ARRAY[
    'a1b2c3d4-0000-0000-0000-000000000001'::uuid,
    'c3d4e5f6-5047-4000-8000-533047000001'::uuid
  ]) AS practice_id
),
open_seed AS (
  SELECT * FROM (VALUES
    ('PeLe',  'SPG-BT-jazmine', '09:00:00'),
    ('IsRi',  'SPG-BT-enny',    '10:00:00'),
    ('BrTu',  'SPG-BT-emaya',   '11:00:00'),
    ('Ells',  'SPG-BT-daniel',  '13:00:00')
  ) AS v(client_code, staff_code, time_of_day)
)
INSERT INTO sessions (practice_id, client_id, staff_id, session_type, status, scheduled_at)
SELECT
  p.practice_id,
  c.id,
  s.id,
  'direct',
  'scheduled',
  (CURRENT_DATE::text || 'T' || v.time_of_day || '-07:00')::timestamptz
FROM practices p
CROSS JOIN open_seed v
JOIN clients c
  ON c.practice_id = p.practice_id
 AND c.external_code = v.client_code
 AND c.status = 'active'
JOIN staff s
  ON s.practice_id = p.practice_id
 AND s.external_code = v.staff_code
 AND s.status = 'active'
WHERE NOT EXISTS (
  SELECT 1
  FROM sessions existing
  WHERE existing.practice_id = p.practice_id
    AND existing.client_id = c.id
    AND existing.staff_id = s.id
    AND existing.status IN ('scheduled', 'in-progress')
    AND existing.scheduled_at::date = CURRENT_DATE
);
