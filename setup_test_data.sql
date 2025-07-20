-- BlocIQ Test Data Setup Script
-- This script creates test data for Ashwood House with units, leaseholders, leases, and emails

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Add leaseholder_id column to units table
ALTER TABLE units ADD COLUMN IF NOT EXISTS leaseholder_id UUID REFERENCES leaseholders(id);

-- 2. Add missing columns to leases table if they don't exist
ALTER TABLE leases ADD COLUMN IF NOT EXISTS term VARCHAR(50);
ALTER TABLE leases ADD COLUMN IF NOT EXISTS apportionment DECIMAL(10,2);

-- Note: incoming_emails table doesn't have unit_id column in current schema
-- We'll use the existing 'unit' text field instead

-- 3. Insert Ashwood House building
INSERT INTO buildings (id, name, address, unit_count, created_at) 
VALUES (
  1, 
  'Ashwood House', 
  '123 Ashwood Street, London SW1 1AA', 
  10, 
  NOW()
) ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  unit_count = EXCLUDED.unit_count;

-- 4. Insert 10 leaseholders
INSERT INTO leaseholders (id, name, email, phone) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'John Smith', 'john.smith@email.com', '+44 20 7123 4567'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Sarah Johnson', 'sarah.johnson@email.com', '+44 20 7123 4568'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Michael Brown', 'michael.brown@email.com', '+44 20 7123 4569'),
  ('550e8400-e29b-41d4-a716-446655440004', 'Emma Davis', 'emma.davis@email.com', '+44 20 7123 4570'),
  ('550e8400-e29b-41d4-a716-446655440005', 'David Wilson', 'david.wilson@email.com', '+44 20 7123 4571'),
  ('550e8400-e29b-41d4-a716-446655440006', 'Lisa Anderson', 'lisa.anderson@email.com', '+44 20 7123 4572'),
  ('550e8400-e29b-41d4-a716-446655440007', 'Robert Taylor', 'robert.taylor@email.com', '+44 20 7123 4573'),
  ('550e8400-e29b-41d4-a716-446655440008', 'Jennifer Martinez', 'jennifer.martinez@email.com', '+44 20 7123 4574'),
  ('550e8400-e29b-41d4-a716-446655440009', 'Christopher Lee', 'christopher.lee@email.com', '+44 20 7123 4575'),
  ('550e8400-e29b-41d4-a716-446655440010', 'Amanda Garcia', 'amanda.garcia@email.com', '+44 20 7123 4576')
ON CONFLICT (id) DO NOTHING;

-- 5. Insert 10 units for Ashwood House
INSERT INTO units (id, building_id, unit_number, leaseholder_id, type, floor, created_at) VALUES
  (1, 1, 'Flat 1', '550e8400-e29b-41d4-a716-446655440001', '1 Bedroom', 'Ground', NOW()),
  (2, 1, 'Flat 2', '550e8400-e29b-41d4-a716-446655440002', '2 Bedroom', 'Ground', NOW()),
  (3, 1, 'Flat 3', '550e8400-e29b-41d4-a716-446655440003', '1 Bedroom', 'First', NOW()),
  (4, 1, 'Flat 4', '550e8400-e29b-41d4-a716-446655440004', '2 Bedroom', 'First', NOW()),
  (5, 1, 'Flat 5', '550e8400-e29b-41d4-a716-446655440005', '1 Bedroom', 'Second', NOW()),
  (6, 1, 'Flat 6', '550e8400-e29b-41d4-a716-446655440006', '2 Bedroom', 'Second', NOW()),
  (7, 1, 'Flat 7', '550e8400-e29b-41d4-a716-446655440007', '1 Bedroom', 'Third', NOW()),
  (8, 1, 'Flat 8', '550e8400-e29b-41d4-a716-446655440008', '2 Bedroom', 'Third', NOW()),
  (9, 1, 'Flat 9', '550e8400-e29b-41d4-a716-446655440009', '1 Bedroom', 'Fourth', NOW()),
  (10, 1, 'Flat 10', '550e8400-e29b-41d4-a716-446655440010', '2 Bedroom', 'Fourth', NOW())
ON CONFLICT (id) DO UPDATE SET 
  building_id = EXCLUDED.building_id,
  unit_number = EXCLUDED.unit_number,
  leaseholder_id = EXCLUDED.leaseholder_id,
  type = EXCLUDED.type,
  floor = EXCLUDED.floor;

-- 6. Update leaseholders with unit_id references
UPDATE leaseholders SET unit_id = 1 WHERE id = '550e8400-e29b-41d4-a716-446655440001';
UPDATE leaseholders SET unit_id = 2 WHERE id = '550e8400-e29b-41d4-a716-446655440002';
UPDATE leaseholders SET unit_id = 3 WHERE id = '550e8400-e29b-41d4-a716-446655440003';
UPDATE leaseholders SET unit_id = 4 WHERE id = '550e8400-e29b-41d4-a716-446655440004';
UPDATE leaseholders SET unit_id = 5 WHERE id = '550e8400-e29b-41d4-a716-446655440005';
UPDATE leaseholders SET unit_id = 6 WHERE id = '550e8400-e29b-41d4-a716-446655440006';
UPDATE leaseholders SET unit_id = 7 WHERE id = '550e8400-e29b-41d4-a716-446655440007';
UPDATE leaseholders SET unit_id = 8 WHERE id = '550e8400-e29b-41d4-a716-446655440008';
UPDATE leaseholders SET unit_id = 9 WHERE id = '550e8400-e29b-41d4-a716-446655440009';
UPDATE leaseholders SET unit_id = 10 WHERE id = '550e8400-e29b-41d4-a716-446655440010';

