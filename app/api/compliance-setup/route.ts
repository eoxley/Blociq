import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });
  const { buildingIds, assetIds } = await req.json();

  // Get the current user's session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (!buildingIds || !Array.isArray(buildingIds) || buildingIds.length === 0) {
    return NextResponse.json({ error: 'Building IDs are required' }, { status: 400 });
  }

  if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
    return NextResponse.json({ error: 'Asset IDs are required' }, { status: 400 });
  }

  try {
    // Prepare bulk insert data
    const insertData = [];
    for (const buildingId of buildingIds) {
      for (const assetId of assetIds) {
        insertData.push({
          building_id: parseInt(buildingId),
          asset_id: assetId,
          status: 'Not Started',
          last_updated: new Date().toISOString()
        });
      }
    }

    // Check for existing records to avoid duplicates
    const { data: existingRecords, error: checkError } = await supabase
      .from('building_compliance_assets')
      .select('building_id, asset_id')
      .in('building_id', buildingIds.map(id => parseInt(id)))
      .in('asset_id', assetIds);

    if (checkError) {
      console.error('Error checking existing records:', checkError);
      return NextResponse.json({ error: 'Failed to check existing records' }, { status: 500 });
    }

    // Filter out existing combinations
    const existingCombinations = new Set();
    existingRecords?.forEach(record => {
      existingCombinations.add(`${record.building_id}-${record.asset_id}`);
    });

    const newRecords = insertData.filter(record => {
      const combination = `${record.building_id}-${record.asset_id}`;
      return !existingCombinations.has(combination);
    });

    if (newRecords.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: 'All compliance assets already exist for the selected buildings',
        inserted: 0,
        skipped: insertData.length
      });
    }

    // Insert new records
    const { data: insertedRecords, error: insertError } = await supabase
      .from('building_compliance_assets')
      .insert(newRecords)
      .select();

    if (insertError) {
      console.error('Error inserting compliance assets:', insertError);
      return NextResponse.json({ error: 'Failed to set up compliance assets' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully set up compliance for ${buildingIds.length} buildings with ${assetIds.length} assets`,
      inserted: insertedRecords?.length || 0,
      skipped: insertData.length - (insertedRecords?.length || 0),
      total: insertData.length
    });

  } catch (error) {
    console.error('Error in compliance setup:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 