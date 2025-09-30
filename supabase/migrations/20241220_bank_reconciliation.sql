-- Bank Reconciliation Migration
-- Adds bank statements and extends bank transactions for reconciliation

-- Create bank_statements table
CREATE TABLE bank_statements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_account_id uuid NOT NULL REFERENCES bank_accounts(id),
    period_start date NOT NULL,
    period_end date NOT NULL,
    opening_balance numeric(12,2) NOT NULL,
    closing_balance numeric(12,2) NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Extend bank_txns with reconciliation fields
ALTER TABLE bank_txns 
ADD COLUMN statement_id uuid REFERENCES bank_statements(id),
ADD COLUMN reconciled boolean DEFAULT false,
ADD COLUMN matched_entity text CHECK (matched_entity IN ('ar_receipt', 'ap_payment')),
ADD COLUMN matched_id uuid;

-- Add indexes for performance
CREATE INDEX idx_bank_statements_account ON bank_statements(bank_account_id);
CREATE INDEX idx_bank_statements_period ON bank_statements(period_start, period_end);
CREATE INDEX idx_bank_txns_statement ON bank_txns(statement_id);
CREATE INDEX idx_bank_txns_reconciled ON bank_txns(reconciled);
CREATE INDEX idx_bank_txns_matched ON bank_txns(matched_entity, matched_id);

-- Add unique constraint for statements per account per period
ALTER TABLE bank_statements 
ADD CONSTRAINT unique_statement_period 
UNIQUE (bank_account_id, period_start, period_end);

-- Function to validate bank statement totals
CREATE OR REPLACE FUNCTION validate_bank_statement_totals(statement_uuid uuid)
RETURNS boolean AS $$
DECLARE
    statement_record record;
    transaction_totals record;
BEGIN
    -- Get statement details
    SELECT opening_balance, closing_balance
    INTO statement_record
    FROM bank_statements 
    WHERE id = statement_uuid;
    
    -- Get transaction totals
    SELECT 
        COALESCE(SUM(amount), 0) as total_amount
    INTO transaction_totals
    FROM bank_txns 
    WHERE statement_id = statement_uuid;
    
    -- Validate that opening + transactions = closing
    RETURN (
        ABS(statement_record.opening_balance + transaction_totals.total_amount - statement_record.closing_balance) < 0.01
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get bank account balance
CREATE OR REPLACE FUNCTION get_bank_account_balance(account_uuid uuid, as_of_date date DEFAULT CURRENT_DATE)
RETURNS numeric(12,2) AS $$
DECLARE
    balance numeric(12,2);
BEGIN
    SELECT COALESCE(SUM(amount), 0)
    INTO balance
    FROM bank_txns 
    WHERE bank_account_id = account_uuid
    AND date <= as_of_date;
    
    RETURN balance;
END;
$$ LANGUAGE plpgsql;

-- Function to get unreconciled transactions
CREATE OR REPLACE FUNCTION get_unreconciled_transactions(account_uuid uuid, limit_count int DEFAULT 100)
RETURNS TABLE (
    id uuid,
    date date,
    amount numeric(12,2),
    description text,
    external_ref text,
    statement_id uuid
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bt.id,
        bt.date,
        bt.amount,
        bt.description,
        bt.external_ref,
        bt.statement_id
    FROM bank_txns bt
    WHERE bt.bank_account_id = account_uuid
    AND bt.reconciled = false
    ORDER BY bt.date DESC, bt.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to suggest matches for reconciliation
CREATE OR REPLACE FUNCTION suggest_reconciliation_matches(
    txn_uuid uuid,
    match_type text DEFAULT 'both'
)
RETURNS TABLE (
    entity_type text,
    entity_id uuid,
    entity_ref text,
    amount numeric(12,2),
    date date,
    match_score numeric(3,2)
) AS $$
DECLARE
    txn_record record;
    days_tolerance int := 7;
    amount_tolerance numeric(12,2) := 0.01;
BEGIN
    -- Get transaction details
    SELECT * INTO txn_record
    FROM bank_txns 
    WHERE id = txn_uuid;
    
    -- Suggest AR receipts if amount is positive or match_type includes 'receipt'
    IF txn_record.amount > 0 AND (match_type = 'both' OR match_type = 'receipt') THEN
        RETURN QUERY
        SELECT 
            'ar_receipt'::text as entity_type,
            ar.id as entity_id,
            COALESCE(ar.payer_ref, ar.raw_ref, '') as entity_ref,
            ar.amount,
            ar.date,
            CASE 
                WHEN ABS(ar.amount - txn_record.amount) <= amount_tolerance THEN 1.0
                WHEN ABS(ar.amount - txn_record.amount) <= amount_tolerance * 10 THEN 0.8
                ELSE 0.5
            END as match_score
        FROM ar_receipts ar
        JOIN bank_accounts ba ON ba.id = ar.bank_account_id
        WHERE ba.id = txn_record.bank_account_id
        AND ABS(ar.amount - txn_record.amount) <= amount_tolerance * 10
        AND ABS(EXTRACT(DAYS FROM (ar.date - txn_record.date))) <= days_tolerance
        AND NOT EXISTS (
            SELECT 1 FROM bank_txns bt2 
            WHERE bt2.matched_entity = 'ar_receipt' 
            AND bt2.matched_id = ar.id
        )
        ORDER BY match_score DESC, ABS(ar.amount - txn_record.amount), ABS(EXTRACT(DAYS FROM (ar.date - txn_record.date)));
    END IF;
    
    -- Suggest AP payments if amount is negative or match_type includes 'payment'
    IF txn_record.amount < 0 AND (match_type = 'both' OR match_type = 'payment') THEN
        RETURN QUERY
        SELECT 
            'ap_payment'::text as entity_type,
            ap.id as entity_id,
            COALESCE(ap.payee_ref, '') as entity_ref,
            ap.amount,
            ap.date,
            CASE 
                WHEN ABS(ap.amount - ABS(txn_record.amount)) <= amount_tolerance THEN 1.0
                WHEN ABS(ap.amount - ABS(txn_record.amount)) <= amount_tolerance * 10 THEN 0.8
                ELSE 0.5
            END as match_score
        FROM ap_payments ap
        JOIN bank_accounts ba ON ba.id = ap.bank_account_id
        WHERE ba.id = txn_record.bank_account_id
        AND ABS(ap.amount - ABS(txn_record.amount)) <= amount_tolerance * 10
        AND ABS(EXTRACT(DAYS FROM (ap.date - txn_record.date))) <= days_tolerance
        AND NOT EXISTS (
            SELECT 1 FROM bank_txns bt2 
            WHERE bt2.matched_entity = 'ap_payment' 
            AND bt2.matched_id = ap.id
        )
        ORDER BY match_score DESC, ABS(ap.amount - ABS(txn_record.amount)), ABS(EXTRACT(DAYS FROM (ap.date - txn_record.date)));
    END IF;
END;
$$ LANGUAGE plpgsql;

