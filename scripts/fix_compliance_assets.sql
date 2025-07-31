-- Fix compliance assets with undefined names
UPDATE compliance_assets 
SET name = 'Electrical Safety Certificate' 
WHERE category = 'Electrical' AND (name IS NULL OR name = 'undefined');

UPDATE compliance_assets 
SET name = 'Fire Safety Certificate' 
WHERE category = 'Fire' AND (name IS NULL OR name = 'undefined');

UPDATE compliance_assets 
SET name = 'Gas Safety Certificate' 
WHERE category = 'Gas' AND (name IS NULL OR name = 'undefined');

-- Add some sample compliance assets if they don't exist
INSERT INTO compliance_assets (name, description, category, required_if, recommended_frequency)
SELECT 'Electrical Safety Certificate', 'Annual electrical safety inspection and certificate', 'Electrical', 'always', '1 year'
WHERE NOT EXISTS (SELECT 1 FROM compliance_assets WHERE name = 'Electrical Safety Certificate');

INSERT INTO compliance_assets (name, description, category, required_if, recommended_frequency)
SELECT 'Fire Safety Certificate', 'Fire safety assessment and certificate', 'Fire', 'always', '1 year'
WHERE NOT EXISTS (SELECT 1 FROM compliance_assets WHERE name = 'Fire Safety Certificate');

INSERT INTO compliance_assets (name, description, category, required_if, recommended_frequency)
SELECT 'Gas Safety Certificate', 'Annual gas safety inspection and certificate', 'Gas', 'always', '1 year'
WHERE NOT EXISTS (SELECT 1 FROM compliance_assets WHERE name = 'Gas Safety Certificate');

INSERT INTO compliance_assets (name, description, category, required_if, recommended_frequency)
SELECT 'Energy Performance Certificate', 'Energy efficiency assessment', 'Energy', 'always', '10 years'
WHERE NOT EXISTS (SELECT 1 FROM compliance_assets WHERE name = 'Energy Performance Certificate');

INSERT INTO compliance_assets (name, description, category, required_if, recommended_frequency)
SELECT 'Asbestos Survey', 'Asbestos assessment and management plan', 'Health', 'if present', '5 years'
WHERE NOT EXISTS (SELECT 1 FROM compliance_assets WHERE name = 'Asbestos Survey'); 