-- ========================================
-- BLOCIQ PHASE 1: ACCOUNTING FOUNDATION
-- Date: 2024-12-21
-- Description: Complete double-entry GL system with AR/AP, banking, funds, budgets
-- ========================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. GENERAL LEDGER SYSTEM
-- ========================================

-- Chart of Accounts
CREATE TABLE IF NOT EXISTS gl_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_code VARCHAR(20) NOT NULL UNIQUE,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN (
        'ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'
    )),
    parent_account_id UUID REFERENCES gl_accounts(id),
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_account_code_format CHECK (account_code ~ '^[0-9]{1,6}(\.[0-9]{1,3})*$')
);

-- Accounting Periods
CREATE TABLE IF NOT EXISTS accounting_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_name VARCHAR(50) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    is_closed BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    is_audited BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT chk_period_dates CHECK (period_end > period_start),
    CONSTRAINT chk_period_name UNIQUE (period_name)
);

-- General Ledger Journals
CREATE TABLE IF NOT EXISTS gl_journals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal_number VARCHAR(50) NOT NULL UNIQUE,
    journal_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    reference VARCHAR(100),
    source_system VARCHAR(50) DEFAULT 'manual',
    building_id UUID,
    lease_id UUID,
    contractor_id UUID,
    works_order_id UUID,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'reversed')),
    total_debit DECIMAL(15,2) DEFAULT 0,
    total_credit DECIMAL(15,2) DEFAULT 0,
    created_by UUID NOT NULL,
    posted_by UUID,
    posted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_balanced_journal CHECK (total_debit = total_credit)
);

-- General Ledger Lines
CREATE TABLE IF NOT EXISTS gl_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal_id UUID NOT NULL REFERENCES gl_journals(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    account_id UUID NOT NULL REFERENCES gl_accounts(id),
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    description TEXT,
    reference VARCHAR(100),
    building_id UUID,
    lease_id UUID,
    contractor_id UUID,
    works_order_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_line_balanced CHECK (
        (debit_amount > 0 AND credit_amount = 0) OR 
        (credit_amount > 0 AND debit_amount = 0)
    ),
    CONSTRAINT chk_line_number CHECK (line_number > 0),
    CONSTRAINT chk_journal_line_unique UNIQUE (journal_id, line_number)
);

-- ========================================
-- 2. ACCOUNTS RECEIVABLE (LEASEHOLDERS)
-- ========================================

-- AR Demand Headers
CREATE TABLE IF NOT EXISTS ar_demand_headers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    demand_number VARCHAR(50) NOT NULL UNIQUE,
    demand_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    leaseholder_id UUID NOT NULL,
    building_id UUID NOT NULL,
    lease_id UUID,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    outstanding_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    description TEXT,
    demand_type VARCHAR(50) DEFAULT 'service_charge' CHECK (demand_type IN (
        'service_charge', 'ground_rent', 'major_works', 'insurance', 'other'
    )),
    period_start DATE,
    period_end DATE,
    created_by UUID NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AR Demand Lines
CREATE TABLE IF NOT EXISTS ar_demand_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    demand_header_id UUID NOT NULL REFERENCES ar_demand_headers(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    account_id UUID REFERENCES gl_accounts(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT chk_demand_line_number CHECK (line_number > 0),
    CONSTRAINT chk_demand_line_unique UNIQUE (demand_header_id, line_number)
);

-- AR Receipts
CREATE TABLE IF NOT EXISTS ar_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_number VARCHAR(50) NOT NULL UNIQUE,
    receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
    leaseholder_id UUID NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(20) DEFAULT 'bank_transfer' CHECK (payment_method IN (
        'bank_transfer', 'cheque', 'cash', 'card', 'online', 'other'
    )),
    reference VARCHAR(100),
    description TEXT,
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'reversed')),
    bank_transaction_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AR Allocations (Receipt to Demand matching)
CREATE TABLE IF NOT EXISTS ar_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_id UUID NOT NULL REFERENCES ar_receipts(id) ON DELETE CASCADE,
    demand_header_id UUID NOT NULL REFERENCES ar_demand_headers(id),
    allocated_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    allocation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT chk_positive_allocation CHECK (allocated_amount > 0)
);

-- ========================================
-- 3. ACCOUNTS PAYABLE (SUPPLIERS)
-- ========================================

