#!/usr/bin/env node

console.log('🚀 QUICK ENVIRONMENT VARIABLE SETUP');
console.log('=====================================\n');

console.log('✅ The deployment issue has been fixed and pushed to GitHub!');
console.log('✅ Your next deployment should work successfully.\n');

console.log('📋 Now you need to add these environment variables to Vercel:\n');

console.log('1. CRON_SECRET');
console.log('   Value: ffd6644f3818d1d3b075baaa965d3220e357b5ec8ddba11fbee1c13a893043bd');
console.log('   Command: vercel env add CRON_SECRET');
console.log('   When prompted, enter the value above');
console.log('   Select: Production, Preview, Development\n');

console.log('2. NEXT_PUBLIC_SITE_URL');
console.log('   Value: https://blociq-h3xv.vercel.app');
console.log('   Command: vercel env add NEXT_PUBLIC_SITE_URL');
console.log('   When prompted, enter: https://blociq-h3xv.vercel.app');
console.log('   Select: Production, Preview, Development\n');

console.log('3. OUTLOOK_TENANT_ID');
console.log('   Value: common');
console.log('   Command: vercel env add OUTLOOK_TENANT_ID');
console.log('   When prompted, enter: common');
console.log('   Select: Production, Preview, Development\n');

console.log('4. OUTLOOK_REDIRECT_URI');
console.log('   Value: https://blociq-h3xv.vercel.app/auth/callback');
console.log('   Command: vercel env add OUTLOOK_REDIRECT_URI');
console.log('   When prompted, enter: https://blociq-h3xv.vercel.app/auth/callback');
console.log('   Select: Production, Preview, Development\n');

console.log('5. NEXT_PUBLIC_MICROSOFT_REDIRECT_URI');
console.log('   Value: https://blociq-h3xv.vercel.app/auth/callback');
console.log('   Command: vercel env add NEXT_PUBLIC_MICROSOFT_REDIRECT_URI');
console.log('   When prompted, enter: https://blociq-h3xv.vercel.app/auth/callback');
console.log('   Select: Production, Preview, Development\n');

console.log('⚠️  You still need to get these from external services:');
console.log('- OUTLOOK_CLIENT_ID (from Microsoft Azure)');
console.log('- OUTLOOK_CLIENT_SECRET (from Microsoft Azure)');
console.log('- NEXT_PUBLIC_MICROSOFT_CLIENT_ID (same as OUTLOOK_CLIENT_ID)');
console.log('- NEXT_PUBLIC_SUPABASE_URL (from Supabase)');
console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY (from Supabase)');
console.log('- SUPABASE_SERVICE_ROLE_KEY (from Supabase)\n');

console.log('🎯 Quick commands to run in your terminal:');
console.log('vercel env add CRON_SECRET');
console.log('vercel env add NEXT_PUBLIC_SITE_URL');
console.log('vercel env add OUTLOOK_TENANT_ID');
console.log('vercel env add OUTLOOK_REDIRECT_URI');
console.log('vercel env add NEXT_PUBLIC_MICROSOFT_REDIRECT_URI\n');

console.log('✅ After adding these, your deployment should work!'); 