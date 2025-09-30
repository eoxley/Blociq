-- RLS Policies for Accounting Tables
-- Ensures proper access control based on building ownership and organization scope

-- Enable RLS on all accounting tables
ALTER TABLE gl_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gl_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE gl_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_charge_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_apportionments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_demand_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_demand_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ap_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE ap_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_txns ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_periods ENABLE ROW LEVEL SECURITY;

-- Chart of Accounts - readable by all authenticated users, writable by owners
CREATE POLICY "gl_accounts_read" ON gl_accounts
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "gl_accounts_write" ON gl_accounts
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM buildings b
            WHERE b.id IN (
                SELECT building_id FROM user_buildings 
                WHERE user_id = auth.uid() AND role = 'owner'
            )
        )
    );

-- General Ledger Journals - scoped by building
CREATE POLICY "gl_journals_read" ON gl_journals
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM user_buildings ub
            WHERE ub.building_id = gl_journals.building_id
            AND ub.user_id = auth.uid()
        )
    );

CREATE POLICY "gl_journals_write" ON gl_journals
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM user_buildings ub
            WHERE ub.building_id = gl_journals.building_id
            AND ub.user_id = auth.uid()
            AND ub.role IN ('owner', 'manager')
        )
    );

-- General Ledger Lines - inherit from journals
CREATE POLICY "gl_lines_read" ON gl_lines
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM gl_journals gj
            JOIN user_buildings ub ON ub.building_id = gj.building_id
            WHERE gj.id = gl_lines.journal_id
            AND ub.user_id = auth.uid()
        )
    );

CREATE POLICY "gl_lines_write" ON gl_lines
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM gl_journals gj
            JOIN user_buildings ub ON ub.building_id = gj.building_id
            WHERE gj.id = gl_lines.journal_id
            AND ub.user_id = auth.uid()
            AND ub.role IN ('owner', 'manager')
        )
    );

-- Service Charge Schedules - scoped by building
CREATE POLICY "service_charge_schedules_read" ON service_charge_schedules
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM user_buildings ub
            WHERE ub.building_id = service_charge_schedules.building_id
            AND ub.user_id = auth.uid()
        )
    );

CREATE POLICY "service_charge_schedules_write" ON service_charge_schedules
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM user_buildings ub
            WHERE ub.building_id = service_charge_schedules.building_id
            AND ub.user_id = auth.uid()
            AND ub.role IN ('owner', 'manager')
        )
    );

-- Schedule Apportionments - inherit from schedules
CREATE POLICY "schedule_apportionments_read" ON schedule_apportionments
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM service_charge_schedules scs
            JOIN user_buildings ub ON ub.building_id = scs.building_id
            WHERE scs.id = schedule_apportionments.schedule_id
            AND ub.user_id = auth.uid()
        )
    );

CREATE POLICY "schedule_apportionments_write" ON schedule_apportionments
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM service_charge_schedules scs
            JOIN user_buildings ub ON ub.building_id = scs.building_id
            WHERE scs.id = schedule_apportionments.schedule_id
            AND ub.user_id = auth.uid()
            AND ub.role IN ('owner', 'manager')
        )
    );

-- AR Demand Headers - scoped by building
CREATE POLICY "ar_demand_headers_read" ON ar_demand_headers
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM user_buildings ub
            WHERE ub.building_id = ar_demand_headers.building_id
            AND ub.user_id = auth.uid()
        )
    );

CREATE POLICY "ar_demand_headers_write" ON ar_demand_headers
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM user_buildings ub
            WHERE ub.building_id = ar_demand_headers.building_id
            AND ub.user_id = auth.uid()
            AND ub.role IN ('owner', 'manager')
        )
    );

-- AR Demand Lines - inherit from headers
CREATE POLICY "ar_demand_lines_read" ON ar_demand_lines
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM ar_demand_headers adh
            JOIN user_buildings ub ON ub.building_id = adh.building_id
            WHERE adh.id = ar_demand_lines.header_id
            AND ub.user_id = auth.uid()
        )
    );

