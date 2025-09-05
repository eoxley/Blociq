import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    // Create authenticated Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get() { return undefined },
        },
      }
    );

    // Validate token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid authentication token' 
      }, { status: 401 });
    }

    // Create user-scoped Supabase client
    const userSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get() { return undefined },
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Test database access
    const tests = [];
    
    // Test 1: Get user buildings
    try {
      const { data: buildings, error: buildingsError } = await userSupabase
        .from('buildings')
        .select('id, name, total_units')
        .limit(3);
      
      tests.push({
        test: 'buildings_query',
        success: !buildingsError,
        error: buildingsError?.message,
        count: buildings?.length || 0,
        sample: buildings?.[0] || null
      });
    } catch (error) {
      tests.push({
        test: 'buildings_query',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 2: Get units/leaseholders view
    try {
      const { data: units, error: unitsError } = await userSupabase
        .from('vw_units_leaseholders')
        .select('unit_number, building_name, leaseholder_name')
        .limit(3);
      
      tests.push({
        test: 'units_leaseholders_query',
        success: !unitsError,
        error: unitsError?.message,
        count: units?.length || 0,
        sample: units?.[0] || null
      });
    } catch (error) {
      tests.push({
        test: 'units_leaseholders_query',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 3: Get recent documents
    try {
      const { data: documents, error: documentsError } = await userSupabase
        .from('documents')
        .select('id, filename, created_at')
        .order('created_at', { ascending: false })
        .limit(3);
      
      tests.push({
        test: 'documents_query',
        success: !documentsError,
        error: documentsError?.message,
        count: documents?.length || 0,
        sample: documents?.[0] || null
      });
    } catch (error) {
      tests.push({
        test: 'documents_query',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Database connectivity test completed',
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email
      },
      tests: tests,
      summary: {
        total_tests: tests.length,
        passed: tests.filter(t => t.success).length,
        failed: tests.filter(t => !t.success).length
      }
    });

  } catch (error: any) {
    console.error('Database test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Database test failed',
      details: error.message
    }, { status: 500 });
  }
}