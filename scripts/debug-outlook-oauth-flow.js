#!/usr/bin/env node

/**
 * Debug Outlook OAuth Flow
 * This script tests the actual OAuth flow to identify where the redirect URI mismatch occurs
 */

require('dotenv').config({ path: '.env.local' });

console.log('🔍 Debugging Outlook OAuth Flow...\n');

// Check environment variables
console.log('📋 Environment Variables:');
console.log('MICROSOFT_CLIENT_ID:', process.env.MICROSOFT_CLIENT_ID ? '✅ Set' : '❌ Missing');
console.log('MICROSOFT_CLIENT_SECRET:', process.env.MICROSOFT_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
console.log('MICROSOFT_REDIRECT_URI:', process.env.MICROSOFT_REDIRECT_URI);
console.log('NEXT_PUBLIC_MICROSOFT_CLIENT_ID:', process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID);
console.log('NEXT_PUBLIC_MICROSOFT_REDIRECT_URI:', process.env.NEXT_PUBLIC_MICROSOFT_REDIRECT_URI);
console.log('AZURE_TENANT_ID:', process.env.AZURE_TENANT_ID || 'Using default');
console.log('');

// Test OAuth URL generation (server-side)
console.log('🔧 Server-side OAuth URL Generation:');
const clientId = process.env.MICROSOFT_CLIENT_ID?.trim();
const redirectUri = process.env.MICROSOFT_REDIRECT_URI?.trim();
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
  console.log('');
  
  // Test token exchange parameters
  console.log('📝 Token Exchange Parameters:');
  const params = new URLSearchParams();
  params.append('client_id', clientId.trim());
  params.append('client_secret', process.env.MICROSOFT_CLIENT_SECRET?.trim() || 'HIDDEN');
  params.append('grant_type', 'authorization_code');
  params.append('code', 'test-code');
  params.append('redirect_uri', redirectUri.trim());
  
  console.log('✅ Token exchange parameters:');
  console.log(params.toString());
  console.log('');
  
} else {
  console.log('❌ Missing required environment variables for server-side OAuth');
}

// Test client-side OAuth URL generation
console.log('🌐 Client-side OAuth URL Generation:');
const clientClientId = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID || process.env.NEXT_PUBLIC_OUTLOOK_CLIENT_ID;
const clientRedirectUri = process.env.NEXT_PUBLIC_MICROSOFT_REDIRECT_URI || process.env.NEXT_PUBLIC_OUTLOOK_REDIRECT_URI;
const clientTenantId = process.env.NEXT_PUBLIC_AZURE_TENANT_ID || 'common';

if (clientClientId && clientRedirectUri) {
  const scopes = [
    'https://graph.microsoft.com/Mail.Read',
    'https://graph.microsoft.com/Mail.Send',
    'https://graph.microsoft.com/Mail.ReadWrite',
    'https://graph.microsoft.com/Calendars.ReadWrite',
    'https://graph.microsoft.com/User.Read',
    'offline_access'
  ].join(' ');

  const clientAuthUrl = `https://login.microsoftonline.com/${clientTenantId}/oauth2/v2.0/authorize?` +
    `client_id=${encodeURIComponent(clientClientId)}&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(clientRedirectUri)}&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `response_mode=query&` +
    `state=${encodeURIComponent(JSON.stringify({ 
      userId: 'test-user-id', 
      returnUrl: '/inbox-overview',
      timestamp: Date.now()
    }))}`;

  console.log('✅ Generated client-side OAuth URL:');
  console.log(clientAuthUrl);
  console.log('');
  
} else {
  console.log('❌ Missing required environment variables for client-side OAuth');
}

// Analysis
console.log('🔍 Analysis:');
console.log('The error shows:');
console.log('❌ OAuth initiation uses: https://www.blociq.co.uk/api/auth/outlook/callback');
console.log('❌ Token exchange uses: https://blociq.co.uk/api/auth/outlook/callback');
console.log('');
console.log('But our environment variables show:');
console.log(`✅ MICROSOFT_REDIRECT_URI: ${redirectUri}`);
console.log(`✅ NEXT_PUBLIC_MICROSOFT_REDIRECT_URI: ${clientRedirectUri}`);
console.log('');

// Check if there are any hardcoded redirect URIs
console.log('🔍 Checking for hardcoded redirect URIs...');
const fs = require('fs');
const path = require('path');

function searchForHardcodedURIs(dir) {
  const files = fs.readdirSync(dir);
  const results = [];
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      results.push(...searchForHardcodedURIs(filePath));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('blociq.co.uk') && content.includes('callback')) {
          const lines = content.split('\n');
          lines.forEach((line, index) => {
            if (line.includes('blociq.co.uk') && line.includes('callback')) {
              results.push({
                file: filePath,
                line: index + 1,
                content: line.trim()
              });
            }
          });
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }
  }
  
  return results;
}

const hardcodedURIs = searchForHardcodedURIs('.');
if (hardcodedURIs.length > 0) {
  console.log('⚠️  Found hardcoded redirect URIs:');
  hardcodedURIs.forEach(result => {
    console.log(`   ${result.file}:${result.line} - ${result.content}`);
  });
} else {
  console.log('✅ No hardcoded redirect URIs found');
}

console.log('');
console.log('💡 Next Steps:');
console.log('1. Check if there are multiple OAuth flows being used');
console.log('2. Verify the actual OAuth flow being triggered in the browser');
console.log('3. Check browser network tab to see which redirect URI is actually being sent');
console.log('4. Test with a fresh browser session to avoid caching issues');
