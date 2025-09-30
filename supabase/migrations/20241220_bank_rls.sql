-- RLS Policies for Bank Statements
-- Ensures proper access control for bank reconciliation features

-- Enable RLS on bank_statements
ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY;

-- Bank Statements - scoped by bank account building
CREATE POLICY "bank_statements_read" ON bank_statements
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM bank_accounts ba
            JOIN user_buildings ub ON ub.building_id = ba.building_id
            WHERE ba.id = bank_statements.bank_account_id
            AND ub.user_id = auth.uid()
        )
    );

CREATE POLICY "bank_statements_write" ON bank_statements
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM bank_accounts ba
            JOIN user_buildings ub ON ub.building_id = ba.building_id
            WHERE ba.id = bank_statements.bank_account_id
            AND ub.user_id = auth.uid()
            AND ub.role IN ('owner', 'manager')
        )
    );

