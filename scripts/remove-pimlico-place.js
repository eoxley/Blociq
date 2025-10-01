const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function removePimlicoPlace() {
  console.log('Starting Pimlico Place data removal...\n');

  try {
    // First, find the agency_id for Pimlico Place
    const { data: agencies, error: agenciesError } = await supabase
      .from('agencies')
      .select('id, name')
      .ilike('name', '%Pimlico%');

    if (agenciesError) {
      console.error('Error finding Pimlico Place:', agenciesError);
      return;
    }

    if (!agencies || agencies.length === 0) {
      console.log('No Pimlico Place found in the database.');
      return;
    }

    console.log('Found Pimlico Place records:');
    agencies.forEach(agency => {
      console.log(`  - ID: ${agency.id}, Name: ${agency.name}`);
    });

    const agencyIds = agencies.map(a => a.id);

    // Delete all related data in the correct order (respecting foreign key constraints)

    // 1. Delete communications
    console.log('\n1. Deleting communications...');
    const { error: commsError } = await supabase
      .from('communications')
      .delete()
      .in('agency_id', agencyIds);
    if (commsError) console.error('Error deleting communications:', commsError);
    else console.log('   ✓ Communications deleted');

    // 2. Delete compliance records
    console.log('2. Deleting compliance records...');
    const { error: complianceError } = await supabase
      .from('compliance')
      .delete()
      .in('agency_id', agencyIds);
    if (complianceError) console.error('Error deleting compliance:', complianceError);
    else console.log('   ✓ Compliance records deleted');

    // 3. Delete actions
    console.log('3. Deleting actions...');
    const { error: actionsError } = await supabase
      .from('actions')
      .delete()
      .in('agency_id', agencyIds);
    if (actionsError) console.error('Error deleting actions:', actionsError);
    else console.log('   ✓ Actions deleted');

    // 4. Delete works orders
    console.log('4. Deleting works orders...');
    const { error: worksOrdersError } = await supabase
      .from('works_orders')
      .delete()
      .in('agency_id', agencyIds);
    if (worksOrdersError) console.error('Error deleting works orders:', worksOrdersError);
    else console.log('   ✓ Works orders deleted');

    // 5. Delete contractors
    console.log('5. Deleting contractors...');
    const { error: contractorsError } = await supabase
      .from('contractors')
      .delete()
      .in('agency_id', agencyIds);
    if (contractorsError) console.error('Error deleting contractors:', contractorsError);
    else console.log('   ✓ Contractors deleted');

    // 6. Delete leases
    console.log('6. Deleting leases...');
    const { error: leasesError } = await supabase
      .from('leases')
      .delete()
      .in('agency_id', agencyIds);
    if (leasesError) console.error('Error deleting leases:', leasesError);
    else console.log('   ✓ Leases deleted');

    // 7. Delete buildings
    console.log('7. Deleting buildings...');
    const { error: buildingsError } = await supabase
      .from('buildings')
      .delete()
      .in('agency_id', agencyIds);
    if (buildingsError) console.error('Error deleting buildings:', buildingsError);
    else console.log('   ✓ Buildings deleted');

    // 8. Delete the agency itself
    console.log('8. Deleting agency...');
    const { error: agencyError } = await supabase
      .from('agencies')
      .delete()
      .in('id', agencyIds);
    if (agencyError) console.error('Error deleting agency:', agencyError);
    else console.log('   ✓ Agency deleted');

    console.log('\n✅ Pimlico Place data removal complete!');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

removePimlicoPlace();
