import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { 
  syncMultipleComplianceAssetsToOutlook,
  BuildingComplianceAsset 
} from '@/lib/outlook/syncCalendarEvent';

export async function POST(request: NextRequest) {
  try {
    console.log('📅 Starting compliance to calendar sync...');
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

    // Get user's buildings - try multiple approaches
    let { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name, is_hrb')
      .eq('user_id', user.id);
    
    // If no buildings found with user_id, try building_members table
    if ((!buildings || buildings.length === 0) && !buildingsError) {
      const { data: memberBuildings, error: memberError } = await supabase
        .from('building_members')
        .select('building_id, buildings!building_id(id, name, is_hrb)')
        .eq('user_id', user.id);
      
      if (!memberError && memberBuildings) {
        buildings = memberBuildings.map(m => m.buildings).filter(Boolean);
      }
    }
    
    // If still no buildings, try to get all buildings (for testing)
    if ((!buildings || buildings.length === 0) && !buildingsError) {
      console.log('No user-specific buildings found, trying to get all buildings for testing');
      const { data: allBuildings, error: allBuildingsError } = await supabase
        .from('buildings')
        .select('id, name, is_hrb')
        .limit(5);
      
      if (!allBuildingsError && allBuildings) {
        buildings = allBuildings;
      }
    }

    if (buildingsError) {
      console.error('Error fetching buildings:', buildingsError);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to fetch buildings'
      }, { status: 500 });
    }

    if (!buildings || buildings.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No buildings found for user',
        data: {
          synced: 0,
          created: 0,
          updated: 0,
          skipped: 0,
          errors: 0
        }
      });
    }

    const buildingIds = buildings.map(b => b.id);
    console.log('🏢 Found', buildings.length, 'buildings for user');

    // Get all building compliance assets with due dates
    const { data: complianceAssets, error: complianceError } = await supabase
      .from('building_compliance_assets')
      .select(`
        id,
        building_id,
        asset_id,
        status,
        next_due_date,
        notes,
        calendar_event_id,
        compliance_assets!asset_id (
          id,
          name,
          category,
          description
        )
      `)
      .in('building_id', buildingIds)
      .not('next_due_date', 'is', null)
      .order('next_due_date', { ascending: true });

    if (complianceError) {
      console.error('Error fetching compliance assets:', complianceError);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to fetch compliance assets'
      }, { status: 500 });
    }

    if (!complianceAssets || complianceAssets.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No compliance assets with due dates found',
        data: {
          synced: 0,
          created: 0,
          updated: 0,
          skipped: 0,
          errors: 0
        }
      });
    }

    console.log('📋 Found', complianceAssets.length, 'compliance assets with due dates');

    // Create building lookup map
    const buildingMap = new Map(buildings.map(b => [b.id, b]));

    // Transform the data to include building information
    const transformedAssets: BuildingComplianceAsset[] = complianceAssets.map(asset => ({
      ...asset,
      buildings: buildingMap.get(asset.building_id) ? {
        ...buildingMap.get(asset.building_id),
        id: buildingMap.get(asset.building_id)!.id.toString()
      } : null
    }));

    // Sync assets to Outlook calendar
    const syncResult = await syncMultipleComplianceAssetsToOutlook(transformedAssets);

    // Update calendar_event_id in database for successfully synced assets
    if (syncResult.success && syncResult.results.length > 0) {
      const updatePromises = syncResult.results.map(async (result, index) => {
        if (result.success && result.eventId) {
          const asset = transformedAssets[index];
          const { error: updateError } = await supabase
            .from('building_compliance_assets')
            .update({ calendar_event_id: result.eventId })
            .eq('id', asset.id);

          if (updateError) {
            console.error('Failed to update calendar_event_id for asset:', asset.id, updateError);
          } else {
            console.log('✅ Updated calendar_event_id for asset:', asset.id, '->', result.eventId);
          }
        }
      });

      await Promise.all(updatePromises);
    }

    console.log('✅ Compliance to calendar sync completed:', syncResult.summary);

    return NextResponse.json({
      success: syncResult.success,
      message: 'Compliance to calendar sync completed',
      data: {
        synced: syncResult.summary.total,
        created: syncResult.summary.created,
        updated: syncResult.summary.updated,
        skipped: syncResult.summary.skipped,
        errors: syncResult.summary.errors,
        results: syncResult.results
      }
    });

  } catch (error) {
    console.error('❌ Compliance to calendar sync error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('📅 Getting compliance calendar sync status...');
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ 
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Get compliance assets with calendar sync status
    const { data: complianceAssets, error: complianceError } = await supabase
      .from('building_compliance_assets')
      .select(`
        id,
        building_id,
        asset_id,
        status,
        next_due_date,
        calendar_event_id,
        compliance_assets!asset_id (
          name,
          category
        ),
        buildings!building_id (
          name
        )
      `)
      .not('next_due_date', 'is', null)
      .order('next_due_date', { ascending: true });

    if (complianceError) {
      console.error('Error fetching compliance assets:', complianceError);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to fetch compliance assets'
      }, { status: 500 });
    }

    const totalAssets = complianceAssets?.length || 0;
    const syncedAssets = complianceAssets?.filter(asset => asset.calendar_event_id) || [];
    const unsyncedAssets = complianceAssets?.filter(asset => !asset.calendar_event_id) || [];

    return NextResponse.json({
      success: true,
      data: {
        total: totalAssets,
        synced: syncedAssets.length,
        unsynced: unsyncedAssets.length,
        syncPercentage: totalAssets > 0 ? Math.round((syncedAssets.length / totalAssets) * 100) : 0,
        assets: complianceAssets?.map(asset => ({
          id: asset.id,
          name: asset.compliance_assets?.name || 'Unknown',
          building: asset.buildings?.name || 'Unknown',
          dueDate: asset.next_due_date,
          status: asset.status,
          synced: !!asset.calendar_event_id,
          eventId: asset.calendar_event_id
        })) || []
      }
    });

  } catch (error) {
    console.error('❌ Error getting compliance calendar sync status:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}