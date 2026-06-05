-- Backfill assigned_staff_id for Coastal ABA demo clients (primary RBT per client).
-- Run once in Supabase SQL Editor. Safe to re-run.

UPDATE clients SET assigned_staff_id = '10000000-0000-0000-0000-000000000004' WHERE id = '20000000-0000-0000-0000-000000000001'; -- Emma Rodriguez → Emily Park
UPDATE clients SET assigned_staff_id = '10000000-0000-0000-0000-000000000003' WHERE id = '20000000-0000-0000-0000-000000000002'; -- Liam Thompson → Mike Torres
UPDATE clients SET assigned_staff_id = '10000000-0000-0000-0000-000000000003' WHERE id = '20000000-0000-0000-0000-000000000003'; -- Ava Martinez → Mike Torres
UPDATE clients SET assigned_staff_id = '10000000-0000-0000-0000-000000000004' WHERE id = '20000000-0000-0000-0000-000000000004'; -- Noah Wilson → Emily Park
UPDATE clients SET assigned_staff_id = '10000000-0000-0000-0000-000000000008' WHERE id = '20000000-0000-0000-0000-000000000005'; -- Sophia Davis → Ashley Brown
UPDATE clients SET assigned_staff_id = '10000000-0000-0000-0000-000000000008' WHERE id = '20000000-0000-0000-0000-000000000006'; -- Jackson Brown → Ashley Brown
UPDATE clients SET assigned_staff_id = '10000000-0000-0000-0000-000000000007' WHERE id = '20000000-0000-0000-0000-000000000007'; -- Isabella Johnson → James Wilson
UPDATE clients SET assigned_staff_id = '10000000-0000-0000-0000-000000000008' WHERE id = '20000000-0000-0000-0000-000000000008'; -- Aiden Garcia → Ashley Brown
UPDATE clients SET assigned_staff_id = '10000000-0000-0000-0000-000000000011' WHERE id = '20000000-0000-0000-0000-000000000009'; -- Mia Anderson → Tyler Johnson
UPDATE clients SET assigned_staff_id = '10000000-0000-0000-0000-000000000011' WHERE id = '20000000-0000-0000-0000-000000000010'; -- Lucas Thomas → Tyler Johnson
UPDATE clients SET assigned_staff_id = '10000000-0000-0000-0000-000000000011' WHERE id = '20000000-0000-0000-0000-000000000011'; -- Charlotte White → Tyler Johnson
UPDATE clients SET assigned_staff_id = '10000000-0000-0000-0000-000000000011' WHERE id = '20000000-0000-0000-0000-000000000012'; -- Ethan Moore → Tyler Johnson
