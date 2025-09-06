#!/usr/bin/env node

/**
 * Outlook Calendar Integration Diagnostic Script
 * 
 * This script helps diagnose the AADSTS700016 error by checking:
 * 1. Environment variable configuration
 * 2. Expected vs actual App IDs
 * 3. Azure app registration status
 */

console.log('🔍 Outlook Calendar Integration Diagnostic');
console.log('==========================================\n');

// Expected configuration
const EXPECTED_CONFIG = {
  APP_ID: '03d6ee20-cbe3-4d98-867c-084b0419fd96',
  ERROR_APP_ID: '4ab4eae8-71e3-462b-ab41-a754b48d8839',
  REDIRECT_URIS: [
    'https://www.blociq.co.uk/api/auth/outlook/callback',
    'https://blociq-h3xv.vercel.app/api/auth/outlook/callback',
    'http://localhost:3000/api/auth/outlook/callback'
  ]
};

console.log('📋 Current Issue:');
console.log(`❌ Error App ID: ${EXPECTED_CONFIG.ERROR_APP_ID}`);
console.log(`✅ Expected App ID: ${EXPECTED_CONFIG.APP_ID}`);
console.log('');

console.log('🔧 Environment Variables to Check in Vercel:');
console.log('=============================================');
console.log('Go to: Vercel Dashboard → Your Project → Settings → Environment Variables');
console.log('');
console.log('Required variables:');
console.log(`MICROSOFT_CLIENT_ID=${EXPECTED_CONFIG.APP_ID}`);
console.log(`OUTLOOK_CLIENT_ID=${EXPECTED_CONFIG.APP_ID}`);
console.log(`NEXT_PUBLIC_MICROSOFT_CLIENT_ID=${EXPECTED_CONFIG.APP_ID}`);
console.log('MICROSOFT_CLIENT_SECRET=<your_client_secret_value>');
console.log('');

console.log('🏢 Azure App Registration Check:');
console.log('================================');
console.log('1. Go to: https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade');
console.log(`2. Search for App ID: ${EXPECTED_CONFIG.APP_ID}`);
console.log('3. If found, check:');
console.log('   - Redirect URIs include:');
EXPECTED_CONFIG.REDIRECT_URIS.forEach(uri => {
  console.log(`     ✅ ${uri}`);
});
console.log('   - API Permissions include:');
console.log('     ✅ Microsoft Graph → Delegated: Mail.Read, Mail.Send, Calendars.Read, Calendars.ReadWrite');
console.log('   - Client secret is generated and not expired');
console.log('');
console.log('4. If NOT found, create new app registration:');
console.log('   - Name: "BlocIQ Property Management"');
console.log('   - Account types: "Accounts in any organizational directory and personal Microsoft accounts"');
console.log('   - Redirect URI: Web - https://www.blociq.co.uk/api/auth/outlook/callback');
console.log('');

console.log('🧪 Testing Steps:');
console.log('=================');
console.log('1. Update environment variables in Vercel');
console.log('2. Redeploy your application');
console.log('3. Clear browser cache and cookies');
console.log('4. Go to your app and click "Connect Outlook"');
console.log('5. Check the OAuth URL contains the correct client_id');
console.log('6. Complete the OAuth flow');
console.log('7. Check browser console for errors');
console.log('');

console.log('🔍 Debug Information:');
console.log('====================');
console.log('When testing, check these in your browser:');
console.log('1. Network tab → Look for requests to /api/auth/outlook/');
console.log('2. OAuth URL should contain: client_id=03d6ee20-cbe3-4d98-867c-084b0419fd96');
console.log('3. After OAuth, check requests to /api/outlook_tokens');
console.log('4. Should return 200 status, not 406');
console.log('');

console.log('📞 If Still Having Issues:');
console.log('==========================');
console.log('1. Check Azure AD tenant: Make sure you\'re in the correct tenant');
console.log('2. Check app permissions: Ensure admin consent is granted');
console.log('3. Check client secret: Make sure it\'s the VALUE, not the Secret ID');
console.log('4. Check redirect URIs: Must match exactly (including https/http)');
console.log('5. Check app registration: Must be in the same tenant as your users');
console.log('');

console.log('✅ Success Indicators:');
console.log('=====================');
console.log('- OAuth flow completes without errors');
console.log('- No AADSTS700016 error');
console.log('- No 406 errors on outlook_tokens API');
console.log('- Calendar events appear in your app');
console.log('- Database has entries in outlook_tokens table');
console.log('');

console.log('🎯 Next Steps:');
console.log('==============');
console.log('1. Follow the steps above to fix the App ID mismatch');
console.log('2. Test the OAuth flow');
console.log('3. If successful, your Outlook calendar integration should work!');
console.log('');

// Check if running in Node.js environment
if (typeof process !== 'undefined' && process.env) {
  console.log('🔧 Current Environment Variables:');
  console.log('=================================');
  const envVars = [
    'MICROSOFT_CLIENT_ID',
    'OUTLOOK_CLIENT_ID', 
    'NEXT_PUBLIC_MICROSOFT_CLIENT_ID',
    'MICROSOFT_CLIENT_SECRET'
  ];
  
  envVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      const isCorrect = value === EXPECTED_CONFIG.APP_ID;
      console.log(`${isCorrect ? '✅' : '❌'} ${varName}=${value}`);
    } else {
      console.log(`❌ ${varName}=<not set>`);
    }
  });
}
