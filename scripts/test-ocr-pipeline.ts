#!/usr/bin/env ts-node

/**
 * Comprehensive OCR Pipeline Test Script
 * 
 * Tests the fixed OCR pipeline with:
 * - Client-side bytes handoff 
 * - DocAI EU endpoint (when enabled)
 * - Reliable buffer validation
 * - Rasterize-on-empty fallback for image PDFs
 * - Full fallback chain: DocAI → PDF.js → OpenAI → Google Vision → Tesseract
 * 
 * Usage:
 * 1. Place test files in /fixtures/ directory
 * 2. Set environment variables in .env.local
 * 3. Run: npm run dev (in another terminal)
 * 4. Run: npx ts-node scripts/test-ocr-pipeline.ts
 */

import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';

async function testOCRPipeline() {
  console.log('🧪 Testing Complete OCR Pipeline...\n');

  // Environment diagnostics
  console.log('📋 Environment Check:');
  const envVars = [
    'USE_DOCUMENT_AI',
    'DOCUMENT_AI_PROCESSOR_ID',
    'DOCUMENT_AI_LOCATION', 
    'GOOGLE_CLOUD_PROJECT_ID',
    'GOOGLE_APPLICATION_CREDENTIALS_JSON',
    'OPENAI_API_KEY',
    'GOOGLE_VISION_API_KEY'
  ];

  for (const env of envVars) {
    const value = process.env[env];
    const status = value ? '✅ Set' : '❌ Missing';
    console.log(`  ${env}: ${status}`);
    
    if (env === 'DOCUMENT_AI_PROCESSOR_ID' && value) {
      console.log(`    → ${value.substring(0, 50)}...`);
    }
  }

  const docaiEnabled = process.env.USE_DOCUMENT_AI === 'true';
  const hasDocAIConfig = !!(process.env.DOCUMENT_AI_PROCESSOR_ID && process.env.DOCUMENT_AI_LOCATION);
  console.log(`\n🤖 DocAI Status: ${docaiEnabled ? 'Enabled' : 'Disabled'} | Config: ${hasDocAIConfig ? 'Present' : 'Missing'}`);

  console.log('\n---\n');

  // Test file discovery
  const fixturesDir = path.join(process.cwd(), 'fixtures');
  const testFiles = [];

  if (fs.existsSync(fixturesDir)) {
    const files = fs.readdirSync(fixturesDir)
      .filter(f => f.endsWith('.pdf') || f.endsWith('.png') || f.endsWith('.jpg'))
      .slice(0, 3); // Limit to 3 test files

    for (const file of files) {
      const filePath = path.join(fixturesDir, file);
      const stats = fs.statSync(filePath);
      testFiles.push({
        name: file,
        path: filePath,
        size: stats.size,
        sizeMB: (stats.size / (1024 * 1024)).toFixed(2)
      });
    }
  }

  if (testFiles.length === 0) {
    console.log('📁 No test files found in fixtures/ directory');
    console.log('   Create fixtures/ and add PDF, PNG, or JPG files to test OCR processing');
    return;
  }

  console.log(`📄 Found ${testFiles.length} test file(s):`);
  testFiles.forEach(file => {
    console.log(`  - ${file.name} (${file.sizeMB} MB)`);
  });

  console.log('\n---\n');

  // Test each file through the OCR pipeline
  for (const testFile of testFiles) {
    console.log(`\n🔬 Testing: ${testFile.name} (${testFile.sizeMB} MB)`);
    console.log('─'.repeat(50));

    try {
      // Test 1: Direct extractText function  
      console.log('\n📝 Test 1: Direct extractText() call');
      const fileBuffer = fs.readFileSync(testFile.path);
      const mimeType = testFile.name.endsWith('.pdf') ? 'application/pdf' :
                      testFile.name.endsWith('.png') ? 'image/png' : 'image/jpeg';
      
      const file = new File([fileBuffer], testFile.name, { type: mimeType });

      const { extractText } = await import('../lib/extract-text');
      const startTime = Date.now();
      const result = await extractText(file);
      const duration = Date.now() - startTime;

      console.log(`   Result: ${result.source} (${duration}ms)`);
      console.log(`   Text length: ${result.textLength} characters`);
      console.log(`   Success: ${result.source !== 'failed' ? '✅' : '❌'}`);
      
      if (result.textLength > 0) {
        const preview = result.extractedText.substring(0, 150).replace(/\s+/g, ' ');
        console.log(`   Preview: "${preview}..."`);
      }

      if (result.source === 'failed') {
        console.log(`   Error: ${result.metadata?.errorDetails || 'Unknown error'}`);
      }

      // Test 2: API endpoint with bytes handoff simulation
      console.log('\n🌐 Test 2: API endpoint (/api/ask-ai/upload)');
      
      const formData = new FormData();
      formData.append('file', fileBuffer, {
        filename: testFile.name,
        contentType: mimeType
      });

      const apiStartTime = Date.now();
      const response = await fetch('http://localhost:3000/api/ask-ai/upload', {
        method: 'POST',
        body: formData
      });

      const apiDuration = Date.now() - apiStartTime;

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`   ❌ API Error (${response.status}): ${errorText.substring(0, 200)}...`);
      } else {
        const apiResult = await response.json();
        
        console.log(`   ✅ API Success (${apiDuration}ms)`);
        console.log(`   Source: ${apiResult.ocrSource || 'unknown'}`);
        console.log(`   Text length: ${apiResult.textLength || 0} characters`);
        console.log(`   API Success: ${apiResult.success ? '✅' : '❌'}`);

        if (apiResult.success && apiResult.textLength > 0) {
          const apiPreview = (apiResult.extractedText || '').substring(0, 150).replace(/\s+/g, ' ');
          console.log(`   Preview: "${apiPreview}..."`);
        }
      }

      // Test 3: Diagnostic endpoint
      console.log('\n🔍 Test 3: Diagnostic endpoint (/api/diagnose-ocr)');
      
      const diagFormData = new FormData();
      diagFormData.append('file', fileBuffer, {
        filename: testFile.name,
        contentType: mimeType
      });

      const diagResponse = await fetch('http://localhost:3000/api/diagnose-ocr', {
        method: 'POST',
        body: diagFormData
      });

      if (!diagResponse.ok) {
        const diagError = await diagResponse.text();
        console.log(`   ❌ Diagnostic Error (${diagResponse.status}): ${diagError.substring(0, 200)}...`);
      } else {
        const diagResult = await diagResponse.json();
        
        console.log(`   ✅ Diagnostic Success`);
        console.log(`   Source: ${diagResult.source || 'unknown'}`);
        console.log(`   Text length: ${diagResult.textLength || 0} characters`);
        console.log(`   Has pages: ${diagResult.hasPages ? '✅' : '❌'}`);
        
        if (diagResult.pageCount) {
          console.log(`   Page count: ${diagResult.pageCount}`);
        }
      }

    } catch (testError) {
      console.error(`   ❌ Test failed for ${testFile.name}:`, testError);
    }

    console.log('\n' + '─'.repeat(50));
  }

  // Summary
  console.log('\n📊 OCR Pipeline Test Summary:');
  console.log(`   Files tested: ${testFiles.length}`);
  console.log(`   DocAI enabled: ${docaiEnabled ? '✅' : '❌'}`);
  console.log(`   DocAI configured: ${hasDocAIConfig ? '✅' : '❌'}`);
  
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasGoogleVision = !!(process.env.GOOGLE_VISION_API_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  
  console.log(`   OpenAI Vision: ${hasOpenAI ? '✅' : '❌'}`);
  console.log(`   Google Vision: ${hasGoogleVision ? '✅' : '❌'}`);
  
  console.log('\n🚀 Pipeline Status:');
  if (docaiEnabled && hasDocAIConfig) {
    console.log('   ✅ DocAI (EU) ready as primary OCR method');
  }
  if (hasOpenAI || hasGoogleVision) {
    console.log('   ✅ Fallback OCR methods available');
  }
  
  console.log('\n📋 Next Steps:');
  console.log('   1. Verify OCR results match expectations');
  console.log('   2. Test with production documents');
  console.log('   3. Monitor processing times and accuracy');
  console.log('   4. Deploy with confidence! 🎉');
}

// Handle both direct execution and module import
if (require.main === module) {
  testOCRPipeline().catch(console.error);
}

export { testOCRPipeline };