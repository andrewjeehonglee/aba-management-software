-- =============================================================================
-- Phase 7 Slice #7g — BT session coverage gap-fill (June 2026)
-- Run AFTER seed_roster_demo_activity.sql. Idempotent.
-- Ensures each roster BT has ≥2 completed direct sessions in June on assigned clients.
-- =============================================================================

WITH practices AS (
  SELECT unnest(ARRAY[
    'c3d4e5f6-5047-4000-8000-533047000001'::uuid,
    'a1b2c3d4-0000-0000-0000-000000000001'::uuid
  ]) AS practice_id
),
bt_coverage_seed AS (
  SELECT * FROM (VALUES
    -- Gap-fill only if main seed was skipped; pairs BT → client on caseload
    ('PeLe',    'SPG-BT-jazmine',  '2026-06-24T09:00:00-07:00'),
    ('PeLe',    'SPG-BT-jazmine',  '2026-06-25T09:30:00-07:00'),
    ('Ells',    'SPG-BT-enny',     '2026-06-24T14:00:00-07:00'),
    ('Ells',    'SPG-BT-enny',     '2026-06-25T14:30:00-07:00'),
    ('AlLo',    'SPG-BT-emaya',    '2026-06-26T08:00:00-07:00'),
    ('AlLo',    'SPG-BT-emaya',    '2026-06-27T08:30:00-07:00'),
    ('LiBo',    'SPG-BT-daniel',   '2026-06-27T10:00:00-07:00'),
    ('LiBo',    'SPG-BT-daniel',   '2026-06-28T10:30:00-07:00'),
    ('CoTa',    'SPG-BT-lisa',     '2026-06-29T11:00:00-07:00'),
    ('LoEl',    'SPG-BT-lisa',     '2026-06-29T13:00:00-07:00'),
    ('YaNu',    'SPG-BT-valerie',  '2026-06-26T16:00:00-07:00'),
    ('ZiTr',    'SPG-BT-valerie',  '2026-06-27T17:00:00-07:00')
  ) AS v(client_code, staff_code, scheduled_at)
)
INSERT INTO sessions (practice_id, client_id, staff_id, session_type, status, scheduled_at)
SELECT
  p.practice_id,
  c.id,
  s.id,
  'direct',
  'completed',
  v.scheduled_at::timestamptz
FROM practices p
CROSS JOIN bt_coverage_seed v
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
    AND existing.scheduled_at = v.scheduled_at::timestamptz
);

-- Notes for gap-fill sessions
WITH practices AS (
  SELECT unnest(ARRAY[
    'c3d4e5f6-5047-4000-8000-533047000001'::uuid,
    'a1b2c3d4-0000-0000-0000-000000000001'::uuid
  ]) AS practice_id
),
note_seed AS (
  SELECT * FROM (VALUES
    ('PeLe',    'SPG-BT-jazmine',  '2026-06-24T09:00:00-07:00'),
    ('PeLe',    'SPG-BT-jazmine',  '2026-06-25T09:30:00-07:00'),
    ('Ells',    'SPG-BT-enny',     '2026-06-24T14:00:00-07:00'),
    ('Ells',    'SPG-BT-enny',     '2026-06-25T14:30:00-07:00'),
    ('AlLo',    'SPG-BT-emaya',    '2026-06-26T08:00:00-07:00'),
    ('AlLo',    'SPG-BT-emaya',    '2026-06-27T08:30:00-07:00'),
    ('LiBo',    'SPG-BT-daniel',   '2026-06-27T10:00:00-07:00'),
    ('LiBo',    'SPG-BT-daniel',   '2026-06-28T10:30:00-07:00'),
    ('CoTa',    'SPG-BT-lisa',     '2026-06-29T11:00:00-07:00'),
    ('LoEl',    'SPG-BT-lisa',     '2026-06-29T13:00:00-07:00'),
    ('YaNu',    'SPG-BT-valerie',  '2026-06-26T16:00:00-07:00'),
    ('ZiTr',    'SPG-BT-valerie',  '2026-06-27T17:00:00-07:00')
  ) AS v(client_code, staff_code, scheduled_at)
)
INSERT INTO session_notes
  (practice_id, session_id, client_id, staff_id, subjective, objective, assessment, plan)
SELECT
  sess.practice_id,
  sess.id,
  sess.client_id,
  sess.staff_id,
  'Client engaged with treatment targets; session completed per plan.',
  'Data collected on active programs.',
  'Progress consistent with authorization period.',
  'Continue current BT protocol.'
FROM practices p
JOIN note_seed v ON true
JOIN clients c ON c.practice_id = p.practice_id AND c.external_code = v.client_code
JOIN staff s ON s.practice_id = p.practice_id AND s.external_code = v.staff_code
JOIN sessions sess
  ON sess.practice_id = p.practice_id
 AND sess.client_id = c.id
 AND sess.staff_id = s.id
 AND sess.scheduled_at = v.scheduled_at::timestamptz
WHERE NOT EXISTS (SELECT 1 FROM session_notes n WHERE n.session_id = sess.id);
