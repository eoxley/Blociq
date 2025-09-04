import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    // Read the manifest.xml file from the public directory
    const manifestPath = join(process.cwd(), 'public', 'outlook-addin', 'manifest.xml');
    const manifestContent = readFileSync(manifestPath, 'utf8');

    // Return the manifest with proper headers for download
    return new NextResponse(manifestContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': 'attachment; filename="BlocIQ-Outlook-Addin-manifest.xml"',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    });

  } catch (error) {
    console.error('Error serving manifest:', error);
    
    return NextResponse.json({
      error: 'Failed to load manifest file',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Also support HEAD requests for testing
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Content-Disposition': 'attachment; filename="BlocIQ-Outlook-Addin-manifest.xml"',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
