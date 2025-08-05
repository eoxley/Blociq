-- Remove unit_count field from buildings table
-- This script should be run after confirming that dynamic unit count calculation is working correctly

-- First, let's check the current state
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'buildings' 
  AND column_name = 'unit_count';

-- Check if unit_count field is being used anywhere
SELECT 
  'buildings table' as source,
  COUNT(*) as records_with_unit_count
FROM buildings 
WHERE unit_count IS NOT NULL
UNION ALL
SELECT 
  'buildings table' as source,
  COUNT(*) as records_with_unit_count
FROM buildings 
WHERE unit_count IS NULL;

-- If the field is not being used and dynamic calculation is working,
-- we can safely remove it:

-- ALTER TABLE buildings DROP COLUMN unit_count;

-- Note: Uncomment the above line only after confirming that:
-- 1. Dynamic unit count calculation is working correctly
-- 2. No other parts of the application depend on the unit_count field
-- 3. The field is not being used for any business logic

-- After removal, verify the change:
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'buildings' 
--   AND column_name = 'unit_count';
-- This should return no rows if the column was successfully removed 