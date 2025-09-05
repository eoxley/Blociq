import { NextRequest, NextResponse } from 'next/server';

/**
 * Vercel Function to Create Document AI Processor
 * 
 * This is a one-time setup function that creates a Google Document AI processor
 * for lease document OCR. After running once, you can disable this endpoint.
 * 
 * Usage: POST /api/setup-document-ai
 */

export async function POST(request: NextRequest) {
  console.log('🚀 Starting Document AI processor setup with alternative authentication...');

  try {
    // Try alternative authentication methods first (bypasses private key issues)
    const { tryAlternativeAuth, createProcessorWithAPIKey, listProcessorsWithAPIKey } = await import('../../../lib/google-auth-alternatives');
    
    console.log('🔐 Testing alternative authentication methods...');
    const authResult = await tryAlternativeAuth();
    
    if (authResult.success) {
      console.log(`✅ Authentication successful using ${authResult.method}`);
      
      // Try to list existing processors first
      console.log('📋 Listing existing processors...');
      const existingProcessors = await listProcessorsWithAPIKey();
      
      // Check if processor already exists
      const existingLeaseProcessor = existingProcessors.find(
        (p: any) => p.displayName && (p.displayName.includes('Lease') || p.displayName.includes('BlocIQ'))
      );

      if (existingLeaseProcessor) {
        const processorId = existingLeaseProcessor.name.split('/').pop();
        
        return NextResponse.json({
          success: true,
          message: 'Document AI processor already exists',
          processorId,
          processorName: existingLeaseProcessor.displayName,
          existingProcessor: true,
          authMethod: authResult.method,
          instruction: `Use this processor ID in your environment variables: DOCUMENT_AI_PROCESSOR_ID=${processorId}`
        });
      }

      // Create new processor using API key method
      console.log('🔨 Creating new Document AI processor with alternative auth...');
      const result = await createProcessorWithAPIKey('BlocIQ Lease Document Processor');

      return NextResponse.json({
        success: true,
        message: 'Document AI processor created successfully with alternative authentication!',
        processorId: result.processorId,
        processorName: result.displayName,
        fullName: result.fullName,
        type: result.type,
        state: result.state,
        existingProcessor: false,
        authMethod: authResult.method,
        instruction: `Add this to your Vercel environment variables: DOCUMENT_AI_PROCESSOR_ID=${result.processorId}`,
        nextSteps: [
          'Add DOCUMENT_AI_PROCESSOR_ID to your Vercel environment variables',
          'Redeploy your application',
          'Test OCR functionality with lease documents',
          'Optionally disable this setup endpoint for security'
        ]
      });
    } else {
      // Fall back to original method if alternative auth fails
      console.log('⚠️  Alternative authentication failed, trying original service account method...');
      
      try {
        const processorModule = await import('../../../scripts/create-document-ai-processor.mjs');
        const { createLeaseProcessor, listExistingProcessors } = processorModule;

        const existingProcessors = await listExistingProcessors();
        const existingLeaseProcessor = existingProcessors.find(
          (p: any) => p.displayName.includes('Lease') || p.displayName.includes('BlocIQ')
        );

        if (existingLeaseProcessor) {
          const processorId = existingLeaseProcessor.name.split('/').pop();
          return NextResponse.json({
            success: true,
            message: 'Document AI processor already exists (found via service account)',
            processorId,
            processorName: existingLeaseProcessor.displayName,
            existingProcessor: true,
            authMethod: 'service_account',
            instruction: `Use this processor ID in your environment variables: DOCUMENT_AI_PROCESSOR_ID=${processorId}`
          });
        }

        const result = await createLeaseProcessor();
        return NextResponse.json({
          success: true,
          message: 'Document AI processor created successfully with service account!',
          processorId: result.processorId,
          processorName: result.displayName,
          fullName: result.fullName,
          type: result.type,
          state: result.state,
          existingProcessor: false,
          authMethod: 'service_account',
          instruction: `Add this to your Vercel environment variables: DOCUMENT_AI_PROCESSOR_ID=${result.processorId}`
        });
      } catch (serviceAccountError: any) {
        throw new Error(`Both alternative auth and service account failed. Alt auth: ${authResult.error}, Service account: ${serviceAccountError.message}`);
      }
    }

  } catch (error: any) {
    console.error('❌ Document AI processor setup failed:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to create Document AI processor',
      message: error.message,
      code: error.code,
      troubleshooting: [
        'ALTERNATIVE AUTH METHODS:',
        '1. Set GOOGLE_CLOUD_API_KEY (preferred for Vercel)',
        '2. Set GOOGLE_CLOUD_ACCESS_TOKEN (if you have one)',
        '3. Or manually create processor in Google Cloud Console',
        '',
        'ORIGINAL METHOD ISSUES:',
        'Ensure Document AI API is enabled in Google Cloud Console',
        'Verify service account has Document AI Admin role',
        'Check that private key is not corrupted by Vercel environment'
      ],
      alternativeSolution: 'Consider manual processor creation - see manual setup guide'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Document AI Processor Setup Endpoint',
    description: 'This is a one-time setup endpoint to create a Google Document AI processor for lease documents.',
    usage: 'POST /api/setup-document-ai',
    requiredEnvVars: [
      'GOOGLE_APPLICATION_CREDENTIALS_JSON',
      'GOOGLE_CLOUD_PROJECT_ID', 
      'DOCUMENT_AI_LOCATION'
    ],
    status: 'Ready for processor creation'
  });
}