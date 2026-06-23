-- =============================================================================
-- Deduplicate roster clients — keep 16 total (one per external_code)
-- =============================================================================
--
-- Root cause: `npm run import:roster -- --all` imported the same 16 codes into
-- BOTH practices:
--   KEEP  → Demo  a1b2c3d4-0000-0000-0000-000000000001  (Vercel / demo user)
--   DROP  → SPG   c3d4e5f6-5047-4000-8000-533047000001  (duplicate mirror)
--
-- Run in Supabase SQL Editor. Idempotent — re-run skips when SPG copies are gone.
-- =============================================================================

-- Preview rows that will be removed (optional)
-- SELECT c.external_code, c.id, c.practice_id
-- FROM clients c
-- WHERE c.practice_id = 'c3d4e5f6-5047-4000-8000-533047000001'
--   AND c.external_code IN (
--     'PeLe','BrTu','Ells','AlLo','LiBo','IsRi','CoTa','LoEl',
--     'ViReMo','LaGu','SuAz','LuMa','EzHe','GrMa','YaNu','ZiTr'
--   );

DO $$
DECLARE
  keep_practice   uuid := 'a1b2c3d4-0000-0000-0000-000000000001';
  drop_practice   uuid := 'c3d4e5f6-5047-4000-8000-533047000001';
  roster_codes    text[] := ARRAY[
    'PeLe','BrTu','Ells','AlLo','LiBo','IsRi','CoTa','LoEl',
    'ViReMo','LaGu','SuAz','LuMa','EzHe','GrMa','YaNu','ZiTr'
  ];
  drop_ids        uuid[];
BEGIN
  SELECT array_agg(c.id)
  INTO drop_ids
  FROM clients c
  WHERE c.practice_id = drop_practice
    AND c.external_code = ANY(roster_codes);

  IF drop_ids IS NULL OR array_length(drop_ids, 1) IS NULL THEN
    RAISE NOTICE 'No duplicate SPG roster clients to remove.';
    RETURN;
  END IF;

  RAISE NOTICE 'Removing % duplicate client(s) from SPG practice.', array_length(drop_ids, 1);

  -- Child rows (explicit order for FK safety)
  DELETE FROM behavior_incidents WHERE client_id = ANY(drop_ids);
  DELETE FROM session_trials st
  USING sessions s
  WHERE st.session_id = s.id AND s.client_id = ANY(drop_ids);
  DELETE FROM session_notes WHERE client_id = ANY(drop_ids);
  DELETE FROM sessions WHERE client_id = ANY(drop_ids);
  DELETE FROM goals WHERE client_id = ANY(drop_ids);
  DELETE FROM behaviors WHERE client_id = ANY(drop_ids);
  DELETE FROM authorizations WHERE client_id = ANY(drop_ids);
  DELETE FROM client_assignments WHERE client_id = ANY(drop_ids);
  DELETE FROM clients WHERE id = ANY(drop_ids);

  RAISE NOTICE 'Done. Demo practice (%) retains one row per roster code.', keep_practice;
END $$;


-- ─── Verification — expect 16 active roster clients, no duplicates ────────────

SELECT COUNT(*) AS active_roster_clients
FROM clients c
WHERE c.status = 'active'
  AND c.external_code IS NOT NULL
  AND c.external_code <> '';

SELECT external_code, COUNT(*) AS copies
FROM clients c
WHERE c.status = 'active'
  AND c.external_code = ANY(ARRAY[
    'PeLe','BrTu','Ells','AlLo','LiBo','IsRi','CoTa','LoEl',
    'ViReMo','LaGu','SuAz','LuMa','EzHe','GrMa','YaNu','ZiTr'
  ])
GROUP BY external_code
HAVING COUNT(*) > 1;

-- Should return 0 rows ↑

SELECT c.external_code, c.practice_id,
  (SELECT COUNT(*) FROM sessions s WHERE s.client_id = c.id) AS sessions,
  (SELECT COUNT(*) FROM goals g WHERE g.client_id = c.id) AS goals,
  (SELECT COUNT(*) FROM behaviors b WHERE b.client_id = c.id) AS behaviors,
  (SELECT COUNT(*) FROM behavior_incidents i WHERE i.client_id = c.id) AS incidents
FROM clients c
WHERE c.status = 'active'
  AND c.external_code = ANY(ARRAY[
    'PeLe','BrTu','Ells','AlLo','LiBo','IsRi','CoTa','LoEl',
    'ViReMo','LaGu','SuAz','LuMa','EzHe','GrMa','YaNu','ZiTr'
  ])
ORDER BY c.external_code;
