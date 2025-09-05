#!/usr/bin/env node

/**
 * Create Google Document AI Processor for Lease Documents
 * 
 * This script creates a Document AI processor specifically optimized for lease documents.
 * It uses environment variables for authentication and can run locally or on Vercel.
 * 
 * Required Environment Variables:
 * - GOOGLE_APPLICATION_CREDENTIALS_JSON: Full JSON service account credentials
 * - GOOGLE_CLOUD_PROJECT_ID: Google Cloud project ID (blociq-vision-ocr)
 * - DOCUMENT_AI_LOCATION: Location for processor (us)
 */

import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import fs from 'fs';

/**
 * Extract position number from JSON parse error message
 */
function extractPositionFromError(error) {
  const match = error.message.match(/position (\d+)/);
  return match ? match[1] : 'unknown';
}

/**
 * Manual JSON reconstruction for severely corrupted credentials
 * This handles cases where standard parsing completely fails
 */
function reconstructJsonFromCorrupted(corruptedJson) {
  console.log('🔧 Attempting manual JSON reconstruction...');
  
  // Extract key components using regex patterns
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
  
  // Extract each field
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = corruptedJson.match(pattern);
    if (match) {
      let value = match[1];
      
      // Special handling for private_key
      if (key === 'private_key') {
        value = value.replace(/\\n/g, '\n');
      }
      
      reconstructed[key] = value;
    }
  }
  
  // Validate required fields
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
 * Initialize Google Document AI client using environment variables
 */
