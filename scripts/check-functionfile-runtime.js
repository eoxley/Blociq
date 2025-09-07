#!/usr/bin/env node

/**
 * Manifest/Runtime Cross-Check Script
 * Validates that the FunctionFile URL is accessible and contains required handlers
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

// Configuration
const MANIFEST_PATH = path.join(__dirname, '..', 'manifest.xml');
const COMMANDS_JS_PATH = path.join(__dirname, '..', 'public', 'addin', 'commands.js');
const FUNCTIONS_HTML_PATH = path.join(__dirname, '..', 'public', 'addin', 'functions.html');

// Required handlers that must be present
const REQUIRED_HANDLERS = [
  'onGenerateReplyFromRead',
  'onGenerateIntoCompose', 
  'showChatPane',
  'showChatPaneCompose'
];

/**
 * Parse XML to extract FunctionFile URL
 */
function extractFunctionFileUrl(manifestPath) {
  try {
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    
    // Look for FunctionFile URL in the manifest
    const functionFileMatch = manifestContent.match(/<bt:Url id="functionFileUrl" DefaultValue="([^"]+)"/);
    
    if (!functionFileMatch) {
      throw new Error('FunctionFile URL not found in manifest');
    }
    
    return functionFileMatch[1];
  } catch (error) {
    throw new Error(`Failed to parse manifest: ${error.message}`);
  }
}

/**
 * Check if a URL is accessible
 */
function checkUrlAccessibility(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const request = client.get(url, (response) => {
      resolve({
        accessible: response.statusCode === 200,
        statusCode: response.statusCode,
        headers: response.headers
      });
    });
    
    request.on('error', (error) => {
      resolve({
        accessible: false,
        error: error.message
      });
    });
    
    request.setTimeout(10000, () => {
      request.destroy();
      resolve({
        accessible: false,
        error: 'Request timeout'
      });
    });
  });
}

/**
 * Check if commands.js contains required handlers
 */
