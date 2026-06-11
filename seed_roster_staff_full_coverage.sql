-- =============================================================================
-- Staff page full coverage — all 14 roster staff (June 2026)
-- Run AFTER: npm run import:roster -- --all
--            seed_roster_demo_activity.sql (+ optional bt_coverage / jennifer seeds)
-- Idempotent — safe to re-run on Demo + SPG practices.
-- =============================================================================

-- ─── 1. Profile fields — unique hire_date + certification mix ───────────────

WITH practices AS (
  SELECT unnest(ARRAY[
    'c3d4e5f6-5047-4000-8000-533047000001'::uuid,
    'a1b2c3d4-0000-0000-0000-000000000001'::uuid
  ]) AS practice_id
),
profile_seed AS (
  SELECT * FROM (VALUES
    ('SPG-BCBA-jennifer', '2019-03-15'::date, 'BCBA — expires Dec 2027'),
    ('SPG-BCBA-blair',    '2020-06-01'::date, 'BCBA — expires Aug 2026'),
    ('SPG-BCBA-annie',    '2021-01-10'::date, 'BCBA — expires Jul 2026'),
    ('SPG-SUP-hilary',    '2020-02-01'::date, 'BCBA — expires Mar 2027'),
    ('SPG-SUP-aj',        '2019-08-12'::date, 'BCBA — expires Sep 2026'),
    ('SPG-SUP-bryanna',   '2021-04-20'::date, 'BCBA — expires Jun 2026'),
    ('SPG-SUP-madeline',  '2022-03-01'::date, 'BCBA — expires Nov 2026'),
    ('SPG-SUP-carmen',    '2020-11-05'::date, 'BCBA — expires Aug 2026'),
    ('SPG-BT-jazmine',    '2023-01-15'::date, 'RBT — expires Dec 2026'),
    ('SPG-BT-enny',       '2023-06-01'::date, 'RBT — expires Jul 2026'),
    ('SPG-BT-emaya',      '2024-02-10'::date, 'RBT — expires Sep 2026'),
    ('SPG-BT-daniel',     '2023-09-20'::date, 'RBT — expires Mar 2027'),
    ('SPG-BT-lisa',       '2022-11-01'::date, 'RBT — expires Oct 2026'),
    ('SPG-BT-valerie',    '2024-05-01'::date, 'RBT — expires Aug 2026')
  ) AS v(staff_code, hire_date, certification)
)
UPDATE staff s
SET
  hire_date = v.hire_date,
  certification = v.certification
FROM practices p, profile_seed v
WHERE s.practice_id = p.practice_id
  AND s.external_code = v.staff_code
  AND s.status = 'active';


-- ─── 2. Supervisor sessions on assigned clients ─────────────────────────────

