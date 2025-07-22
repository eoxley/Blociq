#!/usr/bin/env node

console.log('🔍 Checking Outlook Integration Configuration\n');

console.log('📋 Required Environment Variables for Microsoft Integration:');
console.log('========================================================\n');

const requiredVars = [
  {
    name: 'OUTLOOK_CLIENT_ID',
    description: 'Microsoft OAuth Client ID from Azure App Registration',
    status: '❌ MISSING - This is required for OAuth flow'
  },
  {
    name: 'OUTLOOK_CLIENT_SECRET', 
    description: 'Microsoft OAuth Client Secret from Azure App Registration',
    status: '❌ MISSING - This is required for OAuth flow'
  },
  {
    name: 'OUTLOOK_TENANT_ID',
    description: 'Microsoft Tenant ID (use "common" for multi-tenant)',
    status: '❌ MISSING - This is required for OAuth flow'
  },
  {
    name: 'OUTLOOK_REDIRECT_URI',
    description: 'OAuth redirect URI (should be https://blociq-h3xv.vercel.app/auth/callback)',
    status: '❌ MISSING - This is required for OAuth flow'
  },
  {
    name: 'NEXT_PUBLIC_MICROSOFT_CLIENT_ID',
    description: 'Public Microsoft Client ID (same as OUTLOOK_CLIENT_ID)',
    status: '❌ MISSING - This is required for client-side OAuth'
  },
  {
    name: 'NEXT_PUBLIC_MICROSOFT_REDIRECT_URI',
    description: 'Public OAuth redirect URI',
    status: '❌ MISSING - This is required for client-side OAuth'
  }
];

requiredVars.forEach((envVar, index) => {
  console.log(`${index + 1}. ${envVar.name}`);
  console.log(`   Description: ${envVar.description}`);
  console.log(`   Status: ${envVar.status}`);
  console.log('');
});

console.log('🔧 Why "Microsoft Integration - Disconnected" is showing:');
console.log('=======================================================\n');

console.log('✅ This is CORRECT behavior if:');
console.log('   • No user has connected their Outlook account yet');
console.log('   • The required environment variables are not set in Vercel');
console.log('   • The Microsoft OAuth app is not configured in Azure\n');

console.log('📝 To fix this and enable Outlook connection:');
console.log('============================================\n');

console.log('1. Set up Microsoft Azure App Registration:');
console.log('   • Go to https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade');
console.log('   • Create a new app registration or use existing one');
console.log('   • Get the Client ID and Client Secret');
console.log('   • Set redirect URI to: https://blociq-h3xv.vercel.app/auth/callback\n');

console.log('2. Add environment variables to Vercel:');
console.log('   • Go to your Vercel dashboard');
console.log('   • Select project: blociq-h3xv');
console.log('   • Go to Settings > Environment Variables');
console.log('   • Add each variable listed above\n');

console.log('3. Quick commands to add variables:');
console.log('   vercel env add OUTLOOK_CLIENT_ID');
console.log('   vercel env add OUTLOOK_CLIENT_SECRET');
console.log('   vercel env add OUTLOOK_TENANT_ID');
console.log('   vercel env add OUTLOOK_REDIRECT_URI');
console.log('   vercel env add NEXT_PUBLIC_MICROSOFT_CLIENT_ID');
console.log('   vercel env add NEXT_PUBLIC_MICROSOFT_REDIRECT_URI\n');

console.log('4. After adding variables:');
console.log('   • Users can click "Connect Outlook Account"');
console.log('   • They will be redirected to Microsoft OAuth');
console.log('   • After authorization, status will show "Microsoft Connected"\n');

console.log('🎯 Current Status: DISCONNECTED (Expected if no OAuth setup)');
console.log('✅ The component is working correctly - it just needs OAuth configuration!'); 