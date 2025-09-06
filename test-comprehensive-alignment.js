#!/usr/bin/env node

/**
 * COMPREHENSIVE ALIGNMENT TEST
 * 
 * Tests both AI systems with identical queries to verify perfect alignment
 * across all features and capabilities.
 */

const https = require('https');
const http = require('http');

// Configuration
const CONFIG = {
  MAIN_APP_URL: process.env.MAIN_APP_URL || 'http://localhost:3000',
  TEST_QUERIES: [
    // Basic queries
    "Who is the leaseholder of unit 8 at Ashwood House?",
    "How many units does Ashwood House have?",
    "What is a section 20?",
    "Explain the BSR",
    "Where should a PIB box be located?",
    
    // Email generation queries
    "Generate an email about a leak report for unit 5 at Oak Court",
    "Draft a Section 20 consultation notice for roof repairs",
    "Write a rent demand letter for unit 12 at Ashwood House",
    
    // Advanced queries
    "What are the fire safety requirements for residential blocks?",
    "Explain the asbestos management requirements",
    "What is the leak triage policy for communal vs demised areas?",
    
    // Compliance queries
    "What are the gas safety requirements for landlords?",
    "Explain the building safety regulations",
    "What compliance checks are required annually?"
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

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
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
        building_id: null,
        contextType: 'general',
        tone: 'Professional'
      })
    });

    if (response.status === 200) {
      return {
        success: true,
        response: response.data.response || response.data.result || 'No response',
        metadata: response.data.metadata || {},
        source: response.data.metadata?.source || 'Unknown'
      };
    } else {
      return {
        success: false,
        response: `HTTP ${response.status}: ${response.data.error || 'Unknown error'}`,
        metadata: {},
        source: 'Error'
      };
    }
  } catch (error) {
    return {
      success: false,
      response: error.message,
      metadata: {},
      source: 'Error'
    };
  }
}

