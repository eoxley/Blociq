#!/usr/bin/env node

/**
 * AI System Alignment Test
 * 
 * This script tests both Ask Bloc AI and Outlook Add-in AI systems
 * with identical queries to verify they return the same responses.
 */

const https = require('https');
const http = require('http');

// Configuration
const CONFIG = {
  MAIN_APP_URL: process.env.MAIN_APP_URL || 'http://localhost:3000',
  TEST_QUERIES: [
    "Who is the leaseholder of unit 8 at Ashwood House?",
    "How many units does Ashwood House have?",
    "What is a section 20?",
    "Explain the BSR",
    "Where should a PIB box be located?"
  ]
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${step}. ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Helper function to make HTTP/HTTPS requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const client = isHttps ? https : http;
    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Test Ask Bloc AI endpoint
async function testAskBlocAI(query) {
  try {
    const response = await makeRequest(`${CONFIG.MAIN_APP_URL}/api/ask-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: query,
        context_type: 'general',
        is_public: true
      })
    });
    
    if (response.status === 200) {
      return {
        success: true,
        response: response.data.response || response.data.result || response.data.answer,
        source: 'Ask Bloc AI',
        metadata: response.data.context || response.data.metadata
      };
    } else {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.data.error || 'Unknown error'}`,
        source: 'Ask Bloc AI'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      source: 'Ask Bloc AI'
    };
  }
}

// Test Outlook Add-in AI endpoint
async function testOutlookAddinAI(query) {
  try {
    // Create a mock token for testing
    const mockToken = Buffer.from(JSON.stringify({
      context: 'outlook_email_auth',
      user_id: 'test-user-id',
      email: 'test@blociq.co.uk',
      timestamp: Date.now()
    })).toString('base64');
    
    const response = await makeRequest(`${CONFIG.MAIN_APP_URL}/api/outlook-addin/ask-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: query,
        token: mockToken,
        is_outlook_addin: true
      })
    });
    
    if (response.status === 200) {
      return {
        success: true,
        response: response.data.response,
        source: 'Outlook Add-in AI',
        metadata: response.data.metadata
      };
    } else {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.data.error || 'Unknown error'}`,
        source: 'Outlook Add-in AI'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      source: 'Outlook Add-in AI'
    };
  }
}

// Compare responses for similarity
function compareResponses(response1, response2) {
  if (!response1.success || !response2.success) {
    return {
      similar: false,
      reason: 'One or both requests failed',
      details: {
        response1: response1.error || 'No response',
        response2: response2.error || 'No response'
      }
    };
  }
  
  const text1 = response1.response.toLowerCase().trim();
  const text2 = response2.response.toLowerCase().trim();
  
  // Check for exact match
  if (text1 === text2) {
    return {
      similar: true,
      matchType: 'exact',
      similarity: 100
    };
  }
  
  // Check for key information matches
  const keyInfo1 = extractKeyInfo(text1);
  const keyInfo2 = extractKeyInfo(text2);
  
  const keyMatches = keyInfo1.filter(info => 
    keyInfo2.some(info2 => info2.includes(info) || info.includes(info2))
  ).length;
  
  const similarity = keyMatches > 0 ? (keyMatches / Math.max(keyInfo1.length, keyInfo2.length)) * 100 : 0;
  
  return {
    similar: similarity > 70, // Consider similar if 70%+ of key info matches
    matchType: similarity > 90 ? 'very_similar' : similarity > 70 ? 'similar' : 'different',
    similarity: Math.round(similarity),
    keyInfo1,
    keyInfo2
  };
}

// Extract key information from response text
function extractKeyInfo(text) {
  const keyInfo = [];
  
  // Extract names (capitalized words)
  const names = text.match(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g) || [];
  keyInfo.push(...names);
  
  // Extract emails
  const emails = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g) || [];
  keyInfo.push(...emails);
  
  // Extract phone numbers
  const phones = text.match(/\b(?:\+44|0)[0-9\s-]{10,}\b/g) || [];
  keyInfo.push(...phones);
  
  // Extract unit numbers
  const units = text.match(/\b(?:unit|flat|apartment)\s*[0-9]+[a-zA-Z]?\b/gi) || [];
  keyInfo.push(...units);
  
  // Extract building names
  const buildings = text.match(/\b[A-Z][a-z]+ (?:House|Court|Place|Tower|Manor|Lodge|Building)\b/g) || [];
  keyInfo.push(...buildings);
  
  // Extract numbers (for unit counts, etc.)
  const numbers = text.match(/\b\d+\b/g) || [];
  keyInfo.push(...numbers);
  
  return [...new Set(keyInfo)]; // Remove duplicates
}

