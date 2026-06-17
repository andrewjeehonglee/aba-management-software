-- =============================================================================
-- Dashboard tile variation — demo-visible states across roles (June 2026)
-- Run AFTER: roster import, seed_roster_demo_activity.sql, staff_full_coverage,
--            jennifer_caseload_visibility, technician_dashboard (optional).
-- Idempotent — safe to re-run on Demo + SPG practices.
--
-- Targets pay period Jun 16–30 (demo date Jun 16) and calendar month June 2026.
--
-- | Role        | Who to preview     | Notes        | Hours        | Supervision | Auth (BCBA) |
-- |-------------|--------------------|--------------|--------------|-------------|-------------|
-- | Technician  | Jazmine            | Urgent       | Healthy      | Healthy     | —           |
-- | Technician  | Valerie            | Monitor      | Healthy      | Urgent      | —           |
-- | Technician  | Lisa               | Urgent       | Urgent       | Urgent      | —           |
-- | Technician  | Daniel             | Healthy      | Urgent       | Urgent      | —           |
-- | Technician  | Emaya              | Healthy      | Healthy      | Healthy     | —           |
-- | Supervisor  | Hilary             | Urgent (self) | —            | —           | —           |
-- | Supervisor  | AJ                 | Monitor      | —            | —           | —           |
-- | Supervisor  | Madeline           | Healthy      | Lisa flagged | Lisa flagged| —           |
-- | BCBA        | Jennifer           | Mixed team   | Lisa+Daniel  | 3 BTs       | IsRi+BrTu   |
-- =============================================================================

-- ─── Shared practice IDs ────────────────────────────────────────────────────

-- ─── 1. Sessions — current pay period note gaps + hours + auth drivers ──────

