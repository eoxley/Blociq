-- Fix building_compliance_assets status constraint violation
-- First, let's see what status values currently exist in the table

SELECT DISTINCT status, COUNT(*) as count
FROM building_compliance_assets 
WHERE status IS NOT NULL
GROUP BY status
ORDER BY count DESC;

-- Check for any NULL values
SELECT COUNT(*) as null_count
FROM building_compliance_assets 
WHERE status IS NULL;

-- Check for any status values that don't match our expected enum
SELECT DISTINCT status
FROM building_compliance_assets 
WHERE status IS NOT NULL 
  AND status NOT IN ('pending', 'active', 'overdue', 'completed', 'expired');

-- If there are problematic values, we need to update them to valid ones
-- Here are some common mappings you might want to apply:

-- Option 1: Update all problematic values to 'pending' (safest default)
-- UPDATE building_compliance_assets 
-- SET status = 'pending'
-- WHERE status IS NOT NULL 
--   AND status NOT IN ('pending', 'active', 'overdue', 'completed', 'expired');

-- Option 2: Update NULL values to 'pending'
-- UPDATE building_compliance_assets 
-- SET status = 'pending'
-- WHERE status IS NULL;

-- Option 3: If you want to map specific values, you can do something like:
-- UPDATE building_compliance_assets 
-- SET status = CASE 
--   WHEN status = 'in_progress' THEN 'active'
--   WHEN status = 'done' THEN 'completed'
--   WHEN status = 'expired' THEN 'expired'
--   WHEN status = 'late' THEN 'overdue'
--   ELSE 'pending'
-- END
-- WHERE status IS NOT NULL 
--   AND status NOT IN ('pending', 'active', 'overdue', 'completed', 'expired');

-- After fixing the data, you can add the constraint
-- ALTER TABLE building_compliance_assets 
-- ADD CONSTRAINT building_compliance_assets_status_check 
-- CHECK (status IN ('pending', 'active', 'overdue', 'completed', 'expired')); 