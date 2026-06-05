-- =============================================================================
-- Patch: Move demo "today" sessions from Jun 4 → Jun 5 2026
-- Run once in Supabase SQL Editor if Today's Sessions is empty on a new day.
-- (Demo mode also has a code fallback; this keeps timestamps accurate.)
-- =============================================================================

UPDATE sessions SET scheduled_at = scheduled_at + INTERVAL '1 day'
WHERE scheduled_at >= '2026-06-04T00:00:00+00:00'
  AND scheduled_at <  '2026-06-05T00:00:00+00:00';
