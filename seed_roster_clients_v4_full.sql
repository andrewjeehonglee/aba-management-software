-- =============================================================================
-- Pulse Client Profile v4 — PROMPT 1
-- Full roster clinical + activity seed (16 client codes)
-- =============================================================================
--
-- Run once in Supabase SQL Editor. Idempotent — safe to re-run.
-- Resolves all IDs from clients / staff / client_assignments (no hardcoded UUIDs).
--
-- Seed order (FK-safe):
--   1. sessions  2. session_notes  3. behaviors  4. goals  5. behavior_incidents
--
-- Schema notes (from migrations + src/lib/supabase.ts):
--   behaviors: name, description  (no definition / measurement_type columns)
--   goals: status in ('in-progress','hold','mastered','discontinued')
--   sessions: status in ('completed','scheduled','cancelled','in-progress','no-show')
--   behavior_incidents.intensity: 'Low' | 'Medium' | 'High'
-- =============================================================================


-- ─── Shared roster filter ───────────────────────────────────────────────────

-- Roster codes (templates/roster_import.csv)
-- PeLe BrTu Ells AlLo LiBo IsRi CoTa LoEl ViReMo LaGu SuAz LuMa EzHe GrMa YaNu ZiTr


-- ─── 1. SESSIONS ────────────────────────────────────────────────────────────
-- ~12 completed weekdays (last 4 weeks), 1 cancelled, up to 3 upcoming scheduled.
-- Only for roster clients with zero sessions.

WITH roster AS (
  SELECT c.id, c.practice_id, c.external_code, c.assigned_staff_id
  FROM clients c
  WHERE c.status = 'active'
    AND c.external_code IN (
      'PeLe','BrTu','Ells','AlLo','LiBo','IsRi','CoTa','LoEl',
      'ViReMo','LaGu','SuAz','LuMa','EzHe','GrMa','YaNu','ZiTr'
    )
),
client_staff AS (
  SELECT
    r.id            AS client_id,
    r.practice_id,
    r.external_code,
    COALESCE(
      r.assigned_staff_id,
      (SELECT ca.staff_id
       FROM client_assignments ca
       WHERE ca.client_id = r.id
         AND ca.assignment_role = 'primary_bt'
         AND ca.is_active
       LIMIT 1),
      (SELECT ca.staff_id
       FROM client_assignments ca
       WHERE ca.client_id = r.id
         AND ca.assignment_role = 'primary_bcba'
         AND ca.is_active
       LIMIT 1),
      (SELECT st.id
       FROM staff st
       WHERE st.practice_id = r.practice_id
         AND st.status = 'active'
         AND st.role IN ('technician', 'supervisor', 'bcba')
       ORDER BY
         CASE st.role WHEN 'technician' THEN 1 WHEN 'supervisor' THEN 2 ELSE 3 END,
         st.id
       LIMIT 1)
    ) AS staff_id
  FROM roster r
  WHERE NOT EXISTS (SELECT 1 FROM sessions s WHERE s.client_id = r.id)
),
weekdays AS (
  SELECT d::date AS session_day
  FROM generate_series(CURRENT_DATE - 28, CURRENT_DATE + 14, '1 day'::interval) AS d
  WHERE EXTRACT(ISODOW FROM d) <= 5
),
past_days AS (
  SELECT
    cs.client_id,
    cs.practice_id,
    cs.staff_id,
    w.session_day,
    ROW_NUMBER() OVER (PARTITION BY cs.client_id ORDER BY w.session_day DESC) AS rev_rn
  FROM client_staff cs
  CROSS JOIN weekdays w
  WHERE w.session_day <= CURRENT_DATE
    AND cs.staff_id IS NOT NULL
),
future_days AS (
  SELECT
    cs.client_id,
    cs.practice_id,
    cs.staff_id,
    w.session_day,
    ROW_NUMBER() OVER (PARTITION BY cs.client_id ORDER BY w.session_day) AS fwd_rn
  FROM client_staff cs
  CROSS JOIN weekdays w
  WHERE w.session_day > CURRENT_DATE
    AND cs.staff_id IS NOT NULL
)
INSERT INTO sessions (practice_id, client_id, staff_id, session_type, status, scheduled_at)
SELECT
  practice_id,
  client_id,
  staff_id,
  'direct',
  CASE
    WHEN rev_rn = 6 THEN 'cancelled'
    ELSE 'completed'
  END,
  ((session_day + TIME '09:00') + ((hashtext(client_id::text) % 4) * INTERVAL '1 hour'))
    AT TIME ZONE 'America/Los_Angeles'
