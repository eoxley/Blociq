import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    console.log("🔍 DEBUGGING DATABASE TABLES...");

    // Test each table that should contain data
    const results: any = {
      timestamp: new Date().toISOString(),
      tables: {}
    };

    // Test buildings table
    try {
      const { data: buildings, error: buildingError } = await supabase
        .from('buildings')
        .select('id, name, address, unit_count')
        .limit(5);
      
      results.tables.buildings = {
        count: buildings?.length || 0,
        data: buildings || [],
        error: buildingError?.message || null
      };
    } catch (err) {
      results.tables.buildings = { error: 'Exception: ' + err };
    }

    // Test leaseholders table
    try {
      const { data: leaseholders, error: leaseholderError } = await supabase
        .from('leaseholders')
        .select('id, name, email, phone_number')
        .limit(5);
      
      results.tables.leaseholders = {
        count: leaseholders?.length || 0,
        data: leaseholders || [],
        error: leaseholderError?.message || null
      };
    } catch (err) {
      results.tables.leaseholders = { error: 'Exception: ' + err };
    }

    // Test units table
    try {
      const { data: units, error: unitError } = await supabase
        .from('units')
        .select('id, unit_number, building_id, leaseholder_id')
        .limit(5);
      
      results.tables.units = {
        count: units?.length || 0,
        data: units || [],
        error: unitError?.message || null
      };
    } catch (err) {
      results.tables.units = { error: 'Exception: ' + err };
    }

    // Test the view that should combine units and leaseholders
    try {
      const { data: viewData, error: viewError } = await supabase
        .from('vw_units_leaseholders')
        .select('unit_number, leaseholder_name, leaseholder_email, building_name')
        .limit(5);
      
      results.tables.vw_units_leaseholders = {
        count: viewData?.length || 0,
        data: viewData || [],
        error: viewError?.message || null
      };
    } catch (err) {
      results.tables.vw_units_leaseholders = { error: 'Exception: ' + err };
    }

    // Test specific Ashwood House query
    try {
      const { data: ashwoodUnits, error: ashwoodError } = await supabase
        .from('vw_units_leaseholders')
        .select('unit_number, leaseholder_name, leaseholder_email, leaseholder_phone, building_name')
        .ilike('building_name', '%ashwood%');
      
      results.ashwood_specific = {
        count: ashwoodUnits?.length || 0,
        data: ashwoodUnits || [],
        error: ashwoodError?.message || null
      };
    } catch (err) {
      results.ashwood_specific = { error: 'Exception: ' + err };
    }

    console.log("📊 DATABASE DEBUG RESULTS:", results);

    return NextResponse.json({
      success: true,
      message: "Database debug complete",
      results
    });

  } catch (error: any) {
    console.error('Database debug error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to debug database',
      details: error.message
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // Allow POST as well for easier testing
  return GET();
}