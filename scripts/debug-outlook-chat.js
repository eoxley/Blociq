#!/usr/bin/env node

/**
 * DEBUG OUTLOOK ADD-IN CHAT
 * 
 * Tests the Outlook add-in chat API endpoint
 */

require('dotenv').config({ path: '.env.local' });

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function debugOutlookChat() {
  log('🔧 DEBUGGING OUTLOOK ADD-IN CHAT', 'bright');
  log('============================================', 'bright');
  
  const baseUrl = 'http://localhost:3000';
  
  try {
    log(`ℹ️ Testing API endpoint: /api/addin/ask-ai`, 'blue');
    
    const testPrompt = "What is an EICR?";
    
    // Test the add-in API endpoint
    const response = await fetch(`${baseUrl}/api/addin/ask-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: testPrompt,
        contextType: 'general'
      })
    });
    
    log(`ℹ️ Response status: ${response.status}`, 'blue');
    log(`ℹ️ Response headers:`, 'blue');
    console.log(Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      log(`❌ API Error: ${errorText}`, 'red');
      return;
    }
    
    const result = await response.json();
    
    log('✅ API Response received:', 'green');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      log(`\n📨 RESPONSE TYPE: ${result.type}`, 'cyan');
      log(`Response: ${result.response}`, 'reset');
      
      if (result.sources && result.sources.length > 0) {
        log(`\n📚 Sources: ${result.sources.length}`, 'cyan');
      }
      
      if (result.confidence) {
        log(`Confidence: ${result.confidence}`, 'cyan');
      }
      
    } else {
      log(`❌ API returned success: false`, 'red');
      if (result.error) {
        log(`Error: ${result.error}`, 'red');
      }
    }
    
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    console.error(error);
  }
}

if (require.main === module) {
  debugOutlookChat()
    .then(() => {
      log('✅ Debug completed', 'green');
      process.exit(0);
    })
    .catch((error) => {
      log(`❌ Debug failed: ${error.message}`, 'red');
      process.exit(1);
    });
}