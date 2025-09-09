#!/usr/bin/env node

/**
 * OCR Configuration Fix Script
 * 
 * This script helps diagnose and fix OCR service configuration issues
 * by checking environment variables and testing service connectivity.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Color codes for console output
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

// Configuration
const CONFIG = {
  RENDER_OCR_URL: process.env.RENDER_OCR_URL || 'https://ocr-server-2-ykmk.onrender.com',
  RENDER_OCR_TOKEN: process.env.RENDER_OCR_TOKEN || null,
  EXPECTED_ENDPOINTS: ['/health', '/upload'],
  TIMEOUT: 10000
};

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'BlocIQ-OCR-Config-Fix/1.0',
        ...options.headers
      },
      timeout: CONFIG.TIMEOUT
    };

    const req = https.request(url, requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers, raw: true });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function checkEnvironmentVariables() {
  logStep(1, 'Checking Environment Variables');
  
  const envVars = {
    RENDER_OCR_URL: process.env.RENDER_OCR_URL,
    RENDER_OCR_TOKEN: process.env.RENDER_OCR_TOKEN
  };
  
  const results = {};
  
  for (const [key, value] of Object.entries(envVars)) {
    if (value) {
      results[key] = {
        present: true,
        length: value.length,
        preview: key === 'RENDER_OCR_TOKEN' ? `${value.substring(0, 10)}...` : value,
        status: '✅ Set'
      };
      logSuccess(`${key}: ${results[key].preview}`);
    } else {
      results[key] = {
        present: false,
        status: '❌ Missing'
      };
      logError(`${key}: Not set`);
    }
  }
  
  return results;
}

async function testServiceHealth() {
  logStep(2, 'Testing Service Health');
  
  try {
    const healthUrl = `${CONFIG.RENDER_OCR_URL}/health`;
    logInfo(`Testing: ${healthUrl}`);
    
    const response = await makeRequest(healthUrl);
    
    if (response.status === 200) {
      logSuccess(`Service is healthy (${response.status})`);
      logInfo(`Response: ${JSON.stringify(response.data, null, 2)}`);
      return { healthy: true, data: response.data };
    } else {
      logError(`Service health check failed (${response.status})`);
      return { healthy: false, status: response.status };
    }
  } catch (error) {
    logError(`Health check failed: ${error.message}`);
    return { healthy: false, error: error.message };
  }
}

async function testAuthentication() {
  logStep(3, 'Testing Authentication');
  
  if (!CONFIG.RENDER_OCR_TOKEN) {
    logError('No RENDER_OCR_TOKEN provided - cannot test authentication');
    return { authenticated: false, reason: 'No token provided' };
  }
  
  try {
    const uploadUrl = `${CONFIG.RENDER_OCR_URL}/upload`;
    logInfo(`Testing authentication: ${uploadUrl}`);
    
    const response = await makeRequest(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.RENDER_OCR_TOKEN}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'test=1' // Minimal test payload
    });
    
    if (response.status === 401) {
      logError('Authentication failed - invalid token');
      return { authenticated: false, reason: 'Invalid token', status: response.status };
    } else if (response.status === 404) {
      logError('Endpoint not found');
      return { authenticated: false, reason: 'Endpoint not found', status: response.status };
    } else if (response.status === 400) {
      logSuccess('Authentication successful (400 expected for test payload)');
      return { authenticated: true, status: response.status };
    } else if (response.status === 200) {
      logSuccess('Authentication successful');
      return { authenticated: true, status: response.status };
    } else {
      logWarning(`Unexpected response: ${response.status}`);
      return { authenticated: false, reason: 'Unexpected response', status: response.status };
    }
  } catch (error) {
    logError(`Authentication test failed: ${error.message}`);
    return { authenticated: false, reason: error.message };
  }
}

function generateEnvironmentTemplate() {
  logStep(4, 'Generating Environment Configuration');
  
  const template = `# OCR Service Configuration
# Copy these to your .env.local file and update with actual values

# Render OCR Service Integration
RENDER_OCR_URL=https://ocr-server-2-ykmk.onrender.com/upload
RENDER_OCR_TOKEN=your-shared-secret-token-here

# Instructions:
# 1. Get the correct RENDER_OCR_TOKEN from your Render service dashboard
# 2. Update RENDER_OCR_URL if your service is deployed elsewhere
# 3. Ensure both variables are set in your deployment platform (Vercel, etc.)
`;
  
  const envPath = path.join(process.cwd(), '.env.ocr.template');
  fs.writeFileSync(envPath, template);
  logSuccess(`Environment template created: ${envPath}`);
  
  return template;
}

function generateFixRecommendations(envCheck, healthCheck, authCheck) {
  logStep(5, 'Generating Fix Recommendations');
  
  const recommendations = [];
  
  if (!envCheck.RENDER_OCR_URL.present) {
    recommendations.push({
      priority: 'HIGH',
      issue: 'RENDER_OCR_URL is missing',
      solution: 'Set RENDER_OCR_URL to your deployed Render OCR service URL',
      example: 'RENDER_OCR_URL=https://ocr-server-2-ykmk.onrender.com/upload'
    });
  }
  
  if (!envCheck.RENDER_OCR_TOKEN.present) {
    recommendations.push({
      priority: 'HIGH',
      issue: 'RENDER_OCR_TOKEN is missing',
      solution: 'Set RENDER_OCR_TOKEN to match the token configured on your Render service',
      example: 'RENDER_OCR_TOKEN=your-shared-secret-token-here'
    });
  }
  
  if (!healthCheck.healthy) {
    recommendations.push({
      priority: 'HIGH',
      issue: 'OCR service is not healthy or accessible',
      solution: 'Check if the Render service is running and accessible',
      steps: [
        'Verify the service is deployed on Render',
        'Check if the service is paused or stopped',
        'Ensure the service URL is correct'
      ]
    });
  }
  
  if (!authCheck.authenticated) {
    recommendations.push({
      priority: 'HIGH',
      issue: 'Authentication failed',
      solution: 'Verify the RENDER_OCR_TOKEN matches the token on your Render service',
      steps: [
        'Check the token in your Render service environment variables',
        'Ensure the token hasn\'t expired or been regenerated',
        'Verify the token is correctly set in your deployment platform'
      ]
    });
  }
  
  if (recommendations.length === 0) {
    logSuccess('No issues found - OCR service is properly configured!');
  } else {
    logWarning(`Found ${recommendations.length} issue(s) to fix:`);
    recommendations.forEach((rec, index) => {
      log(`\n${index + 1}. [${rec.priority}] ${rec.issue}`, 'yellow');
      log(`   Solution: ${rec.solution}`, 'blue');
      if (rec.example) {
        log(`   Example: ${rec.example}`, 'cyan');
      }
      if (rec.steps) {
        log('   Steps:', 'blue');
        rec.steps.forEach(step => log(`     - ${step}`, 'cyan'));
      }
    });
  }
  
  return recommendations;
}

async function main() {
  log('🔧 OCR Configuration Fix Script', 'bright');
  log('================================', 'bright');
  
  try {
    // Check environment variables
    const envCheck = await checkEnvironmentVariables();
    
    // Test service health
    const healthCheck = await testServiceHealth();
    
    // Test authentication
    const authCheck = await testAuthentication();
    
    // Generate environment template
    generateEnvironmentTemplate();
    
    // Generate recommendations
    const recommendations = generateFixRecommendations(envCheck, healthCheck, authCheck);
    
    // Summary
    log('\n📊 Summary', 'bright');
    log('==========', 'bright');
    log(`Environment Variables: ${envCheck.RENDER_OCR_URL.present && envCheck.RENDER_OCR_TOKEN.present ? '✅ Complete' : '❌ Incomplete'}`);
    log(`Service Health: ${healthCheck.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
    log(`Authentication: ${authCheck.authenticated ? '✅ Working' : '❌ Failed'}`);
    log(`Issues Found: ${recommendations.length}`);
    
    if (recommendations.length > 0) {
      log('\n🚀 Next Steps:', 'bright');
      log('1. Fix the issues listed above', 'yellow');
      log('2. Update your environment variables', 'yellow');
      log('3. Redeploy your application', 'yellow');
      log('4. Run this script again to verify the fix', 'yellow');
    } else {
      log('\n🎉 OCR service is properly configured and ready to use!', 'green');
    }
    
  } catch (error) {
    logError(`Script failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  checkEnvironmentVariables,
  testServiceHealth,
  testAuthentication,
  generateEnvironmentTemplate,
  generateFixRecommendations
};
