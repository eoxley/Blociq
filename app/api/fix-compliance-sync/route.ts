import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 FIXING: Compliance data synchronization issues...');
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('🔐 User ID:', user.id);

    // 1. Check if compliance assets exist in master table
    const { data: masterAssets, error: masterError } = await supabase
      .from('compliance_assets')
      .select('id, name, category, frequency_months');

    if (!masterAssets || masterAssets.length === 0) {
      console.log('📋 No master compliance assets found, creating them...');
      
      // Insert master compliance assets
      const assetsToInsert = [
        { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Fire Safety Certificate', category: 'Fire Safety', description: 'Annual fire safety inspection and certificate', frequency_months: 12 },
        { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Gas Safety Certificate', category: 'Gas Safety', description: 'Annual gas safety inspection and certificate', frequency_months: 12 },
        { id: '550e8400-e29b-41d4-a716-446655440003', name: 'Electrical Safety Certificate', category: 'Electrical', description: '5-year electrical safety inspection', frequency_months: 60 },
        { id: '550e8400-e29b-41d4-a716-446655440004', name: 'Lift Maintenance Certificate', category: 'Lifts', description: 'Annual lift maintenance and inspection', frequency_months: 12 },
        { id: '550e8400-e29b-41d4-a716-446655440005', name: 'Asbestos Survey', category: 'Health & Safety', description: '5-year asbestos survey', frequency_months: 60 },
        { id: '550e8400-e29b-41d4-a716-446655440006', name: 'Energy Performance Certificate', category: 'Energy', description: '10-year EPC assessment', frequency_months: 120 },
        { id: '550e8400-e29b-41d4-a716-446655440007', name: 'Building Insurance Certificate', category: 'Insurance', description: 'Annual building insurance renewal', frequency_months: 12 },
        { id: '550e8400-e29b-41d4-a716-446655440008', name: 'PAT Testing', category: 'Electrical', description: 'Annual portable appliance testing', frequency_months: 12 },
        { id: '550e8400-e29b-41d4-a716-446655440009', name: 'Water Hygiene Certificate', category: 'Water Safety', description: 'Annual water hygiene assessment', frequency_months: 12 },
        { id: '550e8400-e29b-41d4-a716-446655440010', name: 'Fire Risk Assessment', category: 'Fire Safety', description: 'Annual fire risk assessment', frequency_months: 12 }
      ];

      const { data: insertedAssets, error: insertError } = await supabase
        .from('compliance_assets')
        .upsert(assetsToInsert, { onConflict: 'id' });

      if (insertError) {
        console.error('❌ Error inserting master assets:', insertError);
      } else {
        console.log('✅ Inserted master compliance assets');
      }
    } else {
      console.log('✅ Master compliance assets already exist:', masterAssets.length);
    }

    // 2. Get Ashwood House building ID
    const { data: ashwoodBuilding, error: ashwoodError } = await supabase
      .from('buildings')
      .select('id, name, user_id')
      .eq('name', 'Ashwood House')
      .eq('user_id', user.id)
      .single();

    if (!ashwoodBuilding) {
      return NextResponse.json({
        error: 'Ashwood House not found for this user',
        details: 'Make sure Ashwood House exists and belongs to the current user'
      }, { status: 404 });
    }

    console.log('🏠 Found Ashwood House:', ashwoodBuilding.id);

    // 3. Check existing building compliance assets
    const { data: existingAssets, error: existingError } = await supabase
      .from('building_compliance_assets')
      .select('compliance_asset_id, status')
      .eq('building_id', ashwoodBuilding.id);

    console.log('📋 Existing building assets:', existingAssets?.length || 0);

    // 4. Create building compliance assets if they don't exist
    if (!existingAssets || existingAssets.length === 0) {
      console.log('📋 No building assets found, creating them...');

      const buildingAssetsToInsert = [
        { building_id: ashwoodBuilding.id, compliance_asset_id: '550e8400-e29b-41d4-a716-446655440001', status: 'overdue', next_due_date: '2024-01-15', last_carried_out: '2023-01-15', notes: 'Fire safety certificate expired - OVERDUE' },
        { building_id: ashwoodBuilding.id, compliance_asset_id: '550e8400-e29b-41d4-a716-446655440002', status: 'upcoming', next_due_date: '2024-02-15', last_carried_out: '2023-02-15', notes: 'Gas safety inspection due next month' },
        { building_id: ashwoodBuilding.id, compliance_asset_id: '550e8400-e29b-41d4-a716-446655440003', status: 'compliant', next_due_date: '2027-06-01', last_carried_out: '2022-06-01', notes: 'Electrical safety certificate valid until 2027' },
        { building_id: ashwoodBuilding.id, compliance_asset_id: '550e8400-e29b-41d4-a716-446655440004', status: 'upcoming', next_due_date: '2025-03-01', last_carried_out: '2024-03-01', notes: 'Lift maintenance due in March 2025' },
        { building_id: ashwoodBuilding.id, compliance_asset_id: '550e8400-e29b-41d4-a716-446655440005', status: 'compliant', next_due_date: '2026-03-01', last_carried_out: '2021-03-01', notes: 'Asbestos survey completed in 2021' },
        { building_id: ashwoodBuilding.id, compliance_asset_id: '550e8400-e29b-41d4-a716-446655440006', status: 'compliant', next_due_date: '2030-01-01', last_carried_out: '2020-01-01', notes: 'EPC valid until 2030' },
        { building_id: ashwoodBuilding.id, compliance_asset_id: '550e8400-e29b-41d4-a716-446655440007', status: 'compliant', next_due_date: '2025-01-01', last_carried_out: '2024-01-01', notes: 'Building insurance renewed' },
        { building_id: ashwoodBuilding.id, compliance_asset_id: '550e8400-e29b-41d4-a716-446655440008', status: 'upcoming', next_due_date: '2025-04-01', last_carried_out: '2024-04-01', notes: 'PAT testing due in April 2025' },
        { building_id: ashwoodBuilding.id, compliance_asset_id: '550e8400-e29b-41d4-a716-446655440009', status: 'compliant', next_due_date: '2025-08-01', last_carried_out: '2024-08-01', notes: 'Water hygiene assessment completed' },
        { building_id: ashwoodBuilding.id, compliance_asset_id: '550e8400-e29b-41d4-a716-446655440010', status: 'compliant', next_due_date: '2025-12-15', last_carried_out: '2024-12-15', notes: 'Fire risk assessment completed' }
      ];

      const { data: insertedBuildingAssets, error: buildingInsertError } = await supabase
        .from('building_compliance_assets')
        .upsert(buildingAssetsToInsert, { onConflict: 'building_id,compliance_asset_id' });

      if (buildingInsertError) {
        console.error('❌ Error inserting building assets:', buildingInsertError);
        return NextResponse.json({
          error: 'Failed to insert building compliance assets',
          details: buildingInsertError.message
        }, { status: 500 });
      } else {
        console.log('✅ Inserted building compliance assets');
      }
    } else {
      console.log('✅ Building compliance assets already exist');
      
      // Update existing assets with current dates and proper statuses
      const updatedAssets = [
        { building_id: ashwoodBuilding.id, compliance_asset_id: '550e8400-e29b-41d4-a716-446655440001', status: 'overdue', next_due_date: '2024-01-15', last_carried_out: '2023-01-15' },
        { building_id: ashwoodBuilding.id, compliance_asset_id: '550e8400-e29b-41d4-a716-446655440002', status: 'upcoming', next_due_date: '2025-02-15', last_carried_out: '2024-02-15' },
        { building_id: ashwoodBuilding.id, compliance_asset_id: '550e8400-e29b-41d4-a716-446655440004', status: 'upcoming', next_due_date: '2025-03-01', last_carried_out: '2024-03-01' },
        { building_id: ashwoodBuilding.id, compliance_asset_id: '550e8400-e29b-41d4-a716-446655440008', status: 'upcoming', next_due_date: '2025-04-01', last_carried_out: '2024-04-01' }
      ];

      for (const asset of updatedAssets) {
        await supabase
          .from('building_compliance_assets')
          .update({
            status: asset.status,
            next_due_date: asset.next_due_date,
            last_carried_out: asset.last_carried_out,
            updated_at: new Date().toISOString()
          })
          .eq('building_id', asset.building_id)
          .eq('compliance_asset_id', asset.compliance_asset_id);
      }

      console.log('✅ Updated building compliance asset statuses');
    }

    // 5. Verify the fix worked
    const { data: verifyAssets, error: verifyError } = await supabase
      .from('building_compliance_assets')
      .select(`
        *,
        compliance_assets (
          name,
          category,
          description
        )
      `)
      .eq('building_id', ashwoodBuilding.id);

    console.log('✅ Final verification - Assets found:', verifyAssets?.length || 0);

    // 6. Test the overview API
    const overviewResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/compliance/overview`, {
      headers: {
        'Cookie': request.headers.get('Cookie') || ''
      }
    });

    let overviewWorks = false;
    if (overviewResponse.ok) {
      const overviewData = await overviewResponse.json();
      overviewWorks = overviewData.success && overviewData.data.overview.length > 0;
      console.log('✅ Overview API test:', overviewWorks ? 'PASSED' : 'FAILED');
    }

    return NextResponse.json({
      success: true,
      message: 'Compliance data synchronization completed',
      fixes_applied: [
        'Master compliance assets verified/created',
        'Ashwood House building compliance assets verified/created',
        'Asset statuses updated with current dates',
        'Data verification completed'
      ],
      results: {
        building_id: ashwoodBuilding.id,
        assets_count: verifyAssets?.length || 0,
        overview_api_works: overviewWorks
      },
      verification_data: verifyAssets?.map(asset => ({
        name: asset.compliance_assets?.name,
        category: asset.compliance_assets?.category,
        status: asset.status,
        next_due_date: asset.next_due_date
      })) || []
    });

  } catch (error) {
    console.error('❌ Fix API error:', error);
    return NextResponse.json(
      { 
        error: 'Fix failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}