import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🔍 Checking detailed OCR service status...');
    
    const results = {
      timestamp: new Date().toISOString(),
      externalService: 'https://ocr-server-2-ykmk.onrender.com/upload',
      checks: {}
    };
    
    // Test 1: Basic connectivity
    try {
      console.log('Testing basic connectivity...');
      const response = await fetch('https://ocr-server-2-ykmk.onrender.com/upload', {
        method: 'POST',
        body: new FormData()
      });
      
      results.checks.connectivity = {
        status: 'success',
        statusCode: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      };
      
      console.log('Connectivity test result:', response.status);
      
    } catch (error) {
      results.checks.connectivity = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      console.error('Connectivity test failed:', error);
    }
    
    // Test 2: Health endpoint (if it exists)
    try {
      console.log('Testing health endpoint...');
      const healthResponse = await fetch('https://ocr-server-2-ykmk.onrender.com/health', {
        method: 'GET'
      });
      
      results.checks.healthEndpoint = {
        status: 'success',
        statusCode: healthResponse.status,
        statusText: healthResponse.statusText,
        accessible: healthResponse.ok
      };
      
    } catch (error) {
      results.checks.healthEndpoint = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    // Test 3: Root endpoint
    try {
      console.log('Testing root endpoint...');
      const rootResponse = await fetch('https://ocr-server-2-ykmk.onrender.com/', {
        method: 'GET'
      });
      
      results.checks.rootEndpoint = {
        status: 'success',
        statusCode: rootResponse.status,
        statusText: rootResponse.statusText,
        accessible: rootResponse.ok
      };
      
    } catch (error) {
      results.checks.rootEndpoint = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    // Test 4: DNS resolution
    try {
      console.log('Testing DNS resolution...');
      const url = new URL('https://ocr-server-2-ykmk.onrender.com/upload');
      results.checks.dns = {
        status: 'success',
        hostname: url.hostname,
        protocol: url.protocol,
        port: url.port || '443 (default)'
      };
    } catch (error) {
      results.checks.dns = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    console.log('OCR status check complete');
    return NextResponse.json(results);
    
  } catch (error) {
    console.error('OCR status check error:', error);
    return NextResponse.json({
      error: 'Status check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
