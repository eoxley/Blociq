require('dotenv').config({ path: '.env.local' });

console.log('🔍 Checking Outlook environment variables...\n');

const outlookEnvVars = [
  // Variables used in lib/outlook.ts
  'MICROSOFT_CLIENT_ID',
  'MICROSOFT_CLIENT_SECRET', 
  'MICROSOFT_REDIRECT_URI',
  'NEXT_PUBLIC_MICROSOFT_REDIRECT_URI',
  'AZURE_TENANT_ID',
  
  // Variables used in other files
  'NEXT_PUBLIC_OUTLOOK_CLIENT_ID',
  'NEXT_PUBLIC_OUTLOOK_REDIRECT_URI',
  'OUTLOOK_CLIENT_ID',
  'OUTLOOK_CLIENT_SECRET',
  'OUTLOOK_REDIRECT_URI',
  'OUTLOOK_TENANT_ID'
];

console.log('📋 Environment Variables Status:');
let allConfigured = true;

outlookEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (value) {
    console.log(`✅ ${envVar}: ${value.substring(0, 20)}...`);
  } else {
    console.log(`❌ ${envVar}: Not set`);
    allConfigured = false;
  }
});

console.log('\n🔧 Analysis:');
console.log('The exchangeCodeForTokens function uses:');
console.log('- MICROSOFT_CLIENT_ID');
console.log('- MICROSOFT_CLIENT_SECRET');
console.log('- MICROSOFT_REDIRECT_URI');
console.log('- NEXT_PUBLIC_MICROSOFT_REDIRECT_URI');
console.log('- AZURE_TENANT_ID');

console.log('\nBut we checked for:');
console.log('- OUTLOOK_CLIENT_ID');
console.log('- OUTLOOK_CLIENT_SECRET');
console.log('- OUTLOOK_REDIRECT_URI');
console.log('- OUTLOOK_TENANT_ID');

console.log('\n📝 Missing variables that need to be added to .env.local:');
const missingVars = outlookEnvVars.filter(envVar => !process.env[envVar]);
missingVars.forEach(envVar => {
  console.log(`   - ${envVar}`);
});

if (missingVars.length === 0) {
  console.log('   ✅ All variables are configured!');
}
