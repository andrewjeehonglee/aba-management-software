-- =============================================================================
-- Pulse Client Profile v6 — TASK 1 ONLY
-- Re-seed goals, behaviors, incidents, and session notes with REAL variety
-- =============================================================================
--
-- Run in Supabase SQL Editor. Clears and re-seeds ACTIVE roster clients only
-- (external_code IS NOT NULL). Safe for demo — no real PHI.
--
-- Schema (from migrations + src/lib/supabase.ts):
--   goals: name, mastery_criteria, domain, status ('in-progress'|'hold'|'mastered'|'discontinued')
--          streak_days, streak_percent, last_updated_days_ago
--   behaviors: name, description  (NO definition / measurement_type columns)
--   behavior_incidents: antecedents[], consequences[], intensity ('Low'|'Medium'|'High')
--   session_notes: subjective, objective, assessment, plan
-- =============================================================================


-- ─── STEP 1 — Clear existing example rows (roster clients only) ───────────────

DELETE FROM behavior_incidents bi
USING clients c
WHERE bi.client_id = c.id
  AND c.status = 'active'
  AND c.external_code IS NOT NULL
  AND c.external_code <> '';

DELETE FROM session_notes sn
USING clients c
WHERE sn.client_id = c.id
  AND c.status = 'active'
  AND c.external_code IS NOT NULL
  AND c.external_code <> '';

DELETE FROM behaviors b
USING clients c
WHERE b.client_id = c.id
  AND c.status = 'active'
  AND c.external_code IS NOT NULL
  AND c.external_code <> '';

DELETE FROM goals g
USING clients c
WHERE g.client_id = c.id
  AND c.status = 'active'
  AND c.external_code IS NOT NULL
  AND c.external_code <> '';


-- ─── STEP 2 — Goals: pool of 14, 2–5 per client, varied status ────────────────

WITH roster AS (
  SELECT
    c.id,
    c.practice_id,
    c.external_code,
    row_number() OVER (ORDER BY c.external_code, c.id) AS rn
  FROM clients c
  WHERE c.status = 'active'
    AND c.external_code IS NOT NULL
    AND c.external_code <> ''
),
goal_pool AS (
  SELECT * FROM (VALUES
    ( 1, 'Independent manding',           'Requests 5+ preferred items independently across 3 sessions',           'Communication'),
    ( 2, 'Two-step instructions',         'Follows 2-step directions at 80% accuracy',                             'Communication'),
    ( 3, 'Tacting common objects',        'Labels 20 common items independently',                                  'Communication'),
    ( 4, 'Tolerating transitions',        'Moves between activities with under 2 protests',                        'Adaptive / Self-Care'),
    ( 5, 'Toilet training',               'Initiates toileting independently in 80% of opportunities',             'Adaptive / Self-Care'),
    ( 6, 'Greeting peers',                'Greets a peer when prompted by context',                                'Social Skills'),
    ( 7, 'Turn-taking in play',           'Waits for a turn across 5 consecutive trials',                            'Social Skills'),
    ( 8, 'Functional communication',      'Uses a break card instead of escape behavior',                           'Communication'),
    ( 9, 'Matching to sample',            'Matches identical pictures at 90% across 3 sessions',                     'Academic / Cognitive'),
    (10, 'Gross-motor imitation',         'Imitates 10 gross-motor actions on request',                              'Motor Skills'),
    (11, 'Answering wh-questions',        'Answers who/what/where at 80% accuracy',                                  'Communication'),
    (12, 'Hand-washing routine',          'Completes a 6-step hand-washing routine unprompted',                    'Adaptive / Self-Care'),
    (13, 'Joint attention',               'Responds to a point and look across 5 trials',                            'Social Skills'),
    (14, 'Requesting help',               'Asks for help when an item is out of reach',                              'Communication')
  ) AS t(idx, name, criteria, domain)
)
INSERT INTO goals
  (practice_id, client_id, name, mastery_criteria, domain, status,
   streak_days, streak_percent, last_updated_days_ago)
SELECT
  r.practice_id,
  r.id,
  g.name,
  g.criteria,
  g.domain,
  CASE (g.idx + r.rn) % 5
    WHEN 0 THEN 'hold'
    WHEN 1 THEN 'mastered'
    ELSE 'in-progress'
  END,
  CASE WHEN (g.idx + r.rn) % 5 = 1 THEN 12 + (r.rn % 6) ELSE (g.idx + r.rn) % 9 END,
  55 + ((g.idx * 7 + r.rn * 3) % 40),
  1 + ((g.idx + r.rn) % 6)
