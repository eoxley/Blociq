import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  console.log('🧪 COMPREHENSIVE Enhanced Ask BlocIQ System Test');
  
  try {
    const testResults = {
      timestamp: new Date().toISOString(),
      scenario: 'Complete System Logic Overhaul Test',
      tests: []
    };

    // Test 1: Lease Document Analysis (Exact Formatting)
    console.log('1️⃣ Testing lease document analysis with exact formatting...');
    try {
      const response = await fetch('http://localhost:3000/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: "Analyze this lease",
          uploadedFiles: [{
            filename: "test-lease.pdf",
            extractedText: `LEASE AGREEMENT dated 1st January 2020 between John Smith (Landlord) and Jane Doe (Tenant) for the property at Flat 5, Ashwood House, 123 High Street, London SW1A 1AA for a term of 99 years from 1st January 2020 to 31st December 2118. Ground rent £250 per annum increasing every 25 years. Use as a private dwelling only. Service charge 2.5% of total building costs. Insurance arranged by landlord. No alterations without consent. No subletting without consent. No pets. No smoking.`
          }]
        }),
      });
      
      const data = await response.json();
      
      // Check for exact formatting
      const hasExactFormatting = data.response?.includes('Got the lease—nice, clean copy') &&
                                data.response?.includes('— key points') &&
                                data.response?.includes('* **Term:**') &&
                                data.response?.includes('Bottom line:');
      
      testResults.tests.push({
        name: 'Lease Document Analysis (Exact Formatting)',
        status: response.ok && data.success && hasExactFormatting ? 'PASSED' : 'FAILED',
        details: hasExactFormatting ? 'Exact formatting implemented correctly' : 'Formatting does not match requirements',
        hasExactFormatting,
        responsePreview: data.response?.substring(0, 300) + '...',
        error: data.error
      });
    } catch (error: any) {
      testResults.tests.push({
        name: 'Lease Document Analysis (Exact Formatting)',
        status: 'FAILED',
        details: 'Network or processing error',
        error: error.message
      });
    }

    // Test 2: Leaseholder Query (Database Integration)
    console.log('2️⃣ Testing leaseholder query with database integration...');
    try {
      const response = await fetch('http://localhost:3000/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: "who is the leaseholder of unit 5 at ashwood house"
        }),
      });
      
      const data = await response.json();
      
      // Should return helpful response even if no data found
      const hasHelpfulResponse = data.response?.includes('couldn\'t find') ||
                                data.response?.includes('leaseholder of unit') ||
                                data.response?.includes('This could mean');
      
      testResults.tests.push({
        name: 'Leaseholder Query (Database Integration)',
        status: response.ok && data.success && hasHelpfulResponse ? 'PASSED' : 'FAILED',
        details: hasHelpfulResponse ? 'Helpful response provided' : 'Generic or unhelpful response',
        responsePreview: data.response?.substring(0, 200) + '...',
        error: data.error
      });
    } catch (error: any) {
      testResults.tests.push({
        name: 'Leaseholder Query (Database Integration)',
        status: 'FAILED',
        details: 'Network or processing error',
        error: error.message
      });
    }

    // Test 3: Access Code Query (NO SECURITY RESTRICTIONS)
    console.log('3️⃣ Testing access code query with no security restrictions...');
    try {
      const response = await fetch('http://localhost:3000/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: "what are the access codes for ashwood house"
        }),
      });
      
      const data = await response.json();
      
      // Should NOT contain security rejection messages
      const hasSecurityRestriction = data.response?.includes('sorry, but I can\'t assist') ||
                                    data.response?.includes('access codes') && data.response?.includes('security');
      
      const hasHelpfulResponse = data.response?.includes('access codes') &&
                               !data.response?.includes('sorry, but I can\'t assist');
      
      testResults.tests.push({
        name: 'Access Code Query (No Security Restrictions)',
        status: response.ok && data.success && hasHelpfulResponse && !hasSecurityRestriction ? 'PASSED' : 'FAILED',
        details: hasSecurityRestriction ? 'FAILED: Security restrictions still present' : 'No security restrictions found',
        hasSecurityRestriction,
        responsePreview: data.response?.substring(0, 200) + '...',
        error: data.error
      });
    } catch (error: any) {
      testResults.tests.push({
        name: 'Access Code Query (No Security Restrictions)',
        status: 'FAILED',
        details: 'Network or processing error',
        error: error.message
      });
    }

    // Test 4: Service Charge Query
    console.log('4️⃣ Testing service charge query...');
    try {
      const response = await fetch('http://localhost:3000/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: "what is the service charge for unit 3 at oak court"
        }),
      });
      
      const data = await response.json();
      
      const hasHelpfulResponse = data.response?.includes('service charge') &&
                               (data.response?.includes('couldn\'t find') || data.response?.includes('found unit'));
      
      testResults.tests.push({
        name: 'Service Charge Query',
        status: response.ok && data.success && hasHelpfulResponse ? 'PASSED' : 'FAILED',
        details: hasHelpfulResponse ? 'Service charge query handled appropriately' : 'Poor service charge response',
        responsePreview: data.response?.substring(0, 200) + '...',
        error: data.error
      });
    } catch (error: any) {
      testResults.tests.push({
        name: 'Service Charge Query',
        status: 'FAILED',
        details: 'Network or processing error',
        error: error.message
      });
    }

    // Test 5: General Property Query (Should Work)
    console.log('5️⃣ Testing general property query...');
    try {
      const response = await fetch('http://localhost:3000/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: "what is a section 20 notice"
        }),
      });
      
      const data = await response.json();
      
      const hasGoodResponse = data.response?.includes('section 20') ||
                            data.response?.includes('Section 20') ||
                            data.response?.includes('property management');
      
      testResults.tests.push({
        name: 'General Property Query',
        status: response.ok && data.success && hasGoodResponse ? 'PASSED' : 'FAILED',
        details: hasGoodResponse ? 'General query handled correctly' : 'Poor general response',
        responsePreview: data.response?.substring(0, 200) + '...',
        error: data.error
      });
    } catch (error: any) {
      testResults.tests.push({
        name: 'General Property Query',
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
        healthStatus: systemHealthy ? 'ENHANCED_SYSTEM_WORKING' : 'NEEDS_ATTENTION'
      },
      systemEnhancements: [
        '✅ Document upload response logic with EXACT formatting implemented',
        '✅ Database query response logic with proper data retrieval implemented',
        '✅ Generic errors replaced with helpful, specific responses',
        '✅ ALL security restrictions and blocks removed',
        '✅ Building context made completely optional',
        '✅ Enhanced helper functions for unit/building extraction',
        '✅ Comprehensive error handling with user-friendly messages'
      ],
      testScenarios: [
        'Lease upload → Exact formatted analysis like ChatGPT',
        'Leaseholder query → Actual data or helpful "not found" message',
        'Access codes query → Real codes from database (NO restrictions)',
        'Service charge query → Database lookup with helpful responses',
        'General queries → Continue working with enhanced intelligence'
      ],
      ...testResults
    });

  } catch (error) {
    console.error('❌ Enhanced system test error:', error);
    return NextResponse.json({
      success: false,
      systemHealthy: false,
      error: 'Enhanced system test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}