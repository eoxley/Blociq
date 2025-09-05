#!/usr/bin/env node

/**
 * Test Alternative Authentication Methods
 * Validates different Google Cloud authentication approaches without private keys
 */

import { tryAlternativeAuth, listProcessorsWithAPIKey, createProcessorWithAPIKey } from './lib/google-auth-alternatives.js';

async function testAuthMethods() {
  console.log('🧪 Testing Alternative Authentication Methods');
  console.log('===========================================\n');

  // Test 1: Try alternative authentication
  console.log('📋 Test 1: Alternative Authentication');
  try {
    const authResult = await tryAlternativeAuth();
    
    if (authResult.success) {
      console.log(`✅ Authentication successful using: ${authResult.method}`);
    } else {
      console.log(`❌ Authentication failed: ${authResult.error}`);
      return;
    }
  } catch (error) {
    console.log(`❌ Authentication test failed: ${error.message}`);
    return;
  }

  // Test 2: List existing processors
  console.log('\n📋 Test 2: List Existing Processors');
  try {
    const processors = await listProcessorsWithAPIKey();
    console.log(`Found ${processors.length} existing processors:`);
    
    processors.forEach((processor, index) => {
      const processorId = processor.name ? processor.name.split('/').pop() : 'unknown';
      console.log(`  ${index + 1}. ${processor.displayName || 'Unnamed'} (ID: ${processorId})`);
      console.log(`     Type: ${processor.type || 'Unknown'}`);
      console.log(`     State: ${processor.state || 'Unknown'}`);
    });

    // Check if BlocIQ processor already exists
    const existingBlociqProcessor = processors.find(
      (p) => p.displayName && (p.displayName.includes('Lease') || p.displayName.includes('BlocIQ'))
    );

    if (existingBlociqProcessor) {
      const processorId = existingBlociqProcessor.name.split('/').pop();
      console.log(`\n🎯 Found existing BlocIQ processor: ${processorId}`);
      console.log(`   Add this to your Vercel environment: DOCUMENT_AI_PROCESSOR_ID=${processorId}`);
      return;
    }

  } catch (error) {
    console.log(`❌ Failed to list processors: ${error.message}`);
  }

  // Test 3: Create processor (only if none exists)
  console.log('\n📋 Test 3: Create New Processor');
  try {
    console.log('⚠️  No BlocIQ processor found. Creating new one...');
    const result = await createProcessorWithAPIKey('BlocIQ Test Lease Processor');
    
    console.log('✅ Processor created successfully!');
    console.log(`   Processor ID: ${result.processorId}`);
    console.log(`   Display Name: ${result.displayName}`);
    console.log(`   Type: ${result.type}`);
    console.log(`   State: ${result.state}`);
    console.log(`\n🔑 Add this to your Vercel environment variables:`);
    console.log(`   DOCUMENT_AI_PROCESSOR_ID=${result.processorId}`);

  } catch (error) {
    console.log(`❌ Failed to create processor: ${error.message}`);
    console.log('\n💡 Manual creation required - see MANUAL_DOCUMENT_AI_SETUP.md');
  }
}

// Environment check
function checkEnvironment() {
  console.log('🔍 Environment Check:');
  
  const requiredVars = [
    'GOOGLE_CLOUD_PROJECT_ID',
    'DOCUMENT_AI_LOCATION'
  ];

  const optionalVars = [
    'GOOGLE_CLOUD_API_KEY',
    'GOOGLE_VISION_API_KEY',
    'GOOGLE_CLOUD_ACCESS_TOKEN',
    'GOOGLE_APPLICATION_CREDENTIALS_JSON'
  ];

  console.log('\n📋 Required Variables:');
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    console.log(`   ${varName}: ${value ? '✅ Set' : '❌ Missing'}`);
  });

  console.log('\n📋 Authentication Variables (at least one needed):');
  let hasAuth = false;
  optionalVars.forEach(varName => {
    const value = process.env[varName];
    const status = value ? '✅ Set' : '⚪ Not set';
    console.log(`   ${varName}: ${status}`);
    if (value) hasAuth = true;
  });

  if (!hasAuth) {
    console.log('\n❌ No authentication method available!');
    console.log('   Please set one of: GOOGLE_CLOUD_API_KEY, GOOGLE_CLOUD_ACCESS_TOKEN, or GOOGLE_APPLICATION_CREDENTIALS_JSON');
    return false;
  }

  return true;
}

// Main execution
async function main() {
  if (!checkEnvironment()) {
    console.log('\n💡 See MANUAL_DOCUMENT_AI_SETUP.md for setup instructions');
    process.exit(1);
  }

  console.log('\n');
  await testAuthMethods();
  
  console.log('\n✅ Authentication testing complete!');
  console.log('\n💡 Next steps:');
  console.log('   1. Add DOCUMENT_AI_PROCESSOR_ID to Vercel environment variables');
  console.log('   2. Redeploy your application');
  console.log('   3. Test OCR functionality');
}

main().catch(error => {
  console.error('\n💥 Test failed:', error.message);
  process.exit(1);
});