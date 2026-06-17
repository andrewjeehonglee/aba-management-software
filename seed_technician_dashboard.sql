-- =============================================================================
-- Technician dashboard — differentiated hours mix (June 2026)
-- Run AFTER roster import + demo activity + staff_full_coverage seeds.
-- Idempotent. Ensures each RBT has billable hours with varied direct % for
-- the "My hours" tile (at least one below 50% direct, others on track).
-- =============================================================================

WITH practices AS (
  SELECT unnest(ARRAY[
    'c3d4e5f6-5047-4000-8000-533047000001'::uuid,
    'a1b2c3d4-0000-0000-0000-000000000001'::uuid
  ]) AS practice_id
),
indirect_seed AS (
  SELECT * FROM (VALUES
    -- Lisa — indirect-heavy month → below 50% direct (Urgent hours tile)
    ('CoTa', 'SPG-BT-lisa', '2026-06-12T11:00:00-07:00', 'indirect'),
    ('CoTa', 'SPG-BT-lisa', '2026-06-15T11:30:00-07:00', 'indirect'),
    ('LoEl', 'SPG-BT-lisa', '2026-06-16T13:00:00-07:00', 'indirect'),
    ('LoEl', 'SPG-BT-lisa', '2026-06-19T13:30:00-07:00', 'indirect'),
    ('CoTa', 'SPG-BT-lisa', '2026-06-22T11:00:00-07:00', 'indirect'),
    -- Valerie — one indirect to keep hours visible, still compliant direct %
    ('YaNu', 'SPG-BT-valerie', '2026-06-15T16:00:00-07:00', 'indirect'),
    -- Daniel — balanced indirect for popover variety
    ('LiBo', 'SPG-BT-daniel', '2026-06-15T10:00:00-07:00', 'indirect'),
    ('LiBo', 'SPG-BT-daniel', '2026-06-18T10:30:00-07:00', 'indirect')
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
CROSS JOIN indirect_seed v
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

WITH practices AS (
  SELECT unnest(ARRAY[
    'c3d4e5f6-5047-4000-8000-533047000001'::uuid,
    'a1b2c3d4-0000-0000-0000-000000000001'::uuid
  ]) AS practice_id
),
note_seed AS (
  SELECT * FROM (VALUES
    ('CoTa', 'SPG-BT-lisa', '2026-06-12T11:00:00-07:00'),
    ('CoTa', 'SPG-BT-lisa', '2026-06-15T11:30:00-07:00'),
    ('LoEl', 'SPG-BT-lisa', '2026-06-16T13:00:00-07:00'),
    ('LoEl', 'SPG-BT-lisa', '2026-06-19T13:30:00-07:00'),
    ('CoTa', 'SPG-BT-lisa', '2026-06-22T11:00:00-07:00'),
    ('YaNu', 'SPG-BT-valerie', '2026-06-15T16:00:00-07:00'),
    ('LiBo', 'SPG-BT-daniel', '2026-06-15T10:00:00-07:00'),
    ('LiBo', 'SPG-BT-daniel', '2026-06-18T10:30:00-07:00')
  ) AS v(client_code, staff_code, scheduled_at)
)
INSERT INTO session_notes
  (practice_id, session_id, client_id, staff_id, subjective, objective, assessment, plan)
SELECT
  sess.practice_id,
  sess.id,
  sess.client_id,
  sess.staff_id,
  'Indirect session completed per treatment plan.',
  'Documentation and program preparation completed.',
  'Ready for next direct session.',
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
