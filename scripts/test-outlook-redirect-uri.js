require('dotenv').config({ path: '.env.local' });

console.log('🔍 Testing Outlook OAuth Redirect URI Configuration...\n');

// Check all redirect URI environment variables
const redirectUris = [
  'MICROSOFT_REDIRECT_URI',
  'NEXT_PUBLIC_MICROSOFT_REDIRECT_URI', 
  'OUTLOOK_REDIRECT_URI',
  'NEXT_PUBLIC_OUTLOOK_REDIRECT_URI'
];

console.log('📋 Environment Variables:');
redirectUris.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value}`);
  } else {
    console.log(`❌ ${varName}: Not set`);
  }
});

console.log('\n🔧 OAuth URL Generation Test:');
const clientId = process.env.MICROSOFT_CLIENT_ID;
const redirectUri = process.env.MICROSOFT_REDIRECT_URI;
const tenantId = process.env.AZURE_TENANT_ID || '6c00dc8f-a9ab-4339-a17d-437869997312';

if (clientId && redirectUri) {
  const scope = 'openid profile email offline_access Mail.Read Mail.Send Calendars.Read Calendars.ReadWrite';
  const state = 'test-state';
  
  const authUrl = new URL(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('response_mode', 'query');
  
  console.log('✅ Generated OAuth URL:');
  console.log(authUrl.toString());
  
  console.log('\n📝 Token Exchange Parameters:');
  const params = new URLSearchParams();
  params.append('client_id', clientId.trim());
  params.append('client_secret', process.env.MICROSOFT_CLIENT_SECRET?.trim() || 'HIDDEN');
  params.append('grant_type', 'authorization_code');
  params.append('code', 'test-code');
  params.append('redirect_uri', redirectUri.trim());
  
  console.log('✅ Token exchange parameters:');
  console.log(params.toString());
  
  console.log('\n🔍 Analysis:');
  console.log('The error shows:');
  console.log('❌ OAuth initiation uses: https://www.blociq.co.uk/api/auth/outlook/callback');
  console.log('❌ Token exchange uses: https://blociq.co.uk/api/auth/outlook/callback');
  console.log('');
  console.log('But our environment variables show:');
  console.log(`✅ MICROSOFT_REDIRECT_URI: ${redirectUri}`);
  console.log('');
  console.log('This suggests the Microsoft OAuth app registration has:');
  console.log('❌ Wrong redirect URI: https://blociq.co.uk/api/auth/outlook/callback (without www)');
  console.log('✅ Should be: https://www.blociq.co.uk/api/auth/outlook/callback (with www)');
  
} else {
  console.log('❌ Missing required environment variables');
}

console.log('\n🔧 Solution:');
console.log('1. Go to Azure Portal (portal.azure.com)');
console.log('2. Navigate to Azure Active Directory > App registrations');
console.log('3. Find your BlocIQ app registration');
console.log('4. Go to Authentication > Redirect URIs');
console.log('5. Update the redirect URI to: https://www.blociq.co.uk/api/auth/outlook/callback');
console.log('6. Save the changes');
console.log('7. Try the Outlook connection again');