FROM roster r
JOIN goal_pool g
  ON ((g.idx + r.rn * 3) % 14) < (2 + (r.rn % 4));


-- ─── STEP 3 — Behaviors: pool of 10, 2–4 per client ─────────────────────────
-- UI hardcodes "Frequency" tag; measurement hint lives in description text.

WITH roster AS (
  SELECT
    c.id,
    c.practice_id,
    row_number() OVER (ORDER BY c.external_code, c.id) AS rn
  FROM clients c
  WHERE c.status = 'active'
    AND c.external_code IS NOT NULL
    AND c.external_code <> ''
),
beh_pool AS (
  SELECT * FROM (VALUES
    ( 1, 'Elopement',                 'Leaves the designated area without permission',                         'Frequency'),
    ( 2, 'Aggression (hitting)',      'Open or closed-hand contact toward another person',                     'Frequency'),
    ( 3, 'Self-injurious behavior',   'Head-hitting or skin-picking; counted per occurrence',                  'Frequency'),
    ( 4, 'Vocal stereotypy',          'Repetitive non-contextual vocalizations; duration recorded',             'Duration'),
    ( 5, 'Property destruction',      'Throwing or breaking materials; counted per episode',                   'Frequency'),
    ( 6, 'Non-compliance',            'Refuses a demand within 10 seconds of instruction',                     'Frequency'),
    ( 7, 'Tantrum',                   'Crying, screaming, or dropping to the floor; duration recorded',        'Duration'),
    ( 8, 'Scripting',                 'Repeating phrases from media out of context; counted per interval',      'Frequency'),
    ( 9, 'Mouthing objects',          'Placing non-food items in the mouth; counted per occurrence',           'Frequency'),
    (10, 'Flopping',                  'Dropping to the ground during transitions; counted per episode',        'Frequency')
  ) AS t(idx, name, definition, measurement)
)
INSERT INTO behaviors (practice_id, client_id, name, description)
SELECT
  r.practice_id,
  r.id,
  b.name,
  b.definition || ' (' || lower(b.measurement) || ' measure)'
FROM roster r
JOIN beh_pool b
  ON ((b.idx + r.rn * 2) % 10) < (2 + (r.rn % 3));


-- ─── STEP 4 — Behavior incidents: 1–6 per client, varied ABC detail ─────────

WITH roster AS (
  SELECT
    c.id,
    c.practice_id,
    c.external_code,
    row_number() OVER (ORDER BY c.external_code, c.id) AS rn
  FROM clients c
  WHERE c.status = 'active'
    AND c.external_code IS NOT NULL
    AND c.external_code <> ''
),
incident_slots AS (
  SELECT
    r.id            AS client_id,
    r.practice_id,
    r.rn,
    gs.slot
  FROM roster r
  CROSS JOIN generate_series(1, 6) AS gs(slot)
  WHERE gs.slot <= 1 + (r.rn % 6)
),
numbered_behaviors AS (
  SELECT
    b.client_id,
    b.id AS behavior_id,
    row_number() OVER (PARTITION BY b.client_id ORDER BY b.name) AS b_rn,
    count(*) OVER (PARTITION BY b.client_id) AS b_count
  FROM behaviors b
  JOIN roster r ON r.id = b.client_id
),
numbered_sessions AS (
  SELECT
    s.client_id,
    s.id AS session_id,
    s.staff_id,
    row_number() OVER (PARTITION BY s.client_id ORDER BY s.scheduled_at DESC) AS s_rn
  FROM sessions s
  JOIN roster r ON r.id = s.client_id
  WHERE s.status IN ('completed', 'in-progress', 'scheduled')
    AND s.scheduled_at >= (CURRENT_DATE - 28)
)
INSERT INTO behavior_incidents
  (practice_id, session_id, client_id, behavior_id,
   antecedents, consequences, intensity, duration_seconds)
SELECT
  i.practice_id,
  ns.session_id,
  i.client_id,
  nb.behavior_id,
  CASE i.slot % 4
    WHEN 0 THEN ARRAY['Demand placed', 'Transition']
    WHEN 1 THEN ARRAY['Denied access']
    WHEN 2 THEN ARRAY['Attention removed', 'Waiting']
    ELSE ARRAY['Preferred activity interrupted', 'New activity']
  END,
  CASE i.slot % 3
    WHEN 0 THEN ARRAY['Verbal redirection']
    WHEN 1 THEN ARRAY['Redirected', 'Break given']
    ELSE ARRAY['Blocked', 'Removed from activity']
  END,
  CASE (i.slot + i.rn) % 3
    WHEN 0 THEN 'Low'
    WHEN 1 THEN 'Medium'
    ELSE 'High'
  END,
  25 + ((i.slot * 43 + i.rn * 19) % 210)
