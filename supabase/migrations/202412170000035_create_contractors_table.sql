-- Create contractors table
CREATE TABLE IF NOT EXISTS contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  services TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE contractors IS 'Table to store contractor information for property management';
COMMENT ON COLUMN contractors.id IS 'Unique identifier for the contractor';
COMMENT ON COLUMN contractors.name IS 'Name of the contractor company';
COMMENT ON COLUMN contractors.contact_person IS 'Primary contact person at the contractor';
COMMENT ON COLUMN contractors.email IS 'Email address for the contractor';
COMMENT ON COLUMN contractors.phone IS 'Phone number for the contractor';
COMMENT ON COLUMN contractors.address IS 'Physical address of the contractor';
COMMENT ON COLUMN contractors.services IS 'Array of services provided by the contractor';
COMMENT ON COLUMN contractors.created_at IS 'Timestamp when the contractor record was created'; 