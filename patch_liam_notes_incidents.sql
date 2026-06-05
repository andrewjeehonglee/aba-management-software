-- Liam Thompson demo content for Jenny walkthrough (Part 2).
-- Safe to re-run: ON CONFLICT DO NOTHING.

INSERT INTO session_notes
  (id, practice_id, session_id, client_id, staff_id, subjective, objective, assessment, plan)
VALUES
  ('90000000-0000-0000-0000-000000000009', 'a1b2c3d4-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000056',
   '20000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000003',
   'Caregiver reports Liam was cooperative at drop-off. No medication changes.',
   'Liam completed 14 of 18 trials on 2-step instructions (78%). One brief non-compliance episode during transition, resolved with visual schedule.',
   'Instruction-following trending up. Non-compliance remains occasional during transitions.',
   'Continue 2-step instruction program. Add transition warning card before next demand.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO behavior_incidents
  (id, practice_id, session_id, client_id, behavior_id,
   antecedents, consequences, intensity, duration_seconds)
VALUES
  ('b0000000-0000-0000-0000-000000000009', 'a1b2c3d4-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000056',
   '20000000-0000-0000-0000-000000000002',
   '60000000-0000-0000-0000-000000000002',
   ARRAY['Transition', 'Demand placed'],
   ARRAY['Verbal redirection', 'Physical assist / prompt'],
   'Medium', 90)
ON CONFLICT (id) DO NOTHING;
