#!/usr/bin/env node

/**
 * Test Runner for Google Vision vs Blociq Lease Analysis
 * 
 * Usage:
 * node run-lease-analysis-test.js /path/to/lease-document.pdf
 * 
 * This script will:
 * 1. Run the full Google Vision test suite
 * 2. Compare results against Blociq's known errors
 * 3. Generate a comprehensive accuracy report
 */

const LeaseAnalysisTest = require('./google-vision-lease-test');
const path = require('path');
const fs = require('fs');

async function main() {
  // Get document path from command line arguments
  const documentPath = process.argv[2];
  
  if (!documentPath) {
    console.error('❌ Error: Please provide a document path');
    console.error('Usage: node run-lease-analysis-test.js /path/to/lease-document.pdf');
    process.exit(1);
  }
  
  // Check if file exists
  if (!fs.existsSync(documentPath)) {
    console.error(`❌ Error: Document not found at ${documentPath}`);
    process.exit(1);
  }
  
  console.log(`🚀 Starting lease analysis test for: ${path.basename(documentPath)}`);
  console.log(`📁 Document path: ${documentPath}\n`);
  
  // Initialize and run tests
  const tester = new LeaseAnalysisTest();
  
  try {
    await tester.runFullTestSuite(documentPath);
    
    console.log('\n✅ All tests completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('1. Review the extraction accuracy scores');
    console.log('2. Compare against Blociq\'s 10% baseline');
    console.log('3. Identify areas for integration into your platform');
    console.log('4. Consider implementing Google Vision as primary OCR engine');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    
    if (error.code === 'GOOGLE_APPLICATION_CREDENTIALS') {
      console.error('\n🔧 Fix: Set up Google Cloud credentials:');
      console.error('export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"');
    }
    
    if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('@google-cloud/vision')) {
      console.error('\n🔧 Fix: Install Google Vision dependency:');
      console.error('npm install @google-cloud/vision');
    }
    
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⚠️ Test interrupted by user');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌ Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the main function
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});