CREATE POLICY "ar_demand_lines_write" ON ar_demand_lines
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM ar_demand_headers adh
            JOIN user_buildings ub ON ub.building_id = adh.building_id
            WHERE adh.id = ar_demand_lines.header_id
            AND ub.user_id = auth.uid()
            AND ub.role IN ('owner', 'manager')
        )
    );

-- AR Receipts - scoped by bank account building
CREATE POLICY "ar_receipts_read" ON ar_receipts
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM bank_accounts ba
            JOIN user_buildings ub ON ub.building_id = ba.building_id
            WHERE ba.id = ar_receipts.bank_account_id
            AND ub.user_id = auth.uid()
        )
    );

CREATE POLICY "ar_receipts_write" ON ar_receipts
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM bank_accounts ba
            JOIN user_buildings ub ON ub.building_id = ba.building_id
            WHERE ba.id = ar_receipts.bank_account_id
            AND ub.user_id = auth.uid()
            AND ub.role IN ('owner', 'manager')
        )
    );

-- AR Allocations - inherit from receipts
CREATE POLICY "ar_allocations_read" ON ar_allocations
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM ar_receipts ar
            JOIN bank_accounts ba ON ba.id = ar.bank_account_id
            JOIN user_buildings ub ON ub.building_id = ba.building_id
            WHERE ar.id = ar_allocations.receipt_id
            AND ub.user_id = auth.uid()
        )
    );

CREATE POLICY "ar_allocations_write" ON ar_allocations
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM ar_receipts ar
            JOIN bank_accounts ba ON ba.id = ar.bank_account_id
            JOIN user_buildings ub ON ub.building_id = ba.building_id
            WHERE ar.id = ar_allocations.receipt_id
            AND ub.user_id = auth.uid()
            AND ub.role IN ('owner', 'manager')
        )
    );

-- AP Invoices - scoped by building
CREATE POLICY "ap_invoices_read" ON ap_invoices
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM user_buildings ub
            WHERE ub.building_id = ap_invoices.building_id
            AND ub.user_id = auth.uid()
        )
    );

CREATE POLICY "ap_invoices_write" ON ap_invoices
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM user_buildings ub
            WHERE ub.building_id = ap_invoices.building_id
            AND ub.user_id = auth.uid()
            AND ub.role IN ('owner', 'manager')
        )
    );

-- AP Payments - scoped by bank account building
CREATE POLICY "ap_payments_read" ON ap_payments
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM bank_accounts ba
            JOIN user_buildings ub ON ub.building_id = ba.building_id
            WHERE ba.id = ap_payments.bank_account_id
            AND ub.user_id = auth.uid()
        )
    );

CREATE POLICY "ap_payments_write" ON ap_payments
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM bank_accounts ba
            JOIN user_buildings ub ON ub.building_id = ba.building_id
            WHERE ba.id = ap_payments.bank_account_id
            AND ub.user_id = auth.uid()
            AND ub.role IN ('owner', 'manager')
        )
    );

-- Bank Accounts - scoped by building
CREATE POLICY "bank_accounts_read" ON bank_accounts
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM user_buildings ub
            WHERE ub.building_id = bank_accounts.building_id
            AND ub.user_id = auth.uid()
        )
    );

CREATE POLICY "bank_accounts_write" ON bank_accounts
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM user_buildings ub
            WHERE ub.building_id = bank_accounts.building_id
            AND ub.user_id = auth.uid()
            AND ub.role IN ('owner', 'manager')
        )
    );

-- Bank Transactions - inherit from bank accounts
CREATE POLICY "bank_txns_read" ON bank_txns
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM bank_accounts ba
            JOIN user_buildings ub ON ub.building_id = ba.building_id
            WHERE ba.id = bank_txns.bank_account_id
            AND ub.user_id = auth.uid()
        )
    );

