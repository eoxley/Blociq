-- Ensure leaseholders table has the full_name column
ALTER TABLE leaseholders ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Update existing leaseholders to populate full_name from name
UPDATE leaseholders 
SET full_name = name 
WHERE full_name IS NULL AND name IS NOT NULL;

-- Insert test leaseholders if they don't exist
INSERT INTO leaseholders (id, name, full_name, email, phone) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'John Smith', 'John Smith', 'john.smith@email.com', '+44 20 7123 4567'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Sarah Johnson', 'Sarah Johnson', 'sarah.johnson@email.com', '+44 20 7123 4568'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Michael Brown', 'Michael Brown', 'michael.brown@email.com', '+44 20 7123 4569'),
  ('550e8400-e29b-41d4-a716-446655440004', 'Emma Davis', 'Emma Davis', 'emma.davis@email.com', '+44 20 7123 4570'),
  ('550e8400-e29b-41d4-a716-446655440005', 'David Wilson', 'David Wilson', 'david.wilson@email.com', '+44 20 7123 4571'),
  ('550e8400-e29b-41d4-a716-446655440006', 'Lisa Anderson', 'Lisa Anderson', 'lisa.anderson@email.com', '+44 20 7123 4572'),
  ('550e8400-e29b-41d4-a716-446655440007', 'Robert Taylor', 'Robert Taylor', 'robert.taylor@email.com', '+44 20 7123 4573'),
  ('550e8400-e29b-41d4-a716-446655440008', 'Jennifer Martinez', 'Jennifer Martinez', 'jennifer.martinez@email.com', '+44 20 7123 4574'),
  ('550e8400-e29b-41d4-a716-446655440009', 'Christopher Lee', 'Christopher Lee', 'christopher.lee@email.com', '+44 20 7123 4575'),
  ('550e8400-e29b-41d4-a716-446655440010', 'Amanda Garcia', 'Amanda Garcia', 'amanda.garcia@email.com', '+44 20 7123 4576')
ON CONFLICT (id) DO UPDATE SET 
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone;

-- Insert test units if they don't exist
INSERT INTO units (id, building_id, unit_number, leaseholder_id, type, floor, apportionment_percent) VALUES
  (1, 1, 'Flat 1', '550e8400-e29b-41d4-a716-446655440001', '1 Bedroom', 'Ground', 10.5),
  (2, 1, 'Flat 2', '550e8400-e29b-41d4-a716-446655440002', '2 Bedroom', 'Ground', 12.0),
  (3, 1, 'Flat 3', '550e8400-e29b-41d4-a716-446655440003', '1 Bedroom', 'First', 9.8),
  (4, 1, 'Flat 4', '550e8400-e29b-41d4-a716-446655440004', '2 Bedroom', 'First', 11.2),
  (5, 1, 'Flat 5', '550e8400-e29b-41d4-a716-446655440005', '1 Bedroom', 'Second', 10.1),
  (6, 1, 'Flat 6', '550e8400-e29b-41d4-a716-446655440006', '2 Bedroom', 'Second', 12.5),
  (7, 1, 'Flat 7', '550e8400-e29b-41d4-a716-446655440007', '1 Bedroom', 'Third', 9.5),
  (8, 1, 'Flat 8', '550e8400-e29b-41d4-a716-446655440008', '2 Bedroom', 'Third', 11.8),
  (9, 1, 'Flat 9', '550e8400-e29b-41d4-a716-446655440009', '1 Bedroom', 'Fourth', 10.3),
  (10, 1, 'Flat 10', '550e8400-e29b-41d4-a716-446655440010', '2 Bedroom', 'Fourth', 12.7)
ON CONFLICT (id) DO UPDATE SET 
  leaseholder_id = EXCLUDED.leaseholder_id,
  apportionment_percent = EXCLUDED.apportionment_percent;

-- Set some leaseholders as directors
UPDATE leaseholders 
SET is_director = true, 
    director_role = 'Chairman',
    director_since = '2023-01-15',
    director_notes = 'Experienced chairman with 5 years in property management'
WHERE id = '550e8400-e29b-41d4-a716-446655440001';

UPDATE leaseholders 
SET is_director = true, 
    director_role = 'Secretary',
    director_since = '2023-02-20',
    director_notes = 'Organized secretary with strong administrative skills'
WHERE id = '550e8400-e29b-41d4-a716-446655440002';

UPDATE leaseholders 
SET is_director = true, 
    director_role = 'Treasurer',
    director_since = '2023-03-10',
    director_notes = 'Financial background, handles all treasury matters'
WHERE id = '550e8400-e29b-41d4-a716-446655440003';
