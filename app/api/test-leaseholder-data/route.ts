import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 Testing leaseholder data specifically...');

    let results: any = {};

    // Test 1: Check if vw_units_leaseholders view exists
    try {
      const { data: viewData, error: viewError } = await supabase
        .from('vw_units_leaseholders')
        .select('*')
        .limit(1);

      if (viewError) {
        results.view = { error: viewError.message, exists: false };
      } else {
        results.view = { 
          exists: true, 
          count: viewData?.length || 0, 
          data: viewData || [],
          error: null 
        };
      }
    } catch (error) {
      results.view = { error: 'Exception occurred', exists: false };
    }

    // Test 2: Check units table
    try {
      const { data: units, error: unitsError } = await supabase
        .from('units')
        .select('id, unit_number, unit_label, building_id, floor')
        .limit(10);

      if (unitsError) {
        results.units = { error: unitsError.message };
      } else {
        results.units = { 
          count: units?.length || 0, 
          data: units || [] 
        };
      }
    } catch (error) {
      results.units = { error: 'Exception occurred' };
    }

    // Test 3: Check leaseholders table
    try {
      const { data: leaseholders, error: leaseholdersError } = await supabase
        .from('leaseholders')
        .select('id, name, email, phone_number, unit_id, is_director, director_role')
        .limit(10);

      if (leaseholdersError) {
        results.leaseholders = { error: leaseholdersError.message };
      } else {
        results.leaseholders = { 
          count: leaseholders?.length || 0, 
          data: leaseholders || [] 
        };
      }
    } catch (error) {
      results.leaseholders = { error: 'Exception occurred' };
    }

    // Test 4: Check buildings table
    try {
      const { data: buildings, error: buildingsError } = await supabase
        .from('buildings')
        .select('id, name, address')
        .limit(10);

      if (buildingsError) {
        results.buildings = { error: buildingsError.message };
      } else {
        results.buildings = { 
          count: buildings?.length || 0, 
          data: buildings || [] 
        };
      }
    } catch (error) {
      results.buildings = { error: 'Exception occurred' };
    }

    // Test 5: Search for Ashwood House specifically
    try {
      const { data: ashwood, error: ashwoodError } = await supabase
        .from('buildings')
        .select('id, name, address')
        .or('name.ilike.%ashwood%,name.ilike.%Ashwood%')
        .limit(3);

      if (ashwoodError) {
        results.ashwoodSearch = { error: ashwoodError.message };
      } else {
        results.ashwoodSearch = { 
          found: ashwood?.length || 0, 
          data: ashwood || [] 
        };
      }
    } catch (error) {
      results.ashwoodSearch = { error: 'Exception occurred' };
    }

    // Test 6: Search for unit 5 specifically
    try {
      const { data: unit5, error: unit5Error } = await supabase
        .from('units')
        .select('id, unit_number, unit_label, building_id')
        .or('unit_number.eq.5,unit_number.ilike.%5%')
        .limit(5);

      if (unit5Error) {
        results.unit5Search = { error: unit5Error.message };
      } else {
        results.unit5Search = { 
          found: unit5?.length || 0, 
          data: unit5 || [] 
        };
      }
    } catch (error) {
      results.unit5Search = { error: 'Exception occurred' };
    }

    // Test 7: Try to join the data manually
    try {
      if (results.ashwoodSearch?.data?.length > 0 && results.unit5Search?.data?.length > 0) {
        const ashwoodBuilding = results.ashwoodSearch.data[0];
        const unit5Units = results.unit5Search.data.filter((u: any) => u.building_id === ashwoodBuilding.id);
        
        if (unit5Units.length > 0) {
          const unitIds = unit5Units.map((u: any) => u.id);
          
          const { data: unit5Leaseholders, error: leaseholdersError } = await supabase
            .from('leaseholders')
            .select('id, name, email, phone_number, unit_id, is_director, director_role')
            .in('unit_id', unitIds);

          results.manualJoin = {
            ashwoodBuilding: ashwoodBuilding,
            unit5Units: unit5Units,
            unit5Leaseholders: leaseholdersError ? { error: leaseholdersError.message } : { data: unit5Leaseholders || [] }
          };
        } else {
          results.manualJoin = { message: 'Unit 5 not found in Ashwood House' };
        }
      } else {
        results.manualJoin = { message: 'Cannot perform manual join - missing building or unit data' };
      }
    } catch (error) {
      results.manualJoin = { error: 'Exception occurred in manual join' };
    }

    console.log('✅ Leaseholder data test completed');

    return NextResponse.json({
      success: true,
      message: 'Leaseholder data test completed',
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Leaseholder data test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Leaseholder data test failed',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
