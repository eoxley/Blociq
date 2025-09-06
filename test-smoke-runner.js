#!/usr/bin/env node

/**
 * Simple smoke test runner that doesn't depend on complex build configurations
 */

const { execSync } = require('child_process');
const path = require('path');

async function runSmokeTests() {
  console.log('🧪 Running BlocIQ Smoke Tests...\n');

  // Test 1: Dashboard API Test
  console.log('1️⃣ Testing Dashboard API...');
  try {
    const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
    const response = await fetch(`${siteUrl}/api/inbox/dashboard?timeRange=week`);
    
    if (response.status === 200) {
      const data = await response.json();
      const requiredKeys = [
        'total','unread','handled','urgent',
        'categories','propertyBreakdown','recentActivity','smartSuggestions',
        'urgencyDistribution','topProperties','aiInsightsSummary',
        'needsConnect','outlookConnectionRequired'
      ];
      
      let allKeysPresent = true;
      for (const key of requiredKeys) {
        if (!(key in data)) {
          console.log(`❌ Missing key: ${key}`);
          allKeysPresent = false;
        }
      }
      
      if (allKeysPresent) {
        console.log('✅ Dashboard API test passed - all required keys present');
      } else {
        console.log('❌ Dashboard API test failed - missing required keys');
      }
    } else {
      console.log(`❌ Dashboard API test failed - HTTP ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Dashboard API test failed - ${error.message}`);
  }

  // Test 2: OCR Test (if environment variables are set)
  console.log('\n2️⃣ Testing OCR Service...');
  const ocrBaseUrl = process.env.OCR_BASE_URL;
  const ocrToken = process.env.OCR_AUTH_TOKEN;

  if (!ocrBaseUrl || !ocrToken) {
    console.log('⏭️  OCR test skipped - OCR_BASE_URL or OCR_AUTH_TOKEN not set');
  } else {
    try {
      // Create a simple test PDF using a basic approach
      const testPdf = Buffer.from(`%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Hello BlocIQ Vision OCR 12345) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
297
%%EOF`);

      const formData = new FormData();
      const blob = new Blob([testPdf], { type: 'application/pdf' });
      formData.append('file', blob, 'smoke.pdf');

      const response = await fetch(`${ocrBaseUrl}/upload?engine=vision&returnSample=true`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${ocrToken}` },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && (data.source || data.engine)) {
          console.log('✅ OCR test passed - OCR service working correctly');
          console.log(`  - Source: ${data.source || data.engine}`);
          console.log(`  - Text length: ${data.textLength || 0}`);
        } else {
          console.log('❌ OCR test failed - invalid response format');
        }
      } else {
        console.log(`❌ OCR test failed - HTTP ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ OCR test failed - ${error.message}`);
    }
  }

  // Test 3: Database Test (if environment variables are set)
  console.log('\n3️⃣ Testing Database Text Presence...');
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('⏭️  Database test skipped - SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set');
  } else {
    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
      
      // Check building_documents table
      const { data: buildingDocs, error: buildingError } = await supabase
        .from('building_documents')
        .select('id, extracted_text, text_content')
        .order('created_at', { ascending: false })
        .limit(5);
      
      let foundText = false;
      let textLength = 0;
      
      if (!buildingError && buildingDocs && buildingDocs.length > 0) {
        const docWithText = buildingDocs.find(d => (d.extracted_text?.length || d.text_content?.length || 0) > 0);
        if (docWithText) {
          foundText = true;
          textLength = docWithText.extracted_text?.length || docWithText.text_content?.length || 0;
        }
      }
      
      // If not found in building_documents, try documents table
      if (!foundText) {
        const { data: documents, error: docError } = await supabase
          .from('documents')
          .select('id, extracted_text')
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (!docError && documents && documents.length > 0) {
          const docWithText = documents.find(d => (d.extracted_text?.length || 0) > 0);
          if (docWithText) {
            foundText = true;
            textLength = docWithText.extracted_text?.length || 0;
          }
        }
      }
      
      const strict = (process.env.SMOKE_STRICT ?? 'false') === 'true';
      
      if (foundText) {
        console.log(`✅ Database test passed - found text (${textLength} characters)`);
      } else if (strict) {
        console.log('❌ Database test failed - no extracted text found (strict mode)');
      } else {
        console.log('⚠️  Database test warning - no extracted text found (soft mode)');
      }
    } catch (error) {
      console.log(`❌ Database test failed - ${error.message}`);
    }
  }

  console.log('\n🏁 Smoke tests completed!');
}

// Run the tests
runSmokeTests().catch(console.error);