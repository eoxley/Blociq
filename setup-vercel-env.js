#!/usr/bin/env node

const { execSync } = require('child_process');
const crypto = require('crypto');

// Generate a secure random string for CRON_SECRET
const generateCronSecret = () => {
  return crypto.randomBytes(32).toString('hex');
};

const requiredEnvVars = [
  {
    name: 'CRON_SECRET',
    value: generateCronSecret(),
    description: 'Secure secret for Vercel cron job authentication'
  },
  {
    name: 'NEXT_PUBLIC_SITE_URL',
    value: 'https://blociq-h3xv.vercel.app',
    description: 'Your Vercel deployment URL'
  },
  {
    name: 'OUTLOOK_CLIENT_ID',
    value: 'YOUR_MICROSOFT_CLIENT_ID',
    description: 'Microsoft OAuth Client ID'
  },
  {
    name: 'OUTLOOK_CLIENT_SECRET',
    value: 'YOUR_MICROSOFT_CLIENT_SECRET',
    description: 'Microsoft OAuth Client Secret'
  },
  {
    name: 'OUTLOOK_TENANT_ID',
    value: 'common',
    description: 'Microsoft Tenant ID (use "common" for multi-tenant)'
  },
  {
    name: 'OUTLOOK_REDIRECT_URI',
    value: 'https://blociq-h3xv.vercel.app/auth/callback',
    description: 'OAuth redirect URI'
  },
  {
    name: 'NEXT_PUBLIC_MICROSOFT_CLIENT_ID',
    value: 'YOUR_MICROSOFT_CLIENT_ID',
    description: 'Public Microsoft Client ID (same as OUTLOOK_CLIENT_ID)'
  },
  {
    name: 'NEXT_PUBLIC_MICROSOFT_REDIRECT_URI',
    value: 'https://blociq-h3xv.vercel.app/auth/callback',
    description: 'Public OAuth redirect URI'
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    value: 'YOUR_SUPABASE_URL',
    description: 'Supabase project URL'
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    value: 'YOUR_SUPABASE_ANON_KEY',
    description: 'Supabase anonymous key'
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    value: 'YOUR_SUPABASE_SERVICE_ROLE_KEY',
    description: 'Supabase service role key'
  }
];

console.log('🚀 Setting up Vercel environment variables...\n');

console.log('📋 Required Environment Variables:');
console.log('=====================================');

requiredEnvVars.forEach((envVar, index) => {
  console.log(`${index + 1}. ${envVar.name}`);
  console.log(`   Value: ${envVar.value}`);
  console.log(`   Description: ${envVar.description}`);
  console.log('');
});

console.log('⚠️  IMPORTANT: You need to manually add these environment variables to your Vercel project.');
console.log('');
console.log('📝 Instructions:');
console.log('1. Go to your Vercel dashboard: https://vercel.com/dashboard');
console.log('2. Select your project: blociq-h3xv');
console.log('3. Go to Settings > Environment Variables');
console.log('4. Add each variable above with the correct values');
console.log('');
console.log('🔑 For Microsoft OAuth setup:');
console.log('- Go to https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade');
console.log('- Create a new app registration or use existing one');
console.log('- Get the Client ID and Client Secret');
console.log('- Set redirect URI to: https://blociq-h3xv.vercel.app/auth/callback');
console.log('');
console.log('🗄️  For Supabase setup:');
console.log('- Go to your Supabase project dashboard');
console.log('- Get the URL and keys from Settings > API');
console.log('');
console.log('✅ After adding all variables, your deployment should work correctly!'); 