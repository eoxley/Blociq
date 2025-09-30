-- RLS Policies for Contractor Module
-- Ensures proper access control for contractor and works order management

-- Enable RLS on contractor module tables
ALTER TABLE contractor_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE works_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE works_order_lines ENABLE ROW LEVEL SECURITY;

-- Contractor Documents - scoped by contractor building
CREATE POLICY "contractor_documents_read" ON contractor_documents
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM works_orders wo
            JOIN user_buildings ub ON ub.building_id = wo.building_id
            WHERE wo.contractor_id = contractor_documents.contractor_id
            AND ub.user_id = auth.uid()
        )
    );

CREATE POLICY "contractor_documents_write" ON contractor_documents
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM works_orders wo
            JOIN user_buildings ub ON ub.building_id = wo.building_id
            WHERE wo.contractor_id = contractor_documents.contractor_id
            AND ub.user_id = auth.uid()
            AND ub.role IN ('owner', 'manager')
        )
    );

-- Works Orders - scoped by building
CREATE POLICY "works_orders_read" ON works_orders
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM user_buildings ub
            WHERE ub.building_id = works_orders.building_id
            AND ub.user_id = auth.uid()
        )
    );

CREATE POLICY "works_orders_write" ON works_orders
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM user_buildings ub
            WHERE ub.building_id = works_orders.building_id
            AND ub.user_id = auth.uid()
            AND ub.role IN ('owner', 'manager')
        )
    );

-- Works Order Lines - inherit from works orders
CREATE POLICY "works_order_lines_read" ON works_order_lines
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM works_orders wo
            JOIN user_buildings ub ON ub.building_id = wo.building_id
            WHERE wo.id = works_order_lines.wo_id
            AND ub.user_id = auth.uid()
        )
    );

CREATE POLICY "works_order_lines_write" ON works_order_lines
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM works_orders wo
            JOIN user_buildings ub ON ub.building_id = wo.building_id
            WHERE wo.id = works_order_lines.wo_id
            AND ub.user_id = auth.uid()
            AND ub.role IN ('owner', 'manager')
        )
    );


