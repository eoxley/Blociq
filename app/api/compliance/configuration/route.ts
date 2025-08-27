import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { building_id, active_assets, is_hrb, updated_at } = await request.json();

    if (!building_id) {
      return NextResponse.json({ success: false, error: 'Building ID is required' }, { status: 400 });
    }

    // Verify user has access to this building
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name')
      .eq('id', building_id)
      .single();

    if (buildingError || !building) {
      return NextResponse.json({ success: false, error: 'Building not found or access denied' }, { status: 404 });
    }

    // Get existing compliance assets for this building
    const { data: existingAssets, error: existingError } = await supabase
      .from('building_compliance_assets')
      .select('id, asset_type')
      .eq('building_id', building_id);

    if (existingError) {
      console.error('Error fetching existing assets:', existingError);
      return NextResponse.json({ success: false, error: 'Failed to fetch existing assets' }, { status: 500 });
    }

    // Determine which assets to add/remove
    const existingAssetTypes = existingAssets?.map((asset: any) => asset.asset_type) || [];
    const assetsToAdd = active_assets.filter((assetType: string) => !existingAssetTypes.includes(assetType));
    const assetsToRemove = [];

    for (const existingAsset of existingAssets || []) {
      if (!active_assets.includes(existingAsset.asset_type)) {
        assetsToRemove.push(existingAsset.id);
      }
    }

    // Perform database operations
    let addResult = null;
    let removeResult = null;

    // Add new assets
    if (assetsToAdd.length > 0) {
      const { data: addedAssets, error: addError } = await supabase
        .from('building_compliance_assets')
        .insert(assetsToAdd)
        .select();

      if (addError) {
        console.error('Error adding assets:', addError);
        return NextResponse.json({ success: false, error: 'Failed to add compliance assets' }, { status: 500 });
      }
      addResult = addedAssets;
    }

    // Remove inactive assets
    if (assetsToRemove.length > 0) {
      const { error: removeError } = await supabase
        .from('building_compliance_assets')
        .delete()
        .in('id', assetsToRemove);

      if (removeError) {
        console.error('Error removing assets:', removeError);
        return NextResponse.json({ success: false, error: 'Failed to remove compliance assets' }, { status: 500 });
      }
      removeResult = assetsToRemove;
    }

    // Update building HRB status if changed
    if (is_hrb !== undefined) {
      const { error: updateError } = await supabase
        .from('buildings')
        .update({ is_hrb: is_hrb })
        .eq('id', building_id);

      if (updateError) {
        console.error('Error updating building HRB status:', updateError);
        // Don't fail the entire operation for this
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        building_id,
        active_assets,
        is_hrb,
        added: addResult?.length || 0,
        removed: removeResult?.length || 0,
        updated_at
      }
    });

  } catch (error) {
    console.error('Error in compliance configuration:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// Helper functions to get asset information
function getAssetName(assetType: string): string {
  const assetNames: Record<string, string> = {
    fire_alarm_system: 'Fire Alarm System',
    emergency_lighting: 'Emergency Lighting',
    fire_extinguishers: 'Fire Extinguishers',
    fire_door_inspection: 'Fire Door Inspection',
    electrical_installation: 'Electrical Installation Condition Report (EICR)',
    portable_appliance_testing: 'Portable Appliance Testing (PAT)',
    gas_safety_check: 'Gas Safety Check',
    boiler_service: 'Boiler Service',
    structural_survey: 'Structural Survey',
    facade_inspection: 'Facade Inspection',
    asbestos_survey: 'Asbestos Management Survey',
    legionella_risk_assessment: 'Legionella Risk Assessment',
    building_safety_case: 'Building Safety Case',
    golden_thread: 'Golden Thread Documentation'
  };
  return assetNames[assetType] || assetType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getAssetCategory(assetType: string): string {
  if (assetType.startsWith('fire_')) return 'fire_safety';
  if (assetType.startsWith('electrical') || assetType.includes('eicr') || assetType.includes('pat')) return 'electrical';
  if (assetType.startsWith('gas') || assetType.includes('boiler')) return 'gas';
  if (assetType.startsWith('structural') || assetType.includes('facade')) return 'structural';
  if (assetType.includes('asbestos') || assetType.includes('legionella')) return 'environmental';
  if (assetType.includes('building_safety') || assetType.includes('golden_thread')) return 'building_safety';
  return 'general';
}

function getAssetDescription(assetType: string): string {
  const descriptions: Record<string, string> = {
    fire_alarm_system: 'Annual inspection and testing of fire alarm system',
    emergency_lighting: 'Monthly testing of emergency lighting systems',
    fire_extinguishers: 'Annual service and inspection of fire extinguishers',
    fire_door_inspection: 'Annual inspection of fire doors and seals',
    electrical_installation: 'Comprehensive electrical safety inspection',
    portable_appliance_testing: 'Testing of portable electrical appliances',
    gas_safety_check: 'Annual gas appliance safety inspection',
    boiler_service: 'Annual boiler service and maintenance',
    structural_survey: 'Comprehensive structural condition assessment',
    facade_inspection: 'External building facade safety inspection',
    asbestos_survey: 'Asbestos presence and condition assessment',
    legionella_risk_assessment: 'Water system legionella risk evaluation',
    building_safety_case: 'Comprehensive building safety case for HRB',
    golden_thread: 'Maintenance of golden thread information'
  };
  return descriptions[assetType] || 'Compliance requirement for building safety';
}

function getAssetFrequency(assetType: string): string {
  const frequencies: Record<string, string> = {
    emergency_lighting: 'monthly',
    fire_alarm_system: 'annual',
    fire_extinguishers: 'annual',
    fire_door_inspection: 'annual',
    electrical_installation: 'quinquennial',
    portable_appliance_testing: 'annual',
    gas_safety_check: 'annual',
    boiler_service: 'annual',
    structural_survey: 'quinquennial',
    facade_inspection: 'annual',
    asbestos_survey: 'triennial',
    legionella_risk_assessment: 'biennial',
    building_safety_case: 'ongoing',
    golden_thread: 'ongoing'
  };
  return frequencies[assetType] || 'annual';
}

function getAssetRequired(assetType: string): boolean {
  const requiredAssets = [
    'fire_alarm_system', 'emergency_lighting', 'fire_extinguishers', 'fire_door_inspection',
    'electrical_installation', 'gas_safety_check', 'boiler_service', 'legionella_risk_assessment'
  ];
  return requiredAssets.includes(assetType);
}

function getAssetPriority(assetType: string): string {
  const criticalAssets = ['fire_alarm_system', 'emergency_lighting', 'gas_safety_check'];
  const highPriorityAssets = ['electrical_installation', 'structural_survey', 'asbestos_survey'];
  
  if (criticalAssets.includes(assetType)) return 'critical';
  if (highPriorityAssets.includes(assetType)) return 'high';
  return 'medium';
}

function getAssetHRBOnly(assetType: string): boolean {
  const hrbAssets = ['building_safety_case', 'golden_thread'];
  return hrbAssets.includes(assetType);
}
