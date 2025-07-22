-- Migration: Add email assignment fields to incoming_emails table
-- This allows emails to be assigned to specific units and leaseholders

-- 1. Add unit_id column to incoming_emails table
ALTER TABLE incoming_emails ADD COLUMN IF NOT EXISTS unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL;

-- 2. Add leaseholder_id column to incoming_emails table
ALTER TABLE incoming_emails ADD COLUMN IF NOT EXISTS leaseholder_id UUID REFERENCES leaseholders(id) ON DELETE SET NULL;

-- 3. Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_incoming_emails_unit_id ON incoming_emails(unit_id);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_leaseholder_id ON incoming_emails(leaseholder_id);

-- 4. Add comments to document the new fields
COMMENT ON COLUMN incoming_emails.unit_id IS 'Reference to the unit this email is assigned to';
COMMENT ON COLUMN incoming_emails.leaseholder_id IS 'Reference to the leaseholder this email is assigned to';

-- 5. Create a view for easy email assignment queries
CREATE OR REPLACE VIEW emails_with_assignments AS
SELECT 
    ie.id,
    ie.from_email,
    ie.subject,
    ie.body_preview,
    ie.received_at,
    ie.unread,
    ie.handled,
    ie.building_id,
    ie.unit_id,
    ie.leaseholder_id,
    b.name as building_name,
    u.unit_number,
    l.name as leaseholder_name,
    l.email as leaseholder_email,
    CASE 
        WHEN ie.unit_id IS NOT NULL AND ie.leaseholder_id IS NOT NULL THEN 
            CONCAT('Flat ', u.unit_number, ' – ', l.name)
        WHEN ie.unit_id IS NOT NULL THEN 
            CONCAT('Flat ', u.unit_number, ' – Unassigned')
        ELSE 'Unassigned'
    END as assignment_label
FROM incoming_emails ie
LEFT JOIN buildings b ON b.id = ie.building_id
LEFT JOIN units u ON u.id = ie.unit_id
LEFT JOIN leaseholders l ON l.id = ie.leaseholder_id; 