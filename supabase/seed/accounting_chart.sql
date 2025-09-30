-- UK Leasehold-Friendly Chart of Accounts
-- Seed data for the accounting spine

-- Insert Chart of Accounts
INSERT INTO gl_accounts (code, name, type) VALUES
-- ASSETS
('1000', 'Bank - Current Account', 'ASSET'),
('1010', 'Bank - Reserve Fund', 'ASSET'),
('1020', 'Bank - Major Works Fund', 'ASSET'),
('1100', 'Accounts Receivable Control', 'ASSET'),
('1200', 'Prepaid Expenses', 'ASSET'),
('1300', 'Deposits Held', 'ASSET'),
('1400', 'Fixed Assets - Building', 'ASSET'),
('1410', 'Fixed Assets - Equipment', 'ASSET'),
('1500', 'Accumulated Depreciation - Building', 'ASSET'),
('1510', 'Accumulated Depreciation - Equipment', 'ASSET'),

-- LIABILITIES
('2000', 'Accounts Payable Control', 'LIAB'),
('2100', 'Accrued Expenses', 'LIAB'),
('2200', 'Service Charge Deposits', 'LIAB'),
('2300', 'VAT Payable', 'LIAB'),
('2400', 'Corporation Tax Payable', 'LIAB'),
('2500', 'Other Creditors', 'LIAB'),

-- EQUITY
('3000', 'Reserve Fund', 'EQUITY'),
('3010', 'Major Works Fund', 'EQUITY'),
('3020', 'Retained Earnings', 'EQUITY'),

-- INCOME
('4000', 'Service Charge Income - Residential', 'INCOME'),
('4010', 'Service Charge Income - Commercial', 'INCOME'),
('4020', 'Ground Rent Income', 'INCOME'),
('4030', 'Interest Income', 'INCOME'),
('4040', 'Other Income', 'INCOME'),
('4050', 'Insurance Recovery Income', 'INCOME'),

-- EXPENSES
('5000', 'Repairs & Maintenance - Lifts', 'EXPENSE'),
('5010', 'Repairs & Maintenance - Cleaning', 'EXPENSE'),
('5020', 'Repairs & Maintenance - Utilities', 'EXPENSE'),
('5030', 'Repairs & Maintenance - Building', 'EXPENSE'),
('5040', 'Repairs & Maintenance - Grounds', 'EXPENSE'),
('5050', 'Repairs & Maintenance - Other', 'EXPENSE'),
('5100', 'Insurance - Buildings', 'EXPENSE'),
('5110', 'Insurance - Public Liability', 'EXPENSE'),
('5120', 'Insurance - Professional Indemnity', 'EXPENSE'),
('5130', 'Insurance - Other', 'EXPENSE'),
('5200', 'Professional Fees - Legal', 'EXPENSE'),
('5210', 'Professional Fees - Accountancy', 'EXPENSE'),
('5220', 'Professional Fees - Surveying', 'EXPENSE'),
('5230', 'Professional Fees - Other', 'EXPENSE'),
('5300', 'Management Fees', 'EXPENSE'),
('5400', 'Utilities - Electricity', 'EXPENSE'),
('5410', 'Utilities - Gas', 'EXPENSE'),
('5420', 'Utilities - Water', 'EXPENSE'),
('5430', 'Utilities - Other', 'EXPENSE'),
('5500', 'Security Services', 'EXPENSE'),
('5600', 'Cleaning Services', 'EXPENSE'),
('5700', 'Grounds Maintenance', 'EXPENSE'),
('5800', 'Major Works - Lifts', 'EXPENSE'),
('5810', 'Major Works - Roofing', 'EXPENSE'),
('5820', 'Major Works - Windows', 'EXPENSE'),
('5830', 'Major Works - Heating', 'EXPENSE'),
('5840', 'Major Works - Other', 'EXPENSE'),
('5900', 'Administrative Expenses', 'EXPENSE'),
('5910', 'Bank Charges', 'EXPENSE'),
('5920', 'Stationery & Printing', 'EXPENSE'),
('5930', 'Telephone & Internet', 'EXPENSE'),
('5940', 'Travel & Subsistence', 'EXPENSE'),
('5950', 'Training & Development', 'EXPENSE'),
('5960', 'Other Operating Expenses', 'EXPENSE'),
('6000', 'Depreciation - Building', 'EXPENSE'),
('6010', 'Depreciation - Equipment', 'EXPENSE'),
('6100', 'Bad Debts', 'EXPENSE'),
('6200', 'Interest Expense', 'EXPENSE'),
('6300', 'VAT on Expenses', 'EXPENSE'),
('6400', 'Corporation Tax', 'EXPENSE');

-- Create sample funds for a building (these would be created per building)
-- Note: In practice, these would be created when a building is set up
-- This is just an example structure

-- Sample service charge schedule categories (these would be created per building)
-- Note: In practice, these would be created when a building is set up
-- This shows the typical structure for UK leasehold properties

-- Common service charge categories for UK leasehold:
-- 1. Repairs & Maintenance (Lifts, Cleaning, Utilities, Building, Grounds)
-- 2. Insurance (Buildings, Public Liability, Professional Indemnity)
-- 3. Professional Fees (Legal, Accountancy, Surveying)
-- 4. Management Fees
-- 5. Utilities (Electricity, Gas, Water)
-- 6. Security Services
-- 7. Grounds Maintenance
-- 8. Major Works (Lifts, Roofing, Windows, Heating)
-- 9. Administrative Expenses

-- The chart above provides a comprehensive foundation for UK leasehold accounting
-- with proper categorization for service charges, major works, and reserve funds
