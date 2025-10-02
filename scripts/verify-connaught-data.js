const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyData() {
  console.log('\n=== VERIFYING CONNAUGHT SQUARE DATA ===\n');

  // 1. Check buildings
  const { data: buildings, error: buildingsError } = await supabase
    .from('buildings')
    .select('*')
    .ilike('name', '%connaught%');

  if (buildingsError) {
    console.error('Error fetching buildings:', buildingsError);
  } else {
    console.log(`✓ Buildings found: ${buildings?.length || 0}`);
    if (buildings?.length > 0) {
      buildings.forEach(b => {
        console.log(`  - ${b.name} (ID: ${b.id})`);
        console.log(`    Address: ${b.address || 'MISSING'}`);
      });
    }
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
      units.slice(0, 3).forEach(u => {
        console.log(`  - ${u.unit_number} (ID: ${u.id})`);
      });
      if (units.length > 3) console.log(`  ... and ${units.length - 3} more`);
    }
  }

  // 3. Check building_documents
  const { data: docs, error: docsError } = await supabase
    .from('building_documents')
    .select('id, building_id, category, title')
    .eq('building_id', buildingId);

  if (docsError) {
    console.error('Error fetching documents:', docsError);
  } else {
    console.log(`\n✓ Building Documents found: ${docs?.length || 0}`);
    if (docs?.length > 0) {
      // Group by category
      const byCategory = docs.reduce((acc, doc) => {
        acc[doc.category] = (acc[doc.category] || 0) + 1;
        return acc;
      }, {});
      console.log('  By category:');
      Object.entries(byCategory).forEach(([cat, count]) => {
        console.log(`    - ${cat}: ${count}`);
      });
    }
  }

  // 4. Check compliance_assets
  const { data: assets, error: assetsError } = await supabase
    .from('compliance_assets')
    .select('id, building_id, asset_type, name')
    .eq('building_id', buildingId);

  if (assetsError) {
    console.error('Error fetching compliance assets:', assetsError);
  } else {
    console.log(`\n✓ Compliance Assets found: ${assets?.length || 0}`);
    if (assets?.length > 0) {
      const byType = assets.reduce((acc, asset) => {
        acc[asset.asset_type] = (acc[asset.asset_type] || 0) + 1;
        return acc;
      }, {});
      console.log('  By type:');
      Object.entries(byType).forEach(([type, count]) => {
        console.log(`    - ${type}: ${count}`);
      });
    }
  }

  // 5. Check compliance_inspections
  const { data: inspections, error: inspectionsError } = await supabase
    .from('compliance_inspections')
    .select('id, asset_id, inspection_type, inspection_date')
    .in('asset_id', assets?.map(a => a.id) || []);

  if (inspectionsError) {
    console.error('Error fetching inspections:', inspectionsError);
  } else {
    console.log(`\n✓ Compliance Inspections found: ${inspections?.length || 0}`);
  }

  // 6. Check major_works
  const { data: works, error: worksError } = await supabase
    .from('major_works')
    .select('id, building_id, project_name, status')
    .eq('building_id', buildingId);

  if (worksError) {
    console.error('Error fetching major works:', worksError);
  } else {
    console.log(`\n✓ Major Works found: ${works?.length || 0}`);
    if (works?.length > 0) {
      works.forEach(w => {
        console.log(`  - ${w.project_name} (${w.status})`);
      });
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Building: ${buildings?.length || 0}`);
  console.log(`Units: ${units?.length || 0}`);
  console.log(`Documents: ${docs?.length || 0}`);
  console.log(`Assets: ${assets?.length || 0}`);
  console.log(`Inspections: ${inspections?.length || 0}`);
  console.log(`Major Works: ${works?.length || 0}`);
  console.log(`TOTAL RECORDS: ${(buildings?.length || 0) + (units?.length || 0) + (docs?.length || 0) + (assets?.length || 0) + (inspections?.length || 0) + (works?.length || 0)}`);
}

verifyData().catch(console.error);
