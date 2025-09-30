-- ========================================
-- BLOCIQ PHASE 2: WORKS ORDERS SYSTEM
-- Date: 2024-12-21
-- Description: Works orders with approval workflow and contractor integration
-- ========================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. WORKS ORDERS SYSTEM
-- ========================================

-- Works Order Headers
CREATE TABLE IF NOT EXISTS works_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    works_order_number VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    building_id UUID NOT NULL,
    contractor_id UUID REFERENCES contractors(id),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'in_progress', 'completed', 'cancelled')),
    estimated_cost DECIMAL(12,2) DEFAULT 0,
    actual_cost DECIMAL(12,2) DEFAULT 0,
    start_date DATE,
    target_completion_date DATE,
    actual_completion_date DATE,
    issued_date DATE,
    created_by UUID NOT NULL,
    issued_by UUID,
    completed_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_completion_date CHECK (
        actual_completion_date IS NULL OR 
        (start_date IS NULL OR actual_completion_date >= start_date)
    ),
    CONSTRAINT chk_target_date CHECK (
        target_completion_date IS NULL OR 
        (start_date IS NULL OR target_completion_date >= start_date)
    )
);

-- Works Order Lines
CREATE TABLE IF NOT EXISTS works_order_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    works_order_id UUID NOT NULL REFERENCES works_orders(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) DEFAULT 1,
    unit_price DECIMAL(12,2) DEFAULT 0,
    line_total DECIMAL(12,2) DEFAULT 0,
    account_id UUID REFERENCES gl_accounts(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_works_order_line_number CHECK (line_number > 0),
    CONSTRAINT chk_works_order_line_unique UNIQUE (works_order_id, line_number),
    CONSTRAINT chk_works_order_line_total CHECK (line_total = quantity * unit_price)
);

-- Works Order Status History
CREATE TABLE IF NOT EXISTS works_order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    works_order_id UUID NOT NULL REFERENCES works_orders(id) ON DELETE CASCADE,
    from_status VARCHAR(20),
    to_status VARCHAR(20) NOT NULL,
    changed_by UUID NOT NULL,
    change_reason TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Works Order Attachments
CREATE TABLE IF NOT EXISTS works_order_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    works_order_id UUID NOT NULL REFERENCES works_orders(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(100),
    uploaded_by UUID NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 2. WORKS ORDER APPROVAL WORKFLOW
-- ========================================

-- Works Order Approvals
CREATE TABLE IF NOT EXISTS works_order_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    works_order_id UUID NOT NULL REFERENCES works_orders(id) ON DELETE CASCADE,
    approval_type VARCHAR(50) NOT NULL CHECK (approval_type IN ('issue', 'complete', 'cost_increase')),
    required_approver_role VARCHAR(50) NOT NULL CHECK (required_approver_role IN ('manager', 'director', 'accounts')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT chk_approval_status CHECK (
        (status = 'pending' AND approved_by IS NULL AND approved_at IS NULL) OR
        (status IN ('approved', 'rejected') AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
    )
);

-- ========================================
-- 3. CONTRACTOR COMPLIANCE CHECKS
-- ========================================

-- Function to check contractor compliance
CREATE OR REPLACE FUNCTION check_contractor_compliance(contractor_uuid UUID)
RETURNS TABLE (
    is_compliant BOOLEAN,
    missing_requirements TEXT[],
    expired_documents TEXT[]
) AS $$
DECLARE
    missing_reqs TEXT[] := ARRAY[]::TEXT[];
    expired_docs TEXT[] := ARRAY[]::TEXT[];
    has_valid_insurance BOOLEAN := FALSE;
    has_valid_rams BOOLEAN := FALSE;
BEGIN
    -- Check for valid insurance
    SELECT EXISTS(
        SELECT 1 FROM contractor_documents 
        WHERE contractor_id = contractor_uuid 
        AND document_type = 'insurance' 
        AND status = 'valid'
    ) INTO has_valid_insurance;
    
    IF NOT has_valid_insurance THEN
        missing_reqs := array_append(missing_reqs, 'Valid insurance required');
    END IF;
    
    -- Check for valid RAMS
    SELECT EXISTS(
        SELECT 1 FROM contractor_documents 
        WHERE contractor_id = contractor_uuid 
        AND document_type = 'rams' 
        AND status = 'valid'
    ) INTO has_valid_rams;
    
    IF NOT has_valid_rams THEN
        missing_reqs := array_append(missing_reqs, 'Valid RAMS required');
    END IF;
    
    -- Get expired documents
    SELECT ARRAY(
        SELECT document_type || ' - ' || document_name
        FROM contractor_documents 
        WHERE contractor_id = contractor_uuid 
        AND status = 'expired'
    ) INTO expired_docs;
    
    RETURN QUERY SELECT 
        (array_length(missing_reqs, 1) IS NULL AND array_length(expired_docs, 1) IS NULL),
        missing_reqs,
        expired_docs;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 4. INDEXES FOR PERFORMANCE
-- ========================================

-- Works Orders Indexes
CREATE INDEX IF NOT EXISTS idx_works_orders_building ON works_orders(building_id);
CREATE INDEX IF NOT EXISTS idx_works_orders_contractor ON works_orders(contractor_id);
CREATE INDEX IF NOT EXISTS idx_works_orders_status ON works_orders(status);
CREATE INDEX IF NOT EXISTS idx_works_orders_priority ON works_orders(priority);
CREATE INDEX IF NOT EXISTS idx_works_orders_created_at ON works_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_works_order_lines_works_order ON works_order_lines(works_order_id);
CREATE INDEX IF NOT EXISTS idx_works_order_status_history_works_order ON works_order_status_history(works_order_id);
CREATE INDEX IF NOT EXISTS idx_works_order_attachments_works_order ON works_order_attachments(works_order_id);
CREATE INDEX IF NOT EXISTS idx_works_order_approvals_works_order ON works_order_approvals(works_order_id);

-- ========================================
-- 5. TRIGGERS FOR AUTOMATIC UPDATES
-- ========================================

-- Function to update works order totals
CREATE OR REPLACE FUNCTION update_works_order_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE works_orders 
    SET 
        estimated_cost = (
            SELECT COALESCE(SUM(line_total), 0) 
            FROM works_order_lines 
            WHERE works_order_id = COALESCE(NEW.works_order_id, OLD.works_order_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.works_order_id, OLD.works_order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for works order lines
CREATE TRIGGER update_works_order_totals_trigger
    AFTER INSERT OR UPDATE OR DELETE ON works_order_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_works_order_totals();

-- Function to log status changes
CREATE OR REPLACE FUNCTION log_works_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO works_order_status_history (
            works_order_id,
            from_status,
            to_status,
            changed_by
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            NEW.updated_by -- This would need to be set in the application
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for works order status changes
CREATE TRIGGER log_works_order_status_change_trigger
    AFTER UPDATE ON works_orders
    FOR EACH ROW
    EXECUTE FUNCTION log_works_order_status_change();

-- ========================================
-- 6. RLS POLICIES
-- ========================================

-- Enable RLS on all tables
ALTER TABLE works_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE works_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE works_order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE works_order_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE works_order_approvals ENABLE ROW LEVEL SECURITY;

-- RLS policies for works_orders
CREATE POLICY "Users can view works orders for their buildings" ON works_orders
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        building_id IN (
            SELECT id FROM buildings 
            WHERE agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid())
        )
    );

CREATE POLICY "Users can create works orders for their buildings" ON works_orders
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        building_id IN (
            SELECT id FROM buildings 
            WHERE agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid())
        )
    );

CREATE POLICY "Users can update works orders for their buildings" ON works_orders
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND
        building_id IN (
            SELECT id FROM buildings 
            WHERE agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid())
        )
    );