// Test Outlook Add-in AI endpoint
async function testOutlookAI(query) {
  try {
    const response = await makeRequest(`${CONFIG.MAIN_APP_URL}/api/outlook-addin/ask-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: query,
        token: 'test-user-id', // Test token
        emailContext: null
      })
    });

    if (response.status === 200) {
      return {
        success: true,
        response: response.data.response || 'No response',
        metadata: response.data.metadata || {},
        source: response.data.metadata?.source || 'Unknown'
      };
    } else {
      return {
        success: false,
        response: `HTTP ${response.status}: ${response.data.error || 'Unknown error'}`,
        metadata: {},
        source: 'Error'
      };
    }
  } catch (error) {
    return {
      success: false,
      response: error.message,
      metadata: {},
      source: 'Error'
    };
  }
}

// Calculate similarity between two responses
function calculateSimilarity(text1, text2) {
  if (text1 === text2) return 1.0;
  
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

// Determine similarity level
function getSimilarityLevel(similarity) {
  if (similarity >= 0.95) return { level: 'exact', emoji: '✅', color: 'green' };
  if (similarity >= 0.8) return { level: 'very_similar', emoji: '✅', color: 'green' };
  if (similarity >= 0.6) return { level: 'similar', emoji: '⚠️', color: 'yellow' };
  return { level: 'different', emoji: '❌', color: 'red' };
}

// Main test function
async function runComprehensiveAlignmentTest() {
  log('🔍 COMPREHENSIVE AI SYSTEM ALIGNMENT TEST', 'bright');
  log('============================================================', 'bright');
  log('Testing both AI systems with identical queries to verify perfect alignment', 'bright');
  log('', 'reset');

  const results = [];
  let totalQueries = CONFIG.TEST_QUERIES.length;
  let alignedQueries = 0;
  let partiallyAlignedQueries = 0;
  let misalignedQueries = 0;

  for (let i = 0; i < CONFIG.TEST_QUERIES.length; i++) {
    const query = CONFIG.TEST_QUERIES[i];
    
    logStep(i + 1, `Testing: "${query}"`);
    
    try {
      // Test both systems
      const [askBlocResult, outlookResult] = await Promise.all([
        testAskBlocAI(query),
        testOutlookAI(query)
      ]);

      logInfo(`Ask Bloc AI: ${askBlocResult.success ? 'Success' : 'Failed'}`);
      logInfo(`Response: ${askBlocResult.response.substring(0, 100)}${askBlocResult.response.length > 100 ? '...' : ''}`);
      
      logInfo(`Outlook Add-in AI: ${outlookResult.success ? 'Success' : 'Failed'}`);
      logInfo(`Response: ${outlookResult.response.substring(0, 100)}${outlookResult.response.length > 100 ? '...' : ''}`);

      // Calculate similarity
      const similarity = calculateSimilarity(askBlocResult.response, outlookResult.response);
      const similarityInfo = getSimilarityLevel(similarity);
      
      log(`${similarityInfo.emoji} Responses are ${similarityInfo.level} (${Math.round(similarity * 100)}% similarity)`, similarityInfo.color);

      // Track results
      const result = {
        query,
        askBloc: askBlocResult,
        outlook: outlookResult,
        similarity,
        similarityLevel: similarityInfo.level
      };
      
      results.push(result);

      if (similarity >= 0.8) {
        alignedQueries++;
      } else if (similarity >= 0.6) {
        partiallyAlignedQueries++;
      } else {
        misalignedQueries++;
      }

    } catch (error) {
      logError(`Error testing query: ${error.message}`);
      misalignedQueries++;
    }
  }

  // Summary
  log('\n📊 COMPREHENSIVE TEST RESULTS SUMMARY', 'bright');
  log('============================================================', 'bright');
  log(`Total queries tested: ${totalQueries}`, 'reset');
  log(`Aligned queries (80%+ similarity): ${alignedQueries}`, 'green');
  log(`Partially aligned queries (60-79% similarity): ${partiallyAlignedQueries}`, 'yellow');
  log(`Misaligned queries (<60% similarity): ${misalignedQueries}`, 'red');

  // Detailed results
  log('\n🔍 DETAILED RESULTS', 'bright');
  log('============================================================', 'bright');
  
  results.forEach((result, index) => {
    const similarityInfo = getSimilarityLevel(result.similarity);
    log(`${index + 1}. "${result.query}"`, 'reset');
    log(`   Ask Bloc: ${result.askBloc.success ? 'Success' : 'Failed'}`, result.askBloc.success ? 'green' : 'red');
    log(`   Outlook: ${result.outlook.success ? 'Success' : 'Failed'}`, result.outlook.success ? 'green' : 'red');
    log(`   Similarity: ${similarityInfo.emoji} ${Math.round(result.similarity * 100)}% (${similarityInfo.level})`, similarityInfo.color);
  });

  // Analysis
  log('\n🔍 ANALYSIS', 'bright');
  log('============================================================', 'bright');
  
  const alignmentPercentage = Math.round((alignedQueries / totalQueries) * 100);
  
  if (alignmentPercentage >= 95) {
    logSuccess('EXCELLENT: Systems are perfectly aligned!');
  } else if (alignmentPercentage >= 80) {
    logWarning('GOOD: Systems are mostly aligned with minor differences.');
  } else if (alignmentPercentage >= 60) {
    logWarning('FAIR: Systems have some alignment issues that need attention.');
  } else {
    logError('POOR: Systems are not properly aligned and need significant fixes.');
  }

  log(`Overall alignment: ${alignmentPercentage}%`, alignmentPercentage >= 80 ? 'green' : 'yellow');

  // Feature analysis
  log('\n🔍 FEATURE ANALYSIS', 'bright');
  log('============================================================', 'bright');
  
  const emailQueries = results.filter(r => r.query.toLowerCase().includes('email') || r.query.toLowerCase().includes('draft'));
  const legalQueries = results.filter(r => r.query.toLowerCase().includes('section') || r.query.toLowerCase().includes('compliance'));
  const databaseQueries = results.filter(r => r.query.toLowerCase().includes('leaseholder') || r.query.toLowerCase().includes('units'));
  
  if (emailQueries.length > 0) {
    const emailAlignment = emailQueries.filter(r => r.similarity >= 0.8).length / emailQueries.length;
    log(`Email Generation: ${Math.round(emailAlignment * 100)}% aligned`, emailAlignment >= 0.8 ? 'green' : 'yellow');
  }
  
  if (legalQueries.length > 0) {
    const legalAlignment = legalQueries.filter(r => r.similarity >= 0.8).length / legalQueries.length;
    log(`Legal Knowledge: ${Math.round(legalAlignment * 100)}% aligned`, legalAlignment >= 0.8 ? 'green' : 'yellow');
  }
  
  if (databaseQueries.length > 0) {
    const databaseAlignment = databaseQueries.filter(r => r.similarity >= 0.8).length / databaseQueries.length;
    log(`Database Queries: ${Math.round(databaseAlignment * 100)}% aligned`, databaseAlignment >= 0.8 ? 'green' : 'yellow');
  }

  return {
    totalQueries,
    alignedQueries,
    partiallyAlignedQueries,
    misalignedQueries,
    alignmentPercentage,
    results
  };
}

// Run the test
if (require.main === module) {
  runComprehensiveAlignmentTest()
    .then((results) => {
      process.exit(results.alignmentPercentage >= 80 ? 0 : 1);
    })
    .catch((error) => {
      logError(`Test failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { runComprehensiveAlignmentTest };