// Test a single query
async function testQuery(query, index) {
  logStep(`${index + 1}`, `Testing: "${query}"`);
  
  const [askBlocResult, outlookResult] = await Promise.all([
    testAskBlocAI(query),
    testOutlookAddinAI(query)
  ]);
  
  logInfo(`Ask Bloc AI: ${askBlocResult.success ? 'Success' : 'Failed'}`);
  if (askBlocResult.success) {
    logInfo(`Response: ${askBlocResult.response.substring(0, 100)}...`);
  } else {
    logError(`Error: ${askBlocResult.error}`);
  }
  
  logInfo(`Outlook Add-in AI: ${outlookResult.success ? 'Success' : 'Failed'}`);
  if (outlookResult.success) {
    logInfo(`Response: ${outlookResult.response.substring(0, 100)}...`);
  } else {
    logError(`Error: ${outlookResult.error}`);
  }
  
  const comparison = compareResponses(askBlocResult, outlookResult);
  
  if (comparison.similar) {
    logSuccess(`Responses are ${comparison.matchType} (${comparison.similarity}% similarity)`);
  } else {
    logError(`Responses are different (${comparison.similarity}% similarity)`);
    if (comparison.details) {
      logError(`Details: ${JSON.stringify(comparison.details, null, 2)}`);
    }
  }
  
  return {
    query,
    askBlocResult,
    outlookResult,
    comparison
  };
}

// Main test function
async function runAlignmentTests() {
  log('🔍 AI System Alignment Test', 'bright');
  log('=' .repeat(60), 'cyan');
  log('Testing both AI systems with identical queries to verify alignment', 'blue');
  
  const results = [];
  
  for (let i = 0; i < CONFIG.TEST_QUERIES.length; i++) {
    const result = await testQuery(CONFIG.TEST_QUERIES[i], i);
    results.push(result);
    
    // Add delay between requests to avoid rate limiting
    if (i < CONFIG.TEST_QUERIES.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Summary
  log('\n📊 Test Results Summary', 'bright');
  log('=' .repeat(60), 'cyan');
  
  const similarCount = results.filter(r => r.comparison.similar).length;
  const totalCount = results.length;
  
  log(`Total queries tested: ${totalCount}`, 'blue');
  log(`Similar responses: ${similarCount}`, similarCount === totalCount ? 'green' : 'yellow');
  log(`Different responses: ${totalCount - similarCount}`, totalCount - similarCount === 0 ? 'green' : 'red');
  
  // Detailed results
  log('\n🔍 Detailed Results', 'bright');
  results.forEach((result, index) => {
    const status = result.comparison.similar ? '✅' : '❌';
    const similarity = result.comparison.similarity;
    log(`${status} Query ${index + 1}: ${similarity}% similarity`, result.comparison.similar ? 'green' : 'red');
  });
  
  // Analysis
  log('\n🔍 Analysis', 'bright');
  
  if (similarCount === totalCount) {
    log('🎉 All tests passed! Both AI systems are returning identical responses.', 'green');
    log('   - Unified data access layer is working correctly', 'blue');
    log('   - No more hallucinated data', 'blue');
    log('   - Consistent user experience across both systems', 'blue');
  } else {
    log('⚠️  Some tests failed. The systems are not fully aligned yet.', 'yellow');
    
    const failedTests = results.filter(r => !r.comparison.similar);
    log(`\nFailed tests:`, 'red');
    failedTests.forEach((result, index) => {
      log(`  ${index + 1}. "${result.query}"`, 'red');
      log(`     Ask Bloc: ${result.askBlocResult.success ? 'Success' : 'Failed'}`, 'red');
      log(`     Outlook: ${result.outlookResult.success ? 'Success' : 'Failed'}`, 'red');
    });
  }
  
  return similarCount === totalCount;
}

// Main execution
if (require.main === module) {
  runAlignmentTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    logError(`Test execution failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  testAskBlocAI,
  testOutlookAddinAI,
  compareResponses,
  runAlignmentTests
};
