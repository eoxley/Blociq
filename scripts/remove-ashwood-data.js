const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function removeAshwoodData() {
  console.log('🗑️  Starting Ashwood House data removal...\n');

  try {
    // 1. Find Ashwood House building
    console.log('📍 Finding Ashwood House building...');
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name, agency_id')
      .ilike('name', '%Ashwood%')
      .single();

    if (buildingError) {
      console.log('✅ No Ashwood House building found - nothing to remove');
      return;
    }

    console.log(`Found building: ${building.name} (ID: ${building.id})`);
    console.log(`Agency ID: ${building.agency_id}\n`);

    const buildingId = building.id;

    // 2. Remove building_compliance_assets
    console.log('🗑️  Removing compliance assets...');
    const { error: complianceError, count: complianceCount } = await supabase
      .from('building_compliance_assets')
      .delete()
      .eq('building_id', buildingId);

    if (complianceError) {
      console.error('Error removing compliance assets:', complianceError);
    } else {
      console.log(`✅ Removed ${complianceCount || 0} compliance asset records`);
    }

    // 3. Remove leaseholders
    console.log('🗑️  Removing leaseholders...');
    const { error: leaseholdersError, count: leaseholdersCount } = await supabase
      .from('leaseholders')
      .delete()
      .eq('building_id', buildingId);

    if (leaseholdersError) {
      console.error('Error removing leaseholders:', leaseholdersError);
    } else {
      console.log(`✅ Removed ${leaseholdersCount || 0} leaseholder records`);
    }

    // 4. Remove leases
    console.log('🗑️  Removing leases...');
    const { error: leasesError, count: leasesCount } = await supabase
      .from('leases')
      .delete()
      .eq('building_id', buildingId);

    if (leasesError) {
      console.error('Error removing leases:', leasesError);
    } else {
      console.log(`✅ Removed ${leasesCount || 0} lease records`);
    }

    // 5. Remove major works
    console.log('🗑️  Removing major works...');
    const { error: majorWorksError, count: majorWorksCount } = await supabase
      .from('major_works')
      .delete()
      .eq('building_id', buildingId);

    if (majorWorksError) {
      console.error('Error removing major works:', majorWorksError);
    } else {
      console.log(`✅ Removed ${majorWorksCount || 0} major works records`);
    }

    // 6. Remove communications
    console.log('🗑️  Removing communications...');
    const { error: communicationsError, count: communicationsCount } = await supabase
      .from('communications')
      .delete()
      .eq('building_id', buildingId);

    if (communicationsError) {
      console.error('Error removing communications:', communicationsError);
    } else {
      console.log(`✅ Removed ${communicationsCount || 0} communication records`);
    }

    // 7. Remove document links (document_buildings)
    console.log('🗑️  Removing document links...');
    const { error: docLinksError, count: docLinksCount } = await supabase
      .from('document_buildings')
      .delete()
      .eq('building_id', buildingId);

    if (docLinksError) {
      console.error('Error removing document links:', docLinksError);
    } else {
      console.log(`✅ Removed ${docLinksCount || 0} document link records`);
    }

    // 8. Find and list documents that are ONLY linked to Ashwood
    console.log('🔍 Checking for Ashwood-only documents...');
    const { data: ashwoodDocs, error: ashwoodDocsError } = await supabase
      .from('documents')
      .select('id, original_filename')
      .eq('building_id', buildingId);

    if (!ashwoodDocsError && ashwoodDocs && ashwoodDocs.length > 0) {
      console.log(`Found ${ashwoodDocs.length} documents directly linked to Ashwood House`);

      // Remove documents that belong to Ashwood
      console.log('🗑️  Removing Ashwood documents...');
      const { error: docsError, count: docsCount } = await supabase
        .from('documents')
        .delete()
        .eq('building_id', buildingId);

      if (docsError) {
        console.error('Error removing documents:', docsError);
      } else {
        console.log(`✅ Removed ${docsCount || 0} document records`);
      }
    }

    // 9. Remove the building itself
    console.log('🗑️  Removing Ashwood House building...');
    const { error: buildingDeleteError } = await supabase
      .from('buildings')
      .delete()
      .eq('id', buildingId);

    if (buildingDeleteError) {
      console.error('Error removing building:', buildingDeleteError);
    } else {
      console.log(`✅ Removed Ashwood House building`);
    }

    // 10. Verify user profile is intact
    console.log('\n✅ Verifying user profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, name')
      .eq('email', 'eleanor.oxley@blociq.co.uk')
      .single();

    if (profileError) {
      console.error('❌ Error checking user profile:', profileError);
    } else {
      console.log(`✅ User profile intact: ${profile.email} (${profile.name || 'No name set'})`);
    }

    console.log('\n✨ Ashwood House data removal complete!');

  } catch (error) {
    console.error('❌ Error during removal:', error);
    process.exit(1);
  }
}

removeAshwoodData();