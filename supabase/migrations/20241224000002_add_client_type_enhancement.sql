-- Migration: Add client_type and enhance clients table
-- Date: 2024-12-24

-- 1. Add client_type to the clients table
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'Freeholder'; -- e.g., Freeholder, Managing Agent, RMC

-- Add comment for documentation
COMMENT ON COLUMN clients.client_type IS 'Type of client: Freeholder, Managing Agent, RMC, etc.';

-- 2. Create an enum type for client_type (optional - for data validation)
-- CREATE TYPE client_type_enum AS ENUM ('Freeholder', 'Managing Agent', 'RMC', 'Other');
-- ALTER TABLE clients ALTER COLUMN client_type TYPE client_type_enum USING client_type::client_type_enum;

-- 3. Add index for performance on client_type
CREATE INDEX IF NOT EXISTS idx_clients_client_type ON clients(client_type);

-- 4. Update existing clients with appropriate client_type based on building structure
UPDATE clients 
SET client_type = CASE 
  WHEN EXISTS (
    SELECT 1 FROM buildings b 
    WHERE b.id = clients.building_id 
    AND b.structure_type = 'RMC'
  ) THEN 'RMC'
  WHEN EXISTS (
    SELECT 1 FROM buildings b 
    WHERE b.id = clients.building_id 
    AND b.structure_type = 'Freehold'
  ) THEN 'Freeholder'
  ELSE 'Managing Agent'
END
WHERE client_type = 'Freeholder';

-- 5. Add additional fields to clients for better contact management
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS contact_person TEXT;

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS website TEXT;

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comments for new fields
COMMENT ON COLUMN clients.contact_person IS 'Primary contact person name';
COMMENT ON COLUMN clients.website IS 'Client website URL';
COMMENT ON COLUMN clients.notes IS 'Additional notes about the client';

-- 6. Create index for contact_person searches
CREATE INDEX IF NOT EXISTS idx_clients_contact_person ON clients(contact_person);

-- 7. Add validation constraint for email format
-- This will only apply to new records, existing invalid emails will be ignored
ALTER TABLE clients 
ADD CONSTRAINT clients_email_check 
CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- 8. Show summary of updated data
SELECT 'Client Type Enhancement Summary' as info;
SELECT 
  COUNT(*) as total_clients,
  COUNT(CASE WHEN client_type IS NOT NULL THEN 1 END) as clients_with_type,
  COUNT(CASE WHEN contact_person IS NOT NULL THEN 1 END) as clients_with_contact,
  COUNT(CASE WHEN website IS NOT NULL THEN 1 END) as clients_with_website
FROM clients;

-- 9. Show distribution of client types
SELECT 'Client Type Distribution' as info;
SELECT 
  client_type,
  COUNT(*) as count
FROM clients 
GROUP BY client_type 
ORDER BY count DESC; 