WITH practices AS (
  SELECT unnest(ARRAY[
    'c3d4e5f6-5047-4000-8000-533047000001'::uuid,
    'a1b2c3d4-0000-0000-0000-000000000001'::uuid
  ]) AS practice_id
),
session_seed AS (
  SELECT * FROM (VALUES
    -- Technicians — note states (Jun 16–30 pay period)
  -- Jazmine: overdue (morning session, later same-day session documented)
    ('PeLe',   'SPG-BT-jazmine',  '2026-06-16T09:00:00-07:00', 'direct',      'completed'),
    ('PeLe',   'SPG-BT-jazmine',  '2026-06-16T14:30:00-07:00', 'direct',      'completed'),
    -- Valerie: missing (no later session yet on demo date)
    ('YaNu',   'SPG-BT-valerie',  '2026-06-18T16:00:00-07:00', 'direct',      'completed'),
    -- Lisa: overdue (same-day pair)
    ('CoTa',   'SPG-BT-lisa',     '2026-06-16T10:00:00-07:00', 'direct',      'completed'),
    ('CoTa',   'SPG-BT-lisa',     '2026-06-16T15:00:00-07:00', 'direct',      'completed'),
    -- Enny: overdue on IsRi
    ('IsRi',   'SPG-BT-enny',     '2026-06-16T09:30:00-07:00', 'direct',      'completed'),
    ('IsRi',   'SPG-BT-enny',     '2026-06-16T14:00:00-07:00', 'direct',      'completed'),

    -- Supervisors — own session notes
    -- Hilary: overdue (PeLe morning, BrTu afternoon)
    ('PeLe',   'SPG-SUP-hilary',  '2026-06-16T10:00:00-07:00', 'supervision', 'completed'),
    ('BrTu',   'SPG-SUP-hilary',  '2026-06-16T15:30:00-07:00', 'supervision', 'completed'),
    -- AJ: missing (later in period)
    ('Ells',   'SPG-SUP-aj',      '2026-06-20T14:00:00-07:00', 'supervision', 'completed'),
    -- Madeline: healthy (complete notes in step 2)
    ('CoTa',   'SPG-SUP-madeline', '2026-06-17T11:00:00-07:00', 'supervision', 'completed'),

    -- BCBA Jennifer — missing note on indirect
    ('AlLo',   'SPG-BCBA-jennifer', '2026-06-22T11:00:00-07:00', 'indirect',    'completed'),

    -- Hours — indirect-heavy for flagged direct % (billable w/ complete notes)
    ('CoTa',   'SPG-BT-lisa',     '2026-06-23T11:00:00-07:00', 'indirect',    'completed'),
    ('LoEl',   'SPG-BT-lisa',     '2026-06-24T13:00:00-07:00', 'indirect',    'completed'),
    ('LoEl',   'SPG-BT-lisa',     '2026-06-25T13:30:00-07:00', 'indirect',    'completed'),
    ('LiBo',   'SPG-BT-daniel',   '2026-06-20T10:00:00-07:00', 'indirect',    'completed'),
    ('LiBo',   'SPG-BT-daniel',   '2026-06-21T10:30:00-07:00', 'indirect',    'completed'),
    ('LiBo',   'SPG-BT-daniel',   '2026-06-24T10:00:00-07:00', 'indirect',    'completed'),
    ('LiBo',   'SPG-BT-daniel',   '2026-06-26T10:30:00-07:00', 'indirect',    'completed'),
    ('LiBo',   'SPG-BT-daniel',   '2026-06-27T11:00:00-07:00', 'indirect',    'completed'),

    -- Auth utilization — push IsRi over 100%, BrTu to ~90% monitor band
    ('IsRi',   'SPG-BT-enny',     '2026-06-25T15:00:00-07:00', 'direct',      'completed'),
    ('IsRi',   'SPG-BT-enny',     '2026-06-26T15:30:00-07:00', 'direct',      'completed'),
    ('IsRi',   'SPG-BT-enny',     '2026-06-27T15:00:00-07:00', 'direct',      'completed'),
    ('BrTu',   'SPG-BT-jazmine',  '2026-06-25T13:00:00-07:00', 'direct',      'completed'),
    ('BrTu',   'SPG-BT-jazmine',  '2026-06-26T13:30:00-07:00', 'direct',      'completed'),
    ('BrTu',   'SPG-BT-jazmine',  '2026-06-27T14:00:00-07:00', 'direct',      'completed')
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


-- ─── 2. Complete SOAP notes (sessions that should NOT count as incomplete) ──

WITH practices AS (
  SELECT unnest(ARRAY[
    'c3d4e5f6-5047-4000-8000-533047000001'::uuid,
    'a1b2c3d4-0000-0000-0000-000000000001'::uuid
  ]) AS practice_id
),
complete_notes AS (
  SELECT * FROM (VALUES
    ('PeLe',   'SPG-BT-jazmine',     '2026-06-16T14:30:00-07:00'),
    ('CoTa',   'SPG-BT-lisa',       '2026-06-16T15:00:00-07:00'),
    ('IsRi',   'SPG-BT-enny',       '2026-06-16T14:00:00-07:00'),
    ('BrTu',   'SPG-SUP-hilary',    '2026-06-16T15:30:00-07:00'),
    ('CoTa',   'SPG-SUP-madeline',  '2026-06-17T11:00:00-07:00'),
    -- Hours + auth drivers
    ('CoTa',   'SPG-BT-lisa',       '2026-06-23T11:00:00-07:00'),
    ('LoEl',   'SPG-BT-lisa',       '2026-06-24T13:00:00-07:00'),
    ('LoEl',   'SPG-BT-lisa',       '2026-06-25T13:30:00-07:00'),
    ('LiBo',   'SPG-BT-daniel',     '2026-06-20T10:00:00-07:00'),
    ('LiBo',   'SPG-BT-daniel',     '2026-06-21T10:30:00-07:00'),
    ('LiBo',   'SPG-BT-daniel',     '2026-06-24T10:00:00-07:00'),
    ('LiBo',   'SPG-BT-daniel',     '2026-06-26T10:30:00-07:00'),
    ('LiBo',   'SPG-BT-daniel',     '2026-06-27T11:00:00-07:00'),
    ('IsRi',   'SPG-BT-enny',       '2026-06-25T15:00:00-07:00'),
    ('IsRi',   'SPG-BT-enny',       '2026-06-26T15:30:00-07:00'),
    ('IsRi',   'SPG-BT-enny',       '2026-06-27T15:00:00-07:00'),
    ('BrTu',   'SPG-BT-jazmine',    '2026-06-25T13:00:00-07:00'),
    ('BrTu',   'SPG-BT-jazmine',    '2026-06-26T13:30:00-07:00'),
    ('BrTu',   'SPG-BT-jazmine',    '2026-06-27T14:00:00-07:00')
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
  'Continue current protocol; supervisor to review next cycle.'
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


-- ─── 3. Supervision % — received by technicians (upsert June 2026) ──────────

WITH practices AS (
  SELECT unnest(ARRAY[
    'c3d4e5f6-5047-4000-8000-533047000001'::uuid,
    'a1b2c3d4-0000-0000-0000-000000000001'::uuid
  ]) AS practice_id
),
sup_seed AS (
  SELECT * FROM (VALUES
    ('SPG-BT-jazmine',  7.0),   -- compliant
    ('SPG-BT-enny',     6.5),   -- compliant
    ('SPG-BT-emaya',    5.8),   -- compliant
    ('SPG-BT-daniel',   4.2),   -- below 5% → Urgent
    ('SPG-BT-lisa',     3.8),   -- below 5% → Urgent
    ('SPG-BT-valerie',  3.2)    -- below 5% → Urgent
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
    ('SPG-BT-enny',     6.5),
    ('SPG-BT-emaya',    5.8),
    ('SPG-BT-daniel',   4.2),
    ('SPG-BT-lisa',     3.8),
    ('SPG-BT-valerie',  3.2)
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
