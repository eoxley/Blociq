import { NextRequest, NextResponse } from 'next/server';

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const token = process.env.RENDER_OCR_TOKEN;
    const ocrUrl = process.env.RENDER_OCR_URL;
    
    const config = {
      hasToken: !!token,
      hasUrl: !!ocrUrl,
      tokenLength: token ? token.length : 0,
      urlPreview: ocrUrl ? `${ocrUrl.substring(0, 50)}...` : 'NOT SET'
    };
    
    console.log('🔍 Render OCR Configuration Check:', config);
    
    if (!token || !ocrUrl) {
      return NextResponse.json({
        success: false,
        message: 'Render OCR service not configured',
        config,
        required: [
          'RENDER_OCR_URL - URL of deployed Render OCR service',
          'RENDER_OCR_TOKEN - Shared authentication token'
        ]
      });
    }
    
    // Try to ping the Render service
    console.log('🏓 Attempting to ping Render OCR service...');
    
    try {
      const pingResponse = await fetch(ocrUrl.replace('/ocr/process', '/health').replace('/process', '/health'), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'BlocIQ-Health-Check/1.0'
        },
        timeout: 10000 // 10 second timeout
      });
      
      console.log('🏓 Health check response:', pingResponse.status);
      
      return NextResponse.json({
        success: true,
        message: 'Render OCR service configuration looks good',
        config: {
          ...config,
          healthCheck: {
            attempted: true,
            status: pingResponse.status,
            ok: pingResponse.ok
          }
        },
        recommendations: pingResponse.ok ? [] : [
          'Health check failed - service may be starting up',
          'Check Render service deployment status',
          'Verify the service accepts the authentication token'
        ]
      });
      
    } catch (pingError) {
      console.error('🏓 Health check failed:', pingError);
      
      return NextResponse.json({
        success: false,
        message: 'Render OCR service configured but unreachable',
        config: {
          ...config,
          healthCheck: {
            attempted: true,
            error: pingError instanceof Error ? pingError.message : 'Network error'
          }
        },
        recommendations: [
          'Check RENDER_OCR_URL is correct and accessible',
          'Ensure Render OCR service is deployed and running',
          'Verify network connectivity to Render service'
        ]
      });
    }
    
  } catch (error) {
    console.error('❌ Render OCR check failed:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to check Render OCR configuration',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}