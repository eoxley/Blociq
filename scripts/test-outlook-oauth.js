require('dotenv').config({ path: '.env.local' });

console.log('🧪 Testing Outlook OAuth Configuration...\n');

// Test 1: Check environment variables
console.log('1️⃣ Environment Variables:');
const requiredVars = [
  'MICROSOFT_CLIENT_ID',
  'MICROSOFT_CLIENT_SECRET',
  'MICROSOFT_REDIRECT_URI',
  'NEXT_PUBLIC_MICROSOFT_REDIRECT_URI',
  'AZURE_TENANT_ID'
];

let allVarsPresent = true;
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`   ✅ ${varName}: ${value.substring(0, 20)}...`);
  } else {
    console.log(`   ❌ ${varName}: Missing`);
    allVarsPresent = false;
  }
});

if (!allVarsPresent) {
  console.log('\n❌ Some environment variables are missing. OAuth will not work.');
  process.exit(1);
}

// Test 2: Generate OAuth URL
console.log('\n2️⃣ OAuth URL Generation:');
const clientId = process.env.MICROSOFT_CLIENT_ID;
const redirectUri = process.env.MICROSOFT_REDIRECT_URI;
const tenantId = process.env.AZURE_TENANT_ID || '6c00dc8f-a9ab-4339-a17d-437869997312';
const scope = 'openid profile email offline_access Mail.Read Mail.Send Calendars.Read Calendars.ReadWrite';

const authUrl = new URL(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`);
authUrl.searchParams.set('client_id', clientId);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('redirect_uri', redirectUri);
authUrl.searchParams.set('scope', scope);
authUrl.searchParams.set('state', 'test-state');
authUrl.searchParams.set('response_mode', 'query');

console.log(`   ✅ OAuth URL: ${authUrl.toString()}`);

// Test 3: Check redirect URI format
console.log('\n3️⃣ Redirect URI Validation:');
if (redirectUri.startsWith('https://')) {
  console.log('   ✅ Redirect URI uses HTTPS');
} else {
  console.log('   ⚠️ Redirect URI should use HTTPS for production');
}

if (redirectUri.includes('/api/auth/outlook/callback')) {
  console.log('   ✅ Redirect URI points to correct callback endpoint');
} else {
  console.log('   ❌ Redirect URI should point to /api/auth/outlook/callback');
}

// Test 4: Check tenant ID
console.log('\n4️⃣ Tenant Configuration:');
console.log(`   ✅ Tenant ID: ${tenantId}`);
if (tenantId === 'common') {
  console.log('   ℹ️ Using common tenant (multi-tenant)');
} else {
  console.log('   ℹ️ Using specific tenant ID');
}

console.log('\n🎉 Outlook OAuth Configuration Test Complete!');
console.log('\n📝 Next Steps:');
console.log('1. Eleanor should go to the homepage');
console.log('2. Click "Connect Outlook Calendar" button');
console.log('3. Complete the Microsoft OAuth flow');
console.log('4. The token exchange should now work with the fixed endpoint');

console.log('\n🔗 Test OAuth URL (for manual testing):');
console.log(authUrl.toString());
