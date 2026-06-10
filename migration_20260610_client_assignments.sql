-- =============================================================================
-- Phase 7 Slice #7a — external codes + client_assignments graph
-- =============================================================================
--
-- Adds import-ready external_code columns on staff/clients, a durable
-- client_assignments table for multi-BCBA caseload routing, and an
-- idempotent Coastal ABA demo backfill only (practice a1b2c3d4-...0001).
--
-- Jenny roster import uses slice #7b — NOT this backfill.
-- Dashboard scope wiring uses slice #7c — do not depend on team column.
--
-- Run once in Supabase SQL Editor. Safe to re-run (IF NOT EXISTS / ON CONFLICT).
-- =============================================================================


-- ─── 1. staff — external_code + supervisor link ───────────────────────────────

ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS external_code TEXT,
  ADD COLUMN IF NOT EXISTS supervisor_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS staff_practice_external_code_idx
  ON staff(practice_id, external_code)
  WHERE external_code IS NOT NULL;

COMMENT ON COLUMN staff.external_code IS 'Jenny/OP roster code — stable import key';
COMMENT ON COLUMN staff.team IS 'DEPRECATED — use client_assignments; kept for Coastal demo compat';


-- ─── 2. clients — external_code ───────────────────────────────────────────────

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS external_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS clients_practice_external_code_idx
  ON clients(practice_id, external_code)
  WHERE external_code IS NOT NULL;

COMMENT ON COLUMN clients.external_code IS 'Jenny/OP client code — stable import key';
COMMENT ON COLUMN clients.team IS 'DEPRECATED — use client_assignments; kept for Coastal demo compat';


-- ─── 3. client_assignments — caseload graph ───────────────────────────────────

CREATE TABLE IF NOT EXISTS client_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id     UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  staff_id        UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  assignment_role TEXT NOT NULL CHECK (assignment_role IN (
    'primary_bcba',
    'clinical_supervisor',
    'primary_bt',
    'secondary_bt'
  )),
  location        TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, staff_id, assignment_role)
);

CREATE INDEX IF NOT EXISTS client_assignments_practice_role_idx
  ON client_assignments(practice_id, assignment_role)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS client_assignments_staff_active_idx
  ON client_assignments(staff_id)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS client_assignments_client_active_idx
  ON client_assignments(client_id)
  WHERE is_active;

ALTER TABLE client_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_client_assignments ON client_assignments
  FOR SELECT TO authenticated
  USING (practice_id IN (
    SELECT practice_id FROM practice_members WHERE user_id = auth.uid()
  ));

CREATE POLICY insert_client_assignments ON client_assignments
  FOR INSERT TO authenticated
  WITH CHECK (practice_id IN (
    SELECT practice_id FROM practice_members WHERE user_id = auth.uid()
  ));

CREATE POLICY update_client_assignments ON client_assignments
  FOR UPDATE TO authenticated
  USING (practice_id IN (
    SELECT practice_id FROM practice_members WHERE user_id = auth.uid()
  ));

CREATE POLICY delete_client_assignments ON client_assignments
  FOR DELETE TO authenticated
  USING (practice_id IN (
    SELECT practice_id FROM practice_members WHERE user_id = auth.uid()
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON client_assignments TO authenticated;


-- ─── 4. Coastal demo backfill (practice a1b2c3d4-...0001 only) ─────────────────

-- Primary BT from clients.assigned_staff_id
INSERT INTO client_assignments (practice_id, client_id, staff_id, assignment_role)
SELECT
  c.practice_id,
  c.id,
  c.assigned_staff_id,
  'primary_bt'
FROM clients c
WHERE c.practice_id = 'a1b2c3d4-0000-0000-0000-000000000001'
  AND c.assigned_staff_id IS NOT NULL
ON CONFLICT (client_id, staff_id, assignment_role) DO NOTHING;

-- Primary BCBA from legacy team letter
INSERT INTO client_assignments (practice_id, client_id, staff_id, assignment_role)
SELECT
  c.practice_id,
  c.id,
  CASE c.team
    WHEN 'A' THEN '10000000-0000-0000-0000-000000000001'::uuid  -- Sarah Chen
    WHEN 'B' THEN '10000000-0000-0000-0000-000000000005'::uuid  -- Rachel Lee
    WHEN 'C' THEN '10000000-0000-0000-0000-000000000009'::uuid  -- Jennifer Nguyen
  END,
  'primary_bcba'
FROM clients c
WHERE c.practice_id = 'a1b2c3d4-0000-0000-0000-000000000001'
  AND c.team IN ('A', 'B', 'C')
ON CONFLICT (client_id, staff_id, assignment_role) DO NOTHING;

-- Clinical supervisor on same-team clients (Team C has no supervisor in seed)
INSERT INTO client_assignments (practice_id, client_id, staff_id, assignment_role)
SELECT
  c.practice_id,
  c.id,
  CASE c.team
    WHEN 'A' THEN '10000000-0000-0000-0000-000000000002'::uuid  -- David Kim
    WHEN 'B' THEN '10000000-0000-0000-0000-000000000006'::uuid  -- Kevin Martinez
  END,
  'clinical_supervisor'
FROM clients c
WHERE c.practice_id = 'a1b2c3d4-0000-0000-0000-000000000001'
  AND c.team IN ('A', 'B')
ON CONFLICT (client_id, staff_id, assignment_role) DO NOTHING;


-- ─── 5. Verification queries (uncomment to run after migration) ───────────────

-- SELECT assignment_role, COUNT(*) AS n
-- FROM client_assignments
-- WHERE practice_id = 'a1b2c3d4-0000-0000-0000-000000000001'
--   AND is_active
-- GROUP BY assignment_role
-- ORDER BY assignment_role;

-- SELECT
--   c.first_name || ' ' || c.last_name AS client_name,
--   s.full_name AS staff_name,
--   ca.assignment_role
-- FROM client_assignments ca
-- JOIN clients c ON c.id = ca.client_id
-- JOIN staff s ON s.id = ca.staff_id
-- WHERE ca.practice_id = 'a1b2c3d4-0000-0000-0000-000000000001'
--   AND ca.is_active
-- ORDER BY c.last_name, ca.assignment_role, s.full_name
-- LIMIT 20;

-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'staff' AND column_name = 'external_code';

-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'clients' AND column_name = 'external_code';
