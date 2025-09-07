/**
 * Ask AI Ping Endpoint
 * Used by Outlook Add-in to check API connectivity and CORS
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Get origin for CORS check
    const origin = req.headers.get('origin') || req.headers.get('referer');
    
    console.log('[Ask-AI Ping] Request from origin:', origin);
    
    // Check if this is a valid add-in origin
    const allowedOrigins = [
      'https://www.blociq.co.uk',
      'https://blociq.co.uk',
      'https://outlook.office.com',
      'https://outlook.office365.com',
      'https://outlook.live.com'
    ];
    
    const isValidOrigin = origin ? allowedOrigins.some(allowed => origin.startsWith(allowed)) : true;
    
    if (!isValidOrigin) {
      console.warn('[Ask-AI Ping] Invalid origin:', origin);
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Ask AI endpoint is healthy',
      timestamp: new Date().toISOString(),
      cors: true,
      origin: origin || 'unknown'
    }, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    console.error('[Ask-AI Ping] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    }, {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }
}

export async function OPTIONS(req: NextRequest) {
  // Handle preflight requests
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}
