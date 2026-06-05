-- Backfill session notes + behavior incidents for Coastal ABA clients missing them.
-- Run once in Supabase SQL Editor. Safe to re-run (ON CONFLICT DO NOTHING).
--
-- Before this patch, seed only covered 5 clients (Emma, Ava, Sophia, Isabella, Noah).
-- Liam was added separately for Part 2 walkthrough. This fills the remaining gaps so
-- every client profile shows at least 1 note + 1 incident for Jenny demo Mon Jun 8.

-- ─── Session notes (6 clients with zero notes) ───────────────────────────────

INSERT INTO session_notes
  (id, practice_id, session_id, client_id, staff_id, subjective, objective, assessment, plan)
VALUES
  ('90000000-0000-0000-0000-000000000010', 'a1b2c3d4-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000058', '20000000-0000-0000-0000-000000000008',
   '10000000-0000-0000-0000-000000000007',
   'Caregiver reports Aiden slept well. No changes to routine.',
   'Motor stereotypy observed 3 intervals in 30 min. Compliance with transitions 4/5 trials.',
   'Stereotypy stable. Transitions improving with visual countdown.',
   'Continue interval recording. Fade verbal prompts on transitions.'),
  ('90000000-0000-0000-0000-000000000011', 'a1b2c3d4-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000054', '20000000-0000-0000-0000-000000000011',
   '10000000-0000-0000-0000-000000000011',
   'Parent present for first 10 min. Charlotte engaged with preferred toy.',
   'Pica behavior not observed this session. Mand training 11/15 correct (73%).',
   'Clean session for pica. Manding below mastery threshold.',
   'Increase mand opportunities. Continue non-food item monitoring.'),
  ('90000000-0000-0000-0000-000000000012', 'a1b2c3d4-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000055', '20000000-0000-0000-0000-000000000012',
   '10000000-0000-0000-0000-000000000011',
   'Ethan arrived on time. Caregiver noted good appetite this morning.',
   'Vocal stereotypy in 2 of 10 intervals. Joint attention trials 6/8 correct.',
   'Stereotypy decreased from prior week. Joint attention trending up.',
   'Maintain reinforcement schedule. Add peer proximity for generalization.'),
  ('90000000-0000-0000-0000-000000000013', 'a1b2c3d4-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000006',
   '10000000-0000-0000-0000-000000000008',
   'Jackson was dysregulated at arrival; 5 min calm-down before starting.',
   'One property destruction episode (threw cup). Replacement behavior used successfully twice.',
   'Destruction brief. Replacement skill showing early use.',
   'Pre-session regulation check. Increase access to sensory break card.'),
  ('90000000-0000-0000-0000-000000000014', 'a1b2c3d4-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000053', '20000000-0000-0000-0000-000000000010',
   '10000000-0000-0000-0000-000000000011',
   'Caregiver reports Lucas had a positive morning at school.',
   'Elopement precursors noted twice; staff blocked and redirected. Task completion 80%.',
   'No full elopement. Precursor identification improving.',
   'Continue antecedent blocking. Review door protocol with family.'),
  ('90000000-0000-0000-0000-000000000015', 'a1b2c3d4-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000009',
   '10000000-0000-0000-0000-000000000011',
   'Mia greeted therapist independently. No medical concerns reported.',
   'Vocal stereotypy 4/10 intervals. Social greeting program 5/6 correct.',
   'Stereotypy moderate. Greeting program near criterion.',
   'Probe greeting with novel adults. Continue stereotypy interval data.')
ON CONFLICT (id) DO NOTHING;

-- ─── Behavior incidents (8 clients missing incidents) ────────────────────────

INSERT INTO behavior_incidents
  (id, practice_id, session_id, client_id, behavior_id,
   antecedents, consequences, intensity, duration_seconds)
VALUES
  ('b0000000-0000-0000-0000-000000000010', 'a1b2c3d4-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000058', '20000000-0000-0000-0000-000000000008',
   '60000000-0000-0000-0000-000000000008',
   ARRAY['Waiting', 'Loud / noisy environment'],
   ARRAY['Ignored problem behavior', 'Verbal redirection'],
   'Low', 45),
  ('b0000000-0000-0000-0000-000000000011', 'a1b2c3d4-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000054', '20000000-0000-0000-0000-000000000011',
   '60000000-0000-0000-0000-000000000011',
   ARRAY['Denied access'],
   ARRAY['Physical assist / prompt', 'Verbal redirection'],
   'Medium', 30),
  ('b0000000-0000-0000-0000-000000000012', 'a1b2c3d4-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000055', '20000000-0000-0000-0000-000000000012',
   '60000000-0000-0000-0000-000000000012',
   ARRAY['Transition'],
   ARRAY['Calming / soothing', 'Ignored problem behavior'],
   'Low', 60),
  ('b0000000-0000-0000-0000-000000000013', 'a1b2c3d4-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000006',
   '60000000-0000-0000-0000-000000000006',
   ARRAY['Denied access', 'Demand placed'],
   ARRAY['Removed from activity / location', 'Verbal redirection'],
   'Medium', 75),
  ('b0000000-0000-0000-0000-000000000014', 'a1b2c3d4-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000053', '20000000-0000-0000-0000-000000000010',
   '60000000-0000-0000-0000-000000000010',
   ARRAY['Transition', 'New activity'],
   ARRAY['Used proximity control', 'Verbal redirection'],
   'Medium', 40),
  ('b0000000-0000-0000-0000-000000000015', 'a1b2c3d4-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000009',
   '60000000-0000-0000-0000-000000000009',
   ARRAY['Attention given to others'],
   ARRAY['Verbal redirection', 'Ignored problem behavior'],
   'Low', 25),
  ('b0000000-0000-0000-0000-000000000016', 'a1b2c3d4-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000004',
   '60000000-0000-0000-0000-000000000004',
   ARRAY['Demand placed', 'Given a correction'],
   ARRAY['Interrupted / blocked and redirected', 'Verbal redirection'],
   'Medium', 55),
  ('b0000000-0000-0000-0000-000000000017', 'a1b2c3d4-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000005',
   '60000000-0000-0000-0000-000000000005',
   ARRAY['Transition'],
   ARRAY['Physical assist / prompt', 'Kept demand'],
   'Low', 20)
ON CONFLICT (id) DO NOTHING;
