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

/**
 * Initialize Google Document AI client using environment variables
 */
function initializeClient() {
  try {
    // Parse credentials from environment variable
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!credentialsJson) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable is not set');
    }

    const credentials = JSON.parse(credentialsJson);
    
    // Validate required credential fields
    const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
    for (const field of requiredFields) {
      if (!credentials[field]) {
        throw new Error(`Missing required credential field: ${field}`);
      }
    }

    console.log('✅ Parsed Google Cloud credentials');
    console.log(`📧 Service Account: ${credentials.client_email}`);
    console.log(`🆔 Project ID: ${credentials.project_id}`);

    // Initialize the client
    const client = new DocumentProcessorServiceClient({
      credentials: credentials,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || credentials.project_id
    });

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