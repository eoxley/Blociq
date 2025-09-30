-- ========================================
-- LEASEHOLDER PORTAL ACCOUNTING TABLES
-- Date: 2024-12-21
-- Description: Create accounting tables for live financial data in portal
-- ========================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. CREATE AR_DEMAND_HEADERS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS ar_demand_headers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    leaseholder_id UUID NOT NULL,
    demand_number VARCHAR(50) UNIQUE NOT NULL,
    demand_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    outstanding_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paid', 'cancelled', 'overdue')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraint (if leaseholders table exists)
    CONSTRAINT fk_ar_demand_headers_leaseholder 
        FOREIGN KEY (leaseholder_id) 
        REFERENCES leaseholders(id) 
        ON DELETE CASCADE
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ar_demand_headers_leaseholder_id ON ar_demand_headers(leaseholder_id);
CREATE INDEX IF NOT EXISTS idx_ar_demand_headers_due_date ON ar_demand_headers(due_date);
CREATE INDEX IF NOT EXISTS idx_ar_demand_headers_status ON ar_demand_headers(status);
CREATE INDEX IF NOT EXISTS idx_ar_demand_headers_demand_number ON ar_demand_headers(demand_number);

-- ========================================
-- 2. CREATE AR_RECEIPTS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS ar_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    leaseholder_id UUID NOT NULL,
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(20) DEFAULT 'bank_transfer' CHECK (payment_method IN ('bank_transfer', 'cheque', 'cash', 'card', 'other')),
    reference VARCHAR(100),
    description TEXT,
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'reversed')),
    demand_header_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_ar_receipts_leaseholder 
        FOREIGN KEY (leaseholder_id) 
        REFERENCES leaseholders(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_ar_receipts_demand_header 
        FOREIGN KEY (demand_header_id) 
        REFERENCES ar_demand_headers(id) 
        ON DELETE SET NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ar_receipts_leaseholder_id ON ar_receipts(leaseholder_id);
CREATE INDEX IF NOT EXISTS idx_ar_receipts_payment_date ON ar_receipts(payment_date);
CREATE INDEX IF NOT EXISTS idx_ar_receipts_demand_header_id ON ar_receipts(demand_header_id);
CREATE INDEX IF NOT EXISTS idx_ar_receipts_receipt_number ON ar_receipts(receipt_number);

-- ========================================
-- 3. CREATE NOTIFICATION_QUEUE TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    recipient_type VARCHAR(20) DEFAULT 'managers' CHECK (recipient_type IN ('managers', 'leaseholders', 'directors', 'staff')),
    recipient_email VARCHAR(255),
    building_id UUID,
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled_at ON notification_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notification_queue_priority ON notification_queue(priority);
CREATE INDEX IF NOT EXISTS idx_notification_queue_building_id ON notification_queue(building_id);

-- ========================================
-- 4. CREATE AI_INTERACTIONS_LOG TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS ai_interactions_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    building_id UUID,
    lease_id UUID,
    query TEXT NOT NULL,
    response TEXT NOT NULL,
    context_type VARCHAR(50) DEFAULT 'general' CHECK (context_type IN ('general', 'leaseholder_portal', 'staff_dashboard', 'addin')),
    metadata JSONB,
    processing_time_ms INTEGER,
    tokens_used INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_interactions_log_user_id ON ai_interactions_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_log_building_id ON ai_interactions_log(building_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_log_lease_id ON ai_interactions_log(lease_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_log_context_type ON ai_interactions_log(context_type);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_log_created_at ON ai_interactions_log(created_at);

-- ========================================
-- 5. ADD RLS POLICIES FOR ACCOUNTING TABLES
-- ========================================

-- Enable RLS on all tables
ALTER TABLE ar_demand_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interactions_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for ar_demand_headers
CREATE POLICY "Users can view demand headers for their leaseholders" ON ar_demand_headers
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            -- Leaseholders can see their own demands
            leaseholder_id IN (
                SELECT l.id FROM leaseholder_users lu
                JOIN leaseholders l ON l.id = lu.leaseholder_id
                WHERE lu.user_id = auth.uid() AND l.portal_enabled = true
            )
            OR
            -- Staff can see demands for their agency buildings
            leaseholder_id IN (
                SELECT l.id FROM leaseholders l
                JOIN units u ON u.id = l.unit_id
                JOIN buildings b ON b.id = u.building_id
                WHERE b.agency_id = (
                    SELECT agency_id FROM profiles WHERE id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Staff can insert demand headers for their buildings" ON ar_demand_headers
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        leaseholder_id IN (
            SELECT l.id FROM leaseholders l
            JOIN units u ON u.id = l.unit_id
            JOIN buildings b ON b.id = u.building_id
            WHERE b.agency_id = (
                SELECT agency_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

-- RLS policies for ar_receipts
CREATE POLICY "Users can view receipts for their leaseholders" ON ar_receipts
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            -- Leaseholders can see their own receipts
            leaseholder_id IN (
                SELECT l.id FROM leaseholder_users lu
                JOIN leaseholders l ON l.id = lu.leaseholder_id
                WHERE lu.user_id = auth.uid() AND l.portal_enabled = true
            )
            OR
            -- Staff can see receipts for their agency buildings
            leaseholder_id IN (
                SELECT l.id FROM leaseholders l
                JOIN units u ON u.id = l.unit_id
                JOIN buildings b ON b.id = u.building_id
                WHERE b.agency_id = (
                    SELECT agency_id FROM profiles WHERE id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Staff can insert receipts for their buildings" ON ar_receipts
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        leaseholder_id IN (
            SELECT l.id FROM leaseholders l
            JOIN units u ON u.id = l.unit_id
            JOIN buildings b ON b.id = u.building_id
            WHERE b.agency_id = (
                SELECT agency_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

-- RLS policies for notification_queue
CREATE POLICY "Staff can view notifications for their buildings" ON notification_queue
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            building_id IN (
                SELECT id FROM buildings 
                WHERE agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid())
            )
            OR building_id IS NULL
        )
    );

CREATE POLICY "Staff can insert notifications for their buildings" ON notification_queue
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        (building_id IS NULL OR building_id IN (
            SELECT id FROM buildings 
            WHERE agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid())
        ))
    );

-- RLS policies for ai_interactions_log
CREATE POLICY "Users can view their own AI interactions" ON ai_interactions_log
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            user_id = auth.uid()
            OR
            -- Staff can see interactions for their buildings
            building_id IN (
                SELECT id FROM buildings 
                WHERE agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid())
            )
        )
    );

CREATE POLICY "Users can insert their own AI interactions" ON ai_interactions_log
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND user_id = auth.uid()
    );

-- ========================================
-- 6. CREATE TRIGGERS FOR UPDATED_AT
-- ========================================

-- Trigger for ar_demand_headers updated_at
CREATE OR REPLACE FUNCTION update_ar_demand_headers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ar_demand_headers_updated_at
    BEFORE UPDATE ON ar_demand_headers
    FOR EACH ROW
    EXECUTE FUNCTION update_ar_demand_headers_updated_at();

-- Trigger for ar_receipts updated_at
CREATE OR REPLACE FUNCTION update_ar_receipts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ar_receipts_updated_at
    BEFORE UPDATE ON ar_receipts
    FOR EACH ROW
    EXECUTE FUNCTION update_ar_receipts_updated_at();

-- Trigger for notification_queue updated_at
CREATE OR REPLACE FUNCTION update_notification_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_queue_updated_at
    BEFORE UPDATE ON notification_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_queue_updated_at();

-- ========================================
-- 7. CREATE HELPER FUNCTIONS
-- ========================================

-- Function to update outstanding amounts when receipts are added
CREATE OR REPLACE FUNCTION update_demand_outstanding_amount()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the demand header's outstanding amount
    UPDATE ar_demand_headers 
    SET outstanding_amount = GREATEST(0, total_amount - COALESCE((
        SELECT SUM(amount) 
        FROM ar_receipts 
        WHERE demand_header_id = NEW.demand_header_id 
        AND status = 'confirmed'
    ), 0))
    WHERE id = NEW.demand_header_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_demand_outstanding_on_receipt
    AFTER INSERT OR UPDATE OR DELETE ON ar_receipts
    FOR EACH ROW
    EXECUTE FUNCTION update_demand_outstanding_amount();

-- ========================================
-- 8. ADD COMMENTS FOR DOCUMENTATION
-- ========================================

COMMENT ON TABLE ar_demand_headers IS 'Stores payment demands/requests for leaseholders';
COMMENT ON TABLE ar_receipts IS 'Stores payment receipts from leaseholders';
COMMENT ON TABLE notification_queue IS 'Queue for email notifications to be sent';
COMMENT ON TABLE ai_interactions_log IS 'Log of AI assistant interactions for analytics';

COMMENT ON COLUMN ar_demand_headers.total_amount IS 'Total amount demanded from leaseholder';
COMMENT ON COLUMN ar_demand_headers.outstanding_amount IS 'Amount still outstanding after payments';
COMMENT ON COLUMN ar_receipts.amount IS 'Amount received from leaseholder';
COMMENT ON COLUMN notification_queue.priority IS 'Priority level for notification delivery';
COMMENT ON COLUMN ai_interactions_log.tokens_used IS 'Number of AI tokens consumed in interaction';
