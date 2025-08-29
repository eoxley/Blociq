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

    const searchParams = request.nextUrl.searchParams;
    const testMode = searchParams.get('testMode') === 'true';
    
    console.log('🔍 Testing database connectivity...');

    let results: any = {};

    // Test 1: Check if buildings table exists and has data
    try {
      const { data: buildings, error: buildingsError } = await supabase
        .from('buildings')
        .select('id, name, address, postcode, unit_count, access_notes, key_access_notes, entry_code')
        .limit(5);

      if (buildingsError) {
        results.buildings = { error: buildingsError.message, exists: false };
      } else {
        results.buildings = { 
          exists: true, 
          count: buildings?.length || 0, 
          data: buildings || [],
          error: null 
        };
      }
    } catch (error) {
      results.buildings = { error: 'Exception occurred', exists: false };
    }

    // Test 2: Check if units table exists and has data
    try {
      const { data: units, error: unitsError } = await supabase
        .from('units')
        .select('id, unit_number, unit_label, building_id, floor')
        .limit(5);

      if (unitsError) {
        results.units = { error: unitsError.message, exists: false };
      } else {
        results.units = { 
          exists: true, 
          count: units?.length || 0, 
          data: units || [],
          error: null 
        };
      }
    } catch (error) {
      results.units = { error: 'Exception occurred', exists: false };
    }

    // Test 3: Check if leaseholders table exists and has data
    try {
      const { data: leaseholders, error: leaseholdersError } = await supabase
        .from('leaseholders')
        .select('id, name, email, phone_number, unit_id, is_director, director_role')
        .limit(5);

      if (leaseholdersError) {
        results.leaseholders = { error: leaseholdersError.message, exists: false };
      } else {
        results.leaseholders = { 
          exists: true, 
          count: leaseholders?.length || 0, 
          data: leaseholders || [],
          error: null 
        };
      }
    } catch (error) {
      results.leaseholders = { error: 'Exception occurred', exists: false };
    }

    // Test 4: Check if vw_units_leaseholders view exists
    try {
      const { data: viewData, error: viewError } = await supabase
        .from('vw_units_leaseholders')
        .select('*')
        .limit(1);

      if (viewError) {
        results.vw_units_leaseholders = { error: viewError.message, exists: false };
      } else {
        results.vw_units_leaseholders = { 
          exists: true, 
          count: viewData?.length || 0, 
          data: viewData || [],
          error: null 
        };
      }
    } catch (error) {
      results.vw_units_leaseholders = { error: 'Exception occurred', exists: false };
    }

    // Test 5: Specific search for Ashwood House
    try {
      const { data: ashwoodBuildings, error: ashwoodError } = await supabase
        .from('buildings')
        .select('id, name, address, access_notes, key_access_notes, entry_code')
        .or('name.ilike.%ashwood%,name.ilike.%Ashwood%')
        .limit(3);

      if (ashwoodError) {
        results.ashwoodSearch = { error: ashwoodError.message };
      } else {
        results.ashwoodSearch = { 
          found: ashwoodBuildings?.length || 0, 
          data: ashwoodBuildings || [] 
        };
      }
    } catch (error) {
      results.ashwoodSearch = { error: 'Exception occurred' };
    }

    // Test 6: Search for unit 5 in any building
    try {
      const { data: unit5Data, error: unit5Error } = await supabase
        .from('units')
        .select('id, unit_number, unit_label, building_id')
        .or('unit_number.eq.5,unit_number.ilike.%5%')
        .limit(5);

      if (unit5Error) {
        results.unit5Search = { error: unit5Error.message };
      } else {
        results.unit5Search = { 
          found: unit5Data?.length || 0, 
          data: unit5Data || [] 
        };
      }
    } catch (error) {
      results.unit5Search = { error: 'Exception occurred' };
    }

    // Test 7: Combined search for Ashwood House + Unit 5
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

          results.combinedSearch = {
            ashwoodBuilding: ashwoodBuilding,
            unit5Units: unit5Units,
            unit5Leaseholders: leaseholdersError ? { error: leaseholdersError.message } : { data: unit5Leaseholders || [] }
          };
        } else {
          results.combinedSearch = { message: 'Unit 5 not found in Ashwood House' };
        }
      } else {
        results.combinedSearch = { message: 'Cannot perform combined search - missing building or unit data' };
      }
    } catch (error) {
      results.combinedSearch = { error: 'Exception occurred in combined search' };
    }

    console.log('✅ Database connectivity test completed');

    if (testMode) {
      return NextResponse.json({
        success: true,
        message: 'Database connectivity test completed',
        results,
        timestamp: new Date().toISOString()
      });
    } else {
      // Return a user-friendly summary
      const summary = {
        success: true,
        message: 'Database connectivity verified',
        summary: {
          buildings: results.buildings?.exists ? `${results.buildings.count} buildings found` : 'Buildings table not accessible',
          units: results.units?.exists ? `${results.units.count} units found` : 'Units table not accessible',
          leaseholders: results.leaseholders?.exists ? `${results.leaseholders.count} leaseholders found` : 'Leaseholders table not accessible',
          view: results.vw_units_leaseholders?.exists ? 'View exists' : 'View not accessible',
          ashwoodHouse: results.ashwoodSearch?.found ? `${results.ashwoodSearch.found} Ashwood buildings found` : 'Ashwood House not found',
          unit5: results.unit5Search?.found ? `${results.unit5Search.found} unit 5 found` : 'Unit 5 not found'
        },
        recommendations: []
      };

      // Add recommendations based on findings
      if (!results.buildings?.exists) {
        summary.recommendations.push('Buildings table is not accessible - check permissions');
      }
      if (!results.leaseholders?.exists) {
        summary.recommendations.push('Leaseholders table is not accessible - check permissions');
      }
      if (!results.vw_units_leaseholders?.exists) {
        summary.recommendations.push('vw_units_leaseholders view does not exist - using fallback search');
      }
      if (results.ashwoodSearch?.found === 0) {
        summary.recommendations.push('Ashwood House not found in database - add building data');
      }
      if (results.unit5Search?.found === 0) {
        summary.recommendations.push('Unit 5 not found in database - add unit data');
      }

      return NextResponse.json(summary);
    }

  } catch (error: any) {
    console.error('❌ Database connectivity test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Database connectivity test failed',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
