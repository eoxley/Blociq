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
  console.log('🚀 Starting Document AI processor setup...');

  try {
    // Import the processor creation function
    const { createLeaseProcessor, listExistingProcessors } = require('../../../scripts/create-document-ai-processor.js');

    console.log('📋 Listing existing processors...');
    const existingProcessors = await listExistingProcessors();
    
    // Check if processor already exists
    const existingLeaseProcessor = existingProcessors.find(
      (p: any) => p.displayName.includes('Lease') || p.displayName.includes('BlocIQ')
    );

    if (existingLeaseProcessor) {
      const processorId = existingLeaseProcessor.name.split('/').pop();
      
      return NextResponse.json({
        success: true,
        message: 'Document AI processor already exists',
        processorId,
        processorName: existingLeaseProcessor.displayName,
        existingProcessor: true,
        instruction: `Use this processor ID in your environment variables: DOCUMENT_AI_PROCESSOR_ID=${processorId}`
      });
    }

    console.log('🔨 Creating new Document AI processor...');
    const result = await createLeaseProcessor();

    return NextResponse.json({
      success: true,
      message: 'Document AI processor created successfully!',
      processorId: result.processorId,
      processorName: result.displayName,
      fullName: result.fullName,
      type: result.type,
      state: result.state,
      existingProcessor: false,
      instruction: `Add this to your Vercel environment variables: DOCUMENT_AI_PROCESSOR_ID=${result.processorId}`,
      nextSteps: [
        'Add DOCUMENT_AI_PROCESSOR_ID to your Vercel environment variables',
        'Redeploy your application',
        'Test OCR functionality with lease documents',
        'Optionally disable this setup endpoint for security'
      ]
    });

  } catch (error: any) {
    console.error('❌ Document AI processor setup failed:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to create Document AI processor',
      message: error.message,
      code: error.code,
      troubleshooting: [
        'Ensure Document AI API is enabled in Google Cloud Console',
        'Verify service account has Document AI Admin role',
        'Check that GOOGLE_APPLICATION_CREDENTIALS_JSON is valid',
        'Confirm GOOGLE_CLOUD_PROJECT_ID and DOCUMENT_AI_LOCATION are set'
      ]
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