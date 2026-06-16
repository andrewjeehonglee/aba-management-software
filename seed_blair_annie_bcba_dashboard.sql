-- =============================================================================
-- Blair + Annie BCBA dashboard seeds (June 2026)
-- Run AFTER: npm run import:roster -- --all
--            seed_roster_demo_activity.sql
--            seed_roster_staff_full_coverage.sql (optional but recommended)
-- Idempotent — Demo + SPG practices.
--
-- Per Jenny roster (templates/roster_import.csv):
--   Blair — ViReMo (Bryanna, Jazmine), LaGu (Madeline), SuAz (Carmen)
--   Annie — LuMa/EzHe/GrMa (Bryanna/Madeline), YaNu/ZiTr (Carmen, Valerie)
-- =============================================================================

WITH practices AS (
  SELECT unnest(ARRAY[
    'c3d4e5f6-5047-4000-8000-533047000001'::uuid,
    'a1b2c3d4-0000-0000-0000-000000000001'::uuid
  ]) AS practice_id
),
session_seed AS (
  SELECT * FROM (VALUES
    -- Blair caseload — team direct + supervision (My team calendar density)
    ('ViReMo', 'SPG-BT-jazmine',     '2026-06-01T15:00:00-07:00', 'direct',      'completed'),
    ('ViReMo', 'SPG-BT-jazmine',     '2026-06-16T15:00:00-07:00', 'direct',      'completed'),
    ('ViReMo', 'SPG-BT-jazmine',     '2026-06-16T16:00:00-07:00', 'direct',      'scheduled'),
    ('ViReMo', 'SPG-SUP-bryanna',    '2026-06-16T14:00:00-07:00', 'supervision', 'completed'),
    ('ViReMo', 'SPG-BCBA-blair',     '2026-06-16T11:00:00-07:00', 'supervision', 'completed'),
    ('LaGu',   'SPG-SUP-madeline',   '2026-06-16T12:00:00-07:00', 'supervision', 'completed'),
    ('LaGu',   'SPG-BCBA-blair',     '2026-06-16T13:00:00-07:00', 'indirect',    'completed'),
    ('SuAz',   'SPG-SUP-carmen',     '2026-06-16T15:30:00-07:00', 'supervision', 'completed'),
    ('SuAz',   'SPG-BCBA-blair',     '2026-06-16T16:30:00-07:00', 'supervision', 'scheduled'),
    -- Annie caseload — Valerie direct + supervisors + Annie BCBA
    ('YaNu',   'SPG-BT-valerie',     '2026-06-01T16:00:00-07:00', 'direct',      'completed'),
    ('YaNu',   'SPG-BT-valerie',     '2026-06-16T16:00:00-07:00', 'direct',      'completed'),
    ('YaNu',   'SPG-BT-valerie',     '2026-06-16T17:00:00-07:00', 'direct',      'scheduled'),
    ('ZiTr',   'SPG-BT-valerie',     '2026-06-16T13:00:00-07:00', 'direct',      'completed'),
    ('ZiTr',   'SPG-BT-valerie',     '2026-06-16T14:00:00-07:00', 'direct',      'completed'),
    ('LuMa',   'SPG-SUP-bryanna',    '2026-06-16T08:00:00-07:00', 'supervision', 'completed'),
    ('EzHe',   'SPG-SUP-madeline',   '2026-06-16T09:00:00-07:00', 'supervision', 'completed'),
    ('GrMa',   'SPG-SUP-madeline',   '2026-06-16T10:00:00-07:00', 'supervision', 'completed'),
    ('YaNu',   'SPG-SUP-carmen',     '2026-06-16T11:00:00-07:00', 'supervision', 'completed'),
    ('YaNu',   'SPG-BCBA-annie',     '2026-06-16T08:30:00-07:00', 'supervision', 'completed'),
    ('ZiTr',   'SPG-BCBA-annie',     '2026-06-16T09:30:00-07:00', 'indirect',    'completed')
  ) AS v(client_code, staff_code, scheduled_at, session_type, status)
)
INSERT INTO sessions (practice_id, client_id, staff_id, session_type, status, scheduled_at)
SELECT
  p.practice_id,
  c.id,
  s.id,
  v.session_type,
  v.status,
  v.scheduled_at::timestamptz
FROM practices p
CROSS JOIN session_seed v
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


-- Complete SOAP notes for completed Blair / Annie caseload sessions above
WITH practices AS (
  SELECT unnest(ARRAY[
    'c3d4e5f6-5047-4000-8000-533047000001'::uuid,
    'a1b2c3d4-0000-0000-0000-000000000001'::uuid
  ]) AS practice_id
),
note_seed AS (
  SELECT * FROM (VALUES
    ('ViReMo', 'SPG-BT-jazmine',   '2026-06-01T15:00:00-07:00'),
    ('ViReMo', 'SPG-BT-jazmine',   '2026-06-16T15:00:00-07:00'),
    ('ViReMo', 'SPG-SUP-bryanna',  '2026-06-16T14:00:00-07:00'),
    ('ViReMo', 'SPG-BCBA-blair',   '2026-06-16T11:00:00-07:00'),
    ('LaGu',   'SPG-SUP-madeline', '2026-06-16T12:00:00-07:00'),
    ('LaGu',   'SPG-BCBA-blair',   '2026-06-16T13:00:00-07:00'),
    ('SuAz',   'SPG-SUP-carmen',   '2026-06-16T15:30:00-07:00'),
    ('YaNu',   'SPG-BT-valerie',   '2026-06-01T16:00:00-07:00'),
    ('YaNu',   'SPG-BT-valerie',   '2026-06-16T16:00:00-07:00'),
    ('ZiTr',   'SPG-BT-valerie',   '2026-06-16T13:00:00-07:00'),
    ('ZiTr',   'SPG-BT-valerie',   '2026-06-16T14:00:00-07:00'),
    ('LuMa',   'SPG-SUP-bryanna',  '2026-06-16T08:00:00-07:00'),
    ('EzHe',   'SPG-SUP-madeline', '2026-06-16T09:00:00-07:00'),
    ('GrMa',   'SPG-SUP-madeline', '2026-06-16T10:00:00-07:00'),
    ('YaNu',   'SPG-SUP-carmen',   '2026-06-16T11:00:00-07:00'),
    ('YaNu',   'SPG-BCBA-annie',   '2026-06-16T08:30:00-07:00'),
    ('ZiTr',   'SPG-BCBA-annie',   '2026-06-16T09:30:00-07:00')
  ) AS v(client_code, staff_code, scheduled_at)
)
INSERT INTO session_notes
  (practice_id, session_id, client_id, staff_id, subjective, objective, assessment, plan)
SELECT
  sess.practice_id,
  sess.id,
  sess.client_id,
  sess.staff_id,
  'Client regulated at start; caregiver reported consistent routines at home.',
  'Targets run per plan; data collected on active programs.',
  'Progress consistent with authorization goals for this period.',
  'Continue current treatment plan; BCBA review at next supervision.'
FROM practices p
JOIN note_seed v ON true
JOIN clients c
  ON c.practice_id = p.practice_id
 AND c.external_code = v.client_code
JOIN staff s
  ON s.practice_id = p.practice_id
 AND s.external_code = v.staff_code
JOIN sessions sess
  ON sess.practice_id = p.practice_id
 AND sess.client_id = c.id
 AND sess.staff_id = s.id
 AND sess.scheduled_at = v.scheduled_at::timestamptz
 AND sess.status = 'completed'
WHERE NOT EXISTS (
  SELECT 1 FROM session_notes n WHERE n.session_id = sess.id
);