-- Contractors/Suppliers
CREATE TABLE IF NOT EXISTS contractors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contractor_number VARCHAR(50) NOT NULL UNIQUE,
    company_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    vat_number VARCHAR(50),
    bank_account_number VARCHAR(50),
    bank_sort_code VARCHAR(10),
    categories TEXT[], -- Array of categories like ['roofing', 'drainage', 'lifts']
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contractor Documents
CREATE TABLE IF NOT EXISTS contractor_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
        'insurance', 'rams', 'certification', 'qualification', 'other'
    )),
    document_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    expiry_date DATE,
    status VARCHAR(20) DEFAULT 'valid' CHECK (status IN ('valid', 'expired', 'pending_renewal')),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL,
    
    CONSTRAINT chk_expiry_future CHECK (expiry_date IS NULL OR expiry_date > CURRENT_DATE)
);

-- AP Invoice Headers
CREATE TABLE IF NOT EXISTS ap_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    contractor_id UUID NOT NULL REFERENCES contractors(id),
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    vat_amount DECIMAL(12,2) DEFAULT 0,
    net_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid', 'cancelled')),
    reference VARCHAR(100),
    description TEXT,
    building_id UUID,
    works_order_id UUID,
    ocr_data JSONB, -- Store OCR extraction results
    file_path TEXT,
    created_by UUID NOT NULL,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT chk_invoice_amounts CHECK (total_amount = net_amount + vat_amount)
);

-- AP Invoice Lines
CREATE TABLE IF NOT EXISTS ap_invoice_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES ap_invoices(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    line_total DECIMAL(12,2) NOT NULL DEFAULT 0,
    account_id UUID REFERENCES gl_accounts(id),
    building_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT chk_invoice_line_number CHECK (line_number > 0),
    CONSTRAINT chk_invoice_line_unique UNIQUE (invoice_id, line_number),
    CONSTRAINT chk_line_total CHECK (line_total = quantity * unit_price)
);

-- AP Payments
CREATE TABLE IF NOT EXISTS ap_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number VARCHAR(50) NOT NULL UNIQUE,
    contractor_id UUID NOT NULL REFERENCES contractors(id),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(20) DEFAULT 'bank_transfer' CHECK (payment_method IN (
        'bank_transfer', 'cheque', 'cash', 'card', 'other'
    )),
    reference VARCHAR(100),
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'confirmed', 'cancelled')),
    bank_transaction_id UUID,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 4. BANKING SYSTEM
-- ========================================

-- Bank Accounts
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(50),
    sort_code VARCHAR(10),
    bank_name VARCHAR(255),
    account_type VARCHAR(50) DEFAULT 'current' CHECK (account_type IN ('current', 'savings', 'reserve')),
    building_id UUID,
    is_active BOOLEAN DEFAULT true,
    opening_balance DECIMAL(15,2) DEFAULT 0,
    current_balance DECIMAL(15,2) DEFAULT 0,
    last_reconciled_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bank Transactions
CREATE TABLE IF NOT EXISTS bank_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
    transaction_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    balance DECIMAL(15,2),
    description TEXT,
    reference VARCHAR(100),
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('debit', 'credit')),
    status VARCHAR(20) DEFAULT 'unreconciled' CHECK (status IN ('unreconciled', 'matched', 'reconciled')),
    matched_receipt_id UUID REFERENCES ar_receipts(id),
    matched_payment_id UUID REFERENCES ap_payments(id),
    imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reconciled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bank Statements
CREATE TABLE IF NOT EXISTS bank_statements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
    statement_date DATE NOT NULL,
    opening_balance DECIMAL(15,2) NOT NULL,
    closing_balance DECIMAL(15,2) NOT NULL,
    file_path TEXT,
    imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 5. FUNDS MANAGEMENT
-- ========================================

-- Fund Types
CREATE TABLE IF NOT EXISTS fund_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fund_code VARCHAR(20) NOT NULL UNIQUE,
    fund_name VARCHAR(255) NOT NULL,
    fund_category VARCHAR(50) NOT NULL CHECK (fund_category IN (
        'operational', 'reserve', 'major_works', 'sinking', 'other'
    )),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fund Balances by Building