function checkCommandsFile(commandsPath) {
  try {
    if (!fs.existsSync(commandsPath)) {
      return {
        valid: false,
        error: 'Commands file does not exist'
      };
    }
    
    const commandsContent = fs.readFileSync(commandsPath, 'utf8');
    const missingHandlers = [];
    
    for (const handler of REQUIRED_HANDLERS) {
      // Check for function declaration
      const functionRegex = new RegExp(`(function|async function)\\s+${handler}\\s*\\(`);
      if (!functionRegex.test(commandsContent)) {
        missingHandlers.push(handler);
      }
    }
    
    // Check for window binding
    const windowBindingRegex = /window\.(onGenerateReplyFromRead|onGenerateIntoCompose|showChatPane|showChatPaneCompose)\s*=/;
    const hasWindowBinding = windowBindingRegex.test(commandsContent);
    
    return {
      valid: missingHandlers.length === 0 && hasWindowBinding,
      missingHandlers,
      hasWindowBinding,
      fileSize: commandsContent.length
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

/**
 * Check if functions.html exists and is valid
 */
function checkFunctionsFile(functionsPath) {
  try {
    if (!fs.existsSync(functionsPath)) {
      return {
        valid: false,
        error: 'Functions HTML file does not exist'
      };
    }
    
    const functionsContent = fs.readFileSync(functionsPath, 'utf8');
    
    // Check for required elements
    const hasErrorHandling = functionsContent.includes('window.onerror');
    const hasCommandsScript = functionsContent.includes('commands.js');
    const hasUnhandledRejection = functionsContent.includes('unhandledrejection');
    
    return {
      valid: hasErrorHandling && hasCommandsScript && hasUnhandledRejection,
      hasErrorHandling,
      hasCommandsScript,
      hasUnhandledRejection,
      fileSize: functionsContent.length
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

/**
 * Main validation function
 */
async function validateAddinRuntime() {
  console.log('🔍 Validating Outlook Add-in Runtime...\n');
  
  const results = {
    manifest: null,
    functionFile: null,
    commandsFile: null,
    functionsFile: null,
    overall: false
  };
  
  let hasErrors = false;
  
  try {
    // 1. Check manifest file
    console.log('1. Checking manifest file...');
    if (!fs.existsSync(MANIFEST_PATH)) {
      throw new Error('Manifest file not found');
    }
    
    const functionFileUrl = extractFunctionFileUrl(MANIFEST_PATH);
    console.log(`   ✅ FunctionFile URL: ${functionFileUrl}`);
    results.manifest = { valid: true, functionFileUrl };
    
  } catch (error) {
    console.log(`   ❌ Manifest error: ${error.message}`);
    results.manifest = { valid: false, error: error.message };
    hasErrors = true;
  }
  
  // 2. Check FunctionFile accessibility
  if (results.manifest?.valid) {
    console.log('\n2. Checking FunctionFile accessibility...');
    try {
      const accessibility = await checkUrlAccessibility(results.manifest.functionFileUrl);
      
      if (accessibility.accessible) {
        console.log(`   ✅ FunctionFile accessible (${accessibility.statusCode})`);
        results.functionFile = { valid: true, statusCode: accessibility.statusCode };
      } else {
        console.log(`   ❌ FunctionFile not accessible: ${accessibility.error || accessibility.statusCode}`);
        results.functionFile = { valid: false, error: accessibility.error || `HTTP ${accessibility.statusCode}` };
        hasErrors = true;
      }
    } catch (error) {
      console.log(`   ❌ FunctionFile check failed: ${error.message}`);
      results.functionFile = { valid: false, error: error.message };
      hasErrors = true;
    }
  }
  
  // 3. Check commands.js file
  console.log('\n3. Checking commands.js file...');
  const commandsCheck = checkCommandsFile(COMMANDS_JS_PATH);
  
  if (commandsCheck.valid) {
    console.log('   ✅ Commands file valid');
    console.log(`   ✅ All handlers present: ${REQUIRED_HANDLERS.join(', ')}`);
    console.log(`   ✅ Window binding present`);
    console.log(`   ✅ File size: ${commandsCheck.fileSize} bytes`);
    results.commandsFile = { valid: true, ...commandsCheck };
  } else {
    console.log(`   ❌ Commands file invalid: ${commandsCheck.error}`);
    if (commandsCheck.missingHandlers?.length > 0) {
      console.log(`   ❌ Missing handlers: ${commandsCheck.missingHandlers.join(', ')}`);
    }
    if (!commandsCheck.hasWindowBinding) {
      console.log(`   ❌ Window binding missing`);
    }
    results.commandsFile = { valid: false, ...commandsCheck };
    hasErrors = true;
  }
  
  // 4. Check functions.html file
  console.log('\n4. Checking functions.html file...');
  const functionsCheck = checkFunctionsFile(FUNCTIONS_HTML_PATH);
  
  if (functionsCheck.valid) {
    console.log('   ✅ Functions HTML file valid');
    console.log(`   ✅ Error handling present`);
    console.log(`   ✅ Commands script loading present`);
    console.log(`   ✅ Unhandled rejection handling present`);
    console.log(`   ✅ File size: ${functionsCheck.fileSize} bytes`);
    results.functionsFile = { valid: true, ...functionsCheck };
  } else {
    console.log(`   ❌ Functions HTML file invalid: ${functionsCheck.error}`);
    if (!functionsCheck.hasErrorHandling) {
      console.log(`   ❌ Error handling missing`);
    }
    if (!functionsCheck.hasCommandsScript) {
      console.log(`   ❌ Commands script loading missing`);
    }
    if (!functionsCheck.hasUnhandledRejection) {
      console.log(`   ❌ Unhandled rejection handling missing`);
    }
    results.functionsFile = { valid: false, ...functionsCheck };
    hasErrors = true;
  }
  
  // 5. Overall result
  results.overall = !hasErrors;
  
  console.log('\n📊 Validation Summary:');
  console.log(`   Manifest: ${results.manifest?.valid ? '✅' : '❌'}`);
  console.log(`   FunctionFile: ${results.functionFile?.valid ? '✅' : '❌'}`);
  console.log(`   Commands File: ${results.commandsFile?.valid ? '✅' : '❌'}`);
  console.log(`   Functions File: ${results.functionsFile?.valid ? '✅' : '❌'}`);
  console.log(`   Overall: ${results.overall ? '✅ PASS' : '❌ FAIL'}`);
  
  if (results.overall) {
    console.log('\n🎉 All checks passed! Add-in runtime is healthy.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some checks failed. Please review the issues above.');
    process.exit(1);
  }
}

// Run validation
if (require.main === module) {
  validateAddinRuntime().catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
}

module.exports = { validateAddinRuntime };
