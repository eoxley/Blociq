// Verify Outlook Configuration Script
// Run this to check if all environment variables are correctly unified

console.log('🔍 Verifying Outlook Configuration...\n');

// Expected values
const EXPECTED_CLIENT_ID = '4ab4eae8-71e3-462b-ab41-a754b48d8839';
const OLD_CLIENT_ID = 'f8033f58-1b3b-40a7-8f0c-86678499cc74';

// Check all client ID environment variables
const clientIdVars = [
  'OUTLOOK_CLIENT_ID',
  'MICROSOFT_CLIENT_ID', 
  'NEXT_PUBLIC_MICROSOFT_CLIENT_ID'
];

console.log('📋 Client ID Variables:');
let allCorrect = true;

clientIdVars.forEach(varName => {
  const value = process.env[varName];
  const status = value === EXPECTED_CLIENT_ID ? '✅' : 
                 value === OLD_CLIENT_ID ? '❌ (OLD)' :
                 value ? '❌ (WRONG)' : '❌ (MISSING)';
  
  console.log(`  ${varName}: ${status}`);
  if (value && value !== EXPECTED_CLIENT_ID) {
    console.log(`    Current: ${value}`);
    console.log(`    Expected: ${EXPECTED_CLIENT_ID}`);
    allCorrect = false;
  }
});

// Check client secret variables
const secretVars = [
  'MICROSOFT_CLIENT_SECRET',
  'OUTLOOK_CLIENT_SECRET'
];

console.log('\n🔐 Client Secret Variables:');
secretVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅ Present' : '❌ Missing';
  console.log(`  ${varName}: ${status}`);
  if (value) {
    console.log(`    Length: ${value.length} chars`);
    console.log(`    Format: ${value.substring(0, 4)}...${value.substring(-4)}`);
  }
});

// Check other related variables
console.log('\n🌐 Other Configuration:');
const otherVars = [
  'OUTLOOK_TENANT_ID',
  'OUTLOOK_REDIRECT_URI', 
  'NEXT_PUBLIC_MICROSOFT_REDIRECT_URI'
];

otherVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅ Set' : '❌ Missing';
  console.log(`  ${varName}: ${status}`);
  if (value) {
    console.log(`    Value: ${value}`);
  }
});

// Summary
console.log('\n📊 Summary:');
if (allCorrect) {
  console.log('✅ All client IDs are correctly unified!');
} else {
  console.log('❌ Client ID mismatch detected - update environment variables');
}

// Instructions
console.log('\n📝 Next Steps:');
if (!allCorrect) {
  console.log('1. Update all client ID variables to:', EXPECTED_CLIENT_ID);
  console.log('2. Redeploy your application');
  console.log('3. Run this script again to verify');
} else {
  console.log('1. Generate new client secret in Azure');
  console.log('2. Update client secret variables in Vercel');
  console.log('3. Delete old tokens: DELETE FROM outlook_tokens;');
  console.log('4. Test Outlook reconnection');
}

// Check for hardcoded values in common files
console.log('\n🔍 Checking for hardcoded client IDs...');
const fs = require('fs');
const path = require('path');

const checkFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes(OLD_CLIENT_ID)) {
        console.log(`❌ Found old client ID in: ${filePath}`);
        return true;
      }
    }
  } catch (error) {
    // Ignore file read errors
  }
  return false;
};

const commonFiles = [
  '.env.local',
  '.env',
  'next.config.js',
  'next.config.ts',
  'vercel.json'
];

let foundHardcoded = false;
commonFiles.forEach(file => {
  if (checkFile(file)) {
    foundHardcoded = true;
  }
});

if (!foundHardcoded) {
  console.log('✅ No hardcoded old client IDs found in common config files');
}

console.log('\n🎯 Configuration check complete!');

module.exports = {
  EXPECTED_CLIENT_ID,
  OLD_CLIENT_ID,
  checkConfiguration: () => allCorrect
};
