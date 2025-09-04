#!/usr/bin/env node

/**
 * BlocIQ Azure App ID Configuration Verification
 * Ensures all App IDs are correctly configured throughout the codebase
 */

const fs = require('fs');
const path = require('path');

// Expected App IDs
const EXPECTED_IDS = {
  MAIN_APP: '03d6ee20-cbe3-4d98-867c-084b0419fd96', // Bloc IQ LTD - Main web application
  ADDIN_APP: '85e47bf9-847d-4fa6-ab0b-7d73531345db'  // BlocIQ AI Assistant - Outlook add-in
};

// Old/deprecated IDs that should NOT exist (for reference only)
const DEPRECATED_IDS = [
  // Legacy App ID - should not appear in codebase
];

console.log('🔍 BlocIQ Azure App ID Configuration Verification\n');

// Files to check for main app ID
const MAIN_APP_FILES = [
  'OUTLOOK_AUTH_FIX_CHECKLIST.md',
  'scripts/IMMEDIATE_FIXES_SUMMARY.md',
  'scripts/verify-outlook-config.js',
  'setup-microsoft-oauth.js',
  'ENVIRONMENT_SETUP.md',
  'setup-vercel-env.js',
  'scripts/setup-local-supabase.js',
  'DEPLOYMENT_CHECKLIST.md'
];

// Files to check for add-in app ID
const ADDIN_FILES = [
  'public/outlook-addin/manifest.xml'
];

// Check if file exists and contains expected ID
function checkFileForId(filePath, expectedId, description) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ ${filePath} - File not found`);
    return false;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const hasExpectedId = content.includes(expectedId);
  
  // Check for deprecated IDs
  const hasDeprecatedIds = DEPRECATED_IDS.some(id => content.includes(id));
  
  if (hasExpectedId && !hasDeprecatedIds) {
    console.log(`✅ ${filePath} - Correct ${description} ID found`);
    return true;
  } else if (hasDeprecatedIds) {
    console.log(`⚠️  ${filePath} - Contains deprecated App ID`);
    return false;
  } else {
    console.log(`❌ ${filePath} - Missing expected ${description} ID`);
    return false;
  }
}

// Main verification
console.log('📱 Checking Main Web Application Files (Bloc IQ LTD):');
console.log(`Expected ID: ${EXPECTED_IDS.MAIN_APP}\n`);

let mainAppCorrect = true;
MAIN_APP_FILES.forEach(file => {
  const isCorrect = checkFileForId(file, EXPECTED_IDS.MAIN_APP, 'Main App');
  if (!isCorrect) mainAppCorrect = false;
});

console.log('\n📧 Checking Outlook Add-in Files (BlocIQ AI Assistant):');
console.log(`Expected ID: ${EXPECTED_IDS.ADDIN_APP}\n`);

let addinCorrect = true;
ADDIN_FILES.forEach(file => {
  const isCorrect = checkFileForId(file, EXPECTED_IDS.ADDIN_APP, 'Add-in App');
  if (!isCorrect) addinCorrect = false;
});

// Check for any remaining deprecated IDs
console.log('\n🔍 Scanning for deprecated App IDs...\n');

function scanForDeprecatedIds(dir, relativePath = '') {
  const items = fs.readdirSync(dir);
  
  items.forEach(item => {
    const itemPath = path.join(dir, item);
    const relativeItemPath = path.join(relativePath, item);
    
    // Skip node_modules, .git, .next, etc.
    if (item.startsWith('.') || item === 'node_modules' || item === '.next') {
      return;
    }
    
    if (fs.statSync(itemPath).isDirectory()) {
      scanForDeprecatedIds(itemPath, relativeItemPath);
    } else if (item.endsWith('.js') || item.endsWith('.ts') || item.endsWith('.tsx') || 
               item.endsWith('.md') || item.endsWith('.xml') || item.endsWith('.json')) {
      try {
        const content = fs.readFileSync(itemPath, 'utf8');
        DEPRECATED_IDS.forEach(deprecatedId => {
          if (content.includes(deprecatedId)) {
            console.log(`⚠️  ${relativeItemPath} - Contains deprecated ID: ${deprecatedId}`);
          }
        });
      } catch (err) {
        // Skip files that can't be read
      }
    }
  });
}

scanForDeprecatedIds(process.cwd());

// Final summary
console.log('\n' + '='.repeat(60));
console.log('📋 VERIFICATION SUMMARY');
console.log('='.repeat(60));

if (mainAppCorrect && addinCorrect) {
  console.log('🎉 SUCCESS: All App IDs are correctly configured!');
  console.log('\n✅ Main Web Application: Using Bloc IQ LTD');
  console.log('✅ Outlook Add-in: Using BlocIQ AI Assistant');
  console.log('\n🚀 Your codebase is ready for deployment!');
} else {
  console.log('❌ ISSUES FOUND: Some App IDs need correction');
  
  if (!mainAppCorrect) {
    console.log('\n📱 Main App Issues:');
    console.log('- Update environment variables to use: 03d6ee20-cbe3-4d98-867c-084b0419fd96');
  }
  
  if (!addinCorrect) {
    console.log('\n📧 Add-in Issues:');
    console.log('- Update manifest.xml to use: 85e47bf9-847d-4fa6-ab0b-7d73531345db');
  }
}

console.log('\n📚 Azure Configuration Required:');
console.log('1. Bloc IQ LTD (03d6ee20-cbe3-4d98-867c-084b0419fd96):');
console.log('   - Web Application platform');
console.log('   - Redirect URIs: https://blociq.co.uk/auth/callback');
console.log('   - Permissions: Mail.Read, Mail.ReadWrite, User.Read, Calendars.ReadWrite');
console.log('');
console.log('2. BlocIQ AI Assistant (85e47bf9-847d-4fa6-ab0b-7d73531345db):');
console.log('   - Single-page application (SPA) platform');
console.log('   - Redirect URIs: https://blociq.co.uk/outlook-addin/*');
console.log('   - Application ID URI: api://blociq.co.uk/85e47bf9-847d-4fa6-ab0b-7d73531345db');
console.log('   - Permissions: Mail.Read, Mail.ReadWrite, Mail.Send, User.Read');

process.exit(mainAppCorrect && addinCorrect ? 0 : 1);
