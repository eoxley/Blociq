-- Add sample compliance data for testing
-- This script adds compliance items and building assets for the existing buildings

-- Insert sample compliance items
INSERT INTO compliance_items (id, item_type, category, frequency, status, assigned_to, notes) VALUES
(1, 'Fire Safety Certificate', 'Fire', '1 year', 'active', 'Building Manager', 'Annual fire safety inspection required'),
(2, 'Gas Safety Certificate', 'Gas', '1 year', 'active', 'Gas Engineer', 'Annual gas safety inspection required'),
(3, 'Electrical Safety Certificate', 'Electrical', '5 years', 'active', 'Electrician', '5-year electrical safety inspection'),
(4, 'Lift Maintenance Certificate', 'Equipment', '1 year', 'active', 'Lift Engineer', 'Annual lift maintenance and inspection'),
(5, 'Asbestos Survey', 'Health', '5 years', 'active', 'Asbestos Surveyor', '5-year asbestos survey required'),
(6, 'Energy Performance Certificate', 'Energy', '10 years', 'active', 'Energy Assessor', '10-year EPC required'),
(7, 'Building Insurance Certificate', 'Insurance', '1 year', 'active', 'Insurance Broker', 'Annual building insurance renewal'),
(8, 'PAT Testing Certificate', 'Electrical', '1 year', 'active', 'PAT Tester', 'Annual portable appliance testing'),
(9, 'Water Hygiene Certificate', 'Health', '1 year', 'active', 'Water Hygiene Specialist', 'Annual water hygiene assessment'),
(10, 'Fire Risk Assessment', 'Fire', '1 year', 'active', 'Fire Safety Consultant', 'Annual fire risk assessment')
ON CONFLICT (id) DO NOTHING;

-- Insert building assets for Ashwood House (building_id = 1)
INSERT INTO building_assets (building_id, compliance_item_id, applies, last_checked, next_due, notes) VALUES
(1, 1, true, '2023-12-01', '2024-12-01', 'Fire safety certificate valid until December 2024'),
(1, 2, true, '2023-11-15', '2024-11-15', 'Gas safety inspection completed'),
(1, 3, true, '2022-06-01', '2027-06-01', 'Electrical safety certificate valid until 2027'),
(1, 4, true, '2023-10-01', '2024-10-01', 'Lift maintenance due in October'),
(1, 5, true, '2021-03-01', '2026-03-01', 'Asbestos survey completed in 2021'),
(1, 6, true, '2020-01-01', '2030-01-01', 'EPC valid until 2030'),
(1, 7, true, '2024-01-01', '2025-01-01', 'Building insurance renewed'),
(1, 8, true, '2023-09-01', '2024-09-01', 'PAT testing completed'),
(1, 9, true, '2023-08-01', '2024-08-01', 'Water hygiene assessment completed'),
(1, 10, true, '2023-12-15', '2024-12-15', 'Fire risk assessment completed')
ON CONFLICT (building_id, compliance_item_id) DO NOTHING;

-- Insert building assets for Maple Court (building_id = 2)
INSERT INTO building_assets (building_id, compliance_item_id, applies, last_checked, next_due, notes) VALUES
(2, 1, true, '2023-11-01', '2024-11-01', 'Fire safety certificate valid'),
(2, 2, true, '2023-10-15', '2024-10-15', 'Gas safety inspection due soon'),
(2, 3, true, '2021-12-01', '2026-12-01', 'Electrical safety certificate valid'),
(2, 4, false, NULL, NULL, 'No lift in this building'),
(2, 5, true, '2022-06-01', '2027-06-01', 'Asbestos survey completed'),
(2, 6, true, '2019-05-01', '2029-05-01', 'EPC valid until 2029'),
(2, 7, true, '2024-02-01', '2025-02-01', 'Building insurance renewed'),
(2, 8, true, '2023-08-01', '2024-08-01', 'PAT testing completed'),
(2, 9, true, '2023-07-01', '2024-07-01', 'Water hygiene assessment completed'),
(2, 10, true, '2023-11-15', '2024-11-15', 'Fire risk assessment completed')
ON CONFLICT (building_id, compliance_item_id) DO NOTHING;