CREATE TABLE IF NOT EXISTS fund_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID NOT NULL,
    fund_type_id UUID NOT NULL REFERENCES fund_types(id),
    current_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT chk_fund_balance_unique UNIQUE (building_id, fund_type_id)
);

-- Fund Transfers
CREATE TABLE IF NOT EXISTS fund_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_number VARCHAR(50) NOT NULL UNIQUE,
    building_id UUID NOT NULL,
    from_fund_type_id UUID NOT NULL REFERENCES fund_types(id),
    to_fund_type_id UUID NOT NULL REFERENCES fund_types(id),
    transfer_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'cancelled')),
    journal_id UUID REFERENCES gl_journals(id),
    created_by UUID NOT NULL,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT chk_different_funds CHECK (from_fund_type_id != to_fund_type_id),
    CONSTRAINT chk_positive_transfer CHECK (transfer_amount > 0)
);

-- ========================================
-- 6. BUDGETS & VARIANCE TRACKING
-- ========================================

-- Budget Versions
CREATE TABLE IF NOT EXISTS budget_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version_name VARCHAR(100) NOT NULL,
    building_id UUID NOT NULL,
    budget_year INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'active', 'superseded')),
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT chk_budget_year CHECK (budget_year >= 2020 AND budget_year <= 2050),
    CONSTRAINT chk_budget_version_unique UNIQUE (building_id, version_name)
);

-- Budget Lines
CREATE TABLE IF NOT EXISTS budget_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_version_id UUID NOT NULL REFERENCES budget_versions(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES gl_accounts(id),
    description TEXT,
    budget_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT chk_budget_line_unique UNIQUE (budget_version_id, account_id)
);

-- ========================================
-- 7. INDEXES FOR PERFORMANCE
-- ========================================

-- GL System Indexes
CREATE INDEX IF NOT EXISTS idx_gl_accounts_code ON gl_accounts(account_code);
CREATE INDEX IF NOT EXISTS idx_gl_accounts_type ON gl_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_gl_journals_date ON gl_journals(journal_date);
CREATE INDEX IF NOT EXISTS idx_gl_journals_building ON gl_journals(building_id);
CREATE INDEX IF NOT EXISTS idx_gl_journals_status ON gl_journals(status);
CREATE INDEX IF NOT EXISTS idx_gl_lines_account ON gl_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_gl_lines_journal ON gl_lines(journal_id);

-- AR System Indexes
CREATE INDEX IF NOT EXISTS idx_ar_demands_leaseholder ON ar_demand_headers(leaseholder_id);
CREATE INDEX IF NOT EXISTS idx_ar_demands_building ON ar_demand_headers(building_id);
CREATE INDEX IF NOT EXISTS idx_ar_demands_status ON ar_demand_headers(status);
CREATE INDEX IF NOT EXISTS idx_ar_demands_due_date ON ar_demand_headers(due_date);
CREATE INDEX IF NOT EXISTS idx_ar_receipts_leaseholder ON ar_receipts(leaseholder_id);
CREATE INDEX IF NOT EXISTS idx_ar_receipts_date ON ar_receipts(receipt_date);

-- AP System Indexes
CREATE INDEX IF NOT EXISTS idx_contractors_categories ON contractors USING gin(categories);
CREATE INDEX IF NOT EXISTS idx_contractor_docs_expiry ON contractor_documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_ap_invoices_contractor ON ap_invoices(contractor_id);
CREATE INDEX IF NOT EXISTS idx_ap_invoices_building ON ap_invoices(building_id);
CREATE INDEX IF NOT EXISTS idx_ap_invoices_status ON ap_invoices(status);

-- Banking Indexes
CREATE INDEX IF NOT EXISTS idx_bank_txns_account ON bank_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_txns_date ON bank_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_bank_txns_status ON bank_transactions(status);

-- Funds Indexes
CREATE INDEX IF NOT EXISTS idx_fund_balances_building ON fund_balances(building_id);
CREATE INDEX IF NOT EXISTS idx_fund_transfers_building ON fund_transfers(building_id);
CREATE INDEX IF NOT EXISTS idx_fund_transfers_status ON fund_transfers(status);

-- Budget Indexes
CREATE INDEX IF NOT EXISTS idx_budget_versions_building ON budget_versions(building_id);
CREATE INDEX IF NOT EXISTS idx_budget_versions_year ON budget_versions(budget_year);
CREATE INDEX IF NOT EXISTS idx_budget_lines_account ON budget_lines(account_id);

