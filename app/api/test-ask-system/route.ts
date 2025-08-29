import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  console.log('🧪 Testing Ask BlocIQ System Components');
  
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const testResults = {
      timestamp: new Date().toISOString(),
      tests: []
    };

    // Test 1: Database Connection
    console.log('1️⃣ Testing database connection...');
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('id, name')
        .limit(1);
      
      testResults.tests.push({
        name: 'Database Connection',
        status: error ? 'FAILED' : 'PASSED',
        details: error ? error.message : `Found ${data?.length || 0} buildings`,
        error: error?.message
      });
    } catch (dbError: any) {
      testResults.tests.push({
        name: 'Database Connection',
        status: 'FAILED',
        details: 'Connection failed',
        error: dbError.message
      });
    }

    // Test 2: View Access
    console.log('2️⃣ Testing vw_units_leaseholders view...');
    try {
      const { data, error } = await supabase
        .from('vw_units_leaseholders')
        .select(`
          unit_id, building_id, unit_number, unit_label,
          leaseholder_id, leaseholder_name, leaseholder_email
        `)
        .limit(5);
      
      testResults.tests.push({
        name: 'vw_units_leaseholders View',
        status: error ? 'FAILED' : 'PASSED',
        details: error ? error.message : `Retrieved ${data?.length || 0} records`,
        error: error?.message,
        sampleData: data?.slice(0, 2)
      });
    } catch (viewError: any) {
      testResults.tests.push({
        name: 'vw_units_leaseholders View',
        status: 'FAILED',
        details: 'View access failed',
        error: viewError.message
      });
    }

    // Test 3: Building Search
    console.log('3️⃣ Testing building search...');
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select(`
          id, name, address, postcode, unit_count,
          building_manager_name, entry_code, access_notes
        `)
        .or('name.ilike.%ashwood%,address.ilike.%ashwood%')
        .limit(3);
      
      testResults.tests.push({
        name: 'Building Search (Ashwood)',
        status: error ? 'FAILED' : 'PASSED',
        details: error ? error.message : `Found ${data?.length || 0} buildings`,
        error: error?.message,
        sampleData: data
      });
    } catch (searchError: any) {
      testResults.tests.push({
        name: 'Building Search (Ashwood)',
        status: 'FAILED',
        details: 'Search failed',
        error: searchError.message
      });
    }

    // Test 4: Leaseholder Query
    console.log('4️⃣ Testing leaseholder query...');
    try {
      const { data: building } = await supabase
        .from('buildings')
        .select('id, name')
        .limit(1)
        .single();
        
      if (building) {
        const { data, error } = await supabase
          .from('vw_units_leaseholders')
          .select('*')
          .eq('building_id', building.id)
          .limit(3);
        
        testResults.tests.push({
          name: 'Leaseholder Query',
          status: error ? 'FAILED' : 'PASSED',
          details: error ? error.message : `Found ${data?.length || 0} units in ${building.name}`,
          error: error?.message,
          sampleData: data?.slice(0, 1)
        });
      } else {
        testResults.tests.push({
          name: 'Leaseholder Query',
          status: 'SKIPPED',
          details: 'No buildings found to test with'
        });
      }
    } catch (leaseholderError: any) {
      testResults.tests.push({
        name: 'Leaseholder Query',
        status: 'FAILED',
        details: 'Leaseholder query failed',
        error: leaseholderError.message
      });
    }

    // Test 5: Environment Variables
    console.log('5️⃣ Testing environment variables...');
    const envTests = [
      { name: 'NEXT_PUBLIC_SUPABASE_URL', value: !!process.env.NEXT_PUBLIC_SUPABASE_URL },
      { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
      { name: 'OPENAI_API_KEY', value: !!process.env.OPENAI_API_KEY },
      { name: 'SUPABASE_SERVICE_ROLE_KEY', value: !!process.env.SUPABASE_SERVICE_ROLE_KEY }
    ];
    
    testResults.tests.push({
      name: 'Environment Variables',
      status: envTests.every(test => test.value) ? 'PASSED' : 'FAILED',
      details: envTests.map(test => `${test.name}: ${test.value ? '✅' : '❌'}`).join(', '),
      envTests
    });

    // Summary
    const passedTests = testResults.tests.filter(test => test.status === 'PASSED').length;
    const failedTests = testResults.tests.filter(test => test.status === 'FAILED').length;
    const skippedTests = testResults.tests.filter(test => test.status === 'SKIPPED').length;
    
    console.log(`✅ Tests passed: ${passedTests}`);
    console.log(`❌ Tests failed: ${failedTests}`);
    console.log(`⏭️ Tests skipped: ${skippedTests}`);

    return NextResponse.json({
      success: failedTests === 0,
      summary: {
        total: testResults.tests.length,
        passed: passedTests,
        failed: failedTests,
        skipped: skippedTests
      },
      ...testResults
    });

  } catch (error) {
    console.error('❌ Test system error:', error);
    return NextResponse.json({
      success: false,
      error: 'Test system failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}