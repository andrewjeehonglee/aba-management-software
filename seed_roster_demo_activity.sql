-- =============================================================================
-- Phase 7 Slice #7d — Roster demo activity seed (June 2026)
-- =============================================================================
--
-- Run in Supabase SQL Editor AFTER: npm run import:roster -- --all
-- Idempotent — safe to re-run. Resolves IDs by (practice_id, external_code).
--
-- Practices seeded identically:
--   SPG  c3d4e5f6-5047-4000-8000-533047000001
--   Demo a1b2c3d4-0000-0000-0000-000000000001
-- =============================================================================

-- ─── 1. Authorizations (16 roster clients per practice) ───────────────────────

INSERT INTO authorizations
  (practice_id, client_id, authorized_units, used_units, cpt_code, start_date, end_date)
SELECT
  c.practice_id,
  c.id,
  CASE c.external_code
    WHEN 'PeLe'   THEN 11
    WHEN 'IsRi'   THEN 10
    WHEN 'BrTu'   THEN 10
    WHEN 'CoTa'   THEN 95
    WHEN 'ViReMo' THEN 88
    WHEN 'LoEl'   THEN 82
    WHEN 'Ells'   THEN 100
    WHEN 'AlLo'   THEN 90
    WHEN 'LiBo'   THEN 85
    WHEN 'YaNu'   THEN 80
    WHEN 'ZiTr'   THEN 75
    ELSE 100
  END,
  0,
  '97153',
  '2026-01-01',
  '2026-06-30'
FROM clients c
WHERE c.external_code IS NOT NULL
  AND c.status = 'active'
  AND c.practice_id IN (
    'c3d4e5f6-5047-4000-8000-533047000001',
    'a1b2c3d4-0000-0000-0000-000000000001'
  )
  AND NOT EXISTS (
    SELECT 1 FROM authorizations a WHERE a.client_id = c.id
  );


-- ─── 2. Sessions — June 2026 ────────────────────────────────────────────────
-- note_flag: complete | missing | partial (for session_notes step)