-- ========================================
-- 8. TRIGGERS FOR AUTOMATIC UPDATES
-- ========================================

-- Function to update journal totals
CREATE OR REPLACE FUNCTION update_journal_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE gl_journals 
    SET 
        total_debit = (
            SELECT COALESCE(SUM(debit_amount), 0) 
            FROM gl_lines 
            WHERE journal_id = COALESCE(NEW.journal_id, OLD.journal_id)
        ),
        total_credit = (
            SELECT COALESCE(SUM(credit_amount), 0) 
            FROM gl_lines 
            WHERE journal_id = COALESCE(NEW.journal_id, OLD.journal_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.journal_id, OLD.journal_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for GL lines
CREATE TRIGGER update_journal_totals_trigger
    AFTER INSERT OR UPDATE OR DELETE ON gl_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_journal_totals();

-- Function to update demand totals
CREATE OR REPLACE FUNCTION update_demand_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE ar_demand_headers 
    SET total_amount = (
        SELECT COALESCE(SUM(amount), 0) 
        FROM ar_demand_lines 
        WHERE demand_header_id = COALESCE(NEW.demand_header_id, OLD.demand_header_id)
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.demand_header_id, OLD.demand_header_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for demand lines
CREATE TRIGGER update_demand_totals_trigger
    AFTER INSERT OR UPDATE OR DELETE ON ar_demand_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_demand_totals();

-- Function to update outstanding amounts
CREATE OR REPLACE FUNCTION update_outstanding_amounts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update demand header outstanding amount
    UPDATE ar_demand_headers 
    SET outstanding_amount = total_amount - COALESCE((
        SELECT SUM(allocated_amount) 
        FROM ar_allocations 
        WHERE demand_header_id = COALESCE(NEW.demand_header_id, OLD.demand_header_id)
    ), 0),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.demand_header_id, OLD.demand_header_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for allocations
CREATE TRIGGER update_outstanding_amounts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON ar_allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_outstanding_amounts();

-- Function to update fund balances
CREATE OR REPLACE FUNCTION update_fund_balances()
RETURNS TRIGGER AS $$
DECLARE
    building_uuid UUID;
    fund_type_uuid UUID;
BEGIN
    -- Get building and fund type from the transfer
    IF TG_OP = 'INSERT' THEN
        building_uuid := NEW.building_id;
        fund_type_uuid := NEW.from_fund_type_id;
    ELSE
        building_uuid := OLD.building_id;
        fund_type_uuid := OLD.from_fund_type_id;
    END IF;
    
    -- Update from fund balance
    INSERT INTO fund_balances (building_id, fund_type_id, current_balance, last_updated)
    VALUES (building_uuid, fund_type_uuid, 0, NOW())
    ON CONFLICT (building_id, fund_type_id)
    DO UPDATE SET 
        current_balance = current_balance - COALESCE(NEW.transfer_amount, 0) + COALESCE(OLD.transfer_amount, 0),
        last_updated = NOW();
    
    -- Update to fund balance
    IF TG_OP = 'INSERT' THEN
        fund_type_uuid := NEW.to_fund_type_id;
    ELSE
        fund_type_uuid := OLD.to_fund_type_id;
    END IF;
    
    INSERT INTO fund_balances (building_id, fund_type_id, current_balance, last_updated)
    VALUES (building_uuid, fund_type_uuid, 0, NOW())
    ON CONFLICT (building_id, fund_type_id)
    DO UPDATE SET 
        current_balance = current_balance + COALESCE(NEW.transfer_amount, 0) - COALESCE(OLD.transfer_amount, 0),
        last_updated = NOW();
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for fund transfers
CREATE TRIGGER update_fund_balances_trigger
    AFTER INSERT OR UPDATE OR DELETE ON fund_transfers
    FOR EACH ROW
    EXECUTE FUNCTION update_fund_balances();

-- ========================================
-- 9. COMMENTS FOR DOCUMENTATION
-- ========================================

COMMENT ON TABLE gl_accounts IS 'Chart of accounts for double-entry bookkeeping';
COMMENT ON TABLE gl_journals IS 'General ledger journals with DR=CR validation';
COMMENT ON TABLE gl_lines IS 'Individual journal lines with account references';
COMMENT ON TABLE accounting_periods IS 'Accounting periods for year-end and audit control';
COMMENT ON TABLE ar_demand_headers IS 'AR demands raised to leaseholders';
COMMENT ON TABLE ar_demand_lines IS 'Line items within AR demands';
COMMENT ON TABLE ar_receipts IS 'Payments received from leaseholders';
COMMENT ON TABLE ar_allocations IS 'Allocation of receipts to demands';
COMMENT ON TABLE contractors IS 'Suppliers and contractors with categories';
COMMENT ON TABLE contractor_documents IS 'Contractor documents with expiry tracking';
COMMENT ON TABLE ap_invoices IS 'Supplier invoices with OCR support';
COMMENT ON TABLE ap_invoice_lines IS 'Line items within supplier invoices';
COMMENT ON TABLE ap_payments IS 'Payments made to suppliers';
COMMENT ON TABLE bank_accounts IS 'Bank accounts for reconciliation';
COMMENT ON TABLE bank_transactions IS 'Bank transactions imported from statements';
COMMENT ON TABLE bank_statements IS 'Bank statement imports';
COMMENT ON TABLE fund_types IS 'Types of funds (operational, reserve, major works)';
COMMENT ON TABLE fund_balances IS 'Current balances by building and fund type';
COMMENT ON TABLE fund_transfers IS 'Transfers between fund types';
COMMENT ON TABLE budget_versions IS 'Budget versions with approval workflow';
COMMENT ON TABLE budget_lines IS 'Budget line items by account';

-- ========================================
-- 10. INITIAL DATA SETUP
-- ========================================

-- Insert standard chart of accounts
INSERT INTO gl_accounts (account_code, account_name, account_type, description) VALUES
('1000', 'Current Assets', 'ASSET', 'Current asset accounts'),
('1100', 'Bank Accounts', 'ASSET', 'Bank and cash accounts'),
('1200', 'Accounts Receivable', 'ASSET', 'Money owed by leaseholders'),
('1300', 'Prepaid Expenses', 'ASSET', 'Prepaid insurance, rates etc'),
('2000', 'Current Liabilities', 'LIABILITY', 'Current liability accounts'),
('2100', 'Accounts Payable', 'LIABILITY', 'Money owed to suppliers'),
('2200', 'Accrued Expenses', 'LIABILITY', 'Accrued but unpaid expenses'),
('2300', 'Service Charge Receipts in Advance', 'LIABILITY', 'Service charges received in advance'),
('3000', 'Reserves', 'EQUITY', 'Reserve fund balances'),
('3100', 'Major Works Reserve', 'EQUITY', 'Major works sinking fund'),
('3200', 'General Reserve', 'EQUITY', 'General building reserve'),
('4000', 'Income', 'INCOME', 'Income accounts'),
('4100', 'Service Charges', 'INCOME', 'Service charge income'),
('4200', 'Ground Rent', 'INCOME', 'Ground rent income'),
('4300', 'Interest Income', 'INCOME', 'Interest on reserves'),
('5000', 'Expenses', 'EXPENSE', 'Expense accounts'),
('5100', 'Maintenance', 'EXPENSE', 'Building maintenance'),
('5200', 'Insurance', 'EXPENSE', 'Building insurance'),
('5300', 'Management Fees', 'EXPENSE', 'Property management fees'),
('5400', 'Professional Fees', 'EXPENSE', 'Legal, accounting, surveying fees'),
('5500', 'Utilities', 'EXPENSE', 'Electricity, gas, water'),
('5600', 'Cleaning', 'EXPENSE', 'Cleaning and caretaking'),
('5700', 'Major Works', 'EXPENSE', 'Major capital expenditure');

-- Insert standard fund types
INSERT INTO fund_types (fund_code, fund_name, fund_category, description) VALUES
('OP', 'Operational Fund', 'operational', 'Day-to-day building operations'),
('RS', 'Reserve Fund', 'reserve', 'General building reserve'),
('MW', 'Major Works Fund', 'major_works', 'Major capital expenditure'),
('SK', 'Sinking Fund', 'sinking', 'Long-term sinking fund');

-- Create current accounting period
INSERT INTO accounting_periods (period_name, period_start, period_end) VALUES
('2024-25', '2024-04-01', '2025-03-31');
