-- Accounting Spine Migration
-- Creates the core accounting tables for BlocIQ

-- Chart of Accounts
CREATE TABLE gl_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text UNIQUE NOT NULL,
    name text NOT NULL,
    type text NOT NULL CHECK (type IN ('ASSET', 'LIAB', 'INCOME', 'EXPENSE', 'EQUITY')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- General Ledger Journals
CREATE TABLE gl_journals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    date date NOT NULL,
    memo text,
    building_id uuid REFERENCES buildings(id),
    schedule_id uuid REFERENCES service_charge_schedules(id),
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- General Ledger Lines
CREATE TABLE gl_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_id uuid NOT NULL REFERENCES gl_journals(id) ON DELETE CASCADE,
    account_id uuid NOT NULL REFERENCES gl_accounts(id),
    debit numeric(12,2) DEFAULT 0 CHECK (debit >= 0),
    credit numeric(12,2) DEFAULT 0 CHECK (credit >= 0),
    unit_id uuid REFERENCES units(id),
    contractor_id uuid REFERENCES contractors(id),
    fund_id uuid REFERENCES funds(id),
    created_at timestamptz DEFAULT now()
);

-- Service Charge Schedules
CREATE TABLE service_charge_schedules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id uuid NOT NULL REFERENCES buildings(id),
    name text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Schedule Apportionments
CREATE TABLE schedule_apportionments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id uuid NOT NULL REFERENCES service_charge_schedules(id) ON DELETE CASCADE,
    unit_id uuid NOT NULL REFERENCES units(id),
    method text NOT NULL CHECK (method IN ('percent', 'weight', 'fixed')),
    share numeric(9,6) NOT NULL CHECK (share >= 0),
    cap numeric(12,2),
    floor numeric(12,2),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Accounts Receivable Demand Headers
CREATE TABLE ar_demand_headers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id uuid NOT NULL REFERENCES buildings(id),
    schedule_id uuid NOT NULL REFERENCES service_charge_schedules(id),
    unit_id uuid NOT NULL REFERENCES units(id),
    period_start date NOT NULL,
    period_end date NOT NULL,
    total numeric(12,2) NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'part-paid', 'cancelled')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Accounts Receivable Demand Lines
CREATE TABLE ar_demand_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    header_id uuid NOT NULL REFERENCES ar_demand_headers(id) ON DELETE CASCADE,
    account_id uuid NOT NULL REFERENCES gl_accounts(id),
    amount numeric(12,2) NOT NULL,
    narrative text,
    created_at timestamptz DEFAULT now()
);

-- Accounts Receivable Receipts
CREATE TABLE ar_receipts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_account_id uuid NOT NULL REFERENCES bank_accounts(id),
    date date NOT NULL,
    amount numeric(12,2) NOT NULL,
    payer_ref text,
    raw_ref text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Accounts Receivable Allocations
CREATE TABLE ar_allocations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id uuid NOT NULL REFERENCES ar_receipts(id) ON DELETE CASCADE,
    demand_header_id uuid NOT NULL REFERENCES ar_demand_headers(id),
    amount numeric(12,2) NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Accounts Payable Invoices
CREATE TABLE ap_invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id uuid NOT NULL REFERENCES contractors(id),
    building_id uuid NOT NULL REFERENCES buildings(id),
    schedule_id uuid REFERENCES service_charge_schedules(id),
    date date NOT NULL,
    due_date date,
    total numeric(12,2) NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'posted', 'paid')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Accounts Payable Payments
CREATE TABLE ap_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_account_id uuid NOT NULL REFERENCES bank_accounts(id),
    date date NOT NULL,
    amount numeric(12,2) NOT NULL,
    payee_ref text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Bank Accounts
CREATE TABLE bank_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id uuid NOT NULL REFERENCES buildings(id),
    schedule_id uuid REFERENCES service_charge_schedules(id),
    name text NOT NULL,
    sort_code text,
    account_no text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Bank Transactions
CREATE TABLE bank_txns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_account_id uuid NOT NULL REFERENCES bank_accounts(id),
    date date NOT NULL,
    amount numeric(12,2) NOT NULL,
    description text,
    external_ref text,
    created_at timestamptz DEFAULT now()
);

-- Budget Versions
CREATE TABLE budget_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id uuid NOT NULL REFERENCES buildings(id),
    schedule_id uuid REFERENCES service_charge_schedules(id),
    name text NOT NULL,
    year int NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Budget Lines
CREATE TABLE budget_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id uuid NOT NULL REFERENCES budget_versions(id) ON DELETE CASCADE,
    account_id uuid NOT NULL REFERENCES gl_accounts(id),
    fund_id uuid REFERENCES funds(id),
    amount numeric(12,2) NOT NULL,
    narrative text,
    created_at timestamptz DEFAULT now()
);

-- Funds
CREATE TABLE funds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id uuid NOT NULL REFERENCES buildings(id),
    name text NOT NULL CHECK (name IN ('Operational', 'Reserve', 'Major Works')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Attachments
CREATE TABLE attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    file_url text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Audit Log
CREATE TABLE audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor uuid REFERENCES auth.users(id),
    entity text NOT NULL,
    action text NOT NULL,
    at timestamptz DEFAULT now(),
    details jsonb
);

-- Accounting Periods (for period locks)
CREATE TABLE accounting_periods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id uuid NOT NULL REFERENCES buildings(id),
    period_name text NOT NULL,
    locked_before date NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_gl_journals_date ON gl_journals(date);
CREATE INDEX idx_gl_journals_building ON gl_journals(building_id);
CREATE INDEX idx_gl_lines_journal ON gl_lines(journal_id);
CREATE INDEX idx_gl_lines_account ON gl_lines(account_id);
CREATE INDEX idx_ar_demands_building ON ar_demand_headers(building_id);
CREATE INDEX idx_ar_demands_unit ON ar_demand_headers(unit_id);
CREATE INDEX idx_ar_demands_period ON ar_demand_headers(period_start, period_end);
CREATE INDEX idx_ar_receipts_date ON ar_receipts(date);
CREATE INDEX idx_ap_invoices_contractor ON ap_invoices(contractor_id);
CREATE INDEX idx_ap_invoices_building ON ap_invoices(building_id);
CREATE INDEX idx_bank_txns_date ON bank_txns(date);
CREATE INDEX idx_audit_log_entity ON audit_log(entity, at);
CREATE INDEX idx_attachments_entity ON attachments(entity_type, entity_id);

-- Constraints for double-entry validation
ALTER TABLE gl_lines ADD CONSTRAINT check_debit_credit CHECK (
    (debit > 0 AND credit = 0) OR (debit = 0 AND credit > 0)
);

-- Function to validate journal totals
CREATE OR REPLACE FUNCTION validate_journal_totals(journal_uuid uuid)
RETURNS boolean AS $$
DECLARE
    total_debits numeric(12,2);
    total_credits numeric(12,2);
BEGIN
    SELECT 
        COALESCE(SUM(debit), 0),
        COALESCE(SUM(credit), 0)
    INTO total_debits, total_credits
    FROM gl_lines 
    WHERE journal_id = journal_uuid;
    
    RETURN total_debits = total_credits;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate journal totals before insert/update
CREATE OR REPLACE FUNCTION check_journal_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT validate_journal_totals(NEW.journal_id) THEN
        RAISE EXCEPTION 'Journal debits must equal credits';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_journal_balance_trigger
    AFTER INSERT OR UPDATE ON gl_lines
    FOR EACH ROW
    EXECUTE FUNCTION check_journal_balance();
