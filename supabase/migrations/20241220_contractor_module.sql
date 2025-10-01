-- Contractor Module Migration
-- Adds comprehensive contractor management with works orders and compliance tracking

-- Contractors table (enhanced from previous migration)
CREATE TABLE IF NOT EXISTS contractors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text,
    phone text,
    vat_number text,
    categories text[] DEFAULT '{}',
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Contractor Documents table
CREATE TABLE contractor_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id uuid NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
    doc_type text NOT NULL CHECK (doc_type IN ('insurance', 'ram', 'method_statement', 'hmrc', 'other')),
    file_url text NOT NULL,
    valid_from date NOT NULL,
    valid_to date NOT NULL,
    status text GENERATED ALWAYS AS (
        CASE 
            WHEN valid_to < CURRENT_DATE THEN 'expired'
            ELSE 'valid'
        END
    ) STORED,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Works Orders table
CREATE TABLE works_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id uuid NOT NULL REFERENCES buildings(id),
    schedule_id uuid REFERENCES service_charge_schedules(id),
    contractor_id uuid NOT NULL REFERENCES contractors(id),
    raised_by uuid NOT NULL REFERENCES auth.users(id),
    ref text NOT NULL,
    title text NOT NULL,
    description text,
    priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'in_progress', 'completed', 'cancelled')),
    target_date date,
    approved_by uuid REFERENCES auth.users(id),
    approved_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Works Order Lines table
CREATE TABLE works_order_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    wo_id uuid NOT NULL REFERENCES works_orders(id) ON DELETE CASCADE,
    account_id uuid NOT NULL REFERENCES gl_accounts(id),
    description text NOT NULL,
    quantity numeric(10,2) DEFAULT 1 CHECK (quantity > 0),
    unit_cost numeric(12,2) DEFAULT 0 CHECK (unit_cost >= 0),
    total numeric(12,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    created_at timestamptz DEFAULT now()
);

-- Add works_order_id to ap_invoices
ALTER TABLE ap_invoices 
ADD COLUMN works_order_id uuid REFERENCES works_orders(id);

-- Add indexes for performance
CREATE INDEX idx_contractor_documents_contractor ON contractor_documents(contractor_id);
CREATE INDEX idx_contractor_documents_type ON contractor_documents(doc_type);
CREATE INDEX idx_contractor_documents_status ON contractor_documents(status);
CREATE INDEX idx_contractor_documents_valid_to ON contractor_documents(valid_to);

CREATE INDEX idx_works_orders_building ON works_orders(building_id);
CREATE INDEX idx_works_orders_contractor ON works_orders(contractor_id);
CREATE INDEX idx_works_orders_status ON works_orders(status);
CREATE INDEX idx_works_orders_ref ON works_orders(ref);
CREATE INDEX idx_works_orders_target_date ON works_orders(target_date);

CREATE INDEX idx_works_order_lines_wo ON works_order_lines(wo_id);
CREATE INDEX idx_works_order_lines_account ON works_order_lines(account_id);

CREATE INDEX idx_ap_invoices_works_order ON ap_invoices(works_order_id);

-- Add unique constraint for works order ref per building
ALTER TABLE works_orders 
ADD CONSTRAINT unique_wo_ref_per_building 
UNIQUE (building_id, ref);

-- Function to generate works order reference
CREATE OR REPLACE FUNCTION generate_wo_ref(building_uuid uuid)
RETURNS text AS $$
DECLARE
    building_code text;
    next_number int;
    wo_ref text;
BEGIN
    -- Get building code (first 3 chars of building name or use 'BLD')
    SELECT COALESCE(
        UPPER(LEFT(name, 3)), 
        'BLD'
    ) INTO building_code
    FROM buildings 
    WHERE id = building_uuid;
    
    -- Get next sequence number for this building
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(ref FROM 'WO-' || building_code || '-(\d+)') AS int)
    ), 0) + 1
    INTO next_number
    FROM works_orders 
    WHERE building_id = building_uuid
    AND ref LIKE 'WO-' || building_code || '-%';
    
    -- Format as WO-ASH-000123
    wo_ref := 'WO-' || building_code || '-' || LPAD(next_number::text, 6, '0');
    
    RETURN wo_ref;
END;
$$ LANGUAGE plpgsql;

-- Function to check contractor insurance validity
CREATE OR REPLACE FUNCTION check_contractor_insurance(contractor_uuid uuid, check_date date DEFAULT CURRENT_DATE)
RETURNS boolean AS $$
DECLARE
    valid_insurance boolean;
BEGIN
    SELECT EXISTS(
        SELECT 1 
        FROM contractor_documents 
        WHERE contractor_id = contractor_uuid 
        AND doc_type = 'insurance'
        AND valid_from <= check_date
        AND valid_to >= check_date
        AND status = 'valid'
    ) INTO valid_insurance;
    
    RETURN COALESCE(valid_insurance, false);
END;
$$ LANGUAGE plpgsql;

-- Function to get contractor compliance status
CREATE OR REPLACE FUNCTION get_contractor_compliance(contractor_uuid uuid)
RETURNS TABLE (
    doc_type text,
    status text,
    valid_to date,
    days_until_expiry int
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cd.doc_type,
        cd.status,
        cd.valid_to,
        EXTRACT(DAYS FROM (cd.valid_to - CURRENT_DATE))::int as days_until_expiry
    FROM contractor_documents cd
    WHERE cd.contractor_id = contractor_uuid
    ORDER BY cd.doc_type, cd.valid_to DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get works order totals
CREATE OR REPLACE FUNCTION get_works_order_totals(wo_uuid uuid)
RETURNS TABLE (
    total_estimated numeric(12,2),
    total_actual numeric(12,2),
    line_count int
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(wol.total), 0) as total_estimated,
        COALESCE(SUM(ai.total), 0) as total_actual,
        COUNT(wol.id)::int as line_count
    FROM works_order_lines wol
    LEFT JOIN ap_invoices ai ON ai.works_order_id = wo_uuid
    WHERE wol.wo_id = wo_uuid;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update contractor updated_at
CREATE OR REPLACE FUNCTION update_contractor_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contractor_updated_at_trigger
    BEFORE UPDATE ON contractors
    FOR EACH ROW
    EXECUTE FUNCTION update_contractor_updated_at();

-- Trigger to update works order updated_at
CREATE OR REPLACE FUNCTION update_works_order_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_works_order_updated_at_trigger
    BEFORE UPDATE ON works_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_works_order_updated_at();

-- Trigger to update contractor document updated_at
CREATE OR REPLACE FUNCTION update_contractor_document_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contractor_document_updated_at_trigger
    BEFORE UPDATE ON contractor_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_contractor_document_updated_at();




