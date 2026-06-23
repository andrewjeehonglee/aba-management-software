-- =============================================================================
-- Seed goals, behaviors, and behavior incidents for roster clients (16 codes)
-- Idempotent: only fills clients with ZERO rows in each table.
-- Run in Supabase SQL Editor (production). Safe to re-run.
-- =============================================================================

DO $$
DECLARE
  codes text[] := ARRAY[
    'PeLe','BrTu','Ells','AlLo','LiBo','IsRi','CoTa','LoEl',
    'ViReMo','LaGu','SuAz','LuMa','EzHe','GrMa','YaNu','ZiTr'
  ];
  code text;
  cid uuid;
  pid uuid;
  idx int := 0;
  bid uuid;
  sid uuid;
  g_names text[] := ARRAY[
    'Independent manding',
    'Two-step instructions',
    'Tacting common objects',
    'Tolerating transitions',
    'Toilet training',
    'Greeting eye contact',
    'Turn-taking in play'
  ];
  g_criteria text[] := ARRAY[
    'Requests 5+ preferred items independently across 3 sessions',
    'Follows 2-step directions at 80% accuracy across varied instructors',
    'Labels 20 common items independently in structured trials',
    'Moves between activities with under 2 protests per transition',
    'Initiates toileting independently in 80% of opportunities',
    'Makes eye contact during greetings with familiar adults',
    'Waits for turn across 5 consecutive play trials'
  ];
  g_domains text[] := ARRAY[
    'Communication','Communication','Communication',
    'Adaptive / Self-Care','Adaptive / Self-Care','Social Skills','Social Skills'
  ];
  g_statuses text[] := ARRAY['in-progress','in-progress','in-progress','hold','in-progress','mastered','in-progress'];
  b_names text[] := ARRAY[
    'Elopement',
    'Aggression (hitting)',
    'Self-injurious behavior',
    'Vocal stereotypy',
    'Property destruction',
    'Non-compliance'
  ];
  b_defs text[] := ARRAY[
    'Leaves the designated area without permission',
    'Open or closed-hand contact toward another person',
    'Head-hitting or skin-picking; counted per occurrence',
    'Repetitive non-contextual vocalizations; duration recorded',
    'Throwing or breaking materials; counted per episode',
    'Refuses a demand within 10 seconds of instruction'
  ];
  antecedent_pool text[] := ARRAY[
    'Demand placed','Transition','Denied access','Attention removed',
    'Preferred activity interrupted','Waiting','New activity'
  ];
  consequence_pool text[] := ARRAY[
    'Redirected','Break given','Planned ignoring','Blocked',
    'Verbal redirection','Removed from activity','Physical prompt'
  ];
  intensities text[] := ARRAY['Low','Medium','High'];
  gi int;
  bi int;
  ii int;
BEGIN
  FOREACH code IN ARRAY codes LOOP
    idx := idx + 1;

    FOR cid, pid IN
      SELECT c.id, c.practice_id
      FROM clients c
      WHERE c.external_code = code
        AND c.status = 'active'
      ORDER BY c.practice_id
    LOOP
    -- ── Goals (4 per empty client) ──────────────────────────────────────────
    IF NOT EXISTS (SELECT 1 FROM goals g WHERE g.client_id = cid) THEN
      FOR gi IN 0..3 LOOP
        INSERT INTO goals (
          id, practice_id, client_id, name, mastery_criteria, domain, status,
          streak_days, streak_percent, last_updated_days_ago
        ) VALUES (
          gen_random_uuid(),
          pid,
          cid,
          g_names[1 + ((idx + gi - 1) % array_length(g_names, 1))],
          g_criteria[1 + ((idx + gi - 1) % array_length(g_criteria, 1))],
          g_domains[1 + ((idx + gi - 1) % array_length(g_domains, 1))],
          g_statuses[1 + ((idx + gi - 1) % array_length(g_statuses, 1))],
          (gi + 1) * 2 + (idx % 4),
          55 + ((idx + gi) * 7) % 35,
          1 + ((idx + gi) % 5)
        );
      END LOOP;
    END IF;

    -- ── Behaviors (3 per empty client) ──────────────────────────────────────
    IF NOT EXISTS (SELECT 1 FROM behaviors b WHERE b.client_id = cid) THEN
      FOR bi IN 0..2 LOOP
        INSERT INTO behaviors (id, practice_id, client_id, name, description)
        VALUES (
          gen_random_uuid(),
          pid,
          cid,
          b_names[1 + ((idx + bi - 1) % array_length(b_names, 1))],
          b_defs[1 + ((idx + bi - 1) % array_length(b_defs, 1))]
        );
      END LOOP;
    END IF;

    -- ── Behavior incidents (4 per empty client) ─────────────────────────────
    IF NOT EXISTS (SELECT 1 FROM behavior_incidents bi2 WHERE bi2.client_id = cid) THEN
      FOR ii IN 0..3 LOOP
        SELECT b.id INTO bid
        FROM behaviors b
        WHERE b.client_id = cid
        ORDER BY b.id
        OFFSET (ii % 3) LIMIT 1;

        SELECT s.id INTO sid
        FROM sessions s
        WHERE s.client_id = cid
          AND s.status IN ('completed', 'in-progress', 'scheduled')
        ORDER BY s.scheduled_at DESC
        OFFSET ii LIMIT 1;

        IF bid IS NULL OR sid IS NULL THEN
          CONTINUE;
        END IF;

        INSERT INTO behavior_incidents (
          id, practice_id, session_id, client_id, behavior_id,
          antecedents, consequences, intensity, duration_seconds
        ) VALUES (
          gen_random_uuid(),
          pid,
          sid,
          cid,
          bid,
          ARRAY[
            antecedent_pool[1 + ((idx + ii - 1) % array_length(antecedent_pool, 1))],
            antecedent_pool[1 + ((idx + ii) % array_length(antecedent_pool, 1))]
          ],
          ARRAY[
            consequence_pool[1 + ((idx + ii - 1) % array_length(consequence_pool, 1))]
          ],
          intensities[1 + ((idx + ii - 1) % array_length(intensities, 1))],
          20 + ((idx * 11 + ii * 17) % 180)
        );
      END LOOP;
    END IF;

    END LOOP; -- practice copies of this roster code
  END LOOP;
END $$;

-- Verification (uncomment after run):
-- SELECT c.external_code,
--   (SELECT COUNT(*) FROM goals g WHERE g.client_id = c.id) AS goals,
--   (SELECT COUNT(*) FROM behaviors b WHERE b.client_id = c.id) AS behaviors,
--   (SELECT COUNT(*) FROM behavior_incidents i WHERE i.client_id = c.id) AS incidents
-- FROM clients c
-- WHERE c.external_code IN ('PeLe','BrTu','Ells','AlLo','LiBo','IsRi','CoTa','LoEl',
--   'ViReMo','LaGu','SuAz','LuMa','EzHe','GrMa','YaNu','ZiTr')
--   AND c.status = 'active'
-- ORDER BY c.external_code;
