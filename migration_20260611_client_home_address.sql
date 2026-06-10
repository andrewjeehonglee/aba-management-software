-- Client home address for clinical / audit records (Jenny request, #7f)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS home_address TEXT;
COMMENT ON COLUMN clients.home_address IS 'Client home address for clinical / audit records';