function initializeClient() {
  try {
    // Try multiple credential sources
    let credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    let credentials;

    // Method 1: Direct JSON string with comprehensive character fixes
    if (credentialsJson) {
      try {
        // Apply multiple parsing strategies for Vercel environment variables
        let cleanedJson = credentialsJson;
        
        // Strategy 1: Fix common escaping issues from environment variables
        cleanedJson = cleanedJson
          .replace(/\\n/g, '\n')           // Fix escaped newlines
          .replace(/\\"/g, '"')            // Fix escaped quotes  
          .replace(/\\\\/g, '\\')          // Fix double backslashes
          .replace(/\\t/g, '\t')           // Fix escaped tabs
          .replace(/\\r/g, '\r');          // Fix escaped carriage returns
        
        credentials = JSON.parse(cleanedJson);
        console.log('✅ Using direct JSON credentials (Strategy 1)');
      } catch (jsonError) {
        console.log(`⚠️  Strategy 1 failed at position ${extractPositionFromError(jsonError)}, trying Strategy 2...`);
        
        try {
          // Strategy 2: Character-by-character cleaning for corrupted JSON
          let sanitizedJson = '';
          for (let i = 0; i < credentialsJson.length; i++) {
            const char = credentialsJson[i];
            const charCode = char.charCodeAt(0);
            
            // Skip control characters except newlines, tabs, and carriage returns
            if (charCode < 32 && charCode !== 9 && charCode !== 10 && charCode !== 13) {
              continue;
            }
            
            // Fix specific problematic characters that appear in position 162 area
            if (charCode === 8232 || charCode === 8233) { // Line separator, paragraph separator
              sanitizedJson += '\n';
            } else if (charCode === 160) { // Non-breaking space
              sanitizedJson += ' ';
            } else {
              sanitizedJson += char;
            }
          }
          
          // Apply basic escaping fixes
          sanitizedJson = sanitizedJson.replace(/\\n/g, '\n');
          credentials = JSON.parse(sanitizedJson);
          console.log('✅ Using direct JSON credentials (Strategy 2 - Character sanitized)');
        } catch (sanitizeError) {
          console.log('⚠️  Strategy 2 failed, trying Base64...');
          
          // Strategy 3: Base64 encoded JSON
          try {
            const decodedJson = Buffer.from(credentialsJson, 'base64').toString('utf-8');
            const fixedDecodedJson = decodedJson.replace(/\\n/g, '\n');
            credentials = JSON.parse(fixedDecodedJson);
            console.log('✅ Using Base64 decoded credentials');
          } catch (base64Error) {
            // Strategy 4: Manual JSON reconstruction as last resort
            try {
              credentials = reconstructJsonFromCorrupted(credentialsJson);
              console.log('✅ Using reconstructed JSON credentials (Strategy 4)');
            } catch (reconstructError) {
              throw new Error(`All parsing strategies failed. Original: ${jsonError.message}, Sanitized: ${sanitizeError.message}, Base64: ${base64Error.message}, Reconstruct: ${reconstructError.message}`);
            }
          }
        }
      }
    } else {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable is not set');
    }
    
    // Validate required credential fields
    const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
    for (const field of requiredFields) {
      if (!credentials[field]) {
        throw new Error(`Missing required credential field: ${field}`);
      }
    }

    // Fix private key formatting - ensure proper line breaks and remove extra escaping
    if (credentials.private_key) {
      credentials.private_key = credentials.private_key
        .replace(/\\n/g, '\n')  // Convert escaped newlines to actual newlines
        .replace(/\n\n+/g, '\n')  // Remove multiple consecutive newlines
        .trim();  // Remove leading/trailing whitespace
      
      // Ensure the private key has proper BEGIN/END markers
      if (!credentials.private_key.includes('-----BEGIN PRIVATE KEY-----')) {
        console.warn('⚠️  Private key may be missing BEGIN/END markers');
      }
    }

    console.log('✅ Parsed Google Cloud credentials');
    console.log(`📧 Service Account: ${credentials.client_email}`);
    console.log(`🆔 Project ID: ${credentials.project_id}`);

    // Initialize the client with multiple fallback methods
    let client;
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || credentials.project_id;

    // Method 1: Direct credentials object
    try {
      client = new DocumentProcessorServiceClient({
        credentials: credentials,
        projectId: projectId
      });
      console.log('✅ Client initialized with direct credentials');
    } catch (directError) {
      console.log('⚠️  Direct credentials failed, trying alternative method...');
      
      // Method 2: Using keyFilename approach (write temp file)
      try {
        const tempKeyFile = '/tmp/google-credentials.json';
        fs.writeFileSync(tempKeyFile, JSON.stringify(credentials, null, 2));
        
        client = new DocumentProcessorServiceClient({
          keyFilename: tempKeyFile,
          projectId: projectId
        });
        console.log('✅ Client initialized with temporary key file');
      } catch (keyFileError) {
        throw new Error(`All authentication methods failed. Direct: ${directError.message}, KeyFile: ${keyFileError.message}`);
      }
    }

    return client;
  } catch (error) {
    console.error('❌ Failed to initialize Document AI client:', error.message);
    throw error;
  }
}

/**
 * Create a Document AI processor for lease documents
 */
async function createLeaseProcessor() {
  console.log('🚀 Creating Document AI processor for lease documents...\n');

  try {
    // Validate environment variables
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const location = process.env.DOCUMENT_AI_LOCATION || 'us';

    if (!projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is required');
    }

    console.log(`📋 Configuration:`);
    console.log(`   Project: ${projectId}`);
    console.log(`   Location: ${location}\n`);

    // Initialize client
    const client = initializeClient();

    // Create processor configuration
    const parent = client.locationPath(projectId, location);
    
    const processor = {
      displayName: 'BlocIQ Lease Document Processor',
      type: 'FORM_PARSER_PROCESSOR', // Best for structured documents like leases
      defaultProcessorVersion: {
        // Additional configuration can be added here
      }
    };

    console.log('🔨 Creating processor with configuration:');
    console.log(`   Display Name: ${processor.displayName}`);
    console.log(`   Type: ${processor.type}`);
    console.log(`   Parent: ${parent}\n`);

    // Create the processor
    const [operation] = await client.createProcessor({
      parent: parent,
      processor: processor,
    });

    console.log('⏳ Waiting for processor creation to complete...');
    
    // Wait for the operation to complete
    const [response] = await operation.promise();
    
    // Extract processor ID from the response name
    const processorId = response.name.split('/').pop();
    
    console.log('\n🎉 SUCCESS! Document AI processor created successfully!\n');
    
    console.log('📝 Processor Details:');
    console.log(`   Name: ${response.displayName}`);
    console.log(`   Full Name: ${response.name}`);
    console.log(`   Type: ${response.type}`);
    console.log(`   State: ${response.state}`);
    console.log(`   Create Time: ${response.createTime?.seconds ? new Date(response.createTime.seconds * 1000).toISOString() : 'N/A'}\n`);
    
    console.log('🔑 PROCESSOR ID (add this to your environment variables):');
    console.log('=' .repeat(60));
    console.log(`DOCUMENT_AI_PROCESSOR_ID=${processorId}`);
    console.log('=' .repeat(60));
    
    console.log('\n📋 Next Steps:');
    console.log('1. Add DOCUMENT_AI_PROCESSOR_ID to your Vercel environment variables');
    console.log('2. Redeploy your application to use the new processor');
    console.log('3. Test OCR functionality with lease documents');
    
    return {
      processorId,
      fullName: response.name,
      displayName: response.displayName,
      type: response.type,
      state: response.state
    };

  } catch (error) {
    console.error('\n❌ FAILED to create Document AI processor:');
    console.error(`   Error: ${error.message}`);
    
    if (error.code) {
      console.error(`   Code: ${error.code}`);
    }
    
    if (error.details) {
      console.error(`   Details: ${error.details}`);
    }
    
    // Common error solutions
    console.log('\n🔧 Common Solutions:');
    console.log('• Ensure Document AI API is enabled in Google Cloud Console');
    console.log('• Verify service account has Document AI Admin role');
    console.log('• Check that GOOGLE_APPLICATION_CREDENTIALS_JSON is valid JSON');
    console.log('• Confirm project ID and location are correct');
    
    throw error;
  }
}

/**
 * List existing processors (helpful for debugging)
 */
async function listExistingProcessors() {
  try {
    const client = initializeClient();
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const location = process.env.DOCUMENT_AI_LOCATION || 'us';
    
    const parent = client.locationPath(projectId, location);
    const [processors] = await client.listProcessors({ parent });
    
    console.log('\n📋 Existing processors:');
    if (processors.length === 0) {
      console.log('   No processors found');
    } else {
      processors.forEach((processor, index) => {
        const processorId = processor.name.split('/').pop();
        console.log(`   ${index + 1}. ${processor.displayName} (ID: ${processorId})`);
        console.log(`      Type: ${processor.type}`);
        console.log(`      State: ${processor.state}`);
      });
    }
    
    return processors;
  } catch (error) {
    console.error('❌ Failed to list existing processors:', error.message);
    return [];
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🏢 BlocIQ Document AI Processor Creator');
  console.log('=====================================\n');
  
  try {
    // List existing processors first
    await listExistingProcessors();
    
    // Create the new processor
    const result = await createLeaseProcessor();
    
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n💥 Script failed with error:', error.message);
    process.exit(1);
  }
}

// Export for use as module
export {
  createLeaseProcessor,
  listExistingProcessors,
  initializeClient
};

// Run directly if called as main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}