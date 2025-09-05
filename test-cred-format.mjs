#!/usr/bin/env node

/**
 * Test Google Cloud credentials formatting
 * This helps debug authentication issues locally
 */

import { DocumentProcessorServiceClient } from '@google-cloud/documentai';

function testCredentialsFormatting() {
  try {
    console.log('🧪 Testing Google Cloud credentials formatting...\n');
    
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!credentialsJson) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable is not set');
    }

    console.log('1. Original JSON length:', credentialsJson.length);
    console.log('2. Contains \\\\n escaped newlines:', credentialsJson.includes('\\n'));
    
    // Fix escaped newlines
    const fixedCredentialsJson = credentialsJson.replace(/\\n/g, '\n');
    console.log('3. After newline fix length:', fixedCredentialsJson.length);
    
    // Parse JSON
    const credentials = JSON.parse(fixedCredentialsJson);
    console.log('4. ✅ JSON parsed successfully');
    
    // Check private key
    if (credentials.private_key) {
      const privateKey = credentials.private_key
        .replace(/\\n/g, '\n')
        .replace(/\n\n+/g, '\n')
        .trim();
      
      console.log('5. Private key length:', privateKey.length);
      console.log('6. Has BEGIN marker:', privateKey.includes('-----BEGIN PRIVATE KEY-----'));
      console.log('7. Has END marker:', privateKey.includes('-----END PRIVATE KEY-----'));
      console.log('8. First 50 chars:', privateKey.substring(0, 50));
      console.log('9. Last 50 chars:', privateKey.substring(privateKey.length - 50));
      
      // Update credentials with fixed private key
      credentials.private_key = privateKey;
    }
    
    // Test client initialization
    console.log('\n10. 🧪 Testing Document AI client initialization...');
    const client = new DocumentProcessorServiceClient({
      credentials: credentials,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || credentials.project_id
    });
    
    console.log('11. ✅ Document AI client initialized successfully!');
    console.log('12. 📧 Service Account:', credentials.client_email);
    console.log('13. 🆔 Project ID:', credentials.project_id);
    
    return true;
    
  } catch (error) {
    console.error('❌ Credential formatting test failed:');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);
    
    if (error.message.includes('DECODER')) {
      console.error('\n🔧 DECODER Error Solutions:');
      console.error('   • Private key may have incorrect line breaks');
      console.error('   • Try regenerating the service account key');
      console.error('   • Ensure no extra escaping in environment variable');
    }
    
    return false;
  }
}

// Run the test
if (testCredentialsFormatting()) {
  console.log('\n🎉 All tests passed! Credentials should work in production.');
  process.exit(0);
} else {
  console.log('\n💥 Tests failed. Fix credentials before deploying.');
  process.exit(1);
}