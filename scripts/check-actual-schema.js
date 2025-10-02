const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('\n=== CHECKING DATABASE SCHEMA ===\n');

  // List all tables
  const { data: tables, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `
  });

  if (error) {
    // Alternative method - just try to query each table
    const tablesToCheck = [
      'building_documents',
      'compliance_assets',
      'compliance_inspections',
      'major_works',
      'works_orders',
      'buildings',
      'units'
    ];

    for (const table of tablesToCheck) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✓ ${table} exists`);
        if (data && data.length > 0) {
          console.log(`  Sample columns: ${Object.keys(data[0]).join(', ')}`);
        }
      }
    }
  }

  // Try to get building_documents structure
  console.log('\n=== BUILDING_DOCUMENTS STRUCTURE ===');
  const { data: docs } = await supabase
    .from('building_documents')
    .select('*')
    .limit(1);

  if (docs && docs.length > 0) {
    console.log('Columns:', Object.keys(docs[0]).join(', '));
  } else {
    console.log('No documents found to inspect structure');
  }

  // Check if works_orders exists (might be used instead of major_works)
  console.log('\n=== WORKS_ORDERS CHECK ===');
  const { data: wo, error: woError } = await supabase
    .from('works_orders')
    .select('*')
    .limit(1);

  if (woError) {
    console.log('❌ works_orders:', woError.message);
  } else {
    console.log('✓ works_orders exists');
    if (wo && wo.length > 0) {
      console.log('Columns:', Object.keys(wo[0]).join(', '));
    }
  }

  // Check compliance_assets
  console.log('\n=== COMPLIANCE_ASSETS STRUCTURE ===');
  const { data: assets, error: assetsError } = await supabase
    .from('compliance_assets')
    .select('*')
    .limit(1);

  if (assetsError) {
    console.log('❌', assetsError.message);
  } else {
    console.log('✓ compliance_assets exists');
    if (assets && assets.length > 0) {
      console.log('Columns:', Object.keys(assets[0]).join(', '));
    } else {
      console.log('No assets found - table might be empty');
    }
  }
}

checkSchema().catch(console.error);
