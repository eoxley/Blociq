const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyData() {
  console.log('\n=== VERIFYING CONNAUGHT SQUARE DATA (CORRECTED) ===\n');

  // 1. Check buildings
  const { data: buildings, error: buildingsError } = await supabase
    .from('buildings')
    .select('*')
    .ilike('name', '%connaught%');

  if (buildingsError) {
    console.error('Error fetching buildings:', buildingsError);
    return;
  }

  console.log(`✓ Buildings found: ${buildings?.length || 0}`);
  if (buildings?.length > 0) {
    buildings.forEach(b => {
      console.log(`  - ${b.name} (ID: ${b.id})`);
      console.log(`    Address: ${b.address || 'MISSING'}`);
    });
  }

  if (!buildings || buildings.length === 0) {
    console.log('\n❌ No Connaught Square building found in database');
    return;
  }

  const buildingId = buildings[0].id;

  // 2. Check units
  const { data: units, error: unitsError } = await supabase
    .from('units')
    .select('*')
    .eq('building_id', buildingId);

  if (unitsError) {
    console.error('Error fetching units:', unitsError);
  } else {
    console.log(`\n✓ Units found: ${units?.length || 0}`);
    if (units?.length > 0) {
      units.forEach(u => {
        console.log(`  - ${u.unit_number || u.name}`);
      });
    }
  }

  // 3. Check building_documents using correct column names
  const { data: docs, error: docsError } = await supabase
    .from('building_documents')
    .select('id, building_id, category, name, file_name')
    .eq('building_id', buildingId);

  if (docsError) {
    console.error('Error fetching documents:', docsError);
  } else {
    console.log(`\n✓ Building Documents found: ${docs?.length || 0}`);
    if (docs?.length > 0) {
      // Group by category
      const byCategory = docs.reduce((acc, doc) => {
        const cat = doc.category || 'uncategorized';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {});
      console.log('  By category:');
      Object.entries(byCategory)
        .sort((a, b) => b[1] - a[1])
        .forEach(([cat, count]) => {
          console.log(`    - ${cat}: ${count}`);
        });

      console.log('\n  Sample documents:');
      docs.slice(0, 5).forEach(doc => {
        console.log(`    - ${doc.name || doc.file_name} (${doc.category})`);
      });
    }
  }

  // 4. Check compliance_assets using correct column names
  const { data: assets, error: assetsError } = await supabase
    .from('compliance_assets')
    .select('id, building_id, asset_type, asset_name, category, status, next_due_date')
    .eq('building_id', buildingId);

  if (assetsError) {
    console.error('Error fetching compliance assets:', assetsError);
  } else {
    console.log(`\n✓ Compliance Assets found: ${assets?.length || 0}`);
    if (assets?.length > 0) {
      const byType = assets.reduce((acc, asset) => {
        const type = asset.asset_type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});
      console.log('  By type:');
      Object.entries(byType).forEach(([type, count]) => {
        console.log(`    - ${type}: ${count}`);
      });

      console.log('\n  Sample assets:');
      assets.slice(0, 5).forEach(asset => {
        console.log(`    - ${asset.asset_name} (${asset.asset_type})`);
        console.log(`      Status: ${asset.status}, Next due: ${asset.next_due_date || 'N/A'}`);
      });
    }
  }

  // 5. Check compliance_inspections
  const { data: inspections, error: inspectionsError } = await supabase
    .from('compliance_inspections')
    .select('*')
    .eq('building_id', buildingId);

  if (inspectionsError) {
    console.error('Error fetching inspections:', inspectionsError);
  } else {
    console.log(`\n✓ Compliance Inspections found: ${inspections?.length || 0}`);
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Building: ${buildings?.length || 0}`);
  console.log(`Units: ${units?.length || 0}`);
  console.log(`Documents: ${docs?.length || 0}`);
  console.log(`Compliance Assets: ${assets?.length || 0}`);
  console.log(`Inspections: ${inspections?.length || 0}`);
  console.log(`TOTAL RECORDS: ${(buildings?.length || 0) + (units?.length || 0) + (docs?.length || 0) + (assets?.length || 0) + (inspections?.length || 0)}`);

  // Analysis
  console.log('\n=== DIAGNOSIS ===');
  if ((docs?.length || 0) === 0) {
    console.log('⚠️  NO DOCUMENTS imported - The SQL may not have been executed!');
  }
  if ((assets?.length || 0) === 0) {
    console.log('⚠️  NO COMPLIANCE ASSETS imported - The SQL may not have been executed!');
  }
  if (buildings?.length > 0 && units?.length > 0 && docs?.length === 0) {
    console.log('\n❌ Only building and units exist, but no documents/compliance data');
    console.log('   This suggests the SQL was NOT run or failed partway through.');
  }
}

verifyData().catch(console.error);
