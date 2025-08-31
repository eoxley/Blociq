import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Testing OCR configuration...');
    
    // Check Google Vision configuration
    const googleConfig = {
      GOOGLE_APPLICATION_CREDENTIALS: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
      GOOGLE_CLIENT_EMAIL: !!process.env.GOOGLE_CLIENT_EMAIL,
      GOOGLE_PRIVATE_KEY: !!process.env.GOOGLE_PRIVATE_KEY,
      GOOGLE_PROJECT_ID: !!process.env.GOOGLE_PROJECT_ID,
      GOOGLE_APPLICATION_CREDENTIALS_JSON: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    };
    
    // Check OpenAI configuration
    const openaiConfig = {
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY
    };
    
    // Check if any Google Vision config is available
    const hasGoogleVision = Object.values(googleConfig).some(Boolean);
    
    // Test Google Vision client initialization (if configured)
    let googleVisionStatus = 'not_configured';
    if (hasGoogleVision) {
      try {
        const { getVisionClient } = await import('../../../ocrClient');
        const client = getVisionClient();
        if (client) {
          googleVisionStatus = 'configured_and_initialized';
        }
      } catch (error) {
        googleVisionStatus = 'configured_but_failed_to_initialize';
        console.error('Google Vision initialization error:', error);
      }
    }
    
    // Test OpenAI client initialization (if configured)
    let openaiStatus = 'not_configured';
    if (openaiConfig.OPENAI_API_KEY) {
      try {
        const { default: OpenAI } = await import('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        openaiStatus = 'configured_and_initialized';
      } catch (error) {
        openaiStatus = 'configured_but_failed_to_initialize';
        console.error('OpenAI initialization error:', error);
      }
    }
    
    const ocrCapabilities = [];
    if (googleVisionStatus === 'configured_and_initialized') {
      ocrCapabilities.push('Google Vision API (PDF, Images)');
    }
    if (openaiStatus === 'configured_and_initialized') {
      ocrCapabilities.push('OpenAI Vision (Images only)');
    }
    
    const overallStatus = ocrCapabilities.length > 0 ? 'operational' : 'no_ocr_available';
    
    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      googleVision: {
        status: googleVisionStatus,
        environmentVariables: googleConfig
      },
      openai: {
        status: openaiStatus,
        environmentVariables: openaiConfig
      },
      availableOcrCapabilities: ocrCapabilities,
      recommendations: generateRecommendations(googleVisionStatus, openaiStatus)
    });
    
  } catch (error) {
    console.error('❌ OCR configuration test failed:', error);
    
    return NextResponse.json({
      status: 'error',
      error: 'Failed to test OCR configuration',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

function generateRecommendations(googleStatus: string, openaiStatus: string): string[] {
  const recommendations = [];
  
  if (googleStatus === 'not_configured' && openaiStatus === 'not_configured') {
    recommendations.push('Configure either Google Vision API or OpenAI API for OCR functionality');
    recommendations.push('Google Vision supports both PDFs and images');
    recommendations.push('OpenAI Vision supports images only but may have better text understanding');
  } else if (googleStatus === 'configured_but_failed_to_initialize') {
    recommendations.push('Check Google Vision API credentials format and permissions');
    recommendations.push('Verify private key formatting (newlines should be preserved)');
  } else if (openaiStatus === 'configured_but_failed_to_initialize') {
    recommendations.push('Verify OpenAI API key is valid and has access to vision models');
  } else if (googleStatus === 'configured_and_initialized') {
    recommendations.push('Google Vision is working - OCR should be fully functional');
  } else if (openaiStatus === 'configured_and_initialized') {
    recommendations.push('OpenAI Vision is working - OCR available for images');
    recommendations.push('Consider adding Google Vision for PDF support');
  }
  
  return recommendations;
}
