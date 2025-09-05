#!/usr/bin/env node

/**
 * Test the enhanced JSON parsing fix for position 162 error
 * This script simulates the credential parsing to verify the fix works
 */

/**
 * Extract position number from JSON parse error message
 */
function extractPositionFromError(error) {
  const match = error.message.match(/position (\d+)/);
  return match ? match[1] : 'unknown';
}

/**
 * Manual JSON reconstruction for severely corrupted credentials
 */
function reconstructJsonFromCorrupted(corruptedJson) {
  console.log('🔧 Attempting manual JSON reconstruction...');
  
  const patterns = {
    type: /"type":\s*"([^"]+)"/,
    project_id: /"project_id":\s*"([^"]+)"/,
    private_key_id: /"private_key_id":\s*"([^"]+)"/,
    private_key: /"private_key":\s*"([^"]+)"/,
    client_email: /"client_email":\s*"([^"]+)"/,
    client_id: /"client_id":\s*"([^"]+)"/,
    auth_uri: /"auth_uri":\s*"([^"]+)"/,
    token_uri: /"token_uri":\s*"([^"]+)"/,
    auth_provider_x509_cert_url: /"auth_provider_x509_cert_url":\s*"([^"]+)"/,
    client_x509_cert_url: /"client_x509_cert_url":\s*"([^"]+)"/
  };
  
  const reconstructed = {};
  
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = corruptedJson.match(pattern);
    if (match) {
      let value = match[1];
      if (key === 'private_key') {
        value = value.replace(/\\n/g, '\n');
      }
      reconstructed[key] = value;
    }
  }
  
  const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
  for (const field of requiredFields) {
    if (!reconstructed[field]) {
      throw new Error(`Failed to extract required field: ${field}`);
    }
  }
  
  console.log('✅ Successfully reconstructed JSON from corrupted data');
  return reconstructed;
}

/**
 * Enhanced credential parsing with multiple fallback strategies
 */
function parseCredentialsWithFix(credentialsJson) {
  console.log('🔍 Testing enhanced JSON parsing...\n');
  
  if (!credentialsJson) {
    throw new Error('No credentials JSON provided');
  }
  
  console.log(`📊 Input length: ${credentialsJson.length} characters`);
  console.log(`📊 First 100 chars: ${credentialsJson.substring(0, 100)}...\n`);
  
  let credentials;
  
  try {
    // Strategy 1: Fix common escaping issues from environment variables
    let cleanedJson = credentialsJson
      .replace(/\\n/g, '\n')           // Fix escaped newlines
      .replace(/\\"/g, '"')            // Fix escaped quotes  
      .replace(/\\\\/g, '\\')          // Fix double backslashes
      .replace(/\\t/g, '\t')           // Fix escaped tabs
      .replace(/\\r/g, '\r');          // Fix escaped carriage returns
    
    credentials = JSON.parse(cleanedJson);
    console.log('✅ Strategy 1 (Basic escaping fixes) succeeded!');
    return credentials;
  } catch (jsonError) {
    console.log(`⚠️  Strategy 1 failed at position ${extractPositionFromError(jsonError)}`);
    console.log(`    Error: ${jsonError.message}\n`);
    
    try {
      // Strategy 2: Character-by-character cleaning
      let sanitizedJson = '';
      for (let i = 0; i < credentialsJson.length; i++) {
        const char = credentialsJson[i];
        const charCode = char.charCodeAt(0);
        
        // Skip control characters except newlines, tabs, and carriage returns
        if (charCode < 32 && charCode !== 9 && charCode !== 10 && charCode !== 13) {
          continue;
        }
        
        // Fix specific problematic characters
        if (charCode === 8232 || charCode === 8233) { // Line/paragraph separators
          sanitizedJson += '\n';
        } else if (charCode === 160) { // Non-breaking space
          sanitizedJson += ' ';
        } else {
          sanitizedJson += char;
        }
      }
      
      sanitizedJson = sanitizedJson.replace(/\\n/g, '\n');
      credentials = JSON.parse(sanitizedJson);
      console.log('✅ Strategy 2 (Character-by-character sanitization) succeeded!');
      return credentials;
    } catch (sanitizeError) {
      console.log(`⚠️  Strategy 2 failed: ${sanitizeError.message}\n`);
      
      try {
        // Strategy 3: Base64 decode attempt
        const decodedJson = Buffer.from(credentialsJson, 'base64').toString('utf-8');
        const fixedDecodedJson = decodedJson.replace(/\\n/g, '\n');
        credentials = JSON.parse(fixedDecodedJson);
        console.log('✅ Strategy 3 (Base64 decoding) succeeded!');
        return credentials;
      } catch (base64Error) {
        console.log(`⚠️  Strategy 3 failed: ${base64Error.message}\n`);
        
        try {
          // Strategy 4: Manual reconstruction
          credentials = reconstructJsonFromCorrupted(credentialsJson);
          console.log('✅ Strategy 4 (Manual reconstruction) succeeded!');
          return credentials;
        } catch (reconstructError) {
          console.log(`❌ All strategies failed!`);
          throw new Error(`All parsing strategies failed. Original: ${jsonError.message}, Sanitized: ${sanitizeError.message}, Base64: ${base64Error.message}, Reconstruct: ${reconstructError.message}`);
        }
      }
    }
  }
}

// Test the fix
async function main() {
  console.log('🧪 JSON Parsing Fix Tester');
  console.log('==========================\n');
  
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  
  if (!credentialsJson) {
    console.log('❌ No GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable found');
    console.log('   Set it to test the parsing fix');
    return;
  }
  
  try {
    const credentials = parseCredentialsWithFix(credentialsJson);
    
    console.log('\n🎉 SUCCESS! Credentials parsed successfully:');
    console.log(`   ✓ Type: ${credentials.type}`);
    console.log(`   ✓ Project ID: ${credentials.project_id}`);
    console.log(`   ✓ Client Email: ${credentials.client_email}`);
    console.log(`   ✓ Private Key: ${credentials.private_key ? 'Present' : 'Missing'}`);
    
    // Validate private key format
    if (credentials.private_key) {
      const hasBeginMarker = credentials.private_key.includes('-----BEGIN PRIVATE KEY-----');
      const hasEndMarker = credentials.private_key.includes('-----END PRIVATE KEY-----');
      console.log(`   ✓ Private Key Format: ${hasBeginMarker && hasEndMarker ? 'Valid' : 'Invalid'}`);
    }
    
    console.log('\n✅ The JSON parsing fix is working correctly!');
  } catch (error) {
    console.log(`\n❌ Test failed: ${error.message}`);
  }
}

main();