WITH practices AS (
  SELECT unnest(ARRAY[
    'c3d4e5f6-5047-4000-8000-533047000001'::uuid,
    'a1b2c3d4-0000-0000-0000-000000000001'::uuid
  ]) AS practice_id
),
supervisor_seed AS (
  SELECT * FROM (VALUES
    ('PeLe',   'SPG-SUP-hilary',    '2026-06-04T11:00:00-07:00'),
    ('PeLe',   'SPG-SUP-hilary',    '2026-06-25T11:30:00-07:00'),
    ('BrTu',   'SPG-SUP-aj',        '2026-06-04T13:00:00-07:00'),
    ('Ells',   'SPG-SUP-aj',        '2026-06-05T14:00:00-07:00'),
    ('AlLo',   'SPG-SUP-aj',        '2026-06-06T08:00:00-07:00'),
    ('LiBo',   'SPG-SUP-aj',        '2026-06-07T10:00:00-07:00'),
    ('IsRi',   'SPG-SUP-bryanna',   '2026-06-04T15:00:00-07:00'),
    ('ViReMo', 'SPG-SUP-bryanna',   '2026-06-10T15:00:00-07:00'),
    ('LuMa',   'SPG-SUP-bryanna',   '2026-06-11T08:00:00-07:00'),
    ('CoTa',   'SPG-SUP-madeline',  '2026-06-03T11:00:00-07:00'),
    ('LoEl',   'SPG-SUP-madeline',  '2026-06-04T13:00:00-07:00'),
    ('EzHe',   'SPG-SUP-madeline',  '2026-06-12T11:00:00-07:00'),
    ('GrMa',   'SPG-SUP-madeline',  '2026-06-13T13:00:00-07:00'),
    ('SuAz',   'SPG-SUP-carmen',    '2026-06-05T16:00:00-07:00'),
    ('YaNu',   'SPG-SUP-carmen',    '2026-06-06T16:30:00-07:00'),
    ('ZiTr',   'SPG-SUP-carmen',    '2026-06-07T17:00:00-07:00')
  ) AS v(client_code, staff_code, scheduled_at)
)
INSERT INTO sessions (practice_id, client_id, staff_id, session_type, status, scheduled_at)
SELECT
  p.practice_id,
  c.id,
  s.id,
  'supervision',
  'completed',
  v.scheduled_at::timestamptz
FROM practices p
CROSS JOIN supervisor_seed v
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


-- ─── 3. BCBA indirect / supervision on caseload clients ─────────────────────

WITH practices AS (
  SELECT unnest(ARRAY[
    'c3d4e5f6-5047-4000-8000-533047000001'::uuid,
    'a1b2c3d4-0000-0000-0000-000000000001'::uuid
  ]) AS practice_id
),
bcba_seed AS (
  SELECT * FROM (VALUES
    ('Ells',   'SPG-BCBA-jennifer', '2026-06-08T11:00:00-07:00', 'indirect'),
    ('AlLo',   'SPG-BCBA-jennifer', '2026-06-09T11:30:00-07:00', 'supervision'),
    ('IsRi',   'SPG-BCBA-jennifer', '2026-06-10T11:00:00-07:00', 'indirect'),
    ('CoTa',   'SPG-BCBA-jennifer', '2026-06-11T11:30:00-07:00', 'supervision'),
    ('ViReMo', 'SPG-BCBA-blair',    '2026-06-06T16:00:00-07:00', 'supervision'),
    ('LaGu',   'SPG-BCBA-blair',    '2026-06-13T16:30:00-07:00', 'indirect'),
    ('SuAz',   'SPG-BCBA-blair',    '2026-06-20T16:00:00-07:00', 'supervision'),
    ('LuMa',   'SPG-BCBA-annie',    '2026-06-07T08:00:00-07:00', 'indirect'),
    ('EzHe',   'SPG-BCBA-annie',    '2026-06-14T08:30:00-07:00', 'supervision'),
    ('GrMa',   'SPG-BCBA-annie',    '2026-06-21T09:00:00-07:00', 'indirect'),
    ('YaNu',   'SPG-BCBA-annie',    '2026-06-08T16:00:00-07:00', 'supervision'),
    ('ZiTr',   'SPG-BCBA-annie',    '2026-06-09T17:00:00-07:00', 'indirect')
  ) AS v(client_code, staff_code, scheduled_at, session_type)
)
INSERT INTO sessions (practice_id, client_id, staff_id, session_type, status, scheduled_at)
SELECT
  p.practice_id,
  c.id,
  s.id,
  v.session_type,
  'completed',
  v.scheduled_at::timestamptz
FROM practices p
CROSS JOIN bcba_seed v
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


-- ─── 4. BT direct sessions — differentiated volume + note mix ───────────────
-- Valid (client_code, staff_code) pairs only (roster CSV primary BT assignments).

