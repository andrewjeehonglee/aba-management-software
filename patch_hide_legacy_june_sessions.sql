-- =============================================================================
-- Hide legacy Coastal demo sessions from June 2026 dashboards
-- =============================================================================
--
-- Roster seed (#7d) added June sessions on imported clients/staff.
-- Legacy Emma/Liam/etc. sessions still appear in owner tiles without this patch.
-- Safe to re-run — only touches non-roster rows in June 2026 on demo practice.
-- =============================================================================

UPDATE sessions s
SET status = 'cancelled'
FROM clients c
WHERE s.client_id = c.id
  AND s.practice_id = 'a1b2c3d4-0000-0000-0000-000000000001'
  AND c.external_code IS NULL
  AND s.scheduled_at >= '2026-06-01'
  AND s.scheduled_at < '2026-07-01'
  AND s.status NOT IN ('cancelled', 'no-show');

UPDATE sessions s
SET status = 'cancelled'
FROM staff st
WHERE s.staff_id = st.id
  AND s.practice_id = 'a1b2c3d4-0000-0000-0000-000000000001'
  AND st.external_code IS NULL
  AND s.scheduled_at >= '2026-06-01'
  AND s.scheduled_at < '2026-07-01'
  AND s.status NOT IN ('cancelled', 'no-show');

-- Verification (uncomment):
-- SELECT st.full_name, COUNT(*)
-- FROM sessions s
-- JOIN staff st ON st.id = s.staff_id
-- WHERE s.practice_id = 'a1b2c3d4-0000-0000-0000-000000000001'
--   AND s.scheduled_at >= '2026-06-01' AND s.scheduled_at < '2026-07-01'
--   AND s.status = 'completed'
-- GROUP BY st.full_name ORDER BY st.full_name;