-- Insert building assets for Oak Gardens (building_id = 3)
INSERT INTO building_assets (building_id, compliance_item_id, applies, last_checked, next_due, notes) VALUES
(3, 1, true, '2023-10-01', '2024-10-01', 'Fire safety certificate valid'),
(3, 2, true, '2023-09-15', '2024-09-15', 'Gas safety inspection completed'),
(3, 3, true, '2020-08-01', '2025-08-01', 'Electrical safety certificate valid'),
(3, 4, true, '2023-12-01', '2024-12-01', 'Lift maintenance completed'),
(3, 5, true, '2023-01-01', '2028-01-01', 'Asbestos survey completed'),
(3, 6, true, '2018-12-01', '2028-12-01', 'EPC valid until 2028'),
(3, 7, true, '2024-03-01', '2025-03-01', 'Building insurance renewed'),
(3, 8, true, '2023-07-01', '2024-07-01', 'PAT testing completed'),
(3, 9, true, '2023-06-01', '2024-06-01', 'Water hygiene assessment completed'),
(3, 10, true, '2023-10-15', '2024-10-15', 'Fire risk assessment completed')
ON CONFLICT (building_id, compliance_item_id) DO NOTHING;

-- Insert some sample compliance documents
INSERT INTO compliance_docs (id, building_id, compliance_item_id, doc_type, doc_url, uploaded_by, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440101', 1, 1, 'Fire Safety Certificate', 'https://example.com/fire-cert-ashwood-2023.pdf', 'auth-user-1', '2023-12-01 10:00:00'),
('550e8400-e29b-41d4-a716-446655440102', 1, 2, 'Gas Safety Certificate', 'https://example.com/gas-cert-ashwood-2023.pdf', 'auth-user-1', '2023-11-15 14:30:00'),
('550e8400-e29b-41d4-a716-446655440103', 1, 3, 'Electrical Safety Certificate', 'https://example.com/electrical-cert-ashwood-2022.pdf', 'auth-user-1', '2022-06-01 09:15:00'),
('550e8400-e29b-41d4-a716-446655440104', 2, 1, 'Fire Safety Certificate', 'https://example.com/fire-cert-maple-2023.pdf', 'auth-user-1', '2023-11-01 11:00:00'),
('550e8400-e29b-41d4-a716-446655440105', 2, 2, 'Gas Safety Certificate', 'https://example.com/gas-cert-maple-2023.pdf', 'auth-user-1', '2023-10-15 16:45:00'),
('550e8400-e29b-41d4-a716-446655440106', 3, 1, 'Fire Safety Certificate', 'https://example.com/fire-cert-oak-2023.pdf', 'auth-user-1', '2023-10-01 13:20:00'),
('550e8400-e29b-41d4-a716-446655440107', 3, 4, 'Lift Maintenance Certificate', 'https://example.com/lift-cert-oak-2023.pdf', 'auth-user-1', '2023-12-01 15:30:00')
ON CONFLICT (id) DO NOTHING;

-- Update some items to be overdue or due soon for testing
UPDATE building_assets 
SET next_due = '2024-01-15', notes = 'OVERDUE: Fire safety certificate expired'
WHERE building_id = 1 AND compliance_item_id = 1;

UPDATE building_assets 
SET next_due = '2024-02-01', notes = 'DUE SOON: Gas safety inspection due next month'
WHERE building_id = 2 AND compliance_item_id = 2;

UPDATE building_assets 
SET next_due = '2024-03-01', notes = 'DUE SOON: PAT testing due in March'
WHERE building_id = 3 AND compliance_item_id = 8;

-- Add some missing items for testing
UPDATE building_assets 
SET applies = false, notes = 'Not applicable for this building'
WHERE building_id = 2 AND compliance_item_id = 4;

UPDATE building_assets 
SET applies = false, notes = 'Not applicable for this building'
WHERE building_id = 3 AND compliance_item_id = 4; 