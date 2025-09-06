#!/usr/bin/env node

/**
 * Microsoft OAuth Environment Variables Fix Script
 * Provides the exact commands to update your Vercel environment variables
 */

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

function logCommand(command) {
  log(`   ${command}`, 'blue');
}

// Main fix instructions
function showFixInstructions() {
  log('🔧 Microsoft OAuth Environment Variables Fix', 'bright');
  log('=' .repeat(60), 'cyan');
  
  logStep(1, 'Current Issue');
  logError('Your Vercel environment variables are still using the old App ID:');
  logInfo('   Old (Wrong): 4ab4eae8-71e3-462b-ab41-a754b48d8839');
  logInfo('   New (Correct): 03d6ee20-cbe3-4d98-867c-084b0419fd96');
  
  logStep(2, 'Required Environment Variables');
  log('Update these variables in your Vercel dashboard:', 'yellow');
  
  const envVars = [
    {
      name: 'MICROSOFT_CLIENT_ID',
      value: '03d6ee20-cbe3-4d98-867c-084b0419fd96',
      description: 'Main Microsoft App ID for OAuth'
    },
    {
      name: 'OUTLOOK_CLIENT_ID', 
      value: '03d6ee20-cbe3-4d98-867c-084b0419fd96',
      description: 'Outlook-specific App ID (same as above)'
    },
    {
      name: 'NEXT_PUBLIC_MICROSOFT_CLIENT_ID',
      value: '03d6ee20-cbe3-4d98-867c-084b0419fd96',
      description: 'Client-side App ID for OAuth flow'
    },
    {
      name: 'MICROSOFT_REDIRECT_URI',
      value: 'https://www.blociq.co.uk/auth/callback',
      description: 'OAuth redirect URI'
    },
    {
      name: 'MICROSOFT_CLIENT_SECRET',
      value: '[YOUR_CLIENT_SECRET]',
      description: 'Microsoft App client secret (get from Azure)'
    },
    {
      name: 'AZURE_TENANT_ID',
      value: 'common',
      description: 'Azure tenant ID (use "common" for multi-tenant)'
    }
  ];
  
  envVars.forEach((envVar, index) => {
    log(`\n${index + 1}. ${envVar.name}`, 'yellow');
    log(`   Value: ${envVar.value}`, 'green');
    log(`   Description: ${envVar.description}`, 'blue');
  });
  
  logStep(3, 'How to Update in Vercel');
  log('1. Go to your Vercel dashboard', 'cyan');
  log('2. Select your project', 'cyan');
  log('3. Go to Settings → Environment Variables', 'cyan');
  log('4. Update each variable above', 'cyan');
  log('5. Redeploy your application', 'cyan');
  
  logStep(4, 'Alternative: Update via Vercel CLI');
  log('If you have Vercel CLI installed, you can run:', 'yellow');
  
  const cliCommands = [
    'vercel env add MICROSOFT_CLIENT_ID',
    'vercel env add OUTLOOK_CLIENT_ID', 
    'vercel env add NEXT_PUBLIC_MICROSOFT_CLIENT_ID',
    'vercel env add MICROSOFT_REDIRECT_URI',
    'vercel env add MICROSOFT_CLIENT_SECRET',
    'vercel env add AZURE_TENANT_ID'
  ];
  
  cliCommands.forEach(cmd => {
    logCommand(cmd);
  });
  
  logStep(5, 'Verify the Fix');
  log('After updating, test with:', 'yellow');
  logCommand('node diagnose-microsoft-oauth.js');
  
  logStep(6, 'Expected Results');
  logSuccess('After fixing, you should see:');
  logInfo('   - Property events widget works correctly');
  logInfo('   - Inbox overview shows live emails');
  logInfo('   - No more AADSTS700016 errors');
  logInfo('   - OAuth URLs contain correct App ID');
  
  logStep(7, 'Troubleshooting');
  log('If issues persist:', 'yellow');
  logInfo('1. Check Azure App Registration has correct redirect URIs:');
  logCommand('   - https://www.blociq.co.uk/auth/callback');
  logCommand('   - https://www.blociq.co.uk/outlook/callback');
  
  logInfo('2. Verify API permissions in Azure:');
  logCommand('   - Mail.Read, Mail.Send');
  logCommand('   - Calendars.Read, Calendars.ReadWrite');
  logCommand('   - User.Read, offline_access');
  
  logInfo('3. Check client secret is not expired');
  logInfo('4. Ensure tenant ID is correct (use "common" for multi-tenant)');
  
  log('\n🎯 Summary', 'bright');
  log('The issue is that your Vercel environment variables still contain the old App ID.', 'yellow');
  log('Update them to use the correct App ID: 03d6ee20-cbe3-4d98-867c-084b0419fd96', 'green');
  log('Then redeploy and test again.', 'green');
}

// Main execution
if (require.main === module) {
  showFixInstructions();
}

module.exports = {
  showFixInstructions
};
