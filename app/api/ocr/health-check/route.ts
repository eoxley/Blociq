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
    
    console.log('🔍 OCR Health Check - Configuration:', config);
    
    // Check environment variables
    const envCheck = {
      RENDER_OCR_TOKEN: {
        present: !!token,
        length: token ? token.length : 0,
        status: token ? '✅ Set' : '❌ Missing'
      },
      RENDER_OCR_URL: {
        present: !!ocrUrl,
        value: ocrUrl || 'Not set',
        status: ocrUrl ? '✅ Set' : '❌ Missing'
      }
    };
    
    if (!token || !ocrUrl) {
      return NextResponse.json({
        success: false,
        message: 'OCR service not properly configured',
        config: envCheck,
        issues: [
          !token ? 'RENDER_OCR_TOKEN is missing' : null,
          !ocrUrl ? 'RENDER_OCR_URL is missing' : null
        ].filter(Boolean),
        solutions: [
          'Set RENDER_OCR_TOKEN to match the token configured on your Render service',
          'Set RENDER_OCR_URL to your deployed Render OCR service URL (e.g., https://your-service.onrender.com/upload)',
          'Verify both environment variables are set in your deployment platform (Vercel, etc.)'
        ]
      }, { status: 500 });
    }
    
    // Test Render service connectivity
    console.log('🏓 Testing Render OCR service connectivity...');
    
    try {
      // First test the health endpoint
      const healthUrl = ocrUrl.replace('/upload', '/health');
      const healthResponse = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'BlocIQ-Health-Check/1.0'
        },
        timeout: 10000
      });
      
      console.log('🏓 Health check response:', healthResponse.status);
      
      let healthData = null;
      if (healthResponse.ok) {
        try {
          healthData = await healthResponse.json();
        } catch (e) {
          console.warn('Failed to parse health response JSON');
        }
      }
      
      // Test authentication with upload endpoint
      const authTestResponse = await fetch(ocrUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'test=1', // Minimal test payload
        timeout: 10000
      });
      
      console.log('🔐 Auth test response:', authTestResponse.status);
      
      const authTestResult = {
        status: authTestResponse.status,
        ok: authTestResponse.ok,
        message: authTestResponse.status === 401 ? 'Authentication failed - invalid token' : 
                authTestResponse.status === 404 ? 'Endpoint not found' :
                authTestResponse.status === 400 ? 'Bad request (expected for test payload)' :
                authTestResponse.ok ? 'Authentication successful' : 'Unknown error'
      };
      
      return NextResponse.json({
        success: true,
        message: 'OCR service configuration and connectivity verified',
        config: envCheck,
        connectivity: {
          healthEndpoint: {
            url: healthUrl,
            status: healthResponse.status,
            ok: healthResponse.ok,
            data: healthData
          },
          authTest: authTestResult
        },
        recommendations: authTestResponse.status === 401 ? [
          'Authentication failed - verify RENDER_OCR_TOKEN matches the token on Render service',
          'Check if the token has expired or been regenerated',
          'Ensure the token is correctly set in your environment variables'
        ] : authTestResponse.status === 404 ? [
          'Endpoint not found - verify RENDER_OCR_URL is correct',
          'Ensure the Render service is deployed and running',
          'Check that the /upload endpoint exists on the service'
        ] : authTestResponse.ok || authTestResponse.status === 400 ? [
          'OCR service is properly configured and accessible',
          'Ready to process document uploads'
        ] : [
          'OCR service is accessible but may have issues',
          'Check Render service logs for more details'
        ]
      });
      
    } catch (connectivityError) {
      console.error('🏓 Connectivity test failed:', connectivityError);
      
      return NextResponse.json({
        success: false,
        message: 'OCR service configured but unreachable',
        config: envCheck,
        connectivity: {
          error: connectivityError instanceof Error ? connectivityError.message : 'Network error',
          type: 'connection_failed'
        },
        recommendations: [
          'Check if the Render service is running and accessible',
          'Verify RENDER_OCR_URL is correct and the service is deployed',
          'Check network connectivity to Render service',
          'Ensure the service hasn\'t been paused or stopped'
        ]
      }, { status: 503 });
    }
    
  } catch (error) {
    console.error('❌ OCR health check failed:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to perform OCR health check',
      error: error instanceof Error ? error.message : 'Unknown error',
      recommendations: [
        'Check application logs for detailed error information',
        'Verify all environment variables are correctly configured',
        'Ensure the OCR service is accessible and running'
      ]
    }, { status: 500 });
  }
}