FROM past_days
WHERE rev_rn <= 12

UNION ALL

SELECT
  practice_id,
  client_id,
  staff_id,
  'direct',
  'scheduled',
  ((session_day + TIME '10:00') + ((hashtext(client_id::text) % 3) * INTERVAL '30 minutes'))
    AT TIME ZONE 'America/Los_Angeles'
FROM future_days
WHERE fwd_rn <= 3;


-- ─── 2. SESSION NOTES ─────────────────────────────────────────────────────────
-- Full SOAP for completed sessions EXCEPT the 2 most recent completed per client
-- (those stay noteless → "Due" in session notes view).

WITH roster AS (
  SELECT c.id
  FROM clients c
  WHERE c.status = 'active'
    AND c.external_code IN (
      'PeLe','BrTu','Ells','AlLo','LiBo','IsRi','CoTa','LoEl',
      'ViReMo','LaGu','SuAz','LuMa','EzHe','GrMa','YaNu','ZiTr'
    )
),
recent_due AS (
  SELECT s.id AS session_id
  FROM (
    SELECT
      s.id,
      ROW_NUMBER() OVER (PARTITION BY s.client_id ORDER BY s.scheduled_at DESC) AS rn
    FROM sessions s
    JOIN roster r ON r.id = s.client_id
    WHERE s.status = 'completed'
  ) s
  WHERE s.rn <= 2
)
INSERT INTO session_notes
  (practice_id, session_id, client_id, staff_id, subjective, objective, assessment, plan)
SELECT
  s.practice_id,
  s.id,
  s.client_id,
  s.staff_id,
  'Caregiver reports a typical morning. No medication changes since last session.',
  'Client engaged in structured trials for 45 minutes. '
    || 'Completed target programs with moderate prompting. '
    || 'One brief transition difficulty resolved with visual schedule.',
  'Progress is steady across active programs. '
    || 'Transition support remains a focus area.',
  'Continue current reinforcement schedule. '
    || 'Probe generalization with a novel instructor next session.'
FROM sessions s
JOIN roster r ON r.id = s.client_id
WHERE s.status = 'completed'
  AND s.scheduled_at >= (CURRENT_DATE - 28)
  AND NOT EXISTS (SELECT 1 FROM session_notes n WHERE n.session_id = s.id)
  AND s.id NOT IN (SELECT session_id FROM recent_due);


-- ─── 2b. DUE QUEUE — strip notes from 2 most recent completed per client ─────
-- Prior roster activity seeds may have already noted every session; this ensures
-- the session-notes Due section always has 1–2 real examples. Idempotent.

WITH roster AS (
  SELECT c.id
  FROM clients c
  WHERE c.status = 'active'
    AND c.external_code IN (
      'PeLe','BrTu','Ells','AlLo','LiBo','IsRi','CoTa','LoEl',
      'ViReMo','LaGu','SuAz','LuMa','EzHe','GrMa','YaNu','ZiTr'
    )
),
due_sessions AS (
  SELECT s.id AS session_id
  FROM (
    SELECT
      s.id,
      ROW_NUMBER() OVER (PARTITION BY s.client_id ORDER BY s.scheduled_at DESC) AS rn
    FROM sessions s
    JOIN roster r ON r.id = s.client_id
    WHERE s.status = 'completed'
  ) s
  WHERE s.rn <= 2
)
DELETE FROM session_notes sn
USING due_sessions d
WHERE sn.session_id = d.session_id;


