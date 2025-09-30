-- Contractors and Extended AP Invoices Migration
-- Adds contractors table and extends AP invoice functionality

-- Contractors table
CREATE TABLE contractors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    contact_email text,
    insurance_expiry date,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Add new fields to ap_invoices
ALTER TABLE ap_invoices 
ADD COLUMN invoice_number text,
ADD COLUMN gross_total numeric(12,2),
ADD COLUMN vat_total numeric(12,2),
ADD COLUMN net_total numeric(12,2),
ADD COLUMN attachment_url text;

-- Update the existing total column to be net_total for backward compatibility
-- We'll keep both for now to avoid breaking existing data
ALTER TABLE ap_invoices 
ALTER COLUMN total SET DEFAULT 0;

-- Create ap_invoice_lines table
CREATE TABLE ap_invoice_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id uuid NOT NULL REFERENCES ap_invoices(id) ON DELETE CASCADE,
    description text NOT NULL,
    account_id uuid NOT NULL REFERENCES gl_accounts(id),
    net numeric(12,2) NOT NULL DEFAULT 0,
    vat numeric(12,2) NOT NULL DEFAULT 0,
    gross numeric(12,2) NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_contractors_name ON contractors(name);
CREATE INDEX idx_contractors_email ON contractors(contact_email);
CREATE INDEX idx_ap_invoices_contractor ON ap_invoices(contractor_id);
CREATE INDEX idx_ap_invoices_number ON ap_invoices(invoice_number);
CREATE INDEX idx_ap_invoice_lines_invoice ON ap_invoice_lines(invoice_id);
CREATE INDEX idx_ap_invoice_lines_account ON ap_invoice_lines(account_id);

-- Add constraints for invoice totals validation
ALTER TABLE ap_invoice_lines ADD CONSTRAINT check_gross_calculation 
CHECK (gross = net + vat);

-- Function to validate invoice totals
CREATE OR REPLACE FUNCTION validate_invoice_totals(invoice_uuid uuid)
RETURNS boolean AS $$
DECLARE
    invoice_record record;
    line_totals record;
BEGIN
    -- Get invoice totals
    SELECT gross_total, vat_total, net_total
    INTO invoice_record
    FROM ap_invoices 
    WHERE id = invoice_uuid;
    
    -- Get line totals
    SELECT 
        COALESCE(SUM(gross), 0) as total_gross,
        COALESCE(SUM(vat), 0) as total_vat,
        COALESCE(SUM(net), 0) as total_net
    INTO line_totals
    FROM ap_invoice_lines 
    WHERE invoice_id = invoice_uuid;
    
    -- Validate totals match
    RETURN (
        ABS(invoice_record.gross_total - line_totals.total_gross) < 0.01 AND
        ABS(invoice_record.vat_total - line_totals.total_vat) < 0.01 AND
        ABS(invoice_record.net_total - line_totals.total_net) < 0.01
    );
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate invoice totals before insert/update
CREATE OR REPLACE FUNCTION check_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT validate_invoice_totals(NEW.invoice_id) THEN
        RAISE EXCEPTION 'Invoice line totals do not match invoice totals';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_invoice_totals_trigger
    AFTER INSERT OR UPDATE ON ap_invoice_lines
    FOR EACH ROW
    EXECUTE FUNCTION check_invoice_totals();

-- Add unique constraint for invoice numbers per contractor
ALTER TABLE ap_invoices 
ADD CONSTRAINT unique_invoice_per_contractor 
UNIQUE (contractor_id, invoice_number);