WITH practices AS (
  SELECT unnest(ARRAY[
    'c3d4e5f6-5047-4000-8000-533047000001'::uuid,
    'a1b2c3d4-0000-0000-0000-000000000001'::uuid
  ]) AS practice_id
),
session_seed AS (
  SELECT * FROM (VALUES
    -- Jennifer caseload — Jazmine (PeLe ~91% util: 10 completed hrs / auth 11)
    ('PeLe',    'SPG-BT-jazmine',     '2026-06-02T09:00:00-07:00', 'completed',   'direct',      'complete'),
    ('PeLe',    'SPG-BT-jazmine',     '2026-06-03T10:00:00-07:00', 'completed',   'direct',      'complete'),
    ('PeLe',    'SPG-BT-jazmine',     '2026-06-04T11:00:00-07:00', 'completed',   'direct',      'complete'),
    ('PeLe',    'SPG-BT-jazmine',     '2026-06-05T09:30:00-07:00', 'completed',   'direct',      'complete'),
    ('PeLe',    'SPG-BT-jazmine',     '2026-06-06T08:00:00-07:00', 'completed',   'direct',      'complete'),
    ('PeLe',    'SPG-BT-jazmine',     '2026-06-09T09:00:00-07:00', 'completed',   'direct',      'complete'),
    ('PeLe',    'SPG-BT-jazmine',     '2026-06-10T10:30:00-07:00', 'completed',   'direct',      'missing'),
    ('PeLe',    'SPG-BT-jazmine',     '2026-06-11T09:00:00-07:00', 'completed',   'direct',      'complete'),
    ('PeLe',    'SPG-BT-jazmine',     '2026-06-12T14:00:00-07:00', 'scheduled',   'direct',      'missing'),
    ('PeLe',    'SPG-BT-jazmine',     '2026-06-16T09:00:00-07:00', 'completed',   'direct',      'complete'),
    ('PeLe',    'SPG-BT-jazmine',     '2026-06-17T09:00:00-07:00', 'completed',   'direct',      'complete'),
    ('PeLe',    'SPG-BT-jazmine',     '2026-06-18T09:00:00-07:00', 'completed',   'direct',      'complete'),
    ('BrTu',    'SPG-BT-jazmine',     '2026-06-03T13:00:00-07:00', 'completed',   'direct',      'complete'),
    ('BrTu',    'SPG-BT-jazmine',     '2026-06-05T13:30:00-07:00', 'completed',   'direct',      'complete'),
    ('BrTu',    'SPG-BT-jazmine',     '2026-06-08T10:00:00-07:00', 'cancelled',   'direct',      'missing'),
    ('BrTu',    'SPG-BT-jazmine',     '2026-06-09T11:00:00-07:00', 'completed',   'direct',      'missing'),
    ('BrTu',    'SPG-BT-jazmine',     '2026-06-13T13:00:00-07:00', 'completed',   'direct',      'partial'),
    -- Enny
    ('Ells',    'SPG-BT-enny',        '2026-06-02T14:00:00-07:00', 'completed',   'direct',      'complete'),
    ('Ells',    'SPG-BT-enny',        '2026-06-04T14:30:00-07:00', 'completed',   'direct',      'complete'),
    ('Ells',    'SPG-BT-enny',        '2026-06-06T15:00:00-07:00', 'completed',   'direct',      'complete'),
    ('Ells',    'SPG-BT-enny',        '2026-06-11T14:00:00-07:00', 'completed',   'direct',      'complete'),
    ('Ells',    'SPG-BT-enny',        '2026-06-18T14:00:00-07:00', 'completed',   'direct',      'complete'),
    ('IsRi',    'SPG-BT-enny',        '2026-06-03T15:00:00-07:00', 'completed',   'direct',      'complete'),
    ('IsRi',    'SPG-BT-enny',        '2026-06-05T15:30:00-07:00', 'completed',   'direct',      'complete'),
    ('IsRi',    'SPG-BT-enny',        '2026-06-07T14:00:00-07:00', 'completed',   'direct',      'complete'),
    ('IsRi',    'SPG-BT-enny',        '2026-06-10T15:00:00-07:00', 'completed',   'direct',      'complete'),
    ('IsRi',    'SPG-BT-enny',        '2026-06-12T14:30:00-07:00', 'completed',   'direct',      'complete'),
    ('IsRi',    'SPG-BT-enny',        '2026-06-13T15:00:00-07:00', 'completed',   'direct',      'complete'),
    ('IsRi',    'SPG-BT-enny',        '2026-06-17T14:00:00-07:00', 'completed',   'direct',      'complete'),
    ('IsRi',    'SPG-BT-enny',        '2026-06-19T15:00:00-07:00', 'completed',   'direct',      'complete'),
    ('IsRi',    'SPG-BT-enny',        '2026-06-20T14:00:00-07:00', 'completed',   'direct',      'complete'),
    -- Emaya, Daniel, Lisa
    ('AlLo',    'SPG-BT-emaya',       '2026-06-04T08:00:00-07:00', 'completed',   'direct',      'complete'),
    ('AlLo',    'SPG-BT-emaya',       '2026-06-11T08:30:00-07:00', 'completed',  'direct',      'complete'),
    ('AlLo',    'SPG-BT-emaya',       '2026-06-18T08:00:00-07:00', 'completed',  'direct',      'complete'),
    ('AlLo',    'SPG-BT-emaya',       '2026-06-25T08:30:00-07:00', 'completed',  'direct',      'complete'),
    ('LiBo',    'SPG-BT-daniel',      '2026-06-05T10:00:00-07:00', 'completed',   'direct',      'complete'),
    ('LiBo',    'SPG-BT-daniel',      '2026-06-12T10:30:00-07:00', 'completed',   'direct',      'complete'),
    ('LiBo',    'SPG-BT-daniel',      '2026-06-19T10:00:00-07:00', 'completed',   'direct',      'complete'),
    ('LiBo',    'SPG-BT-daniel',      '2026-06-26T10:30:00-07:00', 'completed',   'direct',      'complete'),
    ('CoTa',    'SPG-BT-lisa',        '2026-06-06T11:00:00-07:00', 'completed',   'direct',      'complete'),
    ('CoTa',    'SPG-BT-lisa',        '2026-06-13T11:30:00-07:00', 'completed',   'direct',      'complete'),
    ('CoTa',    'SPG-BT-lisa',        '2026-06-15T12:00:00-07:00', 'scheduled',   'direct',      'missing'),
    ('CoTa',    'SPG-BT-lisa',        '2026-06-20T11:00:00-07:00', 'completed',   'direct',      'complete'),
    ('CoTa',    'SPG-BT-lisa',        '2026-06-27T11:30:00-07:00', 'completed',   'direct',      'complete'),
    ('LoEl',    'SPG-BT-lisa',        '2026-06-07T13:00:00-07:00', 'completed',   'direct',      'complete'),
    ('LoEl',    'SPG-BT-lisa',        '2026-06-14T13:30:00-07:00', 'completed',   'direct',      'complete'),
    ('LoEl',    'SPG-BT-lisa',        '2026-06-21T13:00:00-07:00', 'completed',   'direct',      'complete'),
    ('LoEl',    'SPG-BT-lisa',        '2026-06-28T13:30:00-07:00', 'completed',   'direct',      'complete'),
    -- Blair caseload
    ('ViReMo',  'SPG-BT-jazmine',     '2026-06-08T15:00:00-07:00', 'completed',   'direct',      'complete'),
    ('ViReMo',  'SPG-BT-jazmine',     '2026-06-15T15:30:00-07:00', 'completed',   'direct',      'complete'),
    ('ViReMo',  'SPG-BT-jazmine',     '2026-06-22T15:00:00-07:00', 'completed',   'direct',      'complete'),
    ('LaGu',    'SPG-BCBA-blair',     '2026-06-10T16:00:00-07:00', 'completed',   'supervision', 'complete'),
    ('LaGu',    'SPG-BCBA-blair',     '2026-06-17T16:00:00-07:00', 'completed',   'indirect',    'complete'),
    ('SuAz',    'SPG-BCBA-blair',     '2026-06-24T16:00:00-07:00', 'completed',   'supervision', 'complete'),
    -- Annie caseload
    ('LuMa',    'SPG-BCBA-annie',     '2026-06-09T08:00:00-07:00', 'completed',   'supervision', 'complete'),
    ('EzHe',    'SPG-BCBA-annie',     '2026-06-16T08:30:00-07:00', 'completed',   'indirect',    'complete'),
    ('GrMa',    'SPG-BCBA-annie',     '2026-06-23T09:00:00-07:00', 'completed',   'supervision', 'complete'),
    ('YaNu',    'SPG-BT-valerie',     '2026-06-04T16:00:00-07:00', 'completed',   'direct',      'complete'),
    ('YaNu',    'SPG-BT-valerie',     '2026-06-11T16:30:00-07:00', 'completed',   'direct',      'complete'),
    ('YaNu',    'SPG-BT-valerie',     '2026-06-18T16:00:00-07:00', 'completed',   'direct',      'complete'),
    ('ZiTr',    'SPG-BT-valerie',     '2026-06-05T17:00:00-07:00', 'completed',   'direct',      'complete'),
    ('ZiTr',    'SPG-BT-valerie',     '2026-06-12T17:30:00-07:00', 'completed',   'direct',      'complete'),
    ('ZiTr',    'SPG-BT-valerie',     '2026-06-19T17:00:00-07:00', 'completed',   'direct',      'complete'),
    -- Jennifer BCBA supervision / indirect on caseload
    ('PeLe',    'SPG-BCBA-jennifer',  '2026-06-06T11:00:00-07:00', 'completed',   'supervision', 'complete'),
    ('BrTu',    'SPG-BCBA-jennifer',  '2026-06-13T11:30:00-07:00', 'completed',   'indirect',    'complete'),
    ('LoEl',    'SPG-BCBA-jennifer',  '2026-06-20T11:00:00-07:00', 'completed',   'supervision', 'complete')
  ) AS v(client_code, staff_code, scheduled_at, status, session_type, note_flag)
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
JOIN staff s
  ON s.practice_id = p.practice_id
 AND s.external_code = v.staff_code
WHERE NOT EXISTS (
  SELECT 1
  FROM sessions existing
  WHERE existing.practice_id = p.practice_id
    AND existing.client_id = c.id
    AND existing.staff_id = s.id
    AND existing.scheduled_at = v.scheduled_at::timestamptz
);


-- ─── 3. Session notes (complete SOAP) ───────────────────────────────────────

WITH practices AS (
  SELECT unnest(ARRAY[
    'c3d4e5f6-5047-4000-8000-533047000001'::uuid,
    'a1b2c3d4-0000-0000-0000-000000000001'::uuid
  ]) AS practice_id
),
note_seed AS (
  SELECT * FROM (VALUES
    ('PeLe',    'SPG-BT-jazmine',     '2026-06-02T09:00:00-07:00'),
    ('PeLe',    'SPG-BT-jazmine',     '2026-06-03T10:00:00-07:00'),
    ('PeLe',    'SPG-BT-jazmine',     '2026-06-04T11:00:00-07:00'),
    ('PeLe',    'SPG-BT-jazmine',     '2026-06-05T09:30:00-07:00'),
    ('PeLe',    'SPG-BT-jazmine',     '2026-06-06T08:00:00-07:00'),
    ('PeLe',    'SPG-BT-jazmine',     '2026-06-09T09:00:00-07:00'),
    ('PeLe',    'SPG-BT-jazmine',     '2026-06-11T09:00:00-07:00'),
    ('PeLe',    'SPG-BT-jazmine',     '2026-06-16T09:00:00-07:00'),
    ('PeLe',    'SPG-BT-jazmine',     '2026-06-17T09:00:00-07:00'),
    ('PeLe',    'SPG-BT-jazmine',     '2026-06-18T09:00:00-07:00'),
    ('BrTu',    'SPG-BT-jazmine',     '2026-06-03T13:00:00-07:00'),
    ('BrTu',    'SPG-BT-jazmine',     '2026-06-05T13:30:00-07:00'),
    ('Ells',    'SPG-BT-enny',        '2026-06-02T14:00:00-07:00'),
    ('Ells',    'SPG-BT-enny',        '2026-06-04T14:30:00-07:00'),
    ('Ells',    'SPG-BT-enny',        '2026-06-06T15:00:00-07:00'),
    ('Ells',    'SPG-BT-enny',        '2026-06-11T14:00:00-07:00'),
    ('Ells',    'SPG-BT-enny',        '2026-06-18T14:00:00-07:00'),
    ('IsRi',    'SPG-BT-enny',        '2026-06-03T15:00:00-07:00'),
    ('IsRi',    'SPG-BT-enny',        '2026-06-05T15:30:00-07:00'),
    ('IsRi',    'SPG-BT-enny',        '2026-06-07T14:00:00-07:00'),
    ('IsRi',    'SPG-BT-enny',        '2026-06-10T15:00:00-07:00'),
    ('IsRi',    'SPG-BT-enny',        '2026-06-12T14:30:00-07:00'),
    ('IsRi',    'SPG-BT-enny',        '2026-06-13T15:00:00-07:00'),
    ('IsRi',    'SPG-BT-enny',        '2026-06-17T14:00:00-07:00'),
    ('IsRi',    'SPG-BT-enny',        '2026-06-19T15:00:00-07:00'),
    ('IsRi',    'SPG-BT-enny',        '2026-06-20T14:00:00-07:00'),
    ('AlLo',    'SPG-BT-emaya',       '2026-06-04T08:00:00-07:00'),
    ('AlLo',    'SPG-BT-emaya',       '2026-06-11T08:30:00-07:00'),
    ('AlLo',    'SPG-BT-emaya',       '2026-06-18T08:00:00-07:00'),
    ('AlLo',    'SPG-BT-emaya',       '2026-06-25T08:30:00-07:00'),
    ('LiBo',    'SPG-BT-daniel',      '2026-06-05T10:00:00-07:00'),
    ('LiBo',    'SPG-BT-daniel',      '2026-06-12T10:30:00-07:00'),
    ('LiBo',    'SPG-BT-daniel',      '2026-06-19T10:00:00-07:00'),
    ('LiBo',    'SPG-BT-daniel',      '2026-06-26T10:30:00-07:00'),
    ('CoTa',    'SPG-BT-lisa',        '2026-06-06T11:00:00-07:00'),
    ('CoTa',    'SPG-BT-lisa',        '2026-06-13T11:30:00-07:00'),
    ('CoTa',    'SPG-BT-lisa',        '2026-06-20T11:00:00-07:00'),
    ('CoTa',    'SPG-BT-lisa',        '2026-06-27T11:30:00-07:00'),
    ('LoEl',    'SPG-BT-lisa',        '2026-06-07T13:00:00-07:00'),
    ('LoEl',    'SPG-BT-lisa',        '2026-06-14T13:30:00-07:00'),
    ('LoEl',    'SPG-BT-lisa',        '2026-06-21T13:00:00-07:00'),
    ('LoEl',    'SPG-BT-lisa',        '2026-06-28T13:30:00-07:00'),
    ('ViReMo',  'SPG-BT-jazmine',     '2026-06-08T15:00:00-07:00'),
    ('ViReMo',  'SPG-BT-jazmine',     '2026-06-15T15:30:00-07:00'),
    ('ViReMo',  'SPG-BT-jazmine',     '2026-06-22T15:00:00-07:00'),
    ('LaGu',    'SPG-BCBA-blair',     '2026-06-10T16:00:00-07:00'),
    ('LaGu',    'SPG-BCBA-blair',     '2026-06-17T16:00:00-07:00'),
    ('SuAz',    'SPG-BCBA-blair',     '2026-06-24T16:00:00-07:00'),
    ('LuMa',    'SPG-BCBA-annie',     '2026-06-09T08:00:00-07:00'),
    ('EzHe',    'SPG-BCBA-annie',     '2026-06-16T08:30:00-07:00'),
    ('GrMa',    'SPG-BCBA-annie',     '2026-06-23T09:00:00-07:00'),
    ('YaNu',    'SPG-BT-valerie',     '2026-06-04T16:00:00-07:00'),
    ('YaNu',    'SPG-BT-valerie',     '2026-06-11T16:30:00-07:00'),
    ('YaNu',    'SPG-BT-valerie',     '2026-06-18T16:00:00-07:00'),
    ('ZiTr',    'SPG-BT-valerie',     '2026-06-05T17:00:00-07:00'),
    ('ZiTr',    'SPG-BT-valerie',     '2026-06-12T17:30:00-07:00'),
    ('ZiTr',    'SPG-BT-valerie',     '2026-06-19T17:00:00-07:00'),
    ('PeLe',    'SPG-BCBA-jennifer',  '2026-06-06T11:00:00-07:00'),
    ('BrTu',    'SPG-BCBA-jennifer',  '2026-06-13T11:30:00-07:00'),
    ('LoEl',    'SPG-BCBA-jennifer',  '2026-06-20T11:00:00-07:00')
  ) AS v(client_code, staff_code, scheduled_at)
)
INSERT INTO session_notes
  (practice_id, session_id, client_id, staff_id, subjective, objective, assessment, plan)
SELECT
  sess.practice_id,
  sess.id,
  sess.client_id,
  sess.staff_id,
  'Client presented regulated; caregiver reported stable morning routine.',
  'Programs run per treatment plan. Data collected on all active targets.',
  'Progress aligns with authorization goals for this reporting period.',
  'Continue current protocol; BCBA to review targets next supervision cycle.'
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
WHERE NOT EXISTS (
  SELECT 1 FROM session_notes n WHERE n.session_id = sess.id
);


-- ─── 3b. Partial note (BrTu — incomplete SOAP) ───────────────────────────────

WITH practices AS (
  SELECT unnest(ARRAY[
    'c3d4e5f6-5047-4000-8000-533047000001'::uuid,
    'a1b2c3d4-0000-0000-0000-000000000001'::uuid
  ]) AS practice_id
)
INSERT INTO session_notes
  (practice_id, session_id, client_id, staff_id, subjective, objective, assessment, plan)
SELECT
  sess.practice_id,
  sess.id,
  sess.client_id,
  sess.staff_id,
  'Session started late due to transition difficulty.',
  '',
  '',
  ''
FROM practices p
JOIN clients c ON c.practice_id = p.practice_id AND c.external_code = 'BrTu'
JOIN staff s ON s.practice_id = p.practice_id AND s.external_code = 'SPG-BT-jazmine'
JOIN sessions sess
  ON sess.practice_id = p.practice_id
 AND sess.client_id = c.id
 AND sess.staff_id = s.id
 AND sess.scheduled_at = '2026-06-13T13:00:00-07:00'::timestamptz
WHERE NOT EXISTS (
  SELECT 1 FROM session_notes n WHERE n.session_id = sess.id
);


-- ─── 4. Supervision — June 2026 roster technicians ─────────────────────────

WITH practices AS (
  SELECT unnest(ARRAY[
    'c3d4e5f6-5047-4000-8000-533047000001'::uuid,
    'a1b2c3d4-0000-0000-0000-000000000001'::uuid
  ]) AS practice_id
),
supervision_seed AS (
  SELECT * FROM (VALUES
    ('SPG-BT-jazmine',  4),
    ('SPG-BT-enny',     3),
    ('SPG-BT-emaya',   12),
    ('SPG-BT-daniel',   8),
    ('SPG-BT-lisa',    15),
    ('SPG-BT-valerie', 10)
  ) AS v(staff_code, supervision_pct)
)
INSERT INTO supervision (practice_id, staff_id, supervision_pct, period_start, period_end)
SELECT
  p.practice_id,
  s.id,
  v.supervision_pct,
  '2026-06-01',
  '2026-06-30'
FROM practices p
CROSS JOIN supervision_seed v
JOIN staff s
  ON s.practice_id = p.practice_id
 AND s.external_code = v.staff_code
WHERE NOT EXISTS (
  SELECT 1
  FROM supervision sup
  WHERE sup.staff_id = s.id
    AND sup.period_start = '2026-06-01'
    AND sup.period_end = '2026-06-30'
);


-- ─── Verification (uncomment after seed) ────────────────────────────────────

-- SELECT c.external_code, COUNT(*) AS june_sessions
-- FROM sessions s
-- JOIN clients c ON c.id = s.client_id
-- WHERE c.external_code IS NOT NULL
--   AND s.scheduled_at >= '2026-06-01' AND s.scheduled_at < '2026-07-01'
--   AND c.practice_id = 'a1b2c3d4-0000-0000-0000-000000000001'
-- GROUP BY c.external_code ORDER BY c.external_code;

-- SELECT st.full_name, COUNT(*) FILTER (WHERE sn.id IS NULL) AS missing_notes
-- FROM sessions s
-- JOIN staff st ON st.id = s.staff_id
-- LEFT JOIN session_notes sn ON sn.session_id = s.id
-- WHERE st.external_code LIKE 'SPG-BT-%'
--   AND s.status = 'completed'
--   AND s.scheduled_at >= '2026-06-01' AND s.scheduled_at < '2026-07-01'
--   AND s.practice_id = 'a1b2c3d4-0000-0000-0000-000000000001'
-- GROUP BY st.full_name;

-- SELECT c.external_code, a.authorized_units,
--   COUNT(*) FILTER (WHERE s.status = 'completed' AND sn.id IS NOT NULL
--     AND sn.subjective <> '' AND sn.objective <> '') AS billed_sessions
-- FROM clients c
-- JOIN authorizations a ON a.client_id = c.id
-- LEFT JOIN sessions s ON s.client_id = c.id
--   AND s.scheduled_at >= '2026-06-01' AND s.scheduled_at < '2026-07-01'
-- LEFT JOIN session_notes sn ON sn.session_id = s.id
-- WHERE c.practice_id = 'a1b2c3d4-0000-0000-0000-000000000001'
--   AND c.external_code IN ('PeLe', 'IsRi', 'BrTu')
-- GROUP BY c.external_code, a.authorized_units;
