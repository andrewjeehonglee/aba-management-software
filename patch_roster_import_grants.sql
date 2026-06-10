-- Grant service_role access for roster CLI import (scripts/import_roster.mjs)
-- Run once in Supabase SQL Editor if import fails with "permission denied for table ..."

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;