FROM incident_slots i
JOIN numbered_behaviors nb
  ON nb.client_id = i.client_id
 AND nb.b_rn = ((i.slot - 1) % nb.b_count) + 1
JOIN numbered_sessions ns
  ON ns.client_id = i.client_id
 AND ns.s_rn = ((i.slot - 1) % 4) + 1
WHERE nb.behavior_id IS NOT NULL
  AND ns.session_id IS NOT NULL;


-- ─── STEP 5 — Session notes: varied due backlog (0–3) per client ──────────────
-- Leave the (rn % 4) most recent completed sessions WITHOUT a note.
-- Insert full SOAP for older completed sessions in the last 28 days.

WITH roster AS (
  SELECT
    c.id,
    c.practice_id,
    c.external_code,
    row_number() OVER (ORDER BY c.external_code, c.id) AS rn
  FROM clients c
  WHERE c.status = 'active'
    AND c.external_code IS NOT NULL
    AND c.external_code <> ''
),
ranked_completed AS (
  SELECT
    s.id AS session_id,
    s.client_id,
    s.practice_id,
    s.staff_id,
    s.scheduled_at,
    r.external_code,
    r.rn,
    row_number() OVER (PARTITION BY s.client_id ORDER BY s.scheduled_at DESC) AS rev_rn
  FROM sessions s
  JOIN roster r ON r.id = s.client_id
  WHERE s.status = 'completed'
    AND s.scheduled_at >= (CURRENT_DATE - 28)
)
INSERT INTO session_notes
  (practice_id, session_id, client_id, staff_id, subjective, objective, assessment, plan)
SELECT
  rc.practice_id,
  rc.session_id,
  rc.client_id,
  rc.staff_id,
  'Caregiver reports a typical morning for ' || rc.external_code
    || '. Routine was ' || CASE rc.rn % 3 WHEN 0 THEN 'smooth' WHEN 1 THEN 'variable' ELSE 'disrupted by a schedule change' END || '.',
  'Client participated in structured programming for 45–50 minutes. '
    || CASE rc.rev_rn % 4
         WHEN 0 THEN 'Strong engagement on communication targets.'
         WHEN 1 THEN 'Moderate prompting needed during transitions.'
         WHEN 2 THEN 'One brief non-compliance episode, resolved with visual support.'
         ELSE 'High accuracy on skill probes with occasional prompt fading.'
       END,
  'Progress is ' || CASE rc.rn % 3 WHEN 0 THEN 'steady' WHEN 1 THEN 'emerging' ELSE 'mixed' END
    || ' across active programs. Incident data reviewed with team.',
  'Continue current reinforcement schedule. '
    || CASE rc.rn % 2 WHEN 0 THEN 'Probe generalization with novel materials next session.'
         ELSE 'Increase transition warnings before next demand sequence.' END
FROM ranked_completed rc
WHERE rc.rev_rn > (rc.rn % 4);


-- ─── VERIFICATION — run after seed ────────────────────────────────────────────

SELECT
  c.external_code,
  (SELECT COUNT(*) FROM goals g WHERE g.client_id = c.id) AS goals,
  (SELECT string_agg(g.status, ', ' ORDER BY g.name)
   FROM goals g WHERE g.client_id = c.id) AS goal_statuses,
  (SELECT COUNT(*) FROM behaviors b WHERE b.client_id = c.id) AS behaviors,
  (SELECT COUNT(*) FROM behavior_incidents i WHERE i.client_id = c.id) AS incidents,
  (SELECT COUNT(*) FROM sessions s
   WHERE s.client_id = c.id AND s.status = 'completed'
     AND NOT EXISTS (SELECT 1 FROM session_notes n WHERE n.session_id = s.id)) AS notes_due,
  (SELECT COUNT(*) FROM session_notes n
   JOIN sessions s ON s.id = n.session_id WHERE s.client_id = c.id) AS notes_complete,
  (SELECT string_agg(sub.name, ' | ' ORDER BY sub.name)
   FROM (SELECT g.name FROM goals g WHERE g.client_id = c.id ORDER BY g.name LIMIT 3) sub) AS sample_goals
FROM clients c
WHERE c.status = 'active'
  AND c.external_code IS NOT NULL
  AND c.external_code <> ''
ORDER BY c.external_code;

-- Expect: goals 2–5, behaviors 2–4, incidents 1–6, notes_due 0–3, different sample_goals per row.
