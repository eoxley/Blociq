-- RLS Policies for Contractors and AP Invoice Lines
-- Ensures proper access control for the new tables

-- Enable RLS on new tables
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ap_invoice_lines ENABLE ROW LEVEL SECURITY;

-- Contractors - readable by all authenticated users, writable by owners/managers
CREATE POLICY "contractors_read" ON contractors
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "contractors_write" ON contractors
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM user_buildings ub
            WHERE ub.user_id = auth.uid()
            AND ub.role IN ('owner', 'manager')
        )
    );

-- AP Invoice Lines - inherit from invoices
CREATE POLICY "ap_invoice_lines_read" ON ap_invoice_lines
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM ap_invoices ai
            JOIN user_buildings ub ON ub.building_id = ai.building_id
            WHERE ai.id = ap_invoice_lines.invoice_id
            AND ub.user_id = auth.uid()
        )
    );

CREATE POLICY "ap_invoice_lines_write" ON ap_invoice_lines
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM ap_invoices ai
            JOIN user_buildings ub ON ub.building_id = ai.building_id
            WHERE ai.id = ap_invoice_lines.invoice_id
            AND ub.user_id = auth.uid()
            AND ub.role IN ('owner', 'manager')
        )
    );

