-- =============================================================================
-- Jennifer BCBA caseload — full team visibility seed (June 2026)
-- Run after roster import + demo activity seed. Idempotent.
-- Ensures all 5 BTs + 4 supervisors on Jennifer's 8 clients have June sessions
-- with complete notes (hours tile) and supervision rows (compliance tile).
-- =============================================================================

WITH practices AS (
  SELECT unnest(ARRAY[
    'c3d4e5f6-5047-4000-8000-533047000001'::uuid,
    'a1b2c3d4-0000-0000-0000-000000000001'::uuid
  ]) AS practice_id
),
jennifer_clients AS (
  SELECT c.practice_id, c.id AS client_id, c.external_code
  FROM clients c
  WHERE c.external_code IN ('PeLe','BrTu','Ells','AlLo','LiBo','IsRi','CoTa','LoEl')
    AND c.status = 'active'
),
session_seed AS (
  SELECT * FROM (VALUES
    ('Ells', 'SPG-BT-enny',      '2026-06-22T14:00:00-07:00', 'direct'),
    ('IsRi', 'SPG-BT-enny',      '2026-06-23T15:00:00-07:00', 'direct'),
    ('LiBo', 'SPG-BT-daniel',    '2026-06-22T10:00:00-07:00', 'direct'),
    ('LiBo', 'SPG-BT-daniel',    '2026-06-23T10:30:00-07:00', 'direct'),
    ('AlLo', 'SPG-BT-emaya',     '2026-06-22T08:00:00-07:00', 'direct'),
    ('AlLo', 'SPG-BT-emaya',     '2026-06-23T08:30:00-07:00', 'direct'),
    ('PeLe', 'SPG-SUP-hilary',   '2026-06-18T11:00:00-07:00', 'supervision'),
    ('BrTu', 'SPG-SUP-aj',       '2026-06-18T13:00:00-07:00', 'supervision'),
    ('Ells', 'SPG-SUP-aj',       '2026-06-19T14:00:00-07:00', 'supervision'),
    ('IsRi', 'SPG-SUP-bryanna',  '2026-06-19T15:00:00-07:00', 'supervision'),
    ('CoTa', 'SPG-SUP-madeline', '2026-06-20T11:00:00-07:00', 'supervision'),
    ('LoEl', 'SPG-SUP-madeline', '2026-06-20T13:00:00-07:00', 'supervision')
  ) AS v(client_code, staff_code, scheduled_at, session_type)
)
INSERT INTO sessions (practice_id, client_id, staff_id, session_type, status, scheduled_at)
SELECT
  jc.practice_id,
  jc.client_id,
  s.id,
  v.session_type,
  'completed',
  v.scheduled_at::timestamptz
FROM practices p
JOIN session_seed v ON true
JOIN jennifer_clients jc ON jc.practice_id = p.practice_id AND jc.external_code = v.client_code
JOIN staff s ON s.practice_id = p.practice_id AND s.external_code = v.staff_code AND s.status = 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM sessions existing
  WHERE existing.practice_id = jc.practice_id
    AND existing.client_id = jc.client_id
    AND existing.staff_id = s.id
    AND existing.scheduled_at = v.scheduled_at::timestamptz
);

-- Notes for new direct/supervision sessions
WITH practices AS (
  SELECT unnest(ARRAY[
    'c3d4e5f6-5047-4000-8000-533047000001'::uuid,
    'a1b2c3d4-0000-0000-0000-000000000001'::uuid
  ]) AS practice_id
),
note_seed AS (
  SELECT * FROM (VALUES
    ('Ells', 'SPG-BT-enny',     '2026-06-22T14:00:00-07:00'),
    ('IsRi', 'SPG-BT-enny',     '2026-06-23T15:00:00-07:00'),
    ('LiBo', 'SPG-BT-daniel',   '2026-06-22T10:00:00-07:00'),
    ('LiBo', 'SPG-BT-daniel',   '2026-06-23T10:30:00-07:00'),
    ('AlLo', 'SPG-BT-emaya',    '2026-06-22T08:00:00-07:00'),
    ('AlLo', 'SPG-BT-emaya',    '2026-06-23T08:30:00-07:00'),
    ('PeLe', 'SPG-SUP-hilary',  '2026-06-18T11:00:00-07:00'),
    ('BrTu', 'SPG-SUP-aj',      '2026-06-18T13:00:00-07:00'),
    ('Ells', 'SPG-SUP-aj',      '2026-06-19T14:00:00-07:00'),
    ('IsRi', 'SPG-SUP-bryanna', '2026-06-19T15:00:00-07:00'),
    ('CoTa', 'SPG-SUP-madeline','2026-06-20T11:00:00-07:00'),
    ('LoEl', 'SPG-SUP-madeline','2026-06-20T13:00:00-07:00')
  ) AS v(client_code, staff_code, scheduled_at)
)
INSERT INTO session_notes
  (practice_id, session_id, client_id, staff_id, subjective, objective, assessment, plan)
SELECT
  sess.practice_id, sess.id, sess.client_id, sess.staff_id,
  'Session completed per treatment plan.',
  'Data collected on active programs.',
  'Progress consistent with goals.',
  'Continue current protocol.'
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

-- Supervision rows — all 5 Jennifer BTs (Enny included)
WITH practices AS (
  SELECT unnest(ARRAY[
    'c3d4e5f6-5047-4000-8000-533047000001'::uuid,
    'a1b2c3d4-0000-0000-0000-000000000001'::uuid
  ]) AS practice_id
),
sup_seed AS (
  SELECT * FROM (VALUES
    ('SPG-BT-jazmine',  8),
    ('SPG-BT-enny',     6),
    ('SPG-BT-emaya',   11),
    ('SPG-BT-daniel',   9),
    ('SPG-BT-lisa',    14)
  ) AS v(staff_code, supervision_pct)
)
INSERT INTO supervision (practice_id, staff_id, supervision_pct, period_start, period_end)
SELECT p.practice_id, s.id, v.supervision_pct, '2026-06-01', '2026-06-30'
FROM practices p
CROSS JOIN sup_seed v
JOIN staff s ON s.practice_id = p.practice_id AND s.external_code = v.staff_code
WHERE NOT EXISTS (
  SELECT 1 FROM supervision sup
  WHERE sup.staff_id = s.id AND sup.period_start = '2026-06-01' AND sup.period_end = '2026-06-30'
);
