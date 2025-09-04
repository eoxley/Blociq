#!/usr/bin/env node

/**
 * 🔐 Microsoft OAuth Configuration Setup
 * 
 * This script helps configure Microsoft OAuth for BlocIQ
 * Fix for: "Microsoft OAuth invalid client secret error for app 03d6ee20-cbe3-4d98-867c-084b0419fd96"
 */

console.log('🔐 Microsoft OAuth Configuration Setup for BlocIQ');
console.log('==================================================');
console.log('');

console.log('❌ CURRENT ISSUE: Microsoft OAuth invalid client secret error');
console.log('🎯 APP ID: 03d6ee20-cbe3-4d98-867c-084b0419fd96');
console.log('');

console.log('🔧 SOLUTION STEPS:');
console.log('');

console.log('1️⃣ VERIFY MICROSOFT AZURE APP REGISTRATION:');
console.log('   • Go to: https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade');
console.log('   • Find app: 03d6ee20-cbe3-4d98-867c-084b0419fd96');
console.log('   • Check if app exists and you have access');
console.log('');

console.log('2️⃣ GENERATE NEW CLIENT SECRET:');
console.log('   • In Azure Portal → App Registration → Certificates & secrets');
console.log('   • Click "+ New client secret"');
console.log('   • Description: "BlocIQ Production Secret"');
console.log('   • Expires: 24 months');
console.log('   • COPY the secret value immediately (it won\'t show again!)');
console.log('');

console.log('3️⃣ UPDATE VERCEL ENVIRONMENT VARIABLES:');
console.log('   Run these commands with your actual values:');
console.log('');
console.log('   vercel env add OUTLOOK_CLIENT_ID');
console.log('   → Enter: 03d6ee20-cbe3-4d98-867c-084b0419fd96');
console.log('');
console.log('   vercel env add OUTLOOK_CLIENT_SECRET');
console.log('   → Enter: [your_new_client_secret_from_step_2]');
console.log('');
console.log('   vercel env add OUTLOOK_TENANT_ID');
console.log('   → Enter: common (for multi-tenant)');
console.log('');
console.log('   vercel env add OUTLOOK_REDIRECT_URI');
console.log('   → Enter: https://www.blociq.co.uk/auth/callback');
console.log('');
console.log('   vercel env add NEXT_PUBLIC_MICROSOFT_CLIENT_ID');
console.log('   → Enter: 03d6ee20-cbe3-4d98-867c-084b0419fd96');
console.log('');
console.log('   vercel env add NEXT_PUBLIC_MICROSOFT_REDIRECT_URI');
console.log('   → Enter: https://www.blociq.co.uk/auth/callback');
console.log('');

console.log('4️⃣ UPDATE AZURE APP REDIRECT URIS:');
console.log('   • In Azure Portal → App Registration → Authentication');
console.log('   • Add redirect URI: https://www.blociq.co.uk/auth/callback');
console.log('   • Platform type: Web');
console.log('   • Enable: ID tokens, Access tokens');
console.log('');

console.log('5️⃣ SET API PERMISSIONS:');
console.log('   • In Azure Portal → App Registration → API permissions');
console.log('   • Add Microsoft Graph permissions:');
console.log('     - Mail.Read (Delegated)');
console.log('     - Mail.Send (Delegated)');
console.log('     - User.Read (Delegated)');
console.log('   • Click "Grant admin consent"');
console.log('');

console.log('6️⃣ REDEPLOY:');
console.log('   git add . && git commit -m "Fix: Microsoft OAuth configuration" && git push');
console.log('');

console.log('🚀 AFTER COMPLETION:');
console.log('   • Users can connect Outlook accounts');
console.log('   • OAuth flow will work correctly');
console.log('   • No more "invalid client secret" errors');
console.log('');

console.log('🔍 VERIFICATION:');
console.log('   • Test OAuth at: https://www.blociq.co.uk/inbox-overview');
console.log('   • Click "Connect Outlook Account"');
console.log('   • Should redirect to Microsoft login');
console.log('');

console.log('⚠️  SECURITY NOTES:');
console.log('   • Never commit client secrets to git');
console.log('   • Use Vercel environment variables only');
console.log('   • Rotate secrets every 24 months');
console.log('');

console.log('✅ This will fix the Microsoft OAuth invalid client secret error!');