-- 7. Insert 10 leases (one per unit)
INSERT INTO leases (id, building_id, unit_id, term, apportionment, start_date, expiry_date, created_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440101', 1, 1, 'Assured Shorthold Tenancy', 1250.00, '2023-01-01', '2025-01-01', NOW()),
  ('550e8400-e29b-41d4-a716-446655440102', 1, 2, 'Assured Shorthold Tenancy', 1800.00, '2023-02-01', '2025-02-01', NOW()),
  ('550e8400-e29b-41d4-a716-446655440103', 1, 3, 'Assured Shorthold Tenancy', 1300.00, '2023-03-01', '2025-03-01', NOW()),
  ('550e8400-e29b-41d4-a716-446655440104', 1, 4, 'Assured Shorthold Tenancy', 1900.00, '2023-04-01', '2025-04-01', NOW()),
  ('550e8400-e29b-41d4-a716-446655440105', 1, 5, 'Assured Shorthold Tenancy', 1350.00, '2023-05-01', '2025-05-01', NOW()),
  ('550e8400-e29b-41d4-a716-446655440106', 1, 6, 'Assured Shorthold Tenancy', 1950.00, '2023-06-01', '2025-06-01', NOW()),
  ('550e8400-e29b-41d4-a716-446655440107', 1, 7, 'Assured Shorthold Tenancy', 1400.00, '2023-07-01', '2025-07-01', NOW()),
  ('550e8400-e29b-41d4-a716-446655440108', 1, 8, 'Assured Shorthold Tenancy', 2000.00, '2023-08-01', '2025-08-01', NOW()),
  ('550e8400-e29b-41d4-a716-446655440109', 1, 9, 'Assured Shorthold Tenancy', 1450.00, '2023-09-01', '2025-09-01', NOW()),
  ('550e8400-e29b-41d4-a716-446655440110', 1, 10, 'Assured Shorthold Tenancy', 2050.00, '2023-10-01', '2025-10-01', NOW())
ON CONFLICT (id) DO UPDATE SET 
  building_id = EXCLUDED.building_id,
  unit_id = EXCLUDED.unit_id,
  term = EXCLUDED.term,
  apportionment = EXCLUDED.apportionment,
  start_date = EXCLUDED.start_date,
  expiry_date = EXCLUDED.expiry_date;

-- 8. Insert 20 incoming emails (2 per unit) - using 'unit' text field instead of unit_id
INSERT INTO incoming_emails (id, building_id, unit, from_email, subject, body_preview, received_at, created_at) VALUES
  -- Flat 1 emails
  ('550e8400-e29b-41d4-a716-446655440201', 1, 'Flat 1', 'john.smith@email.com', 'Heating Issue in Flat 1', 'The heating system is not working properly in my flat. Can someone please check it?', NOW() - INTERVAL '2 days', NOW()),
  ('550e8400-e29b-41d4-a716-446655440202', 1, 'Flat 1', 'john.smith@email.com', 'Follow-up on Heating Issue', 'Thank you for the quick response. The heating is now working fine.', NOW() - INTERVAL '1 day', NOW()),
  
  -- Flat 2 emails
  ('550e8400-e29b-41d4-a716-446655440203', 1, 'Flat 2', 'sarah.johnson@email.com', 'Noise Complaint', 'There is excessive noise coming from the flat above. Can this be addressed?', NOW() - INTERVAL '3 days', NOW()),
  ('550e8400-e29b-41d4-a716-446655440204', 1, 'Flat 2', 'sarah.johnson@email.com', 'Noise Issue Resolved', 'The noise issue has been resolved. Thank you for your help.', NOW() - INTERVAL '1 day', NOW()),
  
  -- Flat 3 emails
  ('550e8400-e29b-41d4-a716-446655440205', 1, 'Flat 3', 'michael.brown@email.com', 'Maintenance Request', 'The kitchen tap is leaking. Please send a plumber.', NOW() - INTERVAL '4 days', NOW()),
  ('550e8400-e29b-41d4-a716-446655440206', 1, 'Flat 3', 'michael.brown@email.com', 'Tap Fixed', 'The tap has been fixed. Thank you for the prompt service.', NOW() - INTERVAL '2 days', NOW()),
  
  -- Flat 4 emails
  ('550e8400-e29b-41d4-a716-446655440207', 1, 'Flat 4', 'emma.davis@email.com', 'Parking Space Request', 'I would like to request a parking space for my vehicle.', NOW() - INTERVAL '5 days', NOW()),
  ('550e8400-e29b-41d4-a716-446655440208', 1, 'Flat 4', 'emma.davis@email.com', 'Parking Space Confirmed', 'Thank you for confirming the parking space allocation.', NOW() - INTERVAL '3 days', NOW()),
  
  -- Flat 5 emails
  ('550e8400-e29b-41d4-a716-446655440209', 1, 'Flat 5', 'david.wilson@email.com', 'Internet Connection Issue', 'The internet connection in my flat is very slow. Can this be investigated?', NOW() - INTERVAL '6 days', NOW()),
  ('550e8400-e29b-41d4-a716-446655440210', 1, 'Flat 5', 'david.wilson@email.com', 'Internet Fixed', 'The internet connection is now working properly. Thank you.', NOW() - INTERVAL '4 days', NOW()),
  
  -- Flat 6 emails
  ('550e8400-e29b-41d4-a716-446655440211', 1, 'Flat 6', 'lisa.anderson@email.com', 'Window Repair Needed', 'The window in my bedroom is not closing properly. Please arrange for repair.', NOW() - INTERVAL '7 days', NOW()),
  ('550e8400-e29b-41d4-a716-446655440212', 1, 'Flat 6', 'lisa.anderson@email.com', 'Window Repair Complete', 'The window has been repaired. Thank you for the quick response.', NOW() - INTERVAL '5 days', NOW()),
  
  -- Flat 7 emails
  ('550e8400-e29b-41d4-a716-446655440213', 1, 'Flat 7', 'robert.taylor@email.com', 'Electricity Problem', 'There is an electrical issue in my flat. The lights keep flickering.', NOW() - INTERVAL '8 days', NOW()),
  ('550e8400-e29b-41d4-a716-446655440214', 1, 'Flat 7', 'robert.taylor@email.com', 'Electrical Issue Resolved', 'The electrical issue has been fixed. Everything is working normally now.', NOW() - INTERVAL '6 days', NOW()),
  
  -- Flat 8 emails
  ('550e8400-e29b-41d4-a716-446655440215', 1, 'Flat 8', 'jennifer.martinez@email.com', 'Cleaning Service Request', 'I would like to request a cleaning service for my flat.', NOW() - INTERVAL '9 days', NOW()),
  ('550e8400-e29b-41d4-a716-446655440216', 1, 'Flat 8', 'jennifer.martinez@email.com', 'Cleaning Service Confirmed', 'Thank you for arranging the cleaning service. It was excellent.', NOW() - INTERVAL '7 days', NOW()),
  
  -- Flat 9 emails
  ('550e8400-e29b-41d4-a716-446655440217', 1, 'Flat 9', 'christopher.lee@email.com', 'Package Delivery Issue', 'I have a package that was delivered but I was not home. Can you help?', NOW() - INTERVAL '10 days', NOW()),
  ('550e8400-e29b-41d4-a716-446655440218', 1, 'Flat 9', 'christopher.lee@email.com', 'Package Collected', 'I have collected my package. Thank you for holding it for me.', NOW() - INTERVAL '8 days', NOW()),
  
  -- Flat 10 emails
  ('550e8400-e29b-41d4-a716-446655440219', 1, 'Flat 10', 'amanda.garcia@email.com', 'Security Concern', 'I noticed a security issue with the main entrance. Can this be addressed?', NOW() - INTERVAL '11 days', NOW()),
  ('550e8400-e29b-41d4-a716-446655440220', 1, 'Flat 10', 'amanda.garcia@email.com', 'Security Issue Resolved', 'The security issue has been resolved. Thank you for your attention to this matter.', NOW() - INTERVAL '9 days', NOW())
ON CONFLICT (id) DO UPDATE SET 
  building_id = EXCLUDED.building_id,
  unit = EXCLUDED.unit,
  from_email = EXCLUDED.from_email,
  subject = EXCLUDED.subject,
  body_preview = EXCLUDED.body_preview,
  received_at = EXCLUDED.received_at;

-- 9. Update building unit count
UPDATE buildings SET unit_count = 10 WHERE id = 1;

-- Verification queries
SELECT 'Buildings' as table_name, COUNT(*) as count FROM buildings
UNION ALL
SELECT 'Units' as table_name, COUNT(*) as count FROM units WHERE building_id = 1
UNION ALL
SELECT 'Leaseholders' as table_name, COUNT(*) as count FROM leaseholders
UNION ALL
SELECT 'Leases' as table_name, COUNT(*) as count FROM leases WHERE building_id = 1
UNION ALL
SELECT 'Incoming Emails' as table_name, COUNT(*) as count FROM incoming_emails WHERE building_id = 1;

-- Show sample data
SELECT 'Ashwood House Data Summary:' as info;
SELECT 
  b.name as building_name,
  COUNT(u.id) as unit_count,
  COUNT(l.id) as lease_count,
  COUNT(ie.id) as email_count
FROM buildings b
LEFT JOIN units u ON b.id = u.building_id
LEFT JOIN leases l ON b.id = l.building_id
LEFT JOIN incoming_emails ie ON b.id = ie.building_id
WHERE b.id = 1
GROUP BY b.id, b.name; 