-- ─── 3. BEHAVIORS ─────────────────────────────────────────────────────────────
-- 3 per empty client. Column is `description`, not definition.

INSERT INTO behaviors (practice_id, client_id, name, description)
SELECT
  c.practice_id,
  c.id,
  b.name,
  b.description
FROM clients c
CROSS JOIN (
  VALUES
    ('Elopement', 'Leaves the designated area without permission'),
    ('Vocal stereotypy', 'Repetitive non-contextual vocalizations; duration recorded'),
    ('Non-compliance', 'Refuses a demand within 10 seconds of instruction'),
    ('Aggression (hitting)', 'Open or closed-hand contact toward another person'),
    ('Self-injurious behavior', 'Head-hitting or skin-picking; counted per occurrence'),
    ('Property destruction', 'Throwing or breaking materials; counted per episode')
) AS b(name, description)
WHERE c.status = 'active'
  AND c.external_code IN (
    'PeLe','BrTu','Ells','AlLo','LiBo','IsRi','CoTa','LoEl',
    'ViReMo','LaGu','SuAz','LuMa','EzHe','GrMa','YaNu','ZiTr'
  )
  AND NOT EXISTS (SELECT 1 FROM behaviors x WHERE x.client_id = c.id)
  AND (
    (abs(hashtext(c.id::text)) % 6 = 0 AND b.name IN ('Elopement','Vocal stereotypy','Non-compliance'))
    OR (abs(hashtext(c.id::text)) % 6 = 1 AND b.name IN ('Aggression (hitting)','Vocal stereotypy','Non-compliance'))
    OR (abs(hashtext(c.id::text)) % 6 = 2 AND b.name IN ('Elopement','Self-injurious behavior','Non-compliance'))
    OR (abs(hashtext(c.id::text)) % 6 = 3 AND b.name IN ('Property destruction','Vocal stereotypy','Non-compliance'))
    OR (abs(hashtext(c.id::text)) % 6 = 4 AND b.name IN ('Elopement','Aggression (hitting)','Self-injurious behavior'))
    OR (abs(hashtext(c.id::text)) % 6 = 5 AND b.name IN ('Non-compliance','Vocal stereotypy','Property destruction'))
  );


-- ─── 4. GOALS ─────────────────────────────────────────────────────────────────
-- 4 per empty client with mixed statuses and streak stats.

INSERT INTO goals
  (practice_id, client_id, name, mastery_criteria, domain, status,
   streak_days, streak_percent, last_updated_days_ago)
SELECT
  c.practice_id,
  c.id,
  g.name,
  g.mastery_criteria,
  g.domain,
  g.status,
  g.streak_days,
  g.streak_percent,
  g.last_updated_days_ago
FROM clients c
CROSS JOIN (
  VALUES
    ('Independent manding',
     'Requests 5+ preferred items independently across 3 sessions',
     'Communication', 'in-progress', 8, 72, 1),
    ('Two-step instructions',
     'Follows 2-step directions at 80% accuracy across varied instructors',
     'Communication', 'in-progress', 5, 65, 2),
    ('Tolerating transitions',
     'Moves between activities with under 2 protests per transition',
     'Adaptive / Self-Care', 'hold', 0, 55, 4),
    ('Greeting eye contact',
     'Makes eye contact during greetings with familiar adults',
     'Social Skills', 'mastered', 14, 88, 3)
) AS g(name, mastery_criteria, domain, status, streak_days, streak_percent, last_updated_days_ago)
WHERE c.status = 'active'
  AND c.external_code IN (
    'PeLe','BrTu','Ells','AlLo','LiBo','IsRi','CoTa','LoEl',
    'ViReMo','LaGu','SuAz','LuMa','EzHe','GrMa','YaNu','ZiTr'
  )
  AND NOT EXISTS (SELECT 1 FROM goals x WHERE x.client_id = c.id);


-- ─── 5. BEHAVIOR INCIDENTS ────────────────────────────────────────────────────
-- 4 per empty client; references seeded behaviors + recent sessions.

