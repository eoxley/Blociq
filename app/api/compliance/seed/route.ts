import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    console.log('🌱 Starting compliance data seeding...');
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ 
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    console.log('🔐 User authenticated:', user.id);

    // First, let's check what buildings exist
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name')
      .limit(10);

    if (buildingsError) {
      console.error('Error fetching buildings:', buildingsError);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to fetch buildings'
      }, { status: 500 });
    }

    console.log('🏢 Found', buildings?.length || 0, 'buildings');

    // Insert compliance assets
    const complianceAssets = [
      {
        name: 'EICR',
        category: 'Electrical',
        description: 'Electrical Installation Condition Report - required every 5 years for residential properties'
      },
      {
        name: 'Gas Safety Certificate',
        category: 'Gas',
        description: 'Annual gas safety inspection and certificate for gas appliances'
      },
      {
        name: 'Fire Risk Assessment',
        category: 'Fire Safety',
        description: 'Fire risk assessment review - required annually'
      },
      {
        name: 'PAT Testing',
        category: 'Electrical',
        description: 'Portable Appliance Testing for electrical equipment'
      },
      {
        name: 'Legionella Risk Assessment',
        category: 'Water Safety',
        description: 'Legionella risk assessment for water systems'
      },
      {
        name: 'Asbestos Survey',
        category: 'Building Safety',
        description: 'Asbestos survey and management plan'
      },
      {
        name: 'Lift Inspection',
        category: 'Building Safety',
        description: 'Lift safety inspection and testing'
      },
      {
        name: 'Emergency Lighting',
        category: 'Fire Safety',
        description: 'Emergency lighting system testing'
      },
      {
        name: 'H&S Log',
        category: 'Health & Safety',
        description: 'Health and Safety log book maintenance'
      },
      {
        name: 'Building Insurance',
        category: 'Insurance',
        description: 'Building insurance certificate and policy documents'
      }
    ];

    // Insert compliance assets
    const { data: insertedAssets, error: assetsError } = await supabase
      .from('compliance_assets')
      .upsert(complianceAssets, { 
        onConflict: 'name',
        ignoreDuplicates: false 
      })
      .select();

    if (assetsError) {
      console.error('Error inserting compliance assets:', assetsError);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to insert compliance assets'
      }, { status: 500 });
    }

    console.log('✅ Inserted', insertedAssets?.length || 0, 'compliance assets');

    // Get the inserted assets
    const { data: allAssets, error: fetchAssetsError } = await supabase
      .from('compliance_assets')
      .select('id, name, category');

    if (fetchAssetsError) {
      console.error('Error fetching compliance assets:', fetchAssetsError);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to fetch compliance assets'
      }, { status: 500 });
    }

    // Create building compliance asset assignments
    const assignments = [];
    let assignmentCount = 0;

    for (const building of buildings || []) {
      // Assign 3-5 random assets to each building
      const numAssets = Math.floor(Math.random() * 3) + 3; // 3-5 assets
      const shuffledAssets = [...(allAssets || [])].sort(() => 0.5 - Math.random());
      
      for (let i = 0; i < numAssets && i < shuffledAssets.length; i++) {
        const asset = shuffledAssets[i];
        const statuses = ['compliant', 'overdue', 'pending'];
        const status = statuses[assignmentCount % statuses.length];
        
        assignments.push({
          building_id: building.id,
          asset_id: asset.id,
          status: status,
          next_due_date: new Date(Date.now() + (30 + assignmentCount * 10) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          notes: `Sample compliance asset for ${building.name}`
        });
        
        assignmentCount++;
      }
    }

    // Insert building compliance asset assignments
    const { data: insertedAssignments, error: assignmentsError } = await supabase
      .from('building_compliance_assets')
      .upsert(assignments, { 
        onConflict: 'building_id,asset_id',
        ignoreDuplicates: false 
      })
      .select();

    if (assignmentsError) {
      console.error('Error inserting building compliance assets:', assignmentsError);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to insert building compliance assets'
      }, { status: 500 });
    }

    console.log('✅ Created', insertedAssignments?.length || 0, 'building compliance asset assignments');

    // Get final counts
    const { data: finalAssets } = await supabase
      .from('compliance_assets')
      .select('id', { count: 'exact' });
    
    const { data: finalAssignments } = await supabase
      .from('building_compliance_assets')
      .select('id', { count: 'exact' });

    return NextResponse.json({
      success: true,
      message: 'Compliance data seeded successfully',
      data: {
        complianceAssets: finalAssets?.length || 0,
        buildingAssignments: finalAssignments?.length || 0,
        buildings: buildings?.length || 0
      }
    });

  } catch (error) {
    console.error('❌ Compliance seeding error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
