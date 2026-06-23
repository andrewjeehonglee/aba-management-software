-- =============================================================================
-- Patch: ensure roster clients show 1–2 "due" notes in session notes view
-- =============================================================================
--
-- Run in Supabase SQL Editor AFTER seed_roster_clients_v4_full.sql
-- (or anytime the Due section is empty). Idempotent — safe to re-run.
--
-- Removes session_notes from each roster client's 2 most recent COMPLETED
-- sessions so the app Due queue has real examples.
-- =============================================================================

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


-- Verification — expect notes_due = 1 or 2 for every row
SELECT
  c.external_code,
  c.practice_id,
  (SELECT COUNT(*) FROM sessions s
   WHERE s.client_id = c.id AND s.status = 'completed'
     AND NOT EXISTS (SELECT 1 FROM session_notes n WHERE n.session_id = s.id)) AS notes_due,
  (SELECT COUNT(*) FROM session_notes n
   JOIN sessions s ON s.id = n.session_id
   WHERE s.client_id = c.id) AS notes_complete
FROM clients c
WHERE c.external_code IN (
  'PeLe','BrTu','Ells','AlLo','LiBo','IsRi','CoTa','LoEl',
  'ViReMo','LaGu','SuAz','LuMa','EzHe','GrMa','YaNu','ZiTr'
)
  AND c.status = 'active'
ORDER BY c.external_code, c.practice_id;