WITH practices AS (
  SELECT unnest(ARRAY[
    'c3d4e5f6-5047-4000-8000-533047000001'::uuid,
    'a1b2c3d4-0000-0000-0000-000000000001'::uuid
  ]) AS practice_id
),
bt_seed AS (
  SELECT * FROM (VALUES
    -- Jazmine — high volume, mixed notes
    ('PeLe',   'SPG-BT-jazmine', '2026-06-01T09:00:00-07:00', 'complete'),
    ('PeLe',   'SPG-BT-jazmine', '2026-06-07T09:30:00-07:00', 'missing'),
    ('BrTu',   'SPG-BT-jazmine', '2026-06-14T13:00:00-07:00', 'complete'),
    ('ViReMo', 'SPG-BT-jazmine', '2026-06-28T15:00:00-07:00', 'complete'),
    -- Enny — moderate, one overdue candidate (early session missing, later complete)
    ('Ells',   'SPG-BT-enny',    '2026-06-01T14:00:00-07:00', 'missing'),
    ('Ells',   'SPG-BT-enny',    '2026-06-08T14:30:00-07:00', 'complete'),
    ('IsRi',   'SPG-BT-enny',    '2026-06-02T15:00:00-07:00', 'complete'),
    ('IsRi',   'SPG-BT-enny',    '2026-06-09T15:30:00-07:00', 'complete'),
    -- Emaya — lighter caseload, clean notes
    ('AlLo',   'SPG-BT-emaya',   '2026-06-02T08:00:00-07:00', 'complete'),
    ('AlLo',   'SPG-BT-emaya',   '2026-06-09T08:30:00-07:00', 'complete'),
    -- Daniel — partial note on one session
    ('LiBo',   'SPG-BT-daniel',  '2026-06-03T10:00:00-07:00', 'complete'),
    ('LiBo',   'SPG-BT-daniel',  '2026-06-10T10:30:00-07:00', 'partial'),
    -- Lisa — two clients, missing notes
    ('CoTa',   'SPG-BT-lisa',    '2026-06-01T11:00:00-07:00', 'missing'),
    ('LoEl',   'SPG-BT-lisa',    '2026-06-02T13:00:00-07:00', 'complete'),
    ('CoTa',   'SPG-BT-lisa',    '2026-06-08T11:30:00-07:00', 'complete'),
    -- Valerie — Annie caseload, one missing
    ('YaNu',   'SPG-BT-valerie', '2026-06-03T16:00:00-07:00', 'complete'),
    ('ZiTr',   'SPG-BT-valerie', '2026-06-04T17:00:00-07:00', 'missing'),
    ('YaNu',   'SPG-BT-valerie', '2026-06-10T16:30:00-07:00', 'complete')
  ) AS v(client_code, staff_code, scheduled_at, note_flag)
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
CROSS JOIN bt_seed v
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


-- ─── 5. Session notes — complete + partial (missing = no row) ───────────────

WITH practices AS (
  SELECT unnest(ARRAY[
    'c3d4e5f6-5047-4000-8000-533047000001'::uuid,
    'a1b2c3d4-0000-0000-0000-000000000001'::uuid
  ]) AS practice_id
),
complete_notes AS (
  SELECT * FROM (VALUES
    ('PeLe',   'SPG-BT-jazmine', '2026-06-01T09:00:00-07:00'),
    ('BrTu',   'SPG-BT-jazmine', '2026-06-14T13:00:00-07:00'),
    ('ViReMo', 'SPG-BT-jazmine', '2026-06-28T15:00:00-07:00'),
    ('Ells',   'SPG-BT-enny',    '2026-06-08T14:30:00-07:00'),
    ('IsRi',   'SPG-BT-enny',    '2026-06-02T15:00:00-07:00'),
    ('IsRi',   'SPG-BT-enny',    '2026-06-09T15:30:00-07:00'),
    ('AlLo',   'SPG-BT-emaya',   '2026-06-02T08:00:00-07:00'),
    ('AlLo',   'SPG-BT-emaya',   '2026-06-09T08:30:00-07:00'),
    ('LiBo',   'SPG-BT-daniel',  '2026-06-03T10:00:00-07:00'),
    ('LoEl',   'SPG-BT-lisa',    '2026-06-02T13:00:00-07:00'),
    ('CoTa',   'SPG-BT-lisa',    '2026-06-08T11:30:00-07:00'),
    ('YaNu',   'SPG-BT-valerie', '2026-06-03T16:00:00-07:00'),
    ('YaNu',   'SPG-BT-valerie', '2026-06-10T16:30:00-07:00'),
    -- Supervisors + BCBAs (billable indirect)
    ('PeLe',   'SPG-SUP-hilary',    '2026-06-04T11:00:00-07:00'),
    ('PeLe',   'SPG-SUP-hilary',    '2026-06-25T11:30:00-07:00'),
    ('BrTu',   'SPG-SUP-aj',        '2026-06-04T13:00:00-07:00'),
    ('Ells',   'SPG-SUP-aj',        '2026-06-05T14:00:00-07:00'),
    ('AlLo',   'SPG-SUP-aj',        '2026-06-06T08:00:00-07:00'),
    ('LiBo',   'SPG-SUP-aj',        '2026-06-07T10:00:00-07:00'),
    ('IsRi',   'SPG-SUP-bryanna',   '2026-06-04T15:00:00-07:00'),
    ('ViReMo', 'SPG-SUP-bryanna',   '2026-06-10T15:00:00-07:00'),
    ('LuMa',   'SPG-SUP-bryanna',   '2026-06-11T08:00:00-07:00'),
    ('CoTa',   'SPG-SUP-madeline',  '2026-06-03T11:00:00-07:00'),
    ('LoEl',   'SPG-SUP-madeline',  '2026-06-04T13:00:00-07:00'),
    ('EzHe',   'SPG-SUP-madeline',  '2026-06-12T11:00:00-07:00'),
    ('GrMa',   'SPG-SUP-madeline',  '2026-06-13T13:00:00-07:00'),
    ('SuAz',   'SPG-SUP-carmen',    '2026-06-05T16:00:00-07:00'),
    ('YaNu',   'SPG-SUP-carmen',    '2026-06-06T16:30:00-07:00'),
    ('ZiTr',   'SPG-SUP-carmen',    '2026-06-07T17:00:00-07:00'),
    ('Ells',   'SPG-BCBA-jennifer', '2026-06-08T11:00:00-07:00'),
    ('AlLo',   'SPG-BCBA-jennifer', '2026-06-09T11:30:00-07:00'),
    ('IsRi',   'SPG-BCBA-jennifer', '2026-06-10T11:00:00-07:00'),
    ('CoTa',   'SPG-BCBA-jennifer', '2026-06-11T11:30:00-07:00'),
    ('ViReMo', 'SPG-BCBA-blair',    '2026-06-06T16:00:00-07:00'),
    ('LaGu',   'SPG-BCBA-blair',    '2026-06-13T16:30:00-07:00'),
    ('SuAz',   'SPG-BCBA-blair',    '2026-06-20T16:00:00-07:00'),
    ('LuMa',   'SPG-BCBA-annie',    '2026-06-07T08:00:00-07:00'),
    ('EzHe',   'SPG-BCBA-annie',    '2026-06-14T08:30:00-07:00'),
    ('GrMa',   'SPG-BCBA-annie',    '2026-06-21T09:00:00-07:00'),
    ('YaNu',   'SPG-BCBA-annie',    '2026-06-08T16:00:00-07:00'),
    ('ZiTr',   'SPG-BCBA-annie',    '2026-06-09T17:00:00-07:00')
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
  'Continue current protocol; BCBA to review next supervision cycle.'
FROM practices p
JOIN complete_notes v ON true
JOIN clients c ON c.practice_id = p.practice_id AND c.external_code = v.client_code
JOIN staff s ON s.practice_id = p.practice_id AND s.external_code = v.staff_code
JOIN sessions sess
  ON sess.practice_id = p.practice_id
 AND sess.client_id = c.id
 AND sess.staff_id = s.id
 AND sess.scheduled_at = v.scheduled_at::timestamptz
WHERE NOT EXISTS (SELECT 1 FROM session_notes n WHERE n.session_id = sess.id);

-- Partial note — Daniel LiBo Jun 10
WITH practices AS (
  SELECT unnest(ARRAY[
    'c3d4e5f6-5047-4000-8000-533047000001'::uuid,
    'a1b2c3d4-0000-0000-0000-000000000001'::uuid
  ]) AS practice_id
)
INSERT INTO session_notes
  (practice_id, session_id, client_id, staff_id, subjective, objective, assessment, plan)
SELECT
  sess.practice_id, sess.id, sess.client_id, sess.staff_id,
  'Session started late due to transition difficulty.', '', '', ''
FROM practices p
JOIN clients c ON c.practice_id = p.practice_id AND c.external_code = 'LiBo'
JOIN staff s ON s.practice_id = p.practice_id AND s.external_code = 'SPG-BT-daniel'
JOIN sessions sess
  ON sess.practice_id = p.practice_id
 AND sess.client_id = c.id
 AND sess.staff_id = s.id
 AND sess.scheduled_at = '2026-06-10T10:30:00-07:00'::timestamptz
WHERE NOT EXISTS (SELECT 1 FROM session_notes n WHERE n.session_id = sess.id);


-- ─── 6. Supervision % — BT spread 3.5–7% (upsert June 2026) ─────────────────

WITH practices AS (
  SELECT unnest(ARRAY[
    'c3d4e5f6-5047-4000-8000-533047000001'::uuid,
    'a1b2c3d4-0000-0000-0000-000000000001'::uuid
  ]) AS practice_id
),
sup_seed AS (
  SELECT * FROM (VALUES
    ('SPG-BT-jazmine',  7.0),
    ('SPG-BT-enny',     6.2),
    ('SPG-BT-emaya',    5.5),
    ('SPG-BT-daniel',   4.8),
    ('SPG-BT-lisa',     4.0),
    ('SPG-BT-valerie',  3.5)
  ) AS v(staff_code, supervision_pct)
)
INSERT INTO supervision (practice_id, staff_id, supervision_pct, period_start, period_end)
SELECT p.practice_id, s.id, v.supervision_pct, '2026-06-01', '2026-06-30'
FROM practices p
CROSS JOIN sup_seed v
JOIN staff s ON s.practice_id = p.practice_id AND s.external_code = v.staff_code
WHERE NOT EXISTS (
  SELECT 1 FROM supervision sup
  WHERE sup.staff_id = s.id
    AND sup.period_start = '2026-06-01'
    AND sup.period_end = '2026-06-30'
);

WITH practices AS (
  SELECT unnest(ARRAY[
    'c3d4e5f6-5047-4000-8000-533047000001'::uuid,
    'a1b2c3d4-0000-0000-0000-000000000001'::uuid
  ]) AS practice_id
),
sup_seed AS (
  SELECT * FROM (VALUES
    ('SPG-BT-jazmine',  7.0),
    ('SPG-BT-enny',     6.2),
    ('SPG-BT-emaya',    5.5),
    ('SPG-BT-daniel',   4.8),
    ('SPG-BT-lisa',     4.0),
    ('SPG-BT-valerie',  3.5)
  ) AS v(staff_code, supervision_pct)
)
UPDATE supervision sup
SET supervision_pct = v.supervision_pct
FROM practices p, sup_seed v, staff s
WHERE sup.staff_id = s.id
  AND s.practice_id = p.practice_id
  AND s.external_code = v.staff_code
  AND sup.period_start = '2026-06-01'
  AND sup.period_end = '2026-06-30';
