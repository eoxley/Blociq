-- Update leaseholder full_name from name field
UPDATE leaseholders 
SET full_name = name 
WHERE full_name IS NULL AND name IS NOT NULL;

-- Also update the test data to include full_name
UPDATE leaseholders 
SET full_name = 'John Smith' 
WHERE id = '550e8400-e29b-41d4-a716-446655440001';

UPDATE leaseholders 
SET full_name = 'Sarah Johnson' 
WHERE id = '550e8400-e29b-41d4-a716-446655440002';

UPDATE leaseholders 
SET full_name = 'Michael Brown' 
WHERE id = '550e8400-e29b-41d4-a716-446655440003';

UPDATE leaseholders 
SET full_name = 'Emma Davis' 
WHERE id = '550e8400-e29b-41d4-a716-446655440004';

UPDATE leaseholders 
SET full_name = 'David Wilson' 
WHERE id = '550e8400-e29b-41d4-a716-446655440005';

UPDATE leaseholders 
SET full_name = 'Lisa Anderson' 
WHERE id = '550e8400-e29b-41d4-a716-446655440006';

UPDATE leaseholders 
SET full_name = 'Robert Taylor' 
WHERE id = '550e8400-e29b-41d4-a716-446655440007';

UPDATE leaseholders 
SET full_name = 'Jennifer Martinez' 
WHERE id = '550e8400-e29b-41d4-a716-446655440008';

UPDATE leaseholders 
SET full_name = 'Christopher Lee' 
WHERE id = '550e8400-e29b-41d4-a716-446655440009';

UPDATE leaseholders 
SET full_name = 'Amanda Garcia' 
WHERE id = '550e8400-e29b-41d4-a716-446655440010';
