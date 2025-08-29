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

    console.log('🔍 Testing simple database connectivity...');

    let results: any = {};

    // Test 1: Simple buildings query
    try {
      const { data: buildings, error } = await supabase
        .from('buildings')
        .select('id, name, address')
        .limit(3);

      if (error) {
        results.buildings = { error: error.message };
      } else {
        results.buildings = { count: buildings?.length || 0, data: buildings || [] };
      }
    } catch (error) {
      results.buildings = { error: 'Exception occurred' };
    }

    // Test 2: Simple units query
    try {
      const { data: units, error } = await supabase
        .from('units')
        .select('id, unit_number, building_id')
        .limit(3);

      if (error) {
        results.units = { error: error.message };
      } else {
        results.units = { count: units?.length || 0, data: units || [] };
      }
    } catch (error) {
      results.units = { error: 'Exception occurred' };
    }

    // Test 3: Simple leaseholders query
    try {
      const { data: leaseholders, error } = await supabase
        .from('leaseholders')
        .select('id, name, unit_id')
        .limit(3);

      if (error) {
        results.leaseholders = { error: error.message };
      } else {
        results.leaseholders = { count: leaseholders?.length || 0, data: leaseholders || [] };
      }
    } catch (error) {
      results.leaseholders = { error: 'Exception occurred' };
    }

    // Test 4: Search for Ashwood specifically
    try {
      const { data: ashwood, error } = await supabase
        .from('buildings')
        .select('id, name, address')
        .or('name.ilike.%ashwood%,name.ilike.%Ashwood%')
        .limit(1);

      if (error) {
        results.ashwoodSearch = { error: error.message };
      } else {
        results.ashwoodSearch = { found: ashwood?.length || 0, data: ashwood || [] };
      }
    } catch (error) {
      results.ashwoodSearch = { error: 'Exception occurred' };
    }

    // Test 5: Search for unit 5 specifically
    try {
      const { data: unit5, error } = await supabase
        .from('units')
        .select('id, unit_number, building_id')
        .eq('unit_number', '5')
        .limit(3);

      if (error) {
        results.unit5Search = { error: error.message };
      } else {
        results.unit5Search = { found: unit5?.length || 0, data: unit5 || [] };
      }
    } catch (error) {
      results.unit5Search = { error: 'Exception occurred' };
    }

    console.log('✅ Simple database test completed');

    return NextResponse.json({
      success: true,
      message: 'Simple database connectivity test completed',
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Simple database test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Simple database test failed',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