CREATE POLICY "bank_txns_write" ON bank_txns
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM bank_accounts ba
            JOIN user_buildings ub ON ub.building_id = ba.building_id
            WHERE ba.id = bank_txns.bank_account_id
            AND ub.user_id = auth.uid()
            AND ub.role IN ('owner', 'manager')
        )
    );

-- Budget Versions - scoped by building
CREATE POLICY "budget_versions_read" ON budget_versions
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM user_buildings ub
            WHERE ub.building_id = budget_versions.building_id
            AND ub.user_id = auth.uid()
        )
    );

CREATE POLICY "budget_versions_write" ON budget_versions
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM user_buildings ub
            WHERE ub.building_id = budget_versions.building_id
            AND ub.user_id = auth.uid()
            AND ub.role IN ('owner', 'manager')
        )
    );

-- Budget Lines - inherit from versions
CREATE POLICY "budget_lines_read" ON budget_lines
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM budget_versions bv
            JOIN user_buildings ub ON ub.building_id = bv.building_id
            WHERE bv.id = budget_lines.version_id
            AND ub.user_id = auth.uid()
        )
    );

CREATE POLICY "budget_lines_write" ON budget_lines
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM budget_versions bv
            JOIN user_buildings ub ON ub.building_id = bv.building_id
            WHERE bv.id = budget_lines.version_id
            AND ub.user_id = auth.uid()
            AND ub.role IN ('owner', 'manager')
        )
    );

-- Funds - scoped by building
CREATE POLICY "funds_read" ON funds
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM user_buildings ub
            WHERE ub.building_id = funds.building_id
            AND ub.user_id = auth.uid()
        )
    );

CREATE POLICY "funds_write" ON funds
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM user_buildings ub
            WHERE ub.building_id = funds.building_id
            AND ub.user_id = auth.uid()
            AND ub.role IN ('owner', 'manager')
        )
    );

-- Attachments - scoped by entity
CREATE POLICY "attachments_read" ON attachments
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        (
            -- For building-related entities
            (entity_type IN ('building', 'schedule', 'demand', 'invoice', 'budget') AND
             EXISTS (
                 SELECT 1 FROM buildings b
                 JOIN user_buildings ub ON ub.building_id = b.id
                 WHERE b.id::text = entity_id
                 AND ub.user_id = auth.uid()
             ))
            OR
            -- For other entities (add more as needed)
            (entity_type NOT IN ('building', 'schedule', 'demand', 'invoice', 'budget'))
        )
    );

CREATE POLICY "attachments_write" ON attachments
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        (
            -- For building-related entities
            (entity_type IN ('building', 'schedule', 'demand', 'invoice', 'budget') AND
             EXISTS (
                 SELECT 1 FROM buildings b
                 JOIN user_buildings ub ON ub.building_id = b.id
                 WHERE b.id::text = entity_id
                 AND ub.user_id = auth.uid()
                 AND ub.role IN ('owner', 'manager')
             ))
            OR
            -- For other entities (add more as needed)
            (entity_type NOT IN ('building', 'schedule', 'demand', 'invoice', 'budget'))
        )
    );

-- Audit Log - readable by owners only
CREATE POLICY "audit_log_read" ON audit_log
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM user_buildings ub
            WHERE ub.user_id = auth.uid()
            AND ub.role = 'owner'
        )
    );

-- Accounting Periods - scoped by building
CREATE POLICY "accounting_periods_read" ON accounting_periods
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM user_buildings ub
            WHERE ub.building_id = accounting_periods.building_id
            AND ub.user_id = auth.uid()
        )
    );

CREATE POLICY "accounting_periods_write" ON accounting_periods
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM user_buildings ub
            WHERE ub.building_id = accounting_periods.building_id
            AND ub.user_id = auth.uid()
            AND ub.role = 'owner'
        )
    );
