require('dotenv').config({ path: '.env.local' });

console.log('🧪 Testing Outlook Token Exchange Environment Variables...\n');

// Test the exact variables used in exchangeCodeForTokens
const requiredVars = [
  'MICROSOFT_CLIENT_ID',
  'MICROSOFT_CLIENT_SECRET', 
  'MICROSOFT_REDIRECT_URI',
  'AZURE_TENANT_ID'
];

console.log('📋 Environment Variables Check:');
let allPresent = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`   ✅ ${varName}: ${value.substring(0, 20)}...`);
    // Test .trim() method
    try {
      const trimmed = value.trim();
      console.log(`      ✅ .trim() works: "${trimmed.substring(0, 10)}..."`);
    } catch (error) {
      console.log(`      ❌ .trim() failed: ${error.message}`);
      allPresent = false;
    }
  } else {
    console.log(`   ❌ ${varName}: Missing`);
    allPresent = false;
  }
});

console.log('\n🔧 Testing Token Exchange Parameters:');
if (allPresent) {
  try {
    const params = new URLSearchParams();
    params.append('client_id', process.env.MICROSOFT_CLIENT_ID.trim());
    params.append('client_secret', process.env.MICROSOFT_CLIENT_SECRET.trim());
    params.append('grant_type', 'authorization_code');
    params.append('code', 'test-code');
    params.append('redirect_uri', process.env.MICROSOFT_REDIRECT_URI.trim());
    
    console.log('   ✅ URLSearchParams created successfully');
    console.log('   ✅ Parameters:', params.toString().substring(0, 100) + '...');
    
    const tenantId = process.env.AZURE_TENANT_ID || '6c00dc8f-a9ab-4339-a17d-437869997312';
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    console.log('   ✅ Token URL:', tokenUrl);
    
  } catch (error) {
    console.log('   ❌ Error creating parameters:', error.message);
    allPresent = false;
  }
}

console.log('\n📝 Summary:');
if (allPresent) {
  console.log('✅ All environment variables are present and working');
  console.log('✅ The .trim() error should be fixed');
  console.log('✅ Token exchange should now work');
} else {
  console.log('❌ Some environment variables are missing or invalid');
  console.log('❌ Token exchange will fail');
}

console.log('\n🔗 Next Steps:');
console.log('1. Eleanor should try connecting Outlook again');
console.log('2. The token exchange should now work without the .trim() error');
console.log('3. Check the browser console for any new error messages');