WITH roster AS (
  SELECT c.id, c.practice_id
  FROM clients c
  WHERE c.status = 'active'
    AND c.external_code IN (
      'PeLe','BrTu','Ells','AlLo','LiBo','IsRi','CoTa','LoEl',
      'ViReMo','LaGu','SuAz','LuMa','EzHe','GrMa','YaNu','ZiTr'
    )
    AND NOT EXISTS (SELECT 1 FROM behavior_incidents i WHERE i.client_id = c.id)
),
numbered_behaviors AS (
  SELECT
    b.client_id,
    b.id AS behavior_id,
    ROW_NUMBER() OVER (PARTITION BY b.client_id ORDER BY b.name) AS b_rn
  FROM behaviors b
  JOIN roster r ON r.id = b.client_id
),
numbered_sessions AS (
  SELECT
    s.client_id,
    s.id AS session_id,
    s.practice_id,
    ROW_NUMBER() OVER (PARTITION BY s.client_id ORDER BY s.scheduled_at DESC) AS s_rn
  FROM sessions s
  JOIN roster r ON r.id = s.client_id
  WHERE s.status IN ('completed', 'in-progress', 'scheduled')
),
incident_slots AS (
  SELECT generate_series(1, 4) AS slot
)
INSERT INTO behavior_incidents
  (practice_id, session_id, client_id, behavior_id,
   antecedents, consequences, intensity, duration_seconds)
SELECT
  ns.practice_id,
  ns.session_id,
  r.id,
  nb.behavior_id,
  CASE slot
    WHEN 1 THEN ARRAY['Demand placed', 'Transition']
    WHEN 2 THEN ARRAY['Denied access']
    WHEN 3 THEN ARRAY['Attention removed', 'Waiting']
    ELSE ARRAY['Preferred activity interrupted']
  END,
  CASE slot
    WHEN 1 THEN ARRAY['Verbal redirection']
    WHEN 2 THEN ARRAY['Redirected', 'Break given']
    WHEN 3 THEN ARRAY['Blocked']
    ELSE ARRAY['Removed from activity']
  END,
  CASE slot
    WHEN 1 THEN 'Low'
    WHEN 2 THEN 'Medium'
    WHEN 3 THEN 'High'
    ELSE 'Medium'
  END,
  25 + ((slot * 37 + (hashtext(r.id::text) % 90)))
FROM roster r
JOIN incident_slots ON true
JOIN numbered_behaviors nb
  ON nb.client_id = r.id
 AND nb.b_rn = ((slot - 1) % 3) + 1
JOIN numbered_sessions ns
  ON ns.client_id = r.id
 AND ns.s_rn = slot
WHERE nb.behavior_id IS NOT NULL
  AND ns.session_id IS NOT NULL;


-- ─── Verification (run after seed) ────────────────────────────────────────────

SELECT
  c.external_code,
  c.practice_id,
  (SELECT COUNT(*) FROM sessions s WHERE s.client_id = c.id) AS sessions,
  (SELECT COUNT(*) FROM sessions s
   WHERE s.client_id = c.id AND s.status = 'completed'
     AND NOT EXISTS (SELECT 1 FROM session_notes n WHERE n.session_id = s.id)) AS notes_due,
  (SELECT COUNT(*) FROM session_notes n
   JOIN sessions s ON s.id = n.session_id
   WHERE s.client_id = c.id) AS notes_complete,
  (SELECT COUNT(*) FROM goals g WHERE g.client_id = c.id) AS goals,
  (SELECT COUNT(*) FROM behaviors b WHERE b.client_id = c.id) AS behaviors,
  (SELECT COUNT(*) FROM behavior_incidents i WHERE i.client_id = c.id) AS incidents
FROM clients c
WHERE c.external_code IN (
  'PeLe','BrTu','Ells','AlLo','LiBo','IsRi','CoTa','LoEl',
  'ViReMo','LaGu','SuAz','LuMa','EzHe','GrMa','YaNu','ZiTr'
)
  AND c.status = 'active'
ORDER BY c.external_code, c.practice_id;
