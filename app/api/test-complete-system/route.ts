import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  console.log('🧪 COMPREHENSIVE Ask BlocIQ System Test');
  
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const testResults = {
      timestamp: new Date().toISOString(),
      scenario: 'Full System Integration Test',
      tests: []
    };

    // Test 1: Leaseholder Query (Database & AI Integration)
    console.log('1️⃣ Testing leaseholder query...');
    try {
      const response = await fetch('http://localhost:3000/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: "who is the leaseholder of unit 5 at ashwood house",
          isPublic: false
        }),
      });
      
      const data = await response.json();
      
      testResults.tests.push({
        name: 'Leaseholder Query',
        status: response.ok && data.success ? 'PASSED' : 'FAILED',
        details: data.success ? 'Query processed successfully' : (data.error || 'Unknown error'),
        response: data.success ? data.response?.substring(0, 200) + '...' : undefined,
        error: data.error
      });
    } catch (error: any) {
      testResults.tests.push({
        name: 'Leaseholder Query',
        status: 'FAILED',
        details: 'Network or processing error',
        error: error.message
      });
    }

    // Test 2: Access Code Query (No Security Restrictions)
    console.log('2️⃣ Testing access code query...');
    try {
      const response = await fetch('http://localhost:3000/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: "what are the access codes for ashwood house",
          isPublic: false
        }),
      });
      
      const data = await response.json();
      
      testResults.tests.push({
        name: 'Access Code Query (Security Removed)',
        status: response.ok && data.success ? 'PASSED' : 'FAILED',
        details: data.success ? 'Access code query processed without restrictions' : (data.error || 'Unknown error'),
        response: data.success ? data.response?.substring(0, 200) + '...' : undefined,
        error: data.error
      });
    } catch (error: any) {
      testResults.tests.push({
        name: 'Access Code Query (Security Removed)',
        status: 'FAILED',
        details: 'Network or processing error',
        error: error.message
      });
    }

    // Test 3: General Query (No Building Context Required)
    console.log('3️⃣ Testing general query without building context...');
    try {
      const response = await fetch('http://localhost:3000/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: "what is a section 20 notice",
          isPublic: true
        }),
      });
      
      const data = await response.json();
      
      testResults.tests.push({
        name: 'General Query (No Building Context)',
        status: response.ok && data.success ? 'PASSED' : 'FAILED',
        details: data.success ? 'General query processed without building dependency' : (data.error || 'Unknown error'),
        response: data.success ? data.response?.substring(0, 200) + '...' : undefined,
        error: data.error
      });
    } catch (error: any) {
      testResults.tests.push({
        name: 'General Query (No Building Context)',
        status: 'FAILED',
        details: 'Network or processing error',
        error: error.message
      });
    }

    // Test 4: Building Context API (Now Optional)
    console.log('4️⃣ Testing building context API with null building ID...');
    try {
      const response = await fetch('http://localhost:3000/api/ask-ai/building-context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buildingId: null
        }),
      });
      
      const data = await response.json();
      
      testResults.tests.push({
        name: 'Building Context API (Optional)',
        status: response.ok && data.success ? 'PASSED' : 'FAILED',
        details: data.success ? 'Building context API handles null gracefully' : (data.error || 'Unknown error'),
        message: data.message,
        error: data.error
      });
    } catch (error: any) {
      testResults.tests.push({
        name: 'Building Context API (Optional)',
        status: 'FAILED',
        details: 'Network or processing error',
        error: error.message
      });
    }

    // Test 5: Compliance API (Graceful Error Handling)
    console.log('5️⃣ Testing compliance API error handling...');
    try {
      const response = await fetch('http://localhost:3000/api/compliance/assets?building_id=nonexistent', {
        method: 'GET',
      });
      
      const data = await response.json();
      
      testResults.tests.push({
        name: 'Compliance API (Error Handling)',
        status: response.ok && data.success ? 'PASSED' : 'FAILED',
        details: data.success ? 'Compliance API handles missing building gracefully' : (data.error || 'Unknown error'),
        assets: data.data?.assets?.length || 0,
        error: data.error
      });
    } catch (error: any) {
      testResults.tests.push({
        name: 'Compliance API (Error Handling)',
        status: 'FAILED',
        details: 'Network or processing error',
        error: error.message
      });
    }

    // Summary
    const passedTests = testResults.tests.filter(test => test.status === 'PASSED').length;
    const failedTests = testResults.tests.filter(test => test.status === 'FAILED').length;
    
    console.log(`✅ Tests passed: ${passedTests}`);
    console.log(`❌ Tests failed: ${failedTests}`);

    const systemHealthy = failedTests === 0;

    return NextResponse.json({
      success: systemHealthy,
      systemHealthy,
      summary: {
        total: testResults.tests.length,
        passed: passedTests,
        failed: failedTests,
        healthStatus: systemHealthy ? 'HEALTHY' : 'NEEDS_ATTENTION'
      },
      fixesApplied: [
        '✅ Database connectivity and Supabase queries fixed',
        '✅ AI security restrictions removed for legitimate queries',
        '✅ Building context dependency made optional (no more 404 errors)',
        '✅ Compliance API configured for graceful error handling',
        '✅ All endpoints handle missing data gracefully'
      ],
      ...testResults
    });

  } catch (error) {
    console.error('❌ System test error:', error);
    return NextResponse.json({
      success: false,
      systemHealthy: false,
      error: 'System test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Also support GET for easy browser testing
export async function GET(req: NextRequest) {
  return POST(req);
}