-- RLS policies for works_order_lines
CREATE POLICY "Users can view works order lines for their buildings" ON works_order_lines
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        works_order_id IN (
            SELECT id FROM works_orders 
            WHERE building_id IN (
                SELECT id FROM buildings 
                WHERE agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid())
            )
        )
    );

CREATE POLICY "Users can modify works order lines for their buildings" ON works_order_lines
    FOR ALL USING (
        auth.uid() IS NOT NULL AND
        works_order_id IN (
            SELECT id FROM works_orders 
            WHERE building_id IN (
                SELECT id FROM buildings 
                WHERE agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid())
            )
        )
    );

-- RLS policies for other works order tables
CREATE POLICY "Users can view works order status history for their buildings" ON works_order_status_history
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        works_order_id IN (
            SELECT id FROM works_orders 
            WHERE building_id IN (
                SELECT id FROM buildings 
                WHERE agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid())
            )
        )
    );

CREATE POLICY "Users can view works order attachments for their buildings" ON works_order_attachments
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        works_order_id IN (
            SELECT id FROM works_orders 
            WHERE building_id IN (
                SELECT id FROM buildings 
                WHERE agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid())
            )
        )
    );

CREATE POLICY "Users can manage works order approvals for their buildings" ON works_order_approvals
    FOR ALL USING (
        auth.uid() IS NOT NULL AND
        works_order_id IN (
            SELECT id FROM works_orders 
            WHERE building_id IN (
                SELECT id FROM buildings 
                WHERE agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid())
            )
        )
    );

-- ========================================
-- 7. COMMENTS FOR DOCUMENTATION
-- ========================================

COMMENT ON TABLE works_orders IS 'Works orders with approval workflow and contractor integration';
COMMENT ON TABLE works_order_lines IS 'Line items within works orders';
COMMENT ON TABLE works_order_status_history IS 'Audit trail of works order status changes';
COMMENT ON TABLE works_order_attachments IS 'File attachments for works orders';
COMMENT ON TABLE works_order_approvals IS 'Approval workflow for works orders';
COMMENT ON FUNCTION check_contractor_compliance(UUID) IS 'Checks if contractor has valid insurance and RAMS';

-- ========================================
-- 8. INITIAL DATA SETUP
-- ========================================

-- Insert standard works order priorities and statuses are handled by CHECK constraints
-- No initial data needed as these are controlled by application logic
