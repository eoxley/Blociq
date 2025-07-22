#!/usr/bin/env node

const { execSync } = require('child_process');

// The CRON_SECRET that was generated
const CRON_SECRET = 'ffd6644f3818d1d3b075baaa965d3220e357b5ec8ddba11fbee1c13a893043bd';

console.log('🔧 Adding environment variables to Vercel...\n');

// Function to add environment variable
const addEnvVar = (name, value, environments = ['production', 'preview', 'development']) => {
  try {
    console.log(`Adding ${name}...`);
    
    // Create the command
    const envList = environments.join(',');
    const command = `echo "${value}" | vercel env add ${name} ${environments.join(' ')}`;
    
    console.log(`Command: ${command}`);
    console.log(`Value: ${value}`);
    console.log(`Environments: ${envList}`);
    console.log('');
    
    // Note: This would require interactive input, so we'll just show the commands
    console.log(`📝 To add ${name}, run:`);
    console.log(`vercel env add ${name}`);
    console.log(`Then enter: ${value}`);
    console.log(`Then select: ${envList}`);
    console.log('');
    
  } catch (error) {
    console.error(`❌ Failed to add ${name}:`, error.message);
  }
};

// Add the variables that we can set automatically
console.log('✅ Ready to add environment variables!\n');

console.log('1. CRON_SECRET (Auto-generated):');
console.log(`   Value: ${CRON_SECRET}`);
console.log('   Run: vercel env add CRON_SECRET');
console.log('   Enter the value above when prompted');
console.log('   Select: Production, Preview, Development');
console.log('');

console.log('2. NEXT_PUBLIC_SITE_URL:');
console.log('   Value: https://blociq-h3xv.vercel.app');
console.log('   Run: vercel env add NEXT_PUBLIC_SITE_URL');
console.log('   Enter: https://blociq-h3xv.vercel.app');
console.log('   Select: Production, Preview, Development');
console.log('');

console.log('3. OUTLOOK_TENANT_ID:');
console.log('   Value: common');
console.log('   Run: vercel env add OUTLOOK_TENANT_ID');
console.log('   Enter: common');
console.log('   Select: Production, Preview, Development');
console.log('');

console.log('4. OUTLOOK_REDIRECT_URI:');
console.log('   Value: https://blociq-h3xv.vercel.app/auth/callback');
console.log('   Run: vercel env add OUTLOOK_REDIRECT_URI');
console.log('   Enter: https://blociq-h3xv.vercel.app/auth/callback');
console.log('   Select: Production, Preview, Development');
console.log('');

console.log('5. NEXT_PUBLIC_MICROSOFT_REDIRECT_URI:');
console.log('   Value: https://blociq-h3xv.vercel.app/auth/callback');
console.log('   Run: vercel env add NEXT_PUBLIC_MICROSOFT_REDIRECT_URI');
console.log('   Enter: https://blociq-h3xv.vercel.app/auth/callback');
console.log('   Select: Production, Preview, Development');
console.log('');

console.log('⚠️  You still need to manually add these variables:');
console.log('- OUTLOOK_CLIENT_ID (from Microsoft Azure)');
console.log('- OUTLOOK_CLIENT_SECRET (from Microsoft Azure)');
console.log('- NEXT_PUBLIC_MICROSOFT_CLIENT_ID (same as OUTLOOK_CLIENT_ID)');
console.log('- NEXT_PUBLIC_SUPABASE_URL (from Supabase)');
console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY (from Supabase)');
console.log('- SUPABASE_SERVICE_ROLE_KEY (from Supabase)');
console.log('');

console.log('🚀 Quick start commands:');
console.log('vercel env add CRON_SECRET');
console.log('vercel env add NEXT_PUBLIC_SITE_URL');
console.log('vercel env add OUTLOOK_TENANT_ID');
console.log('vercel env add OUTLOOK_REDIRECT_URI');
console.log('vercel env add NEXT_PUBLIC_MICROSOFT_REDIRECT_URI'); 