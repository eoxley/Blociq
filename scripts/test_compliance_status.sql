-- Test script to check compliance data status
-- Run this before and after fixing the compliance data

-- Check if Ashwood House exists
SELECT 'Buildings' as table_name, COUNT(*) as count FROM buildings WHERE name = 'Ashwood House';

-- Check compliance assets table
SELECT 'Compliance Assets' as table_name, COUNT(*) as count FROM compliance_assets;

-- Check building compliance assets table
SELECT 'Building Compliance Assets' as table_name, COUNT(*) as count FROM building_compliance_assets;

-- Check if there are any building compliance assets for Ashwood House
SELECT 
    'Ashwood Compliance Assets' as info,
    COUNT(*) as count
FROM building_compliance_assets bca
JOIN buildings b ON b.id = bca.building_id
WHERE b.name = 'Ashwood House';

-- Check the compliance views (these should work after the fix)
SELECT 'Portfolio Compliance Counts' as view_name, COUNT(*) as count FROM vw_portfolio_compliance_counts;

SELECT 'Portfolio Compliance Upcoming' as view_name, COUNT(*) as count FROM vw_portfolio_compliance_upcoming;

-- Check specific Ashwood House data in views
SELECT 
    'Ashwood in Counts View' as info,
    building_name,
    total,
    compliant,
    due_soon,
    overdue
FROM vw_portfolio_compliance_counts 
WHERE building_name = 'Ashwood House';

SELECT 
    'Ashwood in Upcoming View' as info,
    building_name,
    asset_name,
    category,
    next_due_date,
    status
FROM vw_portfolio_compliance_upcoming 
WHERE building_name = 'Ashwood House'
ORDER BY next_due_date;
