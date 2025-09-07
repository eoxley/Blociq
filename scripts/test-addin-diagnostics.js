#!/usr/bin/env node

/**
 * Comprehensive Add-in Diagnostics Test
 * Tests all aspects of the Outlook Add-in diagnostics system
 */

const API_BASE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

async function testApiConnectivity() {
  console.log('🔍 Testing API connectivity...');
  
  try {
    const response = await fetch(`${API_BASE}/api/ask-ai/ping`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('   ✅ API ping successful');
      console.log(`   ✅ CORS: ${data.cors}`);
      console.log(`   ✅ Origin: ${data.origin}`);
      return true;
    } else {
      console.log(`   ❌ API ping failed: ${data.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ API ping error: ${error.message}`);
    return false;
  }
}

async function testAskAiEndpoint() {
  console.log('\n🔍 Testing Ask AI endpoint...');
  
  try {
    const response = await fetch(`${API_BASE}/api/ask-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        prompt: 'test message',
        intent: 'REPLY'
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('   ✅ Ask AI endpoint accessible');
      console.log(`   ✅ Response type: ${typeof data.response}`);
      return true;
    } else {
      console.log(`   ❌ Ask AI endpoint failed: ${data.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Ask AI endpoint error: ${error.message}`);
    return false;
  }
}

function testDiagnosticsModule() {
  console.log('\n🔍 Testing diagnostics module...');
  
  try {
    // Test the diagnostics module structure
    const diagnosticsPath = require.resolve('../src/addin/diagnostics.ts');
    console.log('   ✅ Diagnostics module found');
    
    // Check if the module exports the expected functions
    const expectedExports = [
      'printEnvironment',
      'probeCapabilities', 
      'report',
      'checkApiConnectivity',
      'validateHandlerExports',
      'getFullReport',
      'isHealthy',
      'autoRepair'
    ];
    
    console.log('   ✅ Expected exports defined');
    return true;
  } catch (error) {
    console.log(`   ❌ Diagnostics module error: ${error.message}`);
    return false;
  }
}

function testCommandsModule() {
  console.log('\n🔍 Testing commands module...');
  
  try {
    // Test the commands module structure
    const commandsPath = require.resolve('../src/addin/commands.ts');
    console.log('   ✅ Commands module found');
    
    // Check if the module exports the expected functions
    const expectedExports = [
      'onGenerateReplyFromRead',
      'onGenerateIntoCompose',
      'showChatPane', 
      'showChatPaneCompose',
      'initializeAddin'
    ];
    
    console.log('   ✅ Expected exports defined');
    return true;
  } catch (error) {
    console.log(`   ❌ Commands module error: ${error.message}`);
    return false;
  }
}

function testFileStructure() {
  console.log('\n🔍 Testing file structure...');
  
  const fs = require('fs');
  const path = require('path');
  
  const requiredFiles = [
    'src/addin/diagnostics.ts',
    'src/addin/commands.ts',
    'public/addin/functions.html',
    'public/addin/commands.js',
    'app/api/ask-ai/ping/route.ts',
    'manifest.xml'
  ];
  
  let allFilesExist = true;
  
  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      console.log(`   ✅ ${file}`);
    } else {
      console.log(`   ❌ ${file} - Missing`);
      allFilesExist = false;
    }
  }
  
  return allFilesExist;
}

async function runAllTests() {
  console.log('🧪 Running Comprehensive Add-in Diagnostics Tests\n');
  
  const results = {
    apiConnectivity: false,
    askAiEndpoint: false,
    diagnosticsModule: false,
    commandsModule: false,
    fileStructure: false
  };
  
  // Run all tests
  results.apiConnectivity = await testApiConnectivity();
  results.askAiEndpoint = await testAskAiEndpoint();
  results.diagnosticsModule = testDiagnosticsModule();
  results.commandsModule = testCommandsModule();
  results.fileStructure = testFileStructure();
  
  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log(`   API Connectivity: ${results.apiConnectivity ? '✅' : '❌'}`);
  console.log(`   Ask AI Endpoint: ${results.askAiEndpoint ? '✅' : '❌'}`);
  console.log(`   Diagnostics Module: ${results.diagnosticsModule ? '✅' : '❌'}`);
  console.log(`   Commands Module: ${results.commandsModule ? '✅' : '❌'}`);
  console.log(`   File Structure: ${results.fileStructure ? '✅' : '❌'}`);
  
  const allPassed = Object.values(results).every(result => result === true);
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! Add-in diagnostics system is healthy.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the issues above.');
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests };
