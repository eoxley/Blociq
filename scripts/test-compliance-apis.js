// 🧪 Test Script for Compliance APIs
// Run this in your browser console to test the fixed endpoints

const testComplianceAPIs = async () => {
  console.log('🧪 Testing Compliance APIs...\n');
  
  // Replace with your actual building ID
  const buildingId = 1; // Change this to a valid building ID
  const testAssetId = 'fire-risk-assessment'; // Change this to a valid asset ID
  
  try {
    // Test 1: Get building compliance overview
    console.log('📋 Test 1: Building Compliance Overview');
    const overviewResponse = await fetch(`/api/buildings/${buildingId}/compliance`);
    const overviewData = await overviewResponse.json();
    
    if (overviewResponse.ok) {
      console.log('✅ Building compliance overview:', {
        status: overviewResponse.status,
        totalAssets: overviewData.data?.assets?.length || 0,
        complianceRate: overviewData.data?.statistics?.compliance_rate || 0
      });
    } else {
      console.log('❌ Building compliance overview failed:', overviewResponse.status, overviewData);
    }
    
    // Test 2: Get specific asset details
    console.log('\n🔍 Test 2: Specific Asset Details');
    const assetResponse = await fetch(`/api/buildings/${buildingId}/compliance/assets/${testAssetId}`);
    const assetData = await assetResponse.json();
    
    if (assetResponse.ok) {
      console.log('✅ Asset details:', {
        status: assetResponse.status,
        assetName: assetData.asset?.asset_name,
        assetStatus: assetData.asset?.status,
        documentCount: assetData.asset?.document_count || 0
      });
    } else {
      console.log('❌ Asset details failed:', assetResponse.status, assetData);
    }
    
    // Test 3: Get general compliance assets
    console.log('\n📚 Test 3: General Compliance Assets');
    const assetsResponse = await fetch('/api/compliance_assets');
    const assetsData = await assetsResponse.json();
    
    if (assetsResponse.ok) {
      console.log('✅ General compliance assets:', {
        status: assetsResponse.status,
        totalAssets: assetsData.assets?.length || 0,
        categories: [...new Set(assetsData.assets?.map(a => a.category) || [])]
      });
    } else {
      console.log('❌ General compliance assets failed:', assetsResponse.status, assetsData);
    }
    
    // Test 4: Get building compliance assets
    console.log('\n🏢 Test 4: Building Compliance Assets');
    const buildingAssetsResponse = await fetch(`/api/building_compliance_assets?building_id=${buildingId}`);
    const buildingAssetsData = await buildingAssetsResponse.json();
    
    if (buildingAssetsResponse.ok) {
      console.log('✅ Building compliance assets:', {
        status: buildingAssetsResponse.status,
        totalAssets: buildingAssetsData.assets?.length || 0,
        statuses: [...new Set(buildingAssetsData.assets?.map(a => a.status) || [])]
      });
    } else {
      console.log('❌ Building compliance assets failed:', buildingAssetsResponse.status, buildingAssetsData);
    }
    
    console.log('\n🎯 Test Summary:');
    console.log('- If you see ✅ for most tests, the APIs are working correctly');
    console.log('- If you see ❌ errors, check the console for details');
    console.log('- 404 errors likely mean the database needs the schema fix');
    console.log('- 500 errors might indicate database relationship issues');
    
  } catch (error) {
    console.error('🚨 Test execution error:', error);
  }
};

// Instructions for use
console.log(`
🧪 COMPLIANCE API TESTING INSTRUCTIONS:

1. Open your browser console on your BlocIQ app
2. Copy and paste this entire script
3. Update the buildingId variable with a valid building ID
4. Run: testComplianceAPIs()
5. Check the results

Expected Results:
✅ All tests should return 200 status
✅ Building overview should show asset counts
✅ Asset details should show specific asset info
✅ No 404 or 500 errors

If you get errors:
1. Run the database schema fix first: scripts/fix-compliance-database-schema.sql
2. Ensure you have valid building and asset IDs
3. Check authentication (make sure you're logged in)

Run the test now with: testComplianceAPIs()
`);

// Export the function for manual execution
window.testComplianceAPIs = testComplianceAPIs;
