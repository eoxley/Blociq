#!/usr/bin/env node

/**
 * Test script to check OCR method availability
 */

async function testOCRMethods() {
  console.log('🧪 Testing OCR method availability...\n');
  
  // Check environment variables
  console.log('🔧 Environment Variables:');
  console.log('  OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Not set');
  console.log('  GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS ? '✅ Set' : '❌ Not set');
  console.log('  RENDER_OCR_URL:', process.env.RENDER_OCR_URL ? '✅ Set' : '❌ Not set');
  console.log('  RENDER_OCR_TOKEN:', process.env.RENDER_OCR_TOKEN ? '✅ Set' : '❌ Not set');
  console.log('  USE_DOCUMENT_AI:', process.env.USE_DOCUMENT_AI || 'Not set');
  console.log('  DOCUMENT_AI_PROCESSOR_ID:', process.env.DOCUMENT_AI_PROCESSOR_ID ? '✅ Set' : '❌ Not set');
  
  // Test PDF.js availability
  console.log('\n📄 Testing PDF.js availability...');
  try {
    const pdfjs = await import('pdfjs-dist');
    console.log('  PDF.js version:', pdfjs.version);
    console.log('  ✅ PDF.js is available');
  } catch (error) {
    console.log('  ❌ PDF.js not available:', error.message);
  }
  
  // Test Tesseract availability
  console.log('\n🔍 Testing Tesseract availability...');
  try {
    const { createWorker } = await import('tesseract.js');
    console.log('  ✅ Tesseract.js is available');
  } catch (error) {
    console.log('  ❌ Tesseract.js not available:', error.message);
  }
  
  // Test OpenAI API
  console.log('\n🤖 Testing OpenAI API...');
  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      });
      if (response.ok) {
        console.log('  ✅ OpenAI API is accessible');
      } else {
        console.log('  ❌ OpenAI API error:', response.status);
      }
    } catch (error) {
      console.log('  ❌ OpenAI API error:', error.message);
    }
  } else {
    console.log('  ⚠️ OpenAI API key not configured');
  }
  
  // Test Render OCR service
  console.log('\n🔧 Testing Render OCR service...');
  if (process.env.RENDER_OCR_URL && process.env.RENDER_OCR_TOKEN) {
    try {
      const response = await fetch(process.env.RENDER_OCR_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RENDER_OCR_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          test: true
        })
      });
      console.log('  Render OCR status:', response.status);
      if (response.ok) {
        console.log('  ✅ Render OCR service is accessible');
      } else {
        console.log('  ❌ Render OCR service error:', response.status);
      }
    } catch (error) {
      console.log('  ❌ Render OCR service error:', error.message);
    }
  } else {
    console.log('  ⚠️ Render OCR service not configured');
  }
  
  console.log('\n✅ OCR method test completed');
}

// Run the test
testOCRMethods().catch